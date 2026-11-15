'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../web/ui.js'),'utf8');
const timers=new Map();let id=0;
function param(){return{value:0,setTargetAtTime(){}};}
function node(){return{gain:param(),frequency:param(),Q:param(),connect(){},start(){},stop(){}};}
class AudioContext{
  constructor(){this.state='running';this.sampleRate=64;this.currentTime=0;this.destination={};this.suspends=0;this.resumes=0;this.closed=0;}
  createGain(){return node();} createBuffer(c,length){return{getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return node();}createBiquadFilter(){return node();}createOscillator(){return node();}
  suspend(){this.suspends++;this.state='suspended';return Promise.resolve();}
  resume(){this.resumes++;this.state='running';return Promise.resolve();}
  close(){this.closed++;this.state='closed';return Promise.resolve();}
}
const prefs={volume:25,weather:'rain',reduced:false};
const scope={window:{AudioContext},document:{hidden:false},soundOn:true,hostPaused:false,paused:false,
  A:{prefs:()=>prefs,paused:()=>scope.paused},setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:i=>timers.delete(i),Math};
vm.runInNewContext(source.slice(source.indexOf('  class Ambience{'),source.indexOf('  async function toggleSound'))+'\nthis.TestAmbience=Ambience;',scope);
const a=new scope.TestAmbience(),flush=()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(f=>f());};
a.update();assert.equal(timers.size,0);assert.equal(a.c.suspends,0);
for(const reason of ['mute','pause','hidden','host','stillness']){
  if(reason==='mute')scope.soundOn=false;if(reason==='pause')scope.paused=true;if(reason==='hidden')scope.document.hidden=true;if(reason==='host')scope.hostPaused=true;if(reason==='stillness')prefs.reduced=true;
  a.update();assert.equal(timers.size,1,'One bounded fade timer: '+reason);flush();assert.equal(a.c.state,'suspended',reason+' really suspends graph');
  scope.soundOn=true;scope.paused=false;scope.document.hidden=false;scope.hostPaused=false;prefs.reduced=false;
  a.update();assert.equal(a.c.state,'running',reason+' resumes only after visible and requested');
}
scope.soundOn=false;a.update();scope.soundOn=true;a.update();flush();assert.equal(a.c.state,'running','A pending fade cannot suspend newly requested sound');
a.dispose();assert.equal(a.c.state,'closed');assert.equal(timers.size,0);
console.log('PASS: ambience graph suspends on mute, manual pause, hidden, host pause and Stillness; resumes only when eligible; pending timers cancel and teardown closes. Synthetic AudioContext only.');

'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../web/index.html'),'utf8');
const initiallyDisabled=new Set([...html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*\bdisabled[^>]*>/g)].map(m=>m[1]));
function start(native){
  let now=0,message;const intervals=[],sent=[],nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},style:{},textContent:'',checked:false,disabled:initiallyDisabled.has(id),
    classList:{add(){},remove(){},toggle(){},contains:()=>false},handlers:{},addEventListener(type,f){this.handlers[type]=f;},
    setAttribute(){},closest:()=>node(id+'-label'),focus(){},contains:()=>false,querySelector:()=>node(id+'-span'),querySelectorAll:()=>[]});return nodes.get(id);};
  const prefs={scene:'city',worldActivity:65,worldGlow:60,worldFeature:true,daycycle:false,windows:true,parallax:true,reduced:false,musicSpectrum:true,caption:true,palette:'nocturne',weather:'rain',intensity:55,volume:25,quality:30,musicSensitivity:55,musicStrength:40};
  const world={id:'city',name:'Canal City',tag:'01 / AFTERLIGHT',description:'A test city',hint:'A hint',actions:['Train','Lantern','Cat','Meteor','Lights','Water']};
  let frames=0,mode='off';
  const A={rotationHold(){},rotationPulse(){},rotationState:()=>({reason:'off',remaining:600}),nextScene(){},showHotspots(){},worlds:()=>[world],currentWorld:()=>world,selectScene(){},resetScene(){},prefs:()=>({...prefs}),set(){},defaults:()=>prefs,musicFrame(){frames++;mode='live';},musicDemo(v){mode=v?'demo':'off';},musicOff(){mode='off';},paused:()=>false};
  const scope={document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){},body:node('body')},
    Afterlight:A,performance:{now:()=>now},setInterval:(f,ms)=>intervals.push({f,ms}),setTimeout:()=>1,clearTimeout(){},addEventListener(){},Intl,Date,console};
  scope.window=scope;if(native)scope.chrome={webview:{postMessage:m=>sent.push(m),addEventListener:(type,f)=>message=f}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/ui.js'),'utf8'),scope);
  return{node,sent,send:m=>message({data:m}),tick(ms){now+=ms;intervals.filter(x=>x.ms===500).forEach(x=>x.f());},get frames(){return frames;},get mode(){return mode;}};
}
const live=start(true);
assert.equal(live.node('music-signal').dataset.mode,'off');
live.send({type:'music-status',enabled:true,status:'listening',detail:'Test headphones'});
assert.equal(live.node('music-signal').dataset.mode,'starting');
live.send({type:'music-frame',level:.04,bands:Array(16).fill(.02)});live.tick(500);
assert.equal(live.node('music-signal').dataset.mode,'signal');assert.equal(live.node('music-input-value').textContent,'4%');
assert.equal(live.frames,1);assert.equal(live.mode,'live');
live.tick(1100);live.send({type:'music-frame',level:0});live.tick(1);
assert.equal(live.node('music-signal').dataset.mode,'quiet');assert.equal(live.node('music-input-value').textContent,'0%');
live.tick(2000);assert.equal(live.node('music-signal').dataset.mode,'stale');
live.node('music-reconnect').handlers.click();assert.equal(live.sent.at(-1),'music:on');
live.send({type:'music-status',enabled:true,status:'paused',detail:'Paused with the scene'});
assert.equal(live.node('music-signal').dataset.mode,'paused');assert.equal(live.mode,'off');
live.send({type:'music-frame',level:.50});
assert.equal(live.node('music-input-value').textContent,'0%');
assert.equal(live.frames,2);assert.equal(live.mode,'off');
live.send({type:'music-status',enabled:true,status:'error',detail:'Reconnecting'});
assert.equal(live.node('music-signal').dataset.mode,'error');assert(!live.node('music-reconnect').disabled);
live.send({type:'music-status',enabled:true,status:'listening',detail:'New output'});
live.send({type:'music-frame',level:.04});live.tick(500);
assert.equal(live.node('music-signal').dataset.mode,'signal');assert.equal(live.frames,3);
live.send({type:'music-status',enabled:false,status:'off',detail:'Not listening'});
assert.equal(live.node('music-signal').dataset.mode,'off');assert(live.node('music-reconnect').disabled);
const browser=start(false);assert(browser.node('music-reactive').disabled);assert(browser.node('music-reconnect').disabled);
browser.node('music-demo').handlers.click();assert.equal(browser.node('music-signal').dataset.mode,'demo');
assert.equal(browser.node('music-input-value').textContent,'0%');assert.equal(browser.frames,0);
assert.match(browser.node('music-signal').textContent,/SIMULATED/);
browser.node('music-demo').handlers.click();assert.equal(browser.mode,'off');
console.log('PASS: off/start/signal/silence/stale/pause states, raw input percentage, reconnect, and explicitly labelled capture-free browser simulation.');

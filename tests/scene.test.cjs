'use strict';
// Renderer unit tests. A deliberately small canvas fake catches invalid geometry,
// lifecycle leaks and preference regressions without controlling a browser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
let now=0,id=0,rectangles=0;const pending=new Map(),events=new Map(),storage=new Map();
const context={fillStyle:'#000',globalAlpha:1,imageSmoothingEnabled:false,
  fillRect(...a){assert(a.every(Number.isFinite),'non-finite rectangle');assert(a[2]>0&&a[3]>0);rectangles++;},
  clearRect(){},drawImage(...a){assert(a.slice(1).every(Number.isFinite),'non-finite image coordinates');},save(){},restore(){},translate(...a){assert(a.every(Number.isFinite));}};
function canvas(){return{width:960,height:540,dataset:{},getContext:()=>({...context}),addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})};}
const visible=canvas(),body={classList:{toggle(){},remove(){}}};
const document={hidden:false,body,getElementById:()=>visible,createElement:canvas,addEventListener:(type,fn)=>events.set(type,fn)};
const scope={document,innerWidth:960,innerHeight:540,performance:{now:()=>now},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
  matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame:f=>{pending.set(++id,f);return id;},cancelAnimationFrame:i=>pending.delete(i),
  dispatchEvent(){},addEventListener(){},CustomEvent:class{constructor(type,data){this.type=type;this.detail=data?.detail;}},Event:class{},console};scope.window=scope;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/scene.js'),'utf8'),scope,{filename:'scene.js'});
const A=scope.Afterlight;
const advance=(ms=34)=>{now+=ms;const jobs=[...pending.values()];pending.clear();jobs.forEach(f=>f(now));};
assert.equal(pending.size,1);assert.equal(A.diagnostics().width,960);
for(let i=0;i<140;i++)advance();assert(A.diagnostics().frame>90);
for(const palette of ['nocturne','ember','sakura'])for(const weather of ['rain','clear','snow','mist']){
  A.set({palette,weather,intensity:100});for(let i=0;i<3;i++)advance();assert.equal(A.prefs().palette,palette);
}
for(const action of ['train','lantern','cat','meteor','studio'])A.effect(action);
A.hostPointer(150,420,true);assert.equal(A.diagnostics().ripples,1);
A.pause(true);assert.equal(pending.size,0);const frozen=A.diagnostics().clock;advance(1000);assert.equal(A.diagnostics().clock,frozen);
A.set({palette:'ember'});assert.equal(A.diagnostics().palette,'ember');
A.pause(false);assert.equal(pending.size,1);
A.hostPause(true);assert.equal(pending.size,0);A.hostPause(false);assert.equal(pending.size,1);
for(let i=0;i<20;i++)A.hostRecover(false);assert.equal(pending.size,1,'Recovery must not duplicate animation loops');
A.hostPause(true);A.hostRecover(false);assert.equal(pending.size,1,'Missed host-resume must be recoverable');
A.pause(true);A.hostRecover(false);assert.equal(pending.size,0,'Recovery must preserve manual pause');A.pause(false);
document.hidden=true;events.get('visibilitychange')();assert.equal(pending.size,0);
A.hostRecover(false);assert.equal(pending.size,0,'Recovery must not animate hidden documents');
document.hidden=false;events.get('visibilitychange')();assert.equal(pending.size,1);
A.set({reduced:true});assert.equal(pending.size,0);A.set({palette:'sakura'});assert.equal(A.diagnostics().palette,'sakura');
A.hostRecover(false);assert.equal(pending.size,0,'Recovery must preserve Stillness');
A.set({reduced:false});assert.equal(pending.size,1);
assert.equal(A.png().width,3840);assert.equal(A.png().height,2160);
assert.equal(JSON.parse(storage.get('afterlight.v1')).palette,'sakura');
A.musicFrame({level:1,bass:1,mid:.8,high:.5,bands:Array(16).fill(.8)});
for(let i=0;i<20;i++)advance();assert(A.diagnostics().musicEnergy>.5,'audio frames should illuminate the city');
A.musicFrame({level:NaN,bass:Infinity,bands:[NaN,Infinity,-1,2]});for(let i=0;i<20;i++)advance();assert(Number.isFinite(A.diagnostics().musicEnergy));
A.musicOff();assert.equal(A.diagnostics().musicMode,'off');assert.equal(A.diagnostics().musicEnergy,0);
A.musicDemo(true);for(let i=0;i<10;i++)advance();assert.equal(A.diagnostics().musicMode,'demo');assert(A.diagnostics().musicEnergy>0);
A.musicDemo(false);assert.equal(A.diagnostics().musicEnergy,0);
for(let i=0;i<500;i++)advance();assert.equal(pending.size,1,'only one animation chain');
assert(rectangles>100000,'the full detailed scene was drawn');
console.log('PASS: all 12 palette/weather combinations, geometry, interactions, pause/resume, host pause, hidden-tab pause, reduced motion, 4K export dimensions, persistence and single animation loop.');

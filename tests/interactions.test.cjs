'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),load=require('./world-harness.cjs');
const keys=['train','lantern','cat','meteor','light','water'],results=[];
function pixels(h){return h.visible.getContext('2d').getImageData(0,0,960,540).data.slice();}
function diff(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>=10)n++;return n;}
for(const scene of ['observatory','sleeper','pelagic','sanctuary'])for(const action of keys){
  // Independent reference run removes ambient motion from the comparison.
  const ref=load({real:true}),act=load({real:true});
  for(const h of [ref,act]){h.A.selectScene(scene);h.A.set({daycycle:false,parallax:false,weather:'clear'});h.advance(3000);h.A.previewAt(19);}
  act.A.effect(action);
  ref.A.previewAt(20);act.A.previewAt(20);
  const changed=diff(pixels(ref),pixels(act));assert(changed>20,scene+'/'+action+' must visibly change the scene, not only a toast: '+changed);
  const hit=act.A.hotspots().find(q=>q.action===action);assert(hit,'Missing discoverable target '+action);
  const state=act.A.interactionState();act.A.hostPointer(hit.x+hit.w/2,hit.y+hit.h/2,true);
  if(action==='light')assert.notEqual(act.A.interactionState().lights,state.lights,'Light hit must reach the actual toggle');
  else if(scene==='sleeper'&&action==='water')assert.notEqual(act.A.interactionState().curtains,state.curtains,'Curtain hit must reach the actual toggle');
  else assert.equal(act.A.interactionState().triggers[action],20,'Object hit must route to its own action');
  if(action==='light'){act.A.effect('light');assert.equal(act.A.interactionState().lights,false);act.A.set({palette:'ember'});assert.equal(act.A.interactionState().lights,false,'Palette changes preserve in-world switches');}
  results.push({scene,action,changedPixels:changed,hotspotVerified:true});
}
const h=load();h.A.selectScene('pelagic');h.A.set({worldFeature:false});h.A.previewAt(19);h.A.effect('cat');assert.equal(h.A.interactionState().triggers.cat,19,'Manual whale call works with ambient whale disabled');
h.A.pause(true);h.A.showHotspots(true);h.A.effect('meteor');assert.equal(h.pending.size,0,'Actions and markers must not override manual pause');
h.A.set({reduced:true});h.A.effect('water');assert.equal(h.pending.size,0,'Actions must respect Stillness');
const output=path.join(__dirname,'../out/checks/renderer');
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'interactions-test.json'),JSON.stringify({threshold:10,input:'Offline real-pixel A/B renders with identical ambient scene time. No audio or desktop capture.',results},null,2));
console.log('PASS: 24/24 new-world actions change actual artwork; all 24 object hit areas route correctly; toggles survive palette changes; paused/Stillness scenes do not restart.',results);

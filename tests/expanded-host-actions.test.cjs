'use strict';
const assert=require('node:assert/strict'),load=require('./world-harness.cjs');
const h=load(),A=h.A;let hits=0;
A.set({parallax:false});
for(const id of ['citylight','nocturne','lunar','foundry']){
  A.selectScene(id);A.set({parallax:false});A.previewAt(19);
  for(const spot of A.hotspots()){
    const before=A.interactionState();A.hostPointer(spot.x+spot.w/2,spot.y+spot.h/2,true);
    const after=A.interactionState();
    if(spot.action==='light')assert.notEqual(after.lights,before.lights,id+' actual host hit toggles its own lights');
    else assert.equal(after.triggers[spot.action],19,id+'/'+spot.action+' host hit reaches its own action');
    hits++;
  }
  A.pause(true);A.effect('lantern');A.effect('water');A.hostRecover(false);assert.equal(h.pending.size,0);
  A.pause(false);assert.equal(h.pending.size,1);
}
console.log('PASS: all '+hits+' Seneschal hotspot centers route through the full Afterlight host to their own action; manual pause is preserved.');

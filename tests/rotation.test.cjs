'use strict';
const assert=require('node:assert/strict'),load=require('./world-harness.cjs');
const h=load(),A=h.A;
const tick=(ms=1000)=>{h.elapse(ms);return A.rotationPulse();};
const wait=seconds=>{for(let i=0;i<seconds;i++)tick();};
assert.equal(A.rotationState().reason,'off');A.set({rotate:true,rotationMinutes:1});
A.set({palette:'ember',worldGlow:27});wait(59);assert.equal(A.prefs().scene,'city');tick();assert.equal(A.prefs().scene,'observatory');
assert.equal(A.rotationState().remaining,60);A.set({palette:'sakura',worldGlow:81});
for(const expected of ['sleeper','pelagic','sanctuary','citylight','nocturne','lunar','foundry','city']){wait(60);assert.equal(A.prefs().scene,expected);}
assert.equal(A.prefs().palette,'ember');assert.equal(A.prefs().worldGlow,27,'City appearance survives full rotation');A.selectScene('observatory');assert.equal(A.prefs().worldGlow,81);
wait(25);A.selectScene('observatory');assert.equal(A.rotationState().remaining,60,'Manual choice restarts full interval');
for(const hold of ['editing','paused','hidden','host','stillness']){
  if(hold==='editing')A.rotationHold(true);if(hold==='paused')A.pause(true);if(hold==='hidden')h.visibility(true);if(hold==='host')A.hostPause(true);if(hold==='stillness')A.set({reduced:true});
  const before=A.rotationState().remaining;wait(90);assert.equal(A.prefs().scene,'observatory');assert.equal(A.rotationState().remaining,before,'No rotation while '+hold);
  if(hold==='editing')A.rotationHold(false);if(hold==='paused')A.pause(false);if(hold==='hidden')h.visibility(false);if(hold==='host')A.hostPause(false);if(hold==='stillness')A.set({reduced:false});
}
tick(3600000);assert.equal(A.prefs().scene,'observatory','Sleep must not replay missed changes');assert.equal(A.rotationState().remaining,60);wait(60);assert.equal(A.prefs().scene,'sleeper');
A.set({rotationShuffle:true});let previous=A.prefs().scene;for(let i=0;i<30;i++){A.nextScene();assert.notEqual(A.prefs().scene,previous,'Shuffle cannot repeat current world');previous=A.prefs().scene;}
A.set({rotate:false});const scene=A.prefs().scene;wait(120);assert.equal(A.prefs().scene,scene);
A.set({rotate:true,rotationMinutes:15});A.resetScene();assert.equal(A.prefs().rotate,true);assert.equal(A.prefs().rotationMinutes,15,'Appearance reset preserves global rotation');
const restored=load({storage:new Map(h.storage)});assert.equal(restored.A.prefs().rotate,true);assert.equal(restored.A.prefs().rotationMinutes,15);assert.equal(restored.A.prefs().rotationShuffle,true);assert.equal(restored.A.rotationState().remaining,900,'Countdown starts fresh after reopening');
A.set({rotationMinutes:-1});assert.equal(A.prefs().rotationMinutes,15);A.set({rotationMinutes:Infinity});assert.equal(A.prefs().rotationMinutes,15);
console.log('PASS: automatic timed cycle through all nine worlds, independent appearance, manual reset, editing/manual/hidden/host/Stillness pauses, sleep gap, non-repeating shuffle, off, persistence and interval validation.');

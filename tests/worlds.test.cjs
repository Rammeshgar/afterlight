'use strict';
const assert=require('node:assert/strict'),load=require('./world-harness.cjs');
const legacy={palette:'ember',weather:'snow',intensity:72,quality:60,caption:false,worldGlow:23};
const storage=new Map([['afterlight.v1',JSON.stringify(legacy)]]),h=load({storage}),A=h.A;
assert.equal(A.worlds().length,9);assert.equal(A.prefs().scene,'city');assert.equal(A.prefs().palette,'ember');
A.set({worldGlow:34});
for(const world of A.worlds()){
  A.selectScene(world.id);assert.equal(A.prefs().scene,world.id);assert.equal(A.currentWorld().name,world.name);
  for(const palette of ['nocturne','ember','sakura'])for(const weather of ['clear','rain','snow','mist']){
    A.set({palette,weather,worldActivity:100,worldGlow:100});h.advance();h.advance();
    assert.equal(h.pending.size,1,'Only the active world may schedule an animation loop');
  }
  for(const action of ['train','lantern','cat','meteor','light','water']){A.effect(action);h.advance();}
  A.hostPointer(350,420,true);h.advance();
  A.hostRecover(false);assert.equal(h.pending.size,1);
  A.pause(true);A.selectScene(world.id);A.hostRecover(false);assert.equal(h.pending.size,0,'Switching cannot override manual pause');A.pause(false);
  A.set({reduced:true});A.selectScene(world.id);assert.equal(h.pending.size,0,'Switching cannot override Stillness');A.set({reduced:false});
}
A.selectScene('city');A.set({palette:'ember',intensity:29});A.selectScene('observatory');A.set({palette:'sakura',worldGlow:87,intensity:62});
A.selectScene('city');assert.equal(A.prefs().palette,'ember');assert.equal(A.prefs().intensity,29);
A.selectScene('observatory');assert.equal(A.prefs().palette,'sakura');assert.equal(A.prefs().worldGlow,87);assert.equal(A.prefs().quality,60);
const copy=load({storage:new Map(storage)});assert.equal(copy.A.prefs().scene,'observatory');assert.equal(copy.A.prefs().worldGlow,87);
copy.A.selectScene('city');assert.equal(copy.A.prefs().intensity,29,'City settings survive reopening from another world');
assert.equal(JSON.parse(storage.get('afterlight.v1')).palette,'ember','Other worlds cannot overwrite legacy city appearance');
A.selectScene('pelagic');A.set({quality:15,musicSensitivity:93,reduced:true,palette:'ember',worldGlow:1});A.resetScene();
assert.equal(A.prefs().quality,15);assert.equal(A.prefs().musicSensitivity,93);assert.equal(A.prefs().reduced,true);assert.equal(A.prefs().worldGlow,60);
A.selectScene('not-a-world');assert.equal(A.prefs().scene,'pelagic');A.set({worldGlow:Infinity,worldActivity:-200,intensity:1000});
assert.equal(A.prefs().worldGlow,60);assert.equal(A.prefs().worldActivity,0);assert.equal(A.prefs().intensity,100);
const malformed=load({storage:new Map([['afterlight.worlds.v1','{bad json'],['afterlight.v1','{bad json']])});assert.equal(malformed.A.prefs().scene,'city');
h.visibility(true);A.set({reduced:false});A.selectScene('sleeper');A.hostRecover(false);assert.equal(h.pending.size,0,'World switch cannot animate a hidden document');
h.visibility(false);assert.equal(h.pending.size,1);
assert.equal(A.png().width,3840);assert.equal(A.png().height,2160);
console.log('PASS: nine worlds x twelve palette/weather combinations, finite geometry, all six actions, one loop, independent persistence/migration/reopen/reset, validation and pause/hidden/reduced-motion recovery.');

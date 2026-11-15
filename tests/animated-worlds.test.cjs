'use strict';
// Check actual pixel movement without clicks, music, parallax or weather.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),load=require('./world-harness.cjs');
const h=load({real:true}),A=h.A,results=[];
const pixels=()=>h.visible.getContext('2d').getImageData(0,0,960,540).data.slice();
const diff=(a,b)=>{let count=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>=10)count++;return count;};
for(const world of A.worlds()){
  A.selectScene(world.id);A.set({reduced:false,parallax:false,daycycle:false,weather:'clear',musicSpectrum:false,worldActivity:65,worldFeature:true});A.musicOff();
  h.advance(3000);h.advance(100);const before=pixels(),start=A.diagnostics().frame;
  for(let i=0;i<40;i++)h.advance(100);
  const changed=diff(before,pixels());assert(changed>20,world.id+' must visibly animate without user input or music: '+changed);
  const advanced=A.diagnostics().frame-start;assert(advanced>20);
  A.pause(true);const still=pixels();for(let i=0;i<12;i++)h.advance(100);assert.equal(diff(still,pixels()),0,'Pause holds the actual image');A.pause(false);
  results.push({id:world.id,ambientPixelsChanged:changed,framesAdvanced:advanced,pausedPixelsChanged:0});
}
const output=path.join(__dirname,'../out/checks/renderer');
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'animation-results.json'),JSON.stringify({input:'Host-driven animation only; no music, click, weather or parallax',threshold:10,results},null,2));
console.log('PASS: all nine scenes animate actual artwork, not static photos; pause holds actual pixels.',results);

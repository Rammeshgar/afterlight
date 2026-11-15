'use strict';
// Real raster comparisons. This test never starts Afterlight, an audio device,
// Seneschal, a browser session or a provider. Synthetic spectra only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {createCanvas}=require('@napi-rs/canvas');
const home=path.resolve(__dirname,'..');
const keys=['train','lantern','cat','meteor','light','water'];
const defaults={palette:'nocturne',weather:'clear',intensity:55,worldActivity:65,worldGlow:60,worldFeature:true,musicStrength:40};
const silence={level:0,bass:0,mid:0,high:0,bands:Array(16).fill(0)};
const signal={level:.11,bass:.13,mid:.09,high:.05,bands:Array(16).fill(.11)};
function hash(buf){return crypto.createHash('sha256').update(buf).digest('hex');}
function difference(a,b,min=10){let n=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>=min)n++;return n;}
function mix(a,b,t){
  const channels=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
  const left=channels(a),right=channels(b);
  return '#'+left.map((value,index)=>Math.round(value+(right[index]-value)*t).toString(16).padStart(2,'0')).join('');
}
function harness(id){
  const canvas=createCanvas(960,540);let ctx=canvas.getContext('2d'),sideEffects=0;
  const no=()=>{sideEffects++;throw new Error('Forbidden owned side effect');};
  const scope={document:{createElement:tag=>{assert.equal(tag,'canvas');return createCanvas(960,540);}},requestAnimationFrame:no,cancelAnimationFrame:no,setTimeout:no,setInterval:no,fetch:no,WebSocket:no,AudioContext:no,Audio:no,addEventListener:no,localStorage:{getItem:no,setItem:no},console};scope.window=scope;
  for(const file of ['seneschal-art.js','seneschal-worlds.js'])vm.runInNewContext(fs.readFileSync(path.join(home,'web',file),'utf8'),scope,{filename:file});
  const r=(x,y,w,h,c)=>{assert([x,y,w,h].every(Number.isFinite),'finite pixel geometry');ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
  function line(x,y,xx,yy,c,size=1){x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;let err=dx+dy;for(let guard=0;guard<3000;guard++){r(x,y,size,size,c);if(x===xx&&y===yy)break;const e=err*2;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}}
  function poly(points,c){const lo=Math.floor(Math.min(...points.map(p=>p[1]))),hi=Math.ceil(Math.max(...points.map(p=>p[1])));for(let y=lo;y<=hi;y++){const hits=[];points.forEach((p,i)=>{const q=points[(i+1)%points.length];if((p[1]<=y&&q[1]>y)||(q[1]<=y&&p[1]>y))hits.push(p[0]+(y-p[1])/(q[1]-p[1])*(q[0]-p[0]));});hits.sort((a,b)=>a-b);for(let i=0;i+1<hits.length;i+=2)r(Math.ceil(hits[i]),y,Math.floor(hits[i+1])-Math.ceil(hits[i])+1,1,c);}}
  const K={r,line,poly,mix,context:()=>ctx,layer:()=>createCanvas(960,540),paint(layer,draw){const old=ctx;ctx=layer.getContext('2d');try{draw();}finally{ctx=old;}}};
  const world=scope.AfterlightSeneschalWorlds.create(id,K);
  return {canvas,world,scope,render(t,p={},m=silence){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;world.draw(t,{...defaults,...p},m,{x:0,y:0});return Buffer.from(ctx.getImageData(0,0,960,540).data);},sideEffects:()=>sideEffects};
}
const results=[];
for(const id of ['citylight','nocturne','lunar','foundry']){
  test(id+' has six meaningful distinct actions and real hotspots',()=>{
    const outputs=[];const diffs=[];
    for(const key of keys){const control=harness(id),action=harness(id);control.render(0);action.render(0);assert.equal(action.world.effect(key,0),true);const a=control.render(2.4),b=action.render(2.4);const count=difference(a,b);assert(count>75,id+' '+key+' changes only '+count+' pixels');outputs.push(hash(b));diffs.push({action:key,pixels:count});control.world.dispose();action.world.dispose();}
    assert.equal(new Set(outputs).size,6,'every action has a different raster result');const h=harness(id),spots=h.scope.AfterlightSeneschalWorlds.spots(id);assert.equal(spots.length,6);for(const spot of spots){assert(spot.x>=0&&spot.y>=0&&spot.x+spot.w<=960&&spot.y+spot.h<=540);assert.equal(h.world.pointer(spot.x+spot.w/2,spot.y+spot.h/2)?.action,spot.action,id+' '+spot.label+' center routes to its own action');}assert.equal(h.world.effect('not-an-action',0),false);assert.equal(h.sideEffects(),0);results.push({id,actions:diffs});h.world.dispose();
  });
  test(id+' palette, glow, feature and every weather intensity are non-inert',()=>{
    const h=harness(id),original=h.render(0,{worldActivity:0});
    for(const palette of ['ember','sakura'])assert(difference(original,h.render(0,{palette,worldActivity:0}))>20000,'palette changes the scene, not a label');
    const dim=h.render(0,{worldGlow:0,worldActivity:0}),bright=h.render(0,{worldGlow:100,worldActivity:0});assert(difference(dim,bright)>200,'glow changes actual materials');
    const feature=h.render(0,{worldActivity:0,worldFeature:true}),noFeature=h.render(0,{worldActivity:0,worldFeature:false});assert(difference(feature,noFeature)>20,'feature changes actual authored objects');
    for(const weather of ['rain','snow','mist']){const none=h.render(0,{weather,intensity:0,worldActivity:0}),full=h.render(0,{weather,intensity:100,worldActivity:0});assert(difference(none,full)>150,id+' '+weather+' intensity must affect artwork');}
    const frame=h.render(0,{worldActivity:0,weather:'rain'});for(const t of [.1,.2,.3,7,100])assert.equal(hash(h.render(t,{worldActivity:0,weather:'rain'})),hash(frame),'zero activity is genuinely still');
    h.world.dispose();
  });
  test(id+' uses supplied music only, returns exactly to silence, and retains light state',()=>{
    const h=harness(id),still={worldActivity:0,weather:'clear'};const before=h.render(0,still),reactive=h.render(0,still,signal);const changed=difference(before,reactive);assert(changed>500,'music changes authored materials, not a fake meter: '+changed);assert.equal(hash(h.render(0,still,silence)),hash(before));
    const noMusic=h.render(0,{...still,musicStrength:0},signal);assert.equal(hash(noMusic),hash(before));
    h.world.effect('light',0);h.render(0,{...still,palette:'sakura'});assert.equal(h.world.state().lights,false);assert.equal(h.world.state().base.lightsEnabled,false);h.render(0,still);assert.equal(h.world.state().base.lightsEnabled,false);
    const beforeDispose=h.world.state();assert.equal(beforeDispose.ownsAnimationLoop,false);assert.equal(beforeDispose.ownsAudio,false);h.world.dispose();h.world.dispose();assert.equal(h.world.state().disposed,true);assert.equal(h.world.state().base,null);assert.equal(h.world.effect('light',2),false);assert.doesNotThrow(()=>h.world.draw(2,defaults,silence));assert.equal(h.sideEffects(),0);results.find(v=>v.id===id).musicPixels=changed;
  });
}
test('catalog completeness, safe import and real visual deliverables',()=>{
  const h=harness('citylight'),list=h.scope.AfterlightSeneschalWorlds.catalog;assert.equal(list.length,4);for(const entry of list){assert.equal(entry.group,'seneschal');assert.equal(entry.actions.length,6);assert.equal(entry.actionDescriptions.length,6);}assert.equal(h.scope.AfterlightSeneschalWorlds.create('unknown',{...{}}),null);
  for(const file of ['seneschal-art.js','seneschal-worlds.js']){const text=fs.readFileSync(path.join(home,'web',file),'utf8');assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout|fetch|AudioContext|WebSocket)\s*\(/.test(text),'import owns no scheduling, network or sound');assert(!/\beval\s*\(|new\s+Function\b/.test(text));}
  const output=path.join(home,'out/checks/renderer');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'seneschal-art-evidence.json'),JSON.stringify({canvas:'960×540, authored 480×270 two-pixel raster',input:'Synthetic spectrum only; no playback, microphone, provider or private data',pixelThreshold:10,results},null,2));
  for(const entry of list){
    const view=harness(entry.id);view.render(0,{...entry.defaults,worldActivity:65,intensity:40});
    const still=createCanvas(3840,2160),sc=still.getContext('2d');
    sc.imageSmoothingEnabled=false;sc.drawImage(view.canvas,0,0,3840,2160);
    fs.writeFileSync(path.join(output,entry.id+'-4K.png'),still.toBuffer('image/png'));
    fs.writeFileSync(path.join(output,entry.id+'-proof.png'),view.canvas.toBuffer('image/png'));
    view.world.dispose();
  }
  h.world.dispose();
});
module.exports={harness,difference,defaults,silence,signal};

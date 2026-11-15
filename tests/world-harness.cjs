'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
module.exports=function load({real=false,storage=new Map(),webRoot=path.join(__dirname,'../web'),imports=true}={}){
  let now=0,id=0,rectangles=0;const pending=new Map(),events=new Map();
  const createCanvas=real?require('@napi-rs/canvas').createCanvas:null;
  const fake={fillStyle:'#000',globalAlpha:1,imageSmoothingEnabled:false,
    fillRect(...a){assert(a.every(Number.isFinite),'nonfinite rectangle');assert(a[2]>0&&a[3]>0);rectangles++;},
    clearRect(){},drawImage(...a){assert(a.slice(1).every(Number.isFinite),'nonfinite image coordinates');},save(){},restore(){},translate(...a){assert(a.every(Number.isFinite));},setTransform(...a){assert(a.every(Number.isFinite));},resetTransform(){},scale(...a){assert(a.every(Number.isFinite));},beginPath(){},clip(){},ellipse(...a){assert(a.slice(0,7).every(Number.isFinite));},fillText(){}};
  function canvas(){const c=real?createCanvas(960,540):{width:960,height:540,getContext:()=>({...fake})};
    c.dataset={};c.addEventListener=()=>{};c.setAttribute=()=>{};c.getBoundingClientRect=()=>({left:0,top:0,width:960,height:540});return c;}
  const visible=canvas(),document={hidden:false,body:{classList:{toggle(){},remove(){}}},getElementById:()=>visible,createElement:canvas,addEventListener:(type,f)=>events.set(type,f)};
  const scope={document,innerWidth:960,innerHeight:540,performance:{now:()=>now},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
    matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame:f=>{pending.set(++id,f);return id;},cancelAnimationFrame:i=>pending.delete(i),
    dispatchEvent(){},addEventListener(){},CustomEvent:class{constructor(type,data){this.type=type;this.detail=data?.detail;}},Event:class{},console};scope.window=scope;
  for(const file of [...(imports?['seneschal-art.js','seneschal-worlds.js']:[]),'worlds.js','scene.js'])vm.runInNewContext(fs.readFileSync(path.join(webRoot,file),'utf8'),scope,{filename:file});
  return{A:scope.Afterlight,scope,document,visible,pending,storage,advance(ms=40){now+=ms;const jobs=[...pending.values()];pending.clear();jobs.forEach(f=>f(now));},
    elapse(ms){now+=ms;},step(frame,t=19){now+=100;if(frame)scope.Afterlight.musicFrame(frame);scope.Afterlight.previewAt(t);},get rectangles(){return rectangles;},visibility(value){document.hidden=value;events.get('visibilitychange')();}};
};

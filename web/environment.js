'use strict';

/* Atmospheric details are anchored to objects already in the artwork. Their
   only clock is the scene clock, so host pause and Stillness apply here too. */
(() => {
  const TAU=Math.PI*2;
  const fract=n=>n-Math.floor(n);
  const limit=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const ease=(a,b,n)=>{const t=limit((n-a)/(b-a));return t*t*(3-2*t);};
  const fold=(t,speed,offset=0)=>.5+.5*Math.sin(t*speed+offset);
  const noise=(i,j)=>fract(Math.sin(i*179.359+j*112.127)*41923.223);
  const grains=Array.from({length:56},(_,i)=>[noise(i,0),noise(i,1),noise(i,2)]);
  const silhouettes={
    city:[
      {box:[33,0,481,110],shape:'M38 0H477L506 12 501 26 474 30 480 43 465 48 452 44 446 55 423 57 416 44 393 54 365 59 350 68 331 61 315 74 295 71 289 86 269 84 249 94 230 85 213 89 192 75 168 78 155 60 125 65 111 49 86 49 68 40 58 22Z',strength:4,anchor:0}
    ],
    observatory:[
      {box:[9,335,68,117],shape:'M35 338L39 352 47 368 47 384 59 395 59 411 69 421 64 433 75 442 62 449 11 449 17 438 10 426 22 412 17 405 26 391 21 381 28 368Z',strength:3,anchor:1},
      {box:[289,366,51,89],shape:'M313 369L320 384 321 396 326 404 322 415 335 429 328 438 337 448 292 450 295 439 293 431 300 426 297 417 305 405 302 394Z',strength:2.5,anchor:1}
    ],
    sleeper:[
      {box:[1,101,76,229],shape:'M3 103H73L68 127 65 155 56 184 48 210 43 238 38 247 43 268 41 291 40 313 33 326 4 321Z',strength:2.8,anchor:0},
      {box:[885,102,75,225],shape:'M888 104H960V320L925 326 912 311 916 281 921 261 916 240 909 221 904 193 897 155 894 132Z',strength:2.6,anchor:0}
    ],
    pelagic:[
      {box:[54,397,142,138],shape:'M59 400L98 404 125 416 141 429 137 445 158 457 159 474 186 493 191 516 171 528 121 531 87 524 60 508 61 482 72 463 64 442Z',strength:2.6,anchor:1}
    ],
    sanctuary:[
      {box:[0,0,445,142],shape:'M1 0H436L423 12 402 15 397 29 373 34 350 36 342 50 311 47 308 58 286 63 274 62 253 77 242 74 231 71 207 88 212 101 188 108 174 118 150 118 131 132 111 125 94 126 73 119 61 102 43 109 33 101 2 107Z',strength:4.7,anchor:0}
    ],
    citylight:[
      {box:[0,155,86,115],shape:'M0 155L29 160 32 174 49 178 50 190 64 200 60 216 78 229 67 238 80 255 66 266 0 269Z',strength:2.8,anchor:1}
    ],
    nocturne:[
      {box:[278,0,162,144],shape:'M281 0H417L427 16 415 25 420 38 404 46 427 57 416 70 400 73 400 88 379 95 369 113 341 118 338 134 314 142 300 126 293 111 289 91 283 76Z',strength:3.6,anchor:1}
    ]
  };
  const boundaries={
    canalMist:'M151 381L343 379 347 414 421 416 440 382 594 367 612 412 664 413 673 382 713 382 712 415 703 453 157 454Z',
    alpineMist:'M99 276Q215 250 318 266T540 258L637 264 632 288 500 291 387 307 249 309 139 316 106 305Z',
    sleeperTable:'M292 410H675L754 526 735 540H215L219 516Z',
    sleeperGlass:'M82 134H285V347H54L55 296ZM352 132H614V344H350ZM681 133H885L901 344H673Z',
    reefStone:'M0 64L49 37 138 67 214 115 272 171 325 246 310 271 281 283 272 349 299 407 271 455 233 449 220 353 225 283 207 206 177 160 126 128 79 129 35 147 0 174Z M704 92Q776 29 850 65T943 188L942 256 896 298 799 321 735 291 680 244 658 177Z M806 395L930 364 960 393V538H697L730 493 763 456Z',
    pavilionGlass:'M782 202L918 177 918 288 782 299Z',
    avenueLight:'M474 390L550 386 694 424 858 462 960 493V540H0V514L154 474 326 432Z',
    lunarArray:'M789 349L823 298 945 295 960 298V346L894 354Z',
    streetGlass:'M15 154L237 221 222 333 157 339 54 318 11 317Z',
    foundryWindows:'M194 49L346 87 560 146 746 178 744 256 563 276 355 241 208 188Z',
    foundryFloor:'M373 462L617 445 836 442 960 461V540H432Z'
  };
  const shades={
    gold:'#f5c287',white:'#e8dcc6',glass:'#8ac7d9',foam:'#c0dfce',
    cave:'#56b8ca',brass:'#d59550',ember:'#ed8d58',blue:'#87bac8'
  };
  // Bass lights a broad surface, mids pick out the fixtures, and treble
  // brings out smaller details. Coordinates match the day and night plates.
  const playbackLights={
    city:{
      bass:[[391,451,113,67,'glow'],[885,438,77,64,'glow']],
      mid:[[901,322,67,66,'glow'],[91,258,49,69,'glow'],[397,329,40,25,'glow']],
      high:[[653,125,32,31,'glow'],[164,167,51,24,'rain'],[612,336,42,17,'rain']]
    },
    observatory:{
      bass:[[105,340,76,68,'cyan'],[818,456,116,61,'glow']],
      mid:[[856,314,67,58,'glow'],[762,343,52,51,'glow']],
      high:[[558,380,32,48,'glow'],[410,291,59,22,'rain'],[832,162,41,26,'rain']]
    },
    sleeper:{
      bass:[[480,482,193,58,'glow']],
      mid:[[479,47,107,51,'glow'],[584,445,59,31,'glow']],
      high:[[320,375,61,17,'glow'],[653,372,64,19,'glow'],[587,445,23,16,'rain']]
    },
    pelagic:{
      bass:[[394,172,203,107,'cyan'],[781,430,132,59,'cyan']],
      mid:[[810,230,88,93,'cyan'],[786,368,86,45,'glow']],
      high:[[785,143,48,19,'rain'],[566,403,33,22,'glow'],[139,396,64,33,'cyan']]
    },
    sanctuary:{
      bass:[[390,467,141,67,'cyan'],[818,346,84,42,'glow']],
      mid:[[228,420,47,42,'glow'],[571,450,49,52,'glow'],[869,102,71,46,'glow']],
      high:[[43,300,32,28,'glow'],[716,407,50,24,'rain'],[914,408,26,26,'glow']]
    },
    citylight:{
      bass:[[509,463,110,77,'glow'],[891,486,63,67,'glow'],[154,466,73,67,'glow']],
      mid:[[509,350,69,61,'glow'],[96,293,47,62,'glow'],[757,285,52,61,'glow']],
      high:[[494,204,42,55,'glow'],[765,130,29,43,'rain'],[596,354,24,31,'glow']]
    },
    nocturne:{
      bass:[[544,472,126,77,'cyan'],[866,459,68,71,'glow']],
      mid:[[138,261,87,78,'glow'],[807,182,41,69,'glow'],[335,227,32,41,'glow']],
      high:[[552,230,26,50,'rain'],[711,320,24,29,'glow'],[919,263,31,20,'glow']]
    },
    lunar:{
      bass:[[541,383,158,51,'cyan'],[179,357,82,51,'cyan']],
      mid:[[536,323,69,35,'glow'],[335,352,46,25,'cyan'],[704,325,44,32,'glow']],
      high:[[111,298,30,22,'cyan'],[257,305,30,22,'cyan'],[879,328,71,20,'rain']]
    },
    foundry:{
      bass:[[765,508,157,56,'glow'],[420,215,128,69,'glow']],
      mid:[[575,188,105,55,'glow'],[903,361,54,77,'glow'],[703,419,90,47,'glow']],
      high:[[223,111,68,33,'glow'],[787,252,38,44,'cyan'],[528,475,48,25,'rain']]
    }
  };
  function box(c,color,x,y,w,h){
    c.fillStyle=color;
    c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
  }

  function create(id,kit){
    const {canvas,makeStencil,captureTexture,glow}=kit;
    const clips=new Map();
    const plants=(silhouettes[id]||[]).map(profile=>{
      const [,,w,h]=profile.box;
      const layer=canvas(w,h),texture=canvas(w,h);
      const {matte}=makeStencil(profile,null,3);
      return {profile,layer,texture,matte,paint:layer.getContext('2d'),texturePaint:texture.getContext('2d'),palette:null};
    });
    function masked(c,name,paint){
      if(!clips.has(name))clips.set(name,new Path2D(boundaries[name]));
      c.save();c.clip(clips.get(name));paint();c.restore();
    }
    function movingPlants(c,photo,t,p,weather){
      for(const item of plants){
        const {profile,layer,texture,paint,texturePaint,matte}=item;
        const [x,y,w,h]=profile.box;
        if(item.palette!==p.palette){
          captureTexture(texturePaint,photo,profile.box,matte);
          item.palette=p.palette;
        }
        paint.globalCompositeOperation='source-over';
        paint.clearRect(0,0,w,h);
        const bandSize=p.quality===15?15:9;
        for(let row=0;row<h;row+=bandSize){
          const height=Math.min(bandSize,h-row),tip=Math.abs(row/h-profile.anchor);
          const drift=Math.round((Math.sin(t*1.71+row*.026+x*.013)*.71+Math.sin(t*3.27+row*.047)*.23)*tip*profile.strength*weather);
          paint.drawImage(texture,0,row,w,height,drift,row,w,height);
        }
        paint.globalCompositeOperation='destination-in';paint.drawImage(matte,0,0);
        c.drawImage(layer,x,y);
      }
    }
    function mist(c,t,x,y,width,height,color,intensity){
      if(intensity<=0)return;
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<13;i++){
        const [a,b,d]=grains[i],phase=fract(t*(.049+d*.031)+a);
        const layer=ease(0,.18,phase)*(1-ease(.75,1,phase))*(.45+.55*b);
        const reach=width*(.22+d*.18),lift=height*(.20+d*.32);
        const xx=x+(phase-.5)*width,yy=y+Math.sin(t*.78+i*.81)*height*.19+(b-.5)*height*.49;
        glow(c,color,xx,yy,reach,lift,intensity*layer);
      }
      c.restore();
    }
    function vapor(c,t,x,y,height,width,drift,color,intensity,speed){
      if(intensity<=0)return;
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<18;i++){
        const [a,b,d]=grains[i],phase=fract(t*speed*(.68+d*.48)+a);
        const fade=ease(0,.09,phase)*(1-ease(.38,1,phase));
        const twist=Math.sin(t*1.8+i*.38+phase*8)*phase*width*.53;
        const xx=x+phase*phase*drift+twist,yy=y-phase*height;
        glow(c,color,xx,yy,1+phase*(2+width*b),2+phase*(3+width*d*.58),intensity*fade);
      }
      c.restore();
    }
    function windowPulse(c,t,day,targets){
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<targets.length;i++){
        const [x,y,w,h,color]=targets[i],cycle=fold(t,.87+i*.21,i*2.14);
        const moving=ease(.24,.97,cycle);
        glow(c,color,x,y,w,h,moving*(day?.20:.51));
        glow(c,color,x+w*.28,y+h*.39,w*.74,h*.37,moving*(day?.10:.27));
      }
      c.restore();
    }
    function reflection(c,t,x,y,length,spread,color,amount,dir=1){
      for(let i=0;i<21;i++){
        const dep=i/21,fade=1-dep;
        const shimmer=.28+.72*fold(t,2.3,i*.87+y*.026);
        const cx=x+dir*dep*spread*.55+Math.sin(t*2.8+i*.82)*dep*spread*.17;
        const size=(3+spread*dep*.42)*shimmer;
        c.globalAlpha=amount*fade*shimmer;
        box(c,color,cx-size*.5,y+i*length/21,size,1+dep);
        if(i%3===0)box(c,color,cx+size*.77,y+i*length/21,size*.31,1);
      }
      c.globalAlpha=1;
    }
    function city(c,t,day,p,on,lit){
      const pulse=.45+.55*fold(t,1.17,.9);
      if(lit){
        windowPulse(c,t,day,[[882,320,45,28,shades.gold],[919,371,35,26,shades.brass],[179,159,34,15,shades.gold],[47,184,17,27,shades.white]]);
        reflection(c,t,879,499,39,41,shades.gold,(day?.16:.39)*pulse);
      }
      if(on('bridge-lamps')){
        masked(c,'canalMist',()=>mist(c,t*1.09,444,398,490,40,day?shades.white:shades.blue,day?.088:.16));
      }
      vapor(c,t,835,332,105,23,67,shades.white,day?.12:.22,.21);
    }
    function observatory(c,t,day,p,on,lit){
      masked(c,'alpineMist',()=>mist(c,t,383,278,460,48,day?shades.white:shades.blue,day?.15:.21));
      if(lit){
        windowPulse(c,t,day,[[355,369,12,14,shades.gold],[820,302,20,26,shades.gold],[852,265,13,36,shades.gold],[785,370,15,18,shades.brass]]);
        const trace=.38+.62*fold(t,.73,2.1);
        reflection(c,t,409,304,36,26,day?shades.white:shades.gold,trace*(day?.16:.24));
      }
      vapor(c,t,679,308,62,14,-32,shades.blue,day?.17:.14,.12);
    }
    function sleeper(c,t,day,p,on){
      const fast=on('journey')?1.65:1,dim=on('lamp-shade')?.35:1;
      const rate=t*fast,phase=fract(rate*.165);
      const flash=ease(0,.13,phase)*(1-ease(.68,1,phase));
      const x=870-phase*760;
      masked(c,'sleeperGlass',()=>{
        c.globalCompositeOperation='screen';
        glow(c,day?shades.white:shades.gold,x,210,95,190,flash*(day?.27:.32));
        glow(c,shades.blue,x+47,180,60,65,flash*.15);
      });
      masked(c,'sleeperTable',()=>{
        c.globalCompositeOperation='screen';
        glow(c,day?shades.white:shades.gold,x,483,105,42,dim*flash*(day?.41:.51));
        glow(c,shades.gold,478,483,95,49,dim*(.17+.16*fold(t,1.29)));
      });
      vapor(c,t,585,417,83,15,29,day?shades.white:shades.blue,day?.35:.42,.46);
    }
    let causticTile=null;
    function causticTexture(){
      if(causticTile)return causticTile;
      causticTile=canvas(176,116);
      const paint=causticTile.getContext('2d');
      for(let i=0;i<14;i++){
        paint.beginPath();
        const offset=i*13,skew=noise(i,3)*9;
        for(let x=-10;x<202;x+=5){
          const y=offset*.69+skew+Math.sin(x*.039+i*.43)*(6+i*.41)+Math.cos(x*.072+i)*3;
          if(x===-10)paint.moveTo(x,y);
          else paint.lineTo(x,y);
        }
        paint.strokeStyle=i%4?'#459dab9a':'#b7e8dba9';
        paint.lineWidth=i%4?.84:1.7;paint.stroke();
      }
      return causticTile;
    }
    function pelagic(c,t,day,p,on,lit){
      masked(c,'reefStone',()=>{
        c.globalCompositeOperation='screen';
        const tile=causticTexture(),shift=fract(t*.074)*237;
        for(let j=0;j<4;j++){
          c.globalAlpha=(day?.34:.28)*(.64+.36*fold(t,.81,j*.92));
          c.drawImage(tile,Math.round(j*237+shift-194),17+j*114,244,139);
          glow(c,shades.cave,j*291+37+Math.sin(t*.86)*64,144+j*87,122,41,day?.27:.23);
        }
        c.globalAlpha=1;
      });
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<24;i++){
        const [a,b,d]=grains[i],start=i<12?[266,406]:[760,401],phase=fract(t*(.18+d*.12)+a);
        const x=start[0]+Math.sin(t*1.47+i)*5+(b-.5)*phase*44,y=start[1]-phase*(40+d*115);
        const size=1+phase*3+d*2;
        c.globalAlpha=(1-phase)*(.32+d*.38);
        c.strokeStyle=shades.glass;c.lineWidth=1;c.beginPath();c.ellipse(x,y,size,size*.88,0,0,TAU);c.stroke();
        box(c,shades.white,x-size*.4,y-size*.51,1,1);
      }
      c.restore();
      if(lit)windowPulse(c,t,day,[[788,219,28,18,shades.cave],[855,178,23,29,shades.glass],[865,295,15,14,shades.blue]]);
    }
    function sanctuary(c,t,day,p,on,lit){
      if(lit){
        windowPulse(c,t,day,[[229,407,19,24,shades.gold],[571,461,23,24,shades.gold],[485,376,16,16,shades.gold],[806,399,14,18,shades.brass],[694,365,10,13,shades.gold]]);
        reflection(c,t,229,443,43,19,shades.gold,day?.28:.49);
        reflection(c,t,578,494,37,25,shades.gold,day?.22:.45);
      }
      masked(c,'pavilionGlass',()=>mist(c,t,833,281,171,36,shades.white,day?.08:.14));
      const stream=on('waterfall')?1:.37;
      vapor(c,t,881,431,35,17,-25,shades.foam,.29*stream,.72);
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<18;i++){
        const [a,b,d]=grains[i],phase=fract(t*(1.3+a)+d);
        c.globalAlpha=stream*(1-phase)*(.23+d*.46);
        const x=885+(a-.5)*(13+phase*61),y=435+(b-.5)*16+phase*9;
        box(c,shades.foam,x,y,1+d*4,1);
      }
      c.restore();
    }
    function citylight(c,t,day,p,on,lit){
      vapor(c,t,283,169,101,38,95,day?shades.white:shades.blue,day?.42:.44,.18);
      vapor(c,t+.72,328,191,87,29,73,day?shades.white:shades.gold,day?.36:.36,.21);
      if(day){
        masked(c,'avenueLight',()=>{
          c.globalCompositeOperation='multiply';
          const moving=fract(t*.095+.14);
          const amount=ease(.02,.22,moving)*(1-ease(.72,1,moving));
          glow(c,'#557780',70+moving*872,486,260,108,amount*.32);
        });
      }
      if(lit){
        windowPulse(c,t,day,[[498,204,21,31,shades.brass],[489,263,17,32,shades.gold],[180,383,17,21,shades.gold],[820,338,18,23,shades.gold]]);
        reflection(c,t,508,414,109,78,on('billboard')?shades.glass:shades.gold,(day?.17:.32)*(.51+.49*fold(t,1.3)));
      }
    }
    function nocturne(c,t,day,p,on,lit){
      if(on('kitchen')){
        vapor(c,t,128,276,100,18,44,day?shades.white:shades.gold,day?.25:.43,.37);
        masked(c,'streetGlass',()=>{
          c.globalCompositeOperation='screen';
          const wave=fract(t*.18);
          glow(c,shades.gold,53+wave*142,264,40,65,ease(0,.12,wave)*(1-ease(.75,1,wave))*(day?.13:.32));
          for(let i=0;i<46;i++){
            const [a,b,d]=grains[i],phase=fract(t*(.28+d*.66)+a);
            c.globalAlpha=(p.weather==='rain'?.42:.15)*(1-phase)*(.38+d*.62);
            const x=11+b*223,y=161+phase*164;
            box(c,shades.glass,x,y,1,2+d*5);
          }
          c.globalAlpha=1;
        });
      }
      if(lit){
        windowPulse(c,t,day,[[240,153,14,31,shades.gold],[369,222,11,18,shades.gold],[725,259,12,24,shades.gold],[807,205,12,25,shades.gold]]);
        reflection(c,t,802,458,59,34,shades.gold,day?.19:.41,-1);
      }
    }
    function lunar(c,t,day,p,on,lit){
      if(lit){
        windowPulse(c,t,day,[[335,348,13,19,shades.glass],[388,328,19,12,shades.gold],[549,334,37,19,shades.gold],[658,325,23,14,shades.gold],[768,341,15,17,shades.glass]]);
        const cycle=fract(t*.29);
        for(let i=0;i<9;i++){
          const x=793+i*18,y=339-i*1.25,point=fract(cycle-i*.064);
          const flare=(1-ease(.10,.32,point))*(day?.27:.65);
          glow(c,shades.blue,x,y,15,7,flare);
        }
      }
      masked(c,'lunarArray',()=>{
        c.globalCompositeOperation='screen';
        const progress=fract(t*.14+.22);
        const amount=ease(.05,.22,progress)*(1-ease(.73,1,progress));
        glow(c,day?shades.white:shades.glass,797+progress*171,327-progress*11,25,42,amount*(day?.62:.34));
      });
      const point=fract(t*.093+.16),landing=ease(.16,.36,point)*(1-ease(.55,.85,point));
      if(on('runway')&&landing>0){
        c.save();c.globalCompositeOperation='screen';
        glow(c,shades.glass,700+point*43,396,105,22,landing*(day?.16:.37));
        for(let i=0;i<25;i++){
          const [a,b,d]=grains[i],life=fract(t*(.4+d*.34)+a);
          c.globalAlpha=landing*(1-life)*(.18+d*.34);
          const x=683+(b-.5)*(19+life*192),y=395-life*19+life*life*16;
          box(c,shades.white,x,y,1+d*2,1);
        }
        c.restore();
      }
    }
    function foundry(c,t,day,p,on,lit){
      if(lit){
        const phase=fract(t*.078);
        masked(c,'foundryWindows',()=>{
          c.globalCompositeOperation='screen';
          const x=245+phase*490;
          const brightness=ease(0,.13,phase)*(1-ease(.77,1,phase));
          glow(c,shades.gold,x,165,128,46,brightness*(day?.27:.55));
          glow(c,shades.blue,x-67,209,85,31,brightness*.20);
        });
      }
      masked(c,'foundryFloor',()=>{
        c.globalCompositeOperation='screen';
        const turn=fold(t,.84,.46),bay=685+turn*179;
        glow(c,shades.glass,bay,475,110,22,(day?.20:.34)*turn);
        glow(c,shades.gold,807-turn*138,476,82,34,(day?.18:.35)*(1-turn));
      });
      if(on('arc')){
        const step=fract(t*.44);
        for(let i=0;i<7;i++){
          const pulse=1-ease(.085,.26,fract(step-i*.113)),x=575+i*26,y=338-i*.61;
          glow(c,shades.ember,x,y,12,7,pulse*(day?.29:.68));
          if(pulse>.59){c.globalAlpha=pulse*.71;box(c,shades.gold,x-1,y-1,3,2);c.globalAlpha=1;}
        }
      }
    }

    const scenes={city,observatory,sleeper,pelagic,sanctuary,citylight,nocturne,lunar,foundry};
    function draw(c,photo,t,p,on,lit){
      const wind=p.weather==='rain'?1.03+p.intensity*.003:p.weather==='snow'?.72:1;
      c.save();
      movingPlants(c,photo,t,p,wind);
      scenes[id]?.(c,t,p.palette==='daylight',p,on,lit);
      c.restore();
    }
    function react(c,signal,colors){
      const cues=playbackLights[id];
      if(!cues)return;
      c.save();
      c.globalCompositeOperation='screen';
      for(const band of ['bass','mid','high']){
        const energy=signal[band];
        if(energy<.006)continue;
        for(const [x,y,rx,ry,color] of cues[band]){
          const spread=1+energy*.24;
          glow(c,colors[color],x,y,rx*spread,ry*spread,energy*(band==='bass'?.77:.86));
        }
      }
      c.restore();
    }
    return {draw,react};
  }
  window.AfterlightEnvironment={create};
})();

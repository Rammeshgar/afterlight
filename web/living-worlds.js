'use strict';

/* Scene-specific motion and controls for Afterlight Cinema. The host renders
   these layers on its existing clock and stops them with the wallpaper. */
(() => {
  const W=960,H=540,TAU=Math.PI*2;
  const config={
    city:[
      ['canal-ferry','Call the canal ferry','A lit ferry crosses the canal, trailing a wake.',545,462,14],
      ['bridge-lamps','Switch the bridge lamps','Switch the lights beneath the three bridge arches.',537,315,0],
      ['clock-chime','Ring the clock tower','Send a warm pulse across the clock and surrounding rooftops.',655,129,5]
    ],
    observatory:[
      ['aurora','Change the northern sky','Turn the aurora or daytime haze on or off.',233,81,0],
      ['telescope','Track a new star','Turn the brass telescope and follow its sight line.',574,358,8],
      ['beacon','Flash the lake beacon','Send three warm flashes across the lake.',685,425,5]
    ],
    sleeper:[
      ['journey','Change the train speed','Switch between cruising and an express run.',473,282,0],
      ['lamp-shade','Dim the carriage','Switch between the bright cabin and dim reading lights.',546,67,0],
      ['crossing','Pass a signal post','Watch a rail signal sweep past each window.',736,271,6]
    ],
    pelagic:[
      ['sub-flight','Launch a survey sub','Watch the submersible cross the ruins with its searchlight.',240,365,13],
      ['reef','Feed the reef fish','Watch the school gather and circle at this spot.',542,398,8],
      ['floodlights','Switch the reef floodlights','Switch the station’s two searchlights under the window.',829,294,0]
    ],
    sanctuary:[
      ['waterfall','Divert the garden stream','Switch the waterfall between a trickle and full flow.',826,382,0],
      ['blossoms','Shake the cherry blossoms','Scatter a shower of petals over the pond.',193,103,6],
      ['guide-koi','Guide the koi','Watch several koi turn and swim toward the stepping stones.',648,456,9]
    ],
    citylight:[
      ['rush','Switch the traffic lights','Switch the avenue between flowing traffic and a red light.',393,366,0],
      ['tower-lamps','Switch the tower lights','Turn a bank of tower windows on or off.',818,260,0],
      ['billboard','Change the marquee','Swap the marquee color under the city arch.',518,357,0]
    ],
    nocturne:[
      ['rush','Switch the traffic lights','Make drivers slow down for a red light and release them again.',393,389,0],
      ['crosswalk','Guide a pedestrian across','A pedestrian with an umbrella crosses the wet avenue.',738,420,9],
      ['kitchen','Open or close the kitchen','Switch the window lights and steam from the kitchen.',106,305,0]
    ],
    lunar:[
      ['survey','Launch a survey drone','Fly a survey drone across the base and down to the ground.',433,307,10],
      ['dish','Track Earth','Sweep the relay signal toward Earth.',181,172,8],
      ['runway','Switch the landing lights','Turn the animated landing markers on or off.',797,403,0]
    ],
    foundry:[
      ['gantry','Send the cargo hoist','Lower a magnet, pick up a crate and lift it toward the gantry.',742,323,10],
      ['arc','Switch the welding station','Start or stop the welding light and falling sparks.',875,353,0],
      ['gate','Cycle the loading gate','Open or close the lit hangar gate.',655,365,0]
    ]
  };
  const fract=n=>n-Math.floor(n);
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const ease=(a,b,t)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
  const random=(i,offset)=>fract(Math.sin(i*387.44+offset*12.15)*46126.42);
  const grains=Array.from({length:96},(_,i)=>[random(i,0),random(i,1),random(i,2)]);
  const initial=new Set(['bridge-lamps','aurora','waterfall','floodlights','rush','tower-lamps','kitchen','runway','arc','gate']);
  const panes=[[33,125,261,222],[338,121,286,224],[653,122,261,220]];
  function clip(c,x,y,w,h){
    c.beginPath();c.rect(x,y,w,h);c.clip();
  }
  function rect(c,color,x,y,w,h){
    c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
  }
  function line(c,color,x,y,u,v,w=1){
    c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(u),Math.round(v));c.stroke();
  }
  function ellipse(c,color,x,y,a,b,r=0){
    c.fillStyle=color;c.beginPath();c.ellipse(x,y,a,b,r,0,TAU);c.fill();
  }
  function poly(c,color,...points){
    c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
  }
  function subSearchlight(){
    const beam=document.createElement('canvas');
    beam.width=132;beam.height=72;
    const c=beam.getContext('2d'),pixels=c.createImageData(beam.width,beam.height);
    for(let x=0;x<beam.width;x++){
      const spread=3+x*.19,reach=(1-x/beam.width)**1.6;
      for(let y=0;y<beam.height;y++){
        const distance=(y-beam.height/2)/spread,index=(y*beam.width+x)*4;
        pixels.data[index]=117;pixels.data[index+1]=210;pixels.data[index+2]=232;
        pixels.data[index+3]=155*reach*Math.exp(-distance*distance*2);
      }
    }
    c.putImageData(pixels,0,0);
    return beam;
  }

  function create(id,glow,sprite){
    const actions=config[id];
    const values=new Map(actions.map(([key,,,x,y,duration])=>[key,{active:initial.has(key),start:-Infinity,duration,x,y}]));
    let ambientTime=0,lastTime=null,lastInteraction=-Infinity,journey=0,journeySpeed=1,gateOpening=1;
    const on=key=>values.get(key)?.active===true;
    function trigger(key,t,point){
      const action=values.get(key);
      if(!action)return null;
      lastInteraction=t;
      if(action.duration>0){
        action.start=t;
        if(point){action.x=point.x;action.y=point.y;}
      }else action.active=!action.active;
      return {label:actions.find(row=>row[0]===key)[1],active:action.duration===0?action.active:null};
    }
    function age(key,t){
      const action=values.get(key),elapsed=t-action.start;
      return elapsed>=0&&elapsed<=action.duration?elapsed:null;
    }
    function cabin(c,plate,t,day,colors,clock){
      const cross=age('crossing',clock);
      for(const [x,y,w,h] of panes){
        c.save();c.beginPath();c.roundRect(x,y,w,h,19);c.clip();
        // Each window samples its own landscape with a changing horizontal and
        // vertical position. An oversized source crop covers the frame at all times.
        const offset=Math.sin(journey*.093+x*.006)*23;
        c.drawImage(plate,x,y,w,h,x-26+offset,y-6+Math.sin(t*.44)*2,w+52,h+12);
        c.globalAlpha=.40;
        for(let i=0;i<3;i++){
          const post=fract((x*.39+journey*47+i*187)/583)*583-69;
          line(c,day?'#465553':'#1c3038',post,y+47,post,y+h,2+i);
          line(c,day?'#667060':'#33525c',post-8,y+57,post+14,y+57,2);
        }
        if(cross!==null){
          const post=1040-cross*193;
          c.globalAlpha=1;line(c,'#273c46',post,201,post,357,7);
          rect(c,'#243538',post-7,198,14,29);rect(c,'#edaf69',post-3,204,6,5);
          glow(c,colors.glow,post,206,27,21,.9);
        }
        c.globalAlpha=.15;
        for(let i=0;i<3;i++)line(c,colors.mist,x+36+t%13+i*9,y+10,x+158+i*9,y+h,1);
        c.restore();
      }
      if(on('lamp-shade')){
        c.globalAlpha=.25;c.fillStyle=colors.shadow;c.fillRect(0,0,W,H);c.globalAlpha=1;
        glow(c,colors.glow,480,56,96,50,.29);
      }else glow(c,colors.glow,480,56,109,70,.49+.08*Math.sin(t*.91));
      for(let i=0;i<12;i++){
        const [a,b]=grains[i],phase=fract(t*.31+b);
        c.globalAlpha=(1-phase)*(.22+a*.17);
        ellipse(c,colors.mist,589+Math.sin(t*1.4+i)*8+phase*7,432-phase*45,1+phase*3,2+phase,0);
      }
      c.globalAlpha=1;
    }
    function northstar(c,t,day,colors,clock){
      const scan=age('telescope',clock);
      if(scan!==null){
        const aim=-1.19-Math.sin(scan*.51)*.71;
        c.save();c.translate(574,361);c.rotate(aim);
        line(c,'#514335',-8,0,35,0,9);line(c,'#b19464',-9,-3,35,-3,3);
        rect(c,'#d6b685',28,-6,9,12);
        c.globalAlpha=(1-ease(6,8,scan))*.63;line(c,colors.cyan,37,0,267,0);
        c.restore();
      }
      const pulse=age('beacon',clock);
      if(pulse!==null){
        const flare=Math.pow(Math.max(0,Math.sin(pulse*4.8)),3);
        glow(c,colors.glow,685,425,100,69,.85*flare);
        for(let i=0;i<12;i++)glow(c,colors.glow,656-i*17,434+i*4,13+i,3,flare*(.5-i*.034));
      }
    }
    function canal(c,t,day,colors,clock,palette){
      if(on('bridge-lamps')){
        for(const x of [365,540,700]){
          const pulse=.75+.25*Math.sin(t*.8+x*.01);
          glow(c,colors.glow,x,315,41,26,(day?.27:.87)*pulse);
          for(let i=0;i<7;i++)glow(c,colors.glow,x+Math.sin(t+i)*6,354+i*10,8+i,2.5,.27*pulse*(1-i/8));
        }
      }else{
        for(const x of [365,540,700])glow(c,colors.shadow,x,315,43,28,.77);
      }
      const ferry=age('canal-ferry',clock),cycle=ferry===null?fract(t*.039+.14):ferry/14;
      const launch=sprite?.(11,palette);
      if(launch)drawFerry(c,launch,t,cycle,day,colors);
      const chime=age('clock-chime',clock);
      if(chime!==null){
        const fade=(1-ease(0,5,chime))*(.64+.36*Math.cos(chime*8));
        glow(c,colors.glow,655,129,55,46,fade);
        for(let i=0;i<2;i++){
          const r=22+chime*35+i*15;c.globalAlpha=fade*.74;
          c.strokeStyle=colors.glow;c.lineWidth=1;c.beginPath();c.ellipse(655,129,r,r*.51,0,0,TAU);c.stroke();
        }
        c.globalAlpha=1;
      }
    }
    function drawFerry(c,launch,t,phase,day,colors){
      const opacity=ease(0,.15,phase)*(1-ease(.83,1,phase));
      const x=Math.round(342+phase*318),y=Math.round(413+phase*31+Math.sin(t*2.1)*.85);
      const w=Math.round(68+phase*27),h=Math.round(w*launch.tile.height/launch.tile.width);
      const left=Math.round(x-w/2),stern=left+6;
      c.save();clip(c,292,411,421,91);
      const reflection=launch.mirror;
      for(let band=0;band<6;band++){
        const top=band*17,offset=Math.round(Math.sin(t*4+band*.87)*(1+band*.45));
        c.globalAlpha=opacity*(day?.31:.49);
        c.drawImage(reflection,0,top,reflection.width,17,left+offset,y+band*3,w,3);
      }
      for(let i=0;i<7;i++){
        const u=fract(i/7+t*.43),rx=stern-u*71;
        const drift=Math.sin(t*2+i)*1.1;
        c.globalAlpha=opacity*(1-u)*.37;
        line(c,colors.rain,rx-10-u*13,y+4+u*13+drift,rx+5,y+3+u*10,1);
        line(c,colors.cyan,rx-10-u*9,y+1-u*5,rx+6,y+2-u*4,1);
      }
      c.restore();
      c.globalAlpha=opacity;
      c.drawImage(launch.tile,left,y-h,w,h);
      if(!day)glow(c,colors.glow,x+w*.38,y-h*.48,12,9,.33);
      c.globalAlpha=1;
    }

    let whalePlate=null,whaleSprite=null,whaleWater=null,whaleCue=-Infinity;
    function separateWhale(plate,palette){
      const stamp=palette+':whale';
      if(whalePlate===stamp)return;
      whalePlate=stamp;
      const x=300,y=88,w=299,h=143;
      whaleSprite=document.createElement('canvas');whaleSprite.width=w;whaleSprite.height=h;
      const sprite=whaleSprite.getContext('2d');
      sprite.translate(-x,-y);
      const silhouette=new Path2D('M315 100 Q340 97 368 118 L397 127 Q437 113 479 116 Q543 104 580 109 L585 118 Q579 139 554 149 Q540 163 518 172 Q503 190 492 214 L483 214 Q491 193 495 178 Q480 192 445 204 L414 212 L410 206 Q428 185 448 169 Q428 171 402 163 Q380 151 362 154 Q332 142 328 117 Z');
      sprite.clip(silhouette);
      sprite.drawImage(plate,0,0);

      whaleWater=document.createElement('canvas');whaleWater.width=w;whaleWater.height=h;
      const water=whaleWater.getContext('2d');
      // Use the clear water beside the whale as a moving-layer backing, and
      // blend its edges into the original rays and particles.
      water.imageSmoothingEnabled=true;
      water.drawImage(plate,590,y,35,h,0,0,w,h);
      const matte=document.createElement('canvas');matte.width=w;matte.height=h;
      const mask=matte.getContext('2d');
      mask.translate(-x,-y);mask.filter='blur(7px)';mask.lineWidth=18;
      mask.fill(silhouette);mask.stroke(silhouette);
      water.globalCompositeOperation='destination-in';water.drawImage(matte,0,0);
    }
    function swimmingWhale(c,plate,t,clock,palette){
      separateWhale(plate,palette);
      c.drawImage(whaleWater,300,88);
      const cue=clock-whaleCue,visiting=cue>=0&&cue<13;
      const glide=visiting?ease(0,13,cue):.5+.5*Math.sin(t*.36);
      const scale=visiting?1+.25*Math.sin(glide*Math.PI):.91+.055*Math.cos(t*.41);
      const x=visiting?236+glide*165:282+glide*74;
      const y=visiting?90+Math.sin(glide*Math.PI)*62:86+Math.sin(t*.91)*13;
      for(let slice=0;slice<whaleSprite.width;slice+=8){
        const width=Math.min(8,whaleSprite.width-slice);
        const tail=1-slice/whaleSprite.width;
        const stroke=Math.sin(t*2.5-slice*.025)*(2+tail*tail*15);
        const from=Math.round(x+slice*scale),to=Math.round(x+(slice+width)*scale);
        c.drawImage(whaleSprite,slice,0,width,whaleSprite.height,from,Math.round(y+stroke),to-from,Math.round(whaleSprite.height*scale));
      }
    }

    let surveyBeam=null;
    function diving(c,t,day,colors,clock,palette){
      if(on('floodlights')){
        c.save();c.globalCompositeOperation='screen';
        for(const [x,y] of [[807,267],[839,281]]){
          const sway=Math.sin(t*.7+x)*39,g=c.createLinearGradient(x,y,x-290,y+189);
          g.addColorStop(0,day?'#6eccd847':'#a3eff777');g.addColorStop(1,'#68bbc100');
          poly(c,g,[x,y],[x-286,y+82+sway],[x-325,y+189+sway],[x-207,y+142+sway]);
          glow(c,colors.cyan,x,y,19,13,.84);
        }
        c.restore();
      }
      const school=age('reef',clock),target=values.get('reef');
      for(let i=0;i<30;i++){
        const [a,b,d]=grains[i],phase=fract(a+t*(.036+b*.019));
        const x=school===null?216+phase*483:target.x+Math.cos(t*1.24+a*TAU)*(27+b*84);
        const y=school===null?266+b*122+Math.sin(t*1.4+i)*9:target.y+Math.sin(t*1.24+a*TAU)*(9+d*34);
        const size=2+a*5;
        c.globalAlpha=(school===null?.58:.91)*ease(0,.07,phase)*(1-ease(.92,1,phase));
        ellipse(c,i%4===0?'#c59670':'#58aeb6',x,y,size,1.3+b*1.1,.05);
        poly(c,'#93cfca',[x+size-1,y],[x+size*1.7,y-2],[x+size*1.7,y+2]);
      }
      c.globalAlpha=1;
      const sub=sprite?.(12,palette);
      if(!sub)return;
      const run=age('sub-flight',clock),phase=run===null?fract(t*.031+.57):run/13;
      const x=Math.round(124+phase*687),y=Math.round(353+Math.sin(phase*5.3)*39+Math.sin(t*1.5)*3);
      const opacity=ease(0,.08,phase)*(1-ease(.9,1,phase));
      const w=Math.round(73+phase*17),h=Math.round(w*sub.tile.height/sub.tile.width);
      const lampX=x+Math.round(w*.46),lampY=y+Math.round(h*.1),pitch=7+Math.sin(t*1.35)*11;
      c.save();c.globalAlpha=opacity*(day?.56:.79);c.globalCompositeOperation='screen';
      surveyBeam=surveyBeam||subSearchlight();
      c.translate(lampX,lampY);c.rotate(pitch/surveyBeam.width);
      c.imageSmoothingEnabled=true;
      c.drawImage(surveyBeam,0,-surveyBeam.height/2);
      c.restore();
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<8;i++){
        const [a,b,d]=grains[i],part=fract(t*(.31+d*.16)+a);
        c.globalAlpha=opacity*(1-part)*(.19+b*.29);
        ellipse(c,'#91c3ca',x-w*.44-part*51,y+3-part*(25+b*19),.7+part*1.1,.7+part);
      }
      c.restore();
      c.globalAlpha=opacity*.94;
      c.drawImage(sub.tile,Math.round(x-w/2),Math.round(y-h/2),w,h);
      glow(c,colors.cyan,lampX,lampY,12,7,.58);
      c.globalAlpha=1;
    }
    function garden(c,plate,t,day,colors,clock){
      const flow=on('waterfall')?1:.36;
      c.save();clip(c,760,329,156,107);
      for(let i=0;i<43;i++){
        const [a,b,d]=grains[i],phase=fract(b+t*(.44+d*.52)*flow);
        const x=771+a*157+Math.sin(t+a*30)*3,y=328+phase*94;
        c.globalAlpha=.38*flow*(.28+d*.72);
        line(c,colors.mist,x,y,x-3,y+8+d*10,1+d*1.6);
      }
      c.restore();
      const petals=age('blossoms',clock),koi=age('guide-koi',clock),target=values.get('guide-koi');
      for(let i=0;i<(petals===null?16:70);i++){
        const [a,b,d]=grains[i];
        const fall=petals===null?fract(t*.10+b):fract(petals*.20+b*.41);
        const x=(petals===null?58:target.x*.22)+a*(petals===null?400:373)+fall*181;
        c.globalAlpha=.72*(1-ease(.83,1,fall));
        ellipse(c,i%2?'#d78ca3':'#f5c4bc',x,33+fall*386,1.7+d*2.3,.9+d,.3+Math.sin(t*3+i)*.9);
      }
      for(let i=0;i<7;i++){
        const phase=t*.74+i*.88;
        const x=koi===null?422+Math.cos(phase*.57)*(108+i*10):target.x+Math.sin(phase)*(21+i*9);
        const y=koi===null?448+Math.sin(phase*.62)*(18+i*3):target.y+Math.cos(phase)*(8+i*3);
        const tilt=Math.sin(phase)*.46;
        c.globalAlpha=.74;
        ellipse(c,'#482f37',x,y+3,12,4,tilt);
        ellipse(c,i%2?'#e39771':'#e2bd94',x,y,10,3.4,tilt);
        ellipse(c,i%2?'#f3bb8a':'#a75d57',x-2,y,4.5,2.8,tilt);
        poly(c,'#cb8677',[x+7,y],[x+15,y-3+Math.sin(t*7+i)*2],[x+15,y+4]);
      }
      c.globalAlpha=1;
    }
    function avenue(c,t,day,colors,clock){
      const green=on('rush'),red='#ee775b',mint='#80d9ad',signal=green?mint:red;
      const at=id==='citylight'?[392,354]:[394,384];
      rect(c,'#2b3839',at[0]-3,at[1]-14,7,19);
      rect(c,'#61746d',at[0],at[1]+4,2,16);
      rect(c,signal,at[0]-1,at[1]+(green?-2:-10),3,4);
      glow(c,signal,at[0],at[1]+(green?0:-8),14,15,.84);
      if(id==='citylight'){
        for(let i=0;i<22;i++){
          const [a,b,d]=grains[i],x=797+a*53,y=150+b*166;
          const shade=on('tower-lamps')?(d>.64?'#ddb884':'#7ea9a0'):colors.shadow;
          c.globalAlpha=on('tower-lamps')?(.61+.25*Math.sin(t*1.26+i*.9)):.78;
          rect(c,shade,x,y,1+d*2,2+d*2);
        }
        c.globalAlpha=1;
        const color=on('billboard')?'#93dcca':'#d29b71';
        glow(c,color,510,335,52,26,day?.53:.92);
        for(let i=0;i<12;i++){
          const pulse=fract(t*.59+i/12);
          c.globalAlpha=.47+.44*pulse;
          const angle=Math.PI+i*Math.PI/11;
          rect(c,color,510+Math.cos(angle)*33,359+Math.sin(angle)*34,3,3);
        }
        c.globalAlpha=1;return;
      }
      if(on('kitchen')){
        for(let i=0;i<17;i++){
          const [a,b,d]=grains[i],phase=fract(b+t*.34);
          c.globalAlpha=(1-phase)*(.18+d*.18);
          ellipse(c,colors.mist,122+Math.sin(t+i)*8-21*phase,297-phase*57,2+a*5,3+phase*4,.28);
        }
        c.globalAlpha=1;glow(c,colors.glow,128,284,93,55,.36+.13*Math.sin(t*.97));
      }else glow(c,colors.shadow,120,286,95,58,.94);
      const crossing=age('crosswalk',clock);
      if(crossing!==null){
        const progress=ease(0,9,crossing),x=727-progress*472,y=418+Math.sin(progress*Math.PI)*3;
        const stride=Math.sin(crossing*11)*7;
        glow(c,colors.glow,x,y+14,27,9,.49);
        line(c,'#293740',x-2,y,x-4+stride,y+14,4);line(c,'#27333a',x+2,y,x+5-stride,y+13,4);
        poly(c,'#46545c',[x-8,y-17],[x+3,y-20],[x+7,y-1],[x-8,y+2]);
        line(c,'#8c9280',x-2,y-19,x+2,y-9,2);
        ellipse(c,'#733e43',x,y-24,21,6);line(c,'#bb8161',x-15,y-26,x+11,y-27,1);
      }
    }
    function relay(c,t,day,colors,clock){
      if(on('runway')){
        for(let i=0;i<10;i++){
          const f=i/9,x=458+f*351,y=369+f*f*149;
          const pulse=.28+.68*Math.pow(Math.max(0,Math.cos(t*3.8-i*.77)),2);
          glow(c,colors.cyan,x,y,7+f*9,4+f*3,pulse);rect(c,'#c6efda',x,y,2+f*2,1+f);
        }
      }
      const flight=age('survey',clock),phase=flight===null?fract(t*.027+.12):flight/10;
      const x=287+phase*583,y=313-Math.sin(phase*Math.PI)*88;
      c.globalAlpha=ease(0,.08,phase)*(1-ease(.92,1,phase));
      poly(c,'#455967',[x-22,y+2],[x-12,y-4],[x+13,y-4],[x+24,y+1],[x+9,y+10],[x-14,y+8]);
      line(c,'#b3bfb0',x-20,y+1,x+20,y+1,2);
      glow(c,colors.cyan,x-14,y+5,15,9,.9);glow(c,colors.glow,x+15,y+5,15,10,.85);
      for(let i=0;i<6;i++)glow(c,colors.cyan,x-21-i*8,y+5+i*.8,13-i,2.5,.5*(1-i/6));
      c.globalAlpha=1;
      const tracking=age('dish',clock);
      if(tracking!==null){
        const sweep=ease(0,6,tracking),toX=200+sweep*647,toY=168-sweep*94,fade=1-ease(5,8,tracking);
        c.globalAlpha=.56*fade;
        line(c,colors.cyan,157,189,toX,toY,2);
        glow(c,colors.cyan,157,189,40,31,.9);glow(c,colors.cyan,toX,toY,21,13,.88);
        c.globalAlpha=1;
      }
    }
    function foundry(c,t,day,colors,clock) {
      const lift=age('gantry',clock),phase=lift===null?fract(t*.027+.20):lift/10;
      const x=650+phase*142,y=309+Math.sin(phase*Math.PI)*137;
      line(c,'#18252e',x-3,165,x-3,y,3);line(c,'#849796',x-2,165,x-2,y,1);
      rect(c,'#7e7059',x-14,y,24,6);glow(c,colors.glow,x-2,y+4,13,11,.80);
      if(phase>.46){
        poly(c,'#4c5c5c',[x-21,y+10],[x+9,y+10],[x+18,y+18],[x+17,y+42],[x-21,y+42]);
        line(c,'#a9ab90',x-20,y+12,x+12,y+12,2);
        for(let i=0;i<5;i++)line(c,'#273842',x-15+i*7,y+16,x-15+i*7,y+38,2);
        glow(c,colors.cyan,x+10,y+28,6,4,.8);
      }
      c.save();clip(c,650,360,38,43);
      rect(c,'#151f25',650,360,38,43);
      glow(c,colors.glow,668,393,25,23,.95*gateOpening);
      const door=359-gateOpening*37;
      rect(c,'#2c3a40',650,door,38,43);
      for(let i=0;i<6;i++)line(c,'#64736e',651,door+4+i*7,688,door+4+i*7);
      line(c,'#a9946c',651,door+42,687,door+42,2);
      c.restore();
      if(on('arc')){
        const energy=Math.pow(Math.max(0,Math.sin(t*9.7)+.22),3);
        glow(c,colors.cyan,875,355,70,60,.67*energy);
        for(let i=0;i<29;i++){
          const [a,b,d]=grains[i],life=fract(t*(.72+b*.42)+d);
          const x=873+(a-.5)*life*166,y=357-life*68+life*life*122;
          c.globalAlpha=(1-life)*.84;
          line(c,i%3?colors.glow:'#dcf7ee',x,y,x+(a-.5)*5,y-1-life*4,1);
        }
        c.globalAlpha=1;
      }
    }

    const renderers={city:canal,observatory:northstar,sleeper:cabin,pelagic:diving,sanctuary:garden,citylight:avenue,nocturne:avenue,lunar:relay,foundry};
    function draw(c,plate,clock,p,colors){
      if(lastTime===null)lastTime=clock;
      const delta=clamp(clock-lastTime,0,.12);
      const activity=delta*p.worldActivity/100;
      ambientTime+=activity;
      if(id==='sleeper'){
        journeySpeed+=((on('journey')?2.75:1)-journeySpeed)*Math.min(1,delta*2);
        journey+=activity*journeySpeed;
      }
      if(id==='foundry'){
        const target=on('gate')?1:0;
        gateOpening+=p.reduced||delta===0?target-gateOpening:(target-gateOpening)*Math.min(1,delta*2.7);
      }
      lastTime=clock;
      const candidate=renderers[id],day=p.palette==='daylight';
      c.save();
      if(p.worldFeature||clock-lastInteraction<14||clock-whaleCue<13){
        if(id==='pelagic')swimmingWhale(c,plate,ambientTime,clock,p.palette);
        if(id==='sleeper'||id==='sanctuary')candidate(c,plate,ambientTime,day,colors,clock);
        else candidate(c,ambientTime,day,colors,clock,p.palette);
      }
      c.restore();
    }
    const spots=actions.map(([action,label,detail,x,y])=>({action,label,detail,x:x-27,y:y-23,w:54,h:46}));
    const state=key=>values.get(key)?.duration===0?on(key):null;
    return {on,state,trigger,spots,draw,callWhale:t=>{whaleCue=t;},seek:t=>{ambientTime=t;journey=t*(on('journey')?2.75:1);lastTime=t;}};
  }
  window.AfterlightLivingWorlds={create,actions:id=>config[id]};
})();

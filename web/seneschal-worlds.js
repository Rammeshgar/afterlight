'use strict';
/* AFTERLIGHT × SENESCHAL — host-driven pixel environments.
   No scheduling, storage, input listeners, network or audio capture lives here.
   Imported art retains its authorship; these authored interactions and desktop
   details are a separate adaptation, not a destructive rewrite of Seneschal. */
(function (root) {
  const ORDER = ['train', 'lantern', 'cat', 'meteor', 'light', 'water'];
  const catalog = [
    { id:'citylight', group:'seneschal', name:'Citylight', tag:'06 / SENESCHAL ORIGINAL', description:'The original copper moon, olive skyline and mirrored avenue — expanded for a living desktop.', hint:'Meet the terrace cat, send a convoy, or wake the skyline uplink.', feature:'Avenue traffic & tower scan', activity:'City rhythm', glow:'Copper & window light', defaults:{palette:'nocturne',weather:'clear'}, actions:['Send an avenue convoy','Float copper lanterns','Meet the terrace cat','Wake the skyline uplink','Switch the skyline lights','Ripple the road puddles'], actionDescriptions:['A convoy rolls down the avenue and across the raised road.','A small amber lantern procession climbs above the skyline.','The terrace cat sits up, flicks its tail and watches the city.','The skyline antenna sends three expanding communication arcs.','Windows and road reflections switch together, without changing the moon.','Perspective rings spread through the reflective road surface.'] },
    { id:'nocturne', group:'seneschal', name:'City Nocturne', tag:'07 / THE NIGHT KITCHEN', description:'A rain-polished Art Deco street, a late-night kitchen and a small story on every pavement.', hint:'Call the tram, visit the street cat, or warm up the night kitchen.', feature:'Late-night traffic', activity:'Street life', glow:'Shopfront warmth', defaults:{palette:'nocturne',weather:'rain'}, actions:['Call a late-night car','Warm the night kitchen','Greet the street cat','Signal from the civic tower','Switch the shop lights','Ripple the street puddles'], actionDescriptions:['An approaching car follows the same vanishing point as the street.','The kitchen vent releases a layered, warm steam plume.','A ginger cat walks out beside the parked bicycle.','The civic tower sends a short local communication sweep.','Warm windows and neon shop signs switch on or off.','Rain puddles catch expanding, reflected rings.'] },
    { id:'lunar', group:'seneschal', name:'Lunar Relay', tag:'08 / TRANQUILITY / 07', description:'An Earth-facing dish, a working moon base and a survey team on the regolith.', hint:'Dispatch the rover, launch an inspection drone, or meet the surveyor.', feature:'Rover patrol & relay sweep', activity:'Outpost activity', glow:'Habitat warmth', defaults:{palette:'nocturne',weather:'clear'}, weatherHeading:'Orbital atmosphere', weatherNames:{clear:'Vacuum',rain:'Micrometeor trails',snow:'Orbital debris',mist:'Regolith haze'}, actions:['Dispatch the survey rover','Launch an inspection drone','Send out the surveyor','Transmit to Earth','Switch habitat lights','Raise a regolith plume'], actionDescriptions:['A six-wheel survey rover crosses the near landing apron.','A small illuminated inspection drone rises above the habitat.','A suited surveyor steps out and checks a sample instrument.','Three uplink arcs leave the parabolic dish.','Protected habitat windows switch between work light and night mode.','A low dust plume rolls across the terrain; no rain falls in a vacuum.'] },
    { id:'foundry', group:'seneschal', name:'Orbital Foundry', tag:'09 / DOCK NINE', description:'A lit habitat ring, an immense blue planet and an orbital dock alive with careful work.', hint:'Guide a freighter in, start a repair cycle, or release a coolant vent.', feature:'Freighter traffic', activity:'Dock activity', glow:'Dock & habitat light', defaults:{palette:'nocturne',weather:'clear'}, weatherHeading:'Orbital atmosphere', weatherNames:{clear:'Clear orbit',rain:'Meteor stream',snow:'Ice crystals',mist:'Nebula haze'}, actions:['Guide a freighter in','Start the welding arms','Wake the service robot','Send a docking beacon','Switch station lights','Release a coolant vent'], actionDescriptions:['A heavy freighter approaches the illuminated docking structure.','Twin articulated repair arms weld a small hull plate with contained sparks.','A compact maintenance robot inspects the foreground rail.','The central antenna sends a directional docking signal.','Habitat windows and docking lamps switch into night mode.','A directional coolant jet carries glinting vapour away from the dock.'] }
  ];
  const rawSpots = {
    citylight:[['train','Avenue convoy',355,367,271,168],['lantern','Lantern procession',500,150,140,170],['cat','Terrace cat',869,442,88,95],['meteor','Skyline uplink',685,22,140,175],['light','Tower lights',687,170,133,220],['water','Road puddles',215,422,156,114]],
    nocturne:[['train','Late-night car',400,313,260,194],['lantern','Night kitchen',0,329,204,128],['cat','Street cat',263,422,108,102],['meteor','Civic tower',431,22,114,151],['light','Shop lights',211,188,72,143],['water','Street puddles',550,441,228,95]],
    lunar:[['train','Survey rover',485,436,164,93],['lantern','Inspection drone',525,225,142,85],['cat','Surveyor',326,355,114,168],['meteor','Relay dish',110,88,279,173],['light','Habitat lights',447,326,177,79],['water','Regolith plume',645,422,242,109]],
    foundry:[['train','Approaching freighter',180,320,230,93],['lantern','Welding arms',533,437,110,80],['cat','Service robot',18,408,176,116],['meteor','Docking beacon',508,88,150,134],['light','Habitat lights',650,410,160,80],['water','Coolant vent',837,340,119,156]]
  };
  const spots = id => (rawSpots[id] || []).map(([action,label,x,y,w,h]) => ({action,label,x,y,w,h}));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const number=(v,d)=>typeof v==='number'&&Number.isFinite(v)?v:d;
  function normalized(p={}) {
    return {...p, palette:['nocturne','ember','sakura','daylight'].includes(p.palette)?p.palette:'nocturne', weather:['clear','rain','snow','mist'].includes(p.weather)?p.weather:'clear', intensity:clamp(number(p.intensity,55),0,100),worldActivity:clamp(number(p.worldActivity,65),0,100),worldGlow:clamp(number(p.worldGlow,60),0,100),worldFeature:p.worldFeature!==false,musicStrength:clamp(number(p.musicStrength,40),0,100)};
  }
  function create(id,K) {
    if (!catalog.some(v=>v.id===id)) return null;
    if (!K || typeof K.layer!=='function' || typeof K.context!=='function') throw new TypeError('A host world kit is required');
    let output=K.layer(); output.width=960; output.height=540;
    const street=id==='citylight'||id==='nocturne';
    let base=id==='citylight'?root.AfterlightCitylightArt.create(output,{localTraffic:true}):root.AfterlightLegacyArt.create({'nocturne':'pixel-city',lunar:'lunar-relay',foundry:'orbital-foundry'}[id],output,{localTraffic:street});
    let detail=K.layer(),disposed=false,prefs=normalized(),last=null,motion=0,frames=0,bakes=0,detailKey='',lights=true;
    const trigger=Object.fromEntries(ORDER.map(v=>[v,-1000]));
    const particles=Array.from({length:80},(_,i)=>({x:(i*137+29)%480,y:(i*73+19)%270,seed:i*2.399}));
    const vehicles=new Map();
    let C;
    const ctx=()=>K.context();
    function palette(p) {
      if(p.palette==='daylight')return {ink:'#243b42',metal:'#bac6b4',edge:'#678d87',warm:'#cead78',hot:'#ffe5b1',teal:'#a0c9ae',blue:'#91b9c4',red:'#b77c63',steam:'#c6d0bc'};
      const rose=p.palette==='sakura',warm=p.palette==='ember';
      return {ink:'#101b23',metal:warm?'#b69b8d':rose?'#b4abba':'#9aaeb6',edge:warm?'#6e5b63':rose?'#756b87':'#627c8b',warm:warm?'#edb276':rose?'#e7b5a6':'#d6b078',hot:'#ffe0a7',teal:rose?'#c0d9d0':id==='citylight'?'#a2bc9a':'#8bd7ca',blue:warm?'#b2b0cc':'#8eb9d5',red:rose?'#db9eae':'#d28a7b',steam:warm?'#c0a69b':'#aabbbc'};
    }
    function r(x,y,w,h,c){K.r(x,y,w,h,c);}
    function line(x,y,xx,yy,c,size=1){K.line(x,y,xx,yy,c,size);}
    function poly(points,c){K.poly(points,c);}
    function ellipse(x,y,rx,ry,c){for(let yy=-Math.ceil(ry);yy<=ry;yy++){const span=Math.floor(rx*Math.sqrt(Math.max(0,1-yy*yy/(ry*ry))));r(x-span,y+yy,span*2+1,1,c);}}
    function ring(x,y,rx,ry,c,alpha=1){const old=ctx().globalAlpha;ctx().globalAlpha=old*alpha;let prev;for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,pt=[x+Math.cos(a)*rx,y+Math.sin(a)*ry];if(prev)line(...prev,...pt,c);prev=pt;}ctx().globalAlpha=old;}
    function bloom(x,y,rx,ry,c,amount){const old=ctx().globalAlpha;for(const [s,a] of [[1,.12],[.58,.22],[.28,.38]]){ctx().globalAlpha=old*amount*a;ellipse(x,y,rx*s,Math.max(1,ry*s),c);}ctx().globalAlpha=old;}
    function cat(x,y,pose,color=C.warm){
      const q=pose?Math.sin(pose*4):0;
      ellipse(x+5,y+10,12,3,C.ink);ellipse(x+6,y+2,8,6,color);r(x-2,y-7,10,9,color);poly([[x-3,y-6],[x-2,y-13],[x+2,y-8]],color);poly([[x+4,y-8],[x+9,y-12],[x+8,y-5]],color);
      r(x,y-4,2,1,C.teal);r(x+6,y-4,2,1,C.teal);r(x+3,y-1,2,1,C.ink);r(x+3,y,2,3,C.edge);line(x+12,y+2,x+18,y-1,C.warm,2);line(x+18,y-1,x+19+q*2,y-8,C.warm,2);r(x+2,y+5,3,5,color);r(x+9,y+5,3,5,color);
    }
    function railPost(x,y){r(x,y,3,13,C.ink);r(x,y,1,12,C.edge);r(x-1,y-2,5,2,C.metal);}
    function makeVehicle(kind,approaching) {
      const layer=K.layer();
      layer.width=72;
      layer.height=44;
      K.paint(layer,()=>{
        const tram=kind==='tram',taxi=kind==='taxi';
        const body=tram?C.red:taxi?C.warm:C.teal;
        const shade=K.mix(body,C.ink,.44),chrome=K.mix(C.metal,C.hot,.22);
        const glass=K.mix(C.blue,C.ink,.57),glassGlint=K.mix(C.blue,C.metal,.27);
        const nose=approaching?C.hot:C.red;
        const roof=tram?12:19,hood=tram?24:28,side=approaching?8:17;
        ellipse(36,40,32,3,C.ink);
        for(const x of [16,53]){
          ellipse(x,36,7,6,C.ink);
          r(x-3,35,6,3,shade);
          r(x-1,35,3,2,chrome);
        }
        poly([[4,28],[14,hood],[21,roof],[48,roof-2],[61,hood],[68,28],[68,35],[61,39],[11,39],[4,35]],shade);
        poly([[5,28],[15,hood],[23,roof],[48,roof-2],[62,hood],[68,29],[63,33],[11,33]],body);
        poly([[21,hood-2],[26,roof+2],[46,roof],[54,hood-2]],glass);
        line(25,roof+3,45,roof+1,chrome);
        line(23,hood-3,36,roof+3,glassGlint);
        line(48,roof+3,53,hood-3,glassGlint);
        line(37,roof+1,37,hood-3,shade);
        line(8,32,65,32,chrome);
        r(side,30,10,2,shade);
        r(25,35,21,3,C.ink);
        r(32,35,7,2,chrome);
        const lamps=approaching||tram?9:8;
        for(const x of [9,54]){
          r(x-1,32,lamps+2,5,C.ink);
          r(x,33,lamps,3,nose);
          r(x+1,33,lamps-3,1,K.mix(nose,C.hot,.4));
        }
        if(taxi){r(30,roof-5,13,3,shade);r(31,roof-6,11,3,C.hot);}
        if(tram){
          r(30,8,12,3,chrome);
          line(40,8,32,3,C.ink,2);line(32,3,51,2,chrome);
          r(32,15,10,2,C.warm);
        }
      });
      return layer;
    }
    function drawTraffic(p,t) {
      const riverCity=id==='citylight',event=age('train',t),cars=[];
      if(p.worldFeature){
        const lanes=riverCity?[-1,1,-1,1,-1,1]:[-1,1,-1,1,0];
        lanes.forEach((lane,i)=>{
          const fraction=(motion*(.074+(i%3)*.009)+i*.204+.21)%1;
          const depth=lane<0?1-fraction:fraction;
          cars.push({lane,depth,kind:lane===0?'tram':i%3===1?'taxi':'sedan'});
        });
      }
      if(event<9){
        const count=riverCity?3:1;
        for(let i=0;i<count;i++){
          const depth=event*.153-i*.17;
          if(depth>=0&&depth<=1)cars.push({lane:i%2?-1:1,depth,kind:i%2?'sedan':'taxi'});
        }
      }
      const c=ctx();
      const wet=p.weather==='rain'?.68+p.intensity*.003:p.weather==='mist'?.32:.20;
      const reflectionTime=p.worldActivity===0?motion:t;
      cars.sort((a,b)=>a.depth-b.depth);
      for(const {depth,lane,kind} of cars){
        const d=depth*depth;
        const alpha=Math.min(1,depth*14,(1-depth)*16);
        if(alpha<=0)continue;
        const size=(kind==='tram'?1.19:1)*(.075+d*(riverCity?1.25:1.47));
        const x=(riverCity?501:486)+lane*(8+d*(riverCity?133:230))-(kind==='tram'?d*36:0);
        const y=(riverCity?376:319)+d*(riverCity?185:254);
        const approaching=lane>=0;
        const sprite=vehicles.get(kind+':'+approaching);
        const lamp=approaching?C.hot:C.red;
        const reflection=alpha*wet*(p.palette==='daylight'?.21:.49);
        for(let j=0;j<9;j++){
          const width=(5+j*.85)*size,drift=Math.sin(reflectionTime*2.1+j*1.7)*size;
          c.globalAlpha=reflection*(1-j/10);
          for(const offset of [-21,20])r(x+offset*size+drift-width/2,y+2+j*2.6*size,width,1,lamp);
        }
        c.globalAlpha=alpha;
        const w=Math.max(1,Math.round(72*size)),h=Math.max(1,Math.round(44*size));
        c.drawImage(sprite,Math.round(x-w/2),Math.round(y-h+3*size),w,h);
      }
      c.globalAlpha=1;
    }
    function materialDetails(c){
      const sun=prefs.palette==='daylight';
      if(id==='nocturne'){
        // Different materials catch the light separately. Keep these washes
        // within the perspective planes so window recesses remain legible.
        c.globalAlpha=sun?.20:.085;
        poly([[0,25],[238,64],[238,337],[0,377]],C.warm);
        c.globalAlpha=sun?.14:.075;
        poly([[731,35],[959,0],[959,385],[731,346]],C.metal);
        c.globalAlpha=sun?.19:.10;
        poly([[244,65],[350,158],[350,335],[244,363]],C.ink);
        poly([[655,126],[730,39],[730,372],[655,340]],C.ink);
        if(sun){
          c.globalAlpha=.095;
          poly([[729,369],[959,424],[959,512],[610,426]],C.warm);
          c.globalAlpha=.16;
          poly([[0,435],[238,356],[333,361],[89,540],[0,540]],C.ink);
        }
        c.globalAlpha=sun?.22:.28;
        for(const [x,y,w,col] of [[137,474,51,C.warm],[227,512,58,C.warm],[672,459,31,C.teal],[771,514,79,C.blue],[527,398,26,C.metal]]){
          poly([[x,y],[x+w,y-1],[x+w+14,y+4],[x-12,y+6]],col);
          r(x+5,y+4,Math.round(w*.42),1,C.ink);
        }
        // One-pixel coping, bevels and inlaid masonry follow the two facades.
        for(let floor=0;floor<4;floor++){
          const y=126+floor*58;
          c.globalAlpha=sun?.54:.32;
          line(0,y,235,y+13,C.edge);
          line(730,y+5,959,y-16,C.metal);
          for(let x=18;x<226;x+=19+(floor%2)*4){
            const yy=y+Math.floor(x*.053);
            r(x,yy+1,1,3,C.ink);
            r(x+2,yy+1,7,1,C.metal);
          }
        }
        c.globalAlpha=.42;
        for(const x of [5,230,734,949]){
          line(x,78,x,327,C.edge);
          for(let y=96;y<323;y+=43)r(x-2,y,5,2,C.metal);
        }
        for(let y=420;y<540;y+=4){
          const d=(y-375)/165;
          const x=490-d*325+(y*43)%115;
          r(x,y,3+(y%11),1,y%3?C.edge:C.blue);
          r(498+d*255+(y*31)%70,y+1,2+(y%7),1,C.edge);
        }
      }else if(id==='citylight'){
        c.globalAlpha=sun?.53:.31;
        // Ribbed tower cladding and sparse opposite-bank skylights.
        for(let x=708;x<=803;x+=8)line(x,200,x,343,C.edge);
        for(let y=224;y<345;y+=17){line(706,y,808,y,C.ink);line(707,y+1,806,y+1,C.metal);}
        for(const [x,y] of [[185,299],[214,241],[283,320],[395,290],[624,266],[867,289]]){
          line(x-8,y,x+11,y,C.edge);r(x-4,y-5,13,4,C.ink);
          r(x-3,y-5,9,1,C.metal);r(x+8,y-4,2,1,C.warm);
        }
        c.globalAlpha=.27;
        for(let i=0;i<28;i++){
          const y=389+i*5,x=502+(i%2?1:-1)*(17+i*9);
          r(x+(i*53)%42,y,8+i%7,1,i%3?C.edge:C.warm);
        }
      }else if(id==='lunar'){
        c.globalAlpha=sun?.56:.41;
        // Fine reflector stays, riveted survey plates and wheel impressions.
        for(const [x,y] of [[153,176],[181,195],[209,210],[244,219],[278,213],[306,197],[326,182]]){
          line(x,y,248,228,C.metal);
          r(x,y-1,3,2,C.hot);
        }
        for(let i=0;i<25;i++){
          const x=366+i*17,y=486+Math.round(Math.sin(i*.16)*19)-i;
          r(x,y,5+i%4,1,C.edge);r(x+1,y+8,4+i%4,1,C.ink);
        }
        for(let x=469;x<613;x+=13){r(x,354,3,2,C.metal);r(x,358,3,1,C.ink);}
      }else{
        c.globalAlpha=sun?.56:.40;
        // Segmented docking guide, tie-down loops and cast metal edges.
        for(const [x,y] of [[49,441],[134,450],[254,461],[522,470],[735,494],[817,465],[909,444]]){
          line(x-10,y,x+14,y-4,C.edge);
          r(x,y-1,6,2,C.ink);r(x+1,y-2,4,1,C.metal);
        }
        for(let i=0;i<15;i++){
          const x=24+i*16,y=496-i*2;
          line(x,y,x+10,y-1,i%3?C.edge:C.warm);r(x+1,y+4,3,1,C.ink);
        }
        for(let i=0;i<8;i++){const x=525+i*29,y=449+Math.round(Math.sin(i*.6)*7);r(x,y,4,1,C.hot);r(x,y+2,3,2,C.ink);}
      }
      c.globalAlpha=1;
    }
    function bakeDetails(){
      detail.width=960;detail.height=540;
      K.paint(detail,()=>{const c=ctx();c.imageSmoothingEnabled=false;c.clearRect(0,0,960,540);
        materialDetails(c);
        c.save();c.scale(2,2);
        if(id==='citylight'){
          // A small lived-in terrace, away from the signature copper disc.
          poly([[432,257],[480,265],[480,270],[414,270]],C.ink);line(427,257,480,266,C.edge);for(let i=0;i<6;i++)railPost(433+i*9,248+i*1.5);line(433,246,480,254,C.edge);
          r(443,260,9,5,C.edge);r(442,258,11,2,C.metal);for(let i=0;i<5;i++){line(447,258,441+i*3,249-i%3*2,C.teal);r(441+i*3,248-i%3*2,3,2,C.edge);}r(422,265,7,2,C.warm);r(424,262,3,3,C.metal);
        }else if(id==='nocturne'){
          r(155,252,17,4,C.ink);r(157,251,13,1,C.edge);r(171,238,2,14,C.edge);r(170,237,4,1,C.metal);r(174,243,5,7,C.ink);r(175,244,3,4,C.warm);
          for(let i=0;i<5;i++){r(147+i*4,258,3,1,C.edge);r(308+i*5,248+i%2*2,3,1,C.blue);}
        }else if(id==='lunar'){
          // Survey instrument, calibration board and repaired cables.
          line(183,216,180,245,C.metal);line(183,216,196,244,C.edge);line(183,216,169,239,C.edge);r(176,211,15,9,C.ink);r(178,213,11,5,C.metal);r(180,214,5,2,C.blue);line(184,210,184,197,C.edge);r(181,196,8,2,C.hot);
          r(361,225,24,15,C.ink);r(363,227,20,10,C.face||C.edge);for(let i=0;i<4;i++){r(365+i*4,229,2,2,i%2?C.hot:C.teal);r(365+i*4,234,2,1,C.ink);}line(359,241,397,245,C.edge);line(397,245,410,237,C.edge);
          for(let i=0;i<8;i++){r(223+i*7,234+i%2,3,1,C.metal);r(223+i*7,236+i%2,2,1,C.ink);}
        }else{
          // Foreground repair cradle and a visibly functional vapour port.
          poly([[267,232],[297,240],[297,247],[266,239]],C.ink);line(267,231,297,239,C.metal);line(270,234,270,241,C.edge);line(292,240,292,247,C.edge);
          r(438,191,11,18,C.ink);r(440,193,7,14,C.edge);for(let i=0;i<4;i++)r(441,195+i*3,5,1,C.ink);line(446,192,455,188,C.metal);r(452,185,7,5,C.edge);r(454,186,3,2,C.teal);
          r(45,220,14,7,C.ink);r(47,221,10,4,C.edge);r(50,222,4,2,C.blue);
        }
        c.restore();
      });
      if(street){
        for(const sprite of vehicles.values())sprite.width=sprite.height=1;
        vehicles.clear();
        for(const kind of ['sedan','taxi','tram'])for(const direction of [false,true])vehicles.set(kind+':'+direction,makeVehicle(kind,direction));
      }
    }
    function bake(p){if(disposed)return;prefs=normalized(p);C=palette(prefs);base.bake(prefs);const key=prefs.palette;if(detailKey!==key){bakeDetails();detailKey=key;bakes++;}}
    const age=(kind,t)=>t>=trigger[kind]?t-trigger[kind]:1e6;
    function lanterns(t){const a=age('lantern',t);if(a>18)return;for(let i=0;i<9;i++){const lift=a*(4+i%3*.8),x=242+i*10+Math.sin(a*.5+i)*4,y=164+i%3*7-lift;if(y<12)continue;const alpha=clamp((18-a)/3,0,1);ctx().globalAlpha=alpha;r(x,y,5,7,C.warm);r(x+1,y+1,3,4,C.hot);r(x-1,y+6,7,1,C.edge);line(x+2,y+7,x+2,y+10,C.warm);bloom(x+2,y+3,12,13,C.warm,.4);ctx().globalAlpha=1;}}
    function kitchen(t){const a=age('lantern',t);if(a>13)return;const fade=clamp((13-a)/3,0,1);for(let i=0;i<20;i++){const y=181-((a*8+i*3)%73),x=51+Math.sin(a*.7+i*.5)*5+i%3*2;ctx().globalAlpha=fade*(.10+(i%3)*.04);ellipse(x,y,3+(181-y)*.07,2+(181-y)*.035,C.steam);}ctx().globalAlpha=.12*fade;poly([[29,192],[80,192],[84,217],[23,217]],C.warm);ctx().globalAlpha=1;}
    function ripples(t,kind){const a=age('water',t);if(a>9)return;const center=kind==='citylight'?[196,240]:[337,249];for(let i=0;i<6;i++){const f=(a+i*.35)%4/4;ring(center[0]+i%2*21,center[1]+i%3*4,5+f*32,1+f*6,i%2?C.warm:C.teal,(1-f)*.6*clamp((9-a)/2,0,1));}}
    function drone(t){const a=age('lantern',t);if(a>13)return;const f=clamp(a/8,0,1),x=287+Math.sin(a*.5)*28,y=167-Math.sin(f*Math.PI)*65;line(x-10,y,x+10,y,C.metal);r(x-4,y-3,9,6,C.ink);r(x-3,y-2,7,4,C.edge);r(x-1,y-1,3,2,C.teal);for(const s of [-1,1]){r(x+s*12-3,y-2,6,3,C.metal);line(x+s*12-5,y-3,x+s*12+5,y-3,C.edge);r(x+s*12-1,y+2,2,3,C.blue);}if(a<10){ctx().globalAlpha=.10;poly([[x-2,y+3],[x+2,y+3],[x+18,y+45],[x-18,y+45]],C.teal);ctx().globalAlpha=1;}}
    function surveyor(t){const a=age('cat',t);if(a>16)return;const step=Math.sin(a*2.1),x=214-Math.min(a,6)*2.2,y=213;ellipse(x,y+20,9,2,C.ink);r(x-4,y+3,9,10,C.metal);r(x-5,y+4,3,8,C.edge);r(x+4,y+4,3,8,C.metal);ellipse(x,y,6,6,C.lit||C.metal);r(x-4,y-2,8,5,C.ink);r(x-3,y-1,6,2,C.blue);r(x-4,y+12,3,7,C.metal);r(x+2,y+12,3,7,C.edge);r(x-5+(a<6?step:0),y+19,5,2,C.ink);r(x+2-(a<6?step:0),y+19,5,2,C.ink);line(x+6,y+8,x+12,y+2,C.edge);r(x+11,y-1,3,5,C.hot);}
    function dust(t){const a=age('water',t);if(a>11)return;const fade=clamp((11-a)/3,0,1);for(let i=0;i<28;i++){const d=(a*.17+i*.07)%1,x=356+d*75+i%4*3,y=244-Math.sin(d*Math.PI)*(6+i%7);ctx().globalAlpha=(1-d)*fade*.22;ellipse(x,y,3+d*12,1+d*3,C.steam);}ctx().globalAlpha=1;}
    function welding(t){const a=age('lantern',t);if(a>12)return;const x=280,y=231,shift=Math.sin(a*1.3)*3;line(x-14,y-12,x-6,y-17,C.metal,2);line(x-6,y-17,x+shift,y-4,C.edge,2);line(x+21,y-3,x+16,y-15,C.metal,2);line(x+16,y-15,x+4+shift,y-3,C.edge,2);r(x-8,y-2,21,4,C.blue);r(x+shift,y-4,5,3,C.hot);bloom(x+2+shift,y-3,16,12,C.blue,.30);for(let i=0;i<17;i++){const f=(a*1.5+i*.137)%1,dir=i*2.4;const xx=x+2+shift+Math.cos(dir)*f*14,yy=y-4+Math.sin(dir)*f*8+f*f*12;ctx().globalAlpha=1-f;r(xx,yy,i%3===0?2:1,1,i%2?C.warm:C.hot);}ctx().globalAlpha=1;}
    function robot(t){const a=age('cat',t);if(a>16)return;const x=34+Math.sin(Math.min(a,12)/12*Math.PI)*37,y=225+(x-34)*.24;ellipse(x+5,y+12,12,3,C.ink);r(x-1,y+1,14,10,C.edge);r(x+1,y-7,10,8,C.metal);r(x+2,y-5,8,3,C.ink);r(x+3,y-4,2,1,C.teal);r(x+7,y-4,2,1,C.teal);r(x-3,y+9,5,4,C.ink);r(x+9,y+9,5,4,C.ink);line(x+12,y+3,x+18,y-4,C.metal);r(x+16,y-7,4,4,C.hot);line(x-1,y+4,x-5,y+7,C.edge);}
    function coolant(t){const a=age('water',t);if(a>13)return;const fade=clamp((13-a)/3,0,1);for(let i=0;i<39;i++){const f=(a*.3+i*.071)%1,x=457+f*26,y=187-f*(20+i%7*4)+Math.sin(i*2.4)*f*7;ctx().globalAlpha=(1-f)*fade*.45;ellipse(x,y,1+f*4,1+f*2,i%4?C.steam:C.blue);if(i%6===0){ctx().globalAlpha=(1-f)*fade*.75;r(x,y,2,1,C.hot);}}ctx().globalAlpha=1;}
    function spaceWeather(p){
      if(p.weather==='clear'||p.intensity===0)return;const n=p.intensity/100,count=Math.round(n*65),t=motion;
      if(p.weather==='rain'){for(let i=0;i<count;i++){const q=particles[i],x=((q.x+t*(6+i%5))%570)-45,y=((q.y+t*(3+i%4))%330)-25;if(id==='lunar'&&y>150)continue;ctx().globalAlpha=.14+n*.24;line(x,y,x+3+i%4,y+1+i%2,C.blue);ctx().globalAlpha=.55;r(x+3+i%4,y+1+i%2,1,1,C.metal);}ctx().globalAlpha=1;}
      else if(p.weather==='snow'){for(let i=0;i<count;i++){const q=particles[i],x=(q.x+t*(.7+i%3*.3))%495,y=(q.y+t*(.4+i%4*.2))%280;if(id==='lunar'&&y>155)continue;ctx().globalAlpha=.17+n*.4;r(x,y,i%9===0?2:1,1,C.metal);if(i%9===0){line(x-1,y,x+2,y,C.blue);line(x,y-1,x,y+2,C.blue);}}ctx().globalAlpha=1;}
      else {for(let i=0;i<5;i++){ctx().globalAlpha=n*(id==='lunar'?.095:.085);ellipse(100+i*75+Math.sin(t*.025+i)*17,(id==='lunar'?216:80)+i%3*14,100,6+i*3,C.steam);}ctx().globalAlpha=1;}
    }
    function streetWeather(p){
      const n=p.intensity/100;if(!n||p.weather==='clear')return;
      if(p.weather==='rain'){
        ctx().globalAlpha=.12+n*.26;for(let i=0;i<Math.round(n*80);i++){const q=particles[i],x=q.x,y=(q.y+motion*(32+i%6*7))%280-8;line(x,y,x-2,y+4+i%3,C.steam);}
        for(let i=0;i<Math.round(n*18);i++){const f=(motion*.9+i*.17)%1;ring(110+i*17,225+i%4*9,1+f*5,1,C.teal,(1-f)*.30*n);}ctx().globalAlpha=1;
      }else if(p.weather==='snow'){
        ctx().globalAlpha=.3+n*.4;for(let i=0;i<Math.round(n*80);i++){const q=particles[i],x=q.x+Math.sin(motion*.3+i)*5,y=(q.y+motion*(4+i%5))%279-3;r(x,y,i%7===0?2:1,1,C.steam);}ctx().globalAlpha=1;
      }else{for(let i=0;i<4;i++){ctx().globalAlpha=n*.095;ellipse(225+Math.sin(motion*.04+i)*29,149+i*19,257,6+i*2,C.steam);}ctx().globalAlpha=1;}
    }
    function ambient(p,t){
      if(!p.worldFeature)return;
      if(id==='citylight'){if(age('cat',t)>=14)cat(463,257,0,C.edge);}
      else if(id==='nocturne'){if(age('cat',t)>=14)cat(162,248,0,C.edge);}
      else if(id==='lunar'){r(178,214,Math.round(2+p.worldGlow/25),2,C.teal);const scan=2+Math.floor(motion*.9)%6;r(364+scan*2,230,2,1,C.warm);}
      else{r(50,222,1+Math.floor(motion*.6)%4,2,C.teal);if(lights)bloom(455,186,7,5,C.teal,.10+p.worldGlow*.0015);}
    }
    function music(p,m={}) {
      const strength=p.musicStrength/100,level=clamp(number(m.level,0),0,1)*strength,bass=clamp(number(m.bass,0),0,1)*strength;
      if(!level&&!bass)return;
      const energy=clamp(level*2.5+bass*1.5,0,.72),old=ctx().globalAlpha;
      if(id==='citylight'){
        for(let i=0;i<8;i++){const h=3+Math.floor(energy*(9+(i%3)*3));ctx().globalAlpha=energy*.65;r(357+i*5,114-h,2,h,C.teal);r(357+i*5,214+i%3*7,2,1+energy*18,C.warm);}ctx().globalAlpha=1;bloom(378,113,37,26,C.teal,energy*1.7);
      }else if(id==='nocturne'){
        ctx().globalAlpha=energy*.45;poly([[5,191],[92,190],[92,213],[5,217]],C.warm);for(let i=0;i<8;i++){const h=Math.floor(energy*(9+(i%3)*5));r(375+i*4,204-h,2,Math.max(1,h),C.teal);}ctx().globalAlpha=1;bloom(118,133,22,29,C.teal,energy*1.5);
      }else if(id==='lunar'){
        ctx().globalAlpha=energy*.8;for(let i=0;i<5;i++)r(235+i*13,177,5,8,C.hot);for(let i=0;i<8;i++){const h=1+Math.floor(energy*(6+i%3*4));r(365+i*2,236-h,1,h,C.teal);}ctx().globalAlpha=1;bloom(264,184,50,23,C.warm,energy*1.7);
      }else{
        ctx().globalAlpha=energy*.8;poly([[276,209],[302,217],[302,226],[276,219]],C.warm);poly([[337,223],[360,217],[360,224],[337,230]],C.teal);poly([[378,212],[400,206],[400,213],[378,220]],C.warm);for(let i=0;i<6;i++){const h=2+Math.round(energy*(6+i%3*3));r(19+i*4,258-h,2,h,C.teal);}ctx().globalAlpha=1;bloom(347,221,48,21,C.teal,energy*1.7);
      }
      ctx().globalAlpha=old;
    }
    function draw(time,p,m,pan={x:0,y:0}) {
      if(disposed)return;bake(p);const t=Math.max(0,number(time,0)),dt=last===null?0:clamp(t-last,0,.12);last=t;motion+=dt*prefs.worldActivity/100;
      // Space weather is rendered deliberately here; terrestrial rain or snow
      // never appears on the lunar surface or in vacuum.
      base.draw(t,{...prefs,weather:'clear'});
      const c=ctx();c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(number(pan.x,0)*.4),Math.round(number(pan.y,0)*.4));c.drawImage(output,0,0);c.drawImage(detail,0,0);if(street)drawTraffic(prefs,t);c.scale(2,2);ambient(prefs,t);
      if(id==='citylight'){lanterns(t);if(age('cat',t)<14)cat(463-Math.sin(Math.min(age('cat',t),5)/5*Math.PI)*7,252,age('cat',t));ripples(t,id);streetWeather(prefs);}
      else if(id==='nocturne'){kitchen(t);if(age('cat',t)<14)cat(160+Math.min(age('cat',t),6)*2,245,age('cat',t));ripples(t,id);streetWeather(prefs);}
      else if(id==='lunar'){drone(t);surveyor(t);dust(t);spaceWeather(prefs);}
      else{welding(t);robot(t);coolant(t);spaceWeather(prefs);}
      music(prefs,m);c.restore();frames++;
    }
    function effect(kind,time,point){
      if(disposed||!ORDER.includes(kind))return false;const t=Math.max(0,number(time,last===null?0:last));trigger[kind]=t;
      if(kind==='train')base.effect(id==='citylight'||id==='nocturne'?'traffic':id==='lunar'?'rover':'cargo',t);
      if(kind==='meteor')base.effect('signal',t);
      if(kind==='light'){lights=!lights;base.effect('lights',t);}
      return true;
    }
    function pointer(x,y){if(disposed)return undefined;return spots(id).find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);}
    function state(){return {id,lights,triggers:{...trigger},motionTime:motion,frames,detailBakes:bakes,disposed,ownsAnimationLoop:false,ownsListeners:false,ownsAudio:false,base:base?.diagnostics()||null};}
    function dispose(){if(disposed)return;disposed=true;base.dispose();output.width=output.height=detail.width=detail.height=1;for(const sprite of vehicles.values())sprite.width=sprite.height=1;vehicles.clear();output=detail=base=null;}
    return {bake,draw,effect,pointer,state,dispose};
  }
  root.AfterlightSeneschalWorlds={catalog,spots,create};
})(typeof window!=='undefined'?window:globalThis);

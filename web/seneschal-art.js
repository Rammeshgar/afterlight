/* Source: Seneschal/app/wallpapers/citylight-world.js
   SHA-256 (LF): 3a4a75af1dcd7472c37604a63d3e3cccb4f35ef85f47739ddaa85d3795e4345d
   Author: Sadeq Rezai / Seneschal. Imported with the owner's permission.
   Transformation: named export and optional Afterlight traffic hook.
   No additional public redistribution licence is implied by this import. */
/* Citylight: the original Seneschal copper-moon skyline, carefully restored.
   Code-authored pixel art. The workspace host owns every clock, animation frame,
   listener and setting. This renderer has no network, audio or storage access. */
(function (root) {
  'use strict';
  const W = 480, H = 270;
  const palettes = {
    daylight: { daylight:true, sky:'#69918d', lower:'#cab691', haze:'#c3c6a9', far:'#7c9885', mid:'#557563', face:'#6e896f', side:'#3d5a4c', ink:'#2b473d', edge:'#96aa86', stone:'#bec2a0', green:'#bfd2a2', warm:'#c5ab75', hot:'#f4ddb0', red:'#b18b65', moon:'#e0ba77', moonLight:'#ffe3a4', road:'#526c58' },
    nocturne: { sky: '#0c1212', lower: '#23332a', haze: '#65776a', far: '#293a31', mid: '#1e2c25', face: '#27382e', side: '#16231d', ink: '#101b17', edge: '#465b4c', stone: '#627363', green: '#91ac92', warm: '#bb965d', hot: '#dfc69b', red: '#ad7250', moon: '#a1714c', moonLight: '#bc8c5e', road: '#18231d' },
    ember: { sky: '#201815', lower: '#4d3e2b', haze: '#9a8970', far: '#514a36', mid: '#38382a', face: '#484330', side: '#292e24', ink: '#1d251e', edge: '#71674a', stone: '#9a8a65', green: '#b6be8b', warm: '#d6ac70', hot: '#f1d39d', red: '#bf8057', moon: '#bd8350', moonLight: '#dbad6f', road: '#2d3023' },
    sakura: { sky: '#211d23', lower: '#42463c', haze: '#939081', far: '#454b40', mid: '#333a32', face: '#444a3b', side: '#282f29', ink: '#1b2520', edge: '#6f7461', stone: '#9c9e86', green: '#b4c6a7', warm: '#c6a283', hot: '#e9d1b0', red: '#b68278', moon: '#b38b78', moonLight: '#d2ad8f', road: '#2c332b' }
  };
  const finite = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function normalize(p) {
    p = p && typeof p === 'object' ? p : {};
    return {
      palette: Object.prototype.hasOwnProperty.call(palettes, p.palette) ? p.palette : 'nocturne',
      weather: ['clear', 'rain', 'snow', 'mist'].includes(p.weather) ? p.weather : 'clear',
      intensity: clamp(finite(p.intensity, 65), 0, 100),
      worldActivity: clamp(finite(p.worldActivity, 55), 0, 100),
      worldGlow: clamp(finite(p.worldGlow, 55), 0, 100),
      worldFeature: p.worldFeature !== false
    };
  }
  function rng(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function mix(a, b, f) {
    a = parseInt(a.slice(1), 16); b = parseInt(b.slice(1), 16);
    return '#' + [16, 8, 0].map(s => Math.round(clamp(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * f, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  function emissions(c, p, enabled) {
    const v = enabled ? .22 + p.worldGlow / 100 * 1.03 : .035;
    return { green: mix(c.ink, c.green, v), warm: mix(c.ink, c.warm, v), hot: mix(c.ink, c.hot, v), red: mix(c.ink, c.red, v), level: enabled ? .12 + p.worldGlow * .0088 : 0 };
  }
  function tools(ctx) {
    function pixel(x, y, color, w = 1, h = 1) {
      ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    }
    function line(x, y, xx, yy, color, size = 1) {
      x = Math.round(x); y = Math.round(y); xx = Math.round(xx); yy = Math.round(yy);
      const dx = Math.abs(xx - x), sx = x < xx ? 1 : -1, dy = -Math.abs(yy - y), sy = y < yy ? 1 : -1;
      let error = dx + dy;
      for (let n = 0; n < 1400; n++) {
        pixel(x, y, color, size, size); if (x === xx && y === yy) break;
        const e = error * 2; if (e >= dy) { error += dy; x += sx; } if (e <= dx) { error += dx; y += sy; }
      }
    }
    function poly(points, color) {
      const lo = Math.max(0, Math.ceil(Math.min(...points.map(p => p[1])))), hi = Math.min(H - 1, Math.floor(Math.max(...points.map(p => p[1]))));
      for (let y = lo; y <= hi; y++) {
        const hits = [];
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j];
          if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
        hits.sort((a, b) => a - b);
        for (let i = 0; i + 1 < hits.length; i += 2) {
          const x = Math.ceil(hits[i]), end = Math.floor(hits[i + 1]); if (end >= x) pixel(x, y, color, end - x + 1);
        }
      }
    }
    function ellipse(x, y, rx, ry, color) {
      for (let j = -Math.ceil(ry); j <= ry; j++) {
        const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - j * j / (ry * ry)))); pixel(x - dx, y + j, color, dx * 2 + 1);
      }
    }
    function ring(x, y, rx, ry, color) {
      // One-pixel raster ring: no anti-aliasing or blended vector edges.
      for (let j = -Math.ceil(ry); j <= ry; j++) {
        const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - j * j / (ry * ry)))); pixel(x - dx, y + j, color); pixel(x + dx, y + j, color);
      }
    }
    function glow(x, y, rx, ry, color, strength) {
      const alpha = ctx.globalAlpha;
      for (const [scale, factor] of [[1, .18], [.62, .30], [.32, .48]]) {
        ctx.globalAlpha = alpha * strength * factor; ellipse(x, y, rx * scale, Math.max(1, ry * scale), color);
      }
      ctx.globalAlpha = alpha;
    }
    return { pixel, line, poly, ellipse, ring, glow };
  }
  function sky(ctx, q, c) {
    const random = rng(61643);
    for (let y = 0; y < H; y++) q.pixel(0, y, mix(c.sky, c.lower, Math.pow(Math.min(1, y / 181), 2)), W);
    for (let i = 0; i < (c.daylight ? 0 : 93); i++) {
      const x = Math.floor(random() * W), y = Math.floor(random() * 119);
      q.pixel(x, y, i % 13 === 0 ? c.stone : mix(c.sky, c.haze, .54));
      if (i % 31 === 0) q.pixel(x + 1, y, mix(c.sky, c.haze, .25));
    }
    if(c.daylight){
      const cx=106,cy=62,r=27;q.glow(cx,cy,47,43,'#ffe4a8',.09);
      for(let y=-r;y<=r;y++){const span=Math.floor(Math.sqrt(r*r-y*y));q.pixel(cx-span,cy+y,mix('#fff1bf','#f3bd65',(y+r)/(r*2)*.65),span*2+1);}
    }else{
    // The unusually large copper disc is the original scene's signature.
    const cx = 106, cy = 74, r = 49;
    q.glow(cx, cy, r + 12, r + 8, c.moon, .10);
    for (let y = -r; y <= r; y++) {
      const dx = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -dx; x <= dx; x++) {
        if ((y + r) % 9 === 0 || ((y + r) % 9 === 1 && y > 9)) continue;
        const centre = Math.max(0, 1 - Math.hypot(x + 5, y + 7) / (r + 13));
        const grain = ((x * 13 + y * 7) & 15) === 0 ? .045 : 0;
        q.pixel(cx + x, cy + y, mix(c.moon, c.moonLight, Math.min(1, centre * .76 + grain)));
      }
    }
    }
    // Long, almost invisible cloud filaments keep the sky spacious.
    ctx.globalAlpha = .15; q.pixel(57, 94, c.haze, 101); q.pixel(33, 96, c.haze, 156);
    ctx.globalAlpha = .09; q.pixel(161, 64, c.haze, 94); q.pixel(8, 111, c.haze, 217); ctx.globalAlpha = 1;
  }
  function building(q, ctx, c, light, random, x, y, w, bottom, layer, variant) {
    const far = layer === 0, face = far ? c.far : layer === 1 ? c.mid : c.face;
    q.pixel(x, y, face, w, bottom - y); q.pixel(x + w - 3, y, far ? c.far : c.side, 3, bottom - y);
    q.pixel(x, y, far ? mix(c.far, c.haze, .21) : c.edge, w - 2);
    if (variant % 4 === 0) { q.pixel(x + 2, y - 3, face, Math.max(3, w - 5), 3); q.pixel(x + 3, y - 4, c.edge, Math.max(2, w - 7)); }
    if (!far && variant % 5 === 0) { q.pixel(x + w / 2, y - 8, c.edge, 1, 7); q.pixel(x + w / 2, y - 9, light.red); }
    const gap = far ? 4 : 4 + variant % 2, row = far ? 5 : 6;
    for (let yy = y + 4; yy < bottom - 3; yy += row) {
      if (!far && variant % 3 === 0) q.pixel(x + 1, yy + 3, c.side, w - 3);
      for (let xx = x + 2; xx < x + w - 4; xx += gap) {
        const a = random();
        if (a > (far ? .76 : .28)) {
          const color = a > .84 ? light.warm : far ? mix(c.far, light.green, .37) : light.green;
          q.pixel(xx, yy, color, far ? 1 : variant % 3 === 1 ? 1 : 2, far ? 1 : 2);
          if (!far && a > .92 && yy < bottom - 9) q.pixel(xx, yy + 2, c.edge, 2);
        }
      }
    }
    if (!far && w > 16) {
      // Roof services, cable runs, fire stairs: details serve a real silhouette.
      q.pixel(x + 3, y - 5, c.side, 7, 5); q.pixel(x + 3, y - 5, c.stone, 7);
      q.pixel(x + 5, y - 7, c.edge, 3, 2);
      if (variant % 3 === 1) {
        q.line(x + w - 5, y + 6, x + w - 5, bottom - 6, c.edge);
        for (let yy = y + 10; yy < bottom - 5; yy += 9) { q.pixel(x + w - 8, yy, c.ink, 7, 2); q.line(x + w - 8, yy, x + w - 3, yy + 7, c.edge); }
      }
      if (variant % 4 === 2) {
        q.pixel(x + 3, y + 8, c.side, 6, 8); q.pixel(x + 4, y + 9, c.edge, 4, 4); q.pixel(x + 5, y + 10, c.stone, 1, 2);
      }
    }
  }
  function skyline(ctx, q, c, light) {
    const random = rng(20261025);
    // Three genuinely different scales, rather than copies with different tint.
    for (let x = -1, i = 0; x < W; i++) {
      const w = 5 + Math.floor(random() * 10), y = 126 + Math.floor(random() * 30);
      building(q, ctx, c, light, random, x, y, w, 173, 0, i); x += w + 1;
    }
    ctx.globalAlpha = .16; q.pixel(0, 159, c.haze, W, 2); q.pixel(0, 166, c.haze, W); ctx.globalAlpha = 1;
    const blocks = [
      [-3,132,18],[18,111,23],[44,124,18],[65,135,16],[83,116,18],[104,135,16],[123,108,23],[149,125,15],[168,101,20],[191,126,17],[211,112,17],[232,133,19],[255,116,20],[279,129,18],[301,103,22],[327,123,18],[412,112,22],[437,129,16],[456,106,25]
    ];
    blocks.forEach(([x,y,w], i) => building(q,ctx,c,light,random,x,y,w,180,1,i));
    // A stepped civic block and small roof gardens form the left skyline rhythm.
    q.pixel(28, 104, c.mid, 8, 7); q.pixel(30, 101, c.edge, 4, 3);
    q.pixel(171, 93, c.mid, 13, 8); q.pixel(174, 90, c.edge, 7, 3);
    q.pixel(129, 103, c.side, 9, 5); q.line(132, 103, 132, 96, c.stone); q.pixel(131, 94, light.red, 2);
    for (const [x,y] of [[83,114],[281,127],[440,127]]) { q.pixel(x,y,c.edge,8); q.pixel(x+1,y-2,c.far,2,2); q.pixel(x+5,y-3,c.far,2,3); }
    // Foreground warehouse roofs stop at the road horizon; the broad view stays.
    for (let x = -4, i = 0; x < W; i++) {
      const w = 15 + Math.floor(random() * 17), y = 145 + Math.floor(random() * 18);
      building(q,ctx,c,light,random,x,y,w,187,2,i+20); x += w+3;
    }
    q.pixel(0, 179, c.ink, W, 11); q.pixel(0, 180, c.edge, W); q.pixel(0, 183, c.side, W, 5);
    // Shop fronts and sheltered arcades, read as tiny inhabited interiors.
    for (let x=4,i=0;x<W;x+=19,i++) {
      const width=12+(i%3), color=i%4===0?light.warm:mix(c.side,light.green,.52);
      q.pixel(x,174,c.side,width,7); q.pixel(x+1,175,color,width-2,4); q.pixel(x+Math.floor(width/2),175,c.side,1,5);
      if (i%3===0) q.pixel(x,172,c.edge,width+1);
      q.pixel(x+2,180,c.ink,width,2);
    }
    // Narrow elevated cross street, guard rails and support piers.
    q.pixel(0,184,c.ink,W,7);q.pixel(0,184,c.stone,W);q.pixel(0,188,c.edge,W);
    for(let x=7;x<W;x+=16)q.pixel(x,181,c.edge,1,4);
    for(const x of [42,140,355,449]){q.pixel(x,190,c.ink,5,12);q.pixel(x,191,c.edge,1,10);}
  }
  function tower(ctx,q,c,light) {
    const x=347,y=56,w=61;
    q.pixel(x-2,y+5,c.ink,w+4,126);q.pixel(x,y,c.side,w,126);
    q.pixel(x-2,y-3,c.edge,w+4,3);q.pixel(x+3,y-5,c.stone,w-6,2);
    q.pixel(x+8,y-9,c.face,45,4);q.pixel(x+13,y-12,c.edge,34,3);
    q.line(x+30,y-13,x+30,y-29,c.stone);q.pixel(x+29,y-31,light.red,3,2);
    q.line(x+30,y-24,x+21,y-17,c.edge);q.line(x+30,y-21,x+39,y-15,c.edge);
    q.pixel(x+3,y+3,c.face,w-6,104);q.pixel(x+6,y+6,c.ink,w-12,43);
    q.pixel(x+8,y+8,mix(c.ink,c.far,.8),w-16,39);
    for(let row=0;row<6;row++) for(let col=0;col<8;col++) {
      q.pixel(x+10+col*5,y+10+row*6,(row+col)%4===0?light.warm:mix(c.face,light.green,.45),2,2);
    }
    q.pixel(x+7,y+48,c.edge,w-14,2);q.pixel(x+13,y+52,c.ink,35,4);q.pixel(x+18,y+53,light.warm,4);q.pixel(x+26,y+53,light.green,14);
    for(let yy=y+61;yy<179;yy+=7){
      q.pixel(x+5,yy+4,c.side,w-10);
      for(let xx=x+8;xx<x+w-9;xx+=6){q.pixel(xx,yy,(xx+yy)%11<4?light.warm:light.green,2,2);q.pixel(xx,yy+2,c.edge,2);}
    }
    q.pixel(x+3,y+5,c.edge,2,118);q.pixel(x+w-6,y+5,c.ink,3,120);
    q.pixel(x-3,138,c.ink,8,39);q.pixel(x-2,141,c.edge,4,30);q.pixel(x+w-1,126,c.ink,7,55);q.pixel(x+w,130,c.face,4,46);
    for(let yy=134;yy<175;yy+=8)q.pixel(x+w+1,yy,light.warm,1,3);
    q.pixel(x+12,179,c.edge,39,3);q.pixel(x+18,182,c.ink,27,6);q.pixel(x+21,183,light.green,21,2);
    q.glow(x+30,103,49,34,c.green,.10*light.level);
  }
  function avenue(ctx,q,c,light) {
    const random=rng(77016),vx=250,top=187;
    q.pixel(0,191,c.ink,W,79);
    q.poly([[vx-13,top],[vx+13,top],[480,270],[16,270]],c.road);
    q.poly([[vx-16,top],[vx-13,top],[20,270],[8,270]],c.side);
    q.poly([[vx+13,top],[vx+17,top],[480,260],[480,270]],c.side);
    // Sober long reflections, broken into facets of asphalt rather than water.
    for(let y=192;y<H;y++) {
      const d=(y-top)/(H-top),half=13+d*223;
      ctx.globalAlpha=.05+d*.07;q.pixel(vx-half,y,c.green,half*2);
      ctx.globalAlpha=.05+d*.10;q.pixel(vx-3-d*11,y,c.warm,4+d*21);
    }
    ctx.globalAlpha=1;
    q.line(vx-13,top,19,269,c.edge);q.line(vx+13,top,479,269,c.warm);
    q.line(vx-21,top,0,257,c.ink,2);q.line(vx+19,top,479,248,c.ink,2);
    // Expansion joints and paving blocks line the viewing platform.
    q.line(0,207,210,193,c.face);q.line(0,232,171,206,c.side);q.line(411,208,480,216,c.face);
    for(let i=0;i<8;i++){q.line(i*21,270,i*12+143,215,c.side);q.line(438+i*14,270,361+i*8,218,c.side);}
    for(let i=0;i<165;i++) {
      const y=193+random()*77,d=(y-top)/83,x=vx+(random()-.5)*(26+d*435);
      ctx.globalAlpha=(.04+random()*.16)*light.level;
      q.pixel(x,y,i%5===0?c.warm:c.green,1+Math.floor(random()*d*17));
      if(i%9===0)q.pixel(x+2,y+2,c.ink,1+Math.floor(d*8));
    }
    ctx.globalAlpha=1;
    // Lane guides share the original strong single vanishing point.
    q.line(245,190,150,270,mix(c.road,c.green,.35));q.line(256,190,355,270,mix(c.road,c.warm,.28));
    for(const [y,h] of [[192,1],[198,2],[207,3],[221,5],[243,8]]){
      const d=(y-187)/83;q.poly([[250-d*2,y],[251+d*2,y],[252+d*3,y+h],[249-d*3,y+h]],light.hot);
    }
    // Drain grates, repaired tarmac and faint tire grooves keep it a road.
    q.poly([[75,249],[100,239],[112,242],[86,253]],c.ink);for(let i=0;i<5;i++)q.line(80+i*5,249-i*2,85+i*5,250-i*2,c.edge);
    q.poly([[316,231],[335,229],[355,238],[333,241]],mix(c.road,c.ink,.5));
    q.line(222,210,118,267,c.side);q.line(279,210,386,267,c.side);
    for(const side of [-1,1]) for(let i=0;i<5;i++) {
      const d=(i+1)/5,y=191+d*d*68,x=vx+side*(17+d*d*218),height=4+d*18;
      q.pixel(x,y-height,c.ink,1,Math.ceil(height));q.pixel(x+side,y-height,c.edge,1,Math.ceil(height));
      q.line(x,y-height,x-side*(2+d*4),y-height,c.stone);
      q.pixel(x-side*(3+d*4),y-height,side<0?light.green:light.warm,2+d*2);
      q.glow(x-side*4,y-height,5+d*6,3+d*4,side<0?c.green:c.warm,.18*light.level);
      ctx.globalAlpha=.16*light.level;q.pixel(x-side*2,y+3,side<0?c.green:c.warm,2,3+d*5);ctx.globalAlpha=1;
    }
    // Foreground railing, two roof plants and a silent late-night platform.
    q.poly([[0,242],[18,245],[18,270],[0,270]],c.ink);q.pixel(0,241,c.edge,19,2);q.pixel(4,232,c.side,11,10);
    q.pixel(4,231,c.stone,11);q.pixel(8,226,c.far,5,6);q.pixel(5,227,c.far,4,2);q.pixel(11,224,c.edge,3,4);
    q.pixel(469,243,c.ink,11,27);q.pixel(469,242,c.edge,11,2);q.pixel(474,232,c.side,6,10);q.pixel(473,231,c.stone,7);
    q.line(4,266,58,252,c.ink,2);q.line(4,261,58,247,c.edge);q.line(41,256,41,251,c.edge);q.line(19,263,19,257,c.edge);
    q.line(447,252,479,261,c.ink,2);q.line(447,247,479,256,c.edge);q.line(455,255,455,249,c.edge);
  }
  function cachedArt(ctx,c,p,enabled) {
    const q=tools(ctx),light=emissions(c,p,enabled);
    sky(ctx,q,c);skyline(ctx,q,c,light);tower(ctx,q,c,light);avenue(ctx,q,c,light);
  }
  function smallCar(q,ctx,c,light,x,y,s,direction) {
    q.ellipse(x+6*s,y+5*s,10*s,2*s,c.ink);
    q.pixel(x,y,c.side,14*s,4*s);q.poly([[x+3*s,y],[x+5*s,y-3*s],[x+10*s,y-3*s],[x+13*s,y]],c.edge);
    q.pixel(x+5*s,y-2*s,c.ink,5*s,2*s);q.pixel(x+6*s,y-2*s,light.green,2*s);
    q.pixel(x-1*s,y+2*s,c.face,16*s,2*s);q.pixel(x+2*s,y+4*s,c.ink,3*s,2*s);q.pixel(x+11*s,y+4*s,c.ink,3*s,2*s);
    q.pixel(x+(direction>0?14:0)*s,y+2*s,light.hot,2*s);q.pixel(x+(direction>0?0:14)*s,y+2*s,light.red,1*s);
    ctx.globalAlpha=.22*light.level;q.pixel(x+3*s,y+7*s,c.warm,10*s,Math.max(1,s));ctx.globalAlpha=1;
  }
  function roadCar(q,ctx,c,light,progress,lane) {
    const d=progress*progress,y=190+d*85,s=.4+d*1.55,x=250+lane*(4+d*79)-7*s;
    q.ellipse(x+7*s,y+6*s,10*s,2*s,c.ink);
    q.poly([[x+2*s,y-3*s],[x+11*s,y-3*s],[x+15*s,y+3*s],[x-1*s,y+3*s]],c.face);
    q.pixel(x+3*s,y-2*s,c.side,7*s,3*s);q.pixel(x+4*s,y-2*s,c.edge,6*s);
    q.pixel(x-1*s,y+3*s,c.side,16*s,4*s);q.pixel(x+1*s,y+7*s,c.ink,3*s,2*s);q.pixel(x+10*s,y+7*s,c.ink,3*s,2*s);
    const lamps=lane>0?light.hot:light.red;
    q.pixel(x,y+4*s,lamps,3*s,Math.max(1,s));q.pixel(x+11*s,y+4*s,lamps,3*s,Math.max(1,s));
    ctx.globalAlpha=.20*light.level;q.poly([[x,y+9*s],[x+3*s,y+9*s],[x+1*s,y+20*s],[x-2*s,y+20*s]],lane>0?c.warm:c.red);
    q.poly([[x+11*s,y+9*s],[x+14*s,y+9*s],[x+16*s,y+20*s],[x+12*s,y+20*s]],lane>0?c.warm:c.red);ctx.globalAlpha=1;
  }
  function tram(q,ctx,c,light,x,y) {
    q.pixel(x,y-5,c.ink,39,9);q.pixel(x+2,y-7,c.edge,34,2);
    q.pixel(x+1,y-4,c.face,37,6);q.pixel(x+3,y-3,light.warm,31,3);
    for(let i=0;i<6;i++)q.pixel(x+7+i*5,y-3,c.side,1,4);
    q.pixel(x+2,y+1,c.edge,35);q.pixel(x+5,y+3,c.ink,4,2);q.pixel(x+29,y+3,c.ink,4,2);
    q.pixel(x+36,y-1,light.hot,2,2);q.pixel(x+1,y-1,light.red);
    ctx.globalAlpha=.15*light.level;q.pixel(x+2,y+7,c.warm,35,2);ctx.globalAlpha=1;
  }
  function lantern(q,ctx,c,light,x,y,size) {
    q.glow(x,y,size*4,size*5,c.warm,.18*light.level);
    q.pixel(x-size,y-size,light.warm,size*2+1,size*2+2);q.pixel(x,y-size,light.hot,1,size*2);
    q.pixel(x-size,y-size-1,c.edge,size*2+1);q.pixel(x-size,y+size+2,c.edge,size*2+1);
    q.line(x,y+size+3,x-1,y+size+6,c.warm);
  }
  function terrace(q,ctx,c,light,t,catAction) {
    // A tiny occupied viewing terrace on the existing left-hand platform.
    q.pixel(25,237,c.ink,21,2);q.pixel(28,239,c.side,2,7);q.pixel(42,239,c.side,2,3);
    q.pixel(28,231,c.edge,11,2);q.pixel(33,233,c.ink,2,4);
    q.pixel(34,228,light.warm,2,3);q.pixel(36,229,c.warm,1,2);
    const steam=Math.floor(t*3)%4;
    ctx.globalAlpha=.30;q.pixel(34+(steam%2),225-steam,c.haze,1,2);q.pixel(35-(steam%2),222-steam,c.haze);ctx.globalAlpha=1;
    q.pixel(22,229,c.stone,3,3);q.pixel(21,232,c.side,5,5);q.line(24,234,30,232,c.edge);
    q.pixel(22,237,c.ink,2,4);q.pixel(25,237,c.ink,2,3);
    if(!catAction)cat(q,c,light,47,246,t,false);
  }
  function cat(q,c,light,x,y,t,playful) {
    const wag=Math.round(Math.sin(t*3)*2),stretch=playful?Math.round(Math.sin(t*4)*2):0;
    q.pixel(x-4,y-4,c.ink,8+stretch,4);q.pixel(x+3+stretch,y-7,c.ink,4,6);
    q.pixel(x-3,y-4,c.face,6+stretch,2);q.pixel(x+4+stretch,y-6,c.edge,2,3);
    q.pixel(x+3+stretch,y-8,c.ink);q.pixel(x+6+stretch,y-8,c.ink);
    q.pixel(x-4,y-1,c.ink,2,3);q.pixel(x+3+stretch,y-1,c.ink,2,3);
    q.line(x-4,y-3,x-8,y-5+wag,c.ink,2);q.pixel(x+6+stretch,y-5,light.green);
    q.pixel(x-3,y+1,c.edge);q.pixel(x+4+stretch,y+1,c.edge);
    if(playful){q.pixel(x+5+stretch,y-1,c.edge,4,1);q.pixel(x+8+stretch,y-2,c.edge);}
  }
  function livingCity(ctx,q,c,light,t,catAction,localTraffic) {
    if (!localTraffic) {
    // Several independent traffic rhythms make the vanishing-point avenue read
    // as a working road within seconds, without changing its cached geometry.
    for(let i=0;i<6;i++) {
      const lane=i%2===0?1:-1,phase=(t*(.070+(i%3)*.009)+i*.173+.14)%1;
      roadCar(q,ctx,c,light,lane>0?phase:1-phase,lane);
    }
    smallCar(q,ctx,c,light,(t*29+52)%550-32,181,.68,1);
    smallCar(q,ctx,c,light,516-(t*23+119)%550,182,.54,-1);
    smallCar(q,ctx,c,light,(t*35+327)%550-32,181,.64,1);
    tram(q,ctx,c,light,(t*17+212)%580-50,181);
    }
    // A lit service carriage travels on the existing tower-side guide rail.
    const lift=130+Math.floor((.5+.5*Math.sin(t*.7))*39);
    q.pixel(408,lift,c.ink,5,7);q.pixel(409,lift+1,light.warm,3,4);q.pixel(409,lift+6,c.edge,3);
    const scan=65+Math.floor(t*9)%34;
    ctx.globalAlpha=.32*light.level;q.pixel(355,scan,c.green,43,2);ctx.globalAlpha=1;
    // Separate floor banks gently change occupancy; this is local glass light,
    // never a whole-scene brightness pulse or fake audio response.
    for(let i=0;i<3;i++){
      const row=(Math.floor(t*.45)+i*3)%8,x=355+i*12,y=119+row*7;
      ctx.globalAlpha=.48*light.level;q.pixel(x,y,i%2?c.warm:c.green,8,2);ctx.globalAlpha=1;
    }
    // Roof surveyor: short walk, pause, inspect, then return along the parapet.
    const walk=(t*.055)%1,workerX=306+Math.round((walk<.5?walk:1-walk)*18);
    q.pixel(workerX,96,c.stone,2,2);q.pixel(workerX-1,98,c.edge,4,3);
    q.pixel(workerX-1,101,c.ink);q.pixel(workerX+2,101,c.ink);
    q.pixel(workerX+3,98,light.warm,2);
    terrace(q,ctx,c,light,t,catAction);
    for(let i=0;i<2;i++) {
      const rise=(t*3.6+i*38+9)%100;
      lantern(q,ctx,c,light,191+i*34+Math.sin(t*.4+i)*5,151-rise,1);
    }
    // A recognisable courier craft crosses behind the tower, at a much slower
    // scale than foreground traffic. Its wing lights belong to the craft.
    const plane=(t*6.2+249)%550-30;
    q.line(plane-6,82,plane+5,82,c.edge);q.pixel(plane-1,80,c.side,4,3);
    q.pixel(plane+4,81,light.hot,2);q.pixel(plane-7,82,light.red);
    ctx.globalAlpha=.12;
    q.pixel((t*1.2+27)%600-120,109,c.haze,75);q.pixel((t*.7+298)%600-120,46,c.haze,43);
    ctx.globalAlpha=1;
  }
  function releasedLanterns(ctx,q,c,light,phase) {
    for(let i=0;i<8;i++) {
      const rise=clamp(phase*1.18-i*.052,0,1),x=178+i*8+rise*27+Math.sin(rise*5+i)*4,y=167-rise*(101+i%3*10);
      lantern(q,ctx,c,light,x,y,i%3===0?2:1);
    }
  }
  function puddles(ctx,q,c,light,phase) {
    // Rings stay inside the wet roadway, reflecting individual street lamps.
    for(let i=0;i<7;i++) {
      const x=288+(i*29)%117,y=221+(i*17)%39,radius=2+((phase*2+i*.14)%1)*12;
      ctx.globalAlpha=(.85-phase*.34)*light.level;
      q.ring(x,y,radius,radius*.23,i%2?c.warm:c.green);
      q.ring(x,y+1,Math.max(1,radius-2),Math.max(1,radius*.16),c.edge);
      q.pixel(x-radius*.6,y+3,c.warm,radius*1.2);
    }
    ctx.globalAlpha=1;
  }
  const actionRegions=[
    {action:'traffic',label:'Call the late tram',x:165,y:194,w:151,h:66},
    {action:'lanterns',label:'Release rooftop lanterns',x:176,y:42,w:125,h:103},
    {action:'cat',label:'Play with the terrace cat',x:17,y:216,w:50,h:41},
    {action:'signal',label:'Transmit from the tower',x:347,y:54,w:63,h:69},
    {action:'lights',label:'Switch the city lights',x:347,y:126,w:63,h:54},
    {action:'puddles',label:'Ripple the wet avenue',x:328,y:218,w:122,h:45}
  ].map(p=>({...p,x:p.x*2,y:p.y*2,w:p.w*2,h:p.h*2}));
  function weather(ctx,q,c,p,motion) {
    const n=p.intensity/100;if(n<=0)return;
    if(p.weather==='rain') {
      ctx.globalAlpha=.13+n*.26;
      for(let i=0;i<Math.round(35+n*100);i++) {
        const x=(i*83+17)%W,y=(i*53+motion*(34+i%6*7))%282-8;
        q.line(x,y,x-1-i%2,y+3+i%4,c.haze);
      }
      ctx.globalAlpha=.16*n;
      for(let i=0;i<21;i++) {const phase=(motion*.8+i*.167)%1,x=66+(i*47)%365,y=205+(i*23)%61;q.ring(x,y,1+phase*5,1,c.green);}
      ctx.globalAlpha=1;
    } else if(p.weather==='snow') {
      ctx.globalAlpha=.40+n*.25;
      for(let i=0;i<Math.round(20+n*62);i++) {const x=(i*83+Math.sin(motion*.25+i)*6+W)%W,y=(i*41+motion*(4+i%5))%276-3;q.pixel(x,y,c.hot,i%7===0?2:1,1);}
      ctx.globalAlpha=1;
    } else if(p.weather==='mist') {
      for(let i=0;i<4;i++) {ctx.globalAlpha=(.025+n*.032)*(i<2?1:.6);q.ellipse(218+Math.sin(motion*.04+i)*45,157+i*18,285,5+i*3,c.haze);}
      ctx.globalAlpha=1;
    }
  }
  function create(canvas, { localTraffic = false } = {}) {
    if(!canvas||typeof canvas.getContext!=='function')throw new TypeError('Citylight requires a canvas');
    canvas.width=960;canvas.height=540;
    const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('2D canvas unavailable');
    const document=canvas.ownerDocument||root.document;
    const makeCanvas=()=>{if(document&&typeof document.createElement==='function')return document.createElement('canvas');if(typeof root.OffscreenCanvas==='function')return new root.OffscreenCanvas(W,H);throw new Error('An offscreen canvas is required');};
    let cache=makeCanvas(),frame=makeCanvas();cache.width=frame.width=W;cache.height=frame.height=H;
    let cacheContext=cache.getContext('2d',{alpha:false}),frameContext=frame.getContext('2d',{alpha:false});
    if(!cacheContext||!frameContext)throw new Error('Offscreen 2D canvas unavailable');
    let prefs=normalize(),cacheKey='',bakes=0,frames=0,disposed=false,lightsEnabled=true,motion=0,lastTime=null,active=null;
    const q=tools(frameContext);
    function bake(p) {
      if(disposed)return;
      prefs=normalize(p);const key=prefs.palette+'|'+Math.round(prefs.worldGlow)+'|'+lightsEnabled;
      if(cacheKey===key)return;
      cacheContext.setTransform(1,0,0,1,0,0);cacheContext.globalAlpha=1;cacheContext.imageSmoothingEnabled=false;
      cachedArt(cacheContext,palettes[prefs.palette],prefs,lightsEnabled);cacheKey=key;bakes++;
    }
    function draw(timeSeconds,p) {
      if(disposed)return;bake(p);
      const time=Math.max(0,finite(timeSeconds,0)),delta=lastTime===null?0:clamp(time-lastTime,0,.25);lastTime=time;
      // Feature-off and activity-zero are honest still frames, including weather.
      // Manual actions use the host's explicit action clock and remain available.
      if(prefs.worldFeature)motion+=delta*prefs.worldActivity/100;
      const c=palettes[prefs.palette],light=emissions(c,prefs,lightsEnabled);
      const elapsed=active?time-active.at:0,phase=active?clamp(elapsed/active.duration,0,1):0;
      if(active&&elapsed>=active.duration)active=null;
      frameContext.setTransform(1,0,0,1,0,0);frameContext.globalAlpha=1;frameContext.imageSmoothingEnabled=false;frameContext.drawImage(cache,0,0);
      if(prefs.worldFeature)livingCity(frameContext,q,c,light,motion,active?.action==='cat',localTraffic);
      if(!localTraffic&&active&&active.action==='traffic') {
        for(let i=0;i<3;i++){
          const progress=clamp(.18+phase*1.13-i*.16,0,.995);if(progress>.02)roadCar(q,frameContext,c,light,progress,i===1?-1:1);
        }
        smallCar(q,frameContext,c,light,-35+phase*560,181,.88,1);
        tram(q,frameContext,c,light,-40+phase*560,181);
      }
      if(active&&active.action==='lanterns')releasedLanterns(frameContext,q,c,light,phase);
      if(active&&active.action==='cat') {
        const hop=Math.sin(phase*Math.PI*2),x=47+Math.sin(phase*Math.PI)*12,y=246-Math.max(0,hop)*5;
        cat(q,c,light,x,y,elapsed,true);
        q.pixel(62+Math.sin(phase*9)*3,246-Math.abs(Math.sin(phase*9))*3,c.warm,2,2);
      }
      if(active&&active.action==='signal') {
        const amount=Math.sin(phase*Math.PI),scan=64+Math.floor(phase*5%1*35);
        frameContext.globalAlpha=.35+amount*.38;q.pixel(355,scan,c.hot,43,2);frameContext.globalAlpha=.12*amount;
        q.poly([[377,27],[352-phase*80,58],[404+phase*93,58]],c.green);frameContext.globalAlpha=1;
        q.pixel(376,25,light.hot,3,3);
        for(let i=0;i<3;i++){frameContext.globalAlpha=Math.max(0,.7-phase*.7-i*.08);q.ring(377,28,7+phase*32+i*10,3+phase*12+i*4,c.green);}
        frameContext.globalAlpha=1;
      }
      if(active&&active.action==='puddles')puddles(frameContext,q,c,light,phase);
      weather(frameContext,q,c,prefs,motion);
      context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.imageSmoothingEnabled=false;context.drawImage(frame,0,0,960,540);frames++;
    }
    function effect(action,timeSeconds) {
      if(disposed||!actionRegions.some(p=>p.action===action))return false;
      if(action==='lights'){lightsEnabled=!lightsEnabled;return true;}
      const duration={traffic:7,lanterns:7.5,cat:4.6,signal:4.6,puddles:4.2}[action];
      active={action,at:Math.max(0,finite(timeSeconds,lastTime===null?0:lastTime)),duration};return true;
    }
    function dispose() {
      if(disposed)return;disposed=true;active=null;cache.width=frame.width=1;cache.height=frame.height=1;cacheContext=null;frameContext=null;cache=null;frame=null;
    }
    function diagnostics() {
      return {id:'citylight',width:960,height:540,logicalWidth:W,logicalHeight:H,cacheBakes:bakes,frames,disposed,cacheBytes:disposed?0:W*H*8,lightsEnabled,activeAction:active?.action||null,activeEffects:active?1:0,motionTime:motion,ownsAnimationLoop:false,ownsListeners:false,ownsAudio:false,settings:{...prefs}};
    }
    function hotspots(){return disposed?[]:actionRegions.map(p=>({...p}));}
    function hitTest(x,y){if(disposed||!Number.isFinite(x)||!Number.isFinite(y))return null;const p=actionRegions.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h);return p?{...p}:null;}
    return {bake,draw,effect,dispose,diagnostics,hotspots,hitTest};
  }
  root.AfterlightCitylightArt={create};
})(typeof window!=='undefined'?window:globalThis);


/* Source: Seneschal/app/wallpapers/legacy-worlds.js
   SHA-256 (LF): 4b7d3f7d4563dde1669728649ce6558616e8f7ae66aba4fdf4dde2bc7b6c3313
   Author: Sadeq Rezai / Seneschal. Imported with the owner's permission.
   Transformation: named export and optional Afterlight traffic hook.
   No additional public redistribution licence is implied by this import. */
/* Seneschal's original worlds, redrawn as authored two-pixel environments.
   The host owns scheduling, pause/reduced-motion, persistence, and visibility. */
(function (root) {
  'use strict';
  const W = 480, H = 270, TAU = Math.PI * 2;
  const catalog = [
    { id: 'pixel-city', name: 'City Nocturne', description: 'Rain-polished streets, late-night shops and a city still at work.', actions: ['traffic', 'kitchen', 'cat', 'signal', 'lights', 'puddles'] },
    { id: 'lunar-relay', name: 'Lunar Relay', description: 'An Earth-facing relay above a quiet, inhabited lunar outpost.', actions: ['rover', 'drone', 'surveyor', 'signal', 'lights', 'dust'] },
    { id: 'orbital-foundry', name: 'Orbital Foundry', description: 'A working orbital habitat, cargo docks and a blue planetary limb.', actions: ['cargo', 'repair', 'robot', 'signal', 'lights', 'vent'] }
  ];
  const regions = {
    'pixel-city': [ ['traffic','Send a street tram',292,202,65,43], ['kitchen','Steam from the night kitchen',47,195,75,43], ['cat','Greet the balcony cat',99,115,38,45], ['signal','Broadcast from the civic tower',239,51,48,78], ['lights','Switch the shop lights',390,204,49,42], ['puddles','Ripple the wet street',217,245,81,30] ],
    'lunar-relay': [ ['rover','Dispatch the exploration rover',87,232,79,36], ['drone','Launch the inspection drone',319,151,59,47], ['surveyor','Call the surveying crew',407,231,45,55], ['signal','Scan with the relay dish',122,84,125,76], ['lights','Switch the habitat lights',267,180,84,44], ['dust','Send a regolith plume',210,249,95,31] ],
    'orbital-foundry': [ ['cargo','Dock a cargo freighter',378,246,99,35], ['repair','Cycle the repair arms',76,155,68,66], ['robot','Send the maintenance robot',339,197,77,35], ['signal','Transmit from the central mast',293,85,63,64], ['lights','Switch the habitation lights',402,128,48,44], ['vent','Vent the dock coolant',30,248,49,35] ]
  };
  function sceneHotspots(id) { return regions[id].map(([action,label,x,y,w,h])=>({action,label,x:(x-w/2)*2,y:(y-h/2)*2,w:w*2,h:h*2})); }
  const themes = {
    daylight: { daylight: true, sky:'#678e9b', horizon:'#d9b78a', mist:'#b2c3bc', far:'#7c9997', mid:'#526f70', ink:'#263d44', face:'#6e8580', edge:'#9aafa1', metal:'#bec5ae', lit:'#e2dfbe', warm:'#b99a6d', hot:'#ffe0a2', neon:'#6baba1', red:'#bc8271', blue:'#8cbdc5', ground:'#61716d' },
    nocturne: { sky: '#080f21', horizon: '#2a3f58', mist: '#5b7188', far: '#25364d', mid: '#1b2a3b', ink: '#09131e', face: '#263544', edge: '#526478', metal: '#7f929c', lit: '#bdd4d6', warm: '#e4ad68', hot: '#ffdb99', neon: '#76c8bf', red: '#d67f89', blue: '#719fc3', ground: '#24303b' },
    ember: { sky: '#191222', horizon: '#71404c', mist: '#936479', far: '#4c3548', mid: '#382b3e', ink: '#171523', face: '#493944', edge: '#836372', metal: '#b29a9a', lit: '#dfd3bb', warm: '#edab64', hot: '#ffe4a8', neon: '#d6b989', red: '#ed8893', blue: '#a090c2', ground: '#392c38' },
    sakura: { sky: '#191a32', horizon: '#594c70', mist: '#9986aa', far: '#403c59', mid: '#302d49', ink: '#151a2b', face: '#47405a', edge: '#7c708c', metal: '#b2a9b9', lit: '#e0d3dc', warm: '#edba99', hot: '#ffe1bc', neon: '#b8d7cb', red: '#d98fae', blue: '#9aaccf', ground: '#342e48' }
  };
  function number(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
  function clamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }
  function settings(p) {
    p = p || {};
    return { palette: themes[p.palette] ? p.palette : 'nocturne', weather: ['clear', 'rain', 'snow', 'mist'].includes(p.weather) ? p.weather : 'clear', intensity: clamp(number(p.intensity, 65), 0, 100), worldActivity: clamp(number(p.worldActivity, 55), 0, 100), worldGlow: clamp(number(p.worldGlow, 55), 0, 100), worldFeature: p.worldFeature !== false, celestial: p.celestial !== false };
  }
  function random(seed) { return function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
  function lighting(c,p) {
    // Emissive materials, not the ambient palette, respond to the glow slider.
    // The middle setting preserves the authored art; zero is dim, not missing.
    const on=p.lightsEnabled!==false,g=clamp(p.worldGlow,0,100)/100,strength=on?(c.daylight?.18+g*.28:.25+g*1.15):.05;
    function mix(color){const a=parseInt(c.ink.slice(1),16),b=parseInt(color.slice(1),16);return '#'+[16,8,0].map(shift=>Math.round(clamp(((a>>shift)&255)+(((b>>shift)&255)-((a>>shift)&255))*strength,0,255)).toString(16).padStart(2,'0')).join('');}
    return {warm:mix(c.warm),hot:mix(c.hot),neon:mix(c.neon),blue:mix(c.blue),red:mix(c.red),level:on?.15+g*.85:0};
  }
  function paint(ctx) {
    const pixel = (x, y, color, w = 1, h = 1) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    function line(x, y, xx, yy, color, size = 1) {
      x = Math.round(x); y = Math.round(y); xx = Math.round(xx); yy = Math.round(yy);
      const dx = Math.abs(xx - x), sx = x < xx ? 1 : -1, dy = -Math.abs(yy - y), sy = y < yy ? 1 : -1;
      let err = dx + dy;
      for (let guard = 0; guard < 2200; guard++) { pixel(x, y, color, size, size); if (x === xx && y === yy) break; const e = err * 2; if (e >= dy) { err += dy; x += sx; } if (e <= dx) { err += dx; y += sy; } }
    }
    function poly(points, color) {
      const low = Math.max(0, Math.floor(Math.min(...points.map(v => v[1])))), high = Math.min(H - 1, Math.ceil(Math.max(...points.map(v => v[1]))));
      for (let y = low; y <= high; y++) { const hits = []; for (let a = 0, b = points.length - 1; a < points.length; b = a++) { const p = points[a], q = points[b]; if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) hits.push(p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1])); } hits.sort((a, b) => a - b); for (let i = 0; i < hits.length; i += 2) pixel(Math.ceil(hits[i]), y, color, Math.floor(hits[i + 1]) - Math.ceil(hits[i]) + 1, 1); }
    }
    function ellipse(x, y, rx, ry, color) { for (let yy = -Math.ceil(ry); yy <= ry; yy++) { const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)))); pixel(x - dx, y + yy, color, dx * 2 + 1, 1); } }
    function ring(x, y, rx, ry, color, thickness = 1, start = 0, end = TAU) { let prev = null; const count = Math.ceil((end - start) * rx * 1.5); for (let i = 0; i <= count; i++) { const a = start + (end - start) * i / count, pt = [Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry)]; if (prev) line(prev[0], prev[1], pt[0], pt[1], color, thickness); prev = pt; } }
    function glow(x, y, rx, ry, color, alpha = .15) { const inherited=ctx.globalAlpha;ctx.save(); ctx.globalAlpha = inherited * alpha * .25; ellipse(x, y, rx, ry, color); ctx.globalAlpha = inherited * alpha * .45; ellipse(x, y, rx * .60, ry * .55, color); ctx.globalAlpha = inherited * alpha; ellipse(x, y, rx * .28, ry * .25, color); ctx.restore(); }
    function label(text, x, y, color, size = 6) { ctx.fillStyle = color; ctx.font = 'bold ' + size + 'px monospace'; ctx.textBaseline = 'top'; ctx.fillText(text, x, y); }
    return { pixel, line, poly, ellipse, ring, glow, label };
  }
  function sky(ctx, c, seed, count = 90) {
    const q = paint(ctx), rng = random(seed);
    q.pixel(0, 0, c.sky, W, H);
    const bands = [c.sky, c.sky, c.sky, c.far, c.horizon];
    for (let y = 0; y < 165; y++) { ctx.globalAlpha = .08 + Math.pow(y / 165, 3) * .43; q.pixel(0, y, bands[Math.min(4, Math.floor(y / 35))], W); } ctx.globalAlpha = 1;
    for (let i = 0; i < (c.daylight ? 0 : count); i++) { const x = Math.floor(rng() * W), y = Math.floor(rng() * 159), b = rng(); q.pixel(x, y, b > .92 ? c.lit : c.edge); if (b > .985) { q.pixel(x - 1, y, c.mist, 3); q.pixel(x, y - 1, c.mist, 1, 3); } }
  }
  function block(q, x, y, w, h, c, rng, far, l) {
    q.pixel(x, y, far ? c.far : c.mid, w, h); q.pixel(x, y, far ? c.mist : c.edge, w, 1);
    q.pixel(x + w - 4, y + 1, far ? c.horizon : c.ink, 4, h - 1);
    for (let xx = x + 3; xx < x + w - 5; xx += far ? 4 : 6) for (let yy = y + 5; yy < y + h - 3; yy += far ? 5 : 7) { const z = rng(); if (z > .33) q.pixel(xx, yy, z > .87 ? l.warm : z > .66 ? l.blue : c.edge, far ? 1 : 2, far ? 2 : 3); }
    if (!far && w > 20) { q.pixel(x + 3, y - 4, c.face, 8, 4); q.line(x + 6, y - 9, x + 6, y - 4, c.edge); q.pixel(x + 6, y - 10, c.red); }
  }
  function city(ctx, c, p) {
    const q = paint(ctx), rng = random(1703),l=lighting(c,p); sky(ctx, c, 1703, 67);
    if (p.celestial) { if(c.daylight){q.glow(284,32,27,27,'#ffe0a2',.16);q.ellipse(284,32,14,14,'#ffe0a2');}else{q.ellipse(92,43,14,14,'#bdd4d6');q.ellipse(98,39,12,12,c.sky);} }
    q.glow(251, 128, 165, 44, c.neon, .15*l.level);
    for (let x = 8; x < 480;) { const w = 8 + Math.floor(rng() * 20), y = 72 + Math.floor(rng() * 56); block(q, x, y, w, 155 - y, c, rng, true,l); x += w + 2; }
    for (let x = 6; x < 480;) { const w = 15 + Math.floor(rng() * 23), y = 87 + Math.floor(rng() * 38); block(q, x, y, w, 163 - y, c, rng, false,l); x += w + 5; }
    // The civic tower is a recognisable landmark, not a repeated skyline stamp.
    q.pixel(224, 48, c.mid, 30, 108); q.pixel(219, 60, c.face, 40, 12); q.pixel(227, 42, c.edge, 24, 5); q.pixel(236, 26, c.face, 6, 16); q.pixel(238, 17, c.metal, 1, 10); q.pixel(238, 15, c.red, 2, 2);
    q.pixel(229, 57, l.neon, 20); for (let yy = 79; yy < 145; yy += 7) { q.pixel(228, yy, l.blue, 4, 2); q.pixel(237, yy, l.warm, 3, 2); q.pixel(246, yy, c.edge, 3, 2); } q.label('04', 232, 63, l.hot, 7);
    // Street geometry uses one vanishing point; kerbs, rails, and puddles agree.
    q.pixel(0, 158, c.ground, W, 112); q.poly([[223,155],[267,155],[480,270],[0,270]], c.ink);
    for (let y = 164; y < 270; y++) { const t = (y - 156) / 114; ctx.globalAlpha = .06 + t * .15; q.pixel(243 - (21 + t * 197), y, c.blue, 42 + t * 394); } ctx.globalAlpha = 1;
    q.poly([[219,159],[224,159],[54,270],[38,270]], c.edge); q.poly([[266,159],[270,159],[468,270],[450,270]], c.edge);
    q.line(229, 159, 112, 270, c.face); q.line(256, 159, 375, 270, c.face); q.line(232, 159, 130, 270, c.mist); q.line(254, 159, 357, 270, c.edge);
    [175,187,206,237].forEach((y, i) => q.poly([[242-i*2,y],[245+i*2,y],[247+i*2,y+2+i],[241-i*3,y+2+i]],c.warm));
    for (let i = 0; i < 120; i++) { const y = 164 + rng() * 106, d = (y - 156) / 114, x = 244 + (rng() - .5) * (45 + d * 390), col = i % 5 === 0 ? c.red : i % 3 === 0 ? c.warm : c.neon; ctx.globalAlpha = .09 + rng() * .17; q.pixel(x,y,col,2+rng()*d*18,1); } ctx.globalAlpha = 1;
    // Left tenement: angled side, stone bays, iron balconies, warm restaurant.
    q.poly([[0,12],[120,31],[120,184],[0,219]], c.mid); q.poly([[120,31],[176,77],[176,170],[120,184]], c.ink);
    q.line(0, 12, 120, 31, c.edge, 2); q.line(120,31,176,77,c.face); q.line(0,30,120,45,c.face,2);
    for (let floor = 0; floor < 4; floor++) { const top = 43 + floor * 29; q.line(0,top+20,120,top+26,c.face); for (let col = 0; col < 4; col++) { const x = 10 + col * 28, y = top + col * 3; q.pixel(x-2,y-2,c.edge,18,22); q.pixel(x,y,c.ink,14,18); q.pixel(x+1,y+1,(floor+col)%3===0?l.warm:l.blue,11,15); q.pixel(x+7,y,c.face,2,18); q.pixel(x,y+8,c.face,14,2); q.pixel(x-3,y+19,c.ink,21,3); for(let r=0;r<5;r++) q.line(x-3+r*5,y+15,x-3+r*5,y+21,c.edge); } }
    for (let i = 0; i < 3; i++) { q.poly([[127,58+i*31],[146,73+i*25],[146,91+i*22],[127,81+i*28]], i===1?l.warm:c.face); q.line(130,62+i*30,143,72+i*27,c.edge); }
    q.poly([[0,172],[122,169],[122,182],[0,190]], c.red); for(let x=0;x<122;x+=12) q.poly([[x,173],[x+5,173],[x+5,186-x*.04],[x,186-x*.04]],c.face);
    q.pixel(0,190,c.ink,107,40); q.pixel(5,191,l.warm,23,26); q.pixel(32,191,l.hot,22,24); q.pixel(60,190,l.warm,33,24); q.pixel(9,195,c.face,15,15); q.pixel(35,194,c.ink,16,21); q.pixel(65,194,c.face,24,13);
    q.pixel(0,217,c.face,103,9); q.pixel(8,218,c.metal,79,2); q.label('NIGHT KITCHEN',9,177,c.hot,7); q.pixel(81,203,c.ink,4,10); q.pixel(77,199,c.ink,12,5);
    // Masonry seams, gutter straps, AC units and interior props reward a close look.
    for(let row=0;row<19;row++){const y=40+row*7;for(let col=0;col<13;col++){const x=col*10+(row%2)*5;if((x%28>20||x%28<8)&&y<167)q.pixel(x,y,c.face,6,1);}}
    q.line(2,32,2,175,c.edge);q.line(118,47,118,168,c.edge);for(let yy=55;yy<165;yy+=23){q.pixel(0,yy,c.metal,4,2);q.pixel(116,yy,c.metal,5,2);}
    q.pixel(88,151,c.ink,23,12);q.pixel(90,152,c.edge,19,8);for(let xx=92;xx<108;xx+=3)q.pixel(xx,153,c.mid,1,6);q.line(92,163,92,168,c.edge);q.line(108,163,108,167,c.edge);
    q.pixel(6,205,c.hot,19,2);q.pixel(10,201,c.red,3,4);q.pixel(17,199,c.ink,3,6);q.pixel(19,197,c.neon,2,2);q.pixel(62,207,c.ink,28,2);q.pixel(69,204,c.hot,4,3);q.pixel(76,205,c.metal,6,2);
    q.pixel(108,105,c.ink,21,54); q.pixel(110,107,l.neon,17,49); q.pixel(112,109,c.ink,13,45); q.label('O',116,113,l.hot,7); q.label('P',116,124,l.hot,7); q.label('E',116,135,l.hot,7); q.label('N',116,146,l.hot,7); q.glow(118,132,33,40,c.neon,.20*l.level);
    // Right Art Deco facade, service stair, small repair shop, overhead wiring.
    q.poly([[365,17],[480,0],[480,241],[365,186]], c.face); q.poly([[327,62],[365,17],[365,186],[327,173]], c.mid); q.line(365,17,480,0,c.metal,2); q.line(365,17,365,187,c.edge,2);
    for(let floor=0;floor<5;floor++) for(let col=0;col<4;col++){ const x=375+col*28,y=30+floor*27-col*2; q.pixel(x-2,y-2,c.ink,19,23); q.pixel(x,y,(floor+col)%4===1?l.warm:c.mid,14,18); q.pixel(x+1,y+1,(floor+col)%4===1?l.hot:c.edge,3,16); q.pixel(x,y+9,c.face,15,2); q.pixel(x+6,y,c.face,2,18); q.pixel(x-3,y+21,c.edge,21,2); }
    for(let yy=75;yy<165;yy+=18){ q.line(329,yy,361,yy-7,c.edge); q.line(330,yy+1,357,yy+12,c.edge); } q.line(330,72,330,170,c.metal); q.line(360,64,360,183,c.edge);
    q.poly([[365,170],[480,195],[480,208],[365,181]], c.blue); q.label('RADIO / REPAIR',387,183,c.hot,7);
    q.poly([[369,188],[412,199],[412,225],[369,205]], c.ink); q.poly([[373,192],[408,201],[408,217],[373,203]], l.warm); for(let x=379;x<405;x+=6){q.pixel(x,200+(x-379)*.2,c.ink,4,7);q.pixel(x+1,201+(x-379)*.2,l.neon,2,2);}
    q.poly([[420,203],[456,213],[456,238],[420,225]], c.ink); q.line(425,210,450,217,c.edge); q.line(425,216,450,223,c.edge); q.line(425,222,450,229,c.edge);
    for(let yy=32;yy<165;yy+=8){q.line(367,yy,373,yy-1,c.mid);q.line(446,yy-5,454,yy-6,c.mid);q.line(474,yy-8,480,yy-9,c.mid);}
    q.line(476,29,476,195,c.ink,2);q.pixel(459,155,c.ink,16,12);q.pixel(461,157,c.metal,12,7);for(let xx=463;xx<473;xx+=3)q.pixel(xx,158,c.face,1,5);
    q.pixel(363,183,c.ink,3,23);q.pixel(360,203,c.ink,10,3);q.pixel(361,201,c.edge,8,2);q.pixel(361,196,c.ink,3,5);q.pixel(366,197,c.ink,3,4);
    q.poly([[191,155],[213,155],[213,166],[191,166]],c.ink);q.pixel(194,156,c.warm,16,6);q.pixel(195,157,c.hot,4,4);q.pixel(201,157,c.face,2,6);q.pixel(212,157,c.neon,1,4);
    q.pixel(456,104,c.ink,18,59); q.pixel(458,106,l.red,14,55); q.pixel(460,108,c.ink,10,51); for(let y=114;y<153;y+=10) {q.pixel(462,y,l.hot,5,2);q.pixel(463,y-2,l.hot,2,6);}
    q.line(1,74,197,101,c.ink,2); q.line(197,101,480,51,c.ink,2); q.line(26,89,213,114,c.face); q.line(213,114,454,80,c.face);
    // Foreground street furniture adds human scale without covering the scene.
    for(const [x,y,s] of [[153,151,.65],[307,154,.58],[70,214,1],[428,242,1.2]]){ q.line(x,y,x,y-42*s,c.ink,Math.max(1,2*s)); q.line(x,y-42*s,x+12*s,y-42*s,c.edge); q.pixel(x+8*s,y-43*s,l.hot,8*s,2*s); q.glow(x+12*s,y-38*s,20*s,17*s,c.warm,.28*l.level); }
    q.pixel(128,203,c.ink,10,21); q.pixel(130,200,c.face,7,3); q.pixel(130,207,c.edge,5,9); q.line(107,226,132,226,c.ink,2); q.ellipse(108,229,8,8,c.ink);q.ring(108,229,7,7,c.edge);q.ellipse(132,229,8,8,c.ink);q.ring(132,229,7,7,c.edge);q.line(108,229,120,213,c.metal);q.line(120,213,132,229,c.edge);q.line(108,229,126,229,c.edge);
    q.poly([[3,246],[46,237],[46,244],[3,254]],c.ink);q.line(9,249,9,263,c.edge,2);q.line(39,243,39,255,c.edge,2);
    for(let i=0;i<7;i++){q.pixel(1+i*5,238-i,c.mid,3,9);q.pixel(2+i*5,237-i,c.edge,2,2);} q.pixel(0,247,c.ink,40,8);
    q.label('S E N E S C H A L',189,260,c.edge,5);
  }
  function crater(q,x,y,rx,ry,c){q.ellipse(x,y,rx,ry,c.ink);q.ring(x,y,rx,ry,c.edge,1,Math.PI,TAU);q.ellipse(x,y+1,rx*.73,ry*.60,c.ground);q.ring(x,y+1,rx*.73,ry*.60,c.mid,1,0,Math.PI);}
  function earth(q,c){
    const x=378,y=55,r=34;q.glow(x,y,r+6,r+6,c.blue,.18);q.ellipse(x,y,r,r,c.blue);
    q.poly([[351,43],[362,32],[371,34],[369,42],[379,47],[371,52],[362,48],[358,57],[351,54]],c.neon);q.poly([[378,52],[385,53],[391,65],[385,78],[379,82],[377,72],[371,65]],c.edge);q.poly([[395,31],[407,41],[405,49],[393,45],[388,36]],c.lit);
    q.ring(x-4,y-2,28,12,c.lit,2,3.5,5.9);q.ring(x,y+12,27,8,c.lit,1,.3,2.9);q.pixel(355,38,c.lit,11,2);q.pixel(370,35,c.hot,8);q.pixel(397,63,c.lit,7,2);
    // A hard terminator keeps the globe credible and keeps the visual quiet.
    for(let yy=-34;yy<=34;yy++){const span=Math.floor(Math.sqrt(Math.max(0,r*r-yy*yy)));const dark=Math.max(0,span-8+Math.floor(yy*.10));if(dark>0){q.pixel(x-span,y+yy,c.sky,dark,1);q.pixel(x-span+dark,y+yy,c.mid,2,1);}}
    q.ring(x,y,34,34,c.mist,1,4.3,6.1);
  }
  function lunar(ctx,c,p){
    const q=paint(ctx),rng=random(7131),l=lighting(c,p);sky(ctx,c,332,145);earth(q,c);
    q.poly([[0,176],[0,158],[26,151],[46,135],[59,139],[79,115],[100,135],[119,129],[143,151],[168,141],[194,160],[226,150],[265,164],[302,155],[334,165],[373,149],[397,158],[422,137],[446,145],[480,133],[480,270]],c.far);
    q.poly([[0,177],[22,164],[46,167],[67,150],[96,166],[116,156],[146,171],[182,163],[209,171],[240,168],[275,182],[303,173],[351,178],[395,169],[429,181],[461,166],[480,173],[480,270],[0,270]],c.mid);
    q.poly([[0,196],[42,185],[78,196],[121,181],[169,199],[221,189],[265,202],[320,195],[373,207],[421,192],[480,198],[480,270],[0,270]],c.ground);
    q.poly([[47,136],[79,115],[100,135],[85,128],[76,129],[62,145]],c.edge);q.poly([[79,115],[85,128],[99,135],[90,131]],c.mist);q.poly([[405,151],[422,137],[446,145],[437,146],[424,143]],c.edge);
    q.poly([[122,181],[169,199],[158,201],[136,191],[117,190]],c.face);q.poly([[373,207],[421,192],[414,200],[389,213]],c.face);
    for(let i=0;i<560;i++){const x=rng()*480,y=175+rng()*95,d=(y-170)/100;q.pixel(x,y,i%4===0?c.edge:c.ink,1+rng()*3*d,1);}
    for(const a of [[23,190,14,3],[421,203,22,5],[299,217,32,7],[85,232,25,6],[192,251,14,4],[439,257,39,10],[157,182,9,2]])crater(q,...a,c);
    // Relay foundation, access stairs and the cast shadow of the steel yoke.
    q.poly([[112,203],[142,199],[245,230],[216,235]],c.ink);q.ellipse(132,204,43,9,c.ink);q.pixel(101,194,c.edge,65,9);q.pixel(104,194,c.metal,59,2);q.pixel(107,203,c.mid,56,4);
    q.poly([[111,194],[123,136],[138,136],[158,194]],c.face);q.poly([[126,137],[130,137],[122,192],[116,192]],c.metal);q.poly([[135,138],[139,139],[154,193],[149,193]],c.edge);
    for(let i=0;i<6;i++){const y=146+i*8;q.line(123-(y-146)*.2,y,140+(y-146)*.25,y+7,c.ink,2);q.line(123-(y-146)*.2,y+7,140+(y-146)*.25,y,c.edge);}
    q.pixel(120,130,c.ink,24,12);q.pixel(125,128,c.metal,14,15);q.pixel(129,131,c.warm,6,5);
    // Shallow parabolic reflector: all mesh ribs converge on its focal support.
    q.poly([[66,83],[79,104],[109,124],[141,125],[171,108],[183,84],[167,91],[146,98],[122,101],[95,96]],c.face);
    q.poly([[67,82],[80,94],[99,103],[122,107],[145,102],[168,92],[182,82],[173,94],[152,110],[125,116],[99,112],[78,99]],c.metal);
    q.ring(124,80,59,26,c.lit,2,0,Math.PI);q.ring(124,79,59,8,c.edge,1,Math.PI,TAU);q.line(65,80,83,97,c.lit);q.line(183,80,169,98,c.lit);
    for(let i=0;i<=10;i++){const x=68+i*11;q.line(x,83,124,114,i%2?c.edge:c.lit);}q.ring(124,81,46,18,c.edge,1,0,Math.PI);q.ring(124,82,30,12,c.edge,1,0,Math.PI);
    q.line(71,83,124,61,c.edge,2);q.line(176,84,124,61,c.edge,2);q.line(124,109,124,61,c.ink,2);q.pixel(120,57,c.warm,9,8);q.pixel(122,56,c.hot,5,3);
    q.line(111,184,101,203,c.metal);for(let i=0;i<6;i++)q.line(111-i*1.6,185+i*3,119-i*1.6,185+i*3,c.metal);q.pixel(100,190,c.ink,10,12);q.pixel(102,192,c.neon,5,3);
    // Lived-in modular outpost, protected windows, airlock and buried services.
    q.poly([[224,171],[234,157],[294,157],[305,170],[305,199],[224,199]],c.face);q.poly([[224,171],[234,157],[294,157],[283,170]],c.edge);q.pixel(224,171,c.metal,81,2);q.pixel(224,194,c.ink,81,5);
    for(let x=234;x<290;x+=13){q.pixel(x,175,c.ink,9,12);q.pixel(x+1,176,l.warm,7,9);q.pixel(x+3,176,l.hot,2,8);q.pixel(x-2,188,c.edge,13,2);}
    q.pixel(280,173,c.ink,18,23);q.pixel(283,176,c.metal,12,18);q.pixel(285,179,l.blue,8,5);q.pixel(291,187,l.hot,2,2);q.pixel(278,197,c.edge,25,3);q.pixel(280,201,c.face,22,2);q.pixel(282,204,c.ink,19,2);q.label('RELAY 07',233,165,c.ink,5);
    q.pixel(237,150,c.mid,19,7);q.pixel(240,148,c.edge,13,2);q.line(250,147,250,132,c.metal);q.pixel(249,130,c.red,3,3);q.line(249,137,263,143,c.edge);q.line(258,149,258,140,c.edge);
    for(let yy=177;yy<194;yy+=4)q.line(225,yy,229,yy,c.edge);q.pixel(265,172,c.edge,9,18);q.pixel(267,175,c.mid,5,13);q.pixel(266,172,c.metal,7,1);q.pixel(266,190,c.ink,7,3);q.pixel(292,159,c.hot,2,6);
    q.line(307,184,307,170,c.edge);q.pixel(305,166,c.face,5,5);q.line(310,168,318,166,c.metal);q.pixel(317,164,c.neon,3,4);
    q.poly([[301,184],[330,184],[338,193],[338,200],[302,200]],c.mid);q.pixel(308,188,c.edge,20,8);for(let x=311;x<326;x+=3)q.pixel(x,190,c.ink,1,5);q.pixel(329,194,c.neon,3,2);
    q.line(165,202,218,210,c.ink,3);q.line(218,210,269,203,c.ink,3);q.line(165,201,218,209,c.edge);q.line(218,209,269,202,c.edge);
    q.pixel(204,208,c.ink,10,9);q.pixel(205,208,c.face,8,5);q.pixel(207,210,c.warm,3,2);q.line(201,218,217,215,c.edge);q.pixel(216,213,c.ink,6,5);
    for(let panel=0;panel<4;panel++){const x=330+panel*31,y=177-panel*2;q.line(x+12,y+13,x+12,y+26,c.metal,2);q.poly([[x,y],[x+26,y-6],[x+26,y+11],[x,y+17]],c.ink);q.poly([[x+1,y+1],[x+25,y-4],[x+25,y+10],[x+1,y+15]],c.blue);for(let gx=1;gx<5;gx++)q.line(x+gx*5,y+1-gx,x+gx*5,y+15-gx,c.mid);for(let gy=5;gy<14;gy+=5)q.line(x+1,y+gy,x+25,y+gy-5,c.mid);q.line(x,y,x+26,y-6,c.metal);}
    // Survey tracks and foreground instruments ground the composition.
    for(let i=0;i<39;i++){const x=52+i*8,y=253-i*.75;q.pixel(x,y,c.ink,4,2);q.pixel(x,y+7,c.ink,4,2);q.pixel(x+1,y+1,c.edge,2,1);}
    q.line(414,243,414,217,c.edge,2);q.line(402,250,414,226,c.metal);q.line(427,248,414,226,c.edge);q.pixel(407,210,c.ink,15,12);q.pixel(409,212,c.metal,11,8);q.pixel(411,214,c.neon,6,4);q.line(414,210,418,201,c.edge);q.pixel(417,198,c.warm,3,3);
    q.poly([[0,253],[17,245],[33,251],[51,247],[70,259],[91,265],[110,270],[0,270]],c.ink);q.poly([[0,253],[17,245],[33,251],[23,253]],c.edge);q.poly([[459,238],[473,231],[480,234],[480,270],[449,270]],c.ink);q.line(459,238,473,231,c.edge);
    // Warm base spill, a bright access stair and survey instrument emission all
    // obey glow; the lunar sky/planet and reflective solar cells stay unchanged.
    q.glow(261,182,46,24,c.warm,.23*l.level);q.glow(291,194,21,12,c.hot,.19*l.level);
    q.line(282,204,299,204,l.warm);q.pixel(411,214,l.neon,6,4);q.pixel(417,198,l.warm,3,3);q.glow(414,216,10,8,c.neon,.15*l.level);
    q.label('EARTHLINK / 07',348,101,c.mist,5);
  }
  function planet(ctx,q,c){
    q.ellipse(60,299,222,175,c.horizon);q.ring(60,299,223,176,c.blue,2,3.6,5.9);q.ring(60,299,227,180,c.mist,1,3.8,5.8);
    const rng=random(780);ctx.save();ctx.beginPath();ctx.ellipse(60,299,220,173,0,0,TAU);ctx.clip();
    for(let i=0;i<24;i++){const x=-120+rng()*360,y=139+rng()*140;q.ellipse(x,y,8+rng()*40,2+rng()*5,i%4?c.far:c.edge);}
    q.poly([[0,166],[30,155],[50,157],[71,168],[77,187],[96,198],[81,213],[52,212],[36,231],[1,227]],c.mid);q.poly([[130,191],[156,178],[182,186],[194,201],[169,224],[157,241],[143,216]],c.mid);
    for(let i=0;i<160;i++){const x=rng()*260,y=151+rng()*119;if(i%3===0)q.pixel(x,y,c.warm,1,1);}
    ctx.restore();
  }
  function foundry(ctx,c,p){
    const q=paint(ctx),rng=random(904),l=lighting(c,p);sky(ctx,c,632,180);planet(ctx,q,c);
    const cx=293,cy=110,rx=136,ry=54;
    // The rear deck sits behind all spokes and docking structures.
    q.ring(cx,cy+8,rx,ry,c.ink,11);q.ring(cx,cy,rx,ry,c.edge,7);q.ring(cx,cy-2,rx-7,ry-5,c.metal,2);q.ring(cx,cy+2,rx-12,ry-7,c.face,5);q.ring(cx,cy+4,rx-18,ry-11,l.warm,1);
    for(let i=0;i<72;i++){const a=i*TAU/72,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;const x2=cx+Math.cos(a)*(rx-16),y2=cy+Math.sin(a)*(ry-8);q.line(x,y,x2,y2,i%3?c.face:c.ink,2);if(i%2===0){q.pixel(x-1,y+5,l.warm,2,2);q.pixel(x2,y2,l.neon,2,1);}}
    // Interleaved service pads, dock clamps and greenhouse glazing follow the rim.
    for(let i=0;i<18;i++){const a=.11+i*TAU/18,x=cx+Math.cos(a)*(rx-6),y=cy+Math.sin(a)*(ry-2);q.pixel(x-2,y-2,c.ink,6,4);q.pixel(x-1,y-2,i%3===0?c.neon:c.metal,4,2);if(i%3===0){q.line(x,y+2,x+Math.cos(a)*8,y+Math.sin(a)*5+2,c.face,2);q.pixel(x+Math.cos(a)*8,y+Math.sin(a)*5,c.hot,2,2);}}
    // Habitation blocks on the rear rim: radiators, exposed utilities and windows.
    for(let i=0;i<11;i++){const a=Math.PI+(.15+i*.265),x=cx+Math.cos(a)*(rx-2),y=cy+Math.sin(a)*ry;const w=7+i%3*2,h=7+i%4*2;q.pixel(x-w/2,y-h,c.face,w,h);q.pixel(x-w/2,y-h,c.metal,w,1);q.pixel(x-w/2+2,y-h+3,l.warm,w-4,2);q.line(x,y-h,x,y-h-4,c.edge);}
    for(let i=0;i<8;i++){const a=i*TAU/8;q.line(cx+Math.cos(a)*15,cy+Math.sin(a)*6,cx+Math.cos(a)*(rx-20),cy+Math.sin(a)*(ry-10),c.ink,5);q.line(cx+Math.cos(a)*15,cy+Math.sin(a)*6-2,cx+Math.cos(a)*(rx-20),cy+Math.sin(a)*(ry-10)-2,c.metal,2);}
    q.ellipse(cx,cy+7,25,11,c.ink);q.ellipse(cx,cy,25,11,c.edge);q.ellipse(cx,cy-2,16,7,c.metal);q.pixel(cx-8,cy-15,c.face,17,13);q.pixel(cx-4,cy-18,c.lit,9,4);q.pixel(cx-4,cy-12,c.blue,9,7);q.line(cx,cy-18,cx,cy-38,c.metal);q.pixel(cx-1,cy-40,c.red,3,3);
    // Port and starboard radiator/solar wings have deep frames and fine cells.
    for(const side of [-1,1]){const x=side<0?103:429,y=83;q.line(side<0?x+44:x,cy,side<0?cx-rx:cx+rx,cy,c.edge,3);q.poly([[x,y],[x+38,y-9],[x+38,y+44],[x,y+53]],c.ink);q.poly([[x+2,y+1],[x+36,y-6],[x+36,y+42],[x+2,y+50]],c.blue);for(let gx=7;gx<36;gx+=7)q.line(x+gx,y-gx*.2,x+gx,y+51-gx*.2,c.mid);for(let gy=7;gy<50;gy+=7)q.line(x+1,y+gy,x+36,y+gy-8,c.mid);q.line(x,y,x+38,y-9,c.metal);q.line(x+38,y-9,x+38,y+44,c.edge,2);}
    // Spine toward the foreground, container barges and working bay doors.
    q.poly([[283,117],[308,114],[347,205],[307,214]],c.ink);q.poly([[286,116],[299,115],[334,202],[316,207]],c.edge);q.line(293,117,325,206,c.metal,2);for(let i=0;i<9;i++){const y=125+i*9,x=296+(y-125)*.36;q.line(x-5,y+3,x+7,y,c.face,2);q.pixel(x-2,y,c.warm,2,2);}
    q.poly([[260,197],[350,178],[414,204],[323,226]],c.face);q.poly([[260,197],[323,218],[414,197],[414,218],[324,241],[260,220]],c.mid);q.poly([[260,197],[350,178],[414,197],[324,219]],c.edge);q.line(260,197,324,219,c.metal,2);q.line(324,219,414,197,c.metal,2);q.line(324,220,324,240,c.ink,2);
    q.poly([[272,205],[306,216],[306,231],[272,220]],c.ink);q.poly([[276,209],[302,217],[302,226],[276,219]],l.warm);for(let j=0;j<4;j++)q.line(278+j*6,212+j*1.4,278+j*6,221+j*1.4,c.face);
    q.poly([[333,222],[364,214],[364,227],[333,236]],c.ink);q.poly([[337,223],[360,217],[360,224],[337,230]],l.neon);q.poly([[374,211],[404,203],[404,216],[374,224]],c.ink);q.poly([[378,212],[400,206],[400,213],[378,220]],l.warm);
    q.label('FOUNDRY / 03',318,198,c.ink,5);q.poly([[314,188],[337,183],[351,188],[327,194]],c.mid);q.line(316,188,327,192,c.metal);q.pixel(325,184,c.hot,3,2);
    q.line(264,199,264,187,c.metal);q.line(264,187,294,197,c.metal);q.line(294,197,294,207,c.edge);q.line(264,198,294,208,c.edge);q.line(269,201,269,190,c.face);q.line(283,205,283,195,c.face);
    q.line(403,199,403,188,c.metal);q.line(403,188,375,181,c.metal);q.line(375,181,375,192,c.edge);q.line(388,185,388,195,c.face);q.pixel(402,186,c.red,2,2);
    for(let i=0;i<7;i++){q.line(332+i*9,228-i*2.3,337+i*9,227-i*2.3,c.edge);q.pixel(264+i*6,221+i*1.6,c.warm,2,1);}
    for(let i=0;i<3;i++){const x=352+i*12,y=193-i*3;q.poly([[x,y],[x+9,y-2],[x+9,y+6],[x,y+8]],i===1?c.red:c.blue);q.line(x,y,x+9,y-2,c.metal);q.line(x+3,y,x+3,y+7,c.ink);}
    // Remote truss on the upper left, with tension cables and a docked shuttle.
    q.line(74,67,168,89,c.ink,6);q.line(74,62,168,84,c.edge,2);q.line(74,73,168,95,c.edge,2);for(let i=0;i<9;i++){const x=75+i*10,y=64+i*2.4;q.line(x,y,x+10,y+13,c.metal);q.line(x,y+10,x+10,y+3,c.face);}q.pixel(60,53,c.face,21,30);q.pixel(63,56,c.edge,15,24);q.pixel(65,59,c.ink,11,18);q.pixel(68,63,l.warm,5,9);
    q.poly([[38,42],[65,40],[83,47],[67,51],[42,49]],c.metal);q.poly([[38,44],[65,44],[83,47],[67,53],[42,51]],c.mid);q.pixel(43,42,c.blue,12,3);q.pixel(37,44,c.warm,3,3);
    // A huge near docking frame gives true depth, not just a floating diagram.
    q.poly([[0,186],[19,178],[115,208],[104,222],[0,197]],c.ink);q.poly([[0,182],[19,176],[118,205],[108,211]],c.edge);q.line(0,182,108,211,c.metal,2);
    for(let i=0;i<8;i++){const x=3+i*13,y=188+i*3.2;q.line(x,y,x+12,y+13,c.face,2);q.line(x,y+8,x+12,y+3,c.edge);}
    q.poly([[96,205],[114,202],[128,270],[108,270]],c.ink);q.line(99,208,113,267,c.edge,3);q.line(112,207,125,267,c.face,2);for(let i=0;i<5;i++){q.line(102+i*2.5,217+i*11,115+i*2,223+i*11,c.metal);}
    q.line(17,181,17,131,c.face,4);q.line(17,131,79,148,c.metal,3);q.line(79,148,79,178,c.edge);q.line(16,149,63,144,c.edge);q.pixel(76,177,c.warm,7,4);q.glow(80,180,15,10,c.warm,.12);
    q.pixel(8,244,c.face,44,20);q.pixel(11,247,c.metal,38,2);q.pixel(13,251,c.ink,32,10);for(let x=16;x<44;x+=6)q.pixel(x,253,l.warm,3,4);q.label('DOCK 09',11,238,c.mist,5);
    q.glow(291,218,26,13,c.warm,.20*l.level);q.glow(349,224,22,12,c.neon,.17*l.level);q.glow(389,215,24,13,c.warm,.21*l.level);
  }
  function rover(q,x,y,c){q.ellipse(x+15,y+11,24,4,c.ink);for(const xx of [0,12,25]){q.ellipse(x+xx,y+7,4,4,c.ink);q.ring(x+xx,y+7,4,4,c.edge);q.pixel(x+xx,y+6,c.metal,2,2);}q.poly([[x-2,y],[x+23,y-3],[x+30,y+2],[x+25,y+6],[x,y+6]],c.edge);q.pixel(x+4,y-10,c.face,13,10);q.pixel(x+6,y-9,c.blue,9,5);q.pixel(x+7,y-9,c.lit,3,2);q.line(x+12,y-10,x+12,y-19,c.edge);q.ellipse(x+12,y-20,5,2,c.metal);q.pixel(x+26,y+1,c.hot,3,2);q.line(x+2,y+2,x+24,y+1,c.metal);}
  function freighter(q,x,y,c,boost){q.poly([[x,y],[x+29,y-8],[x+52,y-4],[x+67,y+2],[x+50,y+10],[x+22,y+11]],c.ink);q.poly([[x+2,y],[x+29,y-8],[x+52,y-4],[x+65,y+2],[x+23,y+5]],c.metal);q.poly([[x+23,y+5],[x+65,y+2],[x+50,y+10],[x+23,y+11]],c.face);q.poly([[x+41,y-6],[x+51,y-3],[x+59,y],[x+43,y+1]],c.blue);q.pixel(x+47,y-3,c.lit,5);for(let i=0;i<3;i++){q.pixel(x+15+i*8,y-2,c.mid,6,7);q.pixel(x+16+i*8,y-1,c.warm,3,2);}q.pixel(x-1,y+1,c.neon,3,4);if(boost){q.poly([[x-1,y+1],[x-12,y-1],[x-20,y+2],[x-10,y+6],[x-1,y+5]],c.blue);q.pixel(x-8,y+2,c.lit,8,2);}}
  // These actors are deliberately drawn on the cached architecture, not baked
  // into it. Their small physical trajectories reveal the scale of each place.
  function vehicle(q,x,y,s,c,tram){
    q.poly([[x-5*s,y+13*s],[x+29*s,y+13*s],[x+34*s,y+17*s],[x-1*s,y+17*s]],c.ink);
    q.poly([[x,y],[x+23*s,y],[x+30*s,y+8*s],[x-5*s,y+8*s]],tram?c.blue:c.face);
    q.poly([[x+3*s,y-9*s],[x+19*s,y-9*s],[x+23*s,y],[x,y]],c.edge);q.pixel(x+4*s,y-7*s,c.ink,14*s,6*s);q.pixel(x+5*s,y-6*s,c.blue,5*s,4*s);q.pixel(x+12*s,y-6*s,c.warm,5*s,4*s);
    q.pixel(x-3*s,y+3*s,c.hot,5*s,2*s);q.pixel(x+22*s,y+3*s,c.hot,5*s,2*s);q.pixel(x,y+8*s,c.ink,5*s,5*s);q.pixel(x+20*s,y+8*s,c.ink,5*s,5*s);
    if(tram){q.line(x+10*s,y-9*s,x+14*s,y-17*s,c.metal);q.line(x+14*s,y-17*s,x+20*s,y-18*s,c.metal);q.pixel(x-2*s,y+1*s,c.red,29*s,2*s);}
  }
  function astronaut(q,x,y,c,step,tool){
    q.ellipse(x+1,y+12,11,3,c.ink);q.pixel(x-4,y-7,c.metal,9,10);q.pixel(x-5,y-4,c.face,3,9);q.pixel(x-3,y-14,c.lit,8,8);q.pixel(x-1,y-12,c.ink,6,4);q.pixel(x,y-12,c.blue,4,2);q.pixel(x-2,y-2,c.red,6,2);
    q.line(x-2,y+3,x-3-Math.sin(step)*3,y+10,c.metal,3);q.line(x+3,y+3,x+4+Math.sin(step)*3,y+10,c.edge,3);q.line(x+4,y-5,x+10,y-2+Math.sin(step)*2,c.lit,2);q.pixel(x+8,y-4,c.neon,3,2);if(tool){q.line(x+10,y-2,x+14,y+6,c.metal);q.pixel(x+12,y+5,c.hot,5,2);}
  }
  function drone(q,x,y,c,phase){
    q.ellipse(x,y+17,17,3,c.ink);q.poly([[x-12,y],[x,y-4],[x+12,y],[x,y+5]],c.metal);q.pixel(x-5,y-2,c.face,10,5);q.pixel(x-2,y,c.neon,4,2);for(const side of [-1,1]){q.line(x+side*8,y,x+side*17,y-4,c.edge,2);q.pixel(x+side*17-6,y-5,c.metal,12,1);q.pixel(x+side*17-3,y-6,c.lit,6,1);}q.line(x,y+5,x,y+9,c.edge);q.pixel(x-2,y+8,c.hot,4,2);if(Math.sin(phase)>0)q.pixel(x-12,y-1,c.red,2,2);
  }
  function robot(q,x,y,c,phase){
    q.ellipse(x,y+9,13,3,c.ink);q.pixel(x-9,y+5,c.ink,19,5);q.pixel(x-8,y+5,c.edge,17,2);for(let i=0;i<5;i++)q.pixel(x-7+i*3,y+8+(Math.floor(phase*3+i)%2),c.metal,2,1);
    q.pixel(x-7,y-4,c.face,14,10);q.pixel(x-5,y-3,c.blue,10,4);q.pixel(x-3,y-2,c.neon,6,1);q.line(x,y-4,x+Math.sin(phase)*5,y-12,c.metal,2);q.pixel(x+Math.sin(phase)*5-2,y-14,c.hot,4,3);q.pixel(x-4,y+2,c.red,3,2);
  }
  function arm(q,x,y,c,phase,reach){
    const elbowX=x+19+Math.sin(phase)*12,elbowY=y-21-Math.cos(phase*.8)*10,tipX=x+42+Math.cos(phase*.7)*reach,tipY=y-6+Math.sin(phase*1.1)*13;
    q.pixel(x-7,y-3,c.ink,14,10);q.pixel(x-6,y-4,c.metal,12,3);q.line(x,y,elbowX,elbowY,c.ink,6);q.line(x,y-1,elbowX,elbowY-1,c.metal,3);q.ellipse(elbowX,elbowY,5,5,c.face);q.ellipse(elbowX,elbowY,2,2,c.warm);q.line(elbowX,elbowY,tipX,tipY,c.ink,5);q.line(elbowX,elbowY-1,tipX,tipY-1,c.edge,3);q.line(tipX,tipY,tipX+5,tipY-3,c.metal,2);q.line(tipX,tipY,tipX+6,tipY+3,c.metal,2);q.pixel(tipX+4,tipY-1,c.neon,3,2);
    return {x:tipX+6,y:tipY};
  }
  function create(id, canvas, { localTraffic = false } = {}){
    if(!catalog.some(v=>v.id===id)) throw new Error('Unknown Seneschal world: '+id);
    if(!canvas || typeof canvas.getContext!=='function') throw new TypeError('A canvas is required');
    canvas.width=960;canvas.height=540;const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('2D canvas unavailable');
    let cache=root.document.createElement('canvas');cache.width=W;cache.height=H;let cacheContext=cache.getContext('2d',{alpha:false});
    let disposed=false,cacheKey='',bakes=0,frames=0,opts=settings(),active=null,featureTime=0,lastT=0,lightsEnabled=true;
    const q=paint(context);
    const spots=sceneHotspots(id),entry=catalog.find(v=>v.id===id);
    function bake(p){if(disposed)return;opts=settings(p);const key=opts.palette+'|'+Math.round(opts.worldGlow)+'|'+lightsEnabled+'|'+opts.celestial;if(key===cacheKey)return;cacheContext.imageSmoothingEnabled=false;cacheContext.globalAlpha=1;cacheContext.clearRect(0,0,W,H);const c=themes[opts.palette];({ 'pixel-city':city,'lunar-relay':lunar,'orbital-foundry':foundry })[id](cacheContext,c,{...opts,lightsEnabled});cacheKey=key;bakes++;}
    function draw(timeSeconds,p){
      if(disposed)return;bake(p);const t=Math.max(0,number(timeSeconds,0)),dt=clamp(t-lastT,0,.1);lastT=t;const c=themes[opts.palette],activity=opts.worldActivity/100,l=lighting(c,{...opts,lightsEnabled});
      // Integrated activity time makes zero activity genuinely still, even when
      // the host continues drawing; the renderer never creates its own clock.
      featureTime+=dt*activity;const motion=featureTime;const burst=active?Math.max(0,1-(t-active.at)/active.duration):0;if(active&&!burst)active=null;
      context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.imageSmoothingEnabled=false;context.drawImage(cache,0,0,960,540);context.save();context.scale(2,2);
      const manual=active?.action,progress=1-burst;
      if(id==='pixel-city'){
        if(opts.worldFeature){
          if (!localTraffic) {
          // Three depths of traffic, not a dot travelling behind the skyline.
          for(let i=0;i<3;i++){
            const depth=(motion*.12+i*.32+.31)%1,x=247+depth*(i%2?-164:133),y=167+depth*76,s=.22+depth*.72;
            context.globalAlpha=.15+depth*.14;q.poly([[x-4*s,y+14*s],[x+30*s,y+14*s],[x+46*s,y+34*s],[x-12*s,y+34*s]],c.warm);context.globalAlpha=1;vehicle(q,x,y,s,c,i===1);
            context.globalAlpha=.24;q.pixel(x-4*s,y+19*s,c.warm,33*s,2*s);q.pixel(x+2*s,y+25*s,c.hot,21*s,1);context.globalAlpha=1;
          }
          // A tram follows the same vanishing-point rails as the cached street.
          const depth=(motion*.08+.48)%1,tx=244-depth*69,ty=162+depth*93,ts=.22+depth*1.25;vehicle(q,tx,ty,ts,c,true);
          context.globalAlpha=.28;q.poly([[tx-5*ts,ty+15*ts],[tx+29*ts,ty+15*ts],[tx+34*ts,ty+28*ts],[tx-10*ts,ty+28*ts]],c.blue);q.pixel(tx+4*ts,ty+19*ts,c.warm,15*ts,2);context.globalAlpha=1;
          }
          // The kitchen stays busy: a cook, chimney steam and a resident cat.
          q.pixel(40+Math.sin(motion*.7)*4,198,c.ink,4,11);q.pixel(40+Math.sin(motion*.7)*4,195,c.metal,4,4);q.line(43+Math.sin(motion*.7)*4,203,51+Math.sin(motion*2)*3,201,c.ink,2);
          for(let i=0;i<8;i++){const a=(motion*.28+i*.13)%1;context.globalAlpha=(1-a)*.22;q.ellipse(70+Math.sin(a*5+i)*5,202-a*35,3+a*6,2+a*5,c.lit);}context.globalAlpha=1;
          if(manual!=='cat'){const tail=Math.sin(motion*2)*3;q.pixel(96,113,c.ink,9,5);q.pixel(95,110,c.ink,4,5);q.pixel(95,108,c.ink,1,3);q.pixel(98,108,c.ink,1,3);q.line(103,115,108,111+tail,c.ink,2);q.pixel(96,111,c.warm,1,1);}
          // Reflected light walks across discrete puddles; the road never pulses.
          for(let i=0;i<20;i++){const phase=(motion*.5+i*.19)%1,x=132+(i*37)%225,y=189+(i*11)%66;context.globalAlpha=.13+phase*.12;q.pixel(x+Math.sin(motion+i)*3,y,i%3?c.blue:c.warm,7+phase*13,1);}context.globalAlpha=1;
        }
        if(!localTraffic&&burst>0&&manual==='traffic'){const depth=progress,x=259+depth*65,y=174+depth*61,s=.6+depth*.75;vehicle(q,x,y,s,c,true);context.globalAlpha=burst*.28;q.pixel(x,y+20*s,c.warm,31*s,3);context.globalAlpha=1;}
        if(burst>0&&manual==='kitchen'){
          q.pixel(39,196,c.ink,7,16);q.pixel(40,191,c.lit,6,6);q.line(44,204,57,199+Math.sin(progress*12)*3,c.metal,2);q.ellipse(60,204,8,2,c.hot);
          for(let i=0;i<16;i++){const a=(progress*1.3+i*.08)%1;context.globalAlpha=burst*(1-a)*.6;q.ellipse(63+Math.sin(a*6+i)*9,201-a*65,3+a*8,3+a*5,c.lit);}context.globalAlpha=1;
        }
        if(burst>0&&manual==='cat'){
          const x=94+Math.sin(progress*Math.PI)*12,y=110;q.ellipse(x+4,y+5,8,5,c.ink);q.pixel(x-4,y-3,c.ink,8,9);q.pixel(x-4,y-6,c.ink,2,5);q.pixel(x+1,y-6,c.ink,2,5);q.pixel(x-2,y,c.hot,1,1);q.pixel(x+1,y,c.hot,1,1);q.line(x+10,y+6,x+15,y-1+Math.sin(progress*16)*4,c.ink,3);q.pixel(x-2,y+9,c.metal,3,2);q.pixel(x+5,y+9,c.metal,3,2);
        }
        const pulse=(.05+(.5+.5*Math.sin(motion*.7))*.035)*l.level;context.globalAlpha=pulse;q.pixel(110,107,c.hot,17,1);q.pixel(458,106,c.hot,14,1);context.globalAlpha=1;
        if(burst>0&&manual==='signal'){const travel=progress*26;q.pixel(237,14,c.neon,3,3);q.line(238,8,238,12,c.hot);context.globalAlpha=burst*.75;for(let i=0;i<3;i++)q.ring(238,31,18+travel+i*12,9+travel*.35+i*6,c.neon,1,Math.PI*1.05,TAU-.10);context.globalAlpha=1;}
        if(burst>0&&manual==='puddles'){for(let i=0;i<7;i++){const radius=4+((progress+i*.14)%1)*32;context.globalAlpha=burst*(.6-i*.055);q.ring(216+(i%2)*17,239+i*2,radius,radius*.22,c.neon);q.ring(216+(i%2)*17,240+i*2,radius*.7,radius*.15,c.warm);}context.globalAlpha=1;}
        if(opts.weather==='rain'){context.globalAlpha=.15+opts.intensity*.002;for(let i=0;i<95;i++){const x=(i*79+11)%480,y=(i*43+motion*(38+i%5*6))%280-7;q.line(x,y,x-2,y+5+i%3,c.mist);}context.globalAlpha=.21;for(let i=0;i<18;i++){const phase=(motion*1.2+i*.19)%1,x=76+(i*47)%331,y=199+(i*19)%65;q.ring(x,y,1+phase*5,1,c.neon,1,0,Math.PI);}context.globalAlpha=1;}
        if(opts.weather==='snow'){context.globalAlpha=.5;for(let i=0;i<54;i++){const x=(i*79+Math.sin(motion*.3+i)*5)%480,y=(i*43+motion*(5+i%4))%277;q.pixel(x,y,c.lit,1+i%2,1);}context.globalAlpha=1;}
        if(opts.weather==='mist'){context.globalAlpha=.08+opts.intensity*.001;for(let i=0;i<3;i++)q.ellipse(210+Math.sin(motion*.04+i)*30,151+i*14,250,4+i*2,c.mist);context.globalAlpha=1;}
      }else if(id==='lunar-relay'){
        if(opts.worldFeature){
          // Slow rover and faster inspection drone cross different depth planes.
          const x=24+(motion*17+9)%318;rover(q,x,240-x*.045,c);
          const dx=315+Math.sin(motion*.42)*52,dy=133+Math.cos(motion*.61)*10;drone(q,dx,dy,c,motion*3);
          context.globalAlpha=.14;q.poly([[dx-2,dy+10],[dx+2,dy+10],[dx+24,202],[dx-26,202]],c.neon);context.globalAlpha=1;
          astronaut(q,379+Math.sin(motion*.5)*14,229+Math.cos(motion*.5)*3,c,motion*4,true);astronaut(q,207+Math.sin(motion*.28)*13,215,c,motion*3,false);
          // A physical tracking sweep crosses the reflector mesh, not the sky.
          const scan=82+(Math.sin(motion*.6)*.5+.5)*75;context.globalAlpha=.45;q.line(scan,85,124,113,c.lit,3);q.line(scan+6,87,124,113,c.blue,2);context.globalAlpha=1;
          q.line(307,169,315+Math.sin(motion*.65)*8,159+Math.cos(motion*.65)*3,c.metal,2);q.pixel(314+Math.sin(motion*.65)*8,157+Math.cos(motion*.65)*3,c.neon,4,3);
          // Rover exhaust lifts regolith only along its working route.
          for(let i=0;i<20;i++){const a=(motion*.9+i*.09)%1;context.globalAlpha=(1-a)*.22;q.ellipse(x-4-a*34,249-x*.045-a*9,4+a*12,2+a*4,c.mist);}context.globalAlpha=1;
          for(let i=0;i<5;i++){const a=(motion*.24+i*.22)%1;context.globalAlpha=.19;q.poly([[350+a*50,29+i*9],[367+a*35,29+i*9],[374+a*25,31+i*9],[353+a*45,31+i*9]],c.lit);}context.globalAlpha=1;
        }
        if(burst>0&&manual==='rover')rover(q,265+progress*54,239,c);
        if(burst>0&&manual==='drone'){const x=306+Math.sin(progress*Math.PI)*65,y=165-Math.sin(progress*Math.PI)*46;drone(q,x,y,c,progress*25);context.globalAlpha=burst*.3;q.poly([[x-2,y+11],[x+2,y+11],[x+17,210],[x-19,210]],c.neon);context.globalAlpha=1;}
        if(burst>0&&manual==='surveyor'){const x=400-progress*32;astronaut(q,x,236,c,progress*22,true);q.line(x+15,233,x+23,243,c.metal);q.line(x+15,233,x+9,244,c.metal);q.pixel(x+10,230,c.hot,9,3);context.globalAlpha=burst*.2;q.poly([[x+15,233],[x+53,243],[x+16,252]],c.neon);context.globalAlpha=1;}
        const signal=opts.worldFeature?(.4+.6*Math.max(0,Math.sin(motion*.6))):0;context.globalAlpha=.13*signal+(manual==='signal'?burst*.35:0);for(let i=0;i<3;i++)q.ring(123,61,22+i*13+(manual==='signal'?progress*22:0),12+i*11,c.neon,1,3.55,5.45);context.globalAlpha=1;
        q.pixel(249,130,Math.sin(motion*1.2)>0?c.red:c.face,3,3);q.pixel(418,198,l.warm,2,2);
        if(burst>0&&manual==='dust'){for(let i=0;i<25;i++){const a=(progress+i*.037)%1;context.globalAlpha=burst*(1-a)*.6;q.ellipse(210+(i%2?-1:1)*a*53,248-Math.sin(a*Math.PI)*22,3+a*6,1+a*4,c.mist);}context.globalAlpha=1;}
        if(opts.weather==='mist'){context.globalAlpha=.09;q.ellipse(240+Math.sin(motion*.1)*5,213,233,10,c.mist);context.globalAlpha=1;}
      }else{
        if(opts.worldFeature){
          // Cloud ribbons move within the planet silhouette, behind the dock.
          context.save();context.beginPath();context.ellipse(60,299,220,173,0,0,TAU);context.clip();
          for(let i=0;i<10;i++){const x=-145+((i*71+motion*(4+i%3))%410),y=151+i*11;context.globalAlpha=.16+(i%3)*.04;q.ellipse(x,y,32+(i%4)*11,2+(i%3),c.mist);q.ellipse(x+23,y+2,26,2,c.edge);}context.restore();context.globalAlpha=1;
          // Two rim service carriages have actual bodies, windows and shadows.
          for(let i=0;i<3;i++){const a=motion*.22+i*TAU/3+.6,x=293+Math.cos(a)*133,y=110+Math.sin(a)*52;q.ellipse(x,y+4,13,3,c.ink);q.pixel(x-9,y-5,c.ink,19,9);q.pixel(x-8,y-6,c.metal,17,3);q.pixel(x-6,y-2,c.blue,12,4);q.pixel(x-4,y-1,c.neon,3,1);q.pixel(x+6,y-2,c.hot,2,2);q.pixel(x-6,y+4,c.face,4,2);q.pixel(x+4,y+4,c.face,4,2);}
          // A near freighter visibly crosses the station on a stable flightpath.
          const shipX=-68+(motion*27+145)%620,shipY=161+Math.sin(motion*.18)*12;freighter(q,shipX,shipY,c,true);
          // An outbound tender docks to the opposite working bay.
          const phase=(motion*.10+.33)%1,ease=.5-.5*Math.cos(phase*TAU),dockX=416+ease*67,dockY=174+ease*28;
          q.poly([[dockX,dockY],[dockX+16,dockY-4],[dockX+31,dockY],[dockX+17,dockY+8]],c.metal);q.pixel(dockX+9,dockY-1,c.blue,11,3);q.pixel(dockX-3,dockY+2,c.neon,5,2);
          const tip=arm(q,27,165,c,motion*.9,13);arm(q,360,185,c,motion*.72+2,8);
          // Fine sparks belong to a moving welding tip rather than random stars.
          for(let i=0;i<7;i++){const a=(motion*3+i*.15)%1;context.globalAlpha=(1-a)*.8;q.pixel(tip.x+a*(i-3)*5,tip.y+a*12,c.hot,1+(i%2),1);}context.globalAlpha=1;
          if(manual!=='robot')robot(q,319+Math.sin(motion*.7)*25,198+Math.sin(motion*.7)*-5,c,motion*3);
          // A cargo hoist follows its rail, lowering a suspended container.
          const craneX=283+Math.sin(motion*.46)*15,drop=9+(.5+.5*Math.sin(motion*.8))*12;q.line(263,172,320,186,c.metal,3);q.pixel(craneX-5,176+(craneX-283)*.24,c.face,11,5);q.line(craneX,180,craneX,180+drop,c.lit);q.poly([[craneX-8,180+drop],[craneX+5,177+drop],[craneX+12,181+drop],[craneX-1,185+drop]],c.blue);q.line(craneX-8,180+drop,craneX-1,185+drop,c.metal);
          for(let i=0;i<12;i++){const a=(motion*.5+i*.09)%1;context.globalAlpha=(1-a)*.28;q.ellipse(31-a*17+Math.sin(a*4)*4,242-a*46,2+a*6,2+a*8,c.blue);}context.globalAlpha=1;
        }
        if(burst>0&&manual==='cargo')freighter(q,390-progress*105,239-Math.sin(progress*Math.PI)*16,c,true);
        if(burst>0&&manual==='repair'){const tip=arm(q,41,166,c,progress*8,24);for(let i=0;i<18;i++){const a=(progress*4+i*.06)%1;context.globalAlpha=burst*(1-a);q.pixel(tip.x+Math.cos(i*2.4)*a*21,tip.y+Math.sin(i*2.4)*a*18,c.hot,1+i%2,1);}context.globalAlpha=1;}
        if(burst>0&&manual==='robot'){const x=318+progress*65,y=199-progress*15;robot(q,x,y,c,progress*20);q.line(x+4,y-11,x+17,y-18,c.metal,2);q.pixel(x+16,y-20,c.hot,4,4);context.globalAlpha=burst*.4;q.ellipse(x+17,y-18,10,4,c.neon);context.globalAlpha=1;}
        const a=motion*.025,x=293+Math.cos(a)*136,y=110+Math.sin(a)*54;q.pixel(x,y,c.hot,3,2);q.pixel(292,70,Math.sin(motion*1.4)>0?c.red:c.face,3,3);
        if(burst>0&&manual==='signal'){context.globalAlpha=burst*.65;for(let i=0;i<3;i++)q.ring(293,81,18+32*progress+i*13,9+15*progress+i*6,c.neon,1,Math.PI*1.05,TAU-.10);context.globalAlpha=1;q.pixel(292,70,c.neon,3,3);}
        if(burst>0&&manual==='vent'){for(let i=0;i<24;i++){const a=(progress*1.2+i*.043)%1;context.globalAlpha=burst*(1-a)*.68;q.ellipse(30-a*12+Math.sin(a*5+i)*6,245-a*76,3+a*9,3+a*10,i%3?c.blue:c.lit);}q.pixel(18,245,c.neon,23,2);context.globalAlpha=1;}
      }
      context.restore();frames++;
    }
    function effect(action,timeSeconds){if(disposed)return false;if(!entry.actions.includes(action))return false;if(action==='lights'){lightsEnabled=!lightsEnabled;active=null;return true;}active={action,at:Math.max(0,number(timeSeconds,lastT)),duration:4};return true;}
    function hotspots(){return disposed?[]:spots.map(spot=>({...spot}));}
    function hitTest(x,y){if(disposed||!Number.isFinite(x)||!Number.isFinite(y))return null;const found=spots.find(spot=>x>=spot.x&&x<=spot.x+spot.w&&y>=spot.y&&y<=spot.y+spot.h);return found?{...found}:null;}
    function dispose(){if(disposed)return;disposed=true;active=null;if(cache){cache.width=1;cache.height=1;}cacheContext=null;cache=null;}
    function diagnostics(){return{id,width:960,height:540,logicalWidth:W,logicalHeight:H,cacheBakes:bakes,frames,disposed,cacheBytes:disposed?0:W*H*4,ownsAnimationLoop:false,ownsListeners:false,ownsAudio:false,lightsEnabled,activeAction:active?.action||null,activeEffects:active?1:0,motionTime:featureTime,settings:{...opts}};}
    return {bake,draw,effect,hotspots,hitTest,dispose,diagnostics};
  }
  root.AfterlightLegacyArt={catalog,create};
})(typeof window!=='undefined'?window:globalThis);

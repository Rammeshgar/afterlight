'use strict';
/* Afterlight cinema edition. Artwork, actors and effects are entirely local.
   The wallpaper host owns input, the render clock and the application state. */
(() => {
  const W=960,H=540,TAU=Math.PI*2;
  const trainPanes=[[33,125,261,222],[338,121,286,224],[653,122,261,220]];
  function clipTrainWindows(c){
    c.beginPath();
    for(const [x,y,w,h] of trainPanes)c.roundRect(x,y,w,h,19);
    c.clip();
  }
  const names=['train','lantern','cat','meteor','light','water'];
  const scenes={
    city:{kind:'canal',horizon:244,light:[835,351,111,72],points:[[455,235],[712,280],[818,412],[380,98],[834,351],[430,455]]},
    observatory:{kind:'alpine',horizon:295,light:[739,321,75,67],points:[[560,413],[399,353],[605,452],[298,111],[743,325],[163,384]]},
    sleeper:{kind:'train',horizon:340,light:[481,48,112,58],points:[[487,226],[575,413],[167,455],[747,226],[480,48],[781,362]]},
    pelagic:{kind:'ocean',horizon:70,light:[741,215,94,115],points:[[568,404],[450,364],[484,165],[700,345],[750,241],[298,414]]},
    sanctuary:{kind:'garden',horizon:328,light:[786,318,86,63],points:[[474,303],[484,408],[550,466],[310,180],[766,311],[347,461]]},
    citylight:{kind:'avenue',road:'boulevard',horizon:379,light:[746,241,64,108],points:[[479,424],[279,240],[793,472],[745,169],[753,252],[402,490]]},
    nocturne:{kind:'avenue',road:'street',horizon:340,light:[185,357,100,61],points:[[558,446],[118,392],[301,463],[492,213],[197,339],[597,485]]},
    lunar:{kind:'moon',horizon:346,light:[555,364,85,48],points:[[495,450],[601,285],[691,451],[255,269],[556,366],[347,471]]},
    foundry:{kind:'orbit',horizon:377,light:[715,381,111,62],points:[[359,318],[656,437],[790,474],[579,212],[714,376],[844,413]]}
  };
  const vehicles={
    tourer:{slots:[0,1],width:1.83,aspect:.64,lamps:[.29,.33]},
    coupe:{slots:[2,3],width:1.77,aspect:.70,lamps:[.28,.35]},
    tram:{slots:[4,5],width:2.28,aspect:1.40,lamps:[.30,.27]},
    cab:{slots:[7,8],width:1.71,aspect:.77,lamps:[.29,.33]},
    van:{slots:[9,10],width:1.83,aspect:.89,lamps:[.28,.28]}
  };
  const actorTiles={11:[202,102],12:[196,122],13:[156,118]};
  const roads={
    boulevard:{
      vanishing:[502,390],distance:266,headlight:'#ffdb9d',tail:'#db5c41',
      // Calibrate against the Art Deco lamp pedestals and storefront bays.
      scale:[[390,0],[414,13],[434,26],[474,48],[540,78]],
      lanes:[
        {slope:-1.68,incoming:false,count:2,speed:.078,phase:.16},
        {slope:2.69,incoming:true,count:2,speed:.073,phase:.34},
        {slope:1.41,incoming:true,count:1,speed:.042,phase:.42,rail:true,distance:446}
      ],
      day:['coupe','tourer','coupe'],night:['tourer','coupe','tourer'],
      dispatch:['coupe','tourer'],dispatchLane:1
    },
    street:{
      vanishing:[544,343],distance:372,headlight:'#f9e1b5',tail:'#d44c47',
      // The near shop doors and sidewalk lamps are larger in this plate.
      scale:[[343,0],[366,10],[389,29],[424,45],[482,72],[540,98]],
      lanes:[
        {slope:-.72,incoming:false,count:2,speed:.061,phase:.24},
        {slope:.81,incoming:true,count:2,speed:.068,phase:.43}
      ],
      day:['van','cab','van'],night:['cab','cab','van'],
      dispatch:['cab'],dispatchLane:1
    }
  };
  function streetScale(calibration,y){
    for(let i=1;i<calibration.length;i++){
      const [startY,startScale]=calibration[i-1],[endY,endScale]=calibration[i];
      if(y<=endY)return startScale+(endScale-startScale)*Math.max(0,(y-startY)/(endY-startY));
    }
    // Use the last visible street scale while a vehicle exits below the frame.
    return calibration.at(-1)[1];
  }
  // The same outlines guard the sampled texture, the final layer and pointer hits.
  const waterProfiles={
    city:{
      box:[153,386,807,154],
      shape:'M159 405 344 401 355 411 422 412 433 400 519 392 594 393 608 407 659 407 669 397 712 399 710 423 713 450 733 468 776 483 822 495 878 505 961 517 961 541 219 541 219 502 190 499 178 480 163 479 158 457Z',
      exclude:'M151 392 266 392 288 407 290 452 273 466 241 474 188 470 158 454Z M171 482 206 481 220 493 222 540 173 540Z',
      power:1.15,lights:[215,310,392,630,894]
    },
    observatory:{
      box:[16,292,629,177],
      shape:'M18 299 624 299 617 328 606 346 586 347 545 352 503 357 456 360 446 339 431 334 424 357 416 363 400 364 393 340 379 346 376 366 366 371 360 353 347 351 337 371 335 390 324 391 313 371 304 370 295 390 292 414 277 430 264 409 255 414 246 437 232 444 204 448 193 432 174 420 147 414 124 418 102 429 87 448 76 451 66 434 60 419 57 404 57 389 45 370 42 337 30 333 23 347 18 340Z',
      exclude:'M503 290 516 282 544 289 576 301 608 318 622 336 635 347 627 370 609 392 610 435 506 435 514 383 522 363 518 343 508 327Z M330 480 332 362 348 347 401 352 456 348 509 344 563 337 619 331 622 356 578 364 523 370 453 377 394 390 366 401 360 484Z',
      power:.93,lights:[91,220,406,492]
    },
    sanctuary:{
      box:[77,291,883,249],
      shape:'M87 297 565 297 549 308 533 331 517 337 481 348 454 348 433 355 417 345 392 342 377 349 355 344 337 335 313 335 293 343 266 332 245 311 218 312 200 320 184 341 157 341 132 326 109 318 91 310Z M143 451 158 433 176 414 211 394 243 391 265 385 334 383 373 380 431 378 485 385 514 382 556 388 584 380 617 374 664 382 705 393 749 407 772 406 794 392 822 389 848 402 875 420 912 420 941 425 960 431 961 541 139 541 124 518 116 504 96 494 79 487 123 466Z',
      exclude:'M331 288 367 288 366 311 332 313Z M419 288 452 288 451 311 420 313Z M197 382 256 381 258 434 198 437Z M466 356 502 356 505 392 465 392Z M527 340 590 337 642 333 676 346 683 359 672 377 632 384 599 383 576 392 544 385 518 376 515 359Z M681 347 717 346 722 383 679 386Z M742 375 795 377 825 363 882 361 952 372 954 417 938 429 861 436 826 416 794 416 750 403Z M789 378 829 377 830 422 788 424Z M557 374 619 367 657 374 667 386 653 397 596 400 569 393Z M586 389 634 381 677 385 701 394 697 408 677 417 619 413 584 405Z M630 406 686 396 736 394 750 401 753 418 741 433 679 437 639 430 622 421Z M669 428 706 416 755 411 788 418 806 429 813 451 801 468 742 472 692 468 661 455Z M684 468 711 451 765 445 819 449 853 464 876 480 872 502 853 513 796 519 726 509 682 494Z M566 539 590 512 637 495 694 487 748 489 788 500 811 516 824 542Z M533 423 603 422 609 491 529 490Z M45 477 86 480 124 494 145 512 172 541 44 541Z',
      power:.80,lights:[221,333,479,574,816,920]
    },
    citylight:{
      box:[0,381,960,159],
      shape:'M480 388 544 387 678 419 790 446 959 476 961 541 0 541 0 501 178 457 331 421Z',
      power:.31,lights:[119,251,386,489,697,861],shallow:true
    },
    nocturne:{
      box:[0,337,960,203],
      shape:'M498 341 563 341 650 368 721 395 809 421 961 472 961 541 0 541 0 521 161 472 290 424 401 380Z',
      power:.34,lights:[92,262,357,540,663,797,905],shallow:true
    },
    pelagic:{
      box:[176,0,611,91],
      shape:'M188 0 779 0 770 19 736 35 688 49 622 53 539 60 438 69 327 62 240 46 194 22Z',
      power:1.23,lights:[245,343,500,590,732],ceiling:true
    }
  };

  const skyProfiles={
    city:{
      box:[460,0,500,174],
      shape:'M528 0H933 L927 25 920 39 913 73 902 101 849 104 818 111 801 103 791 123 762 128 751 112 726 123 719 138 690 141 680 154 678 95 668 75 660 21 646 9 638 27 627 84 624 153 595 151 570 140 548 143 546 128 532 113 520 131 517 120 505 113 497 93 499 76 521 60 516 36Z',
      nightExclude:'M815 17H862V61H815Z',wind:.88,banks:[30,63,100]
    },
    observatory:{
      box:[0,0,748,173],
      shape:'M0 0H742 L736 37 718 58 709 76 693 103 672 107 660 114 628 97 617 90 602 96 573 94 558 97 535 95 509 92 484 86 466 81 450 84 428 101 407 114 381 102 355 117 333 130 299 112 270 121 247 123 224 142 198 142 165 126 133 143 104 132 78 146 45 145 22 143 0 141Z',
      dayExclude:'M49 131H77V155H49Z',nightExclude:'M52 31H121V101H52Z',wind:.81,banks:[22,49,74],northern:true
    },
    sanctuary:{
      box:[301,0,504,123],
      shape:'M500 0H805 L783 30 748 49 718 62 686 75 646 76 618 82 595 103 565 109 548 105 534 112 511 103 474 106 437 111 397 100 365 106 345 98 346 88 361 80 396 81 420 62 467 60 506 43 511 37 498 29 516 17Z M319 102 L351 112 319 124 311 117Z',
      nightExclude:'M515 37H573V92H515Z',wind:.70,banks:[23,44,66]
    },
    citylight:{
      box:[88,0,872,228],
      shape:'M92 0H958 V99 L920 110 905 127 873 141 850 132 826 145 815 141 806 117 804 76 799 65 788 51 783 10 773 0 764 6 764 46 755 68 746 104 742 127 737 147 719 152 697 178 669 191 654 183 632 190 620 204 590 205 569 205 558 186 538 171 531 143 523 124 514 112 484 117 470 142 459 164 440 177 427 177 412 158 392 184 361 192 333 180 323 197 307 186 294 170 275 177 264 198 245 200 224 207 204 215 174 190 150 167 137 154 133 139 120 133 106 136 90 159Z',
      exclude:'M143 72H273V199H143Z',wind:1.09,banks:[16,44,78]
    },
    nocturne:{
      box:[392,0,344,219],
      shape:'M459 0H733 V75 L706 80 688 76 676 63 654 65 640 84 622 104 611 126 604 145 591 152 581 151 576 117 569 107 566 77 556 65 547 73 539 103 532 135 525 154 514 174 499 179 475 179 455 159 440 139 434 116 416 102 402 91 426 77 448 68 451 53 468 42 473 25Z',
      wind:1.18,banks:[19,41,67]
    },
    sleeper:{
      box:[70,119,825,91],
      shape:'M82 138 Q92 129 110 129 H275 L286 141 V194 L272 186 238 175 212 169 178 172 150 180 125 184 100 179 79 167Z M348 139 Q354 129 373 129 H602 L619 141 V189 L590 186 554 197 507 184 474 188 438 181 399 175 379 182 345 174Z M680 139 Q688 130 704 129 H874 L886 142 V172 L874 176 843 181 820 184 792 179 762 184 731 181 700 188 674 181Z',
      dayExclude:'M721 181H748V210H721Z',nightExclude:'M778 132H815V167H778Z',
      wind:.69,banks:[14,32,44],window:true
    },
    lunar:{
      box:[0,0,960,248],
      shape:'M0 0H960V176 L933 176 907 184 862 194 823 196 783 207 759 217 719 230 682 232 644 231 615 219 588 221 561 210 538 205 515 193 487 181 463 175 437 176 414 181 392 189 367 191 343 198 319 200 292 214 274 217 280 193 276 176 254 157 228 136 202 115 195 102 199 65 185 46 159 46 147 64 126 69 106 56 69 48 23 49 0 65Z',
      exclude:'M759 10H960V199H759Z',space:'moon',wind:.45
    },
    foundry:{
      box:[0,0,960,438],
      shape:'M0 184 L37 206 61 219 102 230 145 248 195 259 244 269 307 280 364 288 403 298 458 306 517 306 564 310 580 320 559 330 556 366 546 388 539 399 515 403 509 415 502 428 452 428 432 434 273 434 248 407 223 383 200 361 172 339 144 320 118 302 93 289 68 275 40 263 19 255 0 252Z M406 86 L508 56 621 32 665 19 702 45 658 115 639 111 600 103 568 103 547 96 492 95 457 88Z M728 68 L750 86 754 123 701 123Z M855 83 L922 9 H960V109 L895 117 873 116Z',
      space:'orbit',wind:.52
    }
  };


  const atmospheres={
    daylight:{mist:'#d8e7ce',glow:'#f9c376',cyan:'#94d9d1',rain:'#d8e9e6',shadow:'#142d39'},
    nocturne:{mist:'#88abbf',glow:'#ffc473',cyan:'#75d8e5',rain:'#91bed3',shadow:'#071725'},
    ember:{mist:'#c9a2ba',glow:'#ffbb76',cyan:'#b5ccc6',rain:'#c8b8d4',shadow:'#251a3c'},
    sakura:{mist:'#a1b1d8',glow:'#ffc0c7',cyan:'#9ad5ff',rain:'#a1bfe7',shadow:'#171735'}
  };
  const seed=Array.from({length:208},(_,i)=>[(i*163.637%960),i*137.567%540,(i*179%233)/232,(i*113%239)/238]);
  const mod=(n,d)=>((n%d)+d)%d;
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const smooth=(a,b,n)=>{const x=clamp((n-a)/(b-a));return x*x*(3-2*x);};
  const envelope=(n,d,edge=1)=>smooth(0,edge,n)*(1-smooth(d-edge,d,n));
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function rect(c,color,x,y,w=1,h=1){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
  function polygon(c,color,vertices){
    c.fillStyle=color;c.beginPath();
    vertices.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.closePath();c.fill();
  }
  function line(c,color,x,y,u,v,width=1){
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x)+.5,Math.round(y)+.5);
    c.lineTo(Math.round(u)+.5,Math.round(v)+.5);c.stroke();
  }
  function oval(c,color,x,y,rx,ry,fill){
    c.beginPath();c.ellipse(Math.round(x),Math.round(y),Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);
    if(fill){c.fillStyle=color;c.fill();}else{c.lineWidth=1;c.strokeStyle=color;c.stroke();}
  }
  function halation(color){
    const tile=canvas(96,96),c=tile.getContext('2d');
    const g=c.createRadialGradient(48,48,0,48,48,47);
    g.addColorStop(0,color+'ef');g.addColorStop(.12,color+'b8');
    g.addColorStop(.38,color+'3b');g.addColorStop(.65,color+'12');g.addColorStop(1,color+'00');
    c.fillStyle=g;c.fillRect(0,0,96,96);return tile;
  }
  function captureTexture(target,photo,box,matte){
    const [x,y,width,height]=box;
    target.globalCompositeOperation='source-over';
    target.clearRect(0,0,width,height);
    target.drawImage(photo,x,y,width,height,0,0,width,height);
    target.globalCompositeOperation='destination-in';
    target.drawImage(matte,0,0);
  }
  function makeStencil(profile,exclude,radius){
    const [left,top,width,height]=profile.box;
    const shape=new Path2D(profile.shape),exclusions=exclude&&new Path2D(exclude);
    const hard=canvas(width,height),mask=hard.getContext('2d');
    mask.translate(-left,-top);mask.fill(shape);
    if(exclusions){mask.globalCompositeOperation='destination-out';mask.fill(exclusions);}
    const matte=canvas(width,height),edge=matte.getContext('2d');
    edge.filter='blur('+radius+'px)';edge.drawImage(hard,0,0);
    edge.filter='none';edge.globalCompositeOperation='destination-in';edge.drawImage(hard,0,0);
    return {shape,exclusions,matte};
  }

  function cloudSprite(index,light,colors){
    const tile=canvas(144,44),c=tile.getContext('2d');
    const lumps=Array.from({length:7},(_,i)=>{
      const [a,b,d,e]=seed[42+index*9+i];
      return [15+i*18+a%11,24+(d-.5)*16,12+d*16,8+e*12,b];
    });
    for(let y=0;y<44;y+=2)for(let x=0;x<144;x+=2){
      let density=-1;
      for(const [cx,cy,rx,ry] of lumps)density=Math.max(density,1-((x-cx)/rx)**2-((y-cy)/ry)**2);
      const noise=seed[(x*7+y*13+index*25)%seed.length][2];
      if(density<.08+noise*.17)continue;
      c.globalAlpha=Math.min(.85,density*(light?1.02:.73))*Math.sin(Math.PI*y/47);
      const shade=y*.02+noise*.28-density*.29;
      const tint=light?(shade<.36?'#fff0dc':shade<.70?'#d8e1e3':'#9eafc3'):
        (shade<.36?colors.rain:shade<.70?colors.mist:'#43586f');
      rect(c,tint,x,y,2,2);
    }
    return tile;
  }

  function makeSky(profile){
    const [left,top,width,height]=profile.box;
    const layer=canvas(width,height),c=layer.getContext('2d');
    const plate=canvas(width,height),texture=plate.getContext('2d');
    let palette=null,matte=null,clouds=[],haze=null;
    function prepare(photo,p,colors){
      if(palette===p.palette)return;
      palette=p.palette;
      const keep=p.palette==='daylight'?profile.dayExclude:profile.nightExclude;
      matte=makeStencil(profile,[profile.exclude,keep].filter(Boolean).join(' '),5).matte;
      captureTexture(texture,photo,profile.box,matte);
      clouds=profile.space?[]:Array.from({length:5},(_,i)=>cloudSprite(i,p.palette==='daylight',colors));
      haze=profile.northern&&p.palette==='daylight'?halation(colors.mist):null;
    }
    function cloudBanks(t,p,colors){
      const daytime=p.palette==='daylight',wind=profile.wind,bands=profile.banks;
      for(let i=0;i<clouds.length;i++){
        const band=i%bands.length,tile=clouds[i];
        const length=(.88+band*.58)*tile.width;
        const rise=(.59+band*.16)*tile.height;
        const track=width+length*2;
        const travel=mod(i*track/clouds.length+t*wind*(7+band*4),track);
        const x=travel-length,y=bands[band]+Math.sin(t*.27+i*2)*5;
        c.globalAlpha=(daytime?.40:.32)*(profile.window?1.55:1)*(1-band*.13);
        c.drawImage(tile,Math.round(x),Math.round(y),Math.round(length),Math.round(rise));
      }
      if(!daytime&&p.weather==='clear'){
        for(let i=0;i<42;i++){
          const [a,b,d,e]=seed[i+68];
          const wave=Math.max(0,Math.sin(t*(.69+d*2)+i*1.71));
          const x=a/W*width,y=b/H*height;
          c.globalAlpha=.10+wave*.58;
          rect(c,d>.67?colors.glow:colors.rain,x,y,e>.83?2:1,1);
        }
      }
    }
    function starfield(t,day,colors){
      for(let i=0;i<127;i++){
        const [a,b,d,e]=seed[i+17],depth=.3+d*1.5;
        const phase=mod(a/W+t*depth*.0022,1);
        const x=phase*width,y=mod(b/H+t*.0007*depth,1)*height;
        const blink=Math.pow(Math.max(0,Math.sin(t*(.61+d*1.9)+i*2.3)),3);
        c.globalAlpha=(day?.43:.68)*(.37+blink*.63)*envelope(phase,1,.055);
        rect(c,d>.83?colors.glow:colors.rain,x,y,e>.87?2:1,1);
        if(e>.96&&blink>.69){
          c.globalAlpha*=.47;
          rect(c,colors.cyan,x-1,y,4,1);rect(c,colors.cyan,x+1,y-1,1,3);
        }
      }
      const transit=mod(t+4,34)/34,orbit=profile.space==='orbit';
      const probeX=width*((orbit?.26:.25)+transit*(orbit?.40:.50));
      const probeY=height*(orbit?.82:.46)+Math.sin(t*.5)*6-transit*26;
      const sheen=.64+.36*Math.max(0,Math.sin(t*1.8));
      c.globalAlpha=envelope(transit,1,.09)*sheen;
      c.save();c.translate(Math.round(probeX),Math.round(probeY));
      line(c,'#b7b7a1',-16,4,16,-4);
      polygon(c,day?'#496b87':'#547da7',[[-19,0],[-7,-3],[-5,2],[-18,7]]);
      polygon(c,day?'#426481':'#4c79a4',[[7,-7],[18,-10],[21,-5],[9,0]]);
      line(c,'#aabdba',-18,0,-7,-3);line(c,'#a5b5ac',7,-7,18,-10);
      rect(c,'#bab59c',-5,-3,11,7);rect(c,'#544c40',-3,2,9,2);
      rect(c,colors.glow,2,-3,2,2);line(c,'#aab4a4',4,-3,9,-11);
      c.restore();
      const passage=mod(t+6,21);
      if(passage<2.8){
        const x=width*(.17+passage*.21),y=height*(.24+passage*.065);
        c.globalAlpha=envelope(passage,2.8,.61)*.64;
        for(let n=0;n<8;n++){
          line(c,n<2?colors.rain:colors.cyan,x-n*4,y-n*1.6,x-n*4-3,y-n*1.6-1);
          c.globalAlpha*=.77;
        }
      }
    }
    function aurora(t,day){
      if(day){
        c.globalAlpha=.29;
        for(let i=0;i<4;i++){
          const track=width+330,x=mod(i*track/4+t*(7+i),track)-230;
          c.drawImage(haze,Math.round(x),46+i*12,315,37+i*6);
        }
        return;
      }
      c.globalCompositeOperation='screen';
      for(let ribbon=0;ribbon<3;ribbon++){
        for(let x=0;x<width;x+=5){
          const fade=Math.sin(x/width*Math.PI);
          const topLine=52+ribbon*15+Math.sin(x*.013+t*.74+ribbon)*24+Math.cos(x*.026-t*.55)*9;
          const length=11+(Math.sin(x*.061+t*.95)+1)*15;
          const stretch=Math.sin(x*.035)*11;
          c.globalAlpha=fade*.21*(1-ribbon*.16);
          line(c,ribbon===1?'#42c99f':'#26866b',x,topLine,x+stretch,topLine+length,4);
          c.globalAlpha*=.82;
          line(c,'#95ddb1',x+stretch,topLine+length,x+stretch+3,topLine+length+1,2);
        }
      }
      c.globalCompositeOperation='source-over';
    }
    function draw(screen,photo,t,p,colors,northern){
      prepare(photo,p,colors);
      c.globalCompositeOperation='source-over';c.globalAlpha=1;c.clearRect(0,0,width,height);
      const day=p.palette==='daylight';
      if(!profile.space){
        const shift=Math.round((Math.sin(t*.22)*39+Math.sin(t*.52)*6)*profile.wind*(profile.window?.67:1));
        // The moving carriage already carries its own distant sky. Overlay
        // only atmosphere there, so the photo's moon is rendered once.
        if(!profile.window||!p.worldFeature){
          c.globalAlpha=profile.window?.68:.94;
          c.drawImage(plate,shift,Math.round(Math.sin(t*.39)*2));
        }
        cloudBanks(t,p,colors);
      }else{
        if(!day){
          c.globalAlpha=.89;
          c.drawImage(plate,Math.round(Math.sin(t*.21)*11),Math.round(Math.sin(t*.36)*3));
        }
        starfield(t,day,colors);
      }
      if(profile.northern&&northern)aurora(t,day);
      c.globalAlpha=1;c.globalCompositeOperation='destination-in';c.drawImage(matte,0,0);
      screen.drawImage(layer,left,top);
    }
    return {draw};
  }


  function makeWater(profile){
    const [left,top,width,height]=profile.box;
    const {shape,exclusions,matte:feather}=makeStencil(profile,profile.exclude,3);
    const buffer=canvas(width,height),c=buffer.getContext('2d');
    const texture=canvas(width,height),tex=texture.getContext('2d');
    c.imageSmoothingEnabled=false;
    const has=(x,y)=>x>=left&&x<left+width&&y>=top&&y<top+height&&
      c.isPointInPath(shape,x,y)&&!(exclusions&&c.isPointInPath(exclusions,x,y));
    let textureGrade=null;
    function bakeTexture(photo,palette){
      if(textureGrade===palette)return;
      textureGrade=palette;
      captureTexture(tex,photo,profile.box,feather);
    }
    let beamGrade=null,beamGradient=null;
    function waves(photo,t,clock,p,colors,events,reaction){
      const rain=p.weather==='rain'?p.intensity/100:0,day=p.palette==='daylight';
      const halfResolution=p.quality===15,lineHeight=halfResolution?5:3;
      const columns=halfResolution?2:3,cell=width/columns;
      const swell=profile.power*(.86+rain*.52),impacts=events.slice(-5);
      c.globalCompositeOperation='source-over';c.globalAlpha=1;
      c.clearRect(0,0,width,height);
      bakeTexture(photo,p.palette);
      const edges=new Int32Array(columns+1);
      for(let y=0;y<height;y+=lineHeight){
        const depth=y/height,near=profile.ceiling?1-depth:depth;
        const gain=(.20+near*.98)*swell;
        const band=Math.min(height-y,lineHeight),yy=top+y;
        const phase=t*4.15-depth*26;
        const sy=clamp(Math.round(y+(Math.cos(phase)*3.7+Math.sin(t*6.2-depth*53)*1.6)*gain),0,height-band);
        for(let i=0;i<=columns;i++){
          const x=Math.round(i*cell);
          let u=(Math.sin(phase+i*.82)*12+Math.cos(t*2.15-depth*49-i*1.41)*5)*gain;
          for(const e of impacts){
            const age=clock-e.start,dy=yy-e.point[1],dx=left+x-e.point[0];
            if(age<0||age>3.2||Math.abs(dy)>64||Math.abs(dx)>205)continue;
            const distance=Math.hypot(dx,dy*3.5)-age*82;
            const kick=Math.max(0,1-Math.abs(distance)/104)*(1-age/3.2);
            u+=Math.sin(distance*.13)*kick*12;
          }
          edges[i]=clamp(Math.round(x+u),0,width);
        }
        for(let i=0;i<columns;i++){
          const start=Math.round(i*cell),end=Math.round((i+1)*cell);
          c.drawImage(texture,edges[i],sy,Math.max(1,edges[i+1]-edges[i]),band,start,y,end-start,band);
        }
      }
      const count=profile.shallow?54:halfResolution?49:82;
      const bass=reaction?.bass||0,high=reaction?.high||0;
      for(let i=0;i<count;i++){
        const [sx,sy,a,b]=seed[i+12];
        const cycle=mod(sy/H+t*(.105+a*.06+rain*.09),1),depth=cycle*cycle;
        const x=mod(sx+Math.sin(t*.8+i)*8+t*(a-.37)*16,width);
        const y=depth*height,wx=x+left;
        const shimmer=envelope(cycle,1,.17)*(.49+.51*Math.pow(Math.sin(t*2.8+i*2.1),2));
        const length=(3+b*9)*(1+depth*3.4)*(1+bass*.47),rim=Math.max(2,length*.52);
        const gleam=profile.lights.some(light=>Math.abs(light-wx)<16+depth*30);
        c.globalAlpha=shimmer*(.16+depth*.26)*(profile.shallow?.68:1);
        rect(c,colors.shadow,x-length*.7,y+1,length,1+depth*2);
        c.globalAlpha=clamp(shimmer*(gleam?(day?.55:.71):(day?.37:.29))*(profile.shallow?.60:1)
          +(gleam?bass*.34:high*.32)*(.36+depth*.64)*(.45+shimmer*.55));
        const tint=gleam&&!profile.ceiling?colors.glow:colors.rain;
        rect(c,tint,x-length*.52,y,rim,1+depth*.62);
        rect(c,tint,x+length*.18,y-1,length*.27,1);
        if(gleam&&depth>.39)rect(c,tint,x+length*.49,y+1,length*.16,1);
      }
      for(const e of impacts){
        const age=clock-e.start;
        if(age<0||age>3.8)continue;
        const [x,y]=e.point,depth=clamp((y-top)/height);
        const perspective=.12+depth*.15;
        for(let i=0;i<3;i++){
          const a=age-i*.19;
          if(a<0)continue;
          const radius=(6+a*(31+depth*30))*(profile.shallow?.86:1);
          c.globalAlpha=(1-smooth(1.1,3.8,age))*(.77-i*.15);
          oval(c,colors.shadow,x-left,y-top+2,radius+1,radius*perspective+1,false);
          oval(c,i===0?colors.rain:colors.cyan,x-left,y-top,radius,radius*perspective,false);
        }
      }
      if(rain>.06&&!profile.ceiling){
        for(let i=0;i<Math.ceil(rain*(profile.shallow?28:40));i++){
          const [sx,sy,a,b]=seed[i+110];
          const phase=mod(t*(.76+a*.9)+b,1),depth=sy/H;
          const x=mod(sx,width),y=depth*height,r=(1+phase*13)*(.44+depth);
          c.globalAlpha=(1-phase)*rain*(.35+depth*.4);
          oval(c,colors.rain,x,y,r,r*(.11+depth*.15),false);
        }
      }
      c.globalAlpha=1;c.globalCompositeOperation='destination-in';c.drawImage(feather,0,0);
    }
    function draw(screen,photo,t,clock,p,colors,events,reaction){
      waves(photo,t,clock,p,colors,events,reaction);
      screen.save();
      screen.globalAlpha=profile.shallow?.64:1;
      screen.drawImage(buffer,left,top);
      screen.restore();
      if(!profile.ceiling)return;
      if(beamGrade!==p.palette){
        beamGrade=p.palette;beamGradient=screen.createLinearGradient(0,0,0,420);
        beamGradient.addColorStop(0,colors.cyan+'cc');beamGradient.addColorStop(.38,colors.cyan+'51');
        beamGradient.addColorStop(1,colors.cyan+'00');
      }
      screen.save();screen.globalCompositeOperation='screen';
      for(let i=0;i<9;i++){
        const x=202+i*64+Math.sin(t*1.15+i)*29,spread=12+i%3*10;
        const bend=Math.sin(t*.93+i*.71)*66;
        screen.globalAlpha=(p.palette==='daylight'?.29:.26)*(.58+.37*Math.cos(t*1.9+i));
        polygon(screen,beamGradient,[[x,1],[x+spread,2],[x+96+bend+spread*2,379],[x+106+bend,293]]);
      }
      screen.restore();
    }
    return {draw,has,ripple:!profile.ceiling};
  }


  function create(){
    let id='',stage=null,revision=0,plate=null,photo=null,grade='',elapsed=0,lastTime=null,lit=true,curtains=false,curtainAmount=0,events=[],loadStatus='classic',living=null,water=null,sky=null,environment=null,ripples=[],trafficTime=0,trafficSpeed=1;
    const accents=new Map(),sprites=new Map();
    let vehicleAtlas=null,vehicleRequest=null,roadMask=null;
    function prepareVehicles(){
      if(!vehicleRequest)vehicleRequest=new Promise(resolve=>{
        const image=new Image();
        image.onload=()=>{vehicleAtlas=image;resolve();};
        image.onerror=()=>resolve();
        image.src='cinema/vehicles.webp';
      });
      return vehicleRequest;
    }
    function glow(c,color,x,y,rx,ry,opacity){
      if(opacity<=0)return;
      if(!accents.has(color))accents.set(color,halation(color));
      const alpha=c.globalAlpha;c.globalAlpha=alpha*clamp(opacity);
      c.drawImage(accents.get(color),Math.round(x-rx),Math.round(y-ry),Math.round(rx*2),Math.round(ry*2));c.globalAlpha=alpha;
    }
    const isActive=key=>living?.on(key)??false;
    function select(next,onReady){
      if(id===next)return;
      id=next;stage=scenes[next];elapsed=0;lastTime=null;lit=true;curtains=false;curtainAmount=0;events=[];
      plate=null;photo=null;grade='';living=stage?window.AfterlightLivingWorlds?.create(next,glow,vehicleSprite):null;trafficTime=0;trafficSpeed=1;
      water=waterProfiles[next]?makeWater(waterProfiles[next]):null;ripples=[];
      roadMask=stage?.road?new Path2D(waterProfiles[next].shape):null;
      sky=skyProfiles[next]?makeSky(skyProfiles[next]):null;
      environment=window.AfterlightEnvironment?.create(next,{canvas,makeStencil,captureTexture,glow});
      if(!stage)return;
      loadStatus='loading';
      const generation=++revision,image=new Image();
      image.onload=async()=>{
        if(revision!==generation)return;
        await prepareVehicles();
        if(revision!==generation)return;
        plate=image;loadStatus='cinema';onReady();
      };
      image.onerror=()=>{if(revision===generation){loadStatus='classic';onReady();}};
      image.src='cinema/'+next+'.webp';
    }
    function bake(palette){
      if(photo&&grade===palette)return;
      photo=photo||canvas(W,H);
      const c=photo.getContext('2d',{alpha:false});
      const height=plate.naturalHeight/2;
      c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
      c.filter=palette==='ember'?'sepia(0.20) saturate(1.10) brightness(1.19)':
        palette==='sakura'?'hue-rotate(17deg) saturate(0.81) brightness(1.12)':'none';
      c.drawImage(plate,0,palette==='daylight'?height:0,plate.naturalWidth,height,0,0,W,H);
      c.filter='none';grade=palette;
    }
    function vehicleSprite(slot,palette){
      if(!vehicleAtlas)return null;
      const key=id+':'+slot+':'+palette;
      if(sprites.has(key))return sprites.get(key);
      const [w,h]=actorTiles[slot]??(slot===6?[202,108]:slot>=9?[165,167]:slot>=7?[176,142]:slot>=4?[136,202]:[176,145]);
      const tile=canvas(w,h),paint=tile.getContext('2d');
      const day=palette==='daylight',submerged=slot===12,cool=id==='nocturne'||submerged;
      paint.filter=day?(slot===6?'brightness(1.02) saturate(.88)':'brightness(1.10) saturate(.94)'):
        palette==='ember'?'brightness(.78) sepia(.10) saturate(.93)':
        palette==='sakura'?'brightness(.75) saturate(.82) hue-rotate(8deg)':
        slot===6?'brightness(.75) saturate(.89)':
        cool?'brightness(.73) saturate(.78)':'brightness(.78) saturate(.91)';
      paint.drawImage(vehicleAtlas,(slot%4)*224+8,Math.floor(slot/4)*224+8,w,h,0,0,w,h);
      if(slot!==6){
        paint.filter='none';
        paint.globalCompositeOperation='source-atop';
        const light=paint.createLinearGradient(0,0,w,h);
        light.addColorStop(0,submerged?'#51a2bd3d':day?'#fff1cd31':cool?'#88b9d126':'#f8c38a30');
        light.addColorStop(1,day?'#727f8710':cool?'#101d3b45':'#14231c35');
        paint.fillStyle=light;paint.fillRect(0,0,w,h);
      }
      const mirror=canvas(w,h),ref=mirror.getContext('2d');
      ref.save();ref.translate(0,h);ref.scale(1,-1);ref.drawImage(tile,0,0);ref.restore();
      ref.globalCompositeOperation='destination-in';
      const fade=ref.createLinearGradient(0,0,0,h);
      fade.addColorStop(0,'#000d');fade.addColorStop(.30,'#0008');fade.addColorStop(1,'#0000');
      ref.fillStyle=fade;ref.fillRect(0,0,w,h);
      const sprite={tile,mirror};
      sprites.set(key,sprite);
      return sprite;
    }
    function roadReflection(c,sprite,x,y,w,h,t,brightness){
      const source=sprite.mirror,reflectionHeight=h*.62;
      c.globalAlpha=brightness;
      for(let j=0;j<7;j++){
        const top=Math.round(j*source.height/7),bottom=Math.round((j+1)*source.height/7);
        const offset=Math.sin(t*4.4+y*.04+j*.91)*(1+j*.42)*w/88;
        const destY=Math.round(y+j*reflectionHeight/7),nextY=Math.round(y+(j+1)*reflectionHeight/7);
        c.drawImage(source,0,top,source.width,bottom-top,Math.round(x-w/2+offset),destY,w,Math.max(1,nextY-destY));
      }
    }
    function traffic(c,t,p,colors){
      if(!vehicleAtlas)return;
      const road=roads[stage.road],day=p.palette==='daylight',fleet=day?road.day:road.night;
      const [vx,hy]=road.vanishing,arrivals=[];
      function place(lane,depth,model,dispatched=false){
        const vehicle=vehicles[model];
        // Position and size share the same point of contact with the street.
        const ground=7+(lane.distance??road.distance)*depth**1.78,y=hy+ground;
        const pixelsPerMetre=streetScale(road.scale,y);
        const w=Math.max(2,Math.round(vehicle.width*pixelsPerMetre)),h=Math.max(2,Math.round(w*vehicle.aspect));
        const x=vx+lane.slope*ground;
        if(y-h>H+2||x-w/2>W+2||x+w/2<-2)return;
        arrivals.push({lane,vehicle,depth,dispatched,x,y,w,h});
      }
      if(p.worldFeature){
        road.lanes.forEach((lane,i)=>{
          for(let car=0;car<lane.count;car++){
            const travel=trafficTime*lane.speed+lane.phase+car/lane.count,step=mod(travel,1);
            const model=lane.rail?'tram':fleet[Math.floor(travel+i+car)%fleet.length];
            place(lane,lane.incoming?step:1-step,model);
          }
        });
      }
      for(const e of events)if(e.kind==='train'){
        const age=t-e.start,lane=road.lanes[road.dispatchLane];
        for(const [i,model] of road.dispatch.entries()){
          const step=age*.128-i*.18;
          if(step>0&&step<1)place(lane,step,model,true);
        }
      }
      const dispatch=arrivals.filter(vehicle=>vehicle.dispatched);
      arrivals.sort((a,b)=>a.y-b.y);
      for(const car of arrivals){
        car.alpha=smooth(0,.13,car.depth);
        if(!car.dispatched)for(const pass of dispatch){
          if(pass.lane===car.lane)car.alpha*=smooth(pass.h*.55,pass.h*1.40,Math.abs(pass.y-car.y));
        }
      }
      const wet=p.weather==='rain'?1:.71;
      c.save();
      c.clip(roadMask);
      for(const {lane,vehicle,alpha,x,y,w,h} of arrivals){
        if(alpha<.02)continue;
        const scale=w/65,front=lane.incoming;
        const sprite=vehicleSprite(vehicle.slots[front?0:1],p.palette);
        const lamp=front?road.headlight:road.tail,lightStrength=wet*(day?.18:.63)*(front?1:.64);
        const wheelSpread=w*.315,lightSpread=w*vehicle.lamps[0];
        roadReflection(c,sprite,x,y,w,h,t,alpha*wet*(day?.36:.53));
        c.globalAlpha=alpha*(day?.57:.72);
        oval(c,colors.shadow,x,y+.5,w*.48,Math.max(.55,w*.063),true);
        for(const dx of [-wheelSpread,wheelSpread])
          oval(c,'#101820',x+dx,y+.5,Math.max(1,w*.095),Math.max(1,w*.033),true);
        c.globalAlpha=alpha;
        for(const dx of [-lightSpread,lightSpread]){
          for(let j=0;j<8;j++){
            c.globalAlpha=alpha*lightStrength*(1-j/8)*.43;
            const drift=Math.sin(t*4.2+j*2.5+y*.031)*(1+j*.52)*scale;
            const streak=1+(2+j*1.1)*scale;
            rect(c,lamp,x+dx+drift-streak/2,y+1+j*3.2*scale,streak,1);
          }
          c.globalAlpha=alpha;
        }
      }
      c.restore();
      for(const {lane,vehicle,alpha,x,y,w,h} of arrivals){
        if(alpha<.02)continue;
        const front=lane.incoming,sprite=vehicleSprite(vehicle.slots[front?0:1],p.palette);
        c.globalAlpha=alpha;
        c.drawImage(sprite.tile,Math.round(x-w/2),Math.round(y-h+1),w,h);
        const lamp=front?road.headlight:road.tail,beam=wet*(day?.23:.76)*(front?1:.62);
        for(const sign of [-1,1]){
          const lx=x+sign*w*vehicle.lamps[0],ly=y-h*vehicle.lamps[1];
          glow(c,lamp,lx,ly,1+w*.11,1+w*.075,beam);
          if(!day&&w>=10){
            c.globalAlpha=alpha*(front?.78:.55);
            rect(c,front?'#ffe5b1':lamp,lx-w*.022,ly,w*.044,Math.max(1,w*.025));
            c.globalAlpha=alpha;
          }
        }
      }
      c.globalAlpha=1;
    }
    function surveyRover(c,step,t,p,colors){
      const sprite=vehicleSprite(6,p.palette);
      if(!sprite)return;
      // The parked rover sits at x=145–310. The crossing runs on the clear
      // apron to its right, and both idle and dispatched trips use this route.
      const x=389+step*400,y=402+step*36+Math.sin(step*Math.PI)*11;
      const width=Math.round(64+step*33),height=Math.round(width*.535);
      const alpha=envelope(step,1,.12),day=p.palette==='daylight';
      c.save();
      c.globalAlpha=alpha*(day?.39:.52);
      oval(c,colors.shadow,x-2,y+.8,width*.48,5+step*3,true);
      c.globalAlpha=alpha;
      glow(c,colors.glow,x+width*.42,y+1,width*.37,7,day?.14:.35);
      for(let i=0;i<12;i++){
        const [,,a,b]=seed[i+93],cycle=mod(t*(.9+a)+b,1);
        c.globalAlpha=alpha*(1-cycle)*(day?.30:.31);
        const trailX=x-width*.31-cycle*(19+18*a),trailY=y-2-cycle*(3+7*b);
        rect(c,i%3?colors.mist:'#a6a699',trailX,trailY,1+a*2,1);
      }
      c.globalAlpha=alpha;
      c.drawImage(sprite.tile,Math.round(x-width/2),Math.round(y-height),width,height);
      c.restore();
    }

    function weather(c,t,p,colors,space){
      if(p.weather==='clear'||p.intensity===0)return;
      const intensity=p.intensity/100,limit=p.quality===15?90:155;
      const ocean=stage.kind==='ocean',mist=p.weather==='mist',snow=p.weather==='snow',train=stage.kind==='train';
      if(train){c.save();clipTrainWindows(c);}
      if(mist){
        for(let i=0;i<4;i++){
          const y=stage.horizon-18+i*16;
          glow(c,colors.mist,240+i*170+Math.sin(t*.16+i)*80,y,400,19+i*6,.13*intensity);
        }
      }else{
        for(let i=0;i<Math.round(intensity*(space?45:ocean?100:limit));i++){
          const [sx,sy,a,b]=seed[i],dx=snow||ocean?Math.sin(t*.41+i)*12+t*(.3+a):-(10+a*15)*t;
          const x=mod(sx+dx,W+12)-6,y=mod(sy+t*(space?14+a*46:ocean?1+a*5:snow?8+a*22:89+a*166),H+32)-16;
          c.globalAlpha=(space?.14:ocean?.23:snow?.26:.08)+a*(snow?.5:.22);
          if(ocean||snow)rect(c,colors.rain,x,y,b>.87?2:1,b>.91?2:1);
          else line(c,colors.rain,x,y,x-(space?4+a*15:2+a*5),y+4+a*(space?8:13),b>.90?1.6:1);
        }
      }
      c.globalAlpha=1;if(train)c.restore();
    }
    function signal(c,colors,x,y,age,opacity,space){
      const signalColor=space?colors.cyan:colors.glow;
      c.globalAlpha=opacity;
      glow(c,signalColor,x,y,26,22,.85);
      rect(c,'#e8fbdf',x-1,y-2,3,4);
      for(let i=0;i<3;i++){
        const radius=13+age*31+i*19;
        c.globalAlpha=opacity*(.6-i*.13);
        oval(c,signalColor,x,y,radius,radius*(space?.42:.25),false);
      }
      c.globalAlpha=1;
    }
    function motes(c,t,x,y,count=28,scale=1,color='#e4f2d5',opacity=.7){
      for(let i=0;i<count;i++){
        const [,,a,b]=seed[i],k=mod(t*(.7+a*.48)+b,1),xx=x+Math.sin(t*.9+i*2)*12*scale+(a-.5)*k*82*scale;
        c.globalAlpha=opacity*(1-k)*(.35+b*.65);
        rect(c,color,xx,y-k*(17+a*75)*scale,b>.84?2:1,b>.94?2:1);
      }
      c.globalAlpha=1;
    }
    function lanterns(c,t,x,y,colors,opacity,water){
      for(let i=0;i<7;i++){
        const [,,a,b]=seed[i+22],px=x+(i-3)*16+Math.sin(t*.68+i)*7+t*(water?4:2),py=y+b*35+t*(water?.7:-6);
        const s=.75+a*.55;
        c.globalAlpha=opacity*(.65+b*.35);
        glow(c,colors.glow,px,py,14*s,13*s,.85);
        rect(c,'#85432a',px-4*s,py-2*s,9*s,7*s);
        rect(c,'#ffdca0',px-2*s,py-2*s,5*s,5*s);
        rect(c,'#f3974a',px-4*s,py+4*s,9*s,1);
        if(water){c.globalAlpha=opacity*.26;rect(c,colors.glow,px-5,py+10,11,1);rect(c,colors.glow,px-3,py+13,6,1);}
      }
      c.globalAlpha=1;
    }
    function train(c,x,y,s,day){
      for(let cars=5;cars>=0;cars--){
        const car=x-cars*61*s,h=13*s;
        polygon(c,'#182536',[[car,y-h],[car+54*s,y-h],[car+61*s,y-8*s],[car+59*s,y],[car,y]]);
        rect(c,'#64828a',car+2*s,y-h,51*s,1);
        rect(c,'#527785',car+3*s,y-h+2,55*s,4*s);
        rect(c,'#8d6453',car+2*s,y-4*s,56*s,2*s);
        for(let j=0;j<7;j++){
          rect(c,'#152937',car+(5+j*7)*s,y-10*s,5*s,5*s);
          rect(c,day?'#a9c8b5':'#e3b473',car+(6+j*7)*s,y-9*s,3*s,3*s);
        }
        rect(c,'#132432',car+6*s,y,10*s,2*s);rect(c,'#132432',car+45*s,y,10*s,2*s);
      }
      rect(c,'#ffe1ac',x+58*s,y-6*s,4*s,2*s);
    }
    function shuttle(c,x,y,s,colors,opacity){
      c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);c.globalAlpha=opacity;

      polygon(c,'#253b48',[[-41,5],[-31,-6],[7,-13],[35,-5],[52,2],[34,12],[-21,15]]);
      polygon(c,'#91a7a0',[[-36,4],[-28,-5],[8,-12],[34,-4],[50,2],[4,6]]);
      polygon(c,'#577583',[[-22,8],[50,2],[33,12],[-20,14]]);
      polygon(c,'#244a60',[[7,-9],[22,-7],[36,-2],[10,1]]);
      line(c,'#d5c7a8',8,-8,23,-6,1);
      rect(c,'#deddbc',12,-6,6,2);
      for(const dx of [-24,-13,-2])rect(c,'#cba66e',dx,6,6,2);
      glow(c,colors.cyan,-38,6,15,9,.8);
      c.restore();
    }
    function worker(c,x,y,t,robot,colors,opacity){
      c.save();c.translate(Math.round(x),Math.round(y));c.globalAlpha=opacity;
      oval(c,colors.shadow,0,19,14,4,true);
      rect(c,'#273a46',-8,1,5,12);rect(c,'#9cada5',-7,-1,18,13);
      rect(c,'#c9cbb0',-6,-10,15,11);rect(c,robot?'#86cdc9':'#365a6b',-4,-8,12,5);
      rect(c,'#dce8c5',-2,-7,5,1);
      if(robot){
        rect(c,'#243c48',-10,12,24,6);rect(c,'#8da6a0',-8,12,21,1);
        line(c,'#96ada4',7,-11,13,-16,2);glow(c,colors.glow,13,-17,5,5,.85);
      }else{
        const dx=Math.sin(t*5)*4;
        line(c,'#b6c2ae',-4,10,-6+dx,18,4);line(c,'#7c9e9a',7,10,9-dx,18,4);
        line(c,'#a0afa0',8,4,14,6+dx,3);rect(c,colors.glow,14,5+dx,4,2);
      }
      c.restore();
    }
    function trainGlass(c,t,colors){
      c.save();clipTrainWindows(c);
      const x=mod(250-t*112,1030)-150;
      for(let i=0;i<6;i++){
        const left=x+i*43,y=310+i%2*9,shade=i%2?'#243943':'#334b4a';
        polygon(c,shade,[[left-4,y],[left+13,y-15],[left+35,y],[left+31,y+33],[left,y+33]]);
        rect(c,colors.glow,left+7,y+6,5,6);rect(c,colors.glow,left+19,y+6,5,6);
      }
      c.restore();
    }
    function drawCurtains(c,p){
      if(curtainAmount<.015)return;
      const day=p.palette==='daylight';
      c.save();clipTrainWindows(c);
      for(const [x,y,w,h] of trainPanes){
        const covered=Math.round(w*curtainAmount);
        c.save();c.beginPath();c.rect(x,y,covered,h+2);c.clip();
        rect(c,day?'#244643':'#152d33',x,y,covered,h);
        for(let i=0;i<w;i+=12){
          rect(c,day?'#3c5b50':'#213d40',x+i,y,5,h);
          rect(c,day?'#4a6956':'#2d4a46',x+i+4,y,2,h);
          rect(c,day?'#6c6e49':'#5c503a',x+i,y+h-4,8,2);
        }
        line(c,'#a78858',x,y+h,x+covered,y+h,2);c.restore();
      }
      c.restore();
    }
    function ambient(c,t,p,colors,pan){
      const day=p.palette==='daylight';
      const [x,y,rx,ry]=stage.light,interactive=p.worldFeature;
      const visible=day?.31:.59;
      if(!lit){
        c.globalAlpha=day?.49:.76;
        glow(c,colors.shadow,x,y,rx*1.22,ry*1.27,1);c.globalAlpha=1;
      }else if(p.windows){
        glow(c,colors.glow,x,y,rx,ry,visible*(.35+p.worldGlow/160));
        glow(c,colors.glow,x+rx*.20,y+ry*.20,rx*.45,ry*.29,visible*.28);
      }
      if(stage.road){traffic(c,t,p,colors);return;}
      if(!interactive)return;
      if(stage.kind==='canal'){
        const crossing=mod(elapsed*13+71,1310)-290;
        train(c,crossing,stage.horizon+2,.67,day);
      }else if(stage.kind==='train'){
        motes(c,elapsed*.2,571,414,28,.58,day?'#eceed8':'#c7d8c6',.38);
        for(let i=0;i<34;i++){
          const q=mod(seed[i][0]-elapsed*19,760)+103;
          if(q>310&&q<340||q>611&&q<643)continue;
          c.globalAlpha=.14;rect(c,colors.glow,q,207+seed[i][1]%88,2,1);
        }
        c.globalAlpha=1;
      }else if(stage.kind==='ocean'){
        motes(c,elapsed*.11,370,481,40,3.2,colors.cyan,.45);
        for(let i=0;i<15;i++){
          const q=mod(174+i*24-elapsed*(8+i%4),302)+226;
          const yy=293+(i*29%105)+Math.sin(t*1.2+i)*3;
          c.globalAlpha=.31;rect(c,colors.cyan,q,yy,4,1);rect(c,colors.mist,q+4,yy-1,1,3);
        }
        c.globalAlpha=1;
      }else if(stage.kind==='garden'||stage.kind==='alpine'){
        for(let i=0;i<28;i++){
          const [sx,sy,a]=seed[i],px=mod(sx+elapsed*(4+a*5)+pan.x*.21,970),py=mod(sy+elapsed*(3+a*12),550);
          c.globalAlpha=(.12+a*.48)*(stage.kind==='alpine'?.54:1);
          rect(c,stage.kind==='garden'?'#efb8bb':colors.glow,px+Math.sin(t+i)*6,py,a>.65?3:2,1);
        }
        c.globalAlpha=1;
      }else if(stage.kind==='moon'||stage.kind==='orbit'){
        const moon=stage.kind==='moon',step=mod(elapsed*(moon?.024:.034)+.15,1);
        if(moon){
          if(!events.some(e=>e.kind==='train'&&t-e.start<e.duration))surveyRover(c,step,t,p,colors);
        }else shuttle(c,162+step*587,257+Math.sin(step*2)*20,.50+step*.26,colors,envelope(step,1,.09));
        for(let i=0;i<6;i++){
          const [px,py]=stage.points[(i+2)%6];
          glow(c,i%2?colors.glow:colors.cyan,px,py,9,7,.27*(1+Math.sin(t*1.4+i)));
        }
      }
    }
    function effects(c,t,p,colors){
      events=events.filter(e=>t-e.start<e.duration);
      for(const e of events){
        const age=t-e.start,alpha=envelope(age+.3,e.duration,.52),[x,y]=e.point;
        const space=stage.kind==='moon'||stage.kind==='orbit';
        if(e.kind==='train'&&!stage.road){
          if(stage.kind==='moon')surveyRover(c,clamp(age/e.duration),t,p,colors);
          else if(space)shuttle(c,x-185+age*38,y-Math.sin(age*.25)*34,.9,colors,alpha);
          else if(stage.kind==='train')trainGlass(c,age,colors);
          else if(stage.kind==='canal')train(c,-80+age*136,stage.horizon+2,.78,p.palette==='daylight');
          else signal(c,colors,x,y,age,alpha*.73,false);
        }else if(e.kind==='lantern'){
          if(stage.kind==='train'||stage.kind==='ocean'||space||id==='nocturne')motes(c,age*.4,x,y,46,stage.kind==='ocean'?2.5:1.25,colors.glow,alpha);
          else lanterns(c,age,x,y,colors,alpha,stage.kind==='garden');
        }else if(e.kind==='meteor'){
          if(space||stage.kind==='ocean'||stage.kind==='avenue'||stage.kind==='garden')signal(c,colors,x,y,age,alpha,true);
          else{
            const sx=x+(age-1.8)*104,sy=y+(age-1.8)*28;
            c.globalAlpha=alpha;line(c,colors.glow,sx-38,sy-9,sx,sy,1.4);glow(c,colors.glow,sx,sy,12,9,.8);c.globalAlpha=1;
          }
        }else if(e.kind==='water'){
          if(stage.kind==='moon'||stage.kind==='orbit'){
            motes(c,age*.53,x+age*7,y,34,2.0,stage.kind==='moon'?'#d7c5a8':colors.cyan,alpha*.8);
            continue;
          }
          if(stage.kind==='ocean'){
            for(let i=0;i<23;i++){
              const [,,a,b]=seed[140+i],phase=mod(age*.38+b,1);
              const bx=x+(a-.5)*(9+phase*58)+Math.sin(age*2.9+i)*5,by=y-phase*(103+a*94);
              const size=1+a*4+phase*1.2;
              c.globalAlpha=alpha*(1-phase)*(.42+a*.5);
              oval(c,colors.cyan,bx,by,size,size*.91,false);
              rect(c,colors.rain,bx-size*.55,by-size*.66,1,1);
            }
            c.globalAlpha=1;
            continue;
          }
          for(let i=0;i<4;i++){
            const width=5+age*23-i*11;if(width<=0)continue;
            c.globalAlpha=alpha*(.49-i*.086);
            oval(c,colors.cyan,x,y,width,width*(space?.11:stage.kind==='ocean'?.52:.19),false);
          }
          c.globalAlpha=1;
        }else if(e.kind==='cat'){
          if(stage.kind==='ocean')continue;
          else if(space)worker(c,x-35+age*10,y+Math.sin(age*.7)*4,age,stage.kind==='orbit',colors,alpha);
          else if(stage.kind==='garden'){
            for(let i=0;i<3;i++){
              c.globalAlpha=alpha*.64;
              const px=x+Math.sin(age*.9+i*2)*38,py=y+Math.cos(age*.6+i)*9;
              oval(c,i===1?'#e5bb81':'#e19479',px,py,6,2,true);
              line(c,colors.rain,px-5,py,px-10,py+Math.sin(age*8+i)*4);
            }
            c.globalAlpha=1;
          }else{
            const cat=vehicleSprite(13,p.palette);
            if(!cat)continue;
            const px=x-27+age*7,step=Math.abs(Math.sin(age*5.6)),w=35,h=26;
            glow(c,colors.shadow,px+2,y-1,15,4,alpha*.64);
            c.globalAlpha=alpha*.94;
            c.drawImage(cat.tile,Math.round(px-w/2),Math.round(y-h-step),w,h);
            c.globalAlpha=1;
          }
        }
      }
    }
    function offset(p,pan){
      const drift=!water&&p.parallax&&!p.reduced;
      return {drift,x:drift?Math.round(pan.x):0,y:drift?Math.round(pan.y):0};
    }
    function musicReaction(p,m){
      if(p.reduced||!p.musicStrength||m.mode==='off')return null;
      const gain=p.musicStrength*.029,level=m.level*.45;
      const bass=clamp((m.bass*.92+level)*gain);
      const mid=clamp((m.mid*.96+level*.85)*gain);
      const high=clamp((m.high*1.16+level*.33)*gain);
      return Math.max(bass,mid,high)<.006?null:{bass,mid,high};
    }
    function draw(c,t,p,m,pan){
      if(!plate)return false;
      bake(p.palette);
      const dt=lastTime===null?0:clamp(t-lastTime,0,.12);
      lastTime=t;elapsed+=dt*p.worldActivity/100;
      trafficSpeed+=((living?.on('rush')===false?0:1)-trafficSpeed)*Math.min(1,dt*2.5);
      trafficTime+=dt*p.worldActivity*trafficSpeed/100;
      curtainAmount+=((curtains?1:0)-curtainAmount)*(p.reduced||dt===0?1:Math.min(1,dt*4));
      const colors=atmospheres[p.palette]||atmospheres.nocturne;
      const reaction=musicReaction(p,m);
      c.save();c.globalAlpha=1;c.imageSmoothingEnabled=false;
      const {drift,x,y}=offset(p,pan);
      if(drift)c.translate(x,y);
      c.drawImage(photo,drift?-4:0,drift?-2:0,drift?W+8:W,drift?H+4:H);
      if(stage.kind!=='train')sky?.draw(c,photo,elapsed,p,colors,living?.on('aurora'));
      if(water){
        ripples=ripples.filter(e=>t-e.start<3.8);
        water.draw(c,photo,elapsed,t,p,colors,ripples,reaction);
      }
      if(stage.kind!=='train'&&p.worldFeature)environment?.draw(c,photo,elapsed,p,isActive,lit);
      living?.draw(c,photo,t,p,colors);
      if(stage.kind==='train'&&sky){
        c.save();c.globalAlpha=living?.on('lamp-shade') ? .72 : 1;
        sky.draw(c,photo,elapsed,p,colors,false);
        c.restore();
      }
      if(stage.kind==='train'&&p.worldFeature)environment?.draw(c,photo,elapsed,p,isActive,lit);
      ambient(c,t,p,colors,pan);
      if(reaction)environment?.react?.(c,reaction,colors);
      effects(c,t,p,colors);
      weather(c,elapsed,p,colors,stage.kind==='moon'||stage.kind==='orbit');
      drawCurtains(c,p);
      c.restore();
      return true;
    }
    function hotspots(labels){
      return stage?stage.points.map(([x,y],i)=>({x:x-33,y:y-29,w:66,h:58,action:names[i],label:labels[i]||names[i]})).concat(living?.spots||[]):[];
    }
    function effect(kind,t,point){
      if(kind==='cat'&&stage?.kind==='ocean'&&living){living.callWhale(t);return;}
      if(kind==='train'&&stage?.kind==='ocean'&&living){living.trigger('sub-flight',t);return;}
      if(kind==='light'){lit=!lit;return;}
      if(kind==='water'&&stage?.kind==='train'){curtains=!curtains;return;}
      if(kind==='water'&&water?.ripple){
        const target=point&&water.has(point.x,point.y)?point:{x:stage.points[5][0],y:stage.points[5][1]};
        ripples.push({point:[target.x,target.y],start:t});
        if(ripples.length>7)ripples.shift();
        return;
      }
      const i=names.indexOf(kind);
      if(i<0||!stage)return;
      const target=kind==='water'&&point?[point.x,point.y]:stage.points[i];
      const duration={train:9,lantern:10,cat:8,meteor:5,water:4}[kind];
      events=events.filter(e=>e.kind!==kind||kind==='water');
      events.push({kind,start:t,point:target,duration});
      if(events.length>12)events.shift();
    }
    function seek(t){elapsed=t;trafficTime=t;lastTime=t;living?.seek(t);}
    return {select,draw,hotspots,effect,seek,offset,hasWaterSurface:()=>Boolean(water?.ripple),isWater:(x,y)=>Boolean(water?.ripple&&water.has(x,y)),extraEffect:(kind,t,point)=>living?.trigger(kind,t,point),extraState:key=>living?.state(key),ready:()=>Boolean(plate),status:()=>loadStatus};
  }
  window.AfterlightCinema={create};
})();

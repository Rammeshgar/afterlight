'use strict';
(() => {
  const A=window.Afterlight,$=id=>document.getElementById(id);
  const panel=$('settings'),open=$('open-settings'),close=$('close-settings');
  const worlds=A.worlds(),actionKeys=['train','lantern','cat','meteor','light','water'];
  const explorer=$('explorer');
  const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const collectionOf=world=>world.group==='seneschal'?'seneschal':'afterlight';
  const groups=[{id:'afterlight',name:'The original Afterlight',note:'Warm windows. Quiet water. Somewhere to linger.'},{id:'seneschal',name:'From the Seneschal collection',note:'City lights, lunar horizons and a foundry among the stars.'}];
  let collectionFilter='all',lastWorld='';
  const actionDetails={
    city:['A lit train crosses the elevated line.','A paper lantern rises from the rooftop.','The rooftop cat looks up.','A brief streak crosses the night sky.','Toggle the warm studio windows.','Send expanding rings across the canal.'],
    observatory:['The brass telescope turns to a new patch of sky.','A flight of fireflies rises by the boardwalk.','The fox wakes beside the observatory.','A falling star crosses the northern sky.','Toggle the warm observatory windows.','Send rings across the glacial lake.'],
    sleeper:['A lit village glides past your window.','Fresh tea steams on the table.','Your sleepy travelling companion wakes.','A shooting star passes outside.','Toggle the soft reading lamp.','Draw or open the window curtains.'],
    pelagic:['A submersible departs the station dock.','A jellyfish bloom drifts through the blue.','A whale visits the research window.','A sonar pulse spreads through the water.','Toggle the station work lights.','A column of bubbles rises from the seabed.'],
    sanctuary:['The mountain bell ribbon catches the air.','Floating lanterns leave the pavilion.','The koi gather beneath the water.','The hillside path lights up.','Toggle the cedar pavilion lights.','Rings spread across the reflecting pool.']
  };
  const actionDescription=(world,index)=>world.actionDescriptions?.[index]||actionDetails[world.id]?.[index]||'Watch this scene respond. Replay whenever you like.';
  function filterCollection(value,announce=false){
    collectionFilter=['afterlight','seneschal'].includes(value)?value:'all';
    groups.forEach(group=>{$('collection-'+group.id).hidden=collectionFilter!=='all'&&collectionFilter!==group.id;});
    document.querySelectorAll('[data-collection]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.collection===collectionFilter)));
    const count=worlds.filter(world=>collectionFilter==='all'||collectionOf(world)===collectionFilter).length;
    if(announce)$('collection-filter-status').textContent=count+' '+(count===1?'world':'worlds')+' shown · '+(collectionFilter==='all'?'the complete collection':collectionFilter==='seneschal'?'Seneschal':'Afterlight originals');
  }
  function renderCollection(){
    $('world-groups').innerHTML=groups.map(group=>{
      const entries=worlds.filter(world=>collectionOf(world)===group.id);
      return '<section class="world-collection" id="collection-'+group.id+'" aria-labelledby="heading-'+group.id+'"><header class="world-group-heading"><div><span class="eyebrow">'+(group.id==='seneschal'?'NEW HORIZONS':'THE ORIGINAL COLLECTION')+'</span><h4 id="heading-'+group.id+'">'+group.name+'</h4><p>'+group.note+'</p></div><span class="group-count">'+String(entries.length).padStart(2,'0')+'</span></header><div class="world-grid">'+entries.map(world=>'<button class="world-card" data-scene="'+escape(world.id)+'" aria-pressed="false" aria-label="Choose '+escape(world.name)+'"><span class="world-image"><img src="thumb-'+encodeURIComponent(world.id)+'.png" alt="" width="320" height="180" loading="lazy" decoding="async"><span class="world-number">'+escape(world.tag.split(' / ')[0])+'</span><span class="world-check" aria-hidden="true">✓</span></span><span class="world-card-copy"><strong>'+escape(world.name)+'</strong><small>'+escape(world.tag.split(' / ').slice(1).join(' / '))+'</small><span>'+escape(world.description)+'</span><span class="world-card-moments">6 interactive moments <span aria-hidden="true">↗</span></span></span></button>').join('')+'</div></section>';
    }).join('');
    $('collection-count').textContent=String(worlds.length).padStart(2,'0');$('world-total').textContent=worlds.length;$('action-total').textContent=worlds.reduce((total,world)=>total+world.actions.length,0);
    $('collection-eyebrow').textContent=worlds.length+' WORLDS. COUNTLESS LITTLE MOMENTS.';
    $('rotation-collection-help').textContent='Cycle through all '+worlds.length+' worlds with their saved appearance.';
    $('filter-all-count').textContent=worlds.length;
    groups.forEach(group=>{$('filter-'+group.id+'-count').textContent=worlds.filter(world=>collectionOf(world)===group.id).length;});
    document.querySelectorAll('[data-collection]').forEach(button=>button.addEventListener('click',()=>filterCollection(button.dataset.collection,true)));
    filterCollection('all');
  }
  renderCollection();
  let idleTimer,toastTimer,returnFocus=null,audio=null,soundOn=false,hostPaused=false,musicEnabled=false,musicDemo=false;
  let musicState='off',musicStarted=0,lastMusicFrame=-Infinity,lastMusicSignal=-Infinity;
  const native=!!window.chrome?.webview;
  const bridge=message=>{if(native)window.chrome.webview.postMessage(message);};
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3400);}
  function wake(){document.body.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(explorer.hidden&&!document.body.classList.contains('panel-open')&&!$('toolbar').contains(document.activeElement))document.body.classList.add('idle');},6500);}
  function setExplorer(value,focus=true){explorer.hidden=!value;A.rotationHold(value||!panel.hidden);document.body.classList.toggle('exploring',value);$('open-explore').setAttribute('aria-expanded',String(value));if(value){wake();$('show-hotspots').checked=true;A.showHotspots(true);if(focus)$('close-explore').focus();}else{A.showHotspots(false);$('show-hotspots').checked=false;if(focus)$('open-explore').focus();}}
  $('open-explore').addEventListener('click',()=>setExplorer(explorer.hidden));$('close-explore').addEventListener('click',()=>setExplorer(false));
  $('show-hotspots').addEventListener('change',()=>A.showHotspots($('show-hotspots').checked));
  const extras=()=>A.extraActions?.()||[];
  function refreshExtraStates(){
    extras().forEach(([key],i)=>{
      const button=$('explore-extra-'+i),state=A.extraState?.(key);
      if(typeof state==='boolean')button.setAttribute('aria-pressed',String(state));
      else button.removeAttribute('aria-pressed');
    });
  }
  function syncExtraActions(){
    const actions=extras(),extraGroup=$('explore-extra');
    if(!extraGroup)return;
    extraGroup.hidden=!actions.length;
    actions.forEach(([key,label,detail],i)=>{
      const button=$('explore-extra-'+i);
      button.querySelector('span').textContent=label;
      button.title=detail;
    });
    refreshExtraStates();
  }
  function playAction(key){
    if(!key)return;
    if(!panel.hidden)setPanel(false);
    if(!explorer.hidden&&window.innerWidth<620)setExplorer(false);
    A.effect(key);
    const world=A.currentWorld(),index=actionKeys.indexOf(key),extra=extras().find(row=>row[0]===key);
    const paused=A.paused()||A.prefs().reduced,state=A.extraState?.(key);
    $('explore-status').textContent=paused&&typeof state!=='boolean'?'Resume animation to see this action in motion.':
      extra?(typeof state==='boolean'?extra[1]+' · '+(state?'On':'Off'):extra[2]):
      world.actions[index]+'. '+actionDescription(world,index);
  }
  for(const key of actionKeys)$('explore-'+key).addEventListener('click',()=>playAction(key));
  for(let i=0;i<3;i++)$('explore-extra-'+i)?.addEventListener('click',()=>playAction(extras()[i]?.[0]));
  function setPanel(value,restoreFocus=true){
    if(value){setExplorer(false,false);returnFocus=document.activeElement;panel.hidden=false;$('scrim').hidden=false;open.setAttribute('aria-expanded','true');document.body.classList.add('panel-open');$('world').inert=true;close.focus();}
    else{panel.hidden=true;$('scrim').hidden=true;open.setAttribute('aria-expanded','false');document.body.classList.remove('panel-open');$('world').inert=false;if(restoreFocus&&returnFocus?.isConnected)returnFocus.focus();wake();}
    A.rotationHold(value||!explorer.hidden);updateRotation();
  }
  open.addEventListener('click',()=>setPanel(true));close.addEventListener('click',()=>setPanel(false));$('scrim').addEventListener('click',()=>setPanel(false));
  function showView(name,focus=false){
    const gallery=name==='worlds';$('worlds-gallery').hidden=!gallery;$('customize-panel').hidden=gallery;
    $('view-worlds').setAttribute('aria-pressed',String(gallery));$('view-customize').setAttribute('aria-pressed',String(!gallery));
    $('panel-scroll').scrollTop=0;if(focus)$(gallery?'view-worlds':'view-customize').focus();
  }
  $('view-worlds').addEventListener('click',()=>showView('worlds'));
  $('view-customize').addEventListener('click',()=>showView('customize'));
  $('customize-selected').addEventListener('click',()=>showView('customize',true));
  function updateRotation(){
    const s=A.rotationState(),mins=Math.floor(s.remaining/60),secs=s.remaining%60;
    const message={off:'Rotation is off.',editing:'Rotation waits while you customize or explore.',paused:'Rotation paused with animation.',stillness:'Rotation paused in Stillness mode.',hidden:'Rotation waits while the wallpaper is hidden.'}[s.reason]||'Next: '+s.next+' · '+mins+'m '+String(secs).padStart(2,'0')+'s';
    if($('rotation-status').textContent!==message)$('rotation-status').textContent=message;
    $('rotation-summary').textContent=s.enabled?'Every '+A.prefs().rotationMinutes+' min':'Off';
  }
  $('rotate').addEventListener('change',()=>A.set({rotate:$('rotate').checked}));
  $('rotationShuffle').addEventListener('change',()=>A.set({rotationShuffle:$('rotationShuffle').checked}));
  $('rotationMinutes').addEventListener('change',()=>A.set({rotationMinutes:Number($('rotationMinutes').value)}));
  $('rotation-next').addEventListener('click',()=>A.nextScene());
  document.querySelectorAll('button.world-card[data-scene]').forEach(el=>el.addEventListener('click',()=>A.selectScene(el.dataset.scene)));
  function sync(){
    const p=A.prefs(),world=A.currentWorld();
    const daylight=A.lighting?.()==='day';
    document.body.classList.toggle('daylight',daylight);
    document.body.classList.toggle('classic-artwork',p.artwork==='classic');
    $('lighting-mode').value=p.lighting||'night';
    syncExtraActions();
    $('lighting-toggle').setAttribute('aria-pressed',String(daylight));
    $('lighting-icon-label').textContent=daylight?'Day':'Night';
    $('night-palette-note').hidden=!daylight;
    $('night-palettes').hidden=daylight;
    $('night-cycle').hidden=daylight;
    $('rotate').checked=p.rotate;$('rotationShuffle').checked=p.rotationShuffle;$('rotationMinutes').value=p.rotationMinutes;updateRotation();
    document.querySelectorAll('button.world-card[data-scene]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.scene===p.scene)));
    $('active-world-thumb').src='thumb-'+p.scene+'.png';$('active-world-tag').textContent=world.tag;
    $('active-world-name').textContent=world.name;$('active-world-description').textContent=world.description;
    const selection='Current world: '+world.name+' · changes save automatically';if($('world-selection-status').textContent!==selection)$('world-selection-status').textContent=selection;
    $('customize-selected').textContent='Customize '+world.name+' ↗';
    $('desktop-selection').textContent=world.name;
    $('scene-hint').textContent=world.hint;$('scene').setAttribute('aria-label',world.name+'. '+world.description+' Use settings for keyboard-accessible scene actions.');
    $('world-detail').hidden=p.scene==='city';$('world-activity-label').textContent=world.activity;$('world-glow-label').textContent=world.glow;$('world-feature-label').textContent=world.feature;
    $('life-heading').textContent=p.scene==='city'?'03 / A CITY WITH A PULSE':'03 / LITTLE MOMENTS';
    actionKeys.forEach((key,i)=>{$(key).innerHTML='<kbd aria-hidden="true">'+(i+1)+'</kbd><span><strong>'+escape(world.actions[i])+'</strong><small>'+escape(actionDescription(world,i))+'</small></span>';$(key).setAttribute('aria-keyshortcuts',String(i+1));$('explore-'+key).querySelector('span').textContent=world.actions[i];$('explore-'+key).title=actionDescription(world,i);});
    $('explorer-title').textContent='Explore '+world.name;
    $('explore-detail').textContent=world.hint;
    if(lastWorld!==world.id){clearTimeout(toastTimer);$('toast').classList.remove('show');$('explore-status').textContent='Click a highlighted object, choose an action, or press 1–9.';lastWorld=world.id;}
    document.body.dataset.world=world.id;document.body.dataset.collection=collectionOf(world);
    $('windows').closest('label').hidden=p.scene!=='city';
    const weatherNames=world.weatherNames||(p.scene==='pelagic'?{clear:'Still',rain:'Current',snow:'Marine snow',mist:'Haze'}:{clear:'Clear',rain:'Rain',snow:'Snow',mist:'Mist'});
    $('weather-heading').textContent=world.weatherHeading?'02 / '+world.weatherHeading.replace(/^02\s*\/\s*/,'').toUpperCase():(p.scene==='pelagic'?'02 / THE WATER AROUND YOU':p.scene==='sleeper'?'02 / OUTSIDE THE WINDOW':'02 / WHAT THE SKY IS DOING');
    document.querySelectorAll('[data-weather]').forEach(el=>el.textContent=weatherNames[el.dataset.weather]);
    document.querySelectorAll('[data-palette]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.palette===p.palette)));
    document.querySelectorAll('[data-weather]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.weather===p.weather)));
    for(const id of ['intensity','volume','quality','musicSensitivity','musicStrength','worldActivity','worldGlow'])$(id).value=p[id];
    for(const id of ['daycycle','windows','parallax','reduced','musicSpectrum','worldFeature'])$(id).checked=p[id];
    $('caption-toggle').checked=p.caption;document.body.classList.toggle('hide-caption',!p.caption);
    $('intensity-value').textContent=p.intensity+'%';$('volume-value').textContent=p.volume+'%';
    for(const id of ['musicSensitivity','musicStrength','worldActivity','worldGlow'])$(id+'-value').textContent=p[id]+'%';
    $('music-demo').disabled=p.reduced||musicEnabled;
    if(p.reduced&&musicDemo){musicDemo=false;A.musicOff();$('music-demo').setAttribute('aria-pressed','false');$('music-demo').textContent='Preview the reaction · no audio capture';$('music-status').textContent='Stillness mode — reaction paused';}
    else if(!p.reduced&&!musicEnabled&&!musicDemo&&$('music-status').textContent.startsWith('Stillness mode'))$('music-status').textContent=native?'Not listening':'Live music listening needs the Afterlight Windows app.';
    if(native){bridge(p.reduced?'music:still:on':'music:still:off');bridge('scene:'+p.scene);}
    $('mood-label').textContent=world.name.toUpperCase()+' / '+(daylight?'DAYLIGHT':{nocturne:'MIDNIGHT',ember:'LAST LIGHT',sakura:'BLUE REVERIE'}[p.palette]);
    $('sound-panel').textContent=soundOn?'Mute ambience':p.scene==='city'?'Enable rain & distant city ambience':'Enable soft synthetic ambience';
    if(audio)audio.update();
  }
  function toggleLighting(){A.set({lighting:A.lighting?.()==='day'?'night':'day'});}
  $('lighting-toggle').addEventListener('click',toggleLighting);
  $('lighting-mode').addEventListener('change',()=>A.set({lighting:$('lighting-mode').value}));

  document.querySelectorAll('[data-palette]').forEach(el=>el.addEventListener('click',()=>A.set({palette:el.dataset.palette,daycycle:false})));
  document.querySelectorAll('[data-weather]').forEach(el=>el.addEventListener('click',()=>A.set({weather:el.dataset.weather})));
  for(const id of ['intensity','volume','musicSensitivity','musicStrength','worldActivity','worldGlow'])$(id).addEventListener('input',()=>A.set({[id]:Number($(id).value)}));
  $('quality').addEventListener('change',()=>A.set({quality:Number($('quality').value)}));
  for(const id of ['daycycle','windows','parallax','reduced','musicSpectrum','worldFeature'])$(id).addEventListener('change',()=>A.set({[id]:$(id).checked}));
  $('caption-toggle').addEventListener('change',()=>A.set({caption:$('caption-toggle').checked}));
  for(const id of actionKeys)$(id).addEventListener('click',()=>playAction(id));
  window.addEventListener('afterlight-preferences',sync);
  const notices={train:'The 09:17 to nowhere in particular.',lantern:'A small light, on its own way.',cat:'You have been acknowledged. Probably.',meteor:'Keep that one to yourself.',studio:'Someone is still up.'};
  const worldNotices={observatory:['The telescope is tracking a new patch of sky.','A few more lights in the clearing.','The fox noticed.','One falling star, just for a moment.'],sleeper:['A village is passing outside.','Another warm cup.','A very brief awakening.','Look through the window.'],pelagic:['The submersible is leaving its dock.','A jellyfish bloom is drifting through.','A visitor from the open water.','The sonar pulse is spreading.'],sanctuary:['The bell ribbon catches the air.','The lanterns are on their way.','The koi come closer.','The hillside path is lit.']};
  window.addEventListener('afterlight-effect',e=>{const extra=extras().find(row=>row[0]===e.detail);if(extra){refreshExtraStates();const state=A.extraState?.(e.detail);toast(typeof state==='boolean'?extra[1]+' · '+(state?'On':'Off'):extra[2]);return;}const p=A.prefs(),index=actionKeys.indexOf(e.detail),fallback=A.currentWorld().actions[index]||'A small moment.';toast((p.scene==='city'?notices[e.detail]:worldNotices[p.scene]?.[index])||fallback);if(e.detail==='cat'&&soundOn)audio?.chime();if(e.detail==='train'&&soundOn&&p.scene==='city')audio?.train();});
  window.addEventListener('afterlight-hover',e=>{const hint=$('scene-hint');hint.textContent=e.detail?'Click · '+e.detail:A.currentWorld().hint;hint.classList.toggle('visible',Boolean(e.detail));});
  function pause(){A.pause(!A.paused());}
  $('pause').addEventListener('click',pause);
  window.addEventListener('afterlight-pause',e=>{
    const p=e.detail;$('pause').setAttribute('aria-pressed',String(p));$('pause').setAttribute('aria-label',p?'Resume animation':'Pause animation');
    bridge(p?'paused':'resumed');
    $('pause').innerHTML=p?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';audio?.update();toast(p?'A moment of stillness.':'The world is moving again.');
  });
  class Ambience{
    constructor(){
      const C=window.AudioContext||window.webkitAudioContext;
      this.c=new C();this.master=this.c.createGain();this.master.gain.value=0;this.master.connect(this.c.destination);
      const buffer=this.c.createBuffer(1,this.c.sampleRate*3,this.c.sampleRate),data=buffer.getChannelData(0);
      let brown=0;for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.035-.0175)/1.012;data[i]=brown*4.5;}
      const noise=this.c.createBufferSource();noise.buffer=buffer;noise.loop=true;
      const filter=this.c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1800;filter.Q.value=.18;
      this.rain=this.c.createGain();this.rain.gain.value=.25;noise.connect(filter);filter.connect(this.rain);this.rain.connect(this.master);noise.start();
      this.tones=[];[55,82.41,110].forEach((frequency,i)=>{
        const o=this.c.createOscillator(),g=this.c.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=[.013,.006,.003][i];o.connect(g);g.connect(this.master);o.start();this.tones.push(o);
      });
    }
    update(){
      const p=A.prefs(),muted=!soundOn||A.paused()||p.reduced||document.hidden||hostPaused;
      clearTimeout(this.suspendTimer);
      this.master.gain.setTargetAtTime(muted?0:p.volume/100*.42,this.c.currentTime,.12);
      this.rain.gain.setTargetAtTime(p.weather==='rain'?.35:p.weather==='mist'?.12:.04,this.c.currentTime,.5);
      if(muted)this.suspendTimer=setTimeout(()=>{if(!soundOn||A.paused()||A.prefs().reduced||document.hidden||hostPaused)this.c.suspend().catch(()=>{});},500);
      else if(this.c.state==='suspended')this.c.resume().catch(()=>{});
    }
    dispose(){clearTimeout(this.suspendTimer);this.c.close().catch(()=>{});}
    chime(){const t=this.c.currentTime;[1046.5,1567.98].forEach((freq,i)=>{let o=this.c.createOscillator(),g=this.c.createGain();o.type='sine';o.frequency.value=freq;o.connect(g);g.connect(this.master);g.gain.setValueAtTime(0,t+i*.09);g.gain.linearRampToValueAtTime(.06,t+.015+i*.09);g.gain.exponentialRampToValueAtTime(.0001,t+1.7+i*.09);o.start(t+i*.09);o.stop(t+2);});}
    train(){const t=this.c.currentTime;[146.83,220].forEach(f=>{let o=this.c.createOscillator(),g=this.c.createGain(),filter=this.c.createBiquadFilter();o.type='sine';o.frequency.value=f;filter.type='lowpass';filter.frequency.value=400;o.connect(filter);filter.connect(g);g.connect(this.master);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+2);g.gain.exponentialRampToValueAtTime(.0001,t+7);o.start();o.stop(t+8);});}
  }
  async function toggleSound(){
    try{
      if(!audio)audio=new Ambience();await audio.c.resume();soundOn=!soundOn;audio.update();
      $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Mute ambient sound':'Enable ambient sound');$('sound-panel').textContent=soundOn?'Mute ambience':A.prefs().scene==='city'?'Enable rain & distant city ambience':'Enable soft synthetic ambience';
      $('sound').innerHTML=soundOn?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-6 5H2v4h3l6 5V5ZM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-6 5H2v4h3l6 5V5ZM16 9l5 6m0-6-5 6"/></svg>';
      toast(soundOn?'A little rain, a little distance.':'Back to quiet.');
    }catch{toast('Sound is unavailable in this viewer. The city still works.');}
  }
  $('sound').addEventListener('click',toggleSound);$('sound-panel').addEventListener('click',toggleSound);
  document.addEventListener('visibilitychange',()=>audio?.update());
  window.addEventListener('pagehide',()=>audio?.dispose());
  window.addEventListener('afterlight-host-pause',e=>{hostPaused=e.detail;audio?.update();});
  $('music-reactive').disabled=!native;
  if(!native)$('music-status').textContent='Live music listening needs the Afterlight Windows app. Visual preview is available below.';
  function musicMeter(level){
    // A logarithmic-ish display makes quiet real input readable; the percentage
    // is still the raw, bounded input value, not the renderer's boosted energy.
    $('music-level').style.transform='scaleX('+Math.sqrt(level)+')';
    $('music-input-value').textContent=(level>.001?Math.max(1,Math.round(level*100)):0)+'%';
    $('music-status').dataset.level=String(level);
  }
  function signalText(mode,message){
    const el=$('music-signal');
    if(el.dataset.mode!==mode){el.dataset.mode=mode;el.textContent=message;}
  }
  function checkMusicSignal(){
    const now=performance.now();
    if(musicDemo){signalText('demo','SIMULATED PREVIEW — not listening to your PC.');return;}
    if(!musicEnabled){signalText('off',native?'Audio input is off.':'Real PC audio needs the Windows app; browser preview is simulated.');return;}
    if(musicState!=='listening'){signalText(musicState,musicState==='paused'?'Listening is paused with the scene.':'Playback input is unavailable.');return;}
    if(now-lastMusicFrame>1500){
      musicMeter(0);
      signalText(now-musicStarted<1500?'starting':'stale',now-musicStarted<1500?'Waiting for playback input…':'Audio updates stopped. Use Reconnect playback device.');return;
    }
    if(now-lastMusicSignal<1000)signalText('signal','Playback detected. The scene is reacting to this output.');
    else signalText('quiet','No playback signal. Play audio on the device shown above, or reconnect.');
  }
  setInterval(()=>{checkMusicSignal();A.rotationPulse();updateRotation();},500);
  $('music-reactive').addEventListener('change',()=>{bridge($('music-reactive').checked?'music:on':'music:off');});
  $('music-reconnect').addEventListener('click',()=>{if(native&&musicEnabled)bridge('music:on');});
  $('music-demo').addEventListener('click',()=>{
    musicDemo=!musicDemo;A.musicDemo(musicDemo);$('music-demo').setAttribute('aria-pressed',String(musicDemo));$('music-demo').textContent=musicDemo?'Stop visual preview':'Preview the reaction · no audio capture';
    $('music-status').textContent=musicDemo?'Visual preview — simulated levels, no audio capture':native?'Not listening':'Live music listening needs the Afterlight Windows app.';
    $('music-status').dataset.mode=musicDemo?'demo':'off';
    musicMeter(0);checkMusicSignal();
  });
  if(native)window.chrome.webview.addEventListener('message',event=>{
    const m=event.data;
    if(m?.type==='music-frame'&&musicEnabled&&musicState==='listening'){
      A.musicFrame(m);const level=Math.max(0,Math.min(1,Number(m.level)||0));
      lastMusicFrame=performance.now();if(level>.001)lastMusicSignal=lastMusicFrame;
      musicMeter(level);return;
    }
    if(m?.type!=='music-status')return;
    musicState=m.status;musicStarted=performance.now();lastMusicFrame=lastMusicSignal=-Infinity;
    musicEnabled=Boolean(m.enabled);$('music-reactive').checked=musicEnabled;$('music-demo').disabled=musicEnabled||A.prefs().reduced;
    $('music-reconnect').disabled=!musicEnabled;
    if(musicEnabled){musicDemo=false;$('music-demo').setAttribute('aria-pressed','false');$('music-demo').textContent='Preview the reaction · no audio capture';if(soundOn)toggleSound();}
    if(m.status!=='listening'&&!musicDemo){A.musicOff();musicMeter(0);}
    $('music-status').dataset.mode=m.status;
    $('music-status').textContent=m.status==='listening'?'Listening locally · '+m.detail:m.detail||'Not listening';
    checkMusicSignal();
  });
  async function fullscreen(){try{if(native){bridge('fullscreen');return;}if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{toast('Use F11 for full screen in this viewer.');}}
  $('fullscreen').addEventListener('click',fullscreen);
  $('export').addEventListener('click',()=>{
    const p=A.prefs(),palette=A.lighting?.()==='day'?'daylight':p.palette;
    const c=A.png();c.toBlob(blob=>{if(!blob){toast('Could not create the still image.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Afterlight-'+p.scene+'-'+palette+'-4K.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Saving your 3840 × 2160 pixel-art still.');},'image/png');
  });
  $('reset').addEventListener('click',()=>{A.resetScene();toast('This world’s appearance is reset. Shared comfort and audio settings are unchanged.');});
  $('desktop').hidden=!native;
  $('desktop').addEventListener('click',()=>{setPanel(false,false);bridge('desktop');toast('Wallpaper mode requested. Use the Afterlight tray icon to return.');});
  $('desktop-dock').hidden=!native;
  $('desktop-quick').addEventListener('click',()=>{setPanel(false,false);bridge('desktop');});
  if(native)$('desktop-note').textContent='Your tray icon stays available. Double-click it to return; choose Quit to stop the wallpaper. Nothing is added to startup.';
  window.AfterlightUI={closeSettings:()=>setPanel(false,false),openCollection:()=>{showView('worlds');setPanel(true);},enterDesktop:()=>{setExplorer(false,false);setPanel(false,false);document.body.classList.add('desktop-mode','idle');},leaveDesktop:()=>document.body.classList.remove('desktop-mode','idle')};
  document.addEventListener('keydown',e=>{
    if(!panel.hidden&&e.key==='Tab'){
      const controls=[...panel.querySelectorAll('button,input,select,summary,a[href]')].filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length);
      const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;
    }
    if(e.key==='Escape'){if(!panel.hidden)setPanel(false);else if(!explorer.hidden)setExplorer(false);else if(native)bridge('exit-fullscreen');return;}
    if(e.key==='F11'&&native){e.preventDefault();bridge('fullscreen');return;}
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.altKey||e.metaKey)return;
    const key=e.key.toLowerCase();if(key==='s'){e.preventDefault();setPanel(panel.hidden);}
    else if(key==='e'&&panel.hidden){e.preventDefault();setExplorer(explorer.hidden);}
    else if(/^[1-9]$/.test(key)&&panel.hidden){const actions=actionKeys.concat(extras().map(row=>row[0]));const action=actions[Number(key)-1];if(action){e.preventDefault();playAction(action);}}
    else if(key===' '&&panel.hidden&&!/BUTTON|A|SUMMARY/.test(e.target.tagName)){e.preventDefault();pause();}
    else if(key==='f')fullscreen();
    else if(key==='m')toggleSound();
    else if(key==='d'){e.preventDefault();toggleLighting();}
    else if(key==='w'){const i=worlds.findIndex(w=>w.id===A.prefs().scene);A.selectScene(worlds[(i+1)%worlds.length].id);}
    else if(key==='r'){const w=['clear','rain','snow','mist'];A.set({weather:w[(w.indexOf(A.prefs().weather)+1)%w.length]});}
    else if(key==='t')playAction('train');
    else if(key==='l')playAction('lantern');
    else if(key==='n'){const p=['nocturne','ember','sakura'];A.set({palette:p[(p.indexOf(A.prefs().palette)+1)%p.length],daycycle:false});}
    else if(key==='h'){document.body.classList.toggle('hide-chrome');document.body.classList.remove('idle');}
    wake();
  });
  for(const event of ['pointermove','pointerdown','focusin'])document.addEventListener(event,wake,{passive:true});
  function clock(){$('local-time').textContent=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}clock();setInterval(clock,30000);
  sync();wake();checkMusicSignal();
  // Guide a fresh native installation once. Reloads/recovery and returning users
  // never reopen the panel automatically, or re-enable audio.
  if(native){try{if(window.localStorage&&!localStorage.getItem('afterlight.welcome.v1')){localStorage.setItem('afterlight.welcome.v1','1');showView('worlds');setPanel(true);}}catch{}}
  $('intro').classList.add('visible');setTimeout(()=>$('intro').classList.remove('visible'),6500);setTimeout(()=>$('scene-hint').classList.add('visible'),7500);setTimeout(()=>$('scene-hint').classList.remove('visible'),13500);
  if(native)bridge('ready');
})();

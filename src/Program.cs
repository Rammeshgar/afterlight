using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
[assembly:System.Reflection.AssemblyVersion("1.8.0.0")]
[assembly:System.Reflection.AssemblyFileVersion("1.8.0.0")]
[assembly:System.Reflection.AssemblyProduct(Afterlight.Program.ProductName)]
[assembly:System.Reflection.AssemblyCompany("Sadeq Rezai")]
[assembly:System.Reflection.AssemblyDescription("Offline interactive pixel-art wallpapers for Windows")]

namespace Afterlight {
    static class Program {
        internal static readonly string Root=AppDomain.CurrentDomain.BaseDirectory;
        internal const string ClassicMutex=@"Local\Sadeq.Afterlight.v1";
#if AFTERLIGHT_CINEMA
        internal const string ProductName="Afterlight Cinema",ProcessName="AfterlightCinema",WindowTitle=ProductName;
        internal const string InstanceMutex=@"Local\Sadeq.AfterlightCinema.v1",Origin="https://cinema.afterlight.local";
        internal static readonly string[] CinemaWorlds={"city","observatory","sleeper","pelagic","sanctuary","citylight","nocturne","lunar","foundry"};
#else
        internal const string ProductName="Afterlight",ProcessName="Afterlight",WindowTitle="Afterlight 1.8 · nine quiet worlds";
        internal const string InstanceMutex=ClassicMutex,Origin="https://afterlight.local";
#endif
        internal static readonly string Data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Sadeq"+ProcessName);
        internal static void Log(string message){try{Directory.CreateDirectory(Data);string path=Path.Combine(Data,"host-events.log");if(File.Exists(path)&&new FileInfo(path).Length>100000){File.Copy(path,path+".previous",true);File.WriteAllText(path,"");}File.AppendAllText(path,DateTime.UtcNow.ToString("o")+" "+message+Environment.NewLine);}catch(IOException){}catch(UnauthorizedAccessException){}}
        [STAThread] static void Main(string[] args) {
            if(Array.IndexOf(args,"--check")>=0){Environment.ExitCode=CheckAssets()?0:1;return;}
            bool startWallpaper=Array.IndexOf(args,"--wallpaper")>=0;
            string startupLighting=null;
            foreach(string arg in args){
                if(!arg.StartsWith("--lighting=",StringComparison.Ordinal))continue;
                string value=arg.Substring("--lighting=".Length);
                if(!startWallpaper||startupLighting!=null||(value!="day"&&value!="night"&&value!="system")){
                    Environment.ExitCode=2;
                    return;
                }
                startupLighting=value;
            }
            bool owner;
            using(var mutex=new Mutex(true,InstanceMutex,out owner))
            using(var wake=new EventWaitHandle(false,EventResetMode.AutoReset,@"Local\Sadeq."+ProcessName+".Open.v1")) {
                if(!owner){
                    if(startWallpaper){Environment.ExitCode=4;return;}
                    bool sameBuild=false;
                    foreach(var p in Process.GetProcessesByName(ProcessName)){try{if(p.Id!=Process.GetCurrentProcess().Id&&String.Equals(p.MainModule.FileName,Path.Combine(Root,ProcessName+".exe"),StringComparison.OrdinalIgnoreCase))sameBuild=true;}catch{}finally{p.Dispose();}}
                    if(sameBuild)wake.Set();else MessageBox.Show("An older/different Afterlight build is already running.\n\nChoose Quit from its tray icon, then open this updated build. Your saved Windows wallpaper will not be changed.","Afterlight update",MessageBoxButtons.OK,MessageBoxIcon.Information);
                    return;
                }
                Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
                try {
                    Directory.CreateDirectory(Data);
                    Log("start build=1.8.0 pid="+Process.GetCurrentProcess().Id);
                    if(!CheckAssets())throw new IOException("Some files are missing. Keep Afterlight.exe together with its web folder and Microsoft DLL files.");
                    Application.Run(new CityWindow(wake,Array.IndexOf(args,"--diagnostics")>=0,Array.IndexOf(args,"--verify-desktop")>=0,Array.IndexOf(args,"--verify-audio")>=0,Array.IndexOf(args,"--verify-stability")>=0,Array.IndexOf(args,"--verify-worlds")>=0,Array.IndexOf(args,"--verify-rotation")>=0,startWallpaper,startupLighting));
                }catch(Exception ex){MessageBox.Show("Afterlight could not start.\n\n"+ex.Message+"\n\nThe app uses the Microsoft Edge WebView2 Runtime already included with most Windows PCs.","Afterlight",MessageBoxButtons.OK,MessageBoxIcon.Information);}
                mutex.ReleaseMutex();
            }
        }
        internal static bool CheckAssets(){
            foreach(string file in new[]{"web/index.html","web/style.css","web/music.css","web/collection.css","web/explore.css","web/release.css","web/seneschal-art.js","web/seneschal-worlds.js","web/worlds.js","web/scene.js","web/ui.js","web/icon.svg","web/thumb-city.png","web/thumb-observatory.png","web/thumb-sleeper.png","web/thumb-pelagic.png","web/thumb-sanctuary.png","web/thumb-citylight.png","web/thumb-nocturne.png","web/thumb-lunar.png","web/thumb-foundry.png","Microsoft.Web.WebView2.Core.dll","Microsoft.Web.WebView2.WinForms.dll","WebView2Loader.dll","Afterlight.ico","NAudio.Core.dll","NAudio.Wasapi.dll"})if(!File.Exists(Path.Combine(Root,file)))return false;
#if AFTERLIGHT_CINEMA
            if(!File.Exists(Path.Combine(Root,"web/cinema.js"))||!File.Exists(Path.Combine(Root,"web/living-worlds.js")))return false;
            foreach(string world in CinemaWorlds)if(!File.Exists(Path.Combine(Root,"web/cinema",world+".webp")))return false;
            if(!File.Exists(Path.Combine(Root,"web/cinema/vehicles.webp"))||!File.Exists(Path.Combine(Root,"web/environment.js")))return false;
#endif
            return File.ReadAllText(Path.Combine(Root,"web/index.html")).Contains("connect-src 'none'");
        }
    }
    sealed class CityWebView:WebView2 {
        internal void RefreshSurface(){
            // Native ancestor reparenting does not reliably deliver WinForms'
            // visibility/location notifications to the WebView controller.
            Visible=true;OnVisibleChanged(EventArgs.Empty);OnSizeChanged(EventArgs.Empty);
            OnLocationChanged(EventArgs.Empty);Invalidate(true);
        }
    }
    sealed class CityWindow:Form {
        const string Origin=Program.Origin;
        readonly CityWebView view=new CityWebView();
        readonly NotifyIcon tray=new NotifyIcon();
#if AFTERLIGHT_CINEMA
        Mutex classicDesktopLease;
#endif
        readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
        readonly EventWaitHandle wake;
        readonly bool diagnostics,verifyDesktop,verifyAudio,verifyStability,verifyWorlds,verifyRotation;
        readonly string startupLighting;
        bool wallpaperStartupPending;
        bool stabilityRunning,surfaceRefreshNeeded;
        readonly RendererRecovery rendererRecovery=new RendererRecovery();
        long nextRendererCheck,nextRendererReload;
        readonly ToolStripMenuItem pauseMenu=new ToolStripMenuItem("Pause animation");
        readonly ToolStripMenuItem musicMenu=new ToolStripMenuItem("React to playing music (local output audio)");
        readonly Dictionary<string,ToolStripMenuItem> sceneMenus=new Dictionary<string,ToolStripMenuItem>();
        string currentScene="city";
        readonly System.Web.Script.Serialization.JavaScriptSerializer json=new System.Web.Script.Serialization.JavaScriptSerializer();
        MusicInput music;
        bool musicRequested,musicMenuSync,musicSuspended,musicStill;
        long nextMusicDeviceCheck;
        bool desktop,fullScreen,ready,hostPaused,lastLeft,pointerBusy,closing,sessionLocked;
        IntPtr shellParent,shellIcons,shellWorker;
        bool raisedDesktop;
        readonly WallpaperRecovery recovery=new WallpaperRecovery();
        bool initializing,testsStarted,desktopTransition;
        readonly Stopwatch hostClock=Stopwatch.StartNew();
        Rectangle restoreBounds;
        FormWindowState restoreState;
        Native.POINT lastPointer;
        internal CityWindow(EventWaitHandle wakeEvent,bool diagnosticMode,bool desktopTest,bool audioTest,bool stabilityTest,bool worldsTest,bool rotationTest,bool startWallpaper,string requestedLighting){
            wake=wakeEvent;diagnostics=diagnosticMode;verifyDesktop=desktopTest;verifyAudio=audioTest;verifyStability=stabilityTest;verifyWorlds=worldsTest;verifyRotation=rotationTest;
            wallpaperStartupPending=startWallpaper;startupLighting=requestedLighting;
            Text=Program.WindowTitle;ClientSize=new Size(1280,720);MinimumSize=new Size(720,450);StartPosition=FormStartPosition.CenterScreen;
            BackColor=Color.FromArgb(11,21,42);Icon=new Icon(Path.Combine(Program.Root,"Afterlight.ico"));
            view.Dock=DockStyle.Fill;view.DefaultBackgroundColor=BackColor;view.AccessibleName="Afterlight interactive pixel worlds";Controls.Add(view);
            var menu=new ContextMenuStrip();
            menu.Items.Add("Open Afterlight / customise",null,(s,e)=>Restore(true));
            menu.Items.Add("Choose wallpaper / collection",null,(s,e)=>Restore(true,true));
            var sceneMenu=new ToolStripMenuItem("Wallpapers");
            foreach(var pair in new Dictionary<string,string>{{"city","Canal City"},{"observatory","Northstar"},{"sleeper","The Last Sleeper"},{"pelagic","Pelagic Archive"},{"sanctuary","Lantern Sanctuary"},{"citylight","Citylight"},{"nocturne","City Nocturne"},{"lunar","Lunar Relay"},{"foundry","Orbital Foundry"}}){
                string sceneId=pair.Key;var item=new ToolStripMenuItem(pair.Value);item.Checked=sceneId==currentScene;
                item.Click+=async(s,e)=>{if(ready)await Script("Afterlight.selectScene("+json.Serialize(sceneId)+")");};
                sceneMenus.Add(sceneId,item);sceneMenu.DropDownItems.Add(item);
            }
            menu.Items.Add(sceneMenu);
            menu.Items.Add("Use as desktop wallpaper",null,async(s,e)=>await EnterDesktop());
            pauseMenu.CheckOnClick=true;pauseMenu.CheckedChanged+=async(s,e)=>{if(ready)await Script("Afterlight.pause("+(pauseMenu.Checked?"true":"false")+")");};menu.Items.Add(pauseMenu);
            musicMenu.Enabled=false;musicMenu.CheckOnClick=true;musicMenu.CheckedChanged+=(s,e)=>{if(!musicMenuSync)SetMusic(musicMenu.Checked);};menu.Items.Add(musicMenu);
            menu.Items.Add(new ToolStripSeparator());menu.Items.Add("Quit — restore normal desktop",null,(s,e)=>{closing=true;Close();});
            tray.Icon=Icon;tray.Text=Program.ProductName+" — double-click to customise";tray.ContextMenuStrip=menu;tray.DoubleClick+=(s,e)=>Restore(false);tray.Visible=true;
            timer.Interval=100;timer.Tick+=async(s,e)=>await Tick();timer.Start();
            Shown+=async(s,e)=>await Initialize();
            Microsoft.Win32.SystemEvents.SessionSwitch+=SessionChanged;
            Microsoft.Win32.SystemEvents.DisplaySettingsChanged+=DisplayChanged;
            FormClosed+=(s,e)=>{
                timer.Stop();
#if AFTERLIGHT_CINEMA
                ReleaseDesktopLease();
#endif
                StopMusic();Microsoft.Win32.SystemEvents.SessionSwitch-=SessionChanged;Microsoft.Win32.SystemEvents.DisplaySettingsChanged-=DisplayChanged;tray.Visible=false;tray.Dispose();view.Dispose();
            };
            FormClosing+=(s,e)=>{if(desktop&&!closing&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Program.Log("ignored-close-in-wallpaper");}};
        }
        void SessionChanged(object sender,Microsoft.Win32.SessionSwitchEventArgs e){sessionLocked=e.Reason==Microsoft.Win32.SessionSwitchReason.SessionLock;}
        void DisplayChanged(object sender,EventArgs e){
            // SystemEvents may arrive off the UI thread. The existing watchdog
            // repositions only our layer; never opens settings or alters Explorer.
            if(IsDisposed||!IsHandleCreated)return;
            try{BeginInvoke((Action)(()=>{if(desktop){surfaceRefreshNeeded=true;Program.Log("display-layout-changed");}}));}catch(InvalidOperationException){}
        }
        protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);DarkTitle();}
        protected override bool ShowWithoutActivation{get{return desktop||wallpaperStartupPending||base.ShowWithoutActivation;}}
        protected override CreateParams CreateParams{get{var p=base.CreateParams;if(desktop){p.Style=(p.Style&unchecked((int)~0x80000000u))|0x40000000;p.ExStyle=(p.ExStyle&~(0x40000|0x8))|0x08000000|0x80|0x20|(raisedDesktop?0x80000:0);if(shellParent!=IntPtr.Zero&&Native.IsWindow(shellParent))p.Parent=shellParent;}return p;}}
        protected override void WndProc(ref Message m){
            if(desktop){
                // Desktop is display-only: Explorer owns real mouse/focus input.
                if(m.Msg==0x0021){m.Result=new IntPtr(4);return;}
                // A WebView/WinForms focus change must never promote this child
                // above SHELLDLL_DefView, even between watchdog checks.
                IntPtr currentIcons=raisedDesktop?Native.Icons(shellParent):IntPtr.Zero;
                if(m.Msg==0x0046&&currentIcons!=IntPtr.Zero&&Native.GetParent(Handle)==shellParent){
                    var p=(Native.WINDOWPOS)Marshal.PtrToStructure(m.LParam,typeof(Native.WINDOWPOS));
                    p.flags|=0x0010;
                    if((p.flags&0x0004)==0)p.after=currentIcons;
                    Marshal.StructureToPtr(p,m.LParam,false);
                }
            }
            base.WndProc(ref m);
        }
        void DarkTitle(){try{int dark=1,bg=ColorTranslator.ToWin32(BackColor),fg=ColorTranslator.ToWin32(Color.FromArgb(235,226,208));Native.DwmSetWindowAttribute(Handle,20,ref dark,4);Native.DwmSetWindowAttribute(Handle,35,ref bg,4);Native.DwmSetWindowAttribute(Handle,36,ref fg,4);}catch(DllNotFoundException){}catch(EntryPointNotFoundException){}}
        async Task Script(string script){try{if(!IsDisposed&&view.CoreWebView2!=null){var op=view.CoreWebView2.ExecuteScriptAsync(script);if(await Task.WhenAny(op,Task.Delay(1500))==op)await op;else Program.Log("renderer-command-timeout");}}catch(InvalidOperationException){}catch(COMException){}}
        async Task Initialize(){
            if(initializing)return;initializing=true;
            try {
                var env=await CoreWebView2Environment.CreateAsync(null,Path.Combine(Program.Data,"webview"));
                await view.EnsureCoreWebView2Async(env);var core=view.CoreWebView2;
                core.Settings.AreHostObjectsAllowed=false;core.Settings.AreDevToolsEnabled=false;core.Settings.AreDefaultContextMenusEnabled=false;core.Settings.IsStatusBarEnabled=false;core.Settings.IsGeneralAutofillEnabled=false;core.Settings.IsPasswordAutosaveEnabled=false;
                var assets=new Dictionary<string,string>{{"/index.html","text/html; charset=utf-8"},{"/style.css","text/css"},{"/music.css","text/css"},{"/collection.css","text/css"},{"/explore.css","text/css"},{"/release.css","text/css"},{"/seneschal-art.js","text/javascript"},{"/seneschal-worlds.js","text/javascript"},{"/worlds.js","text/javascript"},{"/scene.js","text/javascript"},{"/ui.js","text/javascript"},{"/icon.svg","image/svg+xml"},{"/thumb-city.png","image/png"},{"/thumb-observatory.png","image/png"},{"/thumb-sleeper.png","image/png"},{"/thumb-pelagic.png","image/png"},{"/thumb-sanctuary.png","image/png"},{"/thumb-citylight.png","image/png"},{"/thumb-nocturne.png","image/png"},{"/thumb-lunar.png","image/png"},{"/thumb-foundry.png","image/png"}};
#if AFTERLIGHT_CINEMA
                assets.Add("/cinema.js","text/javascript");
                assets.Add("/environment.js","text/javascript");
                assets.Add("/cinema/vehicles.webp","image/webp");
                assets.Add("/living-worlds.js","text/javascript");
                foreach(string world in Program.CinemaWorlds)assets.Add("/cinema/"+world+".webp","image/webp");
#endif
                core.AddWebResourceRequestedFilter("*",CoreWebView2WebResourceContext.All);
                core.WebResourceRequested+=(s,e)=>{
                    Uri uri;string mime=null;
                    bool allowed=Uri.TryCreate(e.Request.Uri,UriKind.Absolute,out uri)&&uri.GetLeftPart(UriPartial.Authority)==Origin&&e.Request.Method=="GET"&&assets.TryGetValue(uri.AbsolutePath,out mime);
                    try{var bytes=allowed?File.ReadAllBytes(Path.Combine(Program.Root,"web",uri.AbsolutePath.Substring(1))):new byte[0];e.Response=env.CreateWebResourceResponse(new MemoryStream(bytes),allowed?200:403,allowed?"OK":"Forbidden","Content-Type: "+(mime??"text/plain")+"\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff");}
                    catch(IOException){e.Response=env.CreateWebResourceResponse(new MemoryStream(new byte[0]),404,"Not Found","");}
                };
                core.NavigationStarting+=(s,e)=>{if(e.Uri!=Origin+"/index.html")e.Cancel=true;};
                core.NewWindowRequested+=(s,e)=>{e.Handled=true;};core.PermissionRequested+=(s,e)=>{e.State=CoreWebView2PermissionState.Deny;};
                core.NavigationCompleted+=(s,e)=>Program.Log("navigation completed="+e.IsSuccess+" desktop="+desktop);
                core.ProcessFailed+=(s,e)=>{Program.Log("webview-process-failed kind="+e.ProcessFailedKind);surfaceRefreshNeeded=true;rendererRecovery.Reset();};
                core.DownloadStarting+=(s,e)=>{
                    if(!e.DownloadOperation.Uri.StartsWith("blob:"+Origin+"/",StringComparison.Ordinal)){e.Cancel=true;return;}
                    var deferral=e.GetDeferral();
                    try{using(var save=new SaveFileDialog{Title="Save your Afterlight still",Filter="PNG image|*.png",FileName="Afterlight-"+currentScene+"-4K.png",OverwritePrompt=true}){if(save.ShowDialog(this)==DialogResult.OK){e.ResultFilePath=save.FileName;e.Handled=true;}else e.Cancel=true;}}
                    finally{deferral.Complete();}
                };
                core.WebMessageReceived+=async(s,e)=>{
                    if(e.Source!=Origin+"/index.html")return;
                    string command;try{command=e.TryGetWebMessageAsString();}catch{return;}
                    if(command=="desktop")await EnterDesktop();
                    if(command=="fullscreen")ToggleFullscreen();
                    if(command=="exit-fullscreen"&&fullScreen)ToggleFullscreen();
                    if(command=="paused")pauseMenu.Checked=true;
                    if(command=="resumed")pauseMenu.Checked=false;
                    if(command=="music:on")SetMusic(true);
                    if(command=="music:off")SetMusic(false);
                    if(command=="music:still:on")musicStill=true;
                    if(command=="music:still:off")musicStill=false;
                    if(command.StartsWith("scene:",StringComparison.Ordinal)){
                        string id=command.Substring(6);if(sceneMenus.ContainsKey(id)){currentScene=id;foreach(var pair in sceneMenus)pair.Value.Checked=pair.Key==id;}
                    }
                    if(command=="ready"){
                        ready=true;musicMenu.Enabled=true;
                        Program.Log("page-ready desktop="+desktop);
                        if(desktop)await Script("window.AfterlightUI.enterDesktop()");
                        await Script("Afterlight.pause("+(pauseMenu.Checked?"true":"false")+")");
#if AFTERLIGHT_CINEMA
                        if(hostPaused)await Script("Afterlight.hostPause(true)");
                        if(musicRequested)SetMusic(true);
#endif
                        surfaceRefreshNeeded=desktop;
                        if(wallpaperStartupPending){
                            wallpaperStartupPending=false;
                            if(startupLighting!=null)await Script("Afterlight.set({lighting:"+json.Serialize(startupLighting)+"},{animate:false})");
                            await EnterDesktop();
                            var initial=await ReadSceneHealth();
#if AFTERLIGHT_CINEMA
                            for(int attempt=0;initial!=null&&initial.artwork=="loading"&&attempt<12;attempt++){
                                await Task.Delay(125);
                                initial=await ReadSceneHealth();
                            }
                            if(initial!=null)Program.Log("wallpaper-startup attached="+desktop+" scene="+initial.scene+" lighting="+initial.lighting+" artwork="+initial.artwork);
#else
                            if(initial!=null)Program.Log("wallpaper-startup attached="+desktop+" scene="+initial.scene+" lighting="+initial.lighting);
#endif
                        }
                        if(diagnostics){
                            await Task.Delay(700);
                            // First-party app health report: no UI automation or external service.
                            string health=await core.ExecuteScriptAsync("JSON.stringify(Afterlight.diagnostics())");
                            File.WriteAllText(Path.Combine(Program.Root,"native-health.json"),health);
                        }
                        if(!testsStarted){testsStarted=true;if(verifyDesktop)await VerifyDesktop();if(verifyAudio)await VerifyAudio();if(verifyStability)await VerifyStability();if(verifyWorlds)await VerifyWorlds();if(verifyRotation)await VerifyRotation();}
                    }
                };
                core.Navigate(Origin+"/index.html");
            }catch(Exception ex){MessageBox.Show(this,"The city could not finish loading.\n\n"+ex.Message,"Afterlight",MessageBoxButtons.OK,MessageBoxIcon.Information);closing=true;Close();}
        }
        void Post(object message){if(ready&&view.CoreWebView2!=null)view.CoreWebView2.PostWebMessageAsJson(json.Serialize(message));}
        void StopMusic(){var old=music;music=null;if(old!=null)old.Dispose();}
        void MusicStatus(string status,string detail){Post(new{type="music-status",enabled=musicRequested,status=status,detail=detail});}
        void SetMusic(bool enabled){
            musicRequested=enabled;musicMenuSync=true;musicMenu.Checked=enabled;musicMenuSync=false;
            StopMusic();
            if(!enabled){MusicStatus("off","Not listening");return;}
            if(hostPaused||pauseMenu.Checked||sessionLocked||musicStill){musicSuspended=true;MusicStatus("paused","Listening paused with the scene");return;}
#if AFTERLIGHT_CINEMA
            musicSuspended=false;
            nextMusicDeviceCheck=hostClock.ElapsedMilliseconds+3000;
            try{music=new MusicInput();music.Start();MusicStatus("listening",music.DeviceName);}
            catch(Exception){StopMusic();MusicStatus("error","Playback output is unavailable. Afterlight will reconnect when it returns.");}
#else
            try{music=new MusicInput();music.Start();nextMusicDeviceCheck=hostClock.ElapsedMilliseconds+2000;musicSuspended=false;MusicStatus("listening",music.DeviceName);}
            catch(Exception){StopMusic();musicRequested=false;musicMenuSync=true;musicMenu.Checked=false;musicMenuSync=false;MusicStatus("error","Could not open the playback device. Check your Windows output device, then try again.");}
#endif
        }
        async Task VerifyAudio(){
            SetMusic(true);bool opened=music!=null&&music.Running;int frames=0;double peak=0,visualPeak=0;
            try{for(int i=0;i<12;i++){await Task.Delay(300);if(music!=null){frames=music.Frames;peak=Math.Max(peak,music.Snapshot().level);double v;string result=await view.CoreWebView2.ExecuteScriptAsync("Afterlight.diagnostics().musicEnergy");if(Double.TryParse(result,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out v))visualPeak=Math.Max(visualPeak,v);}}}
            finally{SetMusic(false);}
            bool stopped=music==null&&!musicRequested;
            File.WriteAllText(Path.Combine(Program.Root,"music-input-test.json"),json.Serialize(new{opened=opened,stopped=stopped,spectrumFrames=frames,signalDetected=peak>.005,peakLevel=peak,visualSignalReached=visualPeak>.005,visualPeak=visualPeak,audioSaved=false,microphoneUsed=false}));
        }
        void ToggleFullscreen(){
            if(desktop)return;
            if(!fullScreen){restoreBounds=Bounds;restoreState=WindowState;WindowState=FormWindowState.Normal;FormBorderStyle=FormBorderStyle.None;Bounds=Screen.FromControl(this).Bounds;fullScreen=true;}
            else{fullScreen=false;FormBorderStyle=FormBorderStyle.Sizable;Bounds=restoreBounds;WindowState=restoreState;DarkTitle();}
        }
        async Task VerifyDesktop(){
            await Task.Delay(350);await EnterDesktop();
            var samples=new List<string>();bool success=desktop;
            try{
                for(int i=0;i<6;i++){
                    await Task.Delay(700);
                    bool safe=desktop&&Native.SafePlacement(Handle,shellParent,shellIcons,shellWorker,raisedDesktop);
                    samples.Add("{\"sample\":"+i+",\"behindIcons\":"+(safe?"true":"false")+"}");success&=safe;
                    if(!safe)break;
                    if(i==2){
                        // Regression check: an attempted raise of our own window
                        // must be constrained before Windows changes the stack.
                        Native.SetWindowPos(Handle,IntPtr.Zero,0,0,0,0,0x0010|0x0001|0x0002);
                        success&=Native.SafePlacement(Handle,shellParent,shellIcons,shellWorker,raisedDesktop);
                    }
                }
            }catch{success=false;}finally{Restore(false);}
            await Task.Delay(500);
            bool restored=TopLevel&&view.Enabled&&Native.GetParent(Handle)==IntPtr.Zero;
            string report="{\"passed\":"+(success&&restored?"true":"false")+",\"restoredToPreview\":"+(restored?"true":"false")+",\"samples\":["+String.Join(",",samples)+"]}";
            File.WriteAllText(Path.Combine(Program.Root,"desktop-placement-test.json"),report);
        }
        async Task<bool> CaptureSceneProof(string name){
            // Only this app's WebView is captured, never the user's screen,
            // desktop folders, other windows, or playback audio.
            try{
                using(var stream=new MemoryStream()){
                    await view.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,stream);
                    File.WriteAllBytes(Path.Combine(Program.Root,name),stream.ToArray());stream.Position=0;
                    using(var bitmap=new Bitmap(stream)){
                        var colors=new HashSet<int>();
                        for(int y=0;y<bitmap.Height;y+=17)for(int x=0;x<bitmap.Width;x+=19)colors.Add(bitmap.GetPixel(x,y).ToArgb());
                        return colors.Count>40;
                    }
                }
            }catch(Exception ex){Program.Log("scene-capture-failed type="+ex.GetType().Name);return false;}
        }
        async Task VerifyStability(){
            stabilityRunning=true;SetMusic(false);
            var samples=new List<object>();var watch=Stopwatch.StartNew();
            bool passed=true;int lastFrame=-1,activeSamples=0,frameFailures=0;string error=null;
            try{
                await EnterDesktop();await Task.Delay(1200);
                if(!desktop)throw new InvalidOperationException("Wallpaper attach failed");
                passed&=await CaptureSceneProof("stability-start.png");
                for(int i=1;i<=72;i++){
                    await Task.Delay(5000);
                    if(!desktop)throw new OperationCanceledException("User left wallpaper mode during test");
                    SceneHealth h=await ReadSceneHealth();
                    bool placement=Native.SafePlacement(Handle,shellParent,shellIcons,shellWorker,raisedDesktop);
                    bool visible=Native.IsWindowVisible(Handle)&&Native.IsWindowVisible(view.Handle);
                    bool opaque=Native.OpaqueIfLayered(Handle,raisedDesktop);
                    bool expected=!sessionLocked&&!pauseMenu.Checked&&(h==null||!h.reduced);
                    bool advancing=h!=null&&!h.hidden&&!h.hostPaused&&h.rafActive&&h.frame>lastFrame;
                    if(expected){activeSamples++;if(!advancing)frameFailures++;}
                    passed&=placement&&visible&&opaque&&h!=null;
                    samples.Add(new{seconds=Math.Round(watch.Elapsed.TotalSeconds,1),placement=placement,visible=visible,opaque=opaque,
                        frame=h==null?-1:h.frame,expected=expected,advancing=advancing,audioCapture=music!=null});
                    if(h!=null)lastFrame=h.frame;
                    if(i==15){view.Visible=false;Native.ShowWindow(Handle,0);Program.Log("stability-inject own-layer-hidden");}
                    if(i==33){await Script("Afterlight.hostPause(true)");Program.Log("stability-inject missed-renderer-resume");}
                    if(i==51&&raisedDesktop){Native.SetLayeredWindowAttributes(Handle,0,0,2);Program.Log("stability-inject own-layer-transparent");}
                    File.WriteAllText(Path.Combine(Program.Root,"stability-progress.json"),json.Serialize(new{seconds=Math.Round(watch.Elapsed.TotalSeconds),samples=samples.Count,activeSamples=activeSamples,frameFailures=frameFailures}));
                }
                passed&=await CaptureSceneProof("stability-end.png");
                passed&=activeSamples>=60&&frameFailures==0&&music==null;
            }catch(Exception ex){passed=false;error=ex.GetType().Name+": "+ex.Message;}
            finally{
                stabilityRunning=false;
                File.WriteAllText(Path.Combine(Program.Root,"stability-test.json"),json.Serialize(new{passed=passed,seconds=Math.Round(watch.Elapsed.TotalSeconds,1),
                    activeSamples=activeSamples,frameFailures=frameFailures,audioCapture=false,originalWallpaperChanged=false,
                    leftInWallpaper=desktop,error=error,samples=samples}));
                Program.Log("stability-test-complete passed="+passed+" seconds="+Math.Round(watch.Elapsed.TotalSeconds));
            }
        }
        async Task VerifyWorlds(){
            // Opt-in, first-party diagnostic: local scene state and our own
            // WebView artwork only. Never reads the desktop or opens audio.
            stabilityRunning=true;SetMusic(false);
            var samples=new List<object>();bool passed=true;string error=null;object galleryResult=null;
            string originalScene=currentScene;var watch=Stopwatch.StartNew();
            try{
                await Script("AfterlightUI.openCollection()");await Task.Delay(500);
                string gallery=await view.CoreWebView2.ExecuteScriptAsync("JSON.stringify({cards:document.querySelectorAll('button.world-card[data-scene]').length,images:[...document.querySelectorAll('button.world-card[data-scene] img')].filter(i=>i.complete&&i.naturalWidth>0).length,visible:!document.getElementById('worlds-gallery').hidden})");
                var result=json.Deserialize<Dictionary<string,object>>(json.Deserialize<string>(gallery));
                galleryResult=result;
                passed&=Convert.ToInt32(result["cards"])==9&&Convert.ToInt32(result["images"])==9&&Convert.ToBoolean(result["visible"]);
                passed&=await CaptureSceneProof("worlds-gallery-native.png");
                await EnterDesktop();await Task.Delay(1500);
                if(!desktop)throw new InvalidOperationException("Wallpaper attach failed");
                foreach(string id in new[]{"city","observatory","sleeper","pelagic","sanctuary","citylight","nocturne","lunar","foundry"}){
                    await Script("Afterlight.selectScene("+json.Serialize(id)+")");await Task.Delay(3000);
                    SceneHealth before=await ReadSceneHealth();await Task.Delay(700);SceneHealth after=await ReadSceneHealth();
                    bool placement=Native.SafePlacement(Handle,shellParent,shellIcons,shellWorker,raisedDesktop);
                    bool visible=Native.IsWindowVisible(Handle)&&Native.IsWindowVisible(view.Handle);
                    bool opaque=Native.OpaqueIfLayered(Handle,raisedDesktop);
                    bool intentional=after!=null&&(after.reduced||after.paused||sessionLocked);
                    bool advancing=before!=null&&after!=null&&after.frame>before.frame&&!after.hostPaused&&!after.hidden&&after.rafActive;
                    bool capture=await CaptureSceneProof("worlds-"+id+"-native.png");
                    bool selected=after!=null&&after.scene==id;
                    passed&=desktop&&selected&&placement&&visible&&opaque&&capture&&(intentional||advancing)&&music==null;
                    samples.Add(new{scene=id,selected=selected,placement=placement,visible=visible,opaque=opaque,advancing=advancing,intentionalPause=intentional,capture=capture,audioCapture=music!=null});
                }
            }catch(Exception ex){passed=false;error=ex.GetType().Name+": "+ex.Message;}
            await Script("Afterlight.selectScene("+json.Serialize(originalScene)+")");
            stabilityRunning=false;
            File.WriteAllText(Path.Combine(Program.Root,"worlds-test.json"),json.Serialize(new{passed=passed,seconds=Math.Round(watch.Elapsed.TotalSeconds,1),gallery=galleryResult,restoredScene=originalScene,leftInWallpaper=desktop,audioCapture=false,error=error,samples=samples}));
            Program.Log("worlds-test-complete passed="+passed);
        }
        async Task VerifyRotation(){
            // Explicit opt-in diagnostic; uses the real timer and opens no audio.
            stabilityRunning=true;SetMusic(false);string original=currentScene,error=null;
            bool passed=false;var watch=Stopwatch.StartNew();var samples=new List<object>();
            var ids=new[]{"city","observatory","sleeper","pelagic","sanctuary","citylight","nocturne","lunar","foundry"};string expected=ids[(Array.IndexOf(ids,original)+1)%ids.Length];
            try{
                await EnterDesktop();await Task.Delay(1500);if(!desktop)throw new InvalidOperationException("Wallpaper attach failed");
                SceneHealth initial=await ReadSceneHealth();if(initial==null||initial.reduced||initial.paused)throw new InvalidOperationException("Rotation is intentionally paused by Stillness or animation pause");
                await Script("Afterlight.set({rotate:true,rotationMinutes:1,rotationShuffle:false})");
                for(int i=0;i<13;i++){
                    await Task.Delay(5000);if(!desktop)throw new OperationCanceledException("User left desktop during test");
                    SceneHealth h=await ReadSceneHealth();samples.Add(new{seconds=Math.Round(watch.Elapsed.TotalSeconds,1),scene=h==null?null:h.scene,audioCapture=music!=null});
                }
                SceneHealth final=await ReadSceneHealth();
                passed=final!=null&&final.scene==expected&&Native.SafePlacement(Handle,shellParent,shellIcons,shellWorker,raisedDesktop)&&Native.IsWindowVisible(Handle)&&Native.IsWindowVisible(view.Handle)&&Native.OpaqueIfLayered(Handle,raisedDesktop)&&music==null;
                passed&=await CaptureSceneProof("rotation-auto-change-native.png");
            }catch(Exception ex){error=ex.GetType().Name+": "+ex.Message;}
            await Script("Afterlight.set({scene:"+json.Serialize(original)+",rotate:true,rotationMinutes:10,rotationShuffle:false})");
            stabilityRunning=false;
            File.WriteAllText(Path.Combine(Program.Root,"rotation-test.json"),json.Serialize(new{passed=passed,seconds=Math.Round(watch.Elapsed.TotalSeconds,1),expected=expected,restoredScene=original,rotationEnabled=true,intervalMinutes=10,leftInWallpaper=desktop,audioCapture=false,error=error,samples=samples}));
            Program.Log("rotation-test-complete passed="+passed);
        }
#if AFTERLIGHT_CINEMA
        void ReleaseDesktopLease(){
            if(classicDesktopLease==null)return;
            classicDesktopLease.ReleaseMutex();classicDesktopLease.Dispose();classicDesktopLease=null;
        }
#endif
        async Task EnterDesktop(){
            if(!ready||desktop||desktopTransition)return;
#if AFTERLIGHT_CINEMA
            // The original binary already reserves this identity while open.
            // Hold it only when Cinema owns the desktop, so the two cannot layer.
            bool available;
            var lease=new Mutex(true,Program.ClassicMutex,out available);
            if(!available){
                lease.Dispose();
                Program.Log("wallpaper-blocked classic-afterlight");
                MessageBox.Show(this,"Quit Afterlight from its tray icon, then choose Use as desktop wallpaper here.","Afterlight Cinema",MessageBoxButtons.OK,MessageBoxIcon.Information);
                return;
            }
            classicDesktopLease=lease;
#endif
            desktopTransition=true;
            try{
            await Script("window.AfterlightUI.closeSettings()");
            if(fullScreen)ToggleFullscreen();
            IntPtr parent,after,worker;bool layered;
            if(!Native.DesktopLayer(out parent,out after,out worker,out layered)){
                if(!verifyStability)MessageBox.Show(this,"Windows did not provide a safe wallpaper layer. Your current wallpaper has not been changed.\n\nYou can still use full-screen mode, or import Afterlight-Lively.zip into Lively Wallpaper.","Afterlight",MessageBoxButtons.OK,MessageBoxIcon.Information);return;
            }
            restoreBounds=Bounds;restoreState=WindowState;Hide();WindowState=FormWindowState.Normal;
            FormBorderStyle=FormBorderStyle.None;ShowInTaskbar=false;
            // Set WinForms' actual managed state, not only native style bits.
            // Otherwise a later focus/activation can raise the form above icons.
            TopLevel=false;view.Enabled=false;
            shellParent=parent;shellIcons=after;shellWorker=worker;raisedDesktop=layered;desktop=true;recovery.Begin();
            long oldEx=Native.GetWindowLongPtr(Handle,-20).ToInt64();
            Native.SetWindowLongPtr(Handle,-20,new IntPtr((oldEx&~(0x40000L|0x8L))|0x08000000L|0x80L|0x20L|(layered?0x80000L:0)));
            Native.SetParent(Handle,parent);
            if(Native.GetParent(Handle)!=parent){Restore(false);MessageBox.Show(this,"Windows could not attach the wallpaper. Preview mode is still available.","Afterlight");return;}
            if(layered)Native.SetLayeredWindowAttributes(Handle,0,255,2);
            Show();
            Rectangle area=Screen.PrimaryScreen.Bounds;var p=new Native.POINT{X=area.X,Y=area.Y};Native.ScreenToClient(parent,ref p);
            bool placed=Native.SetWindowPos(Handle,layered?after:new IntPtr(1),p.X,p.Y,area.Width,area.Height,0x0010|0x0020|0x0040);
            if(!placed||!Native.SafePlacement(Handle,shellParent,shellIcons,shellWorker,raisedDesktop)){
                PlacementFailed();return;
            }
            await Script("window.AfterlightUI.enterDesktop()");
            surfaceRefreshNeeded=true;rendererRecovery.Reset();
            Program.Log("wallpaper-attached parent="+parent+" icons="+after+" worker="+worker);
            tray.ShowBalloonTip(4500,Program.ProductName+" is on your desktop","Double-click the "+Program.ProductName+" tray icon to customise. Choose Quit to return to your normal wallpaper.",ToolTipIcon.Info);
            }finally{
                desktopTransition=false;
#if AFTERLIGHT_CINEMA
                if(!desktop)ReleaseDesktopLease();
#endif
            }
        }
        async void Restore(bool settings,bool collection=false){
            surfaceRefreshNeeded=false;rendererRecovery.Reset();
            recovery.Cancel();Program.Log("user-open-preview settings="+settings);
            if(desktop||!TopLevel||Native.GetParent(Handle)!=IntPtr.Zero){
                Hide();desktop=false;Native.SetParent(Handle,IntPtr.Zero);
#if AFTERLIGHT_CINEMA
                ReleaseDesktopLease();
#endif
                long ex=Native.GetWindowLongPtr(Handle,-20).ToInt64();
                Native.SetWindowLongPtr(Handle,-20,new IntPtr(ex&~(0x08000000L|0x80000L|0x20L|0x80L)));
                TopLevel=true;FormBorderStyle=FormBorderStyle.Sizable;ShowInTaskbar=true;view.Enabled=true;
                Bounds=restoreBounds;WindowState=restoreState;DarkTitle();
                await Script("window.AfterlightUI.leaveDesktop()");
            }
            Show();if(WindowState==FormWindowState.Minimized)WindowState=FormWindowState.Normal;Activate();
            if(settings&&ready)await Script(collection?"window.AfterlightUI.openCollection()":"document.getElementById('open-settings').click()");
        }
        void PlacementFailed(){
            // Only the user's initial attach attempt reaches this path. An
            // automatic health check must never call Restore or show a dialog.
            Hide();Restore(false);
            if(!verifyDesktop&&!verifyStability)MessageBox.Show(this,"Afterlight could not stay safely behind the desktop icons, so it returned to preview. Your icons and normal wallpaper are unchanged.\n\nUse preview mode or the included Lively package instead.","Afterlight",MessageBoxButtons.OK,MessageBoxIcon.Information);
        }
        bool MaintainWallpaper(){
            if(!desktop||!recovery.Wanted)return true;
            IntPtr parent,icons,worker;bool raised;
            bool found=Native.DesktopLayer(out parent,out icons,out worker,out raised,false);
            if(!recovery.Waiting&&found&&Native.SafePlacement(Handle,parent,icons,worker,raised)&&Native.FillsPrimaryScreen(Handle)&&Native.IsWindowVisible(Handle)&&Native.IsWindowVisible(view.Handle)&&Native.OpaqueIfLayered(Handle,raised)){
                if(parent!=shellParent||icons!=shellIcons||worker!=shellWorker){Program.Log("desktop-handles-refreshed parent="+parent+" icons="+icons+" worker="+worker);surfaceRefreshNeeded=true;}
                shellParent=parent;shellIcons=icons;shellWorker=worker;raisedDesktop=raised;recovery.Attached();return true;
            }
            if(!recovery.Waiting){Program.Log("wallpaper-recovery-start found="+found);recovery.Hold();view.Visible=false;Native.ShowWindow(Handle,0);}
            double now=hostClock.Elapsed.TotalSeconds;
            if(!recovery.CanAttempt(now))return false;
            if(found){
                // Hide our own child until new handles and ordering are valid.
                // No activation, preview opening, shell restart or icon changes.
                shellParent=parent;shellIcons=icons;shellWorker=worker;raisedDesktop=raised;
                if(Native.GetParent(Handle)!=parent)Native.SetParent(Handle,parent);
                long style=Native.GetWindowLongPtr(Handle,-16).ToInt64(),ex=Native.GetWindowLongPtr(Handle,-20).ToInt64();
                Native.SetWindowLongPtr(Handle,-16,new IntPtr((style&~0x80000000L)|0x40000000L));
                Native.SetWindowLongPtr(Handle,-20,new IntPtr((ex&~(0x40000L|0x8L|0x80000L))|0x08000000L|0x80L|0x20L|(raised?0x80000L:0)));
                if(raised&&!Native.SetLayeredWindowAttributes(Handle,0,255,2)){recovery.Failed(now);return false;}
                Rectangle area=Screen.PrimaryScreen.Bounds;var p=new Native.POINT{X=area.X,Y=area.Y};Native.ScreenToClient(parent,ref p);
                bool placed=Native.SetWindowPos(Handle,raised?icons:new IntPtr(1),p.X,p.Y,area.Width,area.Height,0x0010|0x0020|0x0040);
                if(placed&&Native.SafePlacement(Handle,parent,icons,worker,raised)){
                    view.RefreshSurface();surfaceRefreshNeeded=true;rendererRecovery.Reset();
                    recovery.Attached();tray.Text=Program.ProductName+" — double-click to customise";Program.Log("wallpaper-placement-restored awaiting-renderer=True");return true;
                }
                Native.ShowWindow(Handle,0);
            }
            recovery.Failed(now);tray.Text=Program.ProductName+" — waiting for the Windows desktop";
            if(recovery.Failures==1||recovery.Failures%5==0)Program.Log("wallpaper-wait retry="+recovery.Failures+" found="+found);
            return false;
        }
        async Task<SceneHealth> ReadSceneHealth(){
            if(view.CoreWebView2==null)return null;
            var task=view.CoreWebView2.ExecuteScriptAsync("window.Afterlight ? Afterlight.diagnostics() : null");
            if(await Task.WhenAny(task,Task.Delay(1500))!=task)return null;
            string result=await task;
            return result=="null"?null:json.Deserialize<SceneHealth>(result);
        }
        async Task RefreshRenderer(){
            view.RefreshSurface();
            if(view.CoreWebView2!=null&&view.CoreWebView2.IsSuspended)view.CoreWebView2.Resume();
            await Script("window.AfterlightUI.enterDesktop(); Afterlight.hostRecover("+(hostPaused?"true":"false")+")");
            surfaceRefreshNeeded=false;nextRendererCheck=0;rendererRecovery.Reset();
            Program.Log("wallpaper-surface-refreshed hostPaused="+hostPaused);
        }
        async Task WatchRenderer(){
            if(!desktop||recovery.Waiting||!ready)return;
            if(surfaceRefreshNeeded)await RefreshRenderer();
            if(hostClock.ElapsedMilliseconds<nextRendererCheck)return;
            nextRendererCheck=hostClock.ElapsedMilliseconds+2000;
            SceneHealth health=null;try{health=await ReadSceneHealth();}catch(Exception ex){Program.Log("renderer-health-error type="+ex.GetType().Name);}
            bool expected=!hostPaused&&!pauseMenu.Checked&&(health==null||!health.reduced);
            bool advancing=rendererRecovery.Observe(health==null?-1:health.frame,expected,
                health!=null&&!health.hidden&&!health.hostPaused&&health.rafActive);
            if(advancing&&rendererRecovery.JustVerified)Program.Log("wallpaper-renderer-verified frame="+health.frame);
            if(!rendererRecovery.NeedsRepair)return;
            Program.Log("wallpaper-renderer-stalled frame="+(health==null?-1:health.frame));
            if(rendererRecovery.Repairs>=2&&hostClock.ElapsedMilliseconds>=nextRendererReload){
                nextRendererReload=hostClock.ElapsedMilliseconds+60000;
#if AFTERLIGHT_CINEMA
                ready=false;musicMenu.Enabled=false;StopMusic();
#else
                SetMusic(false);
#endif
                rendererRecovery.Reset();surfaceRefreshNeeded=true;
                view.CoreWebView2.Reload();Program.Log("wallpaper-renderer-reload");
            }else{
                rendererRecovery.RepairAttempted();view.RefreshSurface();
                await Script("window.AfterlightUI.enterDesktop(); Afterlight.hostRecover("+(hostPaused?"true":"false")+")");
            }
        }
        async Task Tick(){
            if(wake.WaitOne(0))Restore(false);
            if(!ready||pointerBusy)return;
            pointerBusy=true;
            try {
                bool placementReady=MaintainWallpaper();
                bool covered=!placementReady||sessionLocked||(!desktop&&WindowState==FormWindowState.Minimized);
                IntPtr fg=Native.GetForegroundWindow();string cls=Native.Class(fg);
                bool desktopFocus=cls=="Progman"||cls=="WorkerW"||fg==Handle;
                if(desktop&&!desktopFocus&&!stabilityRunning){Native.RECT rect;if(Native.GetWindowRect(fg,out rect)){var m=Screen.PrimaryScreen.Bounds;covered|=rect.Left<=m.Left+3&&rect.Top<=m.Top+3&&rect.Right>=m.Right-3&&rect.Bottom>=m.Bottom-3;}}
                if(covered!=hostPaused){hostPaused=covered;await Script("Afterlight.hostPause("+(covered?"true":"false")+")");}
                await WatchRenderer();
#if AFTERLIGHT_CINEMA
                if(ready&&musicRequested){
#else
                if(musicRequested){
#endif
                    bool suspend=hostPaused||pauseMenu.Checked||sessionLocked||musicStill;
                    if(suspend&&!musicSuspended){StopMusic();musicSuspended=true;MusicStatus("paused","Listening paused with the scene");}
                    else if(!suspend&&musicSuspended)SetMusic(true);
                    if(music!=null&&!suspend&&hostClock.ElapsedMilliseconds>=nextMusicDeviceCheck){
#if AFTERLIGHT_CINEMA
                        nextMusicDeviceCheck=hostClock.ElapsedMilliseconds+3000;
#else
                        nextMusicDeviceCheck=hostClock.ElapsedMilliseconds+2000;
#endif
                        bool changed;try{changed=!music.IsDefaultOutput();}catch{changed=true;}
                        if(changed)SetMusic(true);
                    }
#if AFTERLIGHT_CINEMA
                    else if(music==null&&!suspend&&hostClock.ElapsedMilliseconds>=nextMusicDeviceCheck)SetMusic(true);
                    if(music!=null&&!suspend){
                        if(!music.Running){
                            StopMusic();nextMusicDeviceCheck=hostClock.ElapsedMilliseconds+3000;
                            MusicStatus("error","Playback output stopped. Afterlight is reconnecting.");
                        }
#else
                    if(music!=null){
                        if(!music.Running){string error=music.Error;SetMusic(false);MusicStatus("error",error??"Playback device stopped. Enable music reaction again to reconnect.");}
#endif
                        else{var f=music.Snapshot();Post(new{type="music-frame",level=f.level,bass=f.bass,mid=f.mid,high=f.high,bands=f.bands});}
                    }
                }
                if(desktop&&desktopFocus&&!hostPaused){
                    Native.POINT p;Native.GetCursorPos(out p);bool left=(Native.GetAsyncKeyState(1)&0x8000)!=0;
                    var area=Screen.PrimaryScreen.Bounds;
                    // Desktop-only pointer feedback: no keyboard hook, no logging,
                    // and no forwarding of input while another application is active.
                    if(area.Contains(p.X,p.Y)&&(p.X!=lastPointer.X||p.Y!=lastPointer.Y||left&&!lastLeft)){
                        int x=p.X-area.X,y=p.Y-area.Y;
                        await Script("Afterlight.hostPointer("+x+"*innerWidth/"+area.Width+","+y+"*innerHeight/"+area.Height+","+(left&&!lastLeft?"true":"false")+")");
                    }
                    lastPointer=p;lastLeft=left;
                }else lastLeft=(Native.GetAsyncKeyState(1)&0x8000)!=0;
            }catch(Exception ex){Program.Log("host-tick-error type="+ex.GetType().Name);surfaceRefreshNeeded=desktop;}finally{pointerBusy=false;}
        }
    }
    static class Native {
        internal struct POINT{public int X,Y;}internal struct RECT{public int Left,Top,Right,Bottom;}
        [StructLayout(LayoutKind.Sequential)]internal struct WINDOWPOS{public IntPtr window,after;public int x,y,cx,cy;public uint flags;}
        delegate bool EnumProc(IntPtr h,IntPtr p);
        [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern IntPtr FindWindow(string c,string t);
        [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern IntPtr FindWindowEx(IntPtr p,IntPtr a,string c,string t);
        [DllImport("user32.dll")]static extern bool EnumWindows(EnumProc p,IntPtr l);
        [DllImport("user32.dll")]static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint t,out IntPtr r);
        [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")]internal static extern IntPtr GetWindowLongPtr(IntPtr h,int n);
        [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW")]internal static extern IntPtr SetWindowLongPtr(IntPtr h,int n,IntPtr v);
        [DllImport("user32.dll")]internal static extern IntPtr SetParent(IntPtr h,IntPtr p);
        [DllImport("user32.dll")]internal static extern IntPtr GetParent(IntPtr h);
        [DllImport("user32.dll")]internal static extern bool IsWindow(IntPtr h);
        [DllImport("user32.dll")]internal static extern bool ShowWindow(IntPtr h,int command);
        [DllImport("user32.dll")]static extern IntPtr GetWindow(IntPtr h,uint command);
        [DllImport("user32.dll")]static extern uint GetWindowThreadProcessId(IntPtr h,out uint processId);
        [DllImport("user32.dll")]internal static extern bool IsWindowVisible(IntPtr h);
        [DllImport("user32.dll")]internal static extern bool SetWindowPos(IntPtr h,IntPtr a,int x,int y,int w,int z,uint f);
        [DllImport("user32.dll")]internal static extern bool SetLayeredWindowAttributes(IntPtr h,uint key,byte alpha,uint f);
        [DllImport("user32.dll")]static extern bool GetLayeredWindowAttributes(IntPtr h,out uint key,out byte alpha,out uint flags);
        [DllImport("user32.dll")]internal static extern bool ScreenToClient(IntPtr h,ref POINT p);
        [DllImport("user32.dll")]internal static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")]internal static extern bool GetWindowRect(IntPtr h,out RECT r);
        [DllImport("user32.dll")]internal static extern bool GetCursorPos(out POINT p);
        [DllImport("user32.dll")]internal static extern short GetAsyncKeyState(int key);
        [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern int GetClassName(IntPtr h,StringBuilder s,int max);
        [DllImport("dwmapi.dll")]internal static extern int DwmSetWindowAttribute(IntPtr h,int a,ref int v,int s);
        internal static string Class(IntPtr h){var s=new StringBuilder(128);GetClassName(h,s,128);return s.ToString();}
        internal static bool OpaqueIfLayered(IntPtr window,bool raised){if(!raised)return true;uint key,flags;byte alpha;return GetLayeredWindowAttributes(window,out key,out alpha,out flags)&&(flags&2)!=0&&alpha==255;}
        internal static bool FillsPrimaryScreen(IntPtr window){RECT rect;var screen=Screen.PrimaryScreen;if(screen==null||!GetWindowRect(window,out rect))return false;var bounds=screen.Bounds;return Math.Abs(rect.Left-bounds.Left)<=2&&Math.Abs(rect.Top-bounds.Top)<=2&&Math.Abs(rect.Right-bounds.Right)<=2&&Math.Abs(rect.Bottom-bounds.Bottom)<=2;}
        internal static IntPtr Icons(IntPtr parent){return parent!=IntPtr.Zero&&IsWindow(parent)?FindWindowEx(parent,IntPtr.Zero,"SHELLDLL_DefView",null):IntPtr.Zero;}
        internal static bool Before(IntPtr front,IntPtr back){
            if(front==IntPtr.Zero||back==IntPtr.Zero||front==back||GetParent(front)!=GetParent(back))return false;
            int count=0;for(var h=GetWindow(front,2);h!=IntPtr.Zero&&count++<2000;h=GetWindow(h,2))if(h==back)return true;return false;
        }
        internal static bool SafePlacement(IntPtr window,IntPtr parent,IntPtr icons,IntPtr worker,bool raised){
            if(!IsWindow(window)||!IsWindow(parent)||GetParent(window)!=parent)return false;
            long style=GetWindowLongPtr(window,-16).ToInt64(),ex=GetWindowLongPtr(window,-20).ToInt64();
            if((style&0x40000000L)==0||(ex&0x8L)!=0)return false;
            if(raised)return Class(parent)=="Progman"&&Class(icons)=="SHELLDLL_DefView"&&Class(worker)=="WorkerW"&&GetParent(icons)==parent&&GetParent(worker)==parent&&Before(icons,window)&&Before(window,worker);
            return Class(parent)=="WorkerW"&&Class(icons)=="SHELLDLL_DefView"&&Before(GetParent(icons),parent);
        }
        internal static bool DesktopLayer(out IntPtr parent,out IntPtr after,out IntPtr wallpaperWorker,out bool layered,bool create=true){
            parent=IntPtr.Zero;after=IntPtr.Zero;wallpaperWorker=IntPtr.Zero;layered=false;
            IntPtr prog=FindWindow("Progman",null);if(prog==IntPtr.Zero)return false;
            if(create){IntPtr result;SendMessageTimeout(prog,0x052C,new IntPtr(0xD),IntPtr.Zero,2,1000,out result);SendMessageTimeout(prog,0x052C,new IntPtr(0xD),new IntPtr(1),2,1000,out result);}
            IntPtr icons=FindWindowEx(prog,IntPtr.Zero,"SHELLDLL_DefView",null),worker=FindWindowEx(prog,IntPtr.Zero,"WorkerW",null);
            // Windows 11 raised-desktop layout: our opaque child is below icons
            // but above Windows' original wallpaper. Never change that wallpaper.
            if(icons!=IntPtr.Zero&&worker!=IntPtr.Zero&&Before(icons,worker)){parent=prog;after=icons;wallpaperWorker=worker;layered=true;return true;}
            IntPtr found=IntPtr.Zero,iconView=IntPtr.Zero;
            EnumWindows((h,p)=>{IntPtr view=FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null);if(view!=IntPtr.Zero){found=FindWindowEx(IntPtr.Zero,h,"WorkerW",null);iconView=view;return false;}return true;},IntPtr.Zero);
            if(found!=IntPtr.Zero&&iconView!=IntPtr.Zero){uint a,b;GetWindowThreadProcessId(prog,out a);GetWindowThreadProcessId(found,out b);if(a==b&&Before(GetParent(iconView),found)){parent=found;after=iconView;wallpaperWorker=found;return true;}}return false;
        }
    }
}

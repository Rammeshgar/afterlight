using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly:System.Reflection.AssemblyVersion("1.8.0.0")]
[assembly:System.Reflection.AssemblyFileVersion("1.8.0.0")]
[assembly:System.Reflection.AssemblyTitle("Afterlight Setup")]
[assembly:System.Reflection.AssemblyProduct(Afterlight.Setup.BuildMetadata.AppName)]
[assembly:System.Reflection.AssemblyCompany("Sadeq Rezai")]
[assembly:System.Reflection.AssemblyDescription("Per-user installer for Afterlight interactive pixel worlds")]

namespace Afterlight.Setup {
    internal static class SetupProgram {
        internal const string WebViewDownload="https://developer.microsoft.com/microsoft-edge/webview2/#download-section";
        internal const string FrameworkDownload="https://dotnet.microsoft.com/download/dotnet-framework/net48";
        [STAThread]static void Main(string[] args){
            if(Array.IndexOf(args,"--check")>=0){try{Payload.Load();Environment.ExitCode=0;}catch{Environment.ExitCode=1;}return;}
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            try{
                bool uninstall=Array.IndexOf(args,"--uninstall")>=0||String.Equals(Path.GetFileName(Application.ExecutablePath),"Uninstall.exe",StringComparison.OrdinalIgnoreCase),helper=Array.IndexOf(args,"--uninstall-helper")>=0;
                if(uninstall&&!helper){LaunchUninstallHelper();return;}
                bool owner;
                using(var gate=new Mutex(true,BuildMetadata.SetupMutex,out owner)){
                    if(!owner){MessageBox.Show("Afterlight Setup is already open.","Afterlight",MessageBoxButtons.OK,MessageBoxIcon.Information);return;}
                    try{
                        var package=Payload.Load();var context=InstallContext.ForUser();
                        using(var form=new SetupWindow(context,package,uninstall||helper)){
                            bool missingPreview=Array.IndexOf(args,"--render-prerequisite-preview")>=0;
                            if(Array.IndexOf(args,"--render-preview")>=0||missingPreview){
                                // Materialise native child controls without showing or
                                // activating a window on the user's desktop.
                                form.ShowInTaskbar=false;form.Opacity=0;form.StartPosition=FormStartPosition.Manual;form.Location=new Point(-32000,-32000);form.Show();Application.DoEvents();
                                if(missingPreview)form.PreviewMissingRuntime();
                                using(var bitmap=new Bitmap(form.Width,form.Height)){form.DrawToBitmap(bitmap,new Rectangle(0,0,bitmap.Width,bitmap.Height));bitmap.Save(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,missingPreview?"Afterlight-Setup-prerequisite-preview.png":"Afterlight-Setup-preview.png"),System.Drawing.Imaging.ImageFormat.Png);}form.Hide();return;
                            }
                            Application.Run(form);
                        }
                    }finally{gate.ReleaseMutex();}
                }
            }catch(Exception ex){MessageBox.Show("Setup could not continue.\n\n"+ex.Message+"\n\nYour appearance settings have not been deleted.","Afterlight Setup",MessageBoxButtons.OK,MessageBoxIcon.Error);Environment.ExitCode=1;}
        }
        static void LaunchUninstallHelper(){
            var context=InstallContext.ForUser();
            string expected=Path.Combine(context.Root,"Uninstall.exe");
            if(!SafeFiles.Same(Application.ExecutablePath,expected))throw new IOException("Open Uninstall Afterlight from the Start menu or Windows Settings → Apps.");
            string directory=Path.Combine(Path.GetTempPath(),"Afterlight-Uninstall-"+Guid.NewGuid().ToString("N"));SafeFiles.NoReparse(directory);Directory.CreateDirectory(directory);
            string helper=Path.Combine(directory,"Afterlight-Uninstall.exe");File.Copy(Application.ExecutablePath,helper,false);
            // This private temporary copy can remove the installed uninstaller
            // without shell commands, process killing, or a reboot.
            Process.Start(new ProcessStartInfo(helper,"--uninstall-helper"){UseShellExecute=false,WorkingDirectory=directory});
        }
        internal static bool IsAppRunning(){try{using(var mutex=Mutex.OpenExisting(BuildMetadata.AppMutex))return true;}catch(WaitHandleCannotBeOpenedException){return false;}}
        internal static bool HasFramework(){
            try{using(var machine=RegistryKey.OpenBaseKey(RegistryHive.LocalMachine,RegistryView.Registry32))using(var key=machine.OpenSubKey(@"SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full"))return key!=null&&Convert.ToInt32(key.GetValue("Release",0))>=528040;}catch{return false;}
        }
        internal static bool HasWebView(){
            const string path=@"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
            foreach(var hive in new[]{RegistryHive.CurrentUser,RegistryHive.LocalMachine})foreach(var view in new[]{RegistryView.Registry32,RegistryView.Registry64})try{
                using(var root=RegistryKey.OpenBaseKey(hive,view))using(var key=root.OpenSubKey(path)){
                    Version version;if(key!=null&&Version.TryParse(Convert.ToString(key.GetValue("pv")),out version)&&version>new Version(0,0,0,0))return true;
                }
            }catch(System.Security.SecurityException){}catch(UnauthorizedAccessException){}
            return false;
        }
        internal static bool IsSupportedWindows(){var info=new OsVersionInfo();info.Size=Marshal.SizeOf(info);return Environment.Is64BitOperatingSystem&&RtlGetVersion(ref info)==0&&info.Major>=10&&info.Build>=19041;}
        internal static void OpenOfficial(string url){Process.Start(new ProcessStartInfo(url){UseShellExecute=true});}
        [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct OsVersionInfo {internal int Size,Major,Minor,Build,Platform;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)]internal string ServicePack;}
        [DllImport("ntdll.dll",CharSet=CharSet.Unicode)]static extern int RtlGetVersion(ref OsVersionInfo info);
    }
    internal sealed class HeaderArt:Panel {
        internal HeaderArt(){DoubleBuffered=true;Height=128;Dock=DockStyle.Top;AccessibleRole=AccessibleRole.Graphic;AccessibleName="Afterlight night skyline";}
        protected override void OnPaint(PaintEventArgs e){
            var g=e.Graphics;g.SmoothingMode=SmoothingMode.None;
            using(var fill=new LinearGradientBrush(ClientRectangle,Color.FromArgb(19,39,65),Color.FromArgb(14,24,42),0f))g.FillRectangle(fill,ClientRectangle);
            using(var star=new SolidBrush(Color.FromArgb(125,190,195)))for(int i=0;i<45;i++){int x=(i*131+59)%Math.Max(1,Width),y=18+(i*43)%115;g.FillRectangle(star,x,y,i%7==0?3:2,2);}
            using(var block=new SolidBrush(Color.FromArgb(22,49,65)))for(int i=0;i<20;i++)g.FillRectangle(block,Width-300+i*18,100-(i*31%53),15,70);
            using(var warm=new SolidBrush(Color.FromArgb(236,191,112)))for(int i=0;i<28;i++)g.FillRectangle(warm,Width-283+(i*47)%270,88+(i*13)%63,3,4);
            using(var line=new Pen(Color.FromArgb(77,150,150),2))g.DrawLine(line,0,Height-1,Width,Height-1);
            using(var title=new Font("Segoe UI",30,FontStyle.Bold))using(var light=new SolidBrush(Color.FromArgb(241,239,226)))g.DrawString(BuildMetadata.AppName,title,light,30,28);
            using(var font=new Font("Segoe UI",11,FontStyle.Regular))using(var teal=new SolidBrush(Color.FromArgb(163,219,205)))g.DrawString("A small escape. A living desktop.",font,teal,34,94);
        }
    }
    internal sealed class SetupWindow:Form {
        readonly InstallContext context;readonly Payload package;readonly InstallEngine engine;readonly bool uninstall;
        readonly Label title=new Label(),body=new Label(),requirements=new Label(),status=new Label();
        readonly CheckBox desktop=new CheckBox(),launch=new CheckBox();
        readonly Button main=new Button(),cancel=new Button(),retry=new Button();
        readonly LinkLabel download=new LinkLabel();readonly ProgressBar progress=new ProgressBar();
        bool busy,finished;string missingUrl;RemovalResult removal;
        internal SetupWindow(InstallContext context,Payload package,bool uninstall){
            this.context=context;this.package=package;this.uninstall=uninstall;engine=new InstallEngine(context,package);
            AutoScaleMode=AutoScaleMode.None;Text=uninstall?"Remove "+BuildMetadata.AppName:BuildMetadata.AppName+" Setup";ClientSize=new Size(700,530);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;MinimizeBox=true;StartPosition=FormStartPosition.CenterScreen;
            BackColor=Color.FromArgb(14,24,36);ForeColor=Color.FromArgb(237,238,230);Font=new Font("Segoe UI",10);
            using(var stream=System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream("Afterlight.Icon.ico"))Icon=new Icon(stream);
            Controls.Add(new HeaderArt());
            title.SetBounds(32,151,636,34);title.Font=new Font("Segoe UI",17,FontStyle.Bold);title.Text=uninstall?"Remove Afterlight?":"Your desktop, somewhere new.";Controls.Add(title);
            body.SetBounds(34,193,630,52);body.ForeColor=Color.FromArgb(187,202,205);body.Text=uninstall?"This removes the installed app and its shortcuts. Your saved appearance settings stay on this PC so you can return later.":"Nine interactive worlds, now with the Seneschal collection. Colours, weather, music-reactive light and rotation. No account, subscription or Docker.";Controls.Add(body);
            desktop.SetBounds(34,257,630,25);desktop.Text="Create a desktop shortcut";desktop.Checked=true;desktop.AccessibleDescription="Add an Afterlight icon to your Windows desktop.";desktop.Visible=!uninstall;Controls.Add(desktop);
            launch.SetBounds(34,285,630,25);launch.Text="Open Afterlight when setup finishes";launch.Checked=true;launch.Visible=!uninstall;Controls.Add(launch);
            var location=new Label{Left=34,Top=327,Width=630,Height=20,ForeColor=Color.FromArgb(146,171,183),Text="Only for your Windows account · no administrator access"};Controls.Add(location);
            var folder=new Label{Left=34,Top=348,Width=630,Height=20,ForeColor=Color.FromArgb(146,171,183),AutoEllipsis=true,Font=new Font("Segoe UI",9),Text=context.Root};Controls.Add(folder);
            requirements.SetBounds(34,376,510,22);requirements.Font=new Font("Segoe UI",9);Controls.Add(requirements);
            download.SetBounds(34,401,500,22);download.LinkColor=Color.FromArgb(151,225,209);download.ActiveLinkColor=Color.White;download.VisitedLinkColor=download.LinkColor;download.LinkClicked+=(s,e)=>{try{SetupProgram.OpenOfficial(missingUrl);}catch(Exception ex){MessageBox.Show(this,ex.Message,"Open Microsoft download",MessageBoxButtons.OK,MessageBoxIcon.Information);}};Controls.Add(download);
            retry.SetBounds(565,376,101,33);retry.Text="Check again";StyleButton(retry,false);retry.Click+=(s,e)=>RefreshRequirements();Controls.Add(retry);
            status.SetBounds(34,427,630,26);status.ForeColor=Color.FromArgb(169,202,199);status.Font=new Font("Segoe UI",9);Controls.Add(status);
            progress.SetBounds(34,459,630,5);progress.Style=ProgressBarStyle.Continuous;progress.Visible=false;Controls.Add(progress);
            var divider=new Panel{Left=0,Top=472,Width=700,Height=1,BackColor=Color.FromArgb(37,58,70)};Controls.Add(divider);
            var footer=new Label{Left=34,Top=489,Width=250,Height=22,Font=new Font("Segoe UI",9),ForeColor=Color.FromArgb(146,171,183),Text="Version "+package.Manifest.Version+" · Windows x64"};Controls.Add(footer);
            cancel.SetBounds(382,483,94,35);cancel.Text="Cancel";StyleButton(cancel,false);cancel.Click+=(s,e)=>Close();Controls.Add(cancel);
            main.SetBounds(488,483,176,35);main.Text=uninstall?"Remove Afterlight":File.Exists(Path.Combine(context.Root,"install.json"))?"Update Afterlight":"Install Afterlight";StyleButton(main,true);main.Click+=async(s,e)=>await Run();Controls.Add(main);
            AcceptButton=main;CancelButton=cancel;
            FormClosing+=(s,e)=>{if(busy)e.Cancel=true;};Shown+=(s,e)=>main.Focus();RefreshRequirements();
            // Apply scaling only after all baseline controls exist; doing this
            // earlier would enlarge the form but not subsequently added controls.
            AutoScaleDimensions=new SizeF(96f,96f);AutoScaleMode=AutoScaleMode.Dpi;
        }
        void StyleButton(Button button,bool primary){button.FlatStyle=FlatStyle.Flat;button.FlatAppearance.BorderColor=primary?Color.FromArgb(147,218,196):Color.FromArgb(67,93,107);button.BackColor=primary?Color.FromArgb(147,218,196):Color.FromArgb(22,37,50);button.ForeColor=primary?Color.FromArgb(10,36,36):Color.FromArgb(225,234,232);button.Cursor=Cursors.Hand;button.UseVisualStyleBackColor=false;}
        void RefreshRequirements(){
            download.Visible=false;retry.Visible=false;missingUrl=null;main.Enabled=true;
            if(uninstall){requirements.Text="Your Windows wallpaper and audio settings are not changed.";requirements.ForeColor=Color.FromArgb(163,219,205);return;}
            if(!SetupProgram.IsSupportedWindows()){requirements.Text="Requires Windows 10 (2004+) or Windows 11, 64-bit.";main.Enabled=false;requirements.ForeColor=Color.FromArgb(242,181,140);return;}
            if(!SetupProgram.HasFramework()){requirements.Text="Microsoft .NET Framework 4.8 is needed first.";missingUrl=SetupProgram.FrameworkDownload;download.Text="Open the official Microsoft .NET download";}
            else if(!SetupProgram.HasWebView()){requirements.Text="Microsoft Edge WebView2 Runtime is needed first.";missingUrl=SetupProgram.WebViewDownload;download.Text="Open the official Microsoft WebView2 download";}
            else{requirements.Text="Ready · .NET Framework and WebView2 are installed.";requirements.ForeColor=Color.FromArgb(163,219,205);status.Text="Works offline after prerequisites are installed. Audio listening starts off.";return;}
            requirements.ForeColor=Color.FromArgb(242,181,140);main.Enabled=false;download.Visible=retry.Visible=true;status.Text="Install the Microsoft prerequisite, then select Check again.";
        }
        internal void PreviewMissingRuntime(){requirements.Text="Microsoft Edge WebView2 Runtime is needed first.";requirements.ForeColor=Color.FromArgb(242,181,140);missingUrl=SetupProgram.WebViewDownload;download.Text="Open the official Microsoft WebView2 download";download.Visible=retry.Visible=true;main.Enabled=false;status.Text="Install the Microsoft prerequisite, then select Check again.";}
        async Task Run(){
            if(finished){
                if(!uninstall&&launch.Checked)try{Process.Start(new ProcessStartInfo(engine.AppPath){WorkingDirectory=Path.GetDirectoryName(engine.AppPath),UseShellExecute=false});}catch(Exception ex){MessageBox.Show(this,"Afterlight was installed, but it could not open.\n\n"+ex.Message,"Afterlight",MessageBoxButtons.OK,MessageBoxIcon.Information);}
                Close();return;
            }
            if(SetupProgram.IsAppRunning()){MessageBox.Show(this,"Afterlight is running.\n\nRight-click its icon beside the clock and choose Quit — restore normal desktop. Then return here and try again.\n\nSetup will not force-close your wallpaper.","Close Afterlight first",MessageBoxButtons.OK,MessageBoxIcon.Information);return;}
            if(uninstall&&MessageBox.Show(this,"Remove Afterlight and its shortcuts?\n\nYour appearance settings will be kept. Your saved Windows wallpaper will not be changed.","Remove Afterlight",MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)return;
            busy=true;main.Enabled=cancel.Enabled=desktop.Enabled=launch.Enabled=false;download.Visible=retry.Visible=false;progress.Visible=true;
            try{
                bool addDesktop=desktop.Checked;
                var report=new Progress<Tuple<int,string>>(update=>{progress.Value=update.Item1;status.Text=update.Item2;});
                Action<int,string> notify=(percent,message)=>((IProgress<Tuple<int,string>>)report).Report(Tuple.Create(percent,message));
                if(uninstall)removal=await Task.Run(()=>engine.Uninstall(notify));else await Task.Run(()=>engine.Install(Application.ExecutablePath,addDesktop,notify));
                finished=true;progress.Value=100;title.Text=uninstall?"Until next time.":"Welcome to Afterlight.";
                body.Text=uninstall?"Afterlight has been removed. Your saved appearance settings are still in your Windows user profile.":"Afterlight is installed. Open it from the desktop or Start menu. Choose a world, explore its interactions, then select Use as wallpaper. The tray icon brings settings back.";
                if(uninstall&&removal.PreservedFiles>0)body.Text+="\nSome changed or unrecognised files were preserved in the install folder.";
                desktop.Visible=false;launch.Enabled=true;status.Text=uninstall?"No settings, personal files, or Microsoft runtimes were removed.":"Your normal desktop icons stay accessible. Music listening is off by default.";requirements.Text="";main.Text=uninstall?"Close":"Finish";cancel.Visible=false;main.Enabled=true;
            }catch(Exception ex){status.Text="Setup stopped. Your settings have been kept.";MessageBox.Show(this,ex.Message,"Afterlight Setup",MessageBoxButtons.OK,MessageBoxIcon.Error);main.Enabled=cancel.Enabled=desktop.Enabled=launch.Enabled=true;Environment.ExitCode=1;}
            finally{busy=false;}
        }
        protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);try{int dark=1;DwmSetWindowAttribute(Handle,20,ref dark,4);int background=ColorTranslator.ToWin32(BackColor);DwmSetWindowAttribute(Handle,35,ref background,4);}catch(DllNotFoundException){}catch(EntryPointNotFoundException){}}
        [DllImport("dwmapi.dll")]static extern int DwmSetWindowAttribute(IntPtr window,int attribute,ref int value,int size);
    }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;

namespace Afterlight.Setup {
    internal sealed class TestIntegration:IIntegration {
        internal bool Installed,Captured,Removed,Restored,Fail,FailRestore;
        internal string App,Icon,Uninstaller;
        public void Capture(){Captured=true;}
        public void Install(string app,string uninstall,string icon,string version,bool desktop,long size){App=app;Icon=icon;Uninstaller=uninstall;Installed=true;if(Fail)throw new IOException("Simulated integration failure");}
        public void Restore(){Restored=true;if(FailRestore)throw new IOException("Simulated integration rollback failure");Installed=false;}
        public void Remove(InstallRecord record){Removed=true;Installed=false;}
    }
    internal static class InstallerTests {
        static int passed;
        static readonly List<string> checks=new List<string>();
        static void Assert(bool condition,string label){if(!condition)throw new Exception(label);passed++;checks.Add(label);Console.WriteLine("PASS "+label);}
        static void Refuses(Action action,string label){bool refused=false;try{action();}catch(IOException){refused=true;}Assert(refused,label);}
        static string Sandbox(){return Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"sandbox-"+Guid.NewGuid().ToString("N"));}
        static Payload NewPayload(Payload original,string version,string extra){
            var manifest=new JavaScriptSerializer().Deserialize<PayloadManifest>(new JavaScriptSerializer().Serialize(original.Manifest));manifest.Version=version;
            using(var output=new MemoryStream()){
                using(var zip=new ZipArchive(output,ZipArchiveMode.Create,true)){
                    foreach(var file in manifest.Files){var entry=zip.CreateEntry(file.Path);using(var source=new MemoryStream(original.Archive))using(var old=new ZipArchive(source,ZipArchiveMode.Read))using(var input=old.GetEntry(file.Path).Open())using(var target=entry.Open())input.CopyTo(target);}
                    if(extra!=null){var entry=zip.CreateEntry(extra);using(var writer=new StreamWriter(entry.Open()))writer.Write("unexpected");}
                }
                return new Payload(output.ToArray(),manifest);
            }
        }
        [STAThread]static int Main(){
            string report=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"installer-test-report.json");
            try{
                var payload=Payload.Load();Assert(payload.Manifest.Version==BuildMetadata.Version,"Embedded version matches release");
                Assert(payload.Manifest.Files.All(x=>!x.Path.Contains("Tests")&&!x.Path.Contains("log")&&!x.Path.Contains("profile")&&!x.Path.Contains("checks/")),"Payload excludes tests, logs, checks and browser profiles");
                Assert(payload.Manifest.Files.Select(x=>x.Path).Distinct(StringComparer.OrdinalIgnoreCase).Count()==payload.Manifest.Files.Length,"Payload has a unique explicit file manifest");
                Assert(new[]{"web/seneschal-art.js","web/seneschal-worlds.js","web/thumb-citylight.png","web/thumb-nocturne.png","web/thumb-lunar.png","web/thumb-foundry.png"}.All(path=>payload.Manifest.Files.Any(file=>file.Path==path)),"Expanded Seneschal runtime and four thumbnails are in the verified payload");
                string root=Sandbox();var integration=new TestIntegration();var context=InstallContext.ForTests(root,integration);var engine=new InstallEngine(context,payload);
                engine.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null);
                Assert(integration.Captured&&integration.Installed&&File.Exists(engine.AppPath),"Isolated install extracts verified app and invokes integration");
                Assert(payload.VerifyAt(Path.GetDirectoryName(engine.AppPath)),"Installed files match every SHA-256 and length");
                Assert(integration.App==engine.AppPath&&Directory.Exists(Path.GetDirectoryName(integration.App))&&File.Exists(integration.Icon),"Shortcut target, working folder and icon exist");
                string testShortcut=Path.Combine(root,"Afterlight-test.lnk");var shortcut=WindowsIntegration.SandboxShortcut(testShortcut,engine.AppPath,integration.Icon);
                Assert(SafeFiles.Same(shortcut["TargetPath"],engine.AppPath)&&SafeFiles.Same(shortcut["WorkingDirectory"],Path.GetDirectoryName(engine.AppPath))&&shortcut["IconLocation"].StartsWith(integration.Icon,StringComparison.OrdinalIgnoreCase),"Real Windows sandbox shortcut has valid target, working directory and custom icon");File.Delete(testShortcut);
                var backgroundShortcut=System.Threading.Tasks.Task.Run(()=>WindowsIntegration.SandboxShortcut(testShortcut,engine.AppPath,integration.Icon)).GetAwaiter().GetResult();Assert(SafeFiles.Same(backgroundShortcut["TargetPath"],engine.AppPath),"Real Windows shortcut integration works on the background installer thread");File.Delete(testShortcut);
                var installed=engine.ReadRecord();Assert(installed.Product==Payload.Product&&installed.Packages.Count==1&&installed.DesktopShortcut,"Per-user install record is complete");
                string recordPath=Path.Combine(root,"install.json");string validRecord=File.ReadAllText(recordPath);
                var malicious=new JavaScriptSerializer().Deserialize<InstallRecord>(validRecord);malicious.Packages[0].Directory="../outside";File.WriteAllText(recordPath,new JavaScriptSerializer().Serialize(malicious));Refuses(()=>engine.Uninstall(null),"Uninstall rejects a traversal directory in its installed record");File.WriteAllText(recordPath,validRecord);
                malicious=new JavaScriptSerializer().Deserialize<InstallRecord>(validRecord);malicious.Packages[0].Files[0].Path="../outside.txt";File.WriteAllText(recordPath,new JavaScriptSerializer().Serialize(malicious));Refuses(()=>engine.Uninstall(null),"Uninstall rejects a traversal file in its installed record");File.WriteAllText(recordPath,validRecord);
                malicious=new JavaScriptSerializer().Deserialize<InstallRecord>(validRecord);malicious.Root=Path.GetPathRoot(root);File.WriteAllText(recordPath,new JavaScriptSerializer().Serialize(malicious));Refuses(()=>engine.Uninstall(null),"Uninstall refuses a marker claiming a different or broad root");File.WriteAllText(recordPath,validRecord);
                malicious=new JavaScriptSerializer().Deserialize<InstallRecord>(validRecord);malicious.Product="UnrelatedApp";File.WriteAllText(recordPath,new JavaScriptSerializer().Serialize(malicious));Refuses(()=>engine.Uninstall(null),"Uninstall refuses another product's ownership marker");File.WriteAllText(recordPath,validRecord);Assert(payload.VerifyAt(Path.GetDirectoryName(engine.AppPath)),"Rejected malicious markers leave every installed app file intact");
                engine.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,false,null);
                Assert(engine.ReadRecord().Packages.Count==1&&!engine.ReadRecord().DesktopShortcut,"Same-build reinstall is idempotent and respects shortcut choice");
                var newer=NewPayload(payload,"9.9.9.9",null);var next=new InstallEngine(context,newer);next.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null);
                Assert(next.ReadRecord().Packages.Count==2&&File.Exists(engine.AppPath)&&File.Exists(next.AppPath),"Versioned update retains previous app safely and switches current record");
                Refuses(()=>engine.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null),"An older installer cannot silently downgrade the current release");
                string personal=Path.Combine(root,"my-personal-note.txt");File.WriteAllText(personal,"keep me");
                var remove=next.Uninstall(null);Assert(integration.Removed&&!File.Exists(engine.AppPath)&&!File.Exists(next.AppPath),"Uninstall removes all owned versions and integration");
                Assert(File.ReadAllText(personal)=="keep me"&&!File.Exists(Path.Combine(root,"install.json")),"Uninstall preserves unrelated personal files");
                File.Delete(personal);Directory.Delete(root,false);

                root=Sandbox();integration=new TestIntegration{Fail=true};context=InstallContext.ForTests(root,integration);engine=new InstallEngine(context,payload);
                Refuses(()=>engine.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null),"Simulated shortcut or registry failure stops install");
                Assert(integration.Restored&&!Directory.Exists(root),"Failed first install rolls back app, marker and integration");

                root=Sandbox();integration=new TestIntegration{Fail=true,FailRestore=true};context=InstallContext.ForTests(root,integration);engine=new InstallEngine(context,payload);
                string rollbackMessage=null;try{engine.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null);}catch(IOException ex){rollbackMessage=ex.Message;}
                Assert(rollbackMessage!=null&&rollbackMessage.Contains("some rollback steps could not finish")&&rollbackMessage.Contains("Simulated integration failure")&&rollbackMessage.Contains("Simulated integration rollback failure"),"Rollback failure reports both original and cleanup errors honestly");
                Assert(!Directory.Exists(root),"Throwing integration rollback does not skip independent filesystem restoration");

                root=Sandbox();integration=new TestIntegration();context=InstallContext.ForTests(root,integration);engine=new InstallEngine(context,payload);engine.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null);
                byte[] recordBefore=File.ReadAllBytes(Path.Combine(root,"install.json"));integration.Fail=true;next=new InstallEngine(context,newer);
                Refuses(()=>next.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null),"Simulated update integration failure stops update");
                Assert(File.Exists(engine.AppPath)&&File.ReadAllBytes(Path.Combine(root,"install.json")).SequenceEqual(recordBefore)&&!Directory.Exists(Path.GetDirectoryName(next.AppPath)),"Failed update restores previous record and app");
                integration.Fail=false;string changed=Path.Combine(Path.GetDirectoryName(engine.AppPath),"web","icon.svg");File.AppendAllText(changed,"modified");remove=engine.Uninstall(null);
                Assert(File.Exists(changed)&&remove.PreservedFiles>0,"Uninstall preserves modified app files rather than deleting them");
                File.Delete(changed);Directory.Delete(Path.GetDirectoryName(changed),false);Directory.Delete(Path.GetDirectoryName(engine.AppPath),false);Directory.Delete(root,false);

                root=Sandbox();Directory.CreateDirectory(root);File.WriteAllText(Path.Combine(root,"unrelated.txt"),"keep");engine=new InstallEngine(InstallContext.ForTests(root,new TestIntegration()),payload);
                Refuses(()=>engine.Install(System.Reflection.Assembly.GetExecutingAssembly().Location,true,null),"Existing unrecognised install folder is never overwritten");
                File.Delete(Path.Combine(root,"unrelated.txt"));Directory.Delete(root,false);

                foreach(string bad in new[]{"../escape.txt","web/../../escape.txt","/absolute.txt","C:/absolute.txt","web\\escape.txt","web/CON.txt","web/trailing.","web/file:stream","web//empty","web/./dot"})Refuses(()=>SafeFiles.Child(AppDomain.CurrentDomain.BaseDirectory,bad),"Reject unsafe archive path "+bad);
                string unsafeRoot=Path.GetPathRoot(AppDomain.CurrentDomain.BaseDirectory);Refuses(()=>InstallContext.ForTests(unsafeRoot,new TestIntegration()),"Test harness cannot target drive root or an arbitrary install path");
                var injected=NewPayload(payload,payload.Manifest.Version,"../escape.txt");root=Sandbox();Refuses(()=>injected.Extract(root,null),"ZIP entry absent from allowlist is refused");Assert(!File.Exists(Path.Combine(Path.GetDirectoryName(root),"escape.txt")),"Archive path traversal cannot create an outside file");if(Directory.Exists(root))Directory.Delete(root,false);

                Assert(SetupProgram.HasFramework(),"Host .NET Framework 4.8 prerequisite detection works");Assert(SetupProgram.HasWebView(),"Host WebView2 prerequisite detection works");Assert(SetupProgram.IsSupportedWindows(),"Host supported Windows prerequisite detection works");
                File.WriteAllText(report,new JavaScriptSerializer().Serialize(new{success=true,passed=passed,checks=checks,realUserInstallModified=false,registryModified=false,shortcutsModified=false,settingsModified=false,utc=DateTime.UtcNow.ToString("o")}));Console.WriteLine("Installer tests passed: "+passed);return 0;
            }catch(Exception ex){File.WriteAllText(report,new JavaScriptSerializer().Serialize(new{success=false,passed=passed,error=ex.ToString(),checks=checks}));Console.Error.WriteLine(ex);return 1;}
        }
    }
}

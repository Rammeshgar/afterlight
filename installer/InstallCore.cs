using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;
using Microsoft.Win32;

namespace Afterlight.Setup {
    public sealed class PayloadFile {
        public string Path { get; set; }
        public string Sha256 { get; set; }
        public long Length { get; set; }
    }
    public sealed class PayloadManifest {
        public string Product { get; set; }
        public string Version { get; set; }
        public PayloadFile[] Files { get; set; }
    }
    public sealed class InstalledPackage {
        public string Directory { get; set; }
        public string Version { get; set; }
        public PayloadFile[] Files { get; set; }
    }
    public sealed class InstallRecord {
        public string Product { get; set; }
        public string Root { get; set; }
        public string Version { get; set; }
        public string CurrentDirectory { get; set; }
        public string UninstallerSha256 { get; set; }
        public string IconSha256 { get; set; }
        public bool DesktopShortcut { get; set; }
        public List<InstalledPackage> Packages { get; set; }
    }
    public sealed class RemovalResult {
        public int RemovedFiles;
        public int PreservedFiles;
    }
    internal static class SafeFiles {
        internal static readonly StringComparison PathComparison=StringComparison.OrdinalIgnoreCase;
        internal static string Full(string path){return System.IO.Path.GetFullPath(path).TrimEnd(System.IO.Path.DirectorySeparatorChar);}
        internal static string Hash(byte[] bytes){using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-","");}
        internal static string HashFile(string path){using(var input=File.OpenRead(path))using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(input)).Replace("-","");}
        internal static bool Same(string a,string b){return String.Equals(Full(a),Full(b),PathComparison);}
        internal static string Child(string root,string relative){
            if(String.IsNullOrWhiteSpace(relative)||relative.IndexOf(':')>=0||relative.IndexOf('\\')>=0||relative.StartsWith("/",StringComparison.Ordinal)||relative.EndsWith("/",StringComparison.Ordinal))throw new IOException("Unsafe package path.");
            foreach(var segment in relative.Split('/')){
                if(segment=="."||segment==".."||segment.Length==0||segment.EndsWith(".",StringComparison.Ordinal)||segment.EndsWith(" ",StringComparison.Ordinal)||segment.IndexOfAny(System.IO.Path.GetInvalidFileNameChars())>=0)throw new IOException("Unsafe package path.");
                string device=segment.Split('.')[0].ToUpperInvariant();
                if(device=="CON"||device=="PRN"||device=="AUX"||device=="NUL"||System.Text.RegularExpressions.Regex.IsMatch(device,@"^(COM|LPT)[1-9]$"))throw new IOException("Reserved Windows package path.");
            }
            string full=Full(System.IO.Path.Combine(root,relative.Replace('/',System.IO.Path.DirectorySeparatorChar)));
            if(!full.StartsWith(Full(root)+System.IO.Path.DirectorySeparatorChar,PathComparison))throw new IOException("Package path escapes its destination.");
            NoReparse(full);
            return full;
        }
        internal static void NoReparse(string path){
            string current=Full(path);
            while(!String.IsNullOrEmpty(current)){
                if((Directory.Exists(current)||File.Exists(current))&&(File.GetAttributes(current)&FileAttributes.ReparsePoint)!=0)throw new IOException("A linked or redirected installation path is not supported.");
                current=System.IO.Path.GetDirectoryName(current);
            }
        }
        internal static void WriteAtomic(string path,byte[] bytes){
            NoReparse(path);string temporary=path+".new-"+Guid.NewGuid().ToString("N");
            try{File.WriteAllBytes(temporary,bytes);if(File.Exists(path))File.Replace(temporary,path,null);else File.Move(temporary,path);}
            finally{if(File.Exists(temporary))File.Delete(temporary);}
        }
        internal static void Restore(string path,byte[] previous){if(previous==null){if(File.Exists(path))File.Delete(path);}else WriteAtomic(path,previous);}
        internal static void EmptyDirectories(string root,IEnumerable<string> relativeFiles){
            var directories=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach(string relative in relativeFiles){string directory=System.IO.Path.GetDirectoryName(Child(root,relative));while(!Same(directory,root)&&directory.StartsWith(Full(root)+System.IO.Path.DirectorySeparatorChar,PathComparison)){directories.Add(directory);directory=System.IO.Path.GetDirectoryName(directory);}}
            foreach(string directory in directories.OrderByDescending(x=>x.Length))if(Directory.Exists(directory)&&!Directory.EnumerateFileSystemEntries(directory).Any()){NoReparse(directory);Directory.Delete(directory,false);}
            if(Directory.Exists(root)&&!Directory.EnumerateFileSystemEntries(root).Any()){NoReparse(root);Directory.Delete(root,false);}
        }
        internal static int CountPreserved(string root){
            int count=0;var pending=new Stack<string>();pending.Push(root);
            while(pending.Count>0)foreach(string path in Directory.EnumerateFileSystemEntries(pending.Pop())){
                var attributes=File.GetAttributes(path);
                if((attributes&FileAttributes.ReparsePoint)!=0){count++;continue;}
                if((attributes&FileAttributes.Directory)!=0)pending.Push(path);else count++;
            }
            return count;
        }
    }
    internal sealed class Payload {
        internal const string Product=BuildMetadata.Product;
        internal readonly byte[] Archive;
        internal readonly PayloadManifest Manifest;
        internal string PackageName {get{return "app-"+Manifest.Version+"-"+BuildMetadata.PayloadSha256.Substring(0,12).ToLowerInvariant();}}
        internal Payload(byte[] archive,PayloadManifest manifest){Archive=archive;Manifest=manifest;ValidateManifest();}
        internal static Payload Load(){
            var assembly=Assembly.GetExecutingAssembly();byte[] archive;
            using(var input=assembly.GetManifestResourceStream("Afterlight.Payload.zip")){
                if(input==null)throw new IOException("The installer payload is missing.");
                using(var buffer=new MemoryStream()){input.CopyTo(buffer);archive=buffer.ToArray();}
            }
            if(SafeFiles.Hash(archive)!=BuildMetadata.PayloadSha256)throw new IOException("The installer is damaged. Download a new copy from the original release.");
            PayloadManifest manifest;
            using(var input=assembly.GetManifestResourceStream("Afterlight.Payload.json"))using(var reader=new StreamReader(input,Encoding.UTF8))manifest=new JavaScriptSerializer().Deserialize<PayloadManifest>(reader.ReadToEnd());
            if(manifest.Version!=BuildMetadata.Version)throw new IOException("Package version mismatch.");
            return new Payload(archive,manifest);
        }
        void ValidateManifest(){
            if(Manifest==null||Manifest.Product!=Product||Manifest.Files==null||Manifest.Files.Length<10||Manifest.Files.Length>100)throw new IOException("Invalid package manifest.");
            Version version;if(!System.Version.TryParse(Manifest.Version,out version))throw new IOException("Invalid package version.");
            var paths=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach(var file in Manifest.Files){
                SafeFiles.Child(System.IO.Path.GetTempPath(),file.Path);
                if(!paths.Add(file.Path)||file.Length<0||file.Length>50*1024*1024||file.Sha256==null||!System.Text.RegularExpressions.Regex.IsMatch(file.Sha256,"^[A-F0-9]{64}$"))throw new IOException("Invalid package file entry.");
            }
            if(!paths.Contains(BuildMetadata.Executable)||!paths.Contains("Afterlight.ico")||!paths.Contains("web/index.html"))throw new IOException("The package is incomplete.");
        }
        internal void Extract(string destination,Action<int,string> progress){
            SafeFiles.NoReparse(destination);Directory.CreateDirectory(destination);
            var expected=Manifest.Files.ToDictionary(x=>x.Path,StringComparer.OrdinalIgnoreCase);
            var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using(var input=new MemoryStream(Archive,false))using(var zip=new ZipArchive(input,ZipArchiveMode.Read,false)){
                if(zip.Entries.Count!=expected.Count)throw new IOException("The package file count does not match its manifest.");
                foreach(var entry in zip.Entries){
                    PayloadFile file;
                    if(!expected.TryGetValue(entry.FullName,out file)||!seen.Add(entry.FullName)||entry.Length!=file.Length)throw new IOException("Unexpected or invalid package entry.");
                    string path=SafeFiles.Child(destination,file.Path);Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path));
                    using(var source=entry.Open())using(var target=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None)){
                        byte[] buffer=new byte[81920];int read;long length=0;
                        while((read=source.Read(buffer,0,buffer.Length))>0){length+=read;if(length>file.Length)throw new IOException("Package entry is larger than its manifest.");target.Write(buffer,0,read);}
                        if(length!=file.Length)throw new IOException("Incomplete package entry.");
                    }
                    if(SafeFiles.HashFile(path)!=file.Sha256)throw new IOException("Package integrity check failed: "+file.Path);
                    if(progress!=null)progress(10+seen.Count*55/expected.Count,"Verifying "+file.Path);
                }
            }
        }
        internal bool VerifyAt(string directory){
            foreach(var file in Manifest.Files){string path=SafeFiles.Child(directory,file.Path);if(!File.Exists(path)||new FileInfo(path).Length!=file.Length||SafeFiles.HashFile(path)!=file.Sha256)return false;}return true;
        }
    }
    internal interface IIntegration {
        void Capture();
        void Install(string appPath,string uninstallPath,string iconPath,string version,bool desktop,long size);
        void Restore();
        void Remove(InstallRecord record);
    }
    internal sealed class InstallContext {
        internal readonly string Root;
        internal readonly IIntegration Integration;
        internal readonly bool Sandbox;
        InstallContext(string root,IIntegration integration,bool sandbox){Root=SafeFiles.Full(root);Integration=integration;Sandbox=sandbox;SafeFiles.NoReparse(Root);}
        internal static InstallContext ForUser(){return new InstallContext(System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs",BuildMetadata.AppFolder),new WindowsIntegration(),false);}
        internal static InstallContext ForTests(string root,IIntegration integration){
            string parent=SafeFiles.Full(AppDomain.CurrentDomain.BaseDirectory);
            if(!SafeFiles.Full(root).StartsWith(parent+System.IO.Path.DirectorySeparatorChar,SafeFiles.PathComparison)||!System.IO.Path.GetFileName(root).StartsWith("sandbox-",StringComparison.Ordinal))throw new IOException("Test destination must be an isolated installer sandbox.");
            return new InstallContext(root,integration,true);
        }
        internal void Guard(){
            if(!Sandbox&&!SafeFiles.Same(Root,System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs",BuildMetadata.AppFolder)))throw new IOException("Unexpected installation destination.");
            SafeFiles.NoReparse(Root);
        }
    }
    internal sealed class InstallEngine {
        readonly InstallContext context;
        readonly Payload payload;
        internal InstallEngine(InstallContext target,Payload package){context=target;payload=package;context.Guard();}
        internal string AppPath {get{return System.IO.Path.Combine(context.Root,payload.PackageName,BuildMetadata.Executable);}}
        internal InstallRecord ReadRecord(){
            string path=System.IO.Path.Combine(context.Root,"install.json");
            if(!File.Exists(path)){
                if(Directory.Exists(context.Root)&&Directory.EnumerateFileSystemEntries(context.Root).Any())throw new IOException("The Afterlight installation folder already contains unrecognised files. Setup will not overwrite them.");
                return null;
            }
            SafeFiles.NoReparse(path);
            InstallRecord record;
            try{record=new JavaScriptSerializer().Deserialize<InstallRecord>(File.ReadAllText(path,Encoding.UTF8));}catch(Exception ex){throw new IOException("The installation record is damaged. No files have been removed.",ex);}
            if(record==null||record.Product!=Payload.Product||!SafeFiles.Same(record.Root,context.Root)||record.Packages==null||record.Packages.Count>50)throw new IOException("This folder is not a recognised Afterlight installation.");
            var packageNames=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach(var package in record.Packages){
                if(package.Directory==null||!System.Text.RegularExpressions.Regex.IsMatch(package.Directory,@"^app-[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+-[a-f0-9]{12}$")||!packageNames.Add(package.Directory)||package.Files==null||package.Files.Length>100)throw new IOException("Unsafe installation record.");
                string directory=SafeFiles.Child(context.Root,package.Directory);
                foreach(var file in package.Files){SafeFiles.Child(directory,file.Path);if(file.Sha256==null||!System.Text.RegularExpressions.Regex.IsMatch(file.Sha256,"^[A-F0-9]{64}$"))throw new IOException("Invalid installed file checksum.");}
            }
            if(!packageNames.Contains(record.CurrentDirectory))throw new IOException("The current installation record is inconsistent.");
            return record;
        }
        internal void Install(string installerPath,bool desktop,Action<int,string> progress){
            context.Guard();var previous=ReadRecord();
            Version installedVersion;
            if(previous!=null&&(!System.Version.TryParse(previous.Version,out installedVersion)||installedVersion>System.Version.Parse(payload.Manifest.Version)))throw new IOException("A newer Afterlight version is already installed. Setup will not switch it to an older build.");
            string folder=SafeFiles.Child(context.Root,payload.PackageName);
            string staging=System.IO.Path.Combine(System.IO.Path.GetDirectoryName(context.Root),"."+BuildMetadata.AppFolder+"-stage-"+Guid.NewGuid().ToString("N"));
            string uninstaller=System.IO.Path.Combine(context.Root,"Uninstall.exe");
            string icon=System.IO.Path.Combine(context.Root,"Afterlight.ico");
            string recordPath=System.IO.Path.Combine(context.Root,"install.json");
            byte[] previousUninstaller=File.Exists(uninstaller)?File.ReadAllBytes(uninstaller):null;
            byte[] previousIcon=File.Exists(icon)?File.ReadAllBytes(icon):null;
            byte[] previousRecord=File.Exists(recordPath)?File.ReadAllBytes(recordPath):null;
            bool installedNew=false,committed=false,integrationCaptured=false,rollbackIncomplete=false;
            try{
                if(Directory.Exists(folder)){
                    if(previous==null||!previous.Packages.Any(x=>x.Directory==payload.PackageName)||!payload.VerifyAt(folder))throw new IOException("The existing app files have changed. Setup stopped to preserve those files; uninstall or repair that installation first.");
                }else{
                    payload.Extract(staging,progress);Directory.CreateDirectory(context.Root);SafeFiles.NoReparse(context.Root);Directory.Move(staging,folder);installedNew=true;
                }
                if(progress!=null)progress(72,"Creating your app shortcuts");
                var record=previous??new InstallRecord{Product=Payload.Product,Root=context.Root,Packages=new List<InstalledPackage>()};
                record.Version=payload.Manifest.Version;record.CurrentDirectory=payload.PackageName;record.DesktopShortcut=desktop;
                if(!record.Packages.Any(x=>x.Directory==payload.PackageName))record.Packages.Add(new InstalledPackage{Directory=payload.PackageName,Version=payload.Manifest.Version,Files=payload.Manifest.Files});
                byte[] setupBytes=File.ReadAllBytes(installerPath);
                SafeFiles.WriteAtomic(uninstaller,setupBytes);SafeFiles.WriteAtomic(icon,File.ReadAllBytes(System.IO.Path.Combine(folder,"Afterlight.ico")));
                record.UninstallerSha256=SafeFiles.Hash(setupBytes);record.IconSha256=SafeFiles.HashFile(icon);
                context.Integration.Capture();integrationCaptured=true;
                context.Integration.Install(AppPath,uninstaller,icon,record.Version,desktop,payload.Manifest.Files.Sum(x=>x.Length)+setupBytes.LongLength);
                SafeFiles.WriteAtomic(recordPath,Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(record)));
                committed=true;if(progress!=null)progress(100,"Afterlight is ready");
            }catch(Exception original){
                var errors=new List<Exception>();
                // Shell integration and filesystem restoration are independent:
                // failure in one must not skip the remaining rollback steps.
                if(integrationCaptured)AttemptRollback(()=>context.Integration.Restore(),errors);
                if(Directory.Exists(context.Root)){
                    AttemptRollback(()=>SafeFiles.Restore(uninstaller,previousUninstaller),errors);
                    AttemptRollback(()=>SafeFiles.Restore(icon,previousIcon),errors);
                    AttemptRollback(()=>SafeFiles.Restore(recordPath,previousRecord),errors);
                }
                if(installedNew)AttemptRollback(()=>DeletePackage(folder,payload.Manifest.Files),errors);
                AttemptRollback(()=>{if(Directory.Exists(context.Root)&&!Directory.EnumerateFileSystemEntries(context.Root).Any())Directory.Delete(context.Root,false);},errors);
                if(errors.Count>0){rollbackIncomplete=true;errors.Insert(0,original);throw new IOException("Setup stopped, and some rollback steps could not finish. Your saved appearance settings were not touched.\n\nInstallation folder: "+context.Root+"\n\n"+String.Join("\n",errors.Select(x=>x.Message)),new AggregateException(errors));}
                throw;
            }finally{
                if(Directory.Exists(staging))try{DeletePackage(staging,payload.Manifest.Files);}catch(IOException){rollbackIncomplete=true;}catch(UnauthorizedAccessException){rollbackIncomplete=true;}
                if(!committed&&progress!=null)progress(0,rollbackIncomplete?"Setup stopped; some setup files or shortcuts may need attention":"Setup stopped; your saved appearance settings were not touched");
            }
        }
        static void AttemptRollback(Action action,List<Exception> errors){try{action();}catch(Exception error){errors.Add(error);}}
        static RemovalResult DeletePackage(string folder,IEnumerable<PayloadFile> files){
            var result=new RemovalResult();SafeFiles.NoReparse(folder);
            foreach(var file in files){string path=SafeFiles.Child(folder,file.Path);if(!File.Exists(path))continue;if(SafeFiles.HashFile(path)==file.Sha256){File.Delete(path);result.RemovedFiles++;}else result.PreservedFiles++;}
            SafeFiles.EmptyDirectories(folder,files.Select(x=>x.Path));
            if(Directory.Exists(folder))result.PreservedFiles=SafeFiles.CountPreserved(folder);
            return result;
        }
        internal RemovalResult Uninstall(Action<int,string> progress){
            context.Guard();var record=ReadRecord();if(record==null)throw new IOException("Afterlight is not installed for this Windows account.");
            var result=new RemovalResult();int done=0;
            foreach(var package in record.Packages){
                string folder=SafeFiles.Child(context.Root,package.Directory);
                if(Directory.Exists(folder)){var removed=DeletePackage(folder,package.Files);result.RemovedFiles+=removed.RemovedFiles;result.PreservedFiles+=removed.PreservedFiles;}
                done++;if(progress!=null)progress(done*75/record.Packages.Count,"Removing app files");
            }
            context.Integration.Remove(record);
            foreach(var pair in new[]{new KeyValuePair<string,string>("Uninstall.exe",record.UninstallerSha256),new KeyValuePair<string,string>("Afterlight.ico",record.IconSha256)}){
                string path=SafeFiles.Child(context.Root,pair.Key);
                if(File.Exists(path)){if(!String.IsNullOrEmpty(pair.Value)&&SafeFiles.HashFile(path)==pair.Value){File.Delete(path);result.RemovedFiles++;}else result.PreservedFiles++;}
            }
            File.Delete(System.IO.Path.Combine(context.Root,"install.json"));
            if(!Directory.EnumerateFileSystemEntries(context.Root).Any())Directory.Delete(context.Root,false);
            if(progress!=null)progress(100,"Afterlight removed; your appearance settings were kept");
            return result;
        }
    }
    internal sealed class WindowsIntegration:IIntegration {
        const string RegistryPath=@"Software\Microsoft\Windows\CurrentVersion\Uninstall\"+BuildMetadata.AppFolder;
        readonly string desktop=System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),BuildMetadata.AppName+".lnk");
        readonly string startFolder=System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),BuildMetadata.AppFolder);
        Dictionary<string,object> previousRegistry;
        readonly Dictionary<string,byte[]> previousLinks=new Dictionary<string,byte[]>(StringComparer.OrdinalIgnoreCase);
        string StartLink {get{return System.IO.Path.Combine(startFolder,BuildMetadata.AppName+".lnk");}}
        string RemoveLink {get{return System.IO.Path.Combine(startFolder,"Uninstall "+BuildMetadata.AppName+".lnk");}}
        internal static string ShortcutTarget(string path){
            object shell=null,link=null;
            try{shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell",true));link=shell.GetType().InvokeMember("CreateShortcut",BindingFlags.InvokeMethod,null,shell,new object[]{path});return Convert.ToString(link.GetType().InvokeMember("TargetPath",BindingFlags.GetProperty,null,link,null));}
            finally{if(link!=null)Marshal.FinalReleaseComObject(link);if(shell!=null)Marshal.FinalReleaseComObject(shell);}
        }
        internal static Dictionary<string,string> SandboxShortcut(string path,string app,string icon){
            string parent=SafeFiles.Full(AppDomain.CurrentDomain.BaseDirectory)+System.IO.Path.DirectorySeparatorChar;
            if(!SafeFiles.Full(path).StartsWith(parent,SafeFiles.PathComparison)||SafeFiles.Full(path).IndexOf(System.IO.Path.DirectorySeparatorChar+"sandbox-",StringComparison.OrdinalIgnoreCase)<0)throw new IOException("Shortcut verification must remain inside the test sandbox.");
            Shortcut(path,app,"",icon,"Afterlight sandbox verification only");object shell=null,link=null;
            try{shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell",true));link=shell.GetType().InvokeMember("CreateShortcut",BindingFlags.InvokeMethod,null,shell,new object[]{path});var values=new Dictionary<string,string>();foreach(string property in new[]{"TargetPath","WorkingDirectory","IconLocation"})values[property]=Convert.ToString(link.GetType().InvokeMember(property,BindingFlags.GetProperty,null,link,null));return values;}
            finally{if(link!=null)Marshal.FinalReleaseComObject(link);if(shell!=null)Marshal.FinalReleaseComObject(shell);}
        }
        static void Shortcut(string path,string target,string arguments,string icon,string description){
            SafeFiles.NoReparse(path);Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path));object shell=null,link=null;
            try{shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell",true));link=shell.GetType().InvokeMember("CreateShortcut",BindingFlags.InvokeMethod,null,shell,new object[]{path});var type=link.GetType();
                foreach(var setting in new Dictionary<string,object>{{"TargetPath",target},{"Arguments",arguments},{"WorkingDirectory",System.IO.Path.GetDirectoryName(target)},{"IconLocation",icon+",0"},{"Description",description},{"WindowStyle",1}})type.InvokeMember(setting.Key,BindingFlags.SetProperty,null,link,new[]{setting.Value});
                type.InvokeMember("Save",BindingFlags.InvokeMethod,null,link,null);
            }finally{if(link!=null)Marshal.FinalReleaseComObject(link);if(shell!=null)Marshal.FinalReleaseComObject(shell);}
        }
        public void Capture(){
            using(var key=Registry.CurrentUser.OpenSubKey(RegistryPath)){
                if(key!=null){
                    string expected=System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs",BuildMetadata.AppFolder);
                    if(!SafeFiles.Same(Convert.ToString(key.GetValue("InstallLocation")),expected))throw new IOException("A different app already owns the Afterlight uninstall entry. Setup did not replace it.");
                    previousRegistry=new Dictionary<string,object>();foreach(string name in key.GetValueNames())previousRegistry[name]=key.GetValue(name);
                }
            }
            foreach(string path in new[]{desktop,StartLink,RemoveLink}){SafeFiles.NoReparse(path);previousLinks[path]=File.Exists(path)?File.ReadAllBytes(path):null;}
        }
        public void Install(string app,string uninstall,string icon,string version,bool addDesktop,long size){
            // Do not silently replace a user's unrelated same-named shortcut.
            foreach(string path in new[]{StartLink,RemoveLink}.Concat(addDesktop?new[]{desktop}:new string[0]))if(File.Exists(path)){
                string target=ShortcutTarget(path);if(String.IsNullOrEmpty(target)||!SafeFiles.Full(target).StartsWith(SafeFiles.Full(System.IO.Path.GetDirectoryName(uninstall))+System.IO.Path.DirectorySeparatorChar,SafeFiles.PathComparison))throw new IOException("A shortcut named Afterlight already points to another app. Rename that shortcut and try again.");
            }
            Shortcut(StartLink,app,"",icon,BuildMetadata.AppName+" — interactive pixel worlds");
            Shortcut(RemoveLink,uninstall,"--uninstall",icon,"Remove "+BuildMetadata.AppName+"; keep your appearance settings");
            if(addDesktop)Shortcut(desktop,app,"",icon,BuildMetadata.AppName+" — double-click to explore and customise");
            else if(File.Exists(desktop)){string target=ShortcutTarget(desktop);if(!String.IsNullOrEmpty(target)&&SafeFiles.Full(target).StartsWith(SafeFiles.Full(System.IO.Path.GetDirectoryName(uninstall))+System.IO.Path.DirectorySeparatorChar,SafeFiles.PathComparison))File.Delete(desktop);}
            using(var key=Registry.CurrentUser.CreateSubKey(RegistryPath)){
                key.SetValue("DisplayName",BuildMetadata.AppName);key.SetValue("DisplayVersion",version);key.SetValue("Publisher","Sadeq Rezai");key.SetValue("InstallLocation",System.IO.Path.GetDirectoryName(uninstall));key.SetValue("DisplayIcon",icon+",0");
                key.SetValue("UninstallString","\""+uninstall+"\" --uninstall");key.SetValue("NoModify",1,RegistryValueKind.DWord);key.SetValue("NoRepair",1,RegistryValueKind.DWord);key.SetValue("EstimatedSize",(int)Math.Min(Int32.MaxValue,(size+1023)/1024),RegistryValueKind.DWord);key.SetValue("InstallDate",DateTime.Now.ToString("yyyyMMdd"));
            }
            NotifyShell();
        }
        public void Restore(){
            Registry.CurrentUser.DeleteSubKeyTree(RegistryPath,false);
            if(previousRegistry!=null)using(var key=Registry.CurrentUser.CreateSubKey(RegistryPath))foreach(var pair in previousRegistry)key.SetValue(pair.Key,pair.Value);
            foreach(var pair in previousLinks)SafeFiles.Restore(pair.Key,pair.Value);
            if(Directory.Exists(startFolder)&&!Directory.EnumerateFileSystemEntries(startFolder).Any())Directory.Delete(startFolder,false);
            NotifyShell();
        }
        public void Remove(InstallRecord record){
            foreach(string path in new[]{desktop,StartLink,RemoveLink})if(File.Exists(path)){
                SafeFiles.NoReparse(path);string target=ShortcutTarget(path);
                if(!String.IsNullOrEmpty(target)&&SafeFiles.Full(target).StartsWith(SafeFiles.Full(record.Root)+System.IO.Path.DirectorySeparatorChar,SafeFiles.PathComparison))File.Delete(path);
            }
            if(Directory.Exists(startFolder)&&!Directory.EnumerateFileSystemEntries(startFolder).Any())Directory.Delete(startFolder,false);
            using(var key=Registry.CurrentUser.OpenSubKey(RegistryPath))if(key!=null&&!SafeFiles.Same(Convert.ToString(key.GetValue("InstallLocation")),record.Root))throw new IOException("A different app now owns the Afterlight uninstall entry. It was left unchanged.");
            Registry.CurrentUser.DeleteSubKeyTree(RegistryPath,false);NotifyShell();
        }
        static void NotifyShell(){SHChangeNotify(0x08000000,0,IntPtr.Zero,IntPtr.Zero);}
        [DllImport("shell32.dll")]static extern void SHChangeNotify(uint eventId,uint flags,IntPtr first,IntPtr second);
    }
}

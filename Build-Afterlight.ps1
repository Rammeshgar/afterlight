[CmdletBinding()]
param([ValidateSet('Classic','Cinema')][string]$Edition='Classic')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root=$PSScriptRoot
$isCinema=$Edition -eq 'Cinema'
$appName=if($isCinema){'AfterlightCinema'}else{'Afterlight'}
$editionRoot=Join-Path $root ('editions/'+$Edition.ToLowerInvariant())
$output=Join-Path $root ('out/'+$Edition.ToLowerInvariant())
$bin=Join-Path $output 'app'
$checks=Join-Path $output 'checks'
$cache=Join-Path $root 'out/packages'
$null=New-Item -ItemType Directory -Force -Path (Join-Path $bin 'web'),$checks,$cache

function Get-Package([string]$Id,[string]$Version,[string]$Sha256){
    $filename="$Id.$Version.nupkg"
    $path=Join-Path $cache $filename
    if(-not (Test-Path -LiteralPath $path)){
        $temporary="$path.$([guid]::NewGuid().ToString('N')).download"
        try{
            curl.exe --disable --fail --location --silent --show-error --retry 2 --max-time 120 --output $temporary "https://api.nuget.org/v3-flatcontainer/$Id/$Version/$filename"
            if($LASTEXITCODE){throw "Could not download $filename from NuGet."}
            if((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne $Sha256){throw "Package checksum mismatch: $filename"}
            Move-Item -LiteralPath $temporary -Destination $path -Force
        }finally{
            if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary}
        }
    }
    if((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $Sha256){throw "Package checksum mismatch: $path"}
    [IO.Compression.ZipFile]::OpenRead($path)
}
function Copy-PackageEntry($Package,[string]$EntryName,[string]$Filename){
    $entry=$Package.GetEntry($EntryName)
    if(-not $entry){throw "Missing verified package entry: $EntryName"}
    $file=Join-Path $bin $Filename
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$file,$true)
}
$webview=Get-Package 'microsoft.web.webview2' '1.0.4258.31' '56F7F4B8BF9AEE4B8EFEFBBDD4F67D5F74EBD1B100ED0806DA71BF76AF481AA9'
try{
    foreach($name in @('Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll')){
        $folder=if($name -eq 'WebView2Loader.dll'){'build/native/x64'}else{'lib/net462'}
        Copy-PackageEntry $webview "$folder/$name" $name
        $signature=Get-AuthenticodeSignature -LiteralPath (Join-Path $bin $name)
        if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation'){
            throw "Microsoft signature verification failed: $name"
        }
    }
    Copy-PackageEntry $webview 'LICENSE.txt' 'Microsoft-WebView2-LICENSE.txt'
    Copy-PackageEntry $webview 'NOTICE.txt' 'Microsoft-WebView2-NOTICE.txt'
}finally{$webview.Dispose()}

$audioPackages=@{
    'NAudio.Core'='794645DBFD30E4880663D52D9D9224D55C301FA54228FF623C95D572C7887347'
    'NAudio.Wasapi'='C8396B8DBAB86A2619EDFD9158BEAF18C21CB86677099B5594950FD8651B9D1A'
}
foreach($name in $audioPackages.Keys){
    $package=Get-Package $name.ToLowerInvariant() '2.2.1' $audioPackages[$name]
    try{Copy-PackageEntry $package "lib/netstandard2.0/$name.dll" "$name.dll"}
    finally{$package.Dispose()}
}
Copy-Item -LiteralPath (Join-Path $root 'third-party/NAudio-LICENSE.txt') -Destination $bin -Force

$webFiles=@(
    'index.html','style.css','music.css','collection.css','explore.css','release.css',
    'seneschal-art.js','seneschal-worlds.js','worlds.js','scene.js','ui.js','icon.svg',
    'thumb-city.png','thumb-observatory.png','thumb-sleeper.png','thumb-pelagic.png','thumb-sanctuary.png',
    'thumb-citylight.png','thumb-nocturne.png','thumb-lunar.png','thumb-foundry.png'
)
foreach($name in $webFiles){
    $file=Join-Path $root "web/$name"
    $editionFile=Join-Path $editionRoot "web/$name"
    if(Test-Path -LiteralPath $editionFile){$file=$editionFile}
    Copy-Item -LiteralPath $file -Destination (Join-Path $bin "web/$name") -Force
}
if($isCinema){
    $null=New-Item -ItemType Directory -Force -Path (Join-Path $bin 'web/cinema')
    $cinemaFiles=@('cinema.js','living-worlds.js','environment.js','cinema/vehicles.webp')
    $cinemaFiles+=@('city','observatory','sleeper','pelagic','sanctuary','citylight','nocturne','lunar','foundry') | ForEach-Object{"cinema/$_.webp"}
    foreach($name in $cinemaFiles){
        Copy-Item -LiteralPath (Join-Path $root "web/$name") -Destination (Join-Path $bin "web/$name") -Force
    }
}
foreach($name in @('Quick Start.txt','PRIVACY.md','THIRD-PARTY-NOTICES.txt','RELEASE-NOTES.md')){
    Copy-Item -LiteralPath (Join-Path $editionRoot $name) -Destination $bin -Force
}
Copy-Item -LiteralPath (Join-Path $root 'src/Afterlight.exe.config') -Destination (Join-Path $bin "$appName.exe.config") -Force
& (Join-Path $root 'Build-Icon.ps1') -Destination (Join-Path $bin 'Afterlight.ico') -Cinema:$isCinema

$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$netstandard=Join-Path $env:WINDIR 'Microsoft.NET/assembly/GAC_MSIL/netstandard/v4.0_2.0.0.0__cc7b13ffcd2ddd51/netstandard.dll'
if(-not (Test-Path -LiteralPath $compiler) -or -not (Test-Path -LiteralPath $netstandard)){
    throw 'Use Windows x64 with .NET Framework 4.8 and its 64-bit C# compiler.'
}
$common=@('/nologo','/platform:x64','/optimize+','/r:System.dll','/r:System.Core.dll')
if($isCinema){$common+='/define:AFTERLIGHT_CINEMA'}
$audioReferences=@("/r:$netstandard",('/r:'+(Join-Path $bin 'NAudio.Core.dll')),('/r:'+(Join-Path $bin 'NAudio.Wasapi.dll')))
$exe=Join-Path $bin "$appName.exe"
& $compiler @common /target:winexe "/out:$exe" ('/win32icon:'+(Join-Path $bin 'Afterlight.ico')) ('/win32manifest:'+(Join-Path $root 'src/Afterlight.manifest')) /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll @audioReferences ('/r:'+(Join-Path $bin 'Microsoft.Web.WebView2.Core.dll')) ('/r:'+(Join-Path $bin 'Microsoft.Web.WebView2.WinForms.dll')) (Join-Path $root 'src/Program.cs') (Join-Path $root 'src/Music.cs') (Join-Path $root 'src/WallpaperRecovery.cs')
if($LASTEXITCODE){throw 'Afterlight compilation failed.'}
$check=Start-Process -FilePath $exe -ArgumentList '--check' -PassThru -Wait -WindowStyle Hidden
if($check.ExitCode){throw 'Offline app package integrity check failed.'}

# Keep test executables outside the application payload. The audio test
# loads the pinned assemblies from its own application directory.
$musicTest=Join-Path $checks 'MusicTests.exe'
Copy-Item -LiteralPath (Join-Path $bin 'NAudio.Core.dll'),(Join-Path $bin 'NAudio.Wasapi.dll') -Destination $checks -Force
& $compiler @common /target:exe "/out:$musicTest" @audioReferences (Join-Path $root 'src/Music.cs') (Join-Path $root 'tests/MusicTests.cs')
if($LASTEXITCODE){throw 'Audio tests compilation failed.'}
& $musicTest
if($LASTEXITCODE){throw 'Synthetic audio tests failed.'}
$hostTest=Join-Path $checks 'HostLifecycleTests.exe'
& $compiler @common /target:exe "/out:$hostTest" /r:System.Web.Extensions.dll (Join-Path $root 'src/WallpaperRecovery.cs') (Join-Path $root 'tests/HostLifecycleTests.cs')
if($LASTEXITCODE){throw 'Host lifecycle tests compilation failed.'}
& $hostTest
if($LASTEXITCODE){throw 'Host lifecycle tests failed.'}
Write-Output "Afterlight $Edition built: $exe"

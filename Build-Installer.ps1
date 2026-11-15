[CmdletBinding()]
param([ValidateSet('Classic','Cinema')][string]$Edition='Classic',[switch]$SkipPreview)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$root=[IO.Path]::GetFullPath($PSScriptRoot)
$editionOutput=Join-Path $root ('out/'+$Edition.ToLowerInvariant())
$app=Join-Path $editionOutput 'app'
$output=Join-Path $editionOutput 'release'
foreach($path in @($app,$output)){if(-not $path.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Installer source and output must remain inside Afterlight.'}}
function Assert-NoLinkedPath([string]$Path){
    $current=[IO.Path]::GetFullPath($Path)
    while($current){if(Test-Path -LiteralPath $current){if((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Linked release path refused: $current"}};$current=[IO.Path]::GetDirectoryName($current)}
}
Assert-NoLinkedPath $app
Assert-NoLinkedPath $output
$isCinema=$Edition -eq 'Cinema'
$appName=if($isCinema){'Afterlight Cinema'}else{'Afterlight'}
$appFolder=if($isCinema){'AfterlightCinema'}else{'Afterlight'}
$exeName=$appFolder+'.exe'
$product='Sadeq.'+$appFolder+'.Desktop'
if(-not(Test-Path -LiteralPath (Join-Path $app $exeName))){throw "Run .\Build-Afterlight.ps1 -Edition $Edition first."}
$version=(Get-Item -LiteralPath (Join-Path $app $exeName)).VersionInfo.FileVersion
if($version -ne '1.8.0.0'){throw "The release installer expects Afterlight 1.8.0.0, not $version."}
# Deliberate allowlist: never recursively package app profiles, diagnostic exports,
# build helpers, environment-specific files, or unrelated user data.
$files=@(
    $exeName,($exeName+'.config'),'Afterlight.ico',
    'Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll',
    'Microsoft-WebView2-LICENSE.txt','Microsoft-WebView2-NOTICE.txt',
    'NAudio.Core.dll','NAudio.Wasapi.dll','NAudio-LICENSE.txt',
    'Quick Start.txt','PRIVACY.md','THIRD-PARTY-NOTICES.txt','RELEASE-NOTES.md',
    'web/index.html','web/style.css','web/music.css','web/collection.css','web/explore.css','web/release.css',
    'web/seneschal-art.js','web/seneschal-worlds.js','web/worlds.js','web/scene.js','web/ui.js','web/icon.svg',
    'web/thumb-city.png','web/thumb-observatory.png','web/thumb-sleeper.png','web/thumb-pelagic.png','web/thumb-sanctuary.png',
    'web/thumb-citylight.png','web/thumb-nocturne.png','web/thumb-lunar.png','web/thumb-foundry.png'
)
if($isCinema){
    $files+=@('web/cinema.js','web/living-worlds.js','web/environment.js','web/cinema/vehicles.webp')
    $files+=@('city','observatory','sleeper','pelagic','sanctuary','citylight','nocturne','lunar','foundry') | ForEach-Object{'web/cinema/'+$_+'.webp'}
}
foreach($file in $files){$path=Join-Path $app $file;if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing release file: $file"};Assert-NoLinkedPath $path}
$source=Join-Path $root 'installer'
$build=Join-Path $editionOutput 'setup-build'
Assert-NoLinkedPath $build
New-Item -ItemType Directory -Path $build,$output -Force | Out-Null
$payload=Join-Path $build 'Afterlight.Payload.zip'
if(Test-Path -LiteralPath $payload){Remove-Item -LiteralPath $payload}
$entries=@()
$archive=[IO.Compression.ZipFile]::Open($payload,[IO.Compression.ZipArchiveMode]::Create)
try{
    foreach($file in $files){
        $path=Join-Path $app $file
        $entry=$archive.CreateEntry($file,[IO.Compression.CompressionLevel]::Optimal)
        $entry.LastWriteTime=[DateTimeOffset]::Parse('2026-10-25T00:00:00Z')
        $input=[IO.File]::OpenRead($path);$stream=$entry.Open()
        try{$input.CopyTo($stream)}finally{$input.Dispose();$stream.Dispose()}
        $entries+=@{Path=$file;Sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash;Length=(Get-Item -LiteralPath $path).Length}
    }
}finally{$archive.Dispose()}
$payloadHash=(Get-FileHash -LiteralPath $payload -Algorithm SHA256).Hash
$manifest=@{Product=$product;Version=$version;Files=$entries} | ConvertTo-Json -Depth 8
# Mechanical build metadata generation, not hand-authored product sources.
$utf8=New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $build 'Afterlight.Payload.json'),$manifest,$utf8)
[IO.File]::WriteAllText((Join-Path $build 'BuildMetadata.cs'),('namespace Afterlight.Setup { internal static class BuildMetadata { internal const string Version="'+$version+'"; internal const string Product="'+$product+'"; internal const string AppName="'+$appName+'"; internal const string AppFolder="'+$appFolder+'"; internal const string Executable="'+$exeName+'"; internal const string AppMutex=@"Local\Sadeq.'+$appFolder+'.v1"; internal const string SetupMutex=@"Local\Sadeq.'+$appFolder+'.Setup.v1"; internal const string PayloadSha256="'+$payloadHash+'"; } }'),$utf8)
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$setupName=if($isCinema){'Afterlight-Cinema-Setup-1.8.0.exe'}else{'Afterlight-Setup-1.8.0.exe'}
$exe=Join-Path $output $setupName
$common=@('/nologo','/platform:x64','/optimize+','/r:System.dll','/r:System.Core.dll','/r:System.Drawing.dll','/r:System.Windows.Forms.dll','/r:System.Web.Extensions.dll','/r:System.IO.Compression.dll','/r:System.IO.Compression.FileSystem.dll',('/win32icon:'+(Join-Path $app 'Afterlight.ico')),('/win32manifest:'+(Join-Path $source 'Afterlight.Setup.manifest')),('/resource:'+$payload+',Afterlight.Payload.zip'),('/resource:'+(Join-Path $build 'Afterlight.Payload.json')+',Afterlight.Payload.json'),('/resource:'+(Join-Path $app 'Afterlight.ico')+',Afterlight.Icon.ico'),(Join-Path $build 'BuildMetadata.cs'),(Join-Path $source 'InstallCore.cs'),(Join-Path $source 'SetupProgram.cs'))
& $compiler /target:winexe ('/out:'+$exe) @common
if($LASTEXITCODE -ne 0){throw 'Installer compilation failed.'}
# CLR4 assemblies select the installed .NET4 runtime without an external config.
# Keep the public installer genuinely one executable; the app's own config is
# already embedded in its payload.
if(Test-Path -LiteralPath ($exe+'.config')){Remove-Item -LiteralPath ($exe+'.config')}
$check=Start-Process -FilePath $exe -ArgumentList '--check' -PassThru -Wait -WindowStyle Hidden
if($check.ExitCode -ne 0){throw 'Embedded installer payload failed integrity verification.'}
$testExe=Join-Path $build 'InstallerTests.exe'
& $compiler /target:exe /main:Afterlight.Setup.InstallerTests ('/out:'+$testExe) @common (Join-Path $source 'InstallerTests.cs')
if($LASTEXITCODE -ne 0){throw 'Installer test compilation failed.'}
& $testExe
if($LASTEXITCODE -ne 0){throw 'Installer isolated lifecycle tests failed.'}
$checks=Join-Path $editionOutput 'checks'
New-Item -ItemType Directory -Path $checks -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $build 'installer-test-report.json') -Destination $checks -Force
if(-not $SkipPreview){foreach($mode in @('--render-preview','--render-prerequisite-preview')){$preview=Start-Process -FilePath $exe -ArgumentList $mode -PassThru -Wait -WindowStyle Hidden;if($preview.ExitCode -ne 0){throw 'Installer preview render failed.'}}}
$setupHash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash
$checksum=$setupHash+'  '+[IO.Path]::GetFileName($exe)+[Environment]::NewLine
[IO.File]::WriteAllText((Join-Path $output 'SHA256SUMS.txt'),$checksum,$utf8)
Write-Output ('Installer ready: '+$exe)
Write-Output ('Size: '+[Math]::Round((Get-Item -LiteralPath $exe).Length/1MB,2)+' MB; SHA-256 '+$setupHash)

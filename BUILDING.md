# Build Afterlight on Windows

Use an x64 Windows 10 (2004 or later) or Windows 11 machine with Windows PowerShell, .NET Framework 4.8 or later, and Microsoft Edge WebView2 Runtime. The build uses the Windows .NET Framework C# compiler. Node.js 22 or later is required only for the JavaScript tests.

Open Windows PowerShell in the repository root and run the commands for the edition you want.

| Edition | Build the app | Build the installer | Installer output |
| --- | --- | --- | --- |
| Classic | `./Build-Afterlight.ps1 -Edition Classic` | `./Build-Installer.ps1 -Edition Classic -SkipPreview` | `out/classic/release/Afterlight-Setup-1.8.0.exe` |
| Cinema | `./Build-Afterlight.ps1 -Edition Cinema` | `./Build-Installer.ps1 -Edition Cinema -SkipPreview` | `out/cinema/release/Afterlight-Cinema-Setup-1.8.0.exe` |

The first build downloads WebView2 SDK and NAudio packages from NuGet into `out/packages/`. Both editions verify the pinned package hashes and check the signatures on the Microsoft binaries. A verified dependency cache can be reused offline.

Each build checks the app payload and runs the native audio and wallpaper recovery tests. The installer build also runs isolated tests covering install, update, rollback, and uninstall. It writes the SHA-256 checksum next to the installer and the JSON test report to `out/<edition>/checks/`. Building and running these checks does not install the app or change the desktop wallpaper.

For a preview of a built edition, launch its executable under `out/<edition>/app/`. Select **Use as wallpaper** in the preview to attach it to the desktop.

## JavaScript tests

```powershell
npm ci
npm test
```

These tests cover scene rendering and interaction, rotation, pause and Stillness, and the renderer's audio and host messaging. Generated test images and reports go under `out/checks/renderer/`.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/` | Shared Windows host, audio input, and renderer recovery |
| `web/` | Shared browser controls, scene code, and Cinema artwork and motion |
| `editions/classic/web/` | Classic-specific scene files and gallery artwork, overlaid on shared files during the Classic build |
| `installer/` | Windows installer and isolated lifecycle tests |
| `tests/` | Native and JavaScript tests |

The v1.8.0 release hosts the published Windows installers. This source checkout builds both editions at that application version and includes a small fix to freeze street reflections at 0% Activity. The installer checksums in the release apply to the published files.

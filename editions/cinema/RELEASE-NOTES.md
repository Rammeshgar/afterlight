# Afterlight Cinema 1.8

Cinema has a separate installer, shortcuts, appearance settings and uninstall
entry. The original Afterlight remains available as a separate app. Quit the
active wallpaper from its tray before attaching the other app to the desktop.

The nine Cinema worlds include matched Day and Night artwork and independent
moving layers. Press E to highlight objects and use the nine scene controls.
The new controls include train speed, canal ferry, traffic lights, underwater
searchlights, koi, a lunar survey drone and the orbital cargo hoist.

# Afterlight 1.8

Windows x64 preview release, 25 October 2026. Created by Sadeq Rezai.

## Nine worlds, one collection

Citylight, City Nocturne, Lunar Relay and Orbital Foundry join the original
five Afterlight worlds. Citylight preserves Seneschal's distinctive copper
moon, green skyline and reflective road. The other three bring a neon street,
lunar research station and industrial orbital habitat into the same app.

Each addition has independent appearance settings, six labelled scene actions
and object interactions. All nine worlds are available to collection browsing,
rotation, direct tray selection and 4K still export. The original Canal City,
Northstar, Last Sleeper, Pelagic Archive and Lantern Sanctuary are retained.

This is a local artwork adaptation, not a second app running inside Afterlight.
It imports no Seneschal history, accounts, provider settings or private data.
Only the selected world renders; the existing single animation scheduler,
desktop recovery, pause/Stillness and output-audio permission rules are retained.
Existing appearance and rotation preferences are preserved. Listening stays
off on every application start.

## Distribution

The 1.8 installer and portable package are versioned separately. Previous 1.7
release files remain recoverable. Setup installs for the current Windows user
without administrator rights, creates the chosen shortcuts and registers an
uninstaller. Quit an older running Afterlight from its tray before updating;
Setup never force-closes a wallpaper or enables listening.

No Docker, AI tokens, separate browser window or internet connection is needed
after Microsoft prerequisites are installed. Afterlight must remain running to
animate. No startup task, background update service or public download host is
created. The app and Setup are unsigned; checksums identify files, not trusted
publisher identity. Do not disable Windows security protections.

## Verification scope

Build checks use the existing pinned dependencies and offline package-integrity
checks. Installer tests extract into disposable sandbox directories, use fake
production integration and exercise real shortcuts only inside that sandbox.
They do not install this update into the user's Windows profile.

Synthetic audio/render checks do not prove a live playback-device test. No new
live audio capture is claimed for this release. The historic approved 1.7
five-world desktop check and earlier six-minute recovery test are not evidence
that the new nine-world build has had an overnight desktop stability test.

Primary-display wallpaper on Windows 10/11 x64 is the intended scope. A clean
second-PC install, independent multi-monitor wallpapers, ARM-native support,
Explorer-restart behaviour, every audio device/player and overnight stability
have not been certified. See checks/VERIFICATION.md and the current isolated
test reports in the source package for actual results.

## Previous release: 1.7

Windows x64 preview release, 24 October 2026. Created by Sadeq Rezai.

This release refines the five-world pixel-art collection and adds a per-user
Windows installer. Worlds retain separate appearance settings, local music
reaction, direct scene actions, 4K still export and automatic rotation.

New-user setup has a visible Use as wallpaper button, an initial collection
view and instructions for reopening the tray/settings. Existing appearance
settings are preserved. Listening is still off at every start.

Art changes include atmospheric alpine terrain and shoreline buildings,
modeled train upholstery and travel objects, a furnished pressure-glass
laboratory with drowned masonry, and denser cedar/blossom garden detail.
The city keeps its recognizable layout with a few new rooftop details.
Cached aurora, scenery strips and lamp sprites reduce per-frame drawing.

Resource improvements: static artwork remains cached, city transient effects
are capped, muted/paused/hidden ambience suspends its AudioContext, and the
native layer rechecks primary-screen dimensions after display changes.

## Distribution notes

Setup installs for the current user without administrator rights, provides
shortcuts and a Windows uninstall entry, and checks Microsoft prerequisites.
No Docker, AI tokens, browser window or internet connection is needed after
the prerequisites are installed. The app must remain running to animate.

The app and setup are currently unsigned. Windows warnings/reputation checks
are possible. Published hashes identify files, not publisher trust. No
automatic update service is included. A download-hosting/publication step is
separate from making the local distributable installer.

## Scope and verification

Primary-display wallpaper on Windows 10/11 x64 is the intended scope.
Independent multi-monitor wallpapers, ARM-native support, overnight stability,
all device/audio-player combinations and a clean second-PC install have not
been certified. WebView2 browser-process crashes are not the same as the
surface/renderer stalls covered by the existing recovery watchdog.

See checks/VERIFICATION.md in the source package for actual test results.
The approved native 1.7 five-world check passed in 22.9 seconds: all five
scenes selected, advanced frames, stayed visible/opaque and safely behind
desktop icons. Original selected world was restored and audio stayed off.
All 24 alternate-world actions passed real-raster checks; 43 installer
checks passed in an isolated sandbox, not a clean second-PC install.
The historic six-minute desktop recovery test is not a new overnight test
or evidence of compatibility with every Windows shell version.

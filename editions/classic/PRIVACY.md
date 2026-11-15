# Afterlight 1.8 — privacy and local data

Created by Sadeq Rezai. This document describes the shipped application,
not a website or an external download host.

Afterlight has no account, analytics, advertising, telemetry service, runtime
AI requests or app-owned network listener. Its artwork and interface are
bundled locally. The renderer blocks outgoing connections and the Windows
host permits only its exact local artwork-resource allowlist. WebView2 is
a Microsoft component; its installation and updates are managed by Microsoft.

The added Seneschal worlds are bundled artwork modules only. They do not
read or copy Seneschal conversations, account details, provider settings,
private-access records or any other Seneschal user data. Seneschal does not
need to be running or installed to use these worlds in Afterlight.

## Sound

Ambient sound and music listening start off. Live music reaction is Windows
output-device loopback: it analyses all sound on the default multimedia
output, which can include music, calls, videos and notifications. It does not
use the microphone. Normalized level and frequency-band numbers are sent
only to the local artwork. No audio samples or recordings are saved or
uploaded. Listening permission is not saved across application restarts.
Muted/paused/hidden/Stillness ambience is suspended after a short fade.
The visual reaction preview uses synthetic numbers and is labelled as such.

## Local data

Appearance and comfort settings live in the app's WebView2 profile under
`%LOCALAPPDATA%\SadeqAfterlight\webview`. A bounded `host-events.log`
in `%LOCALAPPDATA%\SadeqAfterlight` records app health/recovery events
(not browsing, audio content, passwords or keyboard text). There is no
keyboard hook. While wallpaper mode owns desktop focus, pointer position
and click state are used transiently for artwork interaction and not logged.
App health checks can record frame counters, window state and numeric
audio levels only when an explicit diagnostic mode is requested.

The installer writes app files under the current user's LocalAppData
Programs folder, creates the shortcuts selected in Setup and registers a
per-user Windows uninstall entry. Setup does not request administrator
rights, change the saved Windows wallpaper, enable listening or add startup
tasks. The Microsoft prerequisite buttons open official Microsoft pages
only when clicked; Setup does not silently download or run dependencies.

Uninstall preserves appearance settings and unrelated or modified files.
It does not delete the shared WebView2 Runtime. Exported stills are saved
only to a location chosen by the user.

There is no automatic update service or background download. Quit from the
tray menu to stop Afterlight completely.

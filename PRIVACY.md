# Afterlight privacy

Afterlight Classic and Afterlight Cinema store appearance and comfort settings locally, in separate profiles. The apps have no accounts, analytics, advertising, AI requests, or app-owned network listener. Scene artwork and controls ship with the app. The Windows host uses Microsoft Edge WebView2, which is maintained by Microsoft.

## Optional music reaction

Music reaction starts off every time you open either app. When enabled, it analyses audio on the default Windows multimedia output. That includes music, calls, videos, and notifications played on that device. It uses Windows playback loopback. It does not open the microphone.

Audio analysis runs in memory. The wallpaper receives only numeric levels and frequency bands. Audio is not recorded or uploaded. The visual preview uses simulated input.

## Local files and interaction

The settings and bounded app health log are stored under `%LOCALAPPDATA%\SadeqAfterlight` for Classic and `%LOCALAPPDATA%\SadeqAfterlightCinema` for Cinema. During wallpaper interaction the app reads pointer position and clicks on the desktop transiently. It does not log those events or install a keyboard hook.

Setup installs for the current Windows user. The apps preserve your saved Windows wallpaper and do not add a startup task. The uninstallers retain your appearance settings.

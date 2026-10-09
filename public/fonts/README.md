# Kairos Monitor fonts

Satoshi is self-hosted using the official, unmodified 400/500/700 WOFF2 files.
Run `powershell -File scripts/install-satoshi.ps1` from the project root to obtain
your own copy directly from [Fontshare](https://www.fontshare.com/fonts/satoshi).
Review the downloaded `License/FFL.txt` before use.

The official ITF Free Font License permits self-hosting for the licensee's own
website/application but restricts redistribution through repositories. Font
binaries are therefore Git-ignored. Install them before building on another
machine or hosting environment. No CDN font request is made by the app; the
prescribed system fallback is used if the files are absent.

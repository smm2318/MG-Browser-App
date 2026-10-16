# MG Browser

MG Browser is an Electron-based desktop browser for **Windows, macOS, and Linux**. The current home screen is built with HTML/CSS/JavaScript and website pages run in Chromium-powered Electron webviews.

## Download a build

GitHub Actions automatically builds desktop packages when changes are pushed to `main`, and can also be started manually.

1. Open the [Actions builds](https://github.com/smm2318/MG-Browser-App/actions/workflows/build.yml).
2. Open the latest **Build MG Browser** run and wait until all three platform jobs finish successfully.
3. At the bottom of the completed run, download the matching artifact:
   - **MG-Browser-Windows** — Windows installer and portable `.exe`
   - **MG-Browser-macOS** — `.dmg` and `.zip`
   - **MG-Browser-Linux** — `.AppImage` and `.deb`

Artifacts are temporary build downloads retained for 14 days. macOS builds are not signed or notarized, so macOS may show a security warning.

## Run locally

Install Node.js 22 or newer, then run:

```bash
npm install
npm run build:icons
npm start
```

To package the app locally, run `npm run dist` after installing dependencies. The build workflow generates the platform icon files automatically.

## Project structure

```text
MG_Browser_APP/
├── .github/workflows/build.yml
├── browser.html             # Tab strip, address bar and webview tabs
├── index.html               # MG Browser home page
├── main.js                  # Electron app/window setup
├── package.json             # Dependencies and packaging targets
├── favicon.svg              # Home-page favicon
├── images/
│   ├── Background-image.jpg
│   ├── mg-browser-icon.svg
│   └── nature-wallpaper.svg
└── scripts/prepare-icons.js # Creates PNG, ICO and macOS iconset assets
```

## Features in this build

- Multiple tabs, close-tab, new-tab and refresh controls
- Back/forward navigation and address/search bar
- Google search for text queries and direct navigation to URLs
- Site titles and favicons shown in tabs
- **Developer Tools** for each tab (`F12` or `Ctrl+Shift+I`, plus toolbar button)
- MG Browser application icon generated for desktop packages
- Automated Windows, macOS and Linux build artifacts

## Notes

- The web interface is kept in `index.html`; the desktop browser shell and real webview tabs are in `browser.html`.
- This is an early browser build. Some websites may restrict embedded browsers, and macOS distribution signing is not configured yet.

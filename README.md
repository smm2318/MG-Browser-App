# MG Browser App

MG Browser is the Windows desktop-app project for **MG Browser**. The goal is to turn the browser interface into a Windows application with an `.exe` installer or executable, using a real browser engine such as Chromium through Electron.

> The HTML/CSS/JavaScript interface can be designed separately and then connected to the desktop shell. A GitHub Pages website alone is not a full desktop browser.

## Repository structure

```text
MG-Browser-App/
├── images/
│   ├── .gitkeep
│   └── mg-browser-icon.svg
├── favicon.svg
├── README.md
└── (application source files will be added here)
```

## Icons and images

- `images/mg-browser-icon.svg` — main project/app icon artwork.
- `favicon.svg` — browser-tab icon for any HTML preview page.
- Put additional project images inside `images/` and reference them with paths such as `./images/example.png`.

For an HTML preview page, add this inside the `<head>` element:

```html
<link rel="icon" href="./favicon.svg" type="image/svg+xml">
```

## Planned development

- [ ] Build the interface with HTML, CSS and JavaScript.
- [ ] Connect the interface to a desktop browser engine.
- [ ] Add navigation, tabs, address/search bar, and browser controls.
- [ ] Package the Windows app as an `.exe`.

## Important

This repository is for the **Windows application**, separate from the web-interface repository. Do not treat a static HTML page or GitHub Pages deployment as a complete browser engine.

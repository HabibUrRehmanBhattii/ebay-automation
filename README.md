# eBay Automation Studio

A cross-locale Electron desktop app for automated eBay listing creation using Chrome CDP + Playwright. Lists 3D-printed DIY cosplay products across all eBay marketplaces.

## Features

- **8 eBay marketplaces** — ebay.com, ebay.ca, ebay.co.uk, ebay.de, ebay.fr, ebay.com.au, ebay.it, ebay.es
- **Full listing automation** — folder scan → product search → category/condition → photo upload → form fill → submit
- **Chrome CDP architecture** — connects to your real Chrome to avoid bot detection; persistent login via profile
- **7 product templates** — Helmet, Mask, Axe, Sword, Armor, Life Sized, Universal (auto-detected from folder names)
- **German-language support** — full German templates, UI labels, and DeepSeek prompts for ebay.de
- **DeepSeek AI integration** — auto-generates titles, descriptions, and category picks
- **Queue management** — scan folders, track published items, move back to queue, re-publish
- **Dark-themed UI** — custom title bar, system tray, visibility toggles
- **Electron + Playwright** — packaged as Windows .exe via electron-builder

## Prerequisites

- **Windows 10/11**
- **Google Chrome** installed
- **Node.js** v18+ (for development/running from source)
- An **eBay account** (login once in the automation Chrome, it persists)

## Quick Start (for users)

### Option 1: Run from source

```bash
cd "C:\Ebay Automation"
npm install
npm start
```

### Option 2: Build installer

```bash
cd "C:\Ebay Automation"
npm install
npm run build
# Installer at: dist/eBay Automation Setup 1.0.0.exe
```

### Option 3: Double-click launcher

Double-click `launch-clean.bat` — it auto-starts Chrome with the correct flags and launches the app.

## How to Use

### 1. First-time setup

1. Launch the app
2. Verify the Automation Chrome dot in the title bar shows **Connected**
3. In the Chrome window that opens, **log into eBay once** — your login is saved in the Chrome profile
4. (Optional) Paste your **DeepSeek API key** in the control bar and click **Verify**

### 2. Select your marketplace

Use the **MARKETPLACE** dropdown in the control bar to switch between ebay.com, ebay.ca, ebay.de, etc. All form labels and templates switch to the matching language.

### 3. Organize your product folders

Create a root folder with sub-folders, each containing product images (JPG/PNG/WEBP):

```
C:\Products\
  ├── Iron Man Helmet\
  │   ├── preview.jpg
  │   ├── angle2.jpg
  │   └── detail.jpg
  ├── Stormbreaker Axe\
  │   └── ...
  └── Spider-Punk Mask\
      └── ...
```

### 4. Scan and configure

1. Click **Choose Folder** or drag-and-drop your product root folder
2. The app scans sub-folders and shows them in the queue table
3. Each item auto-detects the best template (helmet, mask, axe, sword, armor, lifesize, or universal)
4. Set the **default price** in the control bar
5. (Optional) Edit the **Title Template** — use `${name}` as the placeholder for the folder name

### 5. Start automation

1. Click **▶ Start Automation**
2. The bot navigates through eBay's listing flow step-by-step
3. Watch the live log console for progress `[1/10]`, `[2/10]`, ...
4. After 15 items per day, the bot auto-pauses to protect your account
5. Published items move to the **Published History** tab

### 6. Manage items

- **Process** — run a single item
- **Done** — manually mark as published (skip automation)
- **📸 Upload** — add images to folders missing them
- **✏️ Rename** — rename folders on disk
- **🧹 Clean Names** — batch-remove timestamps and social handles from folder names
- **↩️ Move to Queue** — move a published item back to pending
- **Rescan** — re-scan the folder for new items

### 7. Template management

Click **📋 Templates** to manage the 7 built-in templates or create custom ones. When ebay.de is selected, German labels appear automatically.

The app auto-detects which template to use based on the folder name:

| Folder contains | Template |
|---|---|
| helmet, visor, crown, hood | Helmet DIY |
| mask, face shell | Mask |
| sword, blade, katana | Sword DIY |
| axe, stormbreaker | Axe DIY |
| armor, costume, gauntlet | Armor DIY |
| life size, lifesized, statue | Life Sized |
| everything else | Universal |

### 8. Persistent login tools

Three buttons in the title bar:

- **📁** — Open the Chrome automation profile folder (back up to keep your login)
- **💾** — Export eBay cookies to a backup file
- **↩︎** — Restore cookies from backup (recover login without re-entering credentials)

### 9. Chrome visibility

Use the **Chrome: Visible/Hidden** button to toggle the bot Chrome window between visible and headless mode.

## Architecture

```
Electron App (main.js + preload.js + renderer.js + index.html)
  │
  ├── IPC Bridge (preload.js) ── context isolation, ~30 whitelisted methods
  │
  ├── Main Process (main.js)
  │   ├── Folder Scanner — reads sub-directories, finds images
  │   ├── Queue Manager — pending → processing → done flow
  │   ├── Chrome Launcher — spawns real Chrome with CDP port
  │   ├── Playwright CDP — connectOverCDP() to fill eBay forms
  │   ├── DeepSeek API — AI for titles, descriptions, categories
  │   ├── Template Engine — 7 product types, auto-detection
  │   └── processed.json — tracks published folder names
  │
  └── Renderer (renderer.js + index.html)
      ├── Queue table with inline editing
      ├── Bulk edit panel
      ├── Drag-and-drop folder selector
      ├── Image upload modal
      ├── Templates management modal
      └── Live log console
```

### Why Chrome CDP?

The app connects to your real Chrome via `chromium.connectOverCDP()` instead of launching a bundled browser. This means:

- **No bot detection** — eBay sees your real browser fingerprint
- **Persistent login** — cookies survive in `C:\ebay-automation-profile`
- **No WebDriver flag** — unlike Selenium/Puppeteer

### Why Playwright?

- `getByRole()` accessibility selectors work regardless of CSS class changes
- `frameLocator()` handles eBay's iframe description editor
- `setInputFiles()` on hidden `<input type="file">` avoids native dialog popups

## File Map

```
C:\Ebay Automation\
├── main.js                    # ★ Core — 1200+ lines, all logic
├── preload.js                 # IPC security bridge
├── renderer.js                # UI wiring — 1350+ lines
├── index.html                 # Dark-themed dashboard
├── package.json               # Dependencies + electron-builder config
├── start-debug.ps1            # PowerShell Chrome + app launcher
├── launch-clean.bat           # One-click .bat wrapper
├── icon.png                   # App icon
├── grok-description-worker.js # Background description generator
├── scripts\
│   └── start-electron.js      # Dev server entry point
└── README.md                  # This file
```

## Build

```bash
npm run build
# Output: dist/eBay Automation Setup 1.0.0.exe (~100 MB)
```

### Build config (package.json)

```json
"build": {
  "appId": "com.yoshstudios.ebaymarketplace",
  "productName": "eBay Automation",
  "win": { "target": "nsis", "icon": "icon.png" },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

## Rate Limiting & Safety

- **Daily limit**: 15 uploads per run (configurable in `MAX_DAILY_UPLOADS`)
- **Random delay**: 3–8 minutes between each listing
- **Pause/Stop**: Control buttons let you pause or stop at any time
- **Chrome profile**: Always use the dedicated `C:\ebay-automation-profile` — never your personal Chrome

## Supported Marketplaces

| Key | Domain | Language | Currency | Weight | Dimensions |
|---|---|---|---|---|---|
| ebay.com | ebay.com | English | USD | lb | in |
| ebay.ca | ebay.ca | English | CAD | kg | cm |
| ebay.co.uk | ebay.co.uk | English | GBP | kg | cm |
| ebay.de | ebay.de | German | EUR | kg | cm |
| ebay.fr | ebay.fr | French | EUR | kg | cm |
| ebay.com.au | ebay.com.au | English | AUD | kg | cm |
| ebay.it | ebay.it | Italian | EUR | kg | cm |
| ebay.es | ebay.es | Spanish | EUR | kg | cm |

## Development

```bash
npm install          # Install dependencies
npm start            # Run in development
npm run build        # Package for Windows
```

### Key dependencies

| Package | Version | Purpose |
|---|---|---|
| electron | 42.4.0 | App framework |
| playwright | 1.60.0 | Browser automation via CDP |
| dotenv | 17.4.2 | Environment variables |
| electron-builder | 26.15.2 | Windows installer packaging |

## Troubleshooting

**Chrome CDP won't connect**: Make sure Chrome is running with `--remote-debugging-port=9223`. Click the **Launch** button in the title bar or restart via `launch-clean.bat`.

**Getting stuck on eBay prelist page**: eBay's product catalog flow varies. The bot handles "Continue without match", "Ohne passendes Produkt", and "Continuer sans correspondance" automatically. If stuck, click the button manually and the bot continues.

**Photos don't upload**: The bot uses the hidden `<input type="file">` element. If eBay changes their DOM, check the Chrome window and upload photos manually — the bot will continue with the rest of the form.

**Template shows in wrong language**: Switch marketplace in the dropdown, then re-open the Templates modal. Labels refresh automatically.

## Credits

Built with Electron, Playwright, and DeepSeek AI.

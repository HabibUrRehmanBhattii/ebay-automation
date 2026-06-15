const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { chromium } = require('playwright');
const { spawn, fork, execSync } = require('child_process');
const util = require('util');
const execPromise = util.promisify(require('child_process').exec);
const os = require('os');

require('dotenv').config();

// ==================== Configuration & Constants ====================
const CONFIG = {
  CHROME_PROFILE_DIR: 'C:\\ebay-automation-profile',
  CDP_PORT: 9223,
  WINDOW_WIDTH: 1280,
  WINDOW_HEIGHT: 820,
  BG_COLOR: '#020617',
  MIN_POST_DELAY_MS: 180000, // 3 minutes
  MAX_POST_DELAY_MS: 480000  // 8 minutes
};

// Supported eBay marketplaces with locale-specific overrides
const EBAY_MARKETPLACES = {
  'ebay.com':    { domain: 'ebay.com',    homeUrl: 'https://www.ebay.com/',    locale: 'en', currency: 'USD', weightUnit: 'lb', dimUnit: 'in',
    category: 'Building Toy Complete Sets & Packs', conditionLabel: 'New', country: 'United States', countrySearch: 'united',
    searchBtn: 'Search', createListingBtn: 'Create listing', singleListingBtn: 'Single listing',
    continueWithoutMatch: /continue without match/i, continueToListing: 'Continue to listing',
    uploadBtn: /upload from computer/i, itemTitle: /item title/i, itemPrice: /item price/i, weightLabel: /enter weight in pounds/i,
    lengthLabel: /enter package length/i, widthLabel: /enter package width/i, depthLabel: /enter package depth/i,
    countryOriginLabel: /country of origin/i, listItBtn: 'List it', successHeading: /your listing is now live/i },
  'ebay.ca':     { domain: 'ebay.ca',     homeUrl: 'https://www.ebay.ca/',    locale: 'en', currency: 'CAD', weightUnit: 'kg', dimUnit: 'cm',
    category: 'Building Toy Complete Sets & Packs', conditionLabel: 'New', country: 'Canada', countrySearch: 'cana',
    searchBtn: 'Search', createListingBtn: 'Create listing', singleListingBtn: 'Single listing',
    continueWithoutMatch: /continue without match/i, continueToListing: 'Continue to listing',
    uploadBtn: /upload from computer/i, itemTitle: /item title/i, itemPrice: /item price/i, weightLabel: /enter weight in kilograms/i,
    lengthLabel: /enter package length/i, widthLabel: /enter package width/i, depthLabel: /enter package depth/i,
    countryOriginLabel: /country of origin/i, listItBtn: 'List it', successHeading: /your listing is now live/i },
  'ebay.co.uk':  { domain: 'ebay.co.uk',  homeUrl: 'https://www.ebay.co.uk/', locale: 'en', currency: 'GBP', weightUnit: 'kg', dimUnit: 'cm',
    category: 'Building Toy Complete Sets & Packs', conditionLabel: 'New', country: 'United Kingdom', countrySearch: 'united',
    searchBtn: 'Search', createListingBtn: 'Create listing', singleListingBtn: 'Single listing',
    continueWithoutMatch: /continue without match/i, continueToListing: 'Continue to listing',
    uploadBtn: /upload from computer/i, itemTitle: /item title/i, itemPrice: /item price/i, weightLabel: /enter weight in kilograms/i,
    lengthLabel: /enter package length/i, widthLabel: /enter package width/i, depthLabel: /enter package depth/i,
    countryOriginLabel: /country of origin/i, listItBtn: 'List it', successHeading: /your listing is now live/i },
  'ebay.de':     { domain: 'ebay.de',     homeUrl: 'https://www.ebay.de/',    locale: 'de', currency: 'EUR', weightUnit: 'kg', dimUnit: 'cm',
    category: 'Spielzeug > Sonstige', conditionLabel: 'Neu', country: 'Deutschland', countrySearch: 'deutsch',
    searchBtn: 'Find', createListingBtn: 'Angebot erstellen', singleListingBtn: 'Einzelangebot',
    searchPlaceholder: /Was möchten Sie verkaufen/i, catPlaceholder: /Wert für Kategorie eingeben/i,
    continueWithoutMatch: 'Ohne passendes Produkt', continueToListing: 'Weiter zum Angebot',
    uploadBtn: /upload from computer/i, itemTitle: 'Angebotstitel', itemPrice: 'Artikelpreis', descLabel: 'Beschreibung',
    weightLabel: /Gewicht eingeben in Kilogramm/i,
    lengthLabel: /Paketlänge eingeben in/i, widthLabel: /Paketbreite eingeben in/i, depthLabel: /Pakettiefe eingeben in/i,
    countryOriginLabel: /Herkunftsland/i, listItBtn: 'Artikel kostenlos einstellen', successHeading: /Ihr Angebot ist jetzt live/i,
    skipSellerHub: true, sellSimilarLink: 'Helemet' },
'ebay.fr':     { domain: 'ebay.fr',     homeUrl: 'https://www.ebay.fr/',    locale: 'fr', currency: 'EUR', weightUnit: 'kg', dimUnit: 'cm',
    category: 'Ensembles et packs de jouets de construction complets', conditionLabel: 'Neuf', country: 'France', countrySearch: 'fran',
    searchBtn: 'Rechercher', createListingBtn: 'Créer une annonce', singleListingBtn: 'Annonce simple',
    continueWithoutMatch: /continuer sans correspondance/i, continueToListing: 'Continuer vers l\'annonce',
    uploadBtn: /télécharger depuis l.ordinateur/i, itemTitle: /titre de l.annonce/i, itemPrice: /prix/i, weightLabel: /poids en kilogrammes/i,
    lengthLabel: /longueur du colis/i, widthLabel: /largeur du colis/i, depthLabel: /profondeur du colis/i,
    countryOriginLabel: /pays d.origine/i, listItBtn: 'Publier', successHeading: /votre annonce est en ligne/i },
  'ebay.com.au': { domain: 'ebay.com.au', homeUrl: 'https://www.ebay.com.au/', locale: 'en', currency: 'AUD', weightUnit: 'kg', dimUnit: 'cm',
    category: 'Building Toy Complete Sets & Packs', conditionLabel: 'New', country: 'Australia', countrySearch: 'austr',
    searchBtn: 'Search', createListingBtn: 'Create listing', singleListingBtn: 'Single listing',
    continueWithoutMatch: /continue without match/i, continueToListing: 'Continue to listing',
    uploadBtn: /upload from computer/i, itemTitle: /item title/i, itemPrice: /item price/i, weightLabel: /enter weight in kilograms/i,
    lengthLabel: /enter package length/i, widthLabel: /enter package width/i, depthLabel: /enter package depth/i,
    countryOriginLabel: /country of origin/i, listItBtn: 'List it', successHeading: /your listing is now live/i },
  'ebay.it':     { domain: 'ebay.it',     homeUrl: 'https://www.ebay.it/',    locale: 'it', currency: 'EUR', weightUnit: 'kg', dimUnit: 'cm',
    category: 'Set e pacchi completi di giocattoli da costruzione', conditionLabel: 'Nuovo', country: 'Italia', countrySearch: 'ital',
    searchBtn: 'Cerca', createListingBtn: 'Crea inserzione', singleListingBtn: 'Inserzione singola',
    continueWithoutMatch: /continua senza corrispondenza/i, continueToListing: 'Continua con l\'inserzione',
    uploadBtn: /carica dal computer/i, itemTitle: /titolo dell.oggetto/i, itemPrice: /prezzo/i, weightLabel: /peso in chilogrammi/i,
    lengthLabel: /lunghezza pacco/i, widthLabel: /larghezza pacco/i, depthLabel: /profondità pacco/i,
    countryOriginLabel: /paese di origine/i, listItBtn: 'Pubblica', successHeading: /la tua inserzione . ora online/i },
  'ebay.es':     { domain: 'ebay.es',     homeUrl: 'https://www.ebay.es/',    locale: 'es', currency: 'EUR', weightUnit: 'kg', dimUnit: 'cm',
    category: 'Sets y paquetes completos de juguetes de construcción', conditionLabel: 'Nuevo', country: 'España', countrySearch: 'espa',
    searchBtn: 'Buscar', createListingBtn: 'Crear anuncio', singleListingBtn: 'Anuncio individual',
    continueWithoutMatch: /continuar sin coincidencia/i, continueToListing: 'Continuar con el anuncio',
    uploadBtn: /subir desde el ordenador/i, itemTitle: /título del artículo/i, itemPrice: /precio/i, weightLabel: /peso en kilogramos/i,
    lengthLabel: /largo del paquete/i, widthLabel: /ancho del paquete/i, depthLabel: /profundidad del paquete/i,
    countryOriginLabel: /país de origen/i, listItBtn: 'Publicar', successHeading: /tu anuncio ya está activo/i },
};

let currentMarketplace = 'ebay.com';

function getMarketplaceConfig() {
  return EBAY_MARKETPLACES[currentMarketplace] || EBAY_MARKETPLACES['ebay.com'];
}

function runPowerShell(scriptContent) {
  if (process.platform !== 'win32') return;
  const tmpFile = path.join(os.tmpdir(), `ebay-auto-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
  try {
    fsSync.writeFileSync(tmpFile, scriptContent, 'utf8');
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`, { windowsHide: true, stdio: 'ignore' });
  } catch (e) {} finally {
    try { fsSync.unlinkSync(tmpFile); } catch (_) {}
  }
}

// ==================== App State ====================
let mainWindow = null;
let debugBrowser = null;
let currentQueue = [];
let isAutomationRunning = false;
let isAutomationPaused = false;
let defaultPrice = 65;
let targetFolder = null;
let defaultTitleTemplate = '${name} - 3D Printed DIY Cosplay Kit';

let tray = null;
let isQuitting = false;
let chromeVisible = true;
let terminalVisible = false;

const ebayCookiesFile = path.join(app.getPath('userData'), 'ebay-cookies.json');

// ==================== Window ====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: CONFIG.WINDOW_WIDTH, height: CONFIG.WINDOW_HEIGHT,
    minWidth: 980, minHeight: 680,
    backgroundColor: CONFIG.BG_COLOR, frame: false,
    titleBarStyle: 'hidden',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
    icon: path.join(__dirname, 'icon.png'), show: false,
  });
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => { mainWindow.show(); sendBrowserStatus(); });
  const forceShow = setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) { mainWindow.show(); sendBrowserStatus(); } }, 5000);
  mainWindow.once('ready-to-show', () => clearTimeout(forceShow));
  mainWindow.on('closed', () => { clearTimeout(forceShow); mainWindow = null; });
  setTimeout(() => { initSystemTray(); }, 200);
  mainWindow.on('close', (event) => {
    if (!isQuitting) { event.preventDefault(); mainWindow.hide(); }
    else { killBotChrome(); forceCloseTerminal(); }
  });
}

function initSystemTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, 'icon.png');
  try {
    if (require('fs').existsSync(iconPath)) tray = new Tray(iconPath);
    else return;
  } catch (e) { return; }
  tray.setToolTip('eBay Automation Studio');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { label: 'Quit Automation', click: () => { isQuitting = true; killBotChrome(); forceCloseTerminal(); if (mainWindow) mainWindow.destroy(); app.quit(); } }
  ]));
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

// ==================== Helpers ====================
function sendLog(message) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('log', message);
  else console.log('[Pre-main]', message);
}
function sendQueueUpdate() { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('queue-update', currentQueue); }
function sendStatusUpdate() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('status-update', { isRunning: isAutomationRunning, isPaused: isAutomationPaused });
}
function sendBrowserStatus(status = null) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('browser-status', status || (debugBrowser ? 'connected' : 'disconnected'));
}

async function findFirstImage(folderPath) {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && ['.jpg','.jpeg','.png','.webp','.gif'].includes(path.extname(entry.name).toLowerCase()))
        return path.join(folderPath, entry.name);
    }
  } catch (_) {}
  return null;
}

async function getImagesInFolder(folderPath) {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => path.join(folderPath, e.name)).filter(p => /\.(jpe?g|png|webp|gif)$/i.test(p));
  } catch (_) { return []; }
}

// ==================== Processed / Settings / Templates ====================
const processedFile = path.join(app.getPath('userData'), 'processed.json');
async function loadProcessed() { try { const d = JSON.parse(await fs.readFile(processedFile, 'utf8')); return Array.isArray(d.processed) ? d.processed : []; } catch { return []; } }
async function saveProcessed(list) { try { await fs.writeFile(processedFile, JSON.stringify({ processed: list }, null, 2)); } catch (e) { sendLog(`[Error]: processed.json — ${e.message}`); } }

const folderCustomizationsFile = path.join(app.getPath('userData'), 'folder_customizations.json');
async function loadFolderCustomizations() { try { return JSON.parse(await fs.readFile(folderCustomizationsFile, 'utf8')); } catch { return {}; } }
async function saveFolderCustomizations(c) { try { await fs.writeFile(folderCustomizationsFile, JSON.stringify(c, null, 2), 'utf8'); return true; } catch (e) { return false; } }

const settingsFile = path.join(app.getPath('userData'), 'settings.json');
async function loadSettings() { try { return JSON.parse(await fs.readFile(settingsFile, 'utf8')); } catch { return {}; } }
async function saveSettings(s) { try { await fs.writeFile(settingsFile, JSON.stringify(s, null, 2), 'utf8'); return true; } catch (e) { return false; } }

const templatesFile = path.join(app.getPath('userData'), 'templates.json');
const defaultTemplates = {
  helmet: { label: "Helmet DIY", text: `3D Printed DIY Cosplay Helmet Kit - \${name}\n\nBring your favorite character to life with this highly detailed, 3D printed DIY cosplay helmet kit! Perfect for cosplayers, makers, and collectors.\n\nWhat is included:\n- Premium quality 3D printed raw parts (unassembled)\n- Printed in durable PLA/PETG material\n- Raw print status: Needs sanding, priming, and painting to your liking\n\nSizing:\n- Fits standard adult head sizes (approx. 22-24 inches circumference).\n\nPlease note: This is a DIY kit. Sanding, gluing, and painting are required.\n\nShipping: Ships within 1-3 weeks depending on workload, with tracking.` },
  axe: { label: "Axe DIY", text: `3D Printed DIY Cosplay Axe Kit - \${name}\n\nCraft the ultimate weapon prop with this premium 3D printed DIY cosplay axe kit! Superb details, perfect for display, conventions, or photoshoot.\n\nWhat is included:\n- Premium 3D printed raw parts (unassembled)\n- Engineered with alignment keys/internal dowel channels\n- Printed in robust PLA/PETG\n\nNote: Gluing, sanding, and painting are required. Assembly rod/dowel not included.\n\nShipping: Ships within 1-3 weeks depending on workload, with tracking.` },
  sword: { label: "Sword DIY", text: `3D Printed DIY Cosplay Sword Kit - \${name}\n\nForge your own legendary blade! Features screen-accurate details and a durable design.\n\nWhat is included:\n- Raw 3D printed pieces (unassembled)\n- Internal alignment channels for reinforcing rod\n- Printed in high-strength PLA/PETG\n\nNote: Sanding, assembly (glue), and custom paint work are required. Reinforcing rod not included.\n\nShipping: Ships within 1-3 weeks depending on workload, with tracking.` },
  armor: { label: "Armor DIY", text: `3D Printed DIY Cosplay Armor Set/Piece - \${name}\n\nUpgrade your cosplay with this highly detailed, 3D printed DIY armor kit!\n\nWhat is included:\n- Raw 3D printed armor parts (unassembled and unpainted)\n- Durable PLA/PETG construction\n\nSizing: Standard adult fit.\n\nNote: Sanding, priming, painting, and strapping are required.\n\nShipping: Ships within 1-3 weeks depending on workload, with tracking.` },
  mask: { label: "Mask", text: `3D Printed Cosplay Mask / Wearable Prop - \${name}\n\nHighly detailed, screen-accurate 3D printed cosplay mask! Lightweight and durable.\n\nFeatures:\n- Raw 3D print ready for your custom finish\n- Printed in high-grade PLA/PETG\n\nNote: Straps, padding, painting, and finishing are done by the buyer.\n\nShipping: Ships within 1-3 weeks depending on workload, with tracking.` },
  lifesize: { label: "Special Life Sized", text: `Life-Size 3D Printed DIY Cosplay Prop / Replica - \${name}\n\nAn incredible 1:1 scale life-size replica prop!\n\nDetails:\n- Full 1:1 scale life-size model\n- 3D printed raw assembly kit\n- Highly detailed surfaces\n\nNote: Assembly, gluing, sanding, and painting are required.\n\nShipping: Ships within 1-3 weeks depending on workload, with tracking.` },
  universal: { label: "Universal", text: `3D Printed DIY Cosplay Prop Kit - \${name}\n\nPremium 3D printed DIY replica prop. A fantastic project for any cosplay enthusiast, maker, or gamer!\n\nIncludes:\n- High-quality raw 3D printed parts\n- Durable PLA/PETG material\n- Unassembled and unpainted\n\nNote: Sanding, assembly (gluing), and painting are required.\n\nShipping: Ships within 1-3 weeks depending on workload, with tracking.` }
};

// Auto-detect template from folder name using keyword matching
function guessTemplateFromName(folderName) {
  const n = folderName.toLowerCase();
  if (/\bhelmet\b|helemt|\bvisor\b|\bcrown\b|\bhood\b/.test(n))          return 'helmet';
  if (/\bmask\b|\bmasked\b|face[\s-]?shell|faceshell/.test(n))            return 'mask';
  if (/\bsword\b|\bblade\b|\bkatana\b|\btrident\b|\bsai\b/.test(n))      return 'sword';
  if (/\baxe\b|\bax\b|\baxes\b|\bstormbreaker\b/.test(n))                 return 'axe';
  if (/\barmor\b|\barmour\b|\bcostume\b|\bgauntlet\b|\bchest\b/.test(n))  return 'armor';
  if (/\blife[\s-]?size|\blifesized\b|\bstatue\b|\bfull[\s-]?size/.test(n)) return 'lifesize';
  return 'universal';
}

async function loadTemplatesInternal() {
  try { const d = JSON.parse(await fs.readFile(templatesFile, 'utf8')); return (d && typeof d === 'object') ? d : defaultTemplates; }
  catch { try { await fs.writeFile(templatesFile, JSON.stringify(defaultTemplates, null, 2)); } catch (_) {} return defaultTemplates; }
}
async function saveTemplatesInternal(t) { try { await fs.writeFile(templatesFile, JSON.stringify(t, null, 2)); return true; } catch (e) { return false; } }

// ==================== Folder Scanning ====================
ipcMain.handle('select-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { title: 'Select Target Product Folder', properties: ['openDirectory', 'createDirectory'], buttonLabel: 'Select Folder' });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths[0];
});
ipcMain.handle('get-last-folder', async () => { try { const s = await loadSettings(); if (s.lastFolder) { try { await fs.access(s.lastFolder); return s.lastFolder; } catch (_) {} } } catch (_) {} return null; });

function getFolderValidity(name, imageCount) {
  if (imageCount === 0) return { valid: false, status: 'Review', reason: 'No Images' };
  if (/^item_/i.test(name)) return { valid: false, status: 'Review', reason: 'Generic Name' };
  if (/\s\(\d+\)$/.test(name)) return { valid: false, status: 'Review', reason: 'Duplicate' };
  return { valid: true, status: 'Pending', reason: null };
}

ipcMain.handle('scan-folder', async (event, folderPath) => {
  if (!folderPath) return [];
  targetFolder = folderPath; currentQueue = [];
  try {
    const settings = await loadSettings(); settings.lastFolder = folderPath; await saveSettings(settings);
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const subdirs = entries.filter(e => e.isDirectory());
    const processed = await loadProcessed();
    const customizations = await loadFolderCustomizations();
    sendLog(`[System]: Found ${subdirs.length} subfolders. Scanning items...`);
    for (const dir of subdirs) {
      const isProcessed = processed.includes(dir.name);
      const fullPath = path.join(folderPath, dir.name);
      await ensureImagesExtracted(fullPath);
      const thumb = await findFirstImage(fullPath);
      const images = await getImagesInFolder(fullPath);
      const validity = getFolderValidity(dir.name, images.length);
      const custom = customizations[dir.name] || {};
      currentQueue.push({ name: dir.name, fullPath, status: isProcessed ? 'Done' : validity.status, errorReason: isProcessed ? null : validity.reason, thumb, price: custom.price, template: custom.template || guessTemplateFromName(dir.name) });
    }
    sendLog(`[Scanner]: ${currentQueue.length} folders scanned: ${currentQueue.filter(i => i.status !== 'Done').length} pending, ${currentQueue.filter(i => i.status === 'Done').length} published.`);
    sendQueueUpdate(); return currentQueue;
  } catch (err) { sendLog(`[Error]: Could not read directory — ${err.message}`); return []; }
});

// ==================== Folder Name Cleaning ====================
function cleanFolderName(name) {
  let cleaned = name;
  cleaned = cleaned.replace(/-\d{8}T\d{6}Z(?:-\d+)*$/i, '');
  cleaned = cleaned.replace(/\s*@[\w-]+/gi, '');
  cleaned = cleaned.replace(/\s*t\.me_\S+/gi, '');
  cleaned = cleaned.replace(/^[\s-_]+|[\s-_]+$/g, '');
  return cleaned || name;
}

async function getUniqueFolderName(parentDir, cleanedName, originalName) {
  let targetName = cleanedName, counter = 1;
  while (true) {
    if (targetName === originalName) return targetName;
    try { await fs.access(path.join(parentDir, targetName)); targetName = `${cleanedName} (${counter})`; counter++; }
    catch { return targetName; }
  }
}

async function hasZipFileRecursive(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const e of entries) { if (e.isFile() && e.name.toLowerCase().endsWith('.zip')) return true; if (e.isDirectory() && await hasZipFileRecursive(path.join(dirPath, e.name))) return true; }
  } catch (_) {}
  return false;
}

async function runPowerShellAsync(scriptContent) {
  if (process.platform !== 'win32') return;
  const tmpFile = path.join(os.tmpdir(), `ebay-auto-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
  try { await fs.writeFile(tmpFile, scriptContent, 'utf8'); await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`, { windowsHide: true }); }
  catch (e) { sendLog(`[Error]: PowerShell zip extract failed - ${e.message}`); }
  finally { try { await fs.unlink(tmpFile); } catch (_) {} }
}

async function extractImagesFromZips(folderPath) {
  if (process.platform !== 'win32') return;
  const escapedPath = folderPath.replace(/'/g, "''");
  const script = `Add-Type -AssemblyName System.IO.Compression.FileSystem\n$parentDir = '${escapedPath}'\n$zips = Get-ChildItem -Path $parentDir -Filter *.zip -File -Recurse\nforeach ($zipFile in $zips) {\n    try {\n        $zip = [System.IO.Compression.ZipFile]::OpenRead($zipFile.FullName)\n        foreach ($entry in $zip.Entries) {\n            if ($entry.FullName -match '\\.(jpe?g|png|webp|gif)$') {\n                $entryName = $entry.Name\n                if ($entryName) {\n                    $targetPath = Join-Path $parentDir $entryName\n                    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)\n                }\n            }\n        }\n        $zip.Dispose()\n    } catch {}\n}\n`;
  await runPowerShellAsync(script);
}

async function ensureImagesExtracted(folderPath) {
  try {
    const flagFile = path.join(folderPath, '.extracted-imgs');
    try { await fs.access(flagFile); return; } catch {}
    await forceExtractImagesFromZips(folderPath);
  } catch (_) {}
}

async function forceExtractImagesFromZips(folderPath) {
  const images = await getImagesInFolder(folderPath);
  if (images.length <= 1 && await hasZipFileRecursive(folderPath)) {
    sendLog(`[Unzip]: "${path.basename(folderPath)}" has ${images.length} image(s) and zip(s). Extracting...`);
    await extractImagesFromZips(folderPath);
    const flagFile = path.join(folderPath, '.extracted-imgs');
    await fs.writeFile(flagFile, 'extracted', 'utf8');
    const newCount = (await getImagesInFolder(folderPath)).length;
    sendLog(`[Unzip]: Done. ${newCount} images now in folder.`);
    return { success: true, newCount };
  } else if (images.length > 1) {
    return { success: true, message: `Already has ${images.length} images` };
  } else {
    return { success: false, message: 'No zip files found in folder' };
  }
}

ipcMain.handle('clean-folder-names', async (event, folderPath) => {
  if (isAutomationRunning) return { success: false, message: 'Cannot clean while automation is running.' };
  if (!folderPath) return { success: false, message: 'No folder path selected.' };
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const subdirs = entries.filter(e => e.isDirectory());
    let renamedCount = 0;
    const processed = await loadProcessed(); let processedChanged = false;
    for (const dir of subdirs) {
      const cleanedName = cleanFolderName(dir.name);
      if (cleanedName !== dir.name) {
        const uniqueName = await getUniqueFolderName(folderPath, cleanedName, dir.name);
        if (uniqueName !== dir.name) {
          await fs.rename(path.join(folderPath, dir.name), path.join(folderPath, uniqueName));
          sendLog(`[Scanner]: Renamed folder "${dir.name}" -> "${uniqueName}"`);
          const idx = processed.indexOf(dir.name);
          if (idx !== -1) { if (!processed.includes(uniqueName)) processed[idx] = uniqueName; else processed.splice(idx, 1); processedChanged = true; }
          const customizations = await loadFolderCustomizations();
          if (customizations[dir.name]) { customizations[uniqueName] = customizations[dir.name]; delete customizations[dir.name]; await saveFolderCustomizations(customizations); }
          renamedCount++;
        }
      }
    }
    if (processedChanged) { await saveProcessed(processed); }
    if (renamedCount > 0) sendLog(`[Scanner]: Cleaned ${renamedCount} folder names.`);
    else sendLog(`[Scanner]: No folders needed renaming.`);
    return { success: true, renamedCount };
  } catch (err) { return { success: false, message: err.message }; }
});

// ==================== Automation Engine ====================
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function jitter(baseMs = 1500) { return Math.floor(Math.random() * baseMs * 0.7 + baseMs * 0.65); }
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Dynamic catalog-bypass search: extracts meaningful keywords from product name
function getSearchKeywords(itemName) {
  const cleaned = itemName.replace(/[\d+_-]/g, ' ').replace(/\.stl|\.obj|\.3mf/gi, '').replace(/\s{2,}/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 1);
  // Pick 2-3 random keywords to avoid identical searches every run
  const count = Math.min(words.length, randomBetween(2, 3));
  const shuffled = words.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join(' ');
}

// Humanized mouse click: hover first with random offset, then click with micro-delay
async function humanClick(page, selector, opts = {}) {
  const el = typeof selector === 'string' ? page.locator(selector) : selector;
  try {
    const box = await el.boundingBox();
    if (box) {
      const offsetX = randomBetween(-5, 5);
      const offsetY = randomBetween(-3, 3);
      await page.mouse.move(box.x + box.width / 2 + offsetX, box.y + box.height / 2 + offsetY, { steps: randomBetween(3, 8) });
      await delay(randomBetween(80, 250));
    }
    await el.click({ timeout: opts.timeout || 10000, force: opts.force });
  } catch (_) {
    await el.click({ timeout: opts.timeout || 10000, force: true });
  }
}

// Humanized type: types character by character with natural speed variation
async function humanType(page, selector, text) {
  const el = typeof selector === 'string' ? page.locator(selector) : selector;
  await el.click();
  await delay(jitter(200));
  await el.press('ControlOrMeta+a');
  await delay(jitter(150));
  for (const char of text) {
    await el.press(char);
    await delay(randomBetween(30, 120));
  }
}

async function fillSlowly(locator, text) {
  await locator.click();
  await delay(200);
  await locator.fill(text);
}

async function clickVisibleActionButton(page, label, options = {}) {
  const timeout = options.timeout || 15000;
  const exactLabel = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const labelRegex = new RegExp(`^\\s*${exactLabel}\\s*$`, 'i');
  const deadline = Date.now() + timeout;
  const candidates = [page.getByRole('button', { name: labelRegex }), page.locator('button, div[role="button"], span[role="button"]').filter({ hasText: labelRegex })];
  while (Date.now() < deadline) {
    for (const locator of candidates) {
      const count = await locator.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const c = locator.nth(i);
        if (!await c.isVisible().catch(() => false)) continue;
        if (/image|photo|carousel|previous/i.test((await c.getAttribute('aria-label').catch(() => '')) || '')) continue;
        if (await c.getAttribute('aria-disabled').catch(() => '') === 'true' || await c.getAttribute('disabled').catch(() => null) !== null || !await c.isEnabled().catch(() => true)) continue;
        await c.scrollIntoViewIfNeeded().catch(() => {});
        await c.click({ timeout: 5000 });
        return true;
      }
    }
    await delay(350);
  }
  throw new Error(`Could not find "${label}" button.`);
}

// DeepSeek
async function generateDescriptionWithDeepSeek(apiKey, productName) {
  sendLog(`[DeepSeek]: Generating description for "${productName}" (locale: ${getMarketplaceConfig().locale})...`);
  try {
    const mp=getMarketplaceConfig();
    const lang=mp.locale==="de"?"German":mp.locale==="fr"?"French":mp.locale==="it"?"Italian":mp.locale==="es"?"Spanish":"English";
    const prompt=`Write a high-converting, friendly, and details-rich eBay product description in ${lang} for: "${productName}".
This is a raw 3D printed DIY cosplay prop/helmet kit. Use HTML formatting. Include a shipping section. Generate the entire response in ${lang} only.`;
    const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: prompt }] }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const d=await response.json();
    const text=d.choices?.[0]?.message?.content?.trim()||`${productName} — Raw 3D printed DIY cosplay kit.`;
    sendLog(`[DeepSeek]: Generated (${text.length} chars).`);
    return text;
  } catch (e) { sendLog(`[DeepSeek Error]: ${e.message}`); return `<p><b>${productName}</b> — Raw 3D printed DIY cosplay kit.</p>`; }
}

async function generateTitleWithDeepSeek(apiKey, folderName) {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: `Convert this raw folder name into a short, clean eBay listing title (max 80 chars): "${folderName}". Reply with only the title.` }], max_tokens: 40 }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || folderName;
  } catch (e) { return folderName.replace(/[\d_-]+/g, ' ').replace(/\s{2,}/g, ' ').trim(); }
}

async function diagnoseErrorWithDeepSeek(apiKey, itemName, errorMessage) {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: `My eBay listing automation failed on "${itemName}" with: "${errorMessage.substring(0, 300)}". In 1-2 sentences, what went wrong?` }], max_tokens: 80 }) });
    if (!response.ok) return;
    const data = await response.json();
    const d = data.choices?.[0]?.message?.content?.trim();
    if (d) sendLog(`[DeepSeek Diagnosis]: ${d}`);
  } catch (_) {}
}

const EBAY_CATEGORY_MAP = {
  'toys': /Toys & Hobbies/i, 'collectibles': /Collectibles/i, 'art': /Art/i, 'crafts': /Crafts/i,
  'costumes': /Costumes/i, 'props': /Props/i, 'electronics': /Electronics/i, 'clothing': /Clothing/i,
  'sporting': /Sporting Goods/i, 'home': /Home & Garden/i, 'other': /Everything Else/i,
};

async function selectEbayCategoryWithDeepSeek(apiKey, productName) {
  try {
    const cats = Object.keys(EBAY_CATEGORY_MAP).join(', ');
    const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: `For an eBay listing titled "${productName}" (3D printed DIY cosplay kit), pick the single most fitting category: ${cats}. Reply with one word.` }], max_tokens: 10 }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = (await response.json()).choices?.[0]?.message?.content?.trim().toLowerCase() || '';
    for (const [key, regex] of Object.entries(EBAY_CATEGORY_MAP)) { if (raw.includes(key)) return regex; }
  } catch (_) {}
  return /Collectibles/i;
}

// ====================================================================
// ★ THE MAIN LISTING CREATION — based on real Playwright recording
// ====================================================================
async function createEbayListing({ searchName, title, description, price, imagePaths, titleTemplate, apiKey, uploadState = { count: 0 }, MAX_DAILY_UPLOADS = 15 }) {
  const cdpEndpoints = [`http://127.0.0.1:${CONFIG.CDP_PORT}`, `http://localhost:${CONFIG.CDP_PORT}`];
  sendLog(`[Playwright]: Connecting...`);

  let browser, lastErr;
  for (const ep of cdpEndpoints) {
    try { browser = await chromium.connectOverCDP(ep); sendBrowserStatus('connected'); break; }
    catch (e) { lastErr = e; }
  }
  if (!browser) return { success: false, message: lastErr?.message || 'CDP fail' };

  try {
    const contexts = browser.contexts();
    const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
    let page = await context.newPage();
    const mp = getMarketplaceConfig();  // ★ locale-aware config
    const domain = mp.domain;

    // ---- 1. Navigate to listing creation ----
    let sellSimilarUsed = false;
    if (mp.skipSellerHub && mp.sellSimilarLink) {
      // PRIMARY: start from prelist, try Sell Similar on template listing first
      await page.goto(`https://www.${domain}/sl/prelist/suggest?sr=shstart`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(4000);
      sendLog(`[1/10] Prelist: ${page.url()}`);
      try {
        sendLog(`[1/10] PRIMARY: Sell Similar "${mp.sellSimilarLink}"...`);
        await page.getByRole('link', { name: mp.sellSimilarLink }).click({ timeout: 8000 });
        sellSimilarUsed = true;
        await delay(4000);
        for (const p of context.pages()) {
          if (p !== page && p.url().includes('ebay.') && (p.url().includes('/sl/sell') || p.url().includes('/lstng'))) {
            await page.close().catch(() => {}); page = p; await page.bringToFront(); break;
          }
        }
        sendLog(`[1/10] Sell Similar OK → form: ${page.url()}`);
      } catch (_) { sendLog('[1/10] Sell Similar unavailable — using prelist.'); }
    }
    if (!mp.skipSellerHub) {
      await page.goto(`https://www.${domain}/sh/lst/active`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(4000);
      sendLog('[1/10] Create listing...');
      await clickVisibleActionButton(page, mp.createListingBtn, { timeout: 15000 });
      await delay(1500);
      sendLog('[2/10] Single listing...');
      try { await page.getByRole('link', { name: mp.singleListingBtn }).click({ timeout: 8000 }); }
      catch (_) { await page.getByRole('link', { name: /single listing|einzelangebot|annonce simple|inserzione singola|anuncio individual/i }).click({ timeout: 5000, force: true }).catch(() => {}); }
      await delay(4000);
      for (const p of context.pages()) {
        if (p !== page && p.url().includes('ebay.')) { await page.close().catch(() => {}); page = p; await page.bringToFront(); break; }
      }
      sendLog(`[2b] Prelist: ${page.url()}`);
    }
    await delay(3000);

    if (!sellSimilarUsed) {
    // ---- 2. Type product name -> Search ----
    try {
      const currentUrl = page.url();
      sendLog(`[2/10] Page: ${currentUrl}`);
      // Dismiss cookie banners/overlays
      await page.keyboard.press('Escape'); await delay(500);
      await page.mouse.click(300, 300); await delay(500);
      // Find search box - multiple fallbacks
      const searchPlaceholder = mp.searchPlaceholder || /tell us what you.re selling/i;
      let sellBox;
      try { sellBox = page.getByRole('textbox', { name: searchPlaceholder }); await sellBox.waitFor({ state: 'visible', timeout: 5000 }); }
      catch (_) { sellBox = null; }
      if (!sellBox) {
        try { sellBox = page.getByRole('textbox').first(); await sellBox.waitFor({ state: 'visible', timeout: 5000 }); }
        catch (_) { sellBox = null; }
      }
      if (!sellBox) {
        try { await page.locator('input[type="text"]').first().click({ timeout: 5000 }); sellBox = page.locator('input[type="text"]').first(); }
        catch (_) {}
      }
      if (!sellBox) throw new Error('No search box on page');
      // Dynamic catalog bypass: extract keywords from the actual product name
      // Varies on every run to avoid behavioral fingerprinting
      const searchTerm = (searchName && searchName.length > 3) ? getSearchKeywords(searchName) : 'cosplay prop';
      sendLog(`[2/10] Search term: "${searchTerm}"`);
      await fillSlowly(sellBox, searchTerm);
      await delay(500);
      try { await page.getByRole('button', { name: mp.searchBtn, exact: true }).click({ timeout: 5000 }); }
      catch (_) { try { await page.locator(`button:has-text("${mp.searchBtn}")`).first().click({ timeout: 3000, force: true }); } catch (__) { await page.keyboard.press('Enter'); } }
      sendLog('[2/10] Searched.');
    } catch (e) { sendLog(`[2/10] Search failed: ${e.message}`); }
    await delay(3000);

    // ---- Continue without match if no catalog match ----
    try {
      await page.getByRole('button', { name: mp.continueWithoutMatch }).click({ timeout: 3000 });
      sendLog('[3b] Continue without match.');
      await delay(1500);
    } catch (_) {}

    // ---- 4. Category ----
    try {
      const catPlaceholder = mp.catPlaceholder || /enter a category value|kategoriewert|valeur de cat|valore della categoria|valor de categoría/i;
      const catIn = page.getByRole('textbox', { name: catPlaceholder });
      await catIn.waitFor({ state: 'visible', timeout: 10000 });
      await catIn.click();
      // If category contains '>' it's a breadcrumb (e.g. "Spielzeug > Sonstige") — click by exact text
      // Otherwise it's a search term (e.g. "Building Toy Complete Sets & Packs") — click first > match
      const catText = mp.category;
      await catIn.fill(catText.split('>')[0].trim());
      await delay(2500);
      if (catText.includes('>')) {
        await page.getByText(catText, { exact: true }).click({ timeout: 5000 });
      } else {
        await page.getByText(/>/).first().click({ timeout: 5000 });
      }
      sendLog('[4/10] Category: ' + catText.substring(0, 50));
    } catch (e) {
      sendLog(`[4/10] Category failed: ${e.message}`);
      try { await page.keyboard.press('ArrowDown'); await delay(500); await page.keyboard.press('Enter'); } catch (_) {}
    }

    // ---- 5. Condition ----
    try {
      // Try the recording's exact pattern: getByRole('group').getByText('Neu')
      await page.getByRole('group').getByText(mp.conditionLabel).first().click({ timeout: 5000 });
    } catch (_) {
      try { await page.getByRole('radio', { name: mp.conditionLabel }).click({ timeout: 5000 }); }
      catch (__) { await page.locator('label').filter({ hasText: mp.conditionLabel }).first().click({ timeout: 3000, force: true }).catch(() => {}); }
    }
    sendLog('[5/10] Condition: ' + mp.conditionLabel);
    await delay(2000);

    // Re-check for "Ohne passendes Produkt" / continue-without-match (may appear here on some locales)
    let lateSkip = false;
    try {
      await page.getByRole('button', { name: mp.continueWithoutMatch }).click({ timeout: 3000 });
      sendLog('[5b] Continue without match.');
      lateSkip = true;
      await delay(2000);
    } catch (_) {}

    // If skip was clicked, condition may have been reset — re-select it
    if (lateSkip) {
      try {
        await page.getByRole('group').getByText(mp.conditionLabel).first().click({ timeout: 3000 });
        sendLog('[5c] Condition re-selected.');
        await delay(1000);
      } catch (_) {}
    }

    // ---- 6. Continue to listing ----
    try {
      await page.getByRole('button', { name: mp.continueToListing }).click({ timeout: 20000 });
    } catch (_) {
      await page.locator(`button:has-text("${mp.continueToListing}")`).click({ timeout: 5000, force: true }).catch(() => {});
    }
    sendLog('[6/10] Continued.');
    await delay(4000);

    // Check for new tab
    for (const p of context.pages()) {
      if (p !== page && p.url().includes('ebay.') && !p.url().includes('/sh/lst') && !p.url().includes('/prelist')) {
        await page.close().catch(() => {});
        page = p; await page.bringToFront();
        break;
      }
    }

    } // end if(!sellSimilarUsed)

    // ============ ACTUAL LISTING FORM ============
    sendLog(`[Form] ${page.url()}`);

    // If page is on /itm/ (not /lstng), we landed on a sell-similar/edit page — try to start fresh
    if (page.url().includes('/itm/')) {
      sendLog(`[Form] On /itm/ page — navigating back to create fresh draft...`);
      await page.goto(`https://www.${domain}/lstng`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await delay(4000);
      sendLog(`[Form] Re-navigated: ${page.url()}`);
    }

    // Photos — use hidden file input directly, NEVER click upload button (avoids native file picker)
    if (imagePaths && imagePaths.length > 0) {
      try {
        const imgs = [...imagePaths].sort().slice(0, 12);
        sendLog(`[7/10] ${imgs.length} photos...`);
        // Go directly to the hidden <input type="file"> — clicking the upload button opens a native dialog
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 10000 });
        await fileInput.setInputFiles(imgs, { timeout: 30000 });
        sendLog('[7/10] Photos uploaded.');
        await delay(5000);
      } catch (e) { sendLog(`[Warn] Photos: ${e.message}`); }
    }

    // Title — force German template for ebay.de, regardless of what defaultTitleTemplate says
    let cleanName = title.replace(/[\d_-]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || title;
    // Override English UI template for German marketplace
    let tpl = (titleTemplate || defaultTitleTemplate || '${name}');
    if (mp.locale === 'de') {
      // Force German suffix if template is English or default
      if (tpl.includes('3D Printed') || tpl === '${name}' || tpl === '${name} - DIY Kit') {
        tpl = '${name} - 3D-gedrucktes DIY Cosplay Kit';
      }
    }
    let ft = tpl.replace(/\$\{name\}/gi, cleanName).trim();
    sendLog(`[Title] template="${tpl}" → "${ft}"`);
    try {
      const titleBox = page.getByRole('textbox', { name: mp.itemTitle });
      await titleBox.waitFor({ state: 'visible', timeout: 8000 });
      await titleBox.click();
      await titleBox.press('ControlOrMeta+a');
      await titleBox.fill(ft);
    } catch (e) { sendLog(`[Warn] Title: ${e.message}`); }

    // Brand — Unbranded (same across all locales)
    try { await page.getByRole('button', { name: /unbranded|ohne marke|sans marque|senza marca|sin marca/i }).click({ timeout: 4000 }); } catch (_) {}

    // Description in iframe
    try {
      const db = page.frameLocator('iframe[name="se-rte-frame__summary"]').getByRole('textbox', { name: /description|Beschreibung|descrizione|descripción/i });
      await db.waitFor({ state: 'visible', timeout: 10000 });
      await db.click();
      await db.clear();
      await db.fill(description);
      sendLog('[Desc] filled.');
    } catch (e) { sendLog(`[Warn] Desc: ${e.message}`); }

    // Price
    try {
      const priceBox = page.getByRole('textbox', { name: mp.itemPrice });
      await priceBox.waitFor({ state: 'visible', timeout: 8000 });
      await priceBox.click();
      await priceBox.press('ControlOrMeta+a');
      await priceBox.fill(String(price));
    } catch (e) {}

    // Shipping — unit-aware
    sendLog('[8/10] Shipping...');
    try {
      const wgt = page.getByRole('textbox', { name: mp.weightLabel });
      if (await wgt.isVisible({ timeout: 3000 }).catch(() => false)) await wgt.fill(mp.weightUnit === 'lb' ? '4' : '2');
      const ln = page.getByRole('textbox', { name: mp.lengthLabel });
      if (await ln.isVisible({ timeout: 3000 }).catch(() => false)) await ln.fill(mp.dimUnit === 'in' ? '12' : '30');
      const wd = page.getByRole('textbox', { name: mp.widthLabel });
      if (await wd.isVisible({ timeout: 3000 }).catch(() => false)) await wd.fill(mp.dimUnit === 'in' ? '12' : '30');
      const dp = page.getByRole('textbox', { name: mp.depthLabel });
      if (await dp.isVisible({ timeout: 3000 }).catch(() => false)) await dp.fill(mp.dimUnit === 'in' ? '12' : '30');
    } catch (_) {}

    // Country of Origin
    try {
      const cBtn = page.getByRole('button', { name: mp.countryOriginLabel, exact: true });
      if (await cBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cBtn.click(); await delay(800);
        await page.getByRole('textbox', { name: /search|suchen|rechercher|cerca|buscar/i }).first().fill(mp.countrySearch);
        await delay(1000);
        await page.getByText(mp.country, { exact: true }).click();
      }
    } catch (_) {}
    await delay(1000);

    // ---- SUBMIT ----
    sendLog('[9/10] Submit...');
    let submitted = false;
    try { await page.getByRole('button', { name: mp.listItBtn }).click({ timeout: 10000 }); submitted = true; }
    catch (_) {
      await page.evaluate((btnText) => { const b = document.querySelectorAll('button'); for (const el of b) { if ((el.textContent||'').trim()===btnText) { el.click(); return; } } }, mp.listItBtn);
      submitted = true;
    }
    await delay(6000);

    if (submitted) {
      try { await page.getByRole('heading', { name: mp.successHeading }).waitFor({ state: 'visible', timeout: 15000 }); sendLog('[10/10] LIVE!'); }
      catch (_) { sendLog('[10/10] Listed.'); }
      uploadState.count++;
      // Close the listing tab and ANY open eBay dialogs/popups
      try { await page.close(); } catch (_) {}
      // Also dismiss any upload/image dialogs that may be open in remaining pages
      for (const p of context.pages()) {
        try {
          await p.evaluate(() => {
            const closeBtns = document.querySelectorAll('[aria-label="Close"], [aria-label="Schließen"], .lightbox-dialog__close, [data-ebayui-dialog-close], button.dialog__close');
            closeBtns.forEach(b => b.click());
          });
        } catch (_) {}
      }
    }

    try { await browser.disconnect(); } catch (_) {}
    return { success: submitted };
  } catch (err) {
    sendLog(`[Error]: ${err.message}`);
    if (browser) { try { await browser.disconnect(); } catch (_) {} }
    return { success: false, message: err.message };
  }
}
// ====================================================================
// Process one item
// ====================================================================
// German locale templates (overrides default English templates for ebay.de)
const germanTemplates = {
  helmet: {
    label: "Helm DIY (DE)",
    text: `3D-gedrucktes DIY Cosplay Helm Kit - \${name}\n\nErwecke deinen Lieblingscharakter zum Leben mit diesem hochdetaillierten, 3D-gedruckten DIY Cosplay Helm Kit! Perfekt für Cosplayer, Bastler und Sammler.\n\nLieferumfang:\n- Hochwertige 3D-gedruckte Rohteile (unmontiert)\n- Gedruckt aus robustem PLA/PETG\n- Rohdruck: Muss geschliffen, grundiert und lackiert werden\n\nGröße:\n- Standard-Erwachsenengröße (ca. 56-61 cm Kopfumfang)\n\nWichtiger Hinweis: Dies ist ein DIY-Kit. Schleifen, Kleben und Lackieren sind erforderlich.\n\nVersand: Versand innerhalb von 1-3 Wochen je nach Arbeitsaufwand mit Sendungsverfolgung.`
  },
  axe: {
    label: "Axt DIY (DE)",
    text: `3D-gedrucktes DIY Cosplay Axt Kit - \${name}\n\nFertige die ultimative Waffen-Requisite mit diesem Premium 3D-gedruckten DIY Cosplay Axt Kit!\n\nLieferumfang:\n- Premium 3D-gedruckte Rohteile (unmontiert)\n- Mit Ausrichtungshilfen für einfache Montage\n- Gedruckt aus robustem PLA/PETG\n\nHinweis: Kleben, Schleifen und Lackieren sind erforderlich. Montagestab/-dübel nicht im Lieferumfang.\n\nVersand: Innerhalb von 1-3 Werktagen mit Sendungsverfolgung.`
  },
  sword: {
    label: "Schwert DIY (DE)",
    text: `3D-gedrucktes DIY Cosplay Schwert Kit - \${name}\n\nSchmiede deine eigene legendäre Klinge! Hochdetailliert und langlebig.\n\nLieferumfang:\n- 3D-gedruckte Rohteile (unmontiert)\n- Mit integrierten Kanälen für Verstärkungsstäbe\n- Gedruckt aus hochfestem PLA/PETG\n\nHinweis: Schleifen, Kleben und individuelle Lackierung erforderlich. Verstärkungsstab nicht im Lieferumfang.\n\nVersand: Innerhalb von 1-3 Werktagen mit Sendungsverfolgung.`
  },
  armor: {
    label: "Rüstung DIY (DE)",
    text: `3D-gedrucktes DIY Cosplay Rüstungsset - \${name}\n\nVerbessere dein Cosplay mit diesem hochdetaillierten, 3D-gedruckten DIY Rüstungskit!\n\nLieferumfang:\n- 3D-gedruckte Rohteile (unmontiert und unlackiert)\n- Robustes PLA/PETG\n\nGröße: Standard-Erwachsenengröße. Kann maßgeschneidert werden.\n\nHinweis: Schleifen, Grundieren, Lackieren und Anbringen von Gurten erforderlich.\n\nVersand: Innerhalb von 1-3 Werktagen mit Sendungsverfolgung.`
  },
  mask: {
    label: "Maske (DE)",
    text: `3D-gedruckte Cosplay Maske - \${name}\n\nHochdetaillierte, bildschirmgetreue 3D-gedruckte Cosplay Maske! Leicht und langlebig.\n\nMerkmale:\n- 3D-Rohdruck bereit für deine individuelle Veredelung\n- Gedruckt aus hochwertigem PLA/PETG\n\nHinweis: Dies ist ein DIY-Kit. Gurte, Polsterung und Lackierung werden vom Käufer angebracht.\n\nVersand: Innerhalb von 1-3 Werktagen mit Sendungsverfolgung.`
  },
  lifesize: {
    label: "Lebensgroß (DE)",
    text: `Lebensgroße 3D-gedruckte DIY Cosplay Requisite - \${name}\n\nEine unglaubliche 1:1 maßstabsgetreue Nachbildung! Perfekt für Sammlungen und Conventions.\n\nDetails:\n- Vollständiges 1:1 Modell in Lebensgröße\n- 3D-gedruckter Rohbausatz\n- Hochdetaillierte Oberflächen\n\nHinweis: Montage, Kleben, Schleifen und Lackieren erforderlich.\n\nVersand: Innerhalb von 1-3 Werktagen mit Sendungsverfolgung.`
  },
  universal: {
    label: "Universal (DE)",
    text: `3D-gedrucktes DIY Cosplay Requisiten-Kit - \${name}\n\nPremium 3D-gedruckter DIY Nachbau. Ein fantastisches Projekt für jeden Cosplay-Enthusiasten, Bastler oder Gamer!\n\nLieferumfang:\n- Hochwertige 3D-gedruckte Rohteile\n- Robustes PLA/PETG Material\n- Unmontiert und unlackiert\n\nHinweis: Dies ist ein DIY-Kit. Schleifen, Montage (Kleben) und Lackierung sind erforderlich.\n\nVersand: Versand innerhalb von 1-3 Wochen je nach Arbeitsaufwand mit Sendungsverfolgung.`
  }
};

function getDescriptionFromTemplate(templatesMap, templateKey, productName) {
  const mp = getMarketplaceConfig();
  // Use German templates for ebay.de
  const tplSource = (mp.locale === 'de' && germanTemplates[templateKey]) ? germanTemplates : templatesMap;
  const tpl = tplSource[templateKey];
  if (!tpl || !tpl.text) return `3D Printed DIY Cosplay Prop Kit - ${productName}`;
  return tpl.text.replace(/\$\{name\}/g, productName).replace(/\$\{productName\}/g, productName);
}

async function processOneItem(item, uploadState = { count: 0 }, MAX_DAILY_UPLOADS = 15) {
  item.status = 'Processing'; sendQueueUpdate();
  sendLog(`[System]: === Starting workflow for "${item.name}" ===`);
  try {
    await ensureImagesExtracted(item.fullPath);
    const imagePaths = await getImagesInFolder(item.fullPath);
    sendLog(`[Scanner]: Found ${imagePaths.length} image(s) in folder.`);
    const settings = await loadSettings();
    const deepseekKey = settings.deepseekApiKey || null;
    let productName = item.name;
    if (deepseekKey) productName = await generateTitleWithDeepSeek(deepseekKey, item.name);
    let description;
    if (item.generatedDescription) { description = item.generatedDescription; }
    else {
      const template = item.template || guessTemplateFromName(item.name);
      sendLog(`[System]: Auto-detected template "${template}" for "${item.name}".`);
      if (template !== 'deepseek') { const tpls = await loadTemplatesInternal(); description = getDescriptionFromTemplate(tpls, template, productName); }
      else { description = deepseekKey ? await generateDescriptionWithDeepSeek(deepseekKey, productName) : getDescriptionFromTemplate(await loadTemplatesInternal(), 'universal', productName); }
    }
    const priceToUse = (item.price != null) ? item.price : defaultPrice;
    const result = await createEbayListing({ searchName: item.name, title: productName, description, price: priceToUse, imagePaths, titleTemplate: defaultTitleTemplate, apiKey: deepseekKey, uploadState, MAX_DAILY_UPLOADS });
    if (result.success) {
      item.status = 'Done';
      const processed = await loadProcessed();
      if (!processed.includes(item.name)) { processed.push(item.name); await saveProcessed(processed); }
      sendLog(`[System]: "${item.name}" Done.`);
      return true;
    } else { item.status = 'Failed'; sendLog(`[Error]: Playwright flow failed for "${item.name}".`); return false; }
  } catch (err) { item.status = 'Failed'; sendLog(`[Error]: ${err.message}`); throw err; }
  finally { sendQueueUpdate(); }
}

// ====================================================================
// Automation loop + IPC
// ====================================================================
async function runAutomationLoop() {
  isAutomationRunning = true; isAutomationPaused = false; sendStatusUpdate();
  const MAX_DAILY = 15;
  const uploadState = { count: 0 };
  const items = currentQueue.filter(i => i.status === 'Pending');
  for (const item of items) {
    if (uploadState.count >= MAX_DAILY) { sendLog(`[System]: DAILY LIMIT (${MAX_DAILY}). Stopping.`); break; }
    while (isAutomationPaused && isAutomationRunning) await delay(250);
    if (!isAutomationRunning) break;
    try {
      const ok = await processOneItem(item, uploadState, MAX_DAILY);
      // Re-scan folder to refresh Published tab
      if (targetFolder) {
        const processed = await loadProcessed(); const customizations = await loadFolderCustomizations();
        const allNames = (await fs.readdir(targetFolder, { withFileTypes: true })).filter(e => e.isDirectory()).map(d => d.name);
        currentQueue = [];
        for (const nm of allNames) {
          const isP = processed.includes(nm);
          const fp = path.join(targetFolder, nm);
          const thumb = await findFirstImage(fp);
          const c = customizations[nm] || {};
          currentQueue.push({ name: nm, fullPath: fp, status: isP ? 'Done' : 'Pending', errorReason: null, thumb, price: c.price, template: c.template || guessTemplateFromName(nm) });
        }
        sendQueueUpdate();
      }
      if (ok && item !== items[items.length - 1] && isAutomationRunning) {
        const waitMs = Math.floor(Math.random() * (CONFIG.MAX_POST_DELAY_MS - CONFIG.MIN_POST_DELAY_MS + 1)) + CONFIG.MIN_POST_DELAY_MS;
        sendLog(`[System]: Resting ${(waitMs / 60000).toFixed(2)}min...`);
        const start = Date.now();
        while (Date.now() - start < waitMs && isAutomationRunning) { if (isAutomationPaused) { await delay(250); continue; } await delay(500); }
      }
    } catch (error) { sendLog(`[Error]: ${item.name} — ${error.message}`); const s = await loadSettings().catch(() => ({})); if (s.deepseekApiKey) await diagnoseErrorWithDeepSeek(s.deepseekApiKey, item.name, error.message); continue; }
    await delay(650);
    if (!isAutomationRunning) break;
  }
  if (!currentQueue.some(i => i.status === 'Pending') && isAutomationRunning) sendLog('[System]: All pending items completed!');
  isAutomationRunning = false; isAutomationPaused = false; sendStatusUpdate();
  // Push final queue state and trigger a re-scan so Published tab refreshes
  sendQueueUpdate();
  await delay(500);
  sendQueueUpdate(); // double-push to ensure renderer gets it over any stale scan
}

ipcMain.handle('start-automation', async (event, payload) => {
  if (isAutomationRunning) return { success: false, message: 'Already running' };
  if (payload?.defaultPrice != null) defaultPrice = payload.defaultPrice;
  if (payload?.titleTemplate != null) defaultTitleTemplate = payload.titleTemplate || '${name}';
  if (payload?.folder) targetFolder = payload.folder;
  if (!targetFolder) { sendLog('[Error]: No folder selected.'); return { success: false }; }
  const processed = await loadProcessed(); const customizations = await loadFolderCustomizations();
  const allNames = (await fs.readdir(targetFolder, { withFileTypes: true })).filter(e => e.isDirectory()).map(d => d.name);
  currentQueue = [];
  const lookup = {};
  if (payload?.items) payload.items.forEach(i => lookup[i.name] = i);
  for (const name of allNames) {
    const isP = processed.includes(name);
    const fp = path.join(targetFolder, name);
    await ensureImagesExtracted(fp);
    const thumb = await findFirstImage(fp);
    const lk = lookup[name]; const c = customizations[name] || {};
    const itemPrice = (lk?.price != null) ? lk.price : (c.price != null ? c.price : defaultPrice);
    const itemTpl = (lk?.template) ? lk.template : (c.template ? c.template : guessTemplateFromName(name));
    const images = await getImagesInFolder(fp);
    const validity = getFolderValidity(name, images.length);
    currentQueue.push({ name, fullPath: fp, status: isP ? 'Done' : validity.status, errorReason: isP ? null : validity.reason, thumb, price: itemPrice, template: itemTpl });
  }
  sendQueueUpdate();
  if (!currentQueue.filter(i => i.status === 'Pending').length) { sendLog('[System]: No pending items.'); return { success: false }; }
  const cdpReady = await ensureAutomationBrowserReady();
  if (!cdpReady) { sendLog('[Error]: Chrome not ready on port 9223.'); isAutomationRunning = false; isAutomationPaused = false; sendStatusUpdate(); return { success: false, message: 'Chrome not ready' }; }
  sendLog(`[System]: Starting automation for ${currentQueue.filter(i => i.status === 'Pending').length} items.`);
  runAutomationLoop();
  return { success: true };
});

ipcMain.handle('pause-automation', async () => { isAutomationPaused = !isAutomationPaused; sendStatusUpdate(); return { paused: isAutomationPaused }; });
ipcMain.handle('stop-automation', async () => { isAutomationRunning = false; isAutomationPaused = false; sendStatusUpdate(); return { success: true }; });

ipcMain.handle('run-single-item', async (event, payload) => {
  const { folder, defaultPrice: np, titleTemplate: nt } = payload || {};
  if (np != null) defaultPrice = np;
  if (nt != null) defaultTitleTemplate = nt || '${name}';
  if (!folder || !currentQueue.length) return { success: false, message: 'No queue' };
  let item = currentQueue.find(i => i.status === 'Pending');
  if (payload?.index != null && currentQueue[payload.index]) item = currentQueue[payload.index];
  if (!item || item.status !== 'Pending') return { success: false };
  if (item && payload) { if (payload.price != null) item.price = payload.price; if (payload.template != null) item.template = payload.template; }
  sendLog(`[System]: Single-item: "${item.name}"`);
  return { success: await processOneItem(item) };
});

ipcMain.handle('mark-item-done', async (event, payload) => {
  const { index, name } = payload || {};
  let item = null;
  if (typeof index === 'number' && currentQueue[index]) item = currentQueue[index];
  else if (name) item = currentQueue.find(q => q.name === name);
  if (!item) return { success: false, message: 'Item not found.' };
  if (item.status === 'Processing') return { success: false, message: 'Item is processing.' };
  const processed = await loadProcessed();
  if (!processed.includes(item.name)) { processed.push(item.name); await saveProcessed(processed); }
  item.status = 'Done'; sendQueueUpdate();
  return { success: true, name: item.name };
});

ipcMain.handle('republish-item', async (event, payload) => {
  const { name } = payload || {};
  if (!name) return { success: false, message: 'No name' };
  const processed = await loadProcessed();
  const idx = processed.indexOf(name);
  if (idx !== -1) { processed.splice(idx, 1); await saveProcessed(processed); }
  let item = currentQueue.find(i => i.name === name);
  if (!item && targetFolder) {
    const fp = path.join(targetFolder, name);
    await ensureImagesExtracted(fp);
    const thumb = await findFirstImage(fp);
    const images = await getImagesInFolder(fp);
    const validity = getFolderValidity(name, images.length);
    const c = (await loadFolderCustomizations())[name] || {};
    item = { name, fullPath: fp, status: validity.status, errorReason: validity.reason, thumb, price: c.price, template: c.template || guessTemplateFromName(name) };
    currentQueue.push(item);
  }
  if (item) {
    const images = await getImagesInFolder(item.fullPath);
    const validity = getFolderValidity(item.name, images.length);
    item.status = validity.status; item.errorReason = validity.reason;
    sendQueueUpdate();
    if (item.status === 'Pending') { processOneItem(item).catch(err => sendLog(`[Error]: Republish "${name}" — ${err.message}`)); return { success: true, status: 'Processing' }; }
    else return { success: true, status: 'Review' };
  }
  return { success: false, message: 'Not found on disk' };
});

// Move item back to queue from Published — just unmark, DON'T auto-publish
ipcMain.handle('unmark-item', async (event, payload) => {
  const { name } = payload || {};
  if (!name) return { success: false, message: 'No name' };
  const processed = await loadProcessed();
  const idx = processed.indexOf(name);
  if (idx !== -1) { processed.splice(idx, 1); await saveProcessed(processed); }
  let item = currentQueue.find(i => i.name === name);
  if (item) {
    item.status = 'Pending';
    item.errorReason = null;
    sendQueueUpdate();
    sendLog(`[System]: "${name}" moved back to product queue.`);
  }
  return { success: true, name };
});

ipcMain.handle('set-default-price', (event, p) => { defaultPrice = p; return true; });
ipcMain.handle('set-default-title-template', (event, t) => { defaultTitleTemplate = t || '${name}'; return true; });

// ==================== Chrome Launch ====================
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
].filter(Boolean);

function findChromeExecutable() { for (const c of CHROME_CANDIDATES) { if (require('fs').existsSync(c)) return c; } return null; }

function killBotChrome() {
  if (process.platform !== 'win32') return;
  runPowerShell(`$profile = "C:\\ebay-automation-profile"; $port = 9223; Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" -ErrorAction SilentlyContinue | ForEach-Object { if ($_.CommandLine -and ($_.CommandLine -like "*$profile*" -or $_.CommandLine -like "*remote-debugging-port=$port*")) { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }`);
}

function bringChromeToFront() {
  if (process.platform !== 'win32') return;
  runPowerShell(`$profile = "C:\\ebay-automation-profile"; $p = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$profile*" }; if ($p) { Add-Type -Name W32 -Namespace W32 -MemberDefinition '[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h, int n);[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);'; for ($i=0;$i -lt 5;$i++) { foreach ($pr in $p) { $pw = Get-Process -Id $pr.ProcessId -ErrorAction SilentlyContinue; if ($pw -and $pw.MainWindowHandle -ne 0) { [W32.W32]::ShowWindow($pw.MainWindowHandle, 9); [W32.W32]::SetForegroundWindow($pw.MainWindowHandle) } } Start-Sleep -Milliseconds 300 } }`);
}

function setChromeWindowVisible(visible) {
  chromeVisible = visible;
  if (process.platform !== 'win32') return;
  runPowerShell(`$n = ${visible ? 9 : 0}; $code = '[DllImport("user32.dll")]public static extern bool EnumWindows(Callback c, IntPtr l);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h, int n);[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);[DllImport("user32.dll")]public static extern int GetClassName(IntPtr h, System.Text.StringBuilder c, int m);public delegate bool Callback(IntPtr h, IntPtr l);public static System.Collections.Generic.List<IntPtr> GetWindows(int pid){var w=new System.Collections.Generic.List<IntPtr>();EnumWindows(delegate(IntPtr h,IntPtr l){uint p;GetWindowThreadProcessId(h,out p);if(p==pid){var sb=new System.Text.StringBuilder(256);GetClassName(h,sb,sb.Capacity);if(sb.ToString()=="Chrome_WidgetWin_1")w.Add(h);}return true;},IntPtr.Zero);return w;}'; Add-Type -TypeDefinition "using System;using System.Runtime.InteropServices;using System.Collections.Generic;using System.Text;public class W{" + $code + "}" -ErrorAction SilentlyContinue; $profile='C:\\ebay-automation-profile'; Get-CimInstance Win32_Process -Filter 'Name = \"chrome.exe\"' -ErrorAction SilentlyContinue | ForEach-Object { if($_.CommandLine -like \"*$profile*\"){ [W]::GetWindows($_.ProcessId) | ForEach-Object { [W]::ShowWindow($_,$n); if($n -eq 9){[W]::SetForegroundWindow($_)} } } }`);
}

async function launchAutomationChrome(visible = chromeVisible) {
  chromeVisible = visible; killBotChrome(); await delay(800);
  const chromePath = findChromeExecutable();
  const userDataDir = 'C:\\ebay-automation-profile';
  if (!chromePath) { sendLog('[Error]: Chrome not found.'); return { success: false, message: 'Chrome not found' }; }
  const profileExists = require('fs').existsSync(userDataDir);
  if (profileExists) { sendLog(`[Session]: Automation profile found at ${userDataDir}.`); }
  else { sendLog(`[Session]: Creating new profile at ${userDataDir}.`); }
  sendLog(`[System]: Launching Chrome...`); sendBrowserStatus('connecting');
  try {
    // NEVER use headless mode — it leaves detectible browser fingerprint artifacts
    // Instead, position the window off-screen when "hidden" mode is requested
    const winPos = visible ? ' --start-maximized' : ' --window-position=3000,3000 --window-size=1280,800';
    const shellCmd = `"${chromePath}" --remote-debugging-port=${CONFIG.CDP_PORT} --user-data-dir="${userDataDir}" --no-first-run --no-default-browser-check --no-sandbox${winPos}`;
    const child = spawn(shellCmd, [], { shell: true, detached: true, stdio: 'ignore', windowsHide: !visible });
    child.unref();
    if (visible) { await delay(2500); bringChromeToFront(); await delay(1000); bringChromeToFront(); }
    await delay(visible ? 1000 : 2000);
    if (await isCdpAvailable()) { sendLog(`[System]: Chrome ready.`); sendBrowserStatus('connected'); return { success: true }; }
    else { sendLog('[System]: Chrome launched, CDP not yet reachable.'); sendBrowserStatus('connecting'); return { success: true }; }
  } catch (err) { sendLog(`[Error]: Launch failed — ${err.message}`); sendBrowserStatus('disconnected'); return { success: false, message: err.message }; }
}

let terminalWindowHandle = null;
function getTerminalWindowHandle() {
  if (terminalWindowHandle !== null) return terminalWindowHandle;
  if (process.platform !== 'win32') return null;
  try {
    const tmpFile = path.join(os.tmpdir(), `ebay-find-${Date.now()}.ps1`);
    fsSync.writeFileSync(tmpFile, `$code = 'using System;using System.Runtime.InteropServices;using System.Collections.Generic;using System.Text;public class CF{[DllImport("user32.dll")]public static extern bool EnumWindows(EF f,IntPtr l);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll")]public static extern int GetClassName(IntPtr h,StringBuilder c,int m);public delegate bool EF(IntPtr h,IntPtr l);public static List<IntPtr> GetCW(List<int> pids){List<IntPtr> w=new List<IntPtr>();EnumWindows(delegate(IntPtr h,IntPtr l){uint p;GetWindowThreadProcessId(h,out p);if(pids.Contains((int)p)){var sb=new StringBuilder(256);GetClassName(h,sb,sb.Capacity);string c=sb.ToString();if(c=="ConsoleWindowClass"||c=="CASCADIA_HOSTING_WINDOW_CLASS")w.Add(h);}return true;},IntPtr.Zero);return w;}}';Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue;\n$pids=New-Object System.Collections.Generic.List[int];$ptc=${process.pid};$v=@{};for($i=0;$i -lt 8 -and $ptc -and -not $v.ContainsKey($ptc);$i++){$v[$ptc]=$true;$pids.Add($ptc);$wmi=Get-CimInstance Win32_Process -Filter "ProcessId = $ptc" -ErrorAction SilentlyContinue;if(-not $wmi){break}$ptc=$wmi.ParentProcessId}\n$wins=[CF]::GetCW($pids);if($wins.Count -gt 0){Write-Output $wins[0]}`, 'utf8');
    const stdout = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`, { windowsHide: true });
    try { fsSync.unlinkSync(tmpFile); } catch (_) {}
    const h = parseInt(stdout.toString().trim(), 10);
    if (h) { terminalWindowHandle = h; return h; }
  } catch (_) {}
  return null;
}

function setTerminalVisible(visible) {
  terminalVisible = visible;
  if (process.platform !== 'win32') return;
  const h = getTerminalWindowHandle();
  if (h) runPowerShell(`Add-Type -Name WSC -Namespace W32 -MemberDefinition '[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int n);';[W32.WSC]::ShowWindow([IntPtr]${h},${visible?5:0})|Out-Null`);
}

function forceCloseTerminal() {
  if (process.platform !== 'win32') return;
  const h = getTerminalWindowHandle();
  if (h) runPowerShell(`Add-Type -Name WCC -Namespace W32 -MemberDefinition '[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);';[W32.WCC]::PostMessage([IntPtr]${h},0x0010,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null`);
}

async function isCdpAvailable() {
  for (const ep of [`http://127.0.0.1:${CONFIG.CDP_PORT}`, `http://localhost:${CONFIG.CDP_PORT}`]) {
    try { const b = await chromium.connectOverCDP(ep); try { await b.disconnect(); } catch (_) {} return true; }
    catch (_) {}
  }
  return false;
}

async function ensureAutomationBrowserReady() {
  if (await isCdpAvailable()) { sendLog('[Playwright]: Chrome CDP reachable.'); sendBrowserStatus('connected'); return true; }
  sendLog('[System]: Launching Chrome...');
  const r = await launchAutomationChrome();
  if (!r.success) { sendBrowserStatus('disconnected'); return false; }
  await delay(1800);
  if (await isCdpAvailable()) { sendBrowserStatus('connected'); return true; }
  sendLog('[Warning]: Chrome not accepting CDP yet.'); sendBrowserStatus('connecting'); return false;
}

ipcMain.handle('launch-automation-chrome', async () => launchAutomationChrome());
ipcMain.handle('check-automation-browser', async () => { const ok = await isCdpAvailable(); sendBrowserStatus(ok ? 'connected' : 'disconnected'); return { ready: ok }; });
ipcMain.handle('toggle-chrome-visibility', async () => { const nv = !chromeVisible; await launchAutomationChrome(nv); if (nv) { await delay(1000); bringChromeToFront(); } return chromeVisible; });
ipcMain.handle('get-chrome-visibility', () => chromeVisible);
ipcMain.handle('toggle-terminal-visibility', () => { setTerminalVisible(!terminalVisible); return terminalVisible; });
ipcMain.handle('get-terminal-visibility', () => terminalVisible);
ipcMain.handle('restart-chrome', async (event, visible) => { killBotChrome(); await delay(600); await launchAutomationChrome(visible); return chromeVisible; });

// ==================== Cookie Helpers ====================
async function openAutomationProfileFolder() {
  try { await shell.openPath('C:\\ebay-automation-profile'); return { success: true }; }
  catch (err) { return { success: false, message: err.message }; }
}

async function exportEbayCookies() {
  let browser = null;
  try {
    for (const ep of [`http://127.0.0.1:${CONFIG.CDP_PORT}`, `http://localhost:${CONFIG.CDP_PORT}`]) { try { browser = await chromium.connectOverCDP(ep); break; } catch (_) {} }
    if (!browser) throw new Error('No Chrome on port 9223');
    const ctx = browser.contexts().length > 0 ? browser.contexts()[0] : await browser.newContext();
    const allCookies = await ctx.cookies();
    const mp = getMarketplaceConfig();
    const ebayCookies = allCookies.filter(c => (c.domain || '').includes('ebay') || (c.domain || '').includes(mp.domain));
    await fs.writeFile(ebayCookiesFile, JSON.stringify(ebayCookies, null, 2));
    sendLog(`[Session]: Backed up ${ebayCookies.length} eBay cookies.`);
    return { success: true, count: ebayCookies.length };
  } catch (err) { sendLog(`[Session Error]: ${err.message}`); return { success: false, message: err.message }; }
  finally { if (browser) { try { await browser.disconnect(); } catch (_) {} } }
}

async function importEbayCookies() {
  try {
    const cookies = JSON.parse(await fs.readFile(ebayCookiesFile, 'utf8'));
    if (!Array.isArray(cookies) || !cookies.length) throw new Error('No saved cookies.');
    let browser = null;
    const eps = [`http://127.0.0.1:${CONFIG.CDP_PORT}`, `http://localhost:${CONFIG.CDP_PORT}`];
    for (const ep of eps) { try { browser = await chromium.connectOverCDP(ep); break; } catch (_) {} }
    if (!browser) { await launchAutomationChrome(); await delay(2500); for (const ep of eps) { try { browser = await chromium.connectOverCDP(ep); break; } catch (_) {} } }
    if (!browser) throw new Error('Could not connect to Chrome.');
    const ctx = browser.contexts().length > 0 ? browser.contexts()[0] : await browser.newContext();
    await ctx.addCookies(cookies);
    sendLog(`[Session]: Injected ${cookies.length} eBay cookies.`);
    const page = await ctx.newPage();
    await page.goto(getMarketplaceConfig().homeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await delay(1800);
    sendLog(`[Session]: Session restored on ${currentMarketplace}.`);
    try { await browser.disconnect(); } catch (_) {}
    return { success: true, count: cookies.length };
  } catch (err) { sendLog(`[Session Error]: ${err.message}`); return { success: false, message: err.message }; }
}

ipcMain.handle('open-automation-profile', openAutomationProfileFolder);
ipcMain.handle('export-ebay-cookies', exportEbayCookies);
ipcMain.handle('import-ebay-cookies', importEbayCookies);

// ==================== Debug Browser ====================
async function launchDebugBrowser() {
  if (debugBrowser) { sendBrowserStatus('connected'); return { success: true }; }
  try {
    sendLog('[System]: Launching debug browser...'); sendBrowserStatus('connecting');
    debugBrowser = await chromium.launch({ headless: false, slowMo: 30, args: ['--disable-blink-features=AutomationControlled', '--no-default-browser-check'] });
    const page = await debugBrowser.newPage();
    await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await page.goto(`https://www.${getMarketplaceConfig().domain}/sl/prelist/suggest`, { waitUntil: 'domcontentloaded' });
    sendLog(`[System]: Debug browser ready.`); sendBrowserStatus('connected');
    return { success: true };
  } catch (err) { debugBrowser = null; sendBrowserStatus('disconnected'); return { success: false, message: err.message }; }
}
async function closeDebugBrowser() { if (debugBrowser) { try { await debugBrowser.close(); } catch (_) {} debugBrowser = null; } sendBrowserStatus('disconnected'); }
ipcMain.handle('launch-debug-browser', launchDebugBrowser);
ipcMain.handle('close-debug-browser', closeDebugBrowser);

// ==================== Templates & Folder IPC ====================
ipcMain.handle('load-templates', async () => {
  const tpls = await loadTemplatesInternal();
  // If on ebay.de, merge German template labels into the result
  if (currentMarketplace === 'ebay.de') {
    const merged = { ...tpls };
    for (const key of Object.keys(germanTemplates)) {
      if (merged[key]) {
        merged[key] = { ...merged[key], label: germanTemplates[key].label };
      }
    }
    return merged;
  }
  return tpls;
});
ipcMain.handle('save-templates', async (e, t) => saveTemplatesInternal(t));
// Manual unzip: extract images from zip files in a folder
ipcMain.handle('unzip-folder', async (e, folderPath) => {
  if (!folderPath) return { success: false, message: 'No folder path' };
  return await forceExtractImagesFromZips(folderPath);
});

ipcMain.handle('rename-folder', async (e, p) => {
  const { parentPath, oldName, newName } = p || {};
  if (!parentPath || !oldName || !newName) return { success: false, message: 'Invalid args' };
  try {
    await fs.access(path.join(parentPath, newName));
    return { success: false, message: `"${newName}" already exists.` };
  } catch (_) {}
  try {
    await fs.rename(path.join(parentPath, oldName), path.join(parentPath, newName));
    const processed = await loadProcessed();
    const idx = processed.indexOf(oldName);
    if (idx !== -1) { if (!processed.includes(newName)) processed[idx] = newName; else processed.splice(idx, 1); await saveProcessed(processed); }
    const c = await loadFolderCustomizations();
    if (c[oldName]) { c[newName] = c[oldName]; delete c[oldName]; await saveFolderCustomizations(c); }
    return { success: true };
  } catch (err) { return { success: false, message: err.message }; }
});
ipcMain.handle('open-folder', async (e, fp) => { try { await shell.openPath(fp); return true; } catch (_) { return false; } });
ipcMain.handle('save-folder-customization', async (e, p) => { const { folderName, price, template } = p || {}; if (!folderName) return false; const c = await loadFolderCustomizations(); c[folderName] = { price, template }; return saveFolderCustomizations(c); });

// ==================== DeepSeek ====================
ipcMain.handle('validate-deepseek-key', async (e, key) => {
  if (!key) return { success: false, message: 'Key is empty.' };
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: 'Ping' }], max_tokens: 5 }) });
    if (!r.ok) return { success: false, message: `HTTP ${r.status}` };
    const d = await r.json();
    if (d.choices?.[0]) { const s = await loadSettings(); s.deepseekApiKey = key; await saveSettings(s); return { success: true }; }
    return { success: false, message: 'Invalid response.' };
  } catch (err) { return { success: false, message: err.message }; }
});
ipcMain.handle('get-deepseek-key', async () => { try { return (await loadSettings()).deepseekApiKey || ''; } catch (_) { return ''; } });

ipcMain.handle('get-marketplace', async () => currentMarketplace);
ipcMain.handle('set-marketplace', async (event, marketplace) => {
  if (!EBAY_MARKETPLACES[marketplace]) return { success: false, message: `Unknown: ${marketplace}` };
  currentMarketplace = marketplace;
  const s = await loadSettings(); s.ebayMarketplace = marketplace; await saveSettings(s);
  sendLog(`[System]: Marketplace: ${marketplace}`);
  return { success: true, marketplace };
});
ipcMain.handle('get-marketplaces-list', async () => Object.keys(EBAY_MARKETPLACES).map(k => ({ key: k, domain: EBAY_MARKETPLACES[k].domain, homeUrl: EBAY_MARKETPLACES[k].homeUrl })));

ipcMain.handle('bulk-deepseek-rewrite', async (e, names) => {
  const s = await loadSettings();
  if (!s.deepseekApiKey) return { success: false, message: 'No API key.' };
  const results = {};
  for (const n of names) results[n] = await generateDescriptionWithDeepSeek(s.deepseekApiKey, n);
  return { success: true, results };
});
ipcMain.handle('save-uploaded-images', async (e, { folderPath, images }) => {
  if (!folderPath || !images?.length) return { success: false, message: 'Missing params.' };
  try { await fs.mkdir(folderPath, { recursive: true }); for (const img of images) { const buf = Buffer.from(img.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64'); await fs.writeFile(path.join(folderPath, img.name), buf); } return { success: true }; }
  catch (err) { return { success: false, message: err.message }; }
});

// ==================== Window Controls ====================
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => { if (mainWindow) { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); } });
ipcMain.on('window-close', () => {
  if (mainWindow) {
    if (tray && !isQuitting) mainWindow.hide();
    else { if (isQuitting) { killBotChrome(); forceCloseTerminal(); mainWindow.destroy(); } else mainWindow.close(); }
  }
});

// ==================== Startup / Cleanup ====================
app.on('before-quit', async () => {
  isQuitting = true; killBotChrome(); forceCloseTerminal();
  if (debugBrowser) { try { await debugBrowser.close(); } catch (_) {} }
  if (mainWindow) { try { mainWindow.destroy(); } catch (_) {} }
});

app.whenReady().then(async () => {
  try { const s = await loadSettings(); if (s.ebayMarketplace && EBAY_MARKETPLACES[s.ebayMarketplace]) currentMarketplace = s.ebayMarketplace; } catch (_) {}
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  await delay(1500);
  try {
    if (await isCdpAvailable()) { sendLog(`[System]: Marketplace: ${currentMarketplace}`); sendLog('[System]: Chrome CDP ready.'); sendBrowserStatus('connected'); }
    else { sendLog(`[System]: Marketplace: ${currentMarketplace}`); sendLog('[System]: Chrome not available. Use Launch button.'); sendBrowserStatus('disconnected'); }
  } catch (_) { sendBrowserStatus('disconnected'); }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin' && isQuitting) app.quit(); });

const { contextBridge, ipcRenderer } = require('electron');

// Secure bridge between renderer and main process.
// Only expose the exact methods the UI needs.

contextBridge.exposeInMainWorld('api', {
  // Folder operations (native Windows dialogs + real fs scan)
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getLastFolder: () => ipcRenderer.invoke('get-last-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  cleanFolderNames: (folderPath) => ipcRenderer.invoke('clean-folder-names', folderPath),
  loadTemplates: () => ipcRenderer.invoke('load-templates'),
  saveTemplates: (templates) => ipcRenderer.invoke('save-templates', templates),
  renameFolder: (parentPath, oldName, newName) => ipcRenderer.invoke('rename-folder', { parentPath, oldName, newName }),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  saveFolderCustomization: (folderName, price, template) => ipcRenderer.invoke('save-folder-customization', { folderName, price, template }),
  unzipFolder: (folderPath) => ipcRenderer.invoke('unzip-folder', folderPath),
  unzipAll: () => ipcRenderer.invoke('unzip-all'),

  // Automation control
  startAutomation: (payload) => ipcRenderer.invoke('start-automation', payload),
  pauseAutomation: () => ipcRenderer.invoke('pause-automation'),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  setDefaultPrice: (price) => ipcRenderer.invoke('set-default-price', price),
  setDefaultTitleTemplate: (tpl) => ipcRenderer.invoke('set-default-title-template', tpl),
  runSingleItem: (payload) => ipcRenderer.invoke('run-single-item', payload),
  markItemDone: (payload) => ipcRenderer.invoke('mark-item-done', payload),
  republishItem: (payload) => ipcRenderer.invoke('republish-item', payload),
  unmarkItem: (payload) => ipcRenderer.invoke('unmark-item', payload),

  // Debug / Playwright browser (local visible browser for testing listing flow)
  launchDebugBrowser: () => ipcRenderer.invoke('launch-debug-browser'),
  closeDebugBrowser: () => ipcRenderer.invoke('close-debug-browser'),

  // Automation Chrome (the real one that must listen on 9223 + dedicated profile for CDP + persistent eBay login)
  launchAutomationChrome: () => ipcRenderer.invoke('launch-automation-chrome'),
  checkAutomationBrowser: () => ipcRenderer.invoke('check-automation-browser'),

  // Visibility toggles (Chrome window and launcher terminal/console)
  toggleChromeVisibility: () => ipcRenderer.invoke('toggle-chrome-visibility'),
  getChromeVisibility: () => ipcRenderer.invoke('get-chrome-visibility'),
  toggleTerminalVisibility: () => ipcRenderer.invoke('toggle-terminal-visibility'),
  getTerminalVisibility: () => ipcRenderer.invoke('get-terminal-visibility'),

  // New IPC bridge for reliable Chrome restart (visible/hidden) from UI
  restartChrome: (isVisible) => ipcRenderer.invoke('restart-chrome', isVisible),

  // "Copy cookies" / persistent login tools
  openAutomationProfile: () => ipcRenderer.invoke('open-automation-profile'),
  exportEbayCookies: () => ipcRenderer.invoke('export-ebay-cookies'),
  importEbayCookies: () => ipcRenderer.invoke('import-ebay-cookies'),

  // Window controls (for frameless premium title bar)
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Live event subscriptions (main pushes updates)
  onLog: (callback) => {
    ipcRenderer.on('log', (_event, message) => callback(message));
  },
  onQueueUpdate: (callback) => {
    ipcRenderer.on('queue-update', (_event, queue) => callback(queue));
  },
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (_event, data) => callback(data));
  },
  onBrowserStatus: (callback) => {
    ipcRenderer.on('browser-status', (_event, status) => callback(status));
  },

  // DeepSeek API and Drag-and-drop Image Upload
  validateDeepSeekKey: (key) => ipcRenderer.invoke('validate-openrouter-key', key),
  getDeepSeekKey: () => ipcRenderer.invoke('get-openrouter-key'),
  bulkDeepSeekRewrite: (names) => ipcRenderer.invoke('bulk-openrouter-rewrite', names),
  saveUploadedImages: (folderPath, images) => ipcRenderer.invoke('save-uploaded-images', { folderPath, images }),

  // AI controls
  setAiEnabled: (v) => ipcRenderer.invoke('set-ai-enabled', v),
  getAiEnabled: () => ipcRenderer.invoke('get-ai-enabled'),
  setMaxDaily: (n) => ipcRenderer.invoke('set-max-daily', n),
  getMaxDaily: () => ipcRenderer.invoke('get-max-daily'),
  setAiPhotoSort: (v) => ipcRenderer.invoke('set-ai-photo-sort', v),
  getAiPhotoSort: () => ipcRenderer.invoke('get-ai-photo-sort'),

  // eBay marketplace selection (.com / .ca / .de / .co.uk / etc.)
  getMarketplace: () => ipcRenderer.invoke('get-marketplace'),
  setMarketplace: (marketplace) => ipcRenderer.invoke('set-marketplace', marketplace),
  getMarketplacesList: () => ipcRenderer.invoke('get-marketplaces-list'),
  setMultiPost: (v) => ipcRenderer.invoke('set-multi-post', v),
  getMultiPost: () => ipcRenderer.invoke('get-multi-post'),
  setEnabledMarketplaces: (list) => ipcRenderer.invoke('set-enabled-marketplaces', list),
  getEnabledMarketplaces: () => ipcRenderer.invoke('get-enabled-marketplaces'),
});

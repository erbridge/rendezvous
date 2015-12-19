'use strict';

const app           = require('app');
const BrowserWindow = require('browser-window');

// Prevent the main window from being GCed.
let mainWindow;

function onClosed() {
  mainWindow = null;
}

function createMainWindow() {
  const win = new BrowserWindow({
    width:     1920,
    height:    1080,
    resizable: true
  });

  win.loadURL(`file://${__dirname}/index.html`);

  win.on('closed', onClosed);

  return win;
}

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate-with-no-open-windows', function() {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on('ready', function() {
  mainWindow = createMainWindow();
});

'use strict';

const electron      = require('electron');

const app = electron.app;

// Prevent the main window from being garbage collected.
let mainWindow;

const onClosed = function onClosed() {
  mainWindow = null;
};

const createMainWindow = function createMainWindow() {
  const win = new electron.BrowserWindow({
    width:     1920,
    height:    1080,
    resizable: true,
  });

  win.loadURL(`file://${__dirname}/index.html`);

  win.on('closed', onClosed);

  return win;
};

app.on('window-all-closed', function onAllClosed() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate-with-no-open-windows', function onActivate() {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on('ready', function onReady() {
  mainWindow = createMainWindow();
});

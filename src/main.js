const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const db = require("./database");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#22262b",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  db.init();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("db:list", (_, table, search = "") => db.list(table, search));
ipcMain.handle("db:save", (_, table, record) => db.save(table, record));
ipcMain.handle("db:delete", (_, table, id) => db.remove(table, id));
ipcMain.handle("db:dashboard", () => db.dashboard());
ipcMain.handle("db:finalize-order", (_, order) => db.finalizeOrder(order));
ipcMain.handle("app:message", (_, options) => dialog.showMessageBox(mainWindow, options));
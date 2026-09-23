const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("netside", {
  list: (table, search) => ipcRenderer.invoke("db:list", table, search),
  save: (table, record) => ipcRenderer.invoke("db:save", table, record),
  remove: (table, id) => ipcRenderer.invoke("db:delete", table, id),
  dashboard: () => ipcRenderer.invoke("db:dashboard"),
  finalizeOrder: (order) => ipcRenderer.invoke("db:finalize-order", order),
  message: (options) => ipcRenderer.invoke("app:message", options)
});
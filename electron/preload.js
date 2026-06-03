const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    savePdf: (data) => ipcRenderer.invoke("save-pdf", data),
    exportData: () => ipcRenderer.invoke("export-data"),
    saveExport: (data) => ipcRenderer.invoke("save-export", data),
    importData: () => ipcRenderer.invoke("import-data"),
    saveLogo: (data) => ipcRenderer.invoke("save-logo", data),
    readLogo: () => ipcRenderer.invoke("read-logo"),
    deleteLogo: () => ipcRenderer.invoke("delete-logo"),
    saveCsv: (data) => ipcRenderer.invoke("save-csv", data),
    saveFile: (data) => ipcRenderer.invoke("save-file", data),
    sendEmail: (data) => ipcRenderer.invoke("send-email", data),
    minimize: () => ipcRenderer.invoke("window-minimize"),
    maximize: () => ipcRenderer.invoke("window-maximize"),
    close: () => ipcRenderer.invoke("window-close"),
    isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    savePdf: (data) => ipcRenderer.invoke("save-pdf", data),
    backupData: () => ipcRenderer.invoke("backup-data"),
    saveBackupFile: (data) => ipcRenderer.invoke("save-backup-file", data),
    restoreBackup: () => ipcRenderer.invoke("restore-backup"),
    exportData: () => ipcRenderer.invoke("export-data"),
    saveExport: (data) => ipcRenderer.invoke("save-export", data),
    importData: () => ipcRenderer.invoke("import-data"),
    saveLogo: (data) => ipcRenderer.invoke("save-logo", data),
    readLogo: () => ipcRenderer.invoke("read-logo"),
    deleteLogo: () => ipcRenderer.invoke("delete-logo"),
    saveCsv: (data) => ipcRenderer.invoke("save-csv", data),
    saveFile: (data) => ipcRenderer.invoke("save-file", data),
    sendEmail: (data) => ipcRenderer.invoke("send-email", data),
    sendEmailSmtp: (data) => ipcRenderer.invoke("send-email-smtp", data),
    saveSmtpConfig: (data) => ipcRenderer.invoke("save-smtp-config", data),
    getSmtpConfig: () => ipcRenderer.invoke("get-smtp-config"),
    minimize: () => ipcRenderer.invoke("window-minimize"),
    maximize: () => ipcRenderer.invoke("window-maximize"),
    close: () => ipcRenderer.invoke("window-close"),
    isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
});

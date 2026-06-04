import { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

function buildAppMenu(win) {
  const template = [
    {
      label: "File",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "zoomIn", accelerator: "CmdOrCtrl+=" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Developer",
      submenu: [
        {
          label: "Toggle DevTools",
          accelerator: isDev ? "F12" : "CmdOrCtrl+Shift+I",
          click: () => win?.webContents.toggleDevTools(),
        },
        {
          label: "Inspect Element",
          accelerator: "CmdOrCtrl+Shift+C",
          click: () => { win?.webContents.toggleDevTools(); win?.webContents.inspectElement(0, 0); },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

function getLogoDir() {
  const dir = path.join(app.getPath("userData"), "logos");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1360,
        height: 860,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
        frame: false,
        show: false,
    });

    const menu = buildAppMenu(win);
    Menu.setApplicationMenu(menu);

    win.webContents.on("context-menu", (e, params) => {
      const ctxMenu = Menu.buildFromTemplate([
        { label: "Back", accelerator: "Alt+Left", click: () => win?.webContents.goBack() },
        { label: "Forward", accelerator: "Alt+Right", click: () => win?.webContents.goForward() },
        { type: "separator" },
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win?.webContents.reload() },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
        { type: "separator" },
        { label: "Inspect Element", click: () => { win?.webContents.inspectElement(params.x, params.y); } },
      ]);
      ctxMenu.popup();
    });

    win.once("ready-to-show", () => win.show());

    if (isDev) {
        win.loadURL("http://localhost:5173");
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

ipcMain.handle("save-pdf", async (event, { pdfData, filename }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { success: false };
    const buffer = Buffer.from(pdfData, "base64");
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
});

ipcMain.handle("export-data", async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: `billing-backup-${Date.now()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { success: false };
    return { success: true, filePath };
});

ipcMain.handle("save-export", async (event, { filePath, data }) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
});

ipcMain.handle("backup-data", async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: `full-backup-${Date.now()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { success: false };
    return { success: true, filePath };
});

ipcMain.handle("save-backup-file", async (event, { filePath, data }) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
});

ipcMain.handle("restore-backup", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"],
    });
    if (canceled || filePaths.length === 0) return { success: false };
    const content = fs.readFileSync(filePaths[0], "utf-8");
    return { success: true, data: JSON.parse(content) };
});

ipcMain.handle("import-data", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"],
    });
    if (canceled || filePaths.length === 0) return { success: false };
    const content = fs.readFileSync(filePaths[0], "utf-8");
    return { success: true, data: JSON.parse(content) };
});

ipcMain.handle("save-logo", async (event, { base64Data, filename }) => {
  const logoDir = getLogoDir();
  const ext = filename ? path.extname(filename) : ".png";
  const logoPath = path.join(logoDir, `business_logo${ext}`);
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), "base64");
  fs.writeFileSync(logoPath, buffer);
  return { success: true, filePath: logoPath };
});

ipcMain.handle("read-logo", async () => {
  const logoDir = getLogoDir();
  const files = fs.readdirSync(logoDir).filter(f => f.startsWith("business_logo"));
  if (files.length === 0) return { success: true, data: null };
  const logoPath = path.join(logoDir, files[0]);
  const buffer = fs.readFileSync(logoPath);
  const ext = path.extname(logoPath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  const base64 = `data:${mime};base64,${buffer.toString("base64")}`;
  return { success: true, data: base64, filePath: logoPath };
});

ipcMain.handle("delete-logo", async () => {
  const logoDir = getLogoDir();
  const files = fs.readdirSync(logoDir).filter(f => f.startsWith("business_logo"));
  for (const f of files) fs.unlinkSync(path.join(logoDir, f));
  return { success: true };
});

ipcMain.handle("save-csv", async (event, { csvData, filename }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: filename || "export.csv",
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });
  if (canceled || !filePath) return { success: false };
  fs.writeFileSync(filePath, csvData, "utf-8");
  return { success: true, filePath };
});

ipcMain.handle("save-file", async (event, { data, filename, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: filters || [{ name: "All Files", extensions: ["*"] }],
  });
  if (canceled || !filePath) return { success: false };
  fs.writeFileSync(filePath, data, "utf-8");
  return { success: true, filePath };
});

ipcMain.handle("window-minimize", () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.handle("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
});
ipcMain.handle("window-close", () => BrowserWindow.getFocusedWindow()?.close());
ipcMain.handle("window-is-maximized", () => BrowserWindow.getFocusedWindow()?.isMaximized());

ipcMain.handle("send-email", async (event, { to, subject, body, attachmentPath }) => {
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (attachmentPath) {
    try {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Email Invoice',
        message: 'Invoice PDF has been saved. Please attach it manually to your email.',
        detail: `File: ${attachmentPath}\n\nYour default email client will open with the invoice details pre-filled.`,
      });
    } catch (e) { /* ignore */ }
  }
  shell.openExternal(mailto);
  return { success: true };
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

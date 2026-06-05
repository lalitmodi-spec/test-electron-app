import { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import crypto from "crypto";

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
    const iconPath = isDev
        ? path.join(__dirname, "../public/appIcon.png")
        : path.join(__dirname, "../dist/appIcon.png");

    const win = new BrowserWindow({
        width: 1360,
        height: 860,
        minWidth: 1024,
        minHeight: 700,
        icon: iconPath,
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

function encrypt(text) {
  if (!text) return '';
  const key = crypto.createHash('sha256').update(app.getVersion()).digest().slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encrypted) {
  if (!encrypted) return '';
  try {
    const key = crypto.createHash('sha256').update(app.getVersion()).digest().slice(0, 32);
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch { return ''; }
}

function getSmtpConfigPath() {
  return path.join(app.getPath('userData'), 'smtp-config.json');
}

ipcMain.handle("save-smtp-config", async (event, config) => {
  try {
    const data = {
      host: config.host || '',
      port: Number(config.port) || 587,
      user: config.user || '',
      pass: encrypt(config.pass || ''),
      fromEmail: config.fromEmail || '',
      secure: Boolean(config.secure),
    };
    fs.writeFileSync(getSmtpConfigPath(), JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("get-smtp-config", async () => {
  try {
    if (!fs.existsSync(getSmtpConfigPath())) {
      return { success: true, config: { host: '', port: 587, user: '', pass: '', fromEmail: '', secure: false } };
    }
    const raw = JSON.parse(fs.readFileSync(getSmtpConfigPath(), 'utf-8'));
    return {
      success: true,
      config: {
        host: raw.host || '',
        port: raw.port || 587,
        user: raw.user || '',
        pass: decrypt(raw.pass || ''),
        fromEmail: raw.fromEmail || '',
        secure: Boolean(raw.secure),
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("send-email-smtp", async (event, { to, subject, body, pdfBase64, filename }) => {
  try {
    const configPath = getSmtpConfigPath();
    if (!fs.existsSync(configPath)) {
      return { success: false, error: 'SMTP not configured' };
    }
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const config = {
      host: raw.host,
      port: raw.port,
      user: raw.user,
      pass: decrypt(raw.pass),
      fromEmail: raw.fromEmail,
      secure: raw.secure,
    };

    if (!config.host || !config.user || !config.pass || !config.fromEmail) {
      return { success: false, error: 'SMTP config incomplete' };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });

    const attachments = [];
    if (pdfBase64 && filename) {
      const tmpDir = app.getPath('temp');
      const tmpFile = path.join(tmpDir, filename || 'attachment.pdf');
      const buffer = Buffer.from(pdfBase64, 'base64');
      fs.writeFileSync(tmpFile, buffer);
      attachments.push({ path: tmpFile });
    }

    const info = await transporter.sendMail({
      from: config.fromEmail,
      to,
      subject: subject || 'No Subject',
      text: body || '',
      attachments,
    });

    if (attachments.length > 0 && attachments[0].path) {
      try { fs.unlinkSync(attachments[0].path); } catch { /* ignore */ }
    }

    return { success: true, messageId: info.messageId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

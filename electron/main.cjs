const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const db = require('./database.cjs');

// Initialize DB
try {
    db.initDatabase();
} catch (e) {
    console.error("Failed to init database:", e);
}

// IPC Handlers
ipcMain.handle('db:getFlights', () => {
    return db.getFlights();
});

ipcMain.handle('db:addFlight', (event, flight) => {
    return db.addFlight(flight);
});

ipcMain.handle('db:deleteFlight', (event, id) => {
    return db.deleteFlight(id);
});

ipcMain.handle('db:updateFlight', (event, flight) => {
    return db.updateFlight(flight);
});

// Local Server for Production (to satisfy Firebase Auth Domain requirements)
let server;
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

function startLocalServer(callback) {
    const port = 0; // Ephemeral port
    server = http.createServer((req, res) => {
        let filePath = path.join(__dirname, '../dist', req.url === '/' ? 'index.html' : req.url);

        // Prevent directory traversal
        if (!filePath.startsWith(path.join(__dirname, '../dist'))) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // SPA Fallback: serve index.html for unknown routes
                    fs.readFile(path.join(__dirname, '../dist/index.html'), (err2, content2) => {
                        if (err2) {
                            res.writeHead(500);
                            res.end(`Server Error: ${err2.code}`);
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(content2, 'utf-8');
                        }
                    });
                } else {
                    res.writeHead(500);
                    res.end(`Server Error: ${err.code}`);
                }
            } else {
                const extname = path.extname(filePath).toLowerCase();
                const contentType = MIME_TYPES[extname] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    server.listen(port, '127.0.0.1', () => {
        const address = server.address();
        console.log(`Local server running at http://127.0.0.1:${address.port}`);
        callback(address.port);
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "SkyTrace",
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: true,
            contextIsolation: true,
            webSecurity: true // Allow CORS/File Protocol for Dev
        },
        titleBarStyle: 'hidden', // Modern title bar look
        titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#ffffff',
            height: 30
        }
    });

    // In development, load the local server.
    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // PRODUCTION: Use local server instead of loadFile
        startLocalServer((port) => {
            win.loadURL(`http://localhost:${port}`);
        });
        // win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        minWidth: 800,
        minHeight: 100,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        title: 'TrimBG',
        backgroundColor: '#f8f9fa'
    });

    mainWindow.loadFile('./src/index.html');

    // Menus
    const menuTemplate = [
        {
            label: 'About Us',
            click: () => {
                const { dialog } = require('electron');
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'About TrimBG',
                    message: `TrimBG - Version ${app.getVersion()}`,
                    detail:
                        `A fully custom, API-free tool for removing image backgrounds using pure JavaScript.

Developer: Raymond Baghumian
Github: https://github.com/Rayiumir/Trimbg`,
                    buttons: ['OK'],
                    icon: require('path').join(__dirname, '../icon/icon.png')
                });
            }
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});



import path from "path";
import axios from 'axios';
const qs = require('qs')
import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell, Tray, Menu, Notification, MenuItemConstructorOptions, MenuItem } from 'electron';
import log = require('electron-log');
import url = require('url');
import appEvent from './Events';

const io = require('socket.io')(5000);

const isDev = process.env.NODE_ENV === 'dev';

const refreshToken = process.env.PSN_REFRESH_TOKEN;

if (!refreshToken)
{
    console.error('PSN_REFRESH_TOKEN not set.');
    app.exit();
}

let mainWindow : BrowserWindow;

if (isDev)
{
	log.transports.file.level = 'debug';
	log.transports.console.level = 'debug';
}
else
{
	log.transports.file.level = 'info';
	log.transports.console.level = 'info';
}

const instanceLock = app.requestSingleInstanceLock();
if (!instanceLock)
{
	app.quit();
}

app.setAppUserModelId('com.tustin.playstationpartychat');

function spawnMainWindow() : void
{
	mainWindow = new BrowserWindow({
		width: 512,
		height: 512,
		minWidth: 512,
		minHeight: 512,
		show: false,
		webPreferences: {
			nodeIntegration: true
		},
		title: 'PlayStation Party Chat'
	});

	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));

	mainWindow.webContents.on('did-finish-load', () => {
		appEvent.emit('start-rich-presence');
	});

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

io.on("connection", (socket: any) => {
    console.log("a user connected");

    socket.on('init', () => {
        // 
    });

    socket.on('make-party', function(token: string) {

    });
});

app.on('second-instance', () => {
	if (!mainWindow)
	{
		return;
	}

	if (mainWindow.isMinimized())
	{
		mainWindow.restore();
	}

	return mainWindow.focus();
});

app.on('ready', () => {
    spawnMainWindow();
});
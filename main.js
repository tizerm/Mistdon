// モジュールのインポート
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// ファイル読み込み
function readFileFunc() {
	var content = new String();
	try {
		content = fs.readFileSync('prefs/pref.json', 'utf8');
	} catch(err) {
		console.log('Read Error.');
	}
	return content;
}

// ファイル書き込み
function writeFileFunc(event, str) {
	fs.writeFile('prefs/pref.json', str, 'utf8', (err) => {
		if (err) throw err;
		console.log('The file has been saved!');
	})
}

// ウィンドウ作成関数
const createWindow = () => {
	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		webPreferences: {
			nodeIntegration: false,
			preload: path.join(__dirname, 'preload.js')
		}
	})
	
	// 最初に表示するページを指定
	win.loadFile('src/index.html')
}

// アプリケーション起動プロミス
app.whenReady().then(() => {
	ipcMain.handle('read-file', readFileFunc)
	ipcMain.on('write-file', writeFileFunc)
	createWindow()
	
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
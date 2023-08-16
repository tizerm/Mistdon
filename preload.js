const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('accessApi', {
	readPrefAccs: () => ipcRenderer.invoke('read-pref-accs'),
	readPrefCols: () => ipcRenderer.invoke('read-pref-cols'),
	writePrefAccs: (json_data) => ipcRenderer.send('write-pref-accs', json_data),
	writePrefCols: (json_data) => ipcRenderer.send('write-pref-cols', json_data)
})
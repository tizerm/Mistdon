const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('accessApi', {
	writeFile: (str) => ipcRenderer.send('write-file', str),
	readFile: () => ipcRenderer.invoke('read-file')
})
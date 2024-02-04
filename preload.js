const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('accessApi', {
    readPrefAccs: () => ipcRenderer.invoke('read-pref-accs'),
    readPrefCols: () => ipcRenderer.invoke('read-pref-cols'),
    readGeneralPref: () => ipcRenderer.invoke('read-general-pref'),
    readCustomEmojis: () => ipcRenderer.invoke('read-pref-emojis'),
    readHistory: () => ipcRenderer.invoke('read-history'),
    readEmojiHistory: () => ipcRenderer.invoke('read-emoji-history'),
    readWindowPref: () => ipcRenderer.invoke('read-window-pref'),
    writePrefMstdAccs: (json_data) => ipcRenderer.send('write-pref-mstd-accs', json_data),
    writePrefMskyAccs: (json_data) => ipcRenderer.send('write-pref-msky-accs', json_data),
    writePrefAccColor: (json_data) => ipcRenderer.send('write-pref-acc-color', json_data),
    writePrefCols: (json_data) => ipcRenderer.send('write-pref-cols', json_data),
    writeGeneralPref: (json_data) => ipcRenderer.send('write-general-pref', json_data),
    writeCustomEmojis: (json_data) => ipcRenderer.send('write-pref-emojis', json_data),
    overwriteHistory: (json_data) => ipcRenderer.send('write-history', json_data),
    overwriteEmojiHistory: (json_data) => ipcRenderer.send('write-emoji-history', json_data),
    writeWindowPref: (json_data) => ipcRenderer.send('write-window-pref', json_data),
    openExternalBrowser: (url) => ipcRenderer.send('open-external-browser', url),
    notification: (arg) => ipcRenderer.send('notification', arg)
})

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('accessApi', {
    readPrefAccs: () => ipcRenderer.invoke('read-pref-accs'),
    readPrefCols: () => ipcRenderer.invoke('read-pref-cols'),
    readGeneralPref: () => ipcRenderer.invoke('read-general-pref'),
    readCustomEmojis: () => ipcRenderer.invoke('read-pref-emojis'),
    readDraft: () => ipcRenderer.invoke('read-draft'),
    readHistory: () => ipcRenderer.invoke('read-history'),
    readEmojiHistory: () => ipcRenderer.invoke('read-emoji-history'),
    writePrefMstdAccs: (json_data) => ipcRenderer.send('write-pref-mstd-accs', json_data),
    writePrefMskyAccs: (json_data) => ipcRenderer.send('write-pref-msky-accs', json_data),
    writePrefAccColor: (json_data) => ipcRenderer.send('write-pref-acc-color', json_data),
    writePrefCols: (json_data) => ipcRenderer.send('write-pref-cols', json_data),
    writeGeneralPref: (json_data) => ipcRenderer.send('write-general-pref', json_data),
    writeCustomEmojis: (json_data) => ipcRenderer.send('write-pref-emojis', json_data),
    overwriteDraft: (json_data) => ipcRenderer.send('write-draft', json_data),
    overwriteHistory: (json_data) => ipcRenderer.send('write-history', json_data),
    overwriteEmojiHistory: (json_data) => ipcRenderer.send('write-emoji-history', json_data),
    getAPIParams: (arg) => ipcRenderer.invoke('get-api-params', arg),
    fetchVersion: () => ipcRenderer.invoke('fetch-version'),
    openOAuthSession: (json_data) => ipcRenderer.send('open-oauth', json_data),
    openExternalBrowser: (url) => ipcRenderer.send('open-external-browser', url),
    notification: (arg) => ipcRenderer.send('notification', arg)
})

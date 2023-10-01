/**
 * Electron Run Module.
 * Electronの実行/ウィンドウの生成とIPC通信メソッドの定義を行います。
 */

// モジュールのインポート
const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

// アプリ保持用設定データの管理
var pref_accounts = null
var pref_columns = null
var pref_emojis = new Map()

const is_windows = process.platform === 'win32'
const is_mac = process.platform === 'darwin'

/*====================================================================================================================*/

/**
 * #IPC
 * 保存してあるアカウント認証情報を読み込む
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return アカウント認証情報(マップで返却)
 */
function readPrefAccs() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_accounts) {
        console.log('@INF: use app_prefs/auth.json cache.')
        return pref_accounts
    }
    const content = readFile('app_prefs/auth.json')
    if (!content) { // ファイルが見つからなかったらnullを返却
        return null
    }
    pref_accounts = jsonToMap(JSON.parse(content), (elm) => `@${elm.user_id}@${elm.domain}`)
    console.log('@INF: read app_prefs/auth.json.')
    return pref_accounts
}

/**
 * #IPC
 * アカウント認証情報を設定ファイルに書き込む(Mastodon用)
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param filepath 書き込むファイルのパス
 * @param json_data 書き込むJSONデータ
 */
async function writePrefMstdAccs(event, json_data) {
    // JSONを生成(あとでキャッシュに入れるので)
    const write_json = {
        'domain': json_data.domain,
        'platform': 'Mastodon',
        'user_id': json_data.user_id,
        'username': json_data.username,
        'socket_url': `wss://${json_data.domain}/api/v1/streaming`,
        'client_id': json_data.client_id,
        'client_secret': json_data.client_secret,
        'access_token': json_data.access_token,
        'avatar_url': json_data.avatar_url,
        // アカウントカラーは初期値グレー
        'acc_color': '808080'
    }

    // ファイルに書き込み
    const content = await writeFileArrayJson('app_prefs/auth.json', write_json)

    // キャッシュを更新
    if (!pref_accounts) {
        // キャッシュがない場合はファイルを読み込んでキャッシュを生成
        pref_accounts = jsonToMap(JSON.parse(content), (elm) => `@${elm.user_id}@${elm.domain}`)
    } else {
        pref_accounts.set(`@${json_data.user_id}@${json_data.domain}`, write_json)
    }
}

/**
 * #IPC
 * アカウント認証情報を設定ファイルに書き込む(Misskey用)
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param filepath 書き込むファイルのパス
 * @param json_data 書き込むJSONデータ
 */
async function writePrefMskyAccs(event, json_data) {
    // まずはaccessTokenとappSecretからiを生成
    const i = crypto.createHash("sha256")
        .update(json_data.access_token + json_data.app_secret, "utf8")
        .digest("hex")
    // JSONを生成(あとでキャッシュに入れるので)
    const write_json = {
        'domain': json_data.domain,
        'platform': 'Misskey',
        'user_id': json_data.user.username,
        'username': json_data.user.name,
        'socket_url': `wss://${json_data.domain}/streaming`,
        'client_id': null,
        'client_secret': json_data.app_secret,
        'access_token': i,
        'avatar_url': json_data.user.avatarUrl,
        // アカウントカラーは初期値グレー
        'acc_color': '808080'
    }

    // ファイルに書き込み
    const content = await writeFileArrayJson('app_prefs/auth.json', write_json)

    // キャッシュを更新
    if (!pref_accounts) {
        // キャッシュがない場合はファイルを読み込んでキャッシュを生成
        pref_accounts = jsonToMap(JSON.parse(content), (elm) => `@${elm.user_id}@${elm.domain}`)
    } else {
        pref_accounts.set(`@${write_json.user_id}@${write_json.domain}`, write_json)
    }
}

/**
 * #IPC
 * アカウント認証情報に色情報を書き込む.
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param event イベント
 * @param json_data 書き込むJSONデータ
 */
async function writePrefAccColor(event, json_data) {
    console.log('@INF: use app_prefs/auth.json cache.')
    // 返却JSONを走査して色情報をキャッシュに保存
    const write_json = []
    json_data.forEach((color) => {
        let acc = pref_accounts.get(color.key_address)
        acc.acc_color = color.acc_color
        write_json.push(acc)
    })

    // ファイルに書き込み
    const content = await overwriteFile('app_prefs/auth.json', write_json)

    // キャッシュを更新
    pref_accounts = jsonToMap(JSON.parse(content), (elm) => `@${elm.user_id}@${elm.domain}`)
}

/**
 * #IPC
 * 保存してあるカラム設定情報を読み込む
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return アカウント認証情報(マップで返却)
 */
function readPrefCols() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_columns) {
        console.log('@INF: use app_prefs/columns.json cache.')
        return pref_columns
    }
    const content = readFile('app_prefs/columns.json')
    if (!content) { // ファイルが見つからなかったらnullを返却
        return null
    }
    pref_columns = JSON.parse(content)
    console.log('@INF: read app_prefs/columns.json.')
    return pref_columns
}

/**
 * #IPC
 * カラム設定情報を設定ファイルに書き込む
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param filepath 書き込むファイルのパス
 * @param json_data 整形前の書き込むJSONデータ
 */
async function writePrefCols(event, json_data) {
    // ファイル書き込み用にJSONファイルを再生成
    const write_json = []
    json_data.forEach((col, index) => {
        const tl_list = []
        const unique_address = col.timelines[0].key_address
        let multi_account_flg = false
        col.timelines.forEach((tl) => {
            // タイムラインのJSONを再生成
            let rest_url = null
            let socket_url = null
            let query_param = null
            let socket_param = null

            if (tl.key_address != unique_address) {
                // ひとつのタイムラインに2アカウント以上混在する場合はマルチフラグを立てる
                multi_account_flg = true
            }
            // プラットフォームの種類によってAPIの形式が違うので個別に設定
            switch (tl.account.platform) {
                case 'Mastodon': // Mastodon
                    // タイムラインタイプによって設定値を変える
                    switch (tl.timeline_type) {
                        case 'home': // ホームタイムライン
                            rest_url = `https://${tl.account.domain}/api/v1/timelines/home`
                            query_param = {}
                            socket_param = { 'stream': 'user' }
                            break
                        case 'local': // ローカルタイムライン
                            rest_url = `https://${tl.account.domain}/api/v1/timelines/public`
                            query_param = { 'local': true }
                            socket_param = { 'stream': 'public:local' }
                            break
                        case 'federation': // 連合タイムライン
                            rest_url = `https://${tl.account.domain}/api/v1/timelines/public`
                            query_param = { 'remote': true }
                            socket_param = { 'stream': 'public:remote' }
                            break
                        case 'notification': // 通知
                            rest_url = `https://${tl.account.domain}/api/v1/notifications`
                            query_param = { 'types': ['mention', 'reblog', 'follow', 'follow_request', 'favourite'] }
                            socket_param = { 'stream': 'user:notification' }
                            break
                        default:
                            break
                    }
                    socket_url = `wss://${tl.account.domain}/api/v1/streaming`
                    break;
                case 'Misskey': // Misskey
                    // タイムラインタイプによって設定値を変える
                    switch (tl.timeline_type) {
                        case 'home': // ホームタイムライン
                            rest_url = `https://${tl.account.domain}/api/notes/timeline`
                            query_param = {}
                            socket_param = { 'channel': 'homeTimeline' }
                            break
                        case 'local': // ローカルタイムライン
                            rest_url = `https://${tl.account.domain}/api/notes/local-timeline`
                            query_param = {}
                            socket_param = { 'channel': 'localTimeline' }
                            break
                        case 'federation': // 連合タイムライン
                            rest_url = `https://${tl.account.domain}/api/notes/global-timeline`
                            query_param = {}
                            socket_param = { 'channel': 'globalTimeline' }
                            break
                        case 'notification': // 通知
                            rest_url = `https://${tl.account.domain}/api/i/notifications`
                            query_param = { 'excludeTypes': ['pollVote', 'pollEnded', 'groupInvited', 'app'] }
                            socket_param = { 'channel': 'main' }
                            break
                        default:
                            break
                    }
                    // WebSocket URLは共通なので外に出す
                    socket_url = `wss://${tl.account.domain}/streaming`
                    break
                default:
                    break
            }
            // タイムラインリストに追加
            tl_list.push({
                'key_address': tl.key_address,
                'host': tl.account.domain,
                'timeline_type': tl.timeline_type,
                'rest_url': rest_url,
                'socket_url': socket_url,
                'query_param': query_param,
                'socket_param': socket_param,
                'exclude_reblog': tl.exclude_reblog
            })
        })
        // カラムリストに追加
        write_json.push({
            // カラムIDはUUIDを使って一意に決定(書き込み直前に再生成)
            'column_id': `col_${crypto.randomUUID()}`,
            'label_head': col.label_head,
            'timelines': tl_list,
            'multi_user': multi_account_flg,
            'multi_timeline': tl_list.length > 1,
            'col_color': col.col_color,
            'col_width': col.col_width,
            'd_hide': col.d_hide,
            'd_flex': col.d_flex
        })
    })
    // 最終的な設定ファイルをJSONファイルに書き込み
    const content = await overwriteFile('app_prefs/columns.json', write_json)
    
    // キャッシュを更新
    pref_columns = JSON.parse(content)
}

function readCustomEmojis() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_emojis.size > 0) {
        console.log('@INF: use app_prefs/emojis/ cache.')
        return pref_emojis
    }
    const content_map = readDirFile('app_prefs/emojis')
    if (content_map.size == 0) { // ファイルが見つからなかったらnullを返却
        return null
    }
    const emoji_map = new Map()
    // ハッシュキーから拡張子を抜いてドメイン名にする
    content_map.forEach((v, k) => emoji_map.set(k.substring(0, k.lastIndexOf('.')), JSON.parse(v)))
    pref_emojis = emoji_map
    console.log('@INF: read app_prefs/emojis/.')
    return pref_emojis
}

async function writeCustomEmojis(event, data) {
    // 絵文字キャッシュデータを書き込み
    const content = await overwriteFile(`app_prefs/emojis/${data.host}.json`, data.emojis)
    console.log(`@INF: write app_prefs/emojis/${data.host}.json.`)
    // キャッシュを更新
    pref_emojis.set(data.host, data.emojis)
}

/*====================================================================================================================*/

/**
 * #Utils #Node.js
 * 汎用ファイル書き込みメソッド(同期)
 * 読み込みに成功すればファイルのstringが、失敗するとnullが返る
 * 
 * @param filepath 読み込むファイルのパス
 * @return 読み込んだファイル(string形式) 失敗した場合null
 */
function readFile(filepath) {
    // ApplicationDataのパスを取得
    const pref_path = path.join(app.getPath('userData'), filepath)
    let content = null
    try {
        content = fs.readFileSync(pref_path, 'utf8')
    } catch(err) {
        console.log('!ERR: file read failed.')
    }
    return content
}

function readDirFile(dirpath) {
    // ApplicationDataのパスを取得
    const pref_path = path.join(app.getPath('userData'), dirpath)
    const contents = new Map()
    try {
        const filenames = fs.readdirSync(pref_path)
        filenames.forEach(fn => contents.set(fn, fs.readFileSync(path.join(pref_path, fn), 'utf8')))
    } catch(err) {
        console.log('!ERR: file read failed.')
    }
    return contents
}

/**
 * #Utils #Node.js
 * 汎用配列型JSONファイル書き込みメソッド(非同期)
 * 非配列型JSONを配列型JSONファイルの後ろに追加する
 * 
 * @param filepath 読み込むファイルのパス
 * @param json_data ファイルに追加するJSONデータ(非配列型)
 * @return 最終的に書き込んだファイル内容string
 */
async function writeFileArrayJson(filepath, json_data) {
    let content = readFile(filepath)
    if (content) {
        // ファイルが存在する場合(引数のJSONをpush)
        let pre_json = JSON.parse(content)
        pre_json.push(json_data)
        content = JSON.stringify(pre_json)
    } else {
        // ファイルが存在しない場合(配列化してstring化)
        content = JSON.stringify([json_data])
    }

    await writeDirFile(filepath, content)
    return content
}

/**
 * #Utils #Node.js
 * 汎用JSONファイル書き込みメソッド(非同期)
 * 引数のJSONファイルをファイルに書き込む(完全上書き処理)
 * 
 * @param filepath 読み込むファイルのパス
 * @param json_data ファイルに書き込むJSONデータ(この内容で上書き)
 * @return 最終的に書き込んだファイル内容string
 */
async function overwriteFile(filepath, json_data) {
    const content = JSON.stringify(json_data)

    await writeDirFile(filepath, content)
    return content
}

/**
 * #Utils #Node.js
 * 汎用ファイル書き込みメソッド(非同期)
 * 引数のcontentをファイルに書き込む、ディレクトリがなかったら自動で作成
 * 
 * @param filepath 読み込むファイルのパス
 * @param content ファイルに書き込むstring
 */
async function writeDirFile(filepath, content) {
    // ApplicationDataのパスを取得
    const pref_path = path.join(app.getPath('userData'), filepath)
    const pref_dir = path.dirname(pref_path)
    // ディレクトリが未作成なら先に作成
    if (!fs.existsSync(pref_dir)) await fs.promises.mkdir(pref_dir, { recursive: true })

    // ファイル書き込み(内部的には同期処理として処理)
    fs.writeFileSync(pref_path, content, 'utf8')
    console.log('@INF: file write successed.')
}

/**
 * #Utils #JS
 * 配列型JSONをmapに変換する
 * 
 * @param json_data map化するJSON配列
 * @param key_func キーを生成するコールバック関数
 * @return 生成したmap
 */
function jsonToMap(json_data, key_func) {
    const map = new Map()
    json_data.forEach(elm => map.set(key_func(elm), elm))
    return map;
}

/*====================================================================================================================*/

/**
 * #Utils #Electron
 * リンクを外部ブラウザで開く
 * 
 * @param event イベント
 * @param url 移動先のURL
 */
function openExternalBrowser(event, url) {
    console.log(`@INF: web-${url}`)
    shell.openExternal(url)
}

/**
 * #Utils #Electron
 * 通知を発生させる
 * 
 * @param event イベント
 * @param arg 通知パラメータ
 */
function notification(event, arg) {
    new Notification(arg).show()
}

/*====================================================================================================================*/

/**
 * #Main #Electron
 * メインウィンドウ生成処理
 */
const createWindow = () => {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            //devTools: false,
            icon: './path/to/icon.png',
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // 最初に表示するページを指定
    //win.setMenuBarVisibility(false)
    win.loadFile('src/index.html')
}

/**
 * #Main #IPC #Electron
 * アプリケーション実行処理
 * IPC通信を仲介するAPIもここで定義
 */
app.whenReady().then(() => {
    // IPC通信で呼び出すメソッド定義
    ipcMain.handle('read-pref-accs', readPrefAccs)
    ipcMain.handle('read-pref-cols', readPrefCols)
    ipcMain.handle('read-pref-emojis', readCustomEmojis)
    ipcMain.on('write-pref-mstd-accs', writePrefMstdAccs)
    ipcMain.on('write-pref-msky-accs', writePrefMskyAccs)
    ipcMain.on('write-pref-acc-color', writePrefAccColor)
    ipcMain.on('write-pref-cols', writePrefCols)
    ipcMain.on('write-pref-emojis', writeCustomEmojis)
    ipcMain.on('open-external-browser', openExternalBrowser)
    ipcMain.on('notification', notification)

    // ウィンドウ生成
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

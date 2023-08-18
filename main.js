/**
 * Electron Run Module.
 * Electronの実行/ウィンドウの生成とIPC通信メソッドの定義を行います。
 */

// モジュールのインポート
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

// アプリ保持用設定データの管理
var pref_accounts = null
var pref_columns = null

/*================================================================================================*/

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
		console.log('@INF: use prefs/auth.json cache.')
		return pref_accounts
	}
	var content = readFile('prefs/auth.json')
	if (!content) { // ファイルが見つからなかったらnullを返却
		return null
	}
	pref_accounts = jsonToMap(JSON.parse(content), (elm) => '@' + elm.user_id + '@' + elm.domain)
	console.log('@INF: read prefs/auth.json.')
	return pref_accounts
}

/**
 * #IPC
 * アカウント認証情報を設定ファイルに書き込む(Mastodon用)
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param path 書き込むファイルのパス
 * @param json_data 書き込むJSONデータ
 */
function writePrefMstdAccs(event, json_data) {
	// ファイルに書き込み
	var content = writeFileArrayJson('prefs/auth.json', json_data)

	// キャッシュを更新
	if (!pref_accounts) {
		// キャッシュがない場合はファイルを読み込んでキャッシュを生成
		pref_accounts = jsonToMap(JSON.parse(content), (elm) => '@' + elm.user_id + '@' + elm.domain)
	} else {
		pref_accounts.set('@' + json_data.user_id + '@' + json_data.domain, json_data)
	}
}

/**
 * #IPC
 * アカウント認証情報を設定ファイルに書き込む(Misskey用)
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param path 書き込むファイルのパス
 * @param json_data 書き込むJSONデータ
 */
function writePrefMskyAccs(event, json_data) {
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
		'access_token': i,
		'avatar_url': json_data.user.avatarUrl
	}

	// ファイルに書き込み
	var content = writeFileArrayJson('prefs/auth.json', write_json)

	// キャッシュを更新
	if (!pref_accounts) {
		// キャッシュがない場合はファイルを読み込んでキャッシュを生成
		pref_accounts = jsonToMap(JSON.parse(content), (elm) => '@' + elm.user_id + '@' + elm.domain)
	} else {
		pref_accounts.set('@' + write_json.user_id + '@' + write_json.domain, write_json)
	}
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
		console.log('@INF: use prefs/columns.json cache.')
		return pref_columns
	}
	var content = readFile('prefs/columns.json')
	if (!content) { // ファイルが見つからなかったらnullを返却
		return null
	}
	pref_columns = JSON.parse(content)
	console.log('@INF: read prefs/columns.json.')
	return pref_columns
}

/**
 * #IPC
 * カラム設定情報を設定ファイルに書き込む
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param path 書き込むファイルのパス
 * @param json_data 整形前の書き込むJSONデータ
 */
function writePrefCols(event, json_data) {
	// 別ファイルを読む処理があるのでawait挟むため非同期にする
	const proc = async () => {
		var read_data = await readPrefCols()
		var col_num = (read_data ? read_data.length : 0) + 1;
		var rest_url = null
		var socket_url = null
		var query_param = null
		var socket_param = null
		
		// プラットフォームの種類によってAPIの形式が違うので個別に設定
		switch (json_data.account.platform) {
			case 'Mastodon': // Mastodon
				// タイムラインタイプによって設定値を変える
				switch (json_data.timeline_type) {
					case 'home': // ホームタイムライン
						rest_url = "https://" + json_data.account.domain + "/api/v1/timelines/home"
						socket_url = "wss://" + json_data.account.domain + "/api/v1/streaming?stream=user"
						query_param = {}
						break
					case 'local': // ローカルタイムライン
						rest_url = "https://" + json_data.account.domain + "/api/v1/timelines/public"
						socket_url = "wss://" + json_data.account.domain + "/api/v1/streaming?stream=public:local"
						query_param = { 'local': true }
						break
					case 'federation': // 連合タイムライン
						rest_url = "https://" + json_data.account.domain + "/api/v1/timelines/public"
						socket_url = "wss://" + json_data.account.domain + "/api/v1/streaming?stream=public:remote"
						query_param = { 'remote': true }
						break
					case 'notification': // 通知
						rest_url = "https://" + json_data.account.domain + "/api/v1/notifications"
						socket_url = "wss://" + json_data.account.domain + "/api/v1/streaming?stream=user:notification"
						query_param = { 'types': ['mention', 'reblog', 'follow', 'follow_request', 'favourite'] }
						break
					default:
						break
				}
				break;
			case 'Misskey': // Misskey
				// タイムラインタイプによって設定値を変える
				switch (json_data.timeline_type) {
					case 'home': // ホームタイムライン
						rest_url = "https://" + json_data.account.domain + "/api/notes/timeline"
						query_param = {}
						break
					case 'local': // ローカルタイムライン
						rest_url = "https://" + json_data.account.domain + "/api/notes/local-timeline"
						query_param = {}
						break
					case 'federation': // 連合タイムライン
						rest_url = "https://" + json_data.account.domain + "/api/notes/global-timeline"
						query_param = {}
						break
					case 'notification': // 通知
						rest_url = "https://" + json_data.account.domain + "/api/i/notifications"
						query_param = { 'excludeTypes': ['pollVote', 'pollEnded', 'groupInvited', 'app'] }
						break
					default:
						break
				}
				// WebSocket URLは共通なので外に出す
				// TODO: 将来的にアカウント単位でWebSocketに接続するのでカラムに保存するのやめます……
				socket_url = "wss://" + json_data.account.domain + "/streaming"
				break
			default:
				break
		}

		// JSONデータを生成しながらファイルに書き込み
		var content = writeFileArrayJson('prefs/columns.json', {
			'column_id': 'col' + col_num,
			'label_head': json_data.account.domain,
			'label_type': json_data.timeline_type,
			'timelines': [{ // TODO: 将来的に統合TLに拡張するので配列で保存
				'key_address': json_data.key_address,
				'timeline_type': json_data.timeline_type,
				'rest_url': rest_url,
				'socket_url': socket_url,
				'query_param': query_param
			}],
			'col_color': json_data.col_color
		})

		// キャッシュを更新
		pref_columns = JSON.parse(content)
	}
	proc()
}

/*================================================================================================*/

/**
 * #Utils #Node.js
 * 汎用ファイル書き込みメソッド(同期)
 * 読み込みに成功すればファイルのstringが、失敗するとnullが返る
 * 
 * @param path 読み込むファイルのパス
 * @return 読み込んだファイル(string形式) 失敗した場合null
 */
function readFile(path) {
	var content = null
	try {
		content = fs.readFileSync(path, 'utf8')
	} catch(err) {
		console.log('!ERR: file read failed.')
	}
	return content
}

/**
 * #Utils #Node.js
 * 汎用配列型JSONファイル書き込みメソッド(非同期)
 * 非配列型JSONを配列型JSONファイルの後ろに追加する
 * 
 * @param path 読み込むファイルのパス
 * @param json_data ファイルに追加するJSONデータ(非配列型)
 * @return 最終的に書き込んだファイル内容string
 */
function writeFileArrayJson(path, json_data) {
	var content = readFile(path)
	if (content) {
		// ファイルが存在する場合(引数のJSONをpush)
		var pre_json = JSON.parse(content)
		pre_json.push(json_data)
		content = JSON.stringify(pre_json)
	} else {
		// ファイルが存在しない場合(配列化してstring化)
		content = JSON.stringify([json_data])
	}

	fs.writeFile(path, content, 'utf8', (err) => {
		if (err) throw err;
		console.log('@INF: file write successed.')
	})
	return content
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
	var map = new Map()
	json_data.forEach((elm) => {
		map.set(key_func(elm), elm)
	})
	return map;
}

/*================================================================================================*/

/**
 * #Main #Electron
 * メインウィンドウ生成処理
 */
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

/**
 * #Main #IPC #Electron
 * アプリケーション実行処理
 * IPC通信を仲介するAPIもここで定義
 */
app.whenReady().then(() => {
	// IPC通信で呼び出すメソッド定義
	ipcMain.handle('read-pref-accs', readPrefAccs)
	ipcMain.handle('read-pref-cols', readPrefCols)
	ipcMain.on('write-pref-mstd-accs', writePrefMstdAccs)
	ipcMain.on('write-pref-msky-accs', writePrefMskyAccs)
	ipcMain.on('write-pref-cols', writePrefCols)

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
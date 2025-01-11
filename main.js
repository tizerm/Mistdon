/**
 * Electron Run Module.
 * Electronの実行/ウィンドウの生成とIPC通信メソッドの定義を行います。
 */

// モジュールのインポート
const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const http = require('http')
const stateKeeper = require('electron-window-state')
const FeedParser = require('feedparser')
const AsyncLock = require('async-lock')
const fetch = require('node-fetch')

// アプリ保持用設定データの管理
var pref_accounts = null
var pref_columns = null
var pref_general = null
var pref_emojis = new Map()
var pref_temptl_fav = null
var cache_history = null
var cache_draft = null
var cache_emoji_history = null
var cache_bsky_session = new Map()
var oauth_session = null

var lock = new AsyncLock()

const is_windows = process.platform === 'win32'
const is_mac = process.platform === 'darwin'

// ハードウェアアクセラレーション無効化
app.disableHardwareAcceleration()

/*====================================================================================================================*/

/**
 * #IPC
 * 保存してあるアカウント認証情報を読み込む
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return アカウント認証情報(マップで返却)
 */
async function readPrefAccs() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_accounts) {
        console.log('@INF: use app_prefs/auth.json cache.')
        return pref_accounts
    }
    const content = readFile('app_prefs/auth.json')
    if (!content) return null // ファイルが見つからなかったらnullを返却

    pref_accounts = jsonToMap(JSON.parse(content), getAccountKey)
    console.log('@INF: read app_prefs/auth.json.')
    return pref_accounts
}

function getAccountKey(json) {
    if (json.platform == 'Bluesky') return `@${json.user_id}`
    else return `@${json.user_id}@${json.domain}`
}

/**
 * #IPC
 * アカウント認証情報を設定ファイルに書き込む(Mastodon用)
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param event イベント
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
        'post_maxlength': json_data.post_maxlength,
        'acc_color': getRandomColor()
    }

    // ファイルに書き込み
    const content = await writeFileArrayJson('app_prefs/auth.json', write_json)

    // キャッシュを更新
    if (!pref_accounts) {
        // キャッシュがない場合はファイルを読み込んでキャッシュを生成
        pref_accounts = jsonToMap(JSON.parse(content), getAccountKey)
    } else {
        pref_accounts.set(`@${json_data.user_id}@${json_data.domain}`, write_json)
    }
}

/**
 * #IPC
 * アカウント認証情報を設定ファイルに書き込む(Misskey用)
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param event イベント
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
        'client_id': '__app_auth',
        'client_secret': json_data.access_token,
        'access_token': i,
        'avatar_url': json_data.user.avatarUrl,
        'post_maxlength': json_data.post_maxlength,
        'acc_color': getRandomColor()
    }

    // ファイルに書き込み
    const content = await writeFileArrayJson('app_prefs/auth.json', write_json)

    // キャッシュを更新
    if (!pref_accounts) {
        // キャッシュがない場合はファイルを読み込んでキャッシュを生成
        pref_accounts = jsonToMap(JSON.parse(content), getAccountKey)
    } else {
        pref_accounts.set(`@${write_json.user_id}@${write_json.domain}`, write_json)
    }
}

async function writePrefBskyAccs(event, json_data) {
    // JSONを生成(あとでキャッシュに入れるので)
    const write_json = {
        'domain': json_data.domain,
        'platform': 'Bluesky',
        'user_id': json_data.user_id,
        'username': json_data.username,
        'socket_url': null,
        'client_id': json_data.did,
        'client_secret': json_data.app_pass,
        'access_token': null,
        'avatar_url': json_data.avatar_url,
        'post_maxlength': json_data.post_maxlength,
        'acc_color': getRandomColor()
    }

    // ユーザー情報をファイルに書き込み
    const content = await writeFileArrayJson('app_prefs/auth.json', write_json)

    // ユーザー情報のキャッシュを更新
    if (!pref_accounts) {
        // キャッシュがない場合はファイルを読み込んでキャッシュを生成
        pref_accounts = jsonToMap(JSON.parse(content), getAccountKey)
    } else {
        pref_accounts.set(`@${json_data.user_id}`, write_json)
    }

    // セッション情報のJSONを生成
    const write_session = {
        'handle': json_data.user_id,
        'pds': json_data.domain,
        'refresh_token': json_data.refresh_token,
        'access_token': json_data.access_token
    }

    // セッションキャッシュを更新
    cache_bsky_session.set(json_data.user_id, write_session)
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
    json_data.forEach(pref => {
        let account = pref_accounts.get(pref.key_address)
        account.acc_color = pref.acc_color
        account.default_local = pref.default_local
        account.default_channel = pref.default_channel
        account.post_maxlength = pref.post_maxlength
        // ユーザー情報を更新できる場合は更新
        if (pref.user_id) account.user_id = pref.user_id
        if (pref.username) account.username = pref.username
        if (pref.avatar_url) account.avatar_url = pref.avatar_url
        write_json.push(account)
    })

    // ファイルに書き込み
    const content = await overwriteFile('app_prefs/auth.json', write_json)

    // キャッシュを更新
    pref_accounts = jsonToMap(JSON.parse(content), getAccountKey)
}

/**
 * #IPC
 * OAuthの認証セッションを開始する.
 * セッション情報をキャッシュしてOAuth認証画面を開く.
 * 
 * @param event イベント
 * @param json_data 認証セッションに必要な情報オブジェクト
 */
async function openOAuthSession(event, json_data) {
    const host = json_data.host
    let permission = null
    let redirect_url = null
    let client_id = null
    switch (json_data.platform) {
        case 'Mastodon': // Mastodon
            // 権限とリダイレクトURLを設定
            permission = ["read", "write", "follow", "push"].join(" ")
            redirect_url = 'http://localhost:3100/oauth/mastodon'

            const client_info = await ajax({ // クライアントIDの取得
                method: "POST",
                url: `https://${host}/api/v1/apps`,
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                data: {
                    "client_name": "Mistdon",
                    "redirect_uris": redirect_url,
                    "scopes": permission,
                    "website": "https://github.com/tizerm/Mistdon"
                }
            })
            client_id = client_info.body.client_id

            // クライアントIDを取得できたらサーバーから参照する情報をキャッシュ
            oauth_session = {
                'domain': host,
                'client_id': client_id,
                'client_secret': client_info.body.client_secret,
                'redirect_url': redirect_url,
                'post_maxlength': json_data.post_maxlength
            }

            // OAuth認証画面を開く
            openExternalBrowser(null, `https://${host}/oauth/authorize?client_id=${client_id}&scope=${encodeURIComponent(permission)}&response_type=code&redirect_uri=${redirect_url}`)
            break
        case 'Misskey': // Misskey
            // 権限とリダイレクトURLを設定
            permission = ["read:account", "write:notes", "write:blocks",
                "read:drive", "write:drive", "read:favorites", "write:favorites",
                "read:following", "write:following", "write:mutes", "read:notifications",
                "read:reactions", "write:reactions", "write:votes",
                "read:channels", "write:channels"].join(",")
            redirect_url = 'http://localhost:3100/oauth/misskey'
            const session_id = crypto.randomUUID()

            // サーバーから参照する情報をキャッシュ
            oauth_session = {
                'domain': host,
                'scope': permission,
                'redirect_url': redirect_url,
                'session_id': session_id,
                'post_maxlength': json_data.post_maxlength
            }

            // MiAuth認証画面を開く
            openExternalBrowser(null, `https://${host}/miauth/${session_id}?name=Mistdon&callback=${encodeURIComponent(redirect_url)}&permission=${encodeURIComponent(permission)}`)
            break
        default:
            break
    }
    console.log('@INF: OAuth Session stored.')
}

/**
 * #ServerMethod
 * MastodonのOAuth認証情報作成処理.
 * サーバーから認証コードを受け取ってアクセストークンを取得する.
 * 
 * @param auth_code サーバーに渡された認証コード
 */
async function authorizeMastodon(auth_code) {
    try {
        // SkyBridgeからくるAuthCodeはデコードされてないのでデコードしてから使う
        const decode_code = decodeURIComponent(auth_code)

        const token = await ajax({ // OAuth認証を開始
            method: "POST",
            url: `https://${oauth_session.domain}/oauth/token`,
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            data: {
                "client_id": oauth_session.client_id,
                "client_secret": oauth_session.client_secret,
                "redirect_uri": oauth_session.redirect_url,
                "grant_type": "authorization_code",
                "code": decode_code
            }
        })
        const access_token = token.body.access_token

        let user_data = null
        try { // 認証に成功した場合そのアクセストークンを使って認証アカウントの情報を取得
            user_data = await ajax({
                method: "GET",
                url: `https://${oauth_session.domain}/api/v1/accounts/verify_credentials`,
                headers: { 'Authorization': `Bearer ${access_token}` }
            })
        } catch (err) {
            console.log(err)
        }

        // JSONを生成(あとでキャッシュに入れるので)
        const write_json = {
            'domain': oauth_session.domain,
            'platform': 'Mastodon',
            'user_id': user_data?.body?.username,
            'username': user_data?.body?.display_name,
            'socket_url': `wss://${oauth_session.domain}/api/v1/streaming`,
            'client_id': oauth_session.client_id,
            'client_secret': oauth_session.client_secret,
            'access_token': access_token,
            'avatar_url': user_data?.body?.avatar,
            'post_maxlength': oauth_session.post_maxlength,
            'acc_color': getRandomColor()
        }
        // ファイルに書き込み
        const content = await writeFileArrayJson('app_prefs/auth.json', write_json)

        // キャッシュを更新
        if (!pref_accounts) {
            // キャッシュがない場合はファイルを読み込んでキャッシュを生成
            pref_accounts = jsonToMap(JSON.parse(content), getAccountKey)
        } else {
            pref_accounts.set(`@${write_json.user_id}@${write_json.domain}`, write_json)
        }
    } catch (err) { // 認証失敗時
        console.log(err)
        return Promise.reject(err)
    }
}

/**
 * #ServerMethod
 * MisskeyのOAuth認証情報作成処理.
 * セッション情報からアクセストークンリクエストを送ってトークンを取得する.
 * 
 * @param session セッションコード
 */
async function authorizeMisskey(session) {
    try {
        const token = await ajax({ // Token取得APIをリクエスト
            method: "POST",
            url: `https://${oauth_session.domain}/api/miauth/${session}/check`
        })
        const access_token = token.body.token
        const user_data = token.body.user

        // JSONを生成(あとでキャッシュに入れるので)
        const write_json = {
            'domain': oauth_session.domain,
            'platform': 'Misskey',
            'user_id': user_data.username,
            'username': user_data.name,
            'socket_url': `wss://${oauth_session.domain}/streaming`,
            'client_id': '__mi_auth',
            'client_secret': null,
            'access_token': access_token,
            'avatar_url': user_data.avatarUrl,
            'post_maxlength': oauth_session.post_maxlength,
            'acc_color': getRandomColor()
        }
        // ファイルに書き込み
        const content = await writeFileArrayJson('app_prefs/auth.json', write_json)

        // キャッシュを更新
        if (!pref_accounts) {
            // キャッシュがない場合はファイルを読み込んでキャッシュを生成
            pref_accounts = jsonToMap(JSON.parse(content), getAccountKey)
        } else {
            pref_accounts.set(`@${write_json.user_id}@${write_json.domain}`, write_json)
        }
    } catch (err) { // 認証失敗時
        console.log(err)
        return Promise.reject(err)
    }
}

async function refreshBlueskySession(event, handle) {
    console.log("#BSKY-SESSION: Exclusive Bluesky Session getted...")
    return await lock.acquire('bluesky-session', async () => { // 同時実行しないよう排他
        const session = cache_bsky_session.get(handle)

        if (session) { // セッションキャッシュが残っている場合はセッションが生きてるかの確認から
            try {
                const session_info = await ajax({ // セッションが有効か確認
                    method: "GET",
                    url: `https://${session.pds}/xrpc/com.atproto.server.getSession`,
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })

                // 有効なセッションの場合はキャッシュされたアクセストークンを返す
                console.log("#BSKY-SESSION: Access token returned.")
                return session.access_token
            } catch (err) {
                if (err.message != '400') { // Bad Request以外はトークンの取得に失敗
                    console.log(err)
                    return null
                }
            }

            try {
                const session_info = await ajax({ // セッションを更新する
                    method: "POST",
                    url: `https://${session.pds}/xrpc/com.atproto.server.refreshSession`,
                    headers: { 'Authorization': `Bearer ${session.refresh_token}` }
                })

                // セッション情報のJSONを生成
                const write_session = {
                    'handle': session.handle,
                    'pds': session.pds,
                    'refresh_token': session_info.body.refreshJwt,
                    'access_token': session_info.body.accessJwt
                }

                // セッション情報のキャッシュを更新
                cache_bsky_session.set(write_session.handle, write_session)

                console.log("#BSKY-SESSION: Refresh token created.")
                return session_info.body.accessJwt
            } catch (err) {
                if (err.message != '400') { // Bad Request以外はトークンの取得に失敗
                    console.log(err)
                    return null
                }
            }
        }

        try { // セッションを再取得する
            const account = pref_accounts.get(`@${handle}`)
            const pds = account.domain
            const session_info = await ajax({
                method: "POST",
                url: `https://${pds}/xrpc/com.atproto.server.createSession`,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    'identifier': handle,
                    'password': account.client_secret
                })
            })

            // セッション情報のJSONを生成
            const write_session = {
                'handle': handle,
                'pds': pds,
                'refresh_token': session_info.body.refreshJwt,
                'access_token': session_info.body.accessJwt
            }

            // セッション情報をアプリにキャッシュする
            cache_bsky_session.set(write_session.handle, write_session)

            console.log("#BSKY-SESSION: Session Regenerated.")
            return session_info.body.accessJwt
        } catch (err) {
            console.log(err)
        }
        return null
    })
}

/**
 * #IPC
 * 保存してあるカラム設定情報を読み込む
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return アカウント認証情報(マップで返却)
 */
async function readPrefCols() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_columns) {
        console.log('@INF: use app_prefs/columns.json cache.')
        return pref_columns
    }
    const content = readFile('app_prefs/columns.json')
    if (!content) return null // ファイルが見つからなかったらnullを返却

    pref_columns = JSON.parse(content)
    console.log('@INF: read app_prefs/columns.json.')
    return pref_columns
}

/**
 * #IPC
 * カラム設定情報を設定ファイルに書き込む
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param event イベント
 * @param json_data 書き込むJSONデータ
 */
async function writePrefCols(event, json_data) {
    // ファイル書き込み用にJSONファイルを再生成
    const write_json = []
    json_data.forEach(col => { // カラムイテレータ
        const gp_list = []
        col.groups.forEach((gp, index) => { // グループイテレータ
            const tl_list = []
            const unique_address = gp.timelines[0].key_address
            let multi_account_flg = false
            gp.timelines.forEach(tl => { // タイムラインイテレータ
                // 外部インスタンスと認証済みで値を変える
                const host = tl.account?.domain ?? tl.ex_host
                const platform = tl.account?.platform ?? tl.ex_platform
                const external = !tl.account
                let color = null
                if (external) color = tl.ex_color
                else if (tl.timeline_type == 'channel') color = tl.channel_color
                // ひとつのタイムラインに2アカウント以上混在する場合はマルチフラグを立てる
                if (tl.key_address != unique_address) multi_account_flg = true
                // APIのURLとパラメータは関数から取得(別のところでも使うので)
                const params = getAPIParams(event, {
                    host: host,
                    platform: platform,
                    timeline: tl
                })

                tl_list.push({ // タイムラインプリファレンス
                    'key_address': !external ? tl.key_address : null,
                    'external': external,
                    'host': host,
                    'platform': platform,
                    'color': color,
                    'timeline_type': tl.timeline_type,
                    'list_id': tl.timeline_type == 'list' ? tl.list_id : null,
                    'channel_id': tl.timeline_type == 'channel' ? tl.channel_id : null,
                    'channel_name': tl.timeline_type == 'channel' ? tl.channel_name : null,
                    'antenna_id': tl.timeline_type == 'antenna' ? tl.antenna_id : null,
                    'rest_url': params.url,
                    'socket_url': params.socket_url,
                    'query_param': params.query_param,
                    'socket_param': params.socket_param,
                    'exclude_reblog': tl.exclude_reblog,
                    'expand_cw': tl.expand_cw,
                    'expand_media': tl.expand_media,
                    'disable_websocket': tl.disable_websocket,
                    'reload_span': tl.reload_span
                })
            })
            gp_list.push({ // グループプリファレンス
                // グループIDはUUIDを使って一意に決定(書き込み直前に再生成)
                'group_id': `gp_${crypto.randomUUID()}`,
                'label_head': gp.label_head,
                'timelines': tl_list,
                'multi_user': multi_account_flg,
                'multi_timeline': tl_list.length > 1,
                'tl_layout': gp.tl_layout,
                'multi_layout_option': gp.multi_layout_option,
                'gp_color': gp.gp_color,
                // 最後のグループだけは高さを自動決定するためnullにする
                'gp_height': index < col.groups.length - 1 ? gp.gp_height : null,
            })
        })
        write_json.push({ // カラムプリファレンス
            // カラムIDはUUIDを使って一意に決定(書き込み直前に再生成)
            'column_id': `col_${crypto.randomUUID()}`,
            'label_head': col.label_head,
            'groups': gp_list,
            'multi_group': gp_list.length > 1,
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

/**
 * #IPC
 * タイムライン情報のJSONをもとにAPIのURLとパラメータを返す.
 * 
 * @param event イベント
 * @param arg 呼び出しパラメータ
 */
function getAPIParams(event, arg) {
    let rest_url = null
    let socket_url = null
    let query_param = null
    let socket_param = null

    // プラットフォームの種類によってAPIの形式が違うので個別に設定
    switch (arg.platform) {
        case 'Mastodon': // Mastodon
            // タイムラインタイプによって設定値を変える
            switch (arg.timeline.timeline_type) {
                case 'home': // ホームタイムライン
                    rest_url = `https://${arg.host}/api/v1/timelines/home`
                    query_param = {}
                    socket_param = { 'stream': 'user' }
                    break
                case 'local': // ローカルタイムライン
                    rest_url = `https://${arg.host}/api/v1/timelines/public`
                    query_param = { 'local': true }
                    socket_param = { 'stream': 'public:local' }
                    break
                case 'federation': // 連合タイムライン
                    rest_url = `https://${arg.host}/api/v1/timelines/public`
                    query_param = { 'remote': true }
                    socket_param = { 'stream': 'public:remote' }
                    break
                case 'list': // リスト
                    rest_url = `https://${arg.host}/api/v1/timelines/list/${arg.timeline.list_id}`
                    query_param = {}
                    socket_param = { 'stream': 'list', 'list': arg.timeline.list_id }
                    break
                case 'notification': // 通知
                    rest_url = `https://${arg.host}/api/v1/notifications`
                    query_param = { 'types': ['mention', 'reblog', 'follow', 'follow_request', 'favourite', 'poll'] }
                    socket_param = { 'stream': 'user:notification' }
                    break
                case 'mention': // メンション
                    rest_url = `https://${arg.host}/api/v1/notifications`
                    query_param = { 'types': ['mention'] }
                    socket_param = { 'stream': 'user:notification' }
                    break
                default:
                    break
            }
            socket_url = `wss://${arg.host}/api/v1/streaming`
            break
        case 'Misskey': // Misskey
            // タイムラインタイプによって設定値を変える
            switch (arg.timeline.timeline_type) {
                case 'home': // ホームタイムライン
                    rest_url = `https://${arg.host}/api/notes/timeline`
                    query_param = {}
                    socket_param = { 'channel': 'homeTimeline' }
                    if (arg.timeline.exclude_reblog) query_param.withRenotes = false
                    break
                case 'local': // ローカルタイムライン
                    rest_url = `https://${arg.host}/api/notes/local-timeline`
                    query_param = {}
                    socket_param = { 'channel': 'localTimeline' }
                    if (arg.timeline.exclude_reblog) query_param.withRenotes = false
                    break
                case 'federation': // 連合タイムライン
                    rest_url = `https://${arg.host}/api/notes/global-timeline`
                    query_param = {}
                    socket_param = { 'channel': 'globalTimeline' }
                    if (arg.timeline.exclude_reblog) query_param.withRenotes = false
                    break
                case 'list': // リスト
                    rest_url = `https://${arg.host}/api/notes/user-list-timeline`
                    query_param = { 'listId': arg.timeline.list_id }
                    socket_param = {
                        'channel': 'userList',
                        'params': { 'listId': arg.timeline.list_id }
                    }
                    if (arg.timeline.exclude_reblog) query_param.withRenotes = false
                    break
                case 'channel': // チャンネル
                    rest_url = `https://${arg.host}/api/channels/timeline`
                    query_param = { 'channelId': arg.timeline.channel_id }
                    socket_param = {
                        'channel': 'channel',
                        'params': { 'channelId': arg.timeline.channel_id }
                    }
                    break
                case 'antenna': // アンテナ
                    rest_url = `https://${arg.host}/api/antennas/notes`
                    query_param = { 'antennaId': arg.timeline.antenna_id }
                    socket_param = {
                        'channel': 'antenna',
                        'params': { 'antennaId': arg.timeline.antenna_id }
                    }
                    break
                case 'clip': // クリップ
                    rest_url = `https://${arg.host}/api/clips/notes`
                    query_param = { 'clipId': arg.timeline.clip_id }
                    socket_param = {} // クリップはWebSocket接続しない
                    break
                case 'notification': // 通知
                    rest_url = `https://${arg.host}/api/i/notifications`
                    query_param = { 'includeTypes': ['follow', 'mention', 'reply', 'renote', 'quote', 'reaction', 'receiveFollowRequest'] }
                    socket_param = { 'channel': 'main' }
                    break
                case 'mention': // メンション
                    rest_url = `https://${arg.host}/api/i/notifications`
                    query_param = { 'includeTypes': ['mention', 'reply', 'quote'] }
                    socket_param = { 'channel': 'main' }
                    break
                default:
                    break
            }
            socket_url = `wss://${arg.host}/streaming`
            break
        case 'Bluesky': // Bluesky
            // タイムラインタイプによって設定値を変える
            switch (arg.timeline.timeline_type) {
                case 'home': // ホームタイムライン
                    rest_url = `https://${arg.host}/xrpc/app.bsky.feed.getTimeline`
                    query_param = {}
                    socket_param = {}
                    break
                case 'notification': // 通知
                    rest_url = `https://${arg.host}/xrpc/app.bsky.notification.listNotifications`
                    query_param = {}
                    socket_param = {}
                    break
                default:
                    break
            }
            socket_url = null
            break
        default:
            break
    }

    return {
        "url": rest_url,
        "socket_url": socket_url,
        "query_param": query_param,
        "socket_param": socket_param
    }
}

/**
 * #IPC
 * 保存してある全体設定情報を読み込む.
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return 全体設定情報
 */
async function readGeneralPref() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_general) {
        console.log('@INF: use app_prefs/general_pref.json cache.')
        return pref_general
    }
    const content = readFile('app_prefs/general_pref.json')
    if (!content) return null // ファイルが見つからなかったらnullを返却

    pref_general = JSON.parse(content)
    console.log('@INF: read app_prefs/general_pref.json.')
    return pref_general
}

/**
 * #IPC
 * 全体設定を設定ファイルに書き込む.
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param event イベント
 * @param json_data 書き込むJSONデータ
 */
async function writeGeneralPref(event, json_data) {
    // 絵文字キャッシュデータを書き込み
    const content = await overwriteFile('app_prefs/general_pref.json', json_data)
    console.log('@INF: write app_prefs/general_pref.json.')
    // キャッシュを更新
    pref_general = JSON.parse(content)
}

/**
 * #IPC
 * 保存してあるカスタム絵文字のキャッシュを読み込む
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return カスタム絵文字キャッシュ情報(マップで返却)
 */
async function readCustomEmojis() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_emojis.size > 0) {
        console.log('@INF: use app_prefs/emojis/ cache.')
        return pref_emojis
    }
    const content_map = readDirFile('app_prefs/emojis')
    if (content_map.size == 0) return null // ファイルが見つからなかったらnullを返却

    const emoji_map = new Map()
    // ハッシュキーから拡張子を抜いてドメイン名にする
    content_map.forEach((v, k) => emoji_map.set(k.substring(0, k.lastIndexOf('.')), JSON.parse(v)))
    pref_emojis = emoji_map
    console.log('@INF: read app_prefs/emojis/.')
    return pref_emojis
}

/**
 * #IPC
 * カスタム絵文字のキャッシュを書き込む
 * 
 * @param event イベント
 * @param json_data 書き込むJSONデータ
 */
async function writeCustomEmojis(event, data) {
    // 絵文字キャッシュデータを書き込み
    const content = await overwriteFile(`app_prefs/emojis/${data.host}.json`, data.emojis)
    console.log(`@INF: write app_prefs/emojis/${data.host}.json.`)
    // キャッシュを更新
    pref_emojis.set(data.host, data.emojis)
}

/**
 * #IPC
 * 保存してある下書き情報を読み込む.
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return 下書き情報
 */
async function readDraft() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (cache_draft) {
        console.log('@INF: use app_prefs/draft.json cache.')
        return cache_draft
    }
    const content = readFile('app_prefs/draft.json')
    if (!content) { // ファイルが見つからなかったらキャッシュを初期化して返却
        cache_draft = []
        return cache_draft
    }
    cache_draft = JSON.parse(content)
    console.log('@INF: read app_prefs/draft.json.')
    return cache_draft
}

/**
 * #IPC
 * 下書きを設定ファイルに書き込む.
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param event イベント
 * @param json_data 書き込むJSONデータ
 */
async function overwriteDraft(event, data) {
    const content = await overwriteFile('app_prefs/draft.json', data)
    console.log('@INF: finish write app_prefs/draft.json')

    cache_draft = JSON.parse(content)
}

/**
 * #IPC
 * 保存してある一時タイムラインのお気に入り情報を読み込む.
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return 一時タイムラインお気に入り情報
 */
async function readTemptl() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (pref_temptl_fav) {
        console.log('@INF: use app_prefs/temptl_fav.json cache.')
        return pref_temptl_fav
    }
    const content = readFile('app_prefs/temptl_fav.json')
    if (!content) { // ファイルが見つからなかったらキャッシュを初期化して返却
        pref_temptl_fav = []
        return pref_temptl_fav
    }
    pref_temptl_fav = JSON.parse(content)
    console.log('@INF: read app_prefs/temptl_fav.json.')
    return pref_temptl_fav
}

/**
 * #IPC
 * 一時タイムラインお気に入りを設定ファイルに書き込む.
 * 書き込んだ後アプリケーションキャッシュを更新
 * 
 * @param event イベント
 * @param data 書き込むJSONデータ
 */
async function overwriteTemptl(event, data) {
    const content = await overwriteFile('app_prefs/temptl_fav.json', data)
    console.log('@INF: finish write app_prefs/temptl_fav.json')

    pref_temptl_fav = JSON.parse(content)
}

/**
 * #IPC
 * 保存してある送信履歴を読み込む
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return 送信履歴キャッシュ情報(マップで返却)
 */
async function readHistory() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (cache_history) {
        console.log('@INF: use app_prefs/history.json cache.')
        return cache_history
    }
    const content = readFile('app_prefs/history.json')
    if (!content) { // ファイルが見つからなかったらキャッシュを初期化して返却
        cache_history = {
            "post": [],
            "activity": []
        }
        return cache_history
    }
    cache_history = JSON.parse(content)
    console.log('@INF: read app_prefs/history.json.')
    return cache_history
}

/**
 * #IPC
 * 送信履歴をJSONファイルとして書き込む
 * 
 * @param event イベント
 * @param json_data 書き込むJSONデータ
 */
async function overwriteHistory(event, data) {
    const content = await overwriteFile('app_prefs/history.json', data)
    console.log('@INF: finish write app_prefs/history.json')

    cache_history = JSON.parse(content)
}

/**
 * #IPC
 * 保存してあるカスタム絵文字の使用履歴を読み込む
 * アプリケーションキャッシュがあるばあいはそちらを優先
 * 
 * @return カスタム絵文字履歴JSON
 */
async function readEmojiHistory() {
    // 変数キャッシュがある場合はキャッシュを使用
    if (cache_emoji_history) {
        console.log('@INF: use app_prefs/emoji_history.json cache.')
        return cache_emoji_history
    }
    const content = readFile('app_prefs/emoji_history.json')
    if (!content) { // ファイルが見つからなかったらキャッシュを初期化して返却
        cache_emoji_history = []
        return cache_emoji_history
    }
    cache_emoji_history = JSON.parse(content)
    console.log('@INF: read app_prefs/emoji_history.json.')
    return cache_emoji_history
}

/**
 * #IPC
 * カスタム絵文字の使用履歴をJSONファイルとして書き込む
 * 
 * @param event イベント
 * @param json_data 書き込むJSONデータ
 */
async function overwriteEmojiHistory(event, data) {
    const content = await overwriteFile('app_prefs/emoji_history.json', data)
    console.log('@INF: finish write app_prefs/emoji_history.json')

    cache_emoji_history = JSON.parse(content)
}

/*====================================================================================================================*/

/**
 * #Utils #Node.js
 * 汎用ファイル読み込みメソッド(同期)
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

/**
 * #Utils #Node.js
 * 汎用ディレクトリ読み込みメソッド(同期)
 * 読み込みに成功すればファイル名をキーにしたMapが返る
 * 
 * @param dirpath 読み込むディレクトリのパス
 * @return 読み込んだファイルのMap
 */
function readDirFile(dirpath) {
    // ApplicationDataのパスを取得
    const pref_path = path.join(app.getPath('userData'), dirpath)
    const contents = new Map()
    try {
        const filenames = fs.readdirSync(pref_path)
        if (is_mac) { // Mac版は.DS_Storeを除外してファイル走査
            const store_idx = filenames.indexOf('.DS_Store')
            filenames.splice(store_idx, 1)
        }
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

/**
 * #Utils #Node.js
 * 汎用リソース読み込みメソッド(同期).
 * アプリケーション内部のリソースファイルを読み込むのに使用.
 * 
 * @param filepath 読み込むディレクトリのパス
 * @return 読み込んだファイルのデータ
 */
function readResource(filepath) {
    let content = null
    try {
        content = fs.readFileSync(path.join(__dirname, filepath))
    } catch(err) {
        console.log('!ERR: file read failed.')
    }
    return content
}

/**
 * #Utils #node-fetch
 * Ajax実行メソッド.
 * node-fetchによるfetchと同じロジックでAjax通信を行う.
 * 
 * @param arg パラメータオブジェクト
 * @return レスポンスオブジェクト
 */
async function ajax(arg) {
    try {
        let response = null
        let url = arg.url
        let param = {
            method: arg.method,
            headers: arg.headers
        }
        if (arg.data) { // Request Parameterが存在する場合
            if (arg.method == "GET") { // GETはパラメータをURLに埋め込む
                const query_param = Object.keys(arg.data).reduce((str, key) => `${str}&${key}=${arg.data[key]}`, '')
                url += `?${query_param.substring(1)}`
            } else {
                if (arg.headers['Content-Type'] == 'application/json') param.body = arg.data
                else { // POSTはパラメータをURLSearchParamsにセットする
                    const post_params = new URLSearchParams()
                    Object.keys(arg.data).forEach(key => post_params.append(key, arg.data[key]))
                    param.body = post_params
                }
            }
        }

        // fetchでHTTP Requestを送信
        response = await fetch(url, param)

        // ステータスコードがエラーの場合はエラーを投げる
        if (!response.ok) throw new Error(response.status)

        // responseをjsonとheaderとHTTP Statusに分けて返却
        return {
            headers: response.headers,
            status: response.status,
            body: await response.json()
        }
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * #Utils
 * ランダムで色を返却する.
 * 
 * @return CIELCHでの色情報
 */
function getRandomColor() {
    const hue = Math.floor(Math.random() * 360)
    const light = 45 + Math.floor(Math.random() * 11)
    const chroma = 10 + Math.floor(Math.random() * 61)

    return `lch(${light}% ${chroma}% ${hue})`
}


/*====================================================================================================================*/

/**
 * #IPC #feedparser
 * MistdonのGitHubからリリース情報を取得して最新版のバージョンを返す.
 * 
 * @return 最新バージョンの情報を乗っけたオブジェクト
 */
async function fetchVersion() {
    // feedparserでJSONとして返却する処理を事前に関数化
    const parseFeed = (res) => new Promise((resolve, reject) => {
        let parser = new FeedParser()
        parser.on('readable', () => {
            const feed = parser.read()
            const version = feed.link.substring(feed.link.lastIndexOf('v'))
            resolve({
                title: feed.title,
                link: feed.link,
                version: version,
                // フィードの最新バージョンがこのバージョンと同じならフラグを立てる
                lastest: version == `v${app.getVersion()}`
            })
        })
        parser.on('error', (err) => {
            console.log('Feed parse error.')
            reject(err)
        })
        res.body.pipe(parser)
    })

    // fetchでGitHubのReleaseのRSSフィードをリクエストする
    const response = await fetch('https://github.com/tizerm/Mistdon/releases.atom')

    // ステータスコードがエラーの場合はエラーを投げる
    if (!response.ok) throw new Error(`Feed GET Error HTTP Status: ${response.status}`)

    // 読み込みイベントを待ってフィードの内容を取得
    return await parseFeed(response)
}

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
 * #Main #Node.js
 * OAuth認証用サーバー起動処理.
 */
const bootServer = (win) => {
    const types = new Map()
    types.set('.html', "text/html")
    types.set('.css', "text/css")
    types.set('.png', "image/png")
    types.set('.jpg', "image/jpg")

    // サーバー設定
    const server = http.createServer((request, response) => (async () => {
        // リクエストURLを取得
        const url = request.url
        console.log(url)
        if (url.match(new RegExp('^/oauth/', 'g'))) { // OAuth認証リダイレクトの場合
            try { // GETパラメータを取得
                const param = url.substring(url.indexOf('?') + 1).split('&')
                    .reduce((map, p) => map.set(...p.split('=')), new Map())
                if (param.size == 0) throw new Error('400')

                // サーバーサイドのOAuth認証処理を実行
                if (url.match(new RegExp('/mastodon', 'g'))) // Mastodon
                    await authorizeMastodon(param.get('code'))
                else if (url.match(new RegExp('/misskey', 'g'))) // Misskey
                    await authorizeMisskey(param.get('session'))

                // 認証処理が成功した場合は成功画面を返却してElectronの画面を再読み込み
                const content = readResource('src/server/accept.html')
                response.writeHead(200, { "Content-Type": "text/html" })
                response.end(content, "utf-8")
                win.loadFile('src/auth.html')
            } catch (err) { // 認証中にエラーが発生したらエラー画面
                console.log(`!Server Error: ${err}`)
                const content = readResource('src/server/error.html')
                response.writeHead(500, { "Content-Type": "text/html" })
                //response.end("Internal Server Error<br/>" + err.toString(), "utf-8")
                response.end(content, "utf-8")
            }
        } else { // スタティックリソースに対するリダイレクトの場合
            const content = readResource(`src${url}`)
            const content_type = types.get(url.substring(url.lastIndexOf('.'))) ?? "application/octet-stream"
            response.writeHead(200, { "Content-Type": content_type })
            response.end(content, "utf-8")
        }
    })())

    // サーバー起動
    server.listen(3100)
    console.log('OAuth Server boot success. http://localhost:3100/')
}

/**
 * #Main #Electron
 * メインウィンドウ生成処理
 */
const createWindow = () => {
    let windowState = stateKeeper({
        defaultWidth: 1920,
        defaultHeight: 1080
    })
    const win = new BrowserWindow({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        webPreferences: {
            devTools: !app.isPackaged,
            icon: './path/to/icon.png',
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // 最初に表示するページを指定
    win.setMenuBarVisibility(!app.isPackaged)
    win.loadFile('src/index.html')

    // 認証サーバー起動
    bootServer(win)

    windowState.manage(win)
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
    ipcMain.handle('read-general-pref', readGeneralPref)
    ipcMain.handle('read-pref-emojis', readCustomEmojis)
    ipcMain.handle('read-draft', readDraft)
    ipcMain.handle('read-temptl', readTemptl)
    ipcMain.handle('read-history', readHistory)
    ipcMain.handle('read-emoji-history', readEmojiHistory)
    ipcMain.on('write-pref-mstd-accs', writePrefMstdAccs)
    ipcMain.on('write-pref-msky-accs', writePrefMskyAccs)
    ipcMain.on('write-pref-bsky-accs', writePrefBskyAccs)
    ipcMain.on('write-pref-acc-color', writePrefAccColor)
    ipcMain.on('write-pref-cols', writePrefCols)
    ipcMain.on('write-general-pref', writeGeneralPref)
    ipcMain.on('write-pref-emojis', writeCustomEmojis)
    ipcMain.on('write-draft', overwriteDraft)
    ipcMain.on('write-temptl', overwriteTemptl)
    ipcMain.on('write-history', overwriteHistory)
    ipcMain.on('write-emoji-history', overwriteEmojiHistory)
    ipcMain.handle('get-api-params', getAPIParams)
    ipcMain.handle('fetch-version', fetchVersion)
    ipcMain.on('open-oauth', openOAuthSession)
    ipcMain.on('open-external-browser', openExternalBrowser)
    ipcMain.on('notification', notification)

    ipcMain.handle('refresh-bsky-session', refreshBlueskySession)

    // ウィンドウ生成
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})


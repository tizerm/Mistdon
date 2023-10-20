/**
 * #Class
 * アカウント情報を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Account {
    // コンストラクタ: 設定ファイルにあるアカウント設定値を使って初期化
    constructor(pref) {
        this.pref = pref
        this.index = pref.index
        this.full_address = `@${pref.user_id}@${pref.domain}`
        this.socket_prefs = []
        this.socket = null
        this.reconnect = false
        this.emoji_cache = null
    }

    // Getter: プラットフォーム
    get platform() { return this.pref.platform }
    // Getter: WebSocket接続URL
    get socket_url() {
        let url = null
        switch (this.pref.platform) {
            case 'Mastodon': // Mastodon
                url = `${this.pref.socket_url}?access_token=${this.pref.access_token}`
                break
            case 'Misskey': // Misskey
                url = `${this.pref.socket_url}?i=${this.pref.access_token}`
                break
            default:
                break
        }
        return url
    }
    // Getter: 絵文字キャッシュ
    get emojis() { return Emojis.get(this.pref.domain) }

    // スタティックマップを初期化(非同期)
    static {
        (async () => {
            const accounts = await window.accessApi.readPrefAccs()
            const acc_map = new Map()
            const keys = []
            let index = 0
            accounts?.forEach((v, k) => {
                v.index = index++
                acc_map.set(k, new Account(v))
                keys.push(k)
            })
            Account.map = acc_map
            Account.keys = keys
        })()
    }

    /**
     * #StaticMethod
     * アカウントプロパティを取得
     * 
     * @param arg 数値かアカウントのフルアドレス
     */
    static get(arg) {
        // 数値型だった場合インデクスとして番号からプロパティを取得
        if (typeof arg == 'number') return Account.map.get(Account.keys[arg])
        // オブジェクトだった場合文字列として取得
        else return Account.map.get(arg)
    }

    /**
     * #StaticMethod
     * アカウントプロパティを走査
     * 
     * @param callback 要素ごとに実行するコールバック関数
     */
    static each(callback) {
        Account.map.forEach((v, k) => callback(v))
    }

    /**
     * #StaticMethod
     * アカウントプロパティを走査
     * 引数で指定したプラットフォームのアカウントだけでループさせる
     * 
     * @param platform 走査対象のプラットフォーム
     * @param callback 要素ごとに実行するコールバック関数
     */
    static eachPlatform(platform, callback) {
        let nothing = true
        Account.map.forEach((v, k) => {
            if (v.platform == platform) {
                nothing = false
                callback(v)
            }
        })
        return nothing
    }

    /**
     * #StaticMethod
     * アカウントデータが存在しない場合trueを返す
     */
    static isEmpty() {
        return Account.map.size == 0
    }

    /**
     * #Method
     * このアカウントを投稿先アカウントに設定
     */
    setPostAccount() {
        $("#header>#head_postarea .__lnk_postuser>img").attr('src', this.pref.avatar_url)
        $("#header>#head_postarea .__lnk_postuser>img").attr('name', this.full_address)
        $("#header>h1").text(`${this.pref.username} - ${this.full_address}`)
        $("#header>h1").css("background-color", `#${this.pref.acc_color}`)
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントから投稿処理を実行
     * 
     * @param arg パラメータオブジェクト
     */
    async post(arg) {
        // 何も書いてなかったら何もしない
        if (!arg.content) return
        let visibility = null
        let request_param = null
        let request_promise = null
        // 先にtoast表示
        const toast_uuid = crypto.randomUUID()
        toast("投稿中です...", "progress", toast_uuid)
        switch (this.pref.platform) {
            case 'Mastodon': // Mastodon
                // 公開範囲を取得
                switch (arg.visibility_id) {
                    case 'visibility_public': // 公開
                        visibility = "public"
                        break
                    case 'visibility_unlisted': // ホーム
                        visibility = "unlisted"
                        break
                    case 'visibility_followers': // フォロ限
                        visibility = "private"
                        break
                    case 'visibility_direct': // DM
                        visibility = "direct"
                        break
                    default: // リプライから来た場合はリプライ先の値が既に入っている
                        visibility = arg.visibility_id
                        break
                }
                request_param = {
                    "status": arg.content,
                    "visibility": visibility
                }
                // CWがある場合はCWテキストも追加
                if (arg.cw_text) request_param.spoiler_text = arg.cw_text
                // リプライの場合はリプライ先ツートIDを設定
                if (arg.reply_id) request_param.in_reply_to_id = arg.reply_id
                request_promise = $.ajax({ // APIに投稿を投げて、正常に終了したら最終投稿に設定
                    type: "POST",
                    url: `https://${this.pref.domain}/api/v1/statuses`,
                    dataType: "json",
                    headers: {
                        "Authorization": `Bearer ${this.pref.access_token}`,
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    data: request_param
                }).then(data => new Status(data, null, this).pushStack(arg.content))
                break
            case 'Misskey': // Misskey
                // 公開範囲を取得
                switch (arg.visibility_id) {
                    case 'visibility_public': // 公開
                        visibility = "public"
                        break
                    case 'visibility_unlisted': // ホーム
                        visibility = "home"
                        break
                    case 'visibility_followers': // フォロ限
                        visibility = "followers"
                        break
                    case 'visibility_direct': // DM
                        visibility = "specified"
                        break
                    default: // リプライから来た場合はリプライ先の値が既に入っている
                        visibility = arg.visibility_id
                        break
                }
                request_param = {
                    "i": this.pref.access_token,
                    "text": arg.content,
                    "visibility": visibility
                }
                // CWがある場合はCWテキストも追加
                if (arg.cw_text) request_param.cw = arg.cw_text
                // リプライの場合はリプライ先ノートIDを設定
                if (arg.reply_id) request_param.replyId = arg.reply_id
                // 引用の場合は引用ノートIDを設定
                if (arg.quote_id) request_param.renoteId = arg.quote_id
                request_promise = $.ajax({ // APIに投稿を投げて、正常に終了したら最終投稿に設定
                    type: "POST",
                    url: `https://${this.pref.domain}/api/notes/create`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(request_param)
                }).then(data => new Status(data.createdNote, null, this).pushStack(arg.content))
                break
            default:
                break
        }
        request_promise.then(data => {
            // 投稿成功時(コールバック関数実行)
            arg.success()
            toast("投稿しました.", "done", toast_uuid)
        }).catch(jqXHR => toast("投稿に失敗しました.", "error", toast_uuid))
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントからブースト/リノート/お気に入り処理を実行
     * 
     * @param arg パラメータオブジェクト
     */
    async reaction(arg) {
        let request_promise = null
        let target_json = null
        const toast_uuid = crypto.randomUUID()
        toast("対象の投稿を取得中です...", "progress", toast_uuid)
        // ターゲットの投稿データを取得
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                request_promise = $.ajax({ // 検索から投稿を取得
                    type: "GET",
                    url: `https://${this.pref.domain}/api/v2/search`,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${this.pref.access_token}` },
                    data: {
                        "q": arg.target_url,
                        "type": "statuses",
                        "resolve": true
                    }
                }).then(data => { return data.statuses[0] })
                    .catch(jqXHR => toast("投稿の取得でエラーが発生しました.", "error", toast_uuid))
                break
            case 'Misskey': // Misskey
                request_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.pref.domain}/api/ap/show`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        "i": this.pref.access_token,
                        "uri": arg.target_url
                    })
                }).then(data => { return data.object })
                    .catch(jqXHR => toast("投稿の取得でエラーが発生しました.", "error", toast_uuid))
                break
            default:
                break
        }
        // データが取得されるのを待ってtarget_jsonに代入
        target_json = await request_promise
        // 投稿を取得できなかったらなにもしない
        if (!target_json) return
        // 取得できた場合はtarget_jsonからStatusインスタンスを生成
        const target_post = new Status(target_json, null, this)
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                switch (arg.target_mode) {
                    case '__menu_reply': // リプライ
                        target_post.createReplyWindow()
                        toast(null, "hide", toast_uuid)
                        break
                    case '__menu_reblog': // ブースト
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/reblog`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => toast("投稿をブーストしました.", "done", toast_uuid))
                            .catch(jqXHR => toast("ブーストに失敗しました.", "error", toast_uuid))
                        break
                    case '__menu_favorite': // お気に入り
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/favourite`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => toast("投稿をお気に入りしました.", "done", toast_uuid))
                            .catch(jqXHR => toast("お気に入りに失敗しました.", "error", toast_uuid))
                        break
                    case '__menu_bookmark': // ブックマーク
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/bookmark`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => toast("投稿をブックマークしました.", "done", toast_uuid))
                            .catch(jqXHR => toast("ブックマークに失敗しました.", "error", toast_uuid))
                        break
                    default:
                        break
                }
                break
            case 'Misskey': // Misskey
                switch (arg.target_mode) {
                    case '__menu_reply': // リプライ
                        target_post.createReplyWindow()
                        toast(null, "hide", toast_uuid)
                        break
                    case '__menu_reblog': // リノート
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/notes/create`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": this.pref.access_token,
                                "renoteId": target_post.id
                            })
                        }).then(data => toast("投稿をリノートしました.", "done", toast_uuid))
                            .catch(jqXHR => toast("リノートに失敗しました.", "error", toast_uuid))
                        break
                    case '__menu_quote': // 引用
                        target_post.createQuoteWindow()
                        toast(null, "hide", toast_uuid)
                        break
                    case '__menu_favorite': // お気に入り
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/notes/favorites/create`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": this.pref.access_token,
                                "noteId": target_post.id
                            })
                        }).then(data => toast("投稿をお気に入りしました.", "done", toast_uuid))
                            .catch(jqXHR => toast("お気に入りに失敗しました.", "error", toast_uuid))
                        break
                    case '__menu_reaction': // リアクション
                        target_post.createReactionWindow()
                        toast(null, "hide", toast_uuid)
                        break
                    default:
                        break
                }
                break
            default:
                break
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントからリアクションを送信する(Misskey専用機能)
     * 
     * @param arg パラメータオブジェクト
     */
    async sendReaction(arg) {
        const toast_uuid = crypto.randomUUID()
        toast("リアクションを送信しています...", "progress", toast_uuid)
        $.ajax({
            type: "POST",
            url: `https://${this.pref.domain}/api/notes/reactions/create`,
            dataType: "json",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                "i": this.pref.access_token,
                "noteId": arg.id,
                "reaction": arg.shortcode
            })
        }).then(data => {
            // 投稿成功時(コールバック関数実行)
            arg.success()
            toast("リアクションを送信しました.", "done", toast_uuid)
        }).catch(jqXHR => toast("リアクションに失敗しました.", "error", toast_uuid))
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントからユーザーに対するフォロー/ミュート/ブロックを実行する
     * 
     * @param arg パラメータオブジェクト
     */
    async userAction(arg) {
        let request_promise = null
        let target_json = null
        const toast_uuid = crypto.randomUUID()
        toast("対象ユーザーを取得中です...", "progress", toast_uuid)
        // ターゲットのユーザーデータを取得
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                request_promise = $.ajax({ // 検索から投稿を取得
                    type: "GET",
                    url: `https://${this.pref.domain}/api/v2/search`,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${this.pref.access_token}` },
                    data: {
                        "q": arg.target_user,
                        "type": "accounts",
                        "resolve": true
                    }
                }).then(data => { return data.accounts[0] })
                    .catch(jqXHR => toast("ユーザーの取得でエラーが発生しました.", "error", toast_uuid))
                break
            case 'Misskey': // Misskey
                request_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.pref.domain}/api/users/show`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        "i": this.pref.access_token,
                        "username": arg.target_user.substring(1, arg.target_user.lastIndexOf('@')),
                        "host": arg.target_user.substring(arg.target_user.lastIndexOf('@') + 1)
                    })
                }).then(data => { return data })
                    .catch(jqXHR => toast("ユーザーの取得でエラーが発生しました.", "error", toast_uuid))
                break
            default:
                break
        }
        // データが取得されるのを待ってtarget_jsonに代入
        target_json = await request_promise
        // ユーザーを取得できなかったらなにもしない
        if (!target_json) return
        const target_id = target_json.id
        // 一旦toastを消去
        toast(null, "hide", toast_uuid)

        // ダイアログを出すためモードから先に判定
        switch (arg.target_mode) {
            case '__menu_follow': // フォロー
                dialog({
                    type: 'confirm',
                    title: "ユーザーフォロー",
                    text: `${arg.target_user}を${this.full_address}からフォローします。<br/>よろしいですか？<br/>`,
                    accept: () => { // OKボタン押下時の処理
                        switch (this.platform) {
                            case 'Mastodon': // Mastodon
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/v1/accounts/${target_id}/follow`,
                                    dataType: "json",
                                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                                }).then(data => toast(`${arg.target_user}をフォローしました.`, "done", toast_uuid))
                                    .catch(jqXHR => toast("フォローに失敗しました.", "error", toast_uuid))
                                break
                            case 'Misskey': // Misskey
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/following/create`,
                                    dataType: "json",
                                    headers: { "Content-Type": "application/json" },
                                    data: JSON.stringify({
                                        "i": this.pref.access_token,
                                        "userId": target_id
                                    })
                                }).then(data => toast(`${arg.target_user}をフォローしました.`, "done", toast_uuid))
                                    .catch(jqXHR => toast("フォローに失敗しました.", "error", toast_uuid))
                                break
                            default:
                                break
                        }
                    }
                })
                break
            case '__menu_mute': // ミュート
                dialog({
                    type: 'confirm',
                    title: "ユーザーミュート",
                    text: `${arg.target_user}を${this.full_address}からミュートします。<br/>よろしいですか？<br/>`,
                    accept: () => { // OKボタン押下時の処理
                        switch (this.platform) {
                            case 'Mastodon': // Mastodon
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/v1/accounts/${target_id}/mute`,
                                    dataType: "json",
                                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                                }).then(data => toast(`${arg.target_user}をミュートしました.`, "done", toast_uuid))
                                    .catch(jqXHR => toast("ミュートに失敗しました.", "error", toast_uuid))
                                break
                            case 'Misskey': // Misskey
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/mute/create`,
                                    dataType: "json",
                                    headers: { "Content-Type": "application/json" },
                                    data: JSON.stringify({
                                        "i": this.pref.access_token,
                                        "userId": target_id
                                    })
                                }).then(data => toast(`${arg.target_user}をミュートしました.`, "done", toast_uuid))
                                    .catch(jqXHR => toast("ミュートに失敗しました.", "error", toast_uuid))
                                break
                            default:
                                break
                        }
                    }
                })
                break
            case '__menu_block': // ブロック
                dialog({
                    type: 'confirm',
                    title: "ユーザーブロック",
                    text: `${arg.target_user}を${this.full_address}からブロックします。<br/>
                    よろしいですか？<br/><br/>……本当に？`,
                    accept: () => { // OKボタン押下時の処理
                        switch (this.platform) {
                            case 'Mastodon': // Mastodon
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/v1/accounts/${target_id}/block`,
                                    dataType: "json",
                                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                                }).then(data => toast(`${arg.target_user}をブロックしました.`, "done", toast_uuid))
                                    .catch(jqXHR => toast("ブロックに失敗しました.", "error", toast_uuid))
                                break
                            case 'Misskey': // Misskey
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/blocking/create`,
                                    dataType: "json",
                                    headers: { "Content-Type": "application/json" },
                                    data: JSON.stringify({
                                        "i": this.pref.access_token,
                                        "userId": target_id
                                    })
                                }).then(data => toast(`${arg.target_user}をブロックしました.`, "done", toast_uuid))
                                    .catch(jqXHR => toast("ブロックに失敗しました.", "error", toast_uuid))
                                break
                            default:
                                break
                        }
                    }
                })
                break
            default:
                break
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントからURLの投稿を削除する
     * 
     * @param url 削除対象の投稿のURL
     */
    async deletePost(url) {
        // URLから投稿を取得
        let post = await Status.getStatus(url)
        // アカウント情報をこのアカウントに書き換える
        post.from_account = this
        dialog({ // 削除確認ダイアログを表示
            type: 'confirm',
            title: "投稿削除",
            text: `投稿を削除しますか？<br/><br/>${post.content_text}`,
            // OKボタンで投稿を削除
            accept: () => post.delete((post, uuid) => toast("投稿を削除しました.", "done", uuid))
        })
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントから検索処理を実行する
     * 現状投稿の検索のみ対応
     * 
     * @param query 検索文字列
     */
    search(query) {
        let rest_promise = null
        // 検索文字列を渡して投稿を検索
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${this.pref.domain}/api/v2/search`,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${this.pref.access_token}` },
                    data: {
                        "q": query,
                        "type": "statuses",
                        "limit": 40
                    }
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.statuses.forEach(p => posts.push(
                            new Status(p, { "parent_column": Column.SEARCH_COL } , this)))
                        return posts
                    })()
                })
                break
            case 'Misskey': // Misskey
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.pref.domain}/api/notes/search`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        "i": this.pref.access_token,
                        "query": query,
                        "limit": 40
                    })
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.forEach(p => posts.push(
                            new Status(p, { "parent_column": Column.SEARCH_COL }, this)))
                        return posts
                    })()
                })
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.pref.domain}での投稿の検索でエラーが発生しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    /**
     * #Method #WebSocket
     * このアカウントにWebSocketの設定を追加する
     * 
     * @param arg パラメータ
     */
    addSocketPref(arg) {
        this.socket_prefs.push(arg)
    }

    /**
     * #Method #WebSocket
     * このアカウントからWebSocket接続処理を実行
     * 
     * @param arg パラメータ
     */
    async connect(arg) {
        // WebSocket接続を開始
        this.socket = new WebSocket(this.socket_url)
        this.reconnect = arg.reconnect

        // WebSocket接続開始時処理
        this.socket.addEventListener("open", (event) => {
            // 接続開始用コールバック関数を実行
            arg.openFunc()
            // ソケットに受信設定を送信
            this.socket_prefs.forEach(p => this.socket.send(p.send_param))
        })
        // エラーハンドラ
        this.socket.addEventListener("error", (event) => {
            toast(`${this.full_address}で接続エラーが発生しました、再接続してください。`, "error")
            // エラーで切れた場合は再接続しない
            this.reconnect = false
            console.log(event)
        })
        // WebSocket接続停止時処理
        this.socket.addEventListener("close", (event) => {
            // 接続停止用コールバック関数を実行
            arg.closeFunc()
            // 自身を呼び出して再接続
            if (this.reconnect) this.connect(arg)
            console.log(event)
        })
        // 受信処理を設定
        this.socket_prefs.forEach(p => this.socket.addEventListener("message", p.messageFunc))
    }

    /**
     * #StaticMethod
     * カスタム絵文字キャッシュデータが欠損している場合に、
     * すべてのアカウントからカスタム絵文字のキャッシュを取得してファイルに保存する
     */
    static async cacheEmojis() {
        { // キャッシュが取れていないアカウントがある場合は自動的にキャッシュを取得
            let cache_flg = true
            for (const elm of Account.map) {
                if (!elm[1].emojis) {
                    cache_flg = false
                    break
                }
            }
            if (cache_flg) return // キャッシュが取れてる場合はなにもしない
        }
        const toast_uuid = crypto.randomUUID()
        toast("カスタム絵文字のキャッシュを更新します...",
            "progress", toast_uuid)
        // サーバーのカスタム絵文字一覧を取得してファイルに書き込む
        const write_promises = []
        Account.map.forEach((v, k) => write_promises.push(v.getCustomEmojis()
            .then(data => { return window.accessApi.writeCustomEmojis(data) })
            .catch(jqXHR => { // カスタム絵文字の取得に失敗した場合は空のキャッシュデータを作成
                console.log(jqXHR)
                toast(`${v.pref.domain}のカスタム絵文字の取得に失敗しました。
                    空のキャッシュデータを作成します。`, "error")
                return window.accessApi.writeCustomEmojis({
                    "host": v.pref.domain,
                    "emojis": []
                })
            })
        ))
        // すべて書き込み終わったら通知toastを出してキャッシュを更新
        Promise.all(write_promises).then(() => {
            toast("カスタム絵文字のキャッシュが完了しました.", "done", toast_uuid)
            Emojis.readCache()
        })
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントのサーバーの持っているカスタム絵文字を取得する
     */
    getCustomEmojis() {
        let rest_promise = null
        switch (this.pref.platform) {
            case 'Mastodon': // Mastodon
                // カスタム絵文字を取得して整形するプロセスをpromiseとして返却
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${this.pref.domain}/api/v1/custom_emojis`,
                    dataType: "json"
                }).then(data => {
                    return (async () => {
                        // 絵文字一覧データをメインプロセスにわたす形に整形する
                        const emojis = []
                        data.forEach(e => emojis.push({
                            "name": e.shortcode,
                            "shortcode": `:${e.shortcode}:`,
                            "url": e.url
                        }))
                        return {
                            "host": this.pref.domain,
                            "emojis": emojis
                        }
                    })()
                })
                break
            case 'Misskey': // Misskey
                // v11以下と最新で絵文字を取得するエンドポイントが違うので動いたやつで取得
                rest_promise = Promise.any([
                    $.ajax({ // 最新バージョン(v2023.9.3)
                        type: "POST",
                        url: `https://${this.pref.domain}/api/emojis`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ })
                    }).then(data => { return data.emojis }),
                    $.ajax({ // v11以下(Misskey.devなど)
                        type: "POST",
                        url: `https://${this.pref.domain}/api/meta`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ detail: false })
                    }).then(data => { // emojis entityがあればそのまま返却、なければ新版なのでreject
                        if (data.emojis) return data.emojis
                        else return Promise.reject('not exist emojis in /api/meta.')
                    })
                ]).then(data => {
                    return (async () => {
                        // 絵文字一覧データをメインプロセスにわたす形に整形する
                        const emojis = []
                        data.forEach(e => emojis.push({
                            "name": e.aliases[0],
                            "shortcode": `:${e.name}:`,
                            "url": e.url
                        }))
                        return {
                            "host": this.pref.domain,
                            "emojis": emojis
                        }
                    })()
                })
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントの最新情報を取得する
     */
    async getInfo() {
        let rest_promise = null
        switch (this.pref.platform) {
            case 'Mastodon': // Mastodon
                // 認証アカウントの情報を取得
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${this.pref.domain}/api/v1/accounts/verify_credentials`,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                })
                break
            case 'Misskey': // Misskey
                // 認証アカウントの情報を取得
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.pref.domain}/api/i`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({ "i": this.pref.access_token })
                })
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.then(data => { return new User(data, this.pref.domain, this.pref.platform) })
            .catch(jqXHR => { // 失敗したらnullを返す
                toast(`${this.full_address}の最新情報の取得に失敗しました.`, "error")
                return null
            })
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントとMistdonとの認証を解除する
     * (現状MisskeyはtokenをrevokeするAPIの仕様がよくわからないので消すだけ)
     * 
     * @param callback 削除後に実行するコールバック関数
     */
    unauthorize(callback) {
        switch (this.pref.platform) {
            case 'Mastodon': // Mastodon
                // 認証解除プロセスに成功したらコールバック関数を実行
                $.ajax({
                    type: "POST",
                    url: `https://${this.pref.domain}/oauth/revoke`,
                    dataType: "json",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                    data: {
                        "client_id": this.pref.client_id,
                        "client_secret": this.pref.client_secret,
                        "token": this.pref.access_token
                    }
                }).then(callback)
                break
            case 'Misskey': // Misskey
                // 認証解除APIがないのでそのままコールバックを実行
                callback()
                break
            default:
                break
        }
    }

    /**
     * #Method
     * このアカウントのサーバーのカスタム絵文字リストのDOMを生成して表示する
     */
    createEmojiList() {
        $("#header>#pop_custom_emoji").html(`
            <div class="emoji_head">
                <h2>カスタム絵文字一覧</h2>
                <h3>${this.pref.domain}</h3>
            </div>
            <div class="emoji_list">
            </div>
            <button type="button" id="__on_emoji_close">×</button>
        `).show("slide", { direction: "left" }, 150)
        $("#header>#pop_custom_emoji>.emoji_head").css("background-color", `#${this.pref.acc_color}`)

        // 一度枠組みを表示してから非同期で絵文字一覧を動的に表示してく
        ;(async () => this.emojis.each(emoji => $("#header>#pop_custom_emoji>.emoji_list").append(`
            <a class="__on_emoji_append" name="${emoji.shortcode}"><img src="${emoji.url}" alt="${emoji.name}"/></a>
            `)))()
    }

    // Getter: 認証アカウントを順番に並べたときにこのアカウントの次にあたるアカウントを取得
    get next() {
        let index = this.index + 1
        // 右端の場合は最初の要素を選択
        if (Account.keys.length <= index) index = 0
        return Account.get(index)
    }

    // Getter: 認証アカウントを順番に並べたときにこのアカウントの前にあたるアカウントを取得
    get prev() {
        let index = this.index - 1
        // 左端の場合は最後の要素を選択
        if (index < 0) index = Account.keys.length - 1
        return Account.get(index)
    }

    /**
     * #StaticMethod
     * 投稿アカウントを選択するリストのDOMを返却
     */
    static createPostAccountList() {
        let html = '<div class="account_list">'
        Account.map.forEach((v, k) => html += `
            <a name="${k}" class="__lnk_account_elm">
                <img src="${v.pref.avatar_url}" class="user_icon"/>
                <div class="display_name">${v.pref.username}</div>
                <div class="user_domain">${k}</div>
            </a>
        `)
        html += '</div>'
        return html
    }

    /**
     * #StaticMethod
     * 投稿アカウントを選択するコンテキストメニューのDOMを返却
     */
    static createContextMenuAccountList(platform) {
        let html = ''
        if (platform) {
            // プラットフォーム指定がされている場合は対象プラットフォームだけ表示
            if (Account.eachPlatform(platform, elm => html += `
                <li name="${elm.full_address}"><div>${elm.pref.username} - ${elm.full_address}</div></li>`))
                // 対象プラットフォームが認証されていない場合は選択不可の項目を作る
                html = `<li class="ui-state-disabled"><div>(${platform}のアカウントがありません)</div></li>`
        } else // プラットフォーム指定がない場合は普通にすべてのアカウントを表示
            Account.map.forEach((v, k) => html += `<li name="${k}"><div>${v.pref.username} - ${k}</div></li>`)
        return html
    }

    /**
     * #StaticMethod
     * アカウント認証画面のアカウントリストのDOMを返却
     */
    static createAccountPrefList() {
        let html = ''
        Account.map.forEach((v, k) => {
            const cache_flg = v.emojis ? true : false
            html += `
                <li class="ui-sortable" name="${v.full_address}">
                    <h3>${v.pref.domain}</h3>
                    <div class="user">
                        <img src="${v.pref.avatar_url}" class="usericon"/>
                        <h4 class="username">${v.pref.username}</h4>
                        <div class="userid">${v.full_address}</div>
                    </div>
                    <div class="option">
                        アカウントカラー: 
                        #<input type="text" class="__txt_acc_color __pull_color_palette" value="${v.pref.acc_color}" size="6"/>
                        <br/>カスタム絵文字キャッシュ: ${cache_flg ? '◯' : '×'}
                    </div>
                    <div class="foot_button">
                        <button type="button" class="__btn_unauth_acc">認証解除</button>
                    </div>
                </li>
            `
        })
        return html
    }

    /**
     * #StaticMethod
     * アカウントのプロフィール一覧を生成するDOMを返却
     */
    static createProfileTimeline() {
        let html = ''
        Account.map.forEach((v, k) => html /* アカウント分のカラムを生成 */ += `
            <td id="${k}" class="timeline column_profile">
                <div class="col_loading">
                    <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                    <span class="loading_text">Now Loading...</span>
                </div>
                <ul class="profile_header"></ul>
                <ul class="profile_detail"></ul>
                <div class="user_post_elm">
                    <div class="pinned_block post_div">
                        <h4>ピンどめ</h4>
                        <ul class="pinned_post __context_posts"></ul>
                    </div>
                    <div class="posts_block post_div">
                        <h4>投稿一覧</h4>
                        <ul class="posts __context_posts"></ul>
                    </div>
                </div>
                <div class="user_ff_elm">
                </div>
            </td>
        `)
        // 先に表示フレームだけ生成
        $("#header>#pop_ex_timeline").html(`
            <div class="account_timeline">
                <table id="auth_account_table"><tbody>
                    <tr>${html}</tr>
                </tbody></table>
            </div>
            <button type="button" id="__on_search_close">×</button>
        `).show("slide", { direction: "right" }, 150)
        $("#header>#pop_ex_timeline .user_ff_elm").hide() // ff欄は最初は非表示

        Account.map.forEach((v, k) => v.getInfo().then(detail => {
            const column = $(`#header>#pop_ex_timeline>.account_timeline td[id="${k}"]`)

            // ロード待ち画面を消してユーザー情報のプロフィール部分を生成
            column.find(".col_loading").remove()
            column.find(".profile_header").html(detail.header_element)
            column.find(".profile_detail").html(detail.profile_element)

            // ユーザーの投稿を取得
            detail.getPost(v).then(posts => posts.forEach(p => column.find(".posts").append(p.element)))
            detail.getPinnedPost(v).then(posts => {
                if (posts.length > 0) posts.forEach(p => column.find(".pinned_post").append(p.element))
                else { // ピンどめ投稿がない場合はピンどめDOM自体を削除して投稿の幅をのばす
                    column.find(".pinned_block").remove()
                    column.find(".posts").css('height', 'calc((100vh - 310px) * 0.8)')
                }
            })
        }))
    }
}

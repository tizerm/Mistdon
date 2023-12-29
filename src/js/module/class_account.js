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

        this.emoji_history = []
        this.reaction_history = []
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
            // アカウント情報をファイルから読み込み
            const accounts = await window.accessApi.readPrefAccs()
            const acc_map = new Map()
            const keys = []
            let index = 0
            accounts?.forEach((v, k) => {
                v.index = index++
                acc_map.set(k, new Account(v))
                keys.push(k)
            })

            // カスタム絵文字の履歴をファイルから読み込み
            const em_history = await window.accessApi.readEmojiHistory()
            em_history?.forEach(elm => {
                const account = acc_map.get(elm.address)
                if (!account) return // 削除済みのアカウント情報は無視
                account.emoji_history = elm.emoji_history
                account.reaction_history = elm.reaction_history
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
        // 変わってなかったらなにもしない
        if ($("#header>#head_postarea .__lnk_postuser>img").attr('name') == this.full_address) return

        $("#header>#head_postarea .__lnk_postuser>img").attr({
            src: this.pref.avatar_url,
            name: this.full_address
        })

        // 背景アイコンとアカウントカラーを設定
        $("#header>h1>.head_user").css('background-image',
            `url("resources/${this.platform == 'Mastodon' ? 'ic_mastodon.png' : 'ic_misskey.png'}"`
        ).text(`${this.pref.username} - ${this.full_address}`)
        $("#header>h1").css('background-color', `#${this.pref.acc_color}`)

        // 投稿先メニューを生成
        this.createPostToMenu()
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
                })
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
                // 投稿先を設定
                switch (arg.post_to) {
                    case '__to_normal': // 通常投稿
                        request_param.localOnly = false
                        break
                    case '__to_local_only': // ローカルのみ
                        request_param.localOnly = true
                        break
                    default: // チャンネル
                        request_param.localOnly = true
                        request_param.channelId = arg.post_to
                        break
                }
                request_promise = $.ajax({ // APIに投稿を投げて、正常に終了したら最終投稿に設定
                    type: "POST",
                    url: `https://${this.pref.domain}/api/notes/create`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(request_param)
                }).then(data => { return data.createdNote })
                break
            default:
                break
        }
        request_promise.then(data => {
            // 投稿を履歴にスタックする
            new Status(data, History.HISTORY_PREF_TIMELINE, this).pushStack(arg.content)
            // 投稿成功時(コールバック関数実行)
            arg.success()
            toast("投稿しました.", "done", toast_uuid)

            // 絵文字を使っていたら投稿時に履歴を保存
            if (this.use_emoji_flg) Account.cacheEmojiHistory()
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
                break
            default:
                break
        }
        // データが取得されるのを待ってtarget_jsonに代入
        target_json = await request_promise
            .catch(jqXHR => toast("投稿の取得でエラーが発生しました.", "error", toast_uuid))
        // 投稿を取得できなかったらなにもしない
        if (!target_json) return
        // 取得できた場合はtarget_jsonからStatusインスタンスを生成
        const target_post = new Status(target_json, History.HISTORY_PREF_TIMELINE, this)
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
                        }).then(data => {
                            History.pushActivity(target_post, 'reblog')
                            toast("投稿をブーストしました.", "done", toast_uuid)
                        }).catch(jqXHR => toast("ブーストに失敗しました.", "error", toast_uuid))
                        break
                    case '__menu_favorite': // お気に入り
                        request_promise = $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/favourite`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => {
                            History.pushActivity(target_post, 'favorite')
                            toast("投稿をお気に入りしました.", "done", toast_uuid)
                        }).catch(jqXHR => toast("お気に入りに失敗しました.", "error", toast_uuid))
                        break
                    case '__menu_bookmark': // ブックマーク
                        request_promise = $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/bookmark`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => {
                            History.pushActivity(target_post, 'bookmark')
                            toast("投稿をブックマークしました.", "done", toast_uuid)
                        }).catch(jqXHR => toast("ブックマークに失敗しました.", "error", toast_uuid))
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
                        request_promise = $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/notes/create`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": this.pref.access_token,
                                "renoteId": target_post.id
                            })
                        }).then(data => {
                            History.pushActivity(target_post, 'reblog', data.createdNote.id)
                            toast("投稿をリノートしました.", "done", toast_uuid)
                        }).catch(jqXHR => toast("リノートに失敗しました.", "error", toast_uuid))
                        break
                    case '__menu_quote': // 引用
                        target_post.createQuoteWindow()
                        toast(null, "hide", toast_uuid)
                        break
                    case '__menu_favorite': // お気に入り
                        request_promise = $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/notes/favorites/create`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": this.pref.access_token,
                                "noteId": target_post.id
                            })
                        }).then(data => {
                            History.pushActivity(target_post, 'favorite')
                            toast("投稿をお気に入りしました.", "done", toast_uuid)
                        }).catch(jqXHR => toast("お気に入りに失敗しました.", "error", toast_uuid))
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
            // 成功した場合は履歴スタックに保存
            History.pushActivity({
                id: arg.id,
                from_account: this
            }, 'reaction')
            this.updateReactionHistory(arg.shortcode)
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
            // エラーで接続が切れたことをタイムライングループに通知する
            this.socket_prefs.map(m => m.target_group).forEach(gp => gp.setWarning())
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
        return rest_promise.then(data => { return new User({
            json: data,
            host: this.pref.domain,
            remote: true,
            auth: true,
            platform: this.pref.platform
        })}).catch(jqXHR => { // 失敗したらnullを返す
            toast(`${this.full_address}の最新情報の取得に失敗しました.`, "error")
            return null
        })
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントが作成したリストの一覧を取得する
     */
    getLists() {
        let rest_promise = null
        switch (this.pref.platform) {
            case 'Mastodon': // Mastodon
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${this.pref.domain}/api/v1/lists`,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                }).then(data => {
                    // リストを持っていない場合はreject
                    if (data.length == 0) return Promise.reject('empty')
                    return (async () => {
                        // リスト一覧を整形
                        const lists = []
                        data.forEach(l => lists.push({
                            "listname": l.title,
                            "id": l.id
                        }))
                        return lists
                    })()
                })
                break
            case 'Misskey': // Misskey
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.pref.domain}/api/users/lists/list`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({ "i": this.pref.access_token })
                }).then(data => {
                    // リストを持っていない場合はreject
                    if (data.length == 0) return Promise.reject('empty')
                    return (async () => {
                        // リスト一覧を整形
                        const lists = []
                        data.forEach(l => lists.push({
                            "listname": l.name,
                            "id": l.id
                        }))
                        return lists
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
     * このアカウントがお気に入りに追加しているチャンネル一覧を取得する(Misskey専用)
     */
    getChannels() {
        return $.ajax({
            type: "POST",
            url: `https://${this.pref.domain}/api/channels/my-favorites`,
            dataType: "json",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ "i": this.pref.access_token })
        }).then(data => {
            // チャンネルをお気に入りしていない場合はreject
            if (data.length == 0) return Promise.reject('empty')
            return (async () => {
                // リスト一覧を整形
                const channels = []
                data.forEach(c => channels.push({
                    "name": c.name,
                    "id": c.id
                }))
                return channels
            })()
        })
    }

    /**
     * #Method #Ajax
     * このアカウントのチャンネル一覧キャッシュを取得する
     * キャッシュが取れていない場合は取得メソッドを呼び出す
     */
    async getChannelsCache() {
        // キャッシュがあればキャッシュを使用
        if (this.channels_cache) return this.channels_cache

        // キャッシュがない場合はキャッシュを取得して返す
        const channels = await this.getChannels()
        this.channels_cache = channels
        return channels
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
                // TODO: 認証解除方法がわからん！トークン渡してもアクセス拒否される
                /*
                $.ajax({
                    type: "POST",
                    url: `https://${this.pref.domain}/api/i/revoke-token`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        "i": this.pref.access_token,
                        "token": this.pref.access_token
                    })
                }).then(data => {
                    console.log(data)
                    callback()
                }).catch(jqXHR => console.log(jqXHR))//*/
                callback()
                break
            default:
                break
        }
    }

    /**
     * #StaticMethod
     * カスタム絵文字の使用履歴をキャッシュしてファイルに保存する
     */
    static cacheEmojiHistory() {
        const json_array = []
        // 履歴データをJSON化
        Account.each(elm => json_array.push({
            "address": elm.full_address,
            "emoji_history": elm.emoji_history,
            "reaction_history": elm.reaction_history
        }))
        window.accessApi.overwriteEmojiHistory(json_array)
        // 絵文字使用フラグをもとに戻す
        this.use_emoji_flg = false
    }

    /**
     * #Method
     * 引数のコードのカスタム絵文字を使用絵文字履歴に追加する
     * 
     * @param code 追加するカスタム絵文字
     */
    updateEmojiHistory(code) {
        // 絵文字履歴の更新を試行して、変更があったら一旦変更フラグを立てる
        this.use_emoji_flg = shiftArray(this.emoji_history, code.trim(), 9)
    }

    /**
     * #Method
     * 引数のコードのカスタム絵文字を使用リアクション履歴に追加する
     * 
     * @param code 追加するカスタム絵文字
     */
    updateReactionHistory(code) {
        // リアクション履歴の更新を試行して、変更があったら履歴ファイルを上書き
        if (!shiftArray(this.reaction_history, code.trim(), 20)) return
        Account.cacheEmojiHistory()
    }

    // Getter: 最近使用したカスタム絵文字を一覧で出力
    get recent_reaction_html() {
        let html = ''
        this.reaction_history.map(code => this.emojis.get(code)).forEach(emoji => html += `
            <a class="__on_emoji_reaction" name="${emoji.shortcode}"><img src="${emoji.url}" alt="${emoji.name}"/></a>
        `)
        return html
    }

    /**
     * #Method
     * このアカウントのサーバーのカスタム絵文字リストのDOMを生成して表示する
     */
    createEmojiList() {
        $("#pop_custom_emoji").html(`
            <div class="palette_block">
                <div class="emoji_head">
                    <h2>カスタム絵文字一覧</h2>
                    <h3>${this.pref.domain}</h3>
                </div>
                <input type="text" id="__txt_emoji_search" class="__ignore_keyborad"
                    placeholder="ショートコードを入力するとサジェストされます"/>
                <div class="recent_emoji">
                    <h5>最近使った絵文字</h5>
                </div>
                <div class="emoji_list">
                </div>
                <button type="button" id="__on_emoji_close" class="close_button">×</button>
            </div>
        `).show("slide", { direction: "left" }, 150)
        // 絵文字履歴を表示する
        this.emoji_history.map(code => this.emojis.get(code)).forEach(
            emoji => $("#pop_custom_emoji .recent_emoji").append(`
                <a class="__on_emoji_append" name="${emoji.shortcode}"><img src="${emoji.url}" alt="${emoji.name}"/></a>
            `))
        $("#pop_custom_emoji .emoji_head").css("background-color", `#${this.pref.acc_color}`)

        // 一度枠組みを表示してから非同期で絵文字一覧を動的に表示してく
        ;(async () => this.emojis.each(emoji => $("#pop_custom_emoji .emoji_list").append(`
            <a class="__on_emoji_append" name="${emoji.shortcode}"><img src="${emoji.url}" alt="${emoji.name}"/></a>
            `)))()
    }

    /**
     * #Method
     * このアカウントの投稿先メニューを生成する
     */
    async createPostToMenu() {
        if (this.platform == 'Mastodon') { // Mastodonの場合は無効化
            $("#__on_post_to_misskey").prop('disabled', true)
            $("#__on_post_to_misskey>img").attr({
                src: "resources/ic_mastodon.png",
                name: "__to_normal"
            })
            return
        }
        let html = ''
        try {
            const channels = await this.getChannelsCache()
            channels?.forEach(c => html += `
                <li><a name="${c.id}" class="__lnk_post_to to_channel">${c.name}</a></li>
            `)
        } catch (err) {
            console.log(err)
        }
        $("#pop_post_to>ul").html(html)
        $("#__on_post_to_misskey").prop('disabled', false)
        $("#__on_post_to_misskey>img").attr({
            src: "resources/ic_public.png",
            name: "__to_normal"
        })
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
        let html = ''
        Account.map.forEach((v, k) => html += `
            <li name="${k}" class="__lnk_account_elm"><div>
                <img src="${v.pref.avatar_url}" class="user_icon"/>
                <div class="display_name">${v.pref.username}</div>
                <div class="user_domain">${k}</div>
            </div></li>
        `)
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
                        <ul class="posts __context_posts"></ul>
                    </div>
                </div>
                <div class="user_bookmark_elm"></div>
                <div class="user_ff_elm"></div>
            </td>
        `)
        // 先に表示フレームだけ生成
        $("#pop_ex_timeline").html(`
            <div class="account_timeline auth_user">
                <table id="auth_account_table"><tbody>
                    <tr>${html}</tr>
                </tbody></table>
            </div>
            <div class="account_timeline single_user ff_pop_user">
            </div>
            <button type="button" id="__on_search_close" class="close_button">×</button>
        `).show("slide", { direction: "right" }, 150)
        $("#pop_ex_timeline .user_ff_elm").hide() // ff欄は最初は非表示

        Account.map.forEach((v, k) => v.getInfo().then(detail => {
            const column = $(`#pop_ex_timeline>.account_timeline td[id="${k}"]`)

            // ロード待ち画面を消してユーザー情報のプロフィール部分を生成
            column.find(".col_loading").remove()
            column.find(".profile_header").html(detail.header_element)
            column.find(".profile_detail").html(detail.profile_element)

            // ヘッダ部分にツールチップを生成
            $(`#pop_ex_timeline>.account_timeline td[id="${k}"] .auth_details`).tooltip({
                position: {
                    my: "center top",
                    at: "center bottom"
                },
                show: {
                    effect: "slideDown",
                    duration: 80
                },
                hide: {
                    effect: "slideUp",
                    duration: 80
                }
            })

            // ユーザーの投稿を取得
            detail.getPost(v, null).then(posts => createScrollLoader({
                // 最新投稿データはスクロールローダーを生成
                data: posts,
                target: column.find(".posts"),
                bind: (data, target) => {
                    data.forEach(p => target.append(p.element))
                    // max_idとして取得データの最終IDを指定
                    return data.pop().id
                },
                load: async max_id => detail.getPost(v, max_id)
            }))
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

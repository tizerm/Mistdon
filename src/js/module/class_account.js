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

    // 現在投稿対象になっているアカウント
    static CURRENT_ACCOUNT = null

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
     * 指定したホストを持つアカウントを返却する.
     * 
     * @param host 検索対象のホスト
     */
    static getByDomain(host) {
        return [...Account.map.values()].find(account => account.pref.domain == host) ?? null
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
     * #StaticMethod
     * アカウントデータが2つ以上存在する場合はtrueを返す
     */
    static isMultiAccount() {
        return Account.map.size > 1
    }

    /**
     * #Method
     * このアカウントを投稿先アカウントに設定
     */
    setPostAccount() {
        // 変わってなかったらなにもしない
        if ($("#header>#head_postarea .__lnk_postuser>img").attr('name') == this.full_address) return

        // アカウントを変えて追加投稿情報を消去
        Account.CURRENT_ACCOUNT = this
        $("#header>#head_postarea .__lnk_postuser>img").attr({
            src: this.pref.avatar_url,
            name: this.full_address
        })
        $(`#header>#post_options ul.account_list input.__chk_add_account`)
            .prop("checked", false).prop("disabled", false)
        $(`#header>#post_options ul.account_list input.__chk_add_account[value="${this.full_address}"]`)
            .prop("disabled", true)
        // Mastodonの場合はドライブ参照ボタンを無効化
        $(`#header>#post_options #__on_open_drive`).prop("disabled", this.platform == 'Mastodon')

        // 背景アイコンとアカウントカラーを設定
        $("#header>h1>.head_user").css('background-image',
            `url("resources/${this.platform == 'Mastodon' ? 'ic_mastodon.png' : 'ic_misskey.png'}"`
        ).text(`${this.pref.username} - ${this.full_address}`)
        $("#header>h1").css('background-color', `#${this.pref.acc_color}`)

        // 引用情報を削除
        deleteQuoteInfo()
        enabledAdditionalAccount(true)

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
        // 添付メディアがなくて何も書いてなかったら何もしない
        if (!arg.content && Media.ATTACH_MEDIA.size == 0) return

        // 各種投稿オプションパラメータを取得
        let visibility = arg.option_obj.find('input[name="__opt_visibility"]:checked').val()
        const cw_text = arg.option_obj.find('#__txt_content_warning').val()
        let post_to = arg.option_obj.find('#__cmb_post_to').val()
        let is_local = arg.option_obj.find('#__chk_local_only').prop('checked')
        const reply_id = arg.option_obj.find('#__hdn_reply_id').val()
        const quote_id = arg.option_obj.find('#__hdn_quote_id').val()
        const edit_id = arg.option_obj.find('#__hdn_edit_id').val()
        // 一個以上センシティブ設定があったらセンシティブ扱い
        const sensitive = arg.option_obj.find('.attached_media>ul.media_list input[type="checkbox"]:checked').length > 0
        // アンケートがある場合はアンケートのオブジェクトを生成
        let poll = null
        if (arg.option_obj.find('.poll_setting').is(':visible')
            && $(arg.option_obj.find('.__txt_poll_option').get(0)).val()) {
            const options = []
            arg.option_obj.find('.__txt_poll_option').each((index, elm) => options.push($(elm).val()))
            let expire_sec = Number(arg.option_obj.find('#__txt_poll_expire_time').val() || '0')
            switch (arg.option_obj.find('#__cmb_expire_unit').val()) {
                case 'min': // 分
                    expire_sec *= 60
                    break
                case 'hour': // 時間
                    expire_sec *= 3600
                    break
                case 'day': // 日
                    expire_sec *= 86400
                default:
                    break
            }
            poll = {
                options: options,
                expire_sec: expire_sec > 0 ? expire_sec : null
            }
        }

        if (!arg.multi_post) { // 追加ユーザーが存在する場合は追加で投稿処理を行う
            arg.multi_post = true // 再起実行されないようにフラグを立てる
            arg.option_obj.find('input.__chk_add_account:checked')
                .each((index, elm) => Account.get($(elm).val()).post(arg))
        } else { // 追加ユーザーからの投稿の場合は一部のパラメータをデフォルト値に書き換える
            post_to = this.pref.default_channel
            is_local = this.pref.default_local
        }

        let notification = null
        try { // 投稿ロジック全体をcatch
            const media_ids = []
            const thumbnails = arg.option_obj.find('.media_list>li:not(.__initial_message)').get()
            if (thumbnails.length > 0) { // 添付ファイルが存在する場合は先に添付ファイルをアップロードする
                // 非同期実行のことも考えてファイルマップをローカルにうつす
                const files_map = Media.ATTACH_MEDIA
                for (const elm of thumbnails) { // アップロードはひとつずつ順番に行う
                    const image = $(elm).find("img.__img_attach")
                    if (image.is(".media_from_drive")) // ドライブから参照した画像はそのまま属性からIDを取得
                        media_ids.push(image.attr("name"))
                    else { // アップロード待機ファイルはアップロードする
                        const media_id = await Media.uploadMedia(
                            this, files_map.get(image.attr("name")), $(elm).find('input[type="checkbox"]').prop("checked"))
                        media_ids.push(media_id)
                    }
                }
            }

            // 投稿処理に入る前にtoast表示
            notification = Notification.progress(`${this.full_address}から投稿中です...`)
            let request_param = null
            let response = null
            switch (this.pref.platform) {
                case 'Mastodon': // Mastodon
                    // 公開範囲を設定(Mastodonの場合フォロ限だけパラメータが違う)
                    if (visibility == 'followers') visibility = "private"
                    request_param = { // 通常投稿の場合
                        "status": arg.content,
                        "visibility": visibility,
                        "sensitive": sensitive
                    }
                    // CWがある場合はCWテキストも追加
                    if (cw_text) request_param.spoiler_text = cw_text
                    // リプライの場合はリプライ先ツートIDを設定
                    if (reply_id) request_param.in_reply_to_id = reply_id
                    // アンケートがある場合はアンケートを生成
                    if (poll) request_param.poll = {
                        "options": poll.options,
                        "expires_in": poll.expire_sec
                    }
                    // 添付メディアがある場合はメディアIDを追加
                    if (media_ids.length > 0) request_param.media_ids = media_ids

                    if (edit_id) response = await $.ajax({ // 編集APIを呼び出す
                        type: "PUT",
                        url: `https://${this.pref.domain}/api/v1/statuses/${edit_id}`,
                        dataType: "json",
                        headers: {
                            "Authorization": `Bearer ${this.pref.access_token}`,
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                        },
                        data: request_param
                    }); else response = await $.ajax({ // 投稿APIを呼び出し
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
                    switch (visibility) { // 公開範囲を設定(Misskeyの場合ホームとダイレクトのパラメータが違う)
                        case 'unlisted': // ホーム
                            visibility = "home"
                            break
                        case 'direct': // DM
                            visibility = "specified"
                            break
                        default:
                            break
                    }
                    request_param = {
                        "i": this.pref.access_token,
                        "text": arg.content,
                        "visibility": visibility
                    }
                    // CWがある場合はCWテキストも追加
                    if (cw_text) request_param.cw = cw_text
                     // アンケートがある場合はアンケートを生成
                    if (poll) request_param.poll = {
                        "choices": poll.options,
                        "expiredAfter": poll.expire_sec * 1000
                    }
                    // リプライの場合はリプライ先ノートIDを設定
                    if (reply_id) request_param.replyId = reply_id
                    // 引用の場合は引用ノートIDを設定
                    if (quote_id) request_param.renoteId = quote_id
                    // 添付メディアがある場合はメディアIDを追加
                    if (media_ids.length > 0) request_param.mediaIds = media_ids
                    // 投稿先を設定
                    if (post_to && post_to != '__default') { // チャンネル
                        request_param.localOnly = true
                        request_param.channelId = post_to
                    } else // 通常投稿
                        request_param.localOnly = is_local

                    response = await $.ajax({ // API呼び出し
                        type: "POST",
                        url: `https://${this.pref.domain}/api/notes/create`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(request_param)
                    })
                    response = response.createdNote
                    break
                default:
                    break
            }

            // 投稿を履歴にスタックする
            new Status(response, History.HISTORY_PREF_TIMELINE, this).pushStack(arg.content)
            // 投稿成功時(コールバック関数実行)
            arg.success()
            notification.done(`${this.full_address}から投稿しました.`)

            // 絵文字を使っていたら投稿時に履歴を保存
            if (this.use_emoji_flg) Account.cacheEmojiHistory()
        } catch (err) { // 投稿失敗時
            console.log(err)
            notification.error(`${this.full_address}からの投稿に失敗しました.`)
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントからブースト/リノート/お気に入り処理を実行
     * 
     * @param arg パラメータオブジェクト
     */
    async reaction(arg) {
        let response = null
        let target_post = null
        const notification = Notification.progress("対象の投稿を取得中です...")
        try { // ターゲットの投稿データを取得
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({ // 検索から投稿を取得
                        type: "GET",
                        url: `https://${this.pref.domain}/api/v2/search`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${this.pref.access_token}` },
                        data: {
                            "q": arg.target_url,
                            "type": "statuses",
                            "resolve": true
                        }
                    })
                    response = response.statuses[0]
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.pref.domain}/api/ap/show`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            "i": this.pref.access_token,
                            "uri": arg.target_url
                        })
                    })
                    response = response.object
                    break
                default:
                    break
            }
            // 取得できなかったらなにもしない
            if (!response) throw new Error('response is empty.')
            // 取得できた場合はtarget_jsonからStatusインスタンスを生成
            target_post = new Status(response, History.HISTORY_PREF_TIMELINE, this)
        } catch (err) {
            console.log(err)
            notification.error("投稿の取得でエラーが発生しました.")
            return
        }

        switch (this.platform) {
            case 'Mastodon': // Mastodon
                switch (arg.target_mode) {
                    case '__menu_reply': // リプライ
                        target_post.createReplyWindow()
                        notification.done()
                        break
                    case '__menu_reblog': // ブースト
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/reblog`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => {
                            History.pushActivity(target_post, 'reblog')
                            notification.done("投稿をブーストしました.")
                        }).catch(jqXHR => notification.error("ブーストに失敗しました."))
                        break
                    case '__menu_favorite': // お気に入り
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/favourite`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => {
                            History.pushActivity(target_post, 'favorite')
                            notification.done("投稿をお気に入りしました.")
                        }).catch(jqXHR => notification.error("お気に入りに失敗しました."))
                        break
                    case '__menu_bookmark': // ブックマーク
                        $.ajax({
                            type: "POST",
                            url: `https://${this.pref.domain}/api/v1/statuses/${target_post.id}/bookmark`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                        }).then(data => {
                            History.pushActivity(target_post, 'bookmark')
                            notification.done("投稿をブックマークしました.")
                        }).catch(jqXHR => notification.error("ブックマークに失敗しました."))
                        break
                    default:
                        break
                }
                break
            case 'Misskey': // Misskey
                switch (arg.target_mode) {
                    case '__menu_reply': // リプライ
                        target_post.createReplyWindow()
                        notification.done()
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
                        }).then(data => {
                            History.pushActivity(target_post, 'reblog', data.createdNote.id)
                            notification.done("投稿をリノートしました.")
                        }).catch(jqXHR => notification.error("リノートに失敗しました."))
                        break
                    case '__menu_quote': // 引用
                        target_post.createQuoteWindow()
                        notification.done()
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
                        }).then(data => {
                            History.pushActivity(target_post, 'favorite')
                            notification.done("投稿をお気に入りしました.")
                        }).catch(jqXHR => notification.error("お気に入りに失敗しました."))
                        break
                    case '__menu_reaction': // リアクション
                        target_post.createReactionWindow()
                        notification.done()
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
     * 公開範囲や連合設定をしてリノートする.
     * 
     * @param url リノート対象の投稿URL
     * @param option リノート設定
     */
    async renote(url, option) {
        let response = null
        let target_post = null
        const notification = Notification.progress("対象の投稿を取得中です...")
        try { // ターゲットの投稿データを取得
            response = await $.ajax({
                type: "POST",
                url: `https://${this.pref.domain}/api/ap/show`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    "i": this.pref.access_token,
                    "uri": url
                })
            })
            response = response.object
            // 取得できなかったらなにもしない
            if (!response) throw new Error('response is empty.')
            // 取得できた場合はtarget_jsonからStatusインスタンスを生成
            target_post = new Status(response, History.HISTORY_PREF_TIMELINE, this)
        } catch (err) {
            console.log(err)
            notification.error("投稿の取得でエラーが発生しました.")
            return
        }

        // リノートパラメータを設定
        let request_param = {
            "i": this.pref.access_token,
            "renoteId": target_post.id
        }
        switch (option) {
            case 'local': // ローカルへリノート
                request_param.localOnly = true
                break
            case 'home': // ホームへリノート
                request_param.visibility = "home"
                break
            default: // チャンネルへリノート
                request_param.localOnly = true
                request_param.channelId = option
                break
        }

        $.ajax({
            type: "POST",
            url: `https://${this.pref.domain}/api/notes/create`,
            dataType: "json",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(request_param)
        }).then(data => {
            History.pushActivity(target_post, 'reblog', data.createdNote.id)
            notification.done("投稿をリノートしました.")
        }).catch(jqXHR => notification.error("リノートに失敗しました."))
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントからリアクションを送信する(Misskey専用機能)
     * 
     * @param arg パラメータオブジェクト
     */
    async sendReaction(arg) {
        const notification = Notification.progress("リアクションを送信しています...")
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
            notification.done("リアクションを送信しました.")
        }).catch(jqXHR => notification.error("リアクションに失敗しました."))
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントからユーザーに対するフォロー/ミュート/ブロックを実行する
     * 
     * @param arg パラメータオブジェクト
     */
    async userAction(arg) {
        let response = null
        let target_user_id = null
        const notification = Notification.progress("対象ユーザーを取得中です...")
        try { // ターゲットのユーザーデータを取得
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({ // 検索から投稿を取得
                        type: "GET",
                        url: `https://${this.pref.domain}/api/v2/search`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${this.pref.access_token}` },
                        data: {
                            "q": arg.target_user,
                            "type": "accounts",
                            "resolve": true
                        }
                    })
                    response = response.accounts[0]
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.pref.domain}/api/users/show`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            "i": this.pref.access_token,
                            "username": arg.target_user.substring(1, arg.target_user.lastIndexOf('@')),
                            "host": arg.target_user.substring(arg.target_user.lastIndexOf('@') + 1)
                        })
                    })
                    break
                default:
                    break
            }
            // 取得できなかったらなにもしない
            if (!response) throw new Error('response is empty.')
            target_user_id = response.id
        } catch (err) {
            console.log(err)
            notification.error("ユーザーの取得でエラーが発生しました.")
            return
        }

        // 一旦toastを消去
        notification.done()
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
                                    url: `https://${this.pref.domain}/api/v1/accounts/${target_user_id}/follow`,
                                    dataType: "json",
                                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                                }).then(data => notification.done(`${arg.target_user}をフォローしました.`))
                                    .catch(jqXHR => notification.error("フォローに失敗しました."))
                                break
                            case 'Misskey': // Misskey
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/following/create`,
                                    dataType: "json",
                                    headers: { "Content-Type": "application/json" },
                                    data: JSON.stringify({
                                        "i": this.pref.access_token,
                                        "userId": target_user_id
                                    })
                                }).then(data => notification.done(`${arg.target_user}をフォローしました.`))
                                    .catch(jqXHR => notification.error("フォローに失敗しました."))
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
                                    url: `https://${this.pref.domain}/api/v1/accounts/${target_user_id}/mute`,
                                    dataType: "json",
                                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                                }).then(data => notification.done(`${arg.target_user}をミュートしました.`))
                                    .catch(jqXHR => notification.error("ミュートに失敗しました."))
                                break
                            case 'Misskey': // Misskey
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/mute/create`,
                                    dataType: "json",
                                    headers: { "Content-Type": "application/json" },
                                    data: JSON.stringify({
                                        "i": this.pref.access_token,
                                        "userId": target_user_id
                                    })
                                }).then(data => notification.done(`${arg.target_user}をミュートしました.`))
                                    .catch(jqXHR => notification.error("ミュートに失敗しました."))
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
                                    url: `https://${this.pref.domain}/api/v1/accounts/${target_user_id}/block`,
                                    dataType: "json",
                                    headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                                }).then(data => notification.done(`${arg.target_user}をブロックしました.`))
                                    .catch(jqXHR => notification.error("ブロックに失敗しました."))
                                break
                            case 'Misskey': // Misskey
                                $.ajax({
                                    type: "POST",
                                    url: `https://${this.pref.domain}/api/blocking/create`,
                                    dataType: "json",
                                    headers: { "Content-Type": "application/json" },
                                    data: JSON.stringify({
                                        "i": this.pref.access_token,
                                        "userId": target_user_id
                                    })
                                }).then(data => notification.done(`${arg.target_user}をブロックしました.`))
                                    .catch(jqXHR => notification.error("ブロックに失敗しました."))
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
            accept: () => post.delete()
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
            Notification.error(`${this.full_address}で接続エラーが発生しました、再接続してください。`)
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
            const acitr = Account.map.values()
            for (const account of acitr) {
                if (!account.emojis) {
                    cache_flg = false
                    break
                }
            }
            if (cache_flg) return // キャッシュが取れてる場合はなにもしない
        }
        const notification = Notification.progress("カスタム絵文字のキャッシュを更新します...")
        // サーバーのカスタム絵文字一覧を取得してファイルに書き込む
        const write_promises = []
        Account.map.forEach((v, k) => write_promises.push(v.getCustomEmojis()
            .then(data => { return window.accessApi.writeCustomEmojis(data) })
            .catch(jqXHR => { // カスタム絵文字の取得に失敗した場合は空のキャッシュデータを作成
                console.log(jqXHR)
                Notification.error(`${v.pref.domain}のカスタム絵文字の取得に失敗しました。
                    空のキャッシュデータを作成します。`)
                return window.accessApi.writeCustomEmojis({
                    "host": v.pref.domain,
                    "emojis": []
                })
            })
        ))
        // すべて書き込み終わったら通知toastを出してキャッシュを更新
        Promise.all(write_promises).then(() => {
            notification.done("カスタム絵文字のキャッシュが完了しました.")
            Emojis.readCache()
        })
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントのサーバーの持っているカスタム絵文字を取得する
     */
    async getCustomEmojis() {
        let response = null
        let emojis = []
        try {
            switch (this.pref.platform) {
                case 'Mastodon': // Mastodon
                    // カスタム絵文字を取得して整形するプロセスをpromiseとして返却
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${this.pref.domain}/api/v1/custom_emojis`,
                        dataType: "json"
                    })
                    response.forEach(e => emojis.push({
                        "name": e.shortcode,
                        "shortcode": `:${e.shortcode}:`,
                        "url": e.url
                    }))
                    break
                case 'Misskey': // Misskey
                    // v11以下と最新で絵文字を取得するエンドポイントが違うので動いたやつで取得
                    response = await Promise.any([
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
                    ])
                    response.forEach(e => emojis.push({
                        "name": e.aliases[0],
                        "shortcode": `:${e.name}:`,
                        "url": e.url
                    }))
                    break
                default:
                    break
            }
            return {
                "host": this.pref.domain,
                "emojis": emojis
            }
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントの最新情報を取得する
     */
    async getInfo() {
        let response = null
        try {
            switch (this.pref.platform) {
                case 'Mastodon': // Mastodon
                    // 認証アカウントの情報を取得
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${this.pref.domain}/api/v1/accounts/verify_credentials`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                    })
                    break
                case 'Misskey': // Misskey
                    // 認証アカウントの情報を取得
                    response = await $.ajax({
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
            return new User({ // Userクラスにして返却
                json: response,
                host: this.pref.domain,
                remote: true,
                auth: true,
                platform: this.pref.platform
            })
        } catch (err) { // 失敗したらnullを返す
            console.log(err)
            Notification.error(`${this.full_address}の最新情報の取得に失敗しました.`)
            return null
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントのホストインスタンスを取得する.
     */
    async getInstance() {
        return await Instance.get(this.pref.domain)
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントが作成したリストの一覧を取得する
     */
    async getLists() {
        let response = null
        let lists = []
        try {
            switch (this.pref.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${this.pref.domain}/api/v1/lists`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${this.pref.access_token}` }
                    })
                    // リストを持っていない場合はreject
                    if (response.length == 0) return Promise.reject('empty')
                    response.forEach(l => lists.push({
                        "listname": l.title,
                        "id": l.id
                    }))
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.pref.domain}/api/users/lists/list`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ "i": this.pref.access_token })
                    })
                    // リストを持っていない場合はreject
                    if (response.length == 0) return Promise.reject('empty')
                    response.forEach(l => lists.push({
                        "listname": l.name,
                        "id": l.id
                    }))
                    break
                default:
                    break
            }
            return lists
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントがお気に入りに追加しているチャンネル一覧を取得する(Misskey専用)
     */
    async getChannels() {
        try {
            const response = await $.ajax({
                type: "POST",
                url: `https://${this.pref.domain}/api/channels/my-favorites`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ "i": this.pref.access_token })
            })
            // チャンネルをお気に入りしていない場合はreject
            if (response.length == 0) return Promise.reject('empty')
            const channels = []
            response.forEach(c => channels.push({
                "name": c.name,
                "id": c.id
            }))
            return channels
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このアカウントが作成したクリップ一覧を取得する(Misskey専用)
     */
    async getClips() {
        try {
            const response = await $.ajax({
                type: "POST",
                url: `https://${this.pref.domain}/api/clips/list`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ "i": this.pref.access_token })
            })
            // チャンネルをお気に入りしていない場合はreject
            const clips = []
            response.forEach(c => clips.push(new Clip(c, this)))
            return clips
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
        }
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
     * (Misskeyはサードパーティアプリから認証解除ができないためMastodon限定です)
     */
    async unauthorize() {
        let response = null
        try { // 認証解除プロセスを実行
            switch (this.pref.platform) {
                case 'Mastodon': // Mastodon
                    // 認証解除プロセスに成功したらコールバック関数を実行
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.pref.domain}/oauth/revoke`,
                        dataType: "json",
                        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                        data: {
                            "client_id": this.pref.client_id,
                            "client_secret": this.pref.client_secret,
                            "token": this.pref.access_token
                        }
                    })
                    break
                case 'Misskey': // Misskey
                    // Misskeyは認証解除に非対応です
                    break
                default:
                    break
            }
            console.log(response)
            return Promise.resolve(response)
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
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
        if (!shiftArray(this.reaction_history, code.trim(),
            Number(Preference.GENERAL_PREFERENCE.reaction_history_limit))) return
        Account.cacheEmojiHistory()
    }

    // Getter: 最近使用したカスタム絵文字を一覧で出力
    get recent_reaction_html() {
        let html = ''
        this.reaction_history.map(code => this.emojis.get(code)).filter(f => f).forEach(emoji => html += `
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
        `).show(...Preference.getAnimation("SLIDE_LEFT"))
        // 絵文字履歴を表示する
        this.emoji_history.map(code => this.emojis.get(code)).filter(f => f).forEach(
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
            $("#__cmb_post_to").prop('disabled', true).html(`
                <option value="__default">(使用しません)</option>
            `)
            $("#__chk_local_only").prop('disabled', true)
            return
        }
        try {
            const channels = await this.getChannelsCache()
            let html = '<option value="__default">通常タイムラインへ投稿</option>'
            channels?.forEach(c => html /* デフォルトのチャンネルがある場合は初期選択 */ += `
                <option value="${c.id}"${this.pref.default_channel == c.id ? ' selected' : ''}>${c.name}</option>
            `)

            // チャンネル情報を取得している最中に別のアカウントに変わっていたら何もしない
            if ($("#header>#head_postarea .__lnk_postuser>img").attr('name') != this.full_address) return
            // チャンネルコンボボックスを生成
            $("#__cmb_post_to").prop('disabled', false).html(html)
        } catch (err) {
            console.log(err)

            // チャンネル情報を取得している最中に別のアカウントに変わっていたら何もしない
            if ($("#header>#head_postarea .__lnk_postuser>img").attr('name') != this.full_address) return
            // お気に入りのチャンネルがない場合は無効化
            $("#__cmb_post_to").prop('disabled', true).html(`
                <option value="__default">(${err == 'empty' ? 'チャンネルがありません' : '取得できませんでした'})</option>
            `)
        }
        // ローカル(連合なし)の初期設定もする
        $("#__chk_local_only").prop('disabled', false).prop('checked', this.pref.default_local)
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
     * 追加投稿アカウントを選択するチェックフォームのDOMを返却
     */
    static createAdditionalPostAccountList() {
        let html = ''
        Account.map.forEach((v, k) => html += `<li>
            <input type="checkbox" id="__chk_${k}" name="__chk_add_account" class="__chk_add_account" value="${k}"/>
            <label for="__chk_${k}" title="${k}"><img
                src="${v.pref.avatar_url}" class="user_icon"/><div class="check_mask"></div></label>
        </li>`)

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
     * 範囲指定リノートのメニュー項目のDOMを返却
     */
    static async createContextLimitedRenoteList() {
        let html = ''
        const acitr = Account.map.values()
        for (const account of acitr) {
            // Misskey以外は無視
            if (account.platform != 'Misskey') continue
            let channel_html = ''
            try {
                const channels = await account.getChannels()
                channel_html += '<ul class="__renote_send_channel">'
                channels?.forEach(ch => channel_html += `<li name="${ch.id}"><div>${ch.name}</div></li>`)
                channel_html += '</ul>'
            } catch (err) {
                console.log(err)
            }
            html += `<li>
                <div>${account.pref.username} - ${account.full_address}</div>
                <ul class="__limited_renote_send" name="${account.full_address}">
                    <li class="__renote_send_local"><div>ローカルへリノート</div></li>
                    <li class="__renote_send_home"><div>ホームへリノート</div></li>
                    <li class="${channel_html ? 'channel_menu' : 'ui-state-disabled'}">
                        <div>チャンネルへリノート</div>
                        ${channel_html}
                    </li>
                </ul>
            </li>`
        }
        return html
    }

    /**
     * #StaticMethod
     * アカウント認証画面のアカウントリストのDOMを返却
     */
    static async createAccountPrefList() {
        let html = ''
        const acitr = Account.map.values()
        for (const account of acitr) {
            let misskey_elm = ''
            let unauth_button_label = '認証解除'
            if (account.pref.platform == 'Misskey') { // Misskeyの場合の特殊設定
                unauth_button_label = '認証情報削除'
                misskey_elm /* 連合なし設定 */ += `
                    <li>
                        <input type="checkbox" id="dl_${account.full_address}"
                            class="__chk_default_local"${account.pref.default_local ? ' checked' : ''}/>
                        <label for="dl_${account.full_address}">ローカルをデフォルト</label><br/>
                    </li>
                `
                try {
                    const channels = await account.getChannels()
                    misskey_elm /* デフォルトチャンネル設定 */ += `
                        <li>
                            デフォルトの投稿先(チャンネル):<br/>
                            <select class="__cmb_default_channel">
                                <option value="__default">通常投稿</option>
                    `
                    channels?.forEach(ch => misskey_elm += `<option
                        value="${ch.id}"${ch.id == account.pref.default_channel ? ' selected' : ''}>${ch.name}</option>`)
                    misskey_elm += '</select></li>'
                } catch (err) {
                    console.log(err)
                }
            }
            html += `
                <li class="ui-sortable account_box" name="${account.full_address}">
                    <h3>${account.pref.domain}</h3>
                    <div class="user">
                        <img src="${account.pref.avatar_url}" class="usericon"/>
                        <h4 class="username">${account.pref.username}</h4>
                        <div class="userid">${account.full_address}</div>
                    </div>
                    <ul class="option">
                        <li>
                            アカウントカラー: #<input type="text"
                            class="__txt_acc_color __pull_color_palette" value="${account.pref.acc_color}" size="6"/>
                        </li>
                        ${misskey_elm}
                        <li>
                            カスタム絵文字キャッシュ: ${account.emojis ? '◯' : '×'}
                        </li>
                    </ul>
                    <div class="foot_button">
                        <button type="button" class="__btn_unauth_acc">${unauth_button_label}</button>
                    </div>
                </li>
            `
        }
        return html
    }

    /**
     * #StaticMethod
     * アカウントのプロフィール一覧を生成するDOMを返却
     */
    static createProfileTimeline() {
        // 先に表示フレームだけ生成
        const template_html = [...Account.map.keys()]
            .map(address => User.createDetailHtml(address)).reduce((rs, el) => rs + el, '')
        $("#pop_ex_timeline").html(`
            <div class="account_timeline auth_user">
                <table id="auth_account_table"><tbody>
                    <tr>${template_html}</tr>
                </tbody></table>
            </div>
            <button type="button" id="__on_search_close" class="close_button">×</button>
        `).show(...Preference.getAnimation("WINDOW_FOLD"))

        // それぞれのアカウントのユーザー情報を取得してバインド
        Account.each(account => account.getInfo().then(user => {
            user.addProfileUniqueId()
            user.bindDetail()
        }))
    }
}

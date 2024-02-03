/**
 * #Class
 * インスタンス情報を保持するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Instance {
    // コンストラクタ: パラメータを使って初期化(ファイルとJSON両対応)
    constructor(data) {
        this.platform = data.platform
        this.host = data.host
        console.log(data)
        switch (data.platform) {
            case 'Mastodon': // Mastodon
                this.name = data.json.title
                this.description = data.json.description
                this.about = data.json.short_description
                this.header_url = data.json.thumbnail.url
                // TODO: 管理人のアカウントについては一旦考えないことにする
                //this.admin_user = data.json.contact_account.acct
                //this.total_user = data.json.stats.user_count
                this.version = data.json.version

                // サーバー設定
                this.post_maxlength = data.json.configuration.statuses.max_characters
                this.characters_reserved_per_url = data.json.configuration.statuses.characters_reserved_per_url
                if (data.detail) {
                    this.description = data.detail.description.content
                }
                break
            case 'Misskey': // Misskey
                this.name = data.json.name
                this.description = data.json.description
                this.about = data.json.description
                this.header_url = data.json.bannerUrl
                this.version = data.json.version

                // サーバー設定
                this.post_maxlength = data.json.maxNoteTextLength
                break
            default:
                break
        }
    }

    // 認証対象インスタンスを設定
    static AUTH_INSTANCE = null

    /**
     * #StaticMethod
     * ホストドメインからインスタンス情報を格納したこのクラスのオブジェクトを返す
     * 
     * @param host インスタンスのホストドメイン
     */
    static async get(host) {
        try { // ドメインからプラットフォーム判定ができないので成功したやつだけ返す
            const instance = await Promise.any([
                $.ajax({ // Mastodon(v4.x.x以上)
                    type: "GET",
                    url: `https://${host}/api/v2/instance`,
                    dataType: "json"
                }).then(data => {
                    return {
                        "platform": 'Mastodon',
                        "host": host,
                        "json": data
                    }
                }),
                $.ajax({ // Misskey
                    type: "POST",
                    url: `https://${host}/api/meta`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({ detail: true })
                }).then(data => {
                    return {
                        "platform": 'Misskey',
                        "host": host,
                        "json": data
                    }
                }),
                $.ajax({ // Mastodon(v3.x.x以下)
                    type: "GET",
                    url: `https://${host}/api/v1/instance`,
                    dataType: "json"
                }).then(data => {
                    return {
                        "platform": 'Mastodon',
                        "host": host,
                        "json": data
                    }
                })
            ])
            // インスタンス情報が取得できた場合はインスタンスを生成して返却
            return new Instance(instance)
        } catch (err) { // インスタンスにアクセスできなかった場合はnullを返却
            console.log(err)
            return null
        }
    }

    static async getDetail(host, platform) {
        let response = null
        let instance_param = null
        try {
            switch (platform) {
                case 'Mastodon': // Mastodon
                    response = await Promise.all([
                        $.ajax({ // インスタンス基本情報
                            type: "GET",
                            url: `https://${host}/api/v2/instance`,
                            dataType: "json"
                        }), $.ajax({ // 詳しい説明文
                            type: "GET",
                            url: `https://${host}/api/v1/instance/extended_description`,
                            dataType: "json"
                        }), $.ajax({ // 週間活動情報
                            type: "GET",
                            url: `https://${host}/api/v1/instance/activity`,
                            dataType: "json"
                        })
                    ])
                    instance_param = {
                        "platform": 'Mastodon',
                        "host": host,
                        "json": response[0],
                        "detail": {
                            "description": response[1],
                            "activity": response[2]
                        }
                    }
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${host}/api/meta`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ detail: true })
                    }).then(data => {
                        return {
                            "platform": 'Misskey',
                            "host": host,
                            "json": data
                        }
                    })
                    instance_param = {
                        "platform": 'Misskey',
                        "host": host,
                        "json": response
                    }
                    break
                default:
                    break
            }
            return new Instance(instance_param)
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
        }
    }

    async authorize() {
        let permission = null
        try {
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    // 権限を設定
                    permission = ["read", "write", "follow", "push"].join(" ")
                    // クライアントIDの取得
                    const client_info = await $.ajax({
                        type: "POST",
                        url: `https://${this.host}/api/v1/apps`,
                        dataType: "json",
                        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                        data: {
                            "client_name": "Mistdon",
                            "redirect_uris": "urn:ietf:wg:oauth:2.0:oob",
                            "scopes": permission,
                            "website": "https://github.com/tizerm/Mistdon"
                        }
                    })

                    // 認証に成功したらクライアントIDを保存して外部ブラウザで認証画面を開く
                    this.__auth_client_id = client_info.client_id
                    this.__auth_client_secret = client_info.client_secret
                    window.accessApi.openExternalBrowser(`https://${this.host}/oauth/authorize?client_id=${client_info.client_id}&scope=${encodeURIComponent(permission)}&response_type=code&redirect_uri=urn:ietf:wg:oauth:2.0:oob`)
                    return {
                        platform: this.platform,
                        client_id: client_info.client_id,
                        client_secret: client_info.client_secret
                    }
                case 'Misskey': // Misskey
                    // 権限を設定
                    permission = ["read:account", "read:notes", "write:notes", "write:blocks",
                        "read:drive", "write:drive", "read:favorites", "write:favorites",
                        "read:following", "write:following", "write:mutes", "read:notifications",
                        "read:reactions", "write:reactions", "write:votes",
                        "read:channels", "write:channels"]
                    // サーバーにアプリ登録
                    const app = await $.ajax({
                        type: "POST",
                        url: `https://${this.host}/api/app/create`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            'name': 'Mistdon',
                            'description': 'This is Electron base Mastodon and Misskey client.',
                            'permission': permission
                        })
                    })

                    // 正常にアプリ登録できたら認証セッションを開始
                    this.__auth_app_secret = app.secret
                    const response = await $.ajax({
                        type: "POST",
                        url: `https://${this.host}/api/auth/session/generate`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ 'appSecret': app.secret })
                    })

                    // responseが返ってきたら認証ウィンドウを生成
                    this.__auth_app_token = response.token
                    window.accessApi.openExternalBrowser(response.url)
                    return {
                        platform: this.platform,
                        app_secret: app.secret,
                        app_token: response.token
                    }
                default:
                    break
            }
        } catch (err) { // 認証失敗時
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "認証リクエスト実行中に問題が発生しました。"
            })
            return Promise.reject(err)
        }
    }

    async saveTokenMastodon(auth_code) {
        const client_id = this.__auth_client_id
        const client_secret = this.__auth_client_secret

        try { // OAuth認証
            const token = await $.ajax({
                type: "POST",
                url: `https://${this.host}/oauth/token`,
                dataType: "json",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                data: {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": "urn:ietf:wg:oauth:2.0:oob",
                    "grant_type": "authorization_code",
                    "code": auth_code
                }
            })

            // 認証に成功した場合そのアクセストークンを使って認証アカウントの情報を取得(Promise返却)
            const user_data = await $.ajax({
                type: "GET",
                url: `https://${this.host}/api/v1/accounts/verify_credentials`,
                dataType: "json",
                headers: { "Authorization": `Bearer ${token.access_token}` }
            })

            // アカウント情報の取得に成功した場合はユーザー情報とアクセストークンを保存
            await window.accessApi.writePrefMstdAccs({
                'domain': this.host,
                'user_id': user_data.username,
                'username': user_data.display_name,
                "client_id": client_id,
                "client_secret": client_secret,
                'access_token': token.access_token,
                'post_maxlength': this.post_maxlength,
                'avatar_url': user_data.avatar
            })
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "アカウントの認証に成功しました！",
                // OKボタンを押してから画面をリロード
                accept: () => location.reload()
            })
        } catch (err) { // 認証失敗時
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "認証リクエスト実行中に問題が発生しました。"
            })
            return Promise.reject(err)
        }
    }

    async saveTokenMisskey() {
        const app_secret = this.__auth_app_secret
        const app_token = this.__auth_app_token

        try { // アクセストークンの取得
            const token = await $.ajax({
                type: "POST",
                url: `https://${this.host}/api/auth/session/userkey`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    'appSecret': app_secret,
                    'token': app_token
                })
            })

            // responseが返ってきたらアクセストークンをメインプロセスに渡す
            await window.accessApi.writePrefMskyAccs({
                'domain': this.host,
                'user': token.user,
                'app_secret': app_secret,
                'app_token': app_token,
                'access_token': token.accessToken,
                'post_maxlength': this.post_maxlength
            })
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "アカウントの認証に成功しました！",
                // OKボタンを押してから画面をリロード
                accept: () => location.reload()
            })
        } catch (err) { // 認証失敗時
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "認証リクエスト実行中に問題が発生しました。"
            })
            return Promise.reject(err)
        }
    }

    // Getter: インスタンスヘッダのDOMを返却
    get header_element() {
        let target_emojis = null
        let html /* name属性にURLを設定 */ = `
            <li class="header_instanceinfo">
                <div class="label_head header_image">
                    <span>&nbsp;</span>
                </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        //target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        html /* ユーザーアカウント情報 */ += '<div class="info">'
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                html += '<img src="resources/ic_mastodon.png" class="instance_icon"/>'
                break
            case 'Misskey': // Misskey
                html += '<img src="resources/ic_misskey.png" class="instance_icon"/>'
                break
            default:
                break
        }
        html += `
                <h4 class="instance_name">${this.name}</h4>
                <a href="https://${this.host}/" class="instance_link __lnk_external">https://${this.host}/</a>
            </div>
            <div class="detail_info">
                <span class="count_user counter label_usercount" title="総人口">${this.count_post}</span>
                <span class="count_active counter label_activecount" title="アクティブユーザー数">${this.count_post}</span>
            </div></li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.header_image') // ヘッダ画像を縮小表示して表示
            .css('background-image', `url("${this.header_url}")`)
            .css('background-size', '360px auto')
            .css('background-position', 'center center')
        return jqelm
    }

    // Getter: プロフィール本体のDOMを返却
    get description_element() {
        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(`
            <li class="detail_instanceinfo">
                <div class="content">
                    <div class="main_content">${this.description}</div>
                </div>
            </li>
            <li class="detail_version">
                ${this.platform} - ${this.version}
            </li>
        `))
        return jqelm
    }

    createDetailHtml(bind_selector) {
        $(bind_selector).html(`
            <ul class="instance_header"></ul>
            <ul class="instance_detail"></ul>
            <ul class="instance_admin"></ul>
        `).find(".col_loading").remove()
        $(bind_selector).find(".instance_header").html(this.header_element)
        $(bind_selector).find(".instance_detail").html(this.description_element)
    }

    static async showInstanceName(domain, target) {
        if (!domain) { // 空の場合はメッセージを初期化
            target.text("(URLを入力してください)")
            return null
        }
        // ロード待ち画面を生成
        target.html("&nbsp;").css('background-image', 'url("resources/illust/ani_wait.png")')

        // インスタンス情報を取得
        const instance = await Instance.get(domain)

        target.css('background-image', 'none')
        if (!instance) { // 不正なインスタンスの場合はエラーメッセージを表示
            target.text("!不正なインスタンスです!")
            return null
        }

        // インスタンス名をセット
        let img = null
        switch (instance.platform) {
            case 'Mastodon': // Mastodon
                img = '<img src="resources/ic_mastodon.png" class="inline_emoji"/>'
                break
            case 'Misskey': // Misskey
                img = '<img src="resources/ic_misskey.png" class="inline_emoji"/>'
                break
            default:
                break
        }
        target.html(`${img} ${instance.name}`)

        // 生成したインスタンスを返却
        return instance
    }
}


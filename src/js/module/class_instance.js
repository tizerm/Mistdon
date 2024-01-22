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
        console.log(data.json)
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
                break
            case 'Misskey': // Misskey
                this.name = data.json.name
                this.description = data.json.description
                this.about = data.json.description
                this.header_url = data.json.bannerUrl
                this.version = data.json.version
                break
            default:
                break
        }
    }

    /**
     * #StaticMethod
     * ホストドメインからインスタンス情報を格納したこのクラスのオブジェクトを返す
     * 
     * @param host インスタンスのホストドメイン
     */
    static async get(host) {
        // ドメインからプラットフォーム判定ができないので成功したやつだけ返す
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
        ]).catch(jqXHR => { // 取得に失敗した場合はnullを返却
            console.log('!ERR: invalid server.')
            return null
        })

        // インスタンス情報が取得できた場合はインスタンスを生成して返却
        if (instance) return new Instance(instance)
        else null
    }

    static async getDetail(host, platform) {
        let instance_promise = null
        switch (platform) {
            case 'Mastodon': // Mastodon
                instance_promise = Promise.all([
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
                ]).then(datas => {
                    return {
                        "json": datas[0],
                        "detail": {
                            "description": datas[1],
                            "activity": datas[2]
                        }
                    }
                })
                break
            case 'Misskey': // Misskey
                instance_promise = $.ajax({
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
                break
            default:
                break
        }
        return new Instance(await instance_promise)
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


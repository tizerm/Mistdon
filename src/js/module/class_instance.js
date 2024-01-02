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
                this.header_url = data.json.thumbnail
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


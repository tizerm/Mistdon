/**
 * #Class
 * カスタム絵文字を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Emojis {
    // コンストラクタ: パラメータを使って初期化(ファイルとJSON両対応)
    // TODO: とりあえず投稿に付随する絵文字だけ
    constructor(arg) {
        this.host = arg.host ?? null
        if (arg.cache_flg) {
            // キャッシュフラグがON: アカウントから参照するサーバーのカスタム絵文字(リストではなくMap)
            const emoji_map = new Map()
            arg.emojis?.forEach(e => emoji_map.set(e.shortcode ,e))
            this.emoji_map = emoji_map
            this.cache_flg = true
        } else {
            // キャッシュフラグがOFF: 投稿から一時的に取得されたリモート、もしくはMastodonのカスタム絵文字
            const emoji_list = []
            switch (arg.platform) {
                case 'Mastodon': // Mastodon
                    arg.emojis?.forEach(e => emoji_list.push(e))
                    break
                case 'Misskey': // Misskey
                    if (arg.emojis) Object.keys(arg.emojis).forEach(key => emoji_list.push({
                        shortcode: key,
                        url: arg.emojis[key]
                    }))
                    break
                default:
                    break
            }
            this.list = emoji_list
            this.cache_flg = false
        }
    }

    static {
        Emojis.readCache()
    }

    static async readCache() {
        const emojis = await window.accessApi.readCustomEmojis()
        const emoji_map = new Map()
        emojis?.forEach((v, k) => emoji_map.set(k, new Emojis({
            host: k,
            emojis: v,
            cache_flg: true
        })))
        Emojis.map = emoji_map
    }

    static clearCache() {
        Emojis.map.clear()
    }

    /**
     * #StaticMethod
     * 絵文字キャッシュプロパティを取得
     * 
     * @param arg ホスト名
     */
    static get(arg) {
        return Emojis.map.get(arg)
    }

    each(callback) {
        if (this.cache_flg) this.emoji_map.forEach((v, k) => callback(v))
        else this.list.forEach(callback)
    }

    /**
     * #Method
     * 引数のテキストに含まれているショートコードを絵文字に置換する
     * 
     * @param text 置換対象のテキスト
     */
    replace(text) {
        if (this.cache_flg) { // アプリケーションキャッシュの絵文字データの場合
            if (!text) return ""
            return text.replace(new RegExp(':[a-zA-z0-9_]+:', 'g'), match => {
                const target = this.emoji_map.get(match)
                if (target) return `<img src="${target.url}" class="inline_emoji"/>`
                else return match
            })
        } else { // 投稿データに付随してきた絵文字データの場合
             // 文字の入力がない場合は空文字を返却
            if (!text) return ""
            this.list.forEach(emoji => text = text.replace(
                new RegExp(`:${emoji.shortcode}:`, 'g'), `<img src="${emoji.url}" class="inline_emoji"/>`))
            return text
        }
    }
}


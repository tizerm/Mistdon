/**
 * #Class
 * カスタム絵文字を管理するクラス
 *
 * @autor tizerm@mofu.kemo.no
 */
class Emojis {
    // コンストラクタ: パラメータを使って初期化(ファイルとJSON両対応)
    // TODO: とりあえず投稿に付随する絵文字だけ
    constructor(arg) {
        this.host = arg.host ?? null
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
    }

    /**
     * #Method
     * 引数のテキストに含まれているショートコードを絵文字に置換する
     * 
     * @param text 置換対象のテキスト
     */
    replace(text) {
         // 文字の入力がない場合は空文字を返却
        if (!text) return ""
        this.list.forEach(emoji => text = text.replace(
            new RegExp(`:${emoji.shortcode}:`, 'g'), `<img src="${emoji.url}" class="inline_emoji"/>`))
        return text
    }
}


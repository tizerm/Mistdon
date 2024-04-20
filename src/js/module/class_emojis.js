/**
 * #Class
 * カスタム絵文字を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Emojis {
    // コンストラクタ: パラメータを使って初期化(ファイルとJSON両対応)
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

    // スタティックブロック(カスタム絵文字キャッシュを取りに行く)
    static {
        Emojis.readCache()
    }

    /**
     * #StaticMethod
     * ファイルからカスタム絵文字キャッシュを生成する
     */
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

    /**
     * #StaticMethod
     * 絵文字キャッシュをクリアする
     */
    static clearCache() {
        Emojis.map.clear()
    }

    /**
     * #StaticMethod
     * カスタム絵文字キャッシュプロパティを取得
     * 
     * @param arg ホスト名
     */
    static get(arg) {
        return Emojis.map.get(arg)
    }

    /**
     * #Method
     * カスタム絵文字を走査する
     * 投稿に付属する絵文字にもキャッシュしている絵文字にも使える
     * 
     * @param callback 各要素で実効するコールバック関数
     */
    each(callback) {
        if (this.cache_flg) this.emoji_map.forEach((v, k) => callback(v))
        else this.list.forEach(callback)
    }

    /**
     * #Method
     * カスタム絵文字キャッシュから指定の絵文字を返却する
     * 
     * @param code 取得対象の絵文字のショートコード
     */
    get(code) {
        return this.emoji_map.get(code)
    }

    /**
     * #Method
     * 指定の文字列が先頭にくるカスタム絵文字を抽出してコールバック関数を実行
     * 
     * @param code 検索文字列
     * @param callback ヒットした絵文字に対して実行するコールバック関数
     */
    filter(code, callback) {
        this.emoji_map.forEach((v, k) => {
            if (k.match(new RegExp(`^:${code}`, 'g'))) callback(v)
        })
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
            return text.replace(new RegExp(':[a-zA-Z0-9_]+:', 'g'), match => {
                const target = this.emoji_map.get(match)
                if (target) return `<img src="${target.url}" class="inline_emoji"/>`
                else return match
            })
        } else { // 投稿データに付随してきた絵文字データの場合
             // 文字の入力がない場合は空文字を返却
            if (!text) return ""
            return this.list.reduce((str, emoji) => str.replace(
                new RegExp(`:${emoji.shortcode}:`, 'g'), `<img src="${emoji.url}" class="inline_emoji"/>`), text)
        }
    }

    /**
     * #StaticMethod
     * 引数の文字列に含まれる絵文字ショートコードをサーバーから取得して絵文字に置換する
     * (※Misskey専用機能)
     * 
     * @param arg パラメータオブジェクト
     */
    static async replaceAsync(arg) {
        const host = arg.host
        let text = arg.text
        if (!text) return ""
        // 対象のホストが認証アカウントにあるか検索
        const auth = Account.getByDomain(host)

        // 文章中に存在するショートコードを抽出
        const shortcodes = text.match(new RegExp(':[a-zA-Z0-9_]+:', 'g'))
        if (!shortcodes) return text // 絵文字がない場合はそのまま返却

        if (auth) { // 対象のホストが認証アカウントにある場合はキャッシュから置換処理を実行
            const emoji_map = auth.emojis.emoji_map
            return shortcodes.reduce((str, code) => {
                const emoji = emoji_map.get(code)
                return str.replace(
                    new RegExp(emoji.shortcode, 'g'), `<img src="${emoji.url}" class="inline_emoji"/>`)
            }, text)
        } else { // 認証アカウント外のインスタンスの場合は現地のAPIから絵文字を取得
            const emoji_promises = []
            shortcodes.map(code => code.substring(1, code.length -1))
                .forEach(code => emoji_promises.push($.ajax({ // ショートコード毎にリクエスト送信
                        type: "POST",
                        url: `https://${host}/api/emoji`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ "name": code })
                    }).then(data => {
                        console.log(`Emoji Requested: ${data.name}`)
                        return {
                            shortcode: `:${data.name}:`,
                            url: data.url
                        }
                    })))
            // 取得に成功したショートコードを抜き出して置換処理を実行
            return await Promise.allSettled(emoji_promises).then(results => {
                return results.filter(res => res.status == 'fulfilled').map(res => res.value)
                    .reduce((str, emoji) => str.replace(
                        new RegExp(emoji.shortcode, 'g'), `<img src="${emoji.url}" class="inline_emoji"/>`), text)
            })
        }
    }

    /**
     * #StaticMethod
     * 引数の文字列に含まれる絵文字ショートコードをサーバーから取得して絵文字に置換する
     * (※Misskey専用機能)
     * 
     * @param arg パラメータオブジェクト
     */
    static async replaceDomAsync(jqelm, host) {
        jqelm.each((index, elm) => Emojis.replaceAsync({
            text: $(elm).html(),
            host: host
        }).then(text => $(elm).html(text)))
    }

    /**
     * #StaticMethod
     * 指定したDOMのカスタム絵文字ショートコードを非同期で絵文字に置換する(ホスト名が含まれているパターン)
     * 
     * @param jqelm 置換対象のテキストのあるjQueryオブジェクト
     */
    static async replaceRemoteAsync(jqelm) {
        if (jqelm.length == 0) return // マッチしてなかったらなにもしない

        let text = jqelm.html()
        // 文章中に存在するショートコードを抽出
        const shortcodes = text.match(new RegExp(':[a-zA-Z0-9_]+@.+:', 'g'))
        if (!shortcodes) return text // 絵文字がない場合はそのまま返却
        const emoji_promises = []
        shortcodes.forEach(code => emoji_promises.push($.ajax({ // ショートコード毎にリクエスト送信
            type: "POST",
            url: `https://${code.substring(code.indexOf('@'), code.length -1)}/api/emoji`,
            dataType: "json",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ "name": code.substring(1, code.indexOf('@')) })
        }).then(data => { return {
            shortcode: code,
            url: data.url
        }})))
        // 取得に成功したショートコードを抜き出して置換処理を実行
        const replace_text = await Promise.allSettled(emoji_promises).then(results => {
            return results.filter(res => res.status == 'fulfilled').map(res => res.value)
                .reduce((str, emoji) => str.replace(
                    new RegExp(emoji.shortcode, 'g'), `<img src="${emoji.url}" class="inline_emoji"/>`), text)
        })
        jqelm.html(replace_text)
    }

    /**
     * #StaticMethod
     * カスタム絵文字サジェスターを起動する
     * 
     * @param target_elm 起動対称の入力フォームElement
     */
    static createEmojiSuggester(target_elm) {
        // 絵文字取得対象アカウントを取得
        let target_account = null
        if (target_elm.is("#__txt_replyarea")) // リプライウィンドウ
            target_account = Account.get($("#__hdn_reply_account").val())
        else if (target_elm.is("#__txt_quotearea")) // 引用ウィンドウ
            target_account = Account.get($("#__hdn_quote_account").val())
        else target_account = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"))

        // サジェスター生成時点でのカーソル位置を保持
        const suggest_pos = target_elm.get(0).selectionStart

        // サジェスターウィンドウを初期化
        $("#pop_emoji_suggester>.target_account").val(target_account.full_address)
        $("#pop_emoji_suggester>.target_cursor").val(suggest_pos)
        $("#pop_emoji_suggester>.target_elm_id").val(target_elm.attr("id"))
        $("#pop_emoji_suggester>.recent_emoji_list").empty()
        $("#pop_emoji_suggester>.suggest_emoji_list").empty()
        // 絵文字履歴を表示する
        target_account.emoji_history.map(code => target_account.emojis.get(code)).filter(f => f).forEach(
            emoji => $("#pop_emoji_suggester>.recent_emoji_list").append(`
                <li>
                    <a class="__on_emoji_suggest_append" name="${emoji.shortcode}">
                        <img src="${emoji.url}" alt="${emoji.name}"/>
                    </a>
                </li>
            `))
        // サジェスターを表示
        const pos = target_elm.offset()
        $("#pop_emoji_suggester").css({
            'left': `${pos.left - 32}px`,
            'top': `${pos.top + 72}px`,
        }).show()
    }
}


/**
 * #Class
 * カスタム絵文字を管理するクラス
 *
 * @author @tizerm@misskey.dev
 */
class Emojis {
    // コンストラクタ: パラメータを使って初期化(ファイルとJSON両対応)
    constructor(arg) {
        this.host = arg.host ?? null
        if (arg.cache_flg) {
            // キャッシュフラグがON: アカウントから参照するサーバーのカスタム絵文字(リストではなくMap)
            const emoji_map = new Map()
            const category_map = new Map()
            arg.emojis?.forEach(e => {
                emoji_map.set(e.shortcode, e)
                // カテゴリ未登録の場合新しく配列を追加
                if (!category_map.has(e.category)) category_map.set(e.category, [])
                category_map.get(e.category).push(e.shortcode)
            })
            this.emoji_map = emoji_map
            this.category_map = category_map
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
            return text.replace(new RegExp('(?<!alt="):[a-zA-Z0-9_]+:', 'g'), match => {
                const target = this.emoji_map.get(match)
                if (target) return `<img src="${target.url}" class="inline_emoji" alt="${target.shortcode}"/>`
                else return match
            })
        } else { // 投稿データに付随してきた絵文字データの場合
             // 文字の入力がない場合は空文字を返却
            if (!text) return ""
            return this.list.reduce((str, emoji) => str.replace(new RegExp(`:${emoji.shortcode}:`, 'g'),
                `<img src="${emoji.url}" class="inline_emoji" alt=":${emoji.shortcode}:"/>`), text)
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
        const shortcodes = text.match(new RegExp('(?<!alt="):[a-zA-Z0-9_]+:', 'g'))
        if (!shortcodes) return text // 絵文字がない場合はそのまま返却

        if (auth) { // 対象のホストが認証アカウントにある場合はキャッシュから置換処理を実行
            const emoji_map = auth.emojis.emoji_map
            return shortcodes.reduce((str, code) => {
                const emoji = emoji_map.get(code)
                return str.replace(new RegExp(`(?<!alt=")${emoji.shortcode}`, 'g'),
                    `<img src="${emoji.url}" class="inline_emoji" alt="${emoji.shortcode}"/>`)
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
                    .reduce((str, emoji) => str.replace(new RegExp(`(?<!alt=")${emoji.shortcode}`, 'g'),
                        `<img src="${emoji.url}" class="inline_emoji" alt="${emoji.shortcode}"/>`), text)
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

        jqelm.each((index, elm) => {
            let text = $(elm).html()
            // 文章中に存在するショートコードを抽出
            const shortcodes = text.match(/:[a-zA-Z0-9_]+@.+:/g)
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
            Promise.allSettled(emoji_promises).then(results => {
                return results.filter(res => res.status == 'fulfilled').map(res => res.value)
                    .reduce((str, emoji) => str.replace(new RegExp(emoji.shortcode, 'g'),
                        `<img src="${emoji.url}" class="inline_emoji" alt=":${emoji.shortcode}:"/>`), text)
            }).then(replace => $(elm).html(replace))
        })
    }

    /**
     * #StaticMethod
     * 現在選択されている投稿先のアカウントでカスタム絵文字パレットウィンドウを生成する.
     */
    static createEmojiPaletteWindow(mode) {
        if ($("#singleton_emoji_window").length > 0) { // ウィンドウ作成済みの場合はフォーカスだけする
            $("#__txt_emoji_search").focus()
            return
        }

        // 絵文字取得対象アカウントを取得
        const target_account = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"))
        const window_key = 'singleton_emoji_window'

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="emoji_window emoji_palette_section ex_window __ignore_close_option">
                    <h2><span>カスタム絵文字(${target_account.full_address})</span></h2>
                    <div class="window_buttons">
                        <input type="checkbox" class="__window_opacity" id="__window_opacity_submit"/>
                        <label for="__window_opacity_submit" class="window_opacity_button" title="透過"><img
                            src="resources/ic_alpha.png" alt="透過"/></label>
                        <button type="button" class="window_close_button" title="閉じる"><img
                            src="resources/ic_not.png" alt="閉じる"/></button>
                    </div>
                    <div class="suggest_box">
                        <div id="emoji_mode_palette" class="palette_mode active">パレット</div>
                        <div id="emoji_mode_method" class="palette_mode">変換</div>
                        <input type="hidden" id="__hdn_emoji_cursor" value=""/>
                        <input type="hidden" id="__hdn_emoji_target_elm_id" value=""/>
                        <input type="hidden" class="__hdn_emoji_code" value=""/>
                        <input type="text" id="__txt_emoji_search" class="__ignore_keyborad emoji_suggest_textbox"
                            tabindex="3" placeholder="ショートコードを入力するとサジェストされます"/>
                    </div>
                    <div class="palette_flex">
                        <div class="suggest_option">
                            <div class="first_option"></div>
                            <div class="first_shortcode"></div>
                            <h5>その他の候補</h5>
                            <div class="other_option"></div>
                        </div>
                        <div class="recent_emoji">
                            <h5>最近使った絵文字</h5>
                            <div class="recent_emoji_list"></div>
                        </div>
                        <div class="emoji_list"></div>
                    </div>
                </div>
            `,
            color: target_account.pref.acc_color,
            resizable: true,
            drag_axis: false,
            resize_axis: "all"
        })

        // ターゲットのアカウントのカスタム絵文字をウィンドウにバインド
        Emojis.bindEmojiPaletteWindow(target_account)
        // パレットモードで起動した場合のみフォーカスをサジェストフォームに移動
        if (mode == 'palette') $("#__txt_emoji_search").focus()
    }

    /**
     * #StaticMethod
     * カスタム絵文字パレットの入力モードをトグルする.
     * 
     * @param target_elm パレット入力対象のフォームDOM Element
     * @param force_close 変換モードを強制的に終了する場合はtrue
     */
    static toggleEmojiPaletteMode(target_elm, force_close) {
        // パレットが起動していない場合はパレットを先に起動(変換モードで)
        if (!force_close && $('#singleton_emoji_window').length == 0) Emojis.createEmojiPaletteWindow('method')
        if (!force_close && $('#emoji_mode_palette').is(".active")) { // パレット⇒変換
            $('#emoji_mode_palette').removeClass("active")
            $('#emoji_mode_method').addClass("active")

            // 変換モード起動時時点でのカーソル位置を保持
            $('#__hdn_emoji_cursor').val(target_elm.get(0).selectionStart + 1)
            $('#__hdn_emoji_target_elm_id').val(target_elm.attr('id'))
            target_elm.focus()
        } else { // 変換⇒パレット
            $('#emoji_mode_palette').addClass("active")
            $('#emoji_mode_method').removeClass("active")
            // カーソル情報を初期化
            $('#__hdn_emoji_cursor').val("")
            $('#__hdn_emoji_target_elm_id').val("")
            $('#__txt_emoji_search').val("").keyup()
        }
    }

    /**
     * #StaticMethod
     * カスタム絵文字パレットウィンドウの内容を対象のアカウントで書き換える.
     * 
     * @param account 書き換え対象のアカウント
     */
    static async bindEmojiPaletteWindow(account) {
        // ヘッダ設定
        $('#singleton_emoji_window>h2').html(`<span>カスタム絵文字(${account.pref.domain})</span>`)
            .css('background-color', account.pref.acc_color)
        $('#singleton_emoji_window .recent_emoji>.recent_emoji_list').empty()
        $('#singleton_emoji_window .emoji_list').empty()

        // 絵文字一覧をバインド
        Emojis.bindEmojiPalette(account, 'singleton_emoji_window', 'emoji')
    }

    /**
     * #StaticMethod
     * カスタム絵文字パレットの内容を対象のアカウントで書き換える(汎用版メソッド).
     * 
     * @param account 書き換え対象のアカウント
     * @param target_id 書き換え対象のパレットウィンドウのDOM ID
     * @param type パレットタイプ(絵文字アペンドかリアクションか)
     */
    static async bindEmojiPalette(account, target_id, type) {
        const emojis = account.emojis
        const history = (type == 'reaction') ? account.reaction_history : account.emoji_history
        const event_class = (type == 'reaction') ? '__on_emoji_reaction' : '__on_emoji_append'

        // 最近使った絵文字を表示
        history.map(code => emojis.get(code)).filter(f => f).forEach(
            emoji => $(`#${target_id} .recent_emoji>.recent_emoji_list`).append(`
                <a class="${event_class}" name="${emoji.shortcode}"><img src="${emoji.url}" alt="${emoji.name}"/></a>
            `))

        // カテゴリごとに分けて絵文字をバインド
        emojis.category_map.forEach((v, k) => {
            const category_html = v.map(c => emojis.emoji_map.get(c)).reduce((rs, el) => `${rs}
                <a class="${event_class}" name="${el.shortcode}"><img src="${el.url}" alt="${el.name}"/></a>
            `, '')
            $(`#${target_id} .emoji_list`).append(`
                <h5>${k}</h5>
                <div class="emoji_section" name="${k}">${category_html}</div>
            `)
        })
    }

    /**
     * #StaticMethod
     * カスタム絵文字パレットの内容を入力された検索コードでしぼる.
     * 
     * @param target 書き換え対象のパレットウィンドウのDOMオブジェクト
     * @param word 入力中の検索コード
     */
    static filterEmojiPalette(target, word) {
        target.find(".__hdn_emoji_code").val(word)
        if (!word) { // 空欄の場合候補を削除
            target.find(".first_option").empty()
            target.find(".other_option").empty()
            return
        }
        const word_lower = word.toLowerCase()
        const option = []
        let first_option = null
        target.find(".recent_emoji a").each((index, elm) => { // 最近使ったものから優先して候補に出す
            const shortcode = $(elm).attr("name").toLowerCase()
            // 部分一致は優先して候補に出す
            if (shortcode.match(new RegExp(word_lower, 'g'))) option.push($(elm).clone())
        })
        target.find(".emoji_list>.emoji_section>a").each((index, elm) => {
            const shortcode = $(elm).attr("name").toLowerCase()
            // 完全一致は確定候補にする
            if (shortcode.match(new RegExp(`^:${word_lower}:$`, 'g'))) first_option = $(elm).clone()
            if (shortcode.match(new RegExp(word_lower, 'g'))) option.push($(elm).clone())
        })

        // 完全一致候補の有無で候補を変える
        if (first_option) option.unshift(first_option.clone())
        else first_option = option[0]?.clone()

        // 確定候補をバインド
        target.find(".first_option").html(first_option)
        target.find(".first_shortcode").text(first_option.attr('name'))
        target.find(".other_option").empty()

        // 既に存在する絵文字はアペンドしない
        const emoji_set = new Set()
        if (option.length > 0) option.forEach(elm => {
            const key = elm.attr('name')
            if (!emoji_set.has(key)) {
                emoji_set.add(key)
                target.find(".other_option").append(elm)
            }
        })
        else target.find(".other_option").text("(他に候補がありません)")
    }

    /**
     * #StaticMethod
     * 現在確定対象候補になっているカスタム絵文字から前後の候補に移動する.
     * 
     * @param target 書き換え対象のパレットウィンドウのDOMオブジェクト
     * @param decrement 前に移動する場合はtrue
     */
    static iterateEmojiPalette(target, decrement) {
        const current = target.find(".first_option>a").attr('name')
        const elm = target.find(`.other_option>a[name="${current}"]`)
        let itrelm = null
        // 前後の項目を取得
        if (decrement) itrelm = elm.prev()
        else itrelm = elm.next()
        target.find(".first_option").html(itrelm.clone())
        target.find(".first_shortcode").text(itrelm.attr('name'))
    }
}


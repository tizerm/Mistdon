﻿/**
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
                return str.replace(new RegExp(emoji.shortcode, 'g'),
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
                    .reduce((str, emoji) => str.replace(new RegExp(emoji.shortcode, 'g'),
                        `<img src="${emoji.url}" class="inline_emoji" alt=":${emoji.shortcode}:"/>`), text)
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
                .reduce((str, emoji) => str.replace(new RegExp(emoji.shortcode, 'g'),
                    `<img src="${emoji.url}" class="inline_emoji" alt=":${emoji.shortcode}:"/>`), text)
        })
        jqelm.html(replace_text)
    }

    static createEmojiPaletteWindow() {
        if ($("##singleton_emoji_window").length > 0) { // ウィンドウ作成済みの場合はフォーカスだけする
            $("#__txt_emoji_search").focus()
            return
        }

        // 絵文字取得対象アカウントを取得
        const target_account = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"))
        const window_key = 'singleton_emoji_window'

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="emoji_window emoji_palette_section ex_window">
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
                        <input type="text" id="__txt_emoji_search" class="__ignore_keyborad emoji_suggest_textbox"
                            placeholder="ショートコードを入力するとサジェストされます"/>
                    </div>
                    <div class="palette_flex">
                        <div class="suggest_option">
                            <div class="first_option"></div>
                            <h5>その他の候補</h5>
                            <div class="other_option"></div>
                        </div>
                        <div class="recent_emoji"></div>
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
        $("#__txt_emoji_search").focus()
    }

    static async bindEmojiPaletteWindow(account) {
        // ヘッダ設定
        $('#singleton_emoji_window>h2').html(`<span>カスタム絵文字(${account.pref.domain})</span>`)
            .css('background-color', `#${account.pref.acc_color}`)
        $('#singleton_emoji_window .recent_emoji').html('<h5>最近使った絵文字</h5>')
        $('#singleton_emoji_window .emoji_list').empty()

        // 絵文字一覧をバインド
        Emojis.bindEmojiPalette(account, 'singleton_emoji_window', 'emoji')
    }

    static async bindEmojiPalette(account, target_id, type) {
        const emojis = account.emojis
        const history = (type == 'reaction') ? account.reaction_history : account.emoji_history
        const event_class = (type == 'reaction') ? '__on_emoji_reaction' : '__on_emoji_append'

        // 最近使った絵文字を表示
        history.map(code => emojis.get(code)).filter(f => f).forEach(
            emoji => $(`#${target_id} .recent_emoji`).append(`
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

    static filterEmojiPalette(target, word) {
        if (!word) { // 空欄の場合候補を削除
            target.find(".first_option").empty()
            target.find(".other_option").empty()
            return
        }
        const word_lower = word.toLowerCase()
        const option = []
        let first_option = null
        target.find(".recent_emoji>a").each((index, elm) => { // 最近使ったものから優先して候補に出す
            const shortcode = $(elm).attr("name").toLowerCase()
            // 部分一致は優先して候補に出す
            if (shortcode.match(new RegExp(word_lower, 'g'))) option.push($(elm).clone())
        })
        target.find(".emoji_list>.emoji_section>a").each((index, elm) => {
            const shortcode = $(elm).attr("name").toLowerCase()
            // 完全一致は確定候補にする
            if (shortcode.match(new RegExp(`^:${word_lower}:$`, 'g'))) first_option = $(elm).clone()
            else if (shortcode.match(new RegExp(word_lower, 'g'))) option.push($(elm).clone())
        })

        // 完全一致候補がない場合は先頭候補を確定にする
        if (!first_option) first_option = option.shift()
        // 確定候補をバインド
        target.find(".first_option").html(first_option).append(`<div>${first_option.attr('name')}</div>`)
        target.find(".other_option").empty()
        if (option.length > 0) option.forEach(elm => target.find(".other_option").append(elm))
        else target.find(".other_option").text("(他に候補がありません)")
    }

    /**
     * #StaticMethod
     * カスタム絵文字サジェスターを起動する
     * 
     * @param target_elm 起動対称の入力フォームElement
     */
    static createEmojiSuggester(target_elm) {
        // 絵文字取得対象アカウントを取得
        const target_account = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"))

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


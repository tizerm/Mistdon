﻿/**
 * #Class
 * 検索クエリモジュール
 *
 * @author @tizerm@misskey.dev
 */
class Query {
    // コンストラクタ: 検索文字列からクエリオブジェクトを生成
    constructor(query) {
        this.query = query
        // ハッシュタグを検出した場合はタグクエリを設定
        if (query.indexOf('#') == 0) this.hashtag = query.substring(1)
    }

    // Getter: 検索文字列がURLかどうか判定
    get is_url() { return this.query.match(new RegExp('^https?://', 'g')) }
    // Getter: 検索文字列がアカウントアドレスかどうか判定
    get is_address() { return this.query.match(/^@[a-zA-Z0-9_]+@.+$/g) }

    /**
     * #StaticMethod
     * 検索欄を表示する画面を表示
     */
    static createSearchWindow() {
        // 検索カラムのDOM生成
        $("#pop_ex_timeline").html(`
            <h2>検索(ハッシュタグ検索)</h2>
            <div class="search_timeline">
                <div class="search_options">
                    <input type="text" id="__txt_search_query" class="__ignore_keyborad"
                        placeholder="(Enterで検索 先頭に#を付けるとハッシュタグ検索になります)"/>
                    <button type="button" id="__on_search">検索</button>
                    <p>
                        <input type="checkbox" id="__chk_ex_search_cw" class="__chk_ex_search_cw"
                            ${Preference.GENERAL_PREFERENCE.auto_expand?.search_cw ? 'checked' : ''}/>
                        <label for="__chk_ex_search_cw">CW展開</label>
                        <input type="checkbox" id="__chk_ex_search_media" class="__chk_ex_search_media"
                            ${Preference.GENERAL_PREFERENCE.auto_expand?.search_media ? 'checked' : ''}/>
                        <label for="__chk_ex_search_media">メディア展開</label><br/>
                    </p>
                    <p>タイムラインレイアウト:
                        <select id="__cmb_ex_search_layout">
                            <option value="default">ノーマル</option>
                            <option value="normal2">ノーマル2</option>
                            <option value="chat">チャット</option>
                            <option value="list">リスト</option>
                            <option value="media">メディア</option>
                            <option value="gallery">ギャラリー</option>
                        </select>
                    </p>
                </div>
                <div id="__search_timeline" class="timeline">
                    <div class="col_loading">
                        <img src="resources/illust/il_done2.png" alt="done"/><br/>
                        <span class="loading_text">検索結果がここに表示されます。</span>
                    </div>
                    <ul class="search_ul __context_posts"></ul>
                </div>
            </div>
            <button type="button" id="__on_search_close" class="close_button">×</button>
        `).show(...Preference.getAnimation("SLIDE_RIGHT"), () => $("#__txt_search_query").focus())
    }

    /**
     * #StaticMethod
     * 検索カラムに入力された情報をもとに検索処理を実行(ロード画面生成もいっしょに)
     */
    static async onSearchTimeline() {
        // 一旦中身を全消去する
        $('#pop_ex_timeline').find(".col_loading").remove()
        $('#pop_ex_timeline').find("ul").empty()
        $('#pop_ex_timeline').find("ul").before(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        // クエリオブジェクトを生成
        const query = new Query($("#pop_ex_timeline #__txt_search_query").val())
        if (query.is_url) { // URLの場合Mastodon/Misskeyの投稿URLか判定する
            const post = await Status.getStatus(query.query)
            if (post) { // 投稿が取得できたら投稿ウィンドウを表示
                post.createDetailWindow()
                $('#__on_search_close').click()
                return
            }
        } else if (query.is_address) { // ユーザーアドレスの場合は取得できるユーザー情報か判定する
            const user = await User.getByAddress(query.query)
            if (user) { // ユーザーが取得できたらユーザープロフィールウィンドウを表示
                user.createDetailWindow()
                $('#__on_search_close').click()
                return
            }
        }
        // 検索用のタイムラインオブジェクトを生成
        const search_tl = new Timeline({
            "expand_cw": $("#__chk_ex_search_cw").prop("checked"),
            "expand_media": $("#__chk_ex_search_media").prop("checked"),
        }, new Group({
            "group_id": "__search_timeline",
            "tl_layout": $("#__cmb_ex_search_layout").val(),
            "multi_user": true
        }, null))
        // すべてのアカウントから検索処理を実行してバインド
        const promises = []
        Account.each(account => promises.push(query.search(account, search_tl)))
        search_tl.parent_group.status_map.clear()
        search_tl.parent_group.onLoadTimeline(promises)
    }

    /**
     * #Method
     * 引数のアカウントを使って検索処理を実行
     * 
     * @param account 検索処理を実行するアカウント
     * @param tl 設定用のタイムラインオブジェクト
     */
    async search(account, tl) {
        let response = null
        try { // 検索文字列を渡して投稿を検索
            switch (account.platform) {
                case 'Mastodon': // Mastodon
                    if (this.hashtag) // ハッシュタグ検索
                        response = await $.ajax({
                            type: "GET",
                            url: `https://${account.pref.domain}/api/v1/timelines/tag/${this.hashtag}`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                            data: { "limit": 30 }
                        })
                    else { // 全文検索
                        response = await $.ajax({
                            type: "GET",
                            url: `https://${account.pref.domain}/api/v2/search`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                            data: {
                                "q": this.query,
                                "type": "statuses",
                                "limit": 30
                            }
                        })
                        response = response.statuses
                    }
                    break
                case 'Misskey': // Misskey
                    if (this.hashtag) // ハッシュタグ検索
                        response = await $.ajax({
                            type: "POST",
                            url: `https://${account.pref.domain}/api/notes/search-by-tag`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": account.pref.access_token,
                                "reply": false,
                                "renote": false,
                                "tag": this.hashtag,
                                "limit": 30
                            })
                        })
                    else // 全文検索
                        response = await $.ajax({
                            type: "POST",
                            url: `https://${account.pref.domain}/api/notes/search`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": account.pref.access_token,
                                "query": this.query,
                                "limit": 30
                            })
                        })
                    break
                default:
                    break
            }
            const posts = []
            response.forEach(p => posts.push(new Status(p, tl, account)))
            return posts
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.error(`${account.pref.domain}での投稿の検索でエラーが発生しました.`)
            return Promise.reject(err)
        }
    }
}

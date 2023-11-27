/**
 * #Class
 * 検索クエリモジュール
 *
 * @author tizerm@mofu.kemo.no
 */
class Query {
    // コンストラクタ: 検索文字列からクエリオブジェクトを生成
    constructor(query) {
        this.query = query
        // ハッシュタグを検出した場合はタグクエリを設定
        if (query.indexOf('#') == 0) this.hashtag = query.substring(1)
    }

    // スタティックマップを初期化(非同期)
    static {
        Query.SEARCH_PREF_TIMELINE = {
            "parent_group": new Group({
                "group_id": "__search_timeline",
                "tl_layout": "default",
                "multi_user": true
            }, null)
        }
    }

    /**
     * #Method
     * このカラムのDOMを生成してテーブルにアペンドする
     */
    static createSearchWindow() {
        // 検索カラムのDOM生成
        $("#pop_ex_timeline").html(`
            <h2>検索(ハッシュタグ検索)</h2>
            <div class="search_timeline">
                <div class="search_options">
                    <input type="text" id="__txt_search_query" class="__ignore_keyborad"
                        placeholder="(Enterで検索 先頭に#を付けるとハッシュタグ検索になります)"/>
                    <button type="button" id="__on_search">search</button>
                </div>
                <div id="__search_timeline" class="timeline">
                    <div class="col_loading">
                        <img src="resources/illust/il_done.png" alt="done"/><br/>
                        <span class="loading_text">検索結果がここに表示されます。</span>
                    </div>
                    <ul class="search_ul __context_posts"></ul>
                </div>
            </div>
            <button type="button" id="__on_search_close">×</button>
        `).show("slide", { direction: "up" }, 150, () => $("#__txt_search_query").focus())
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

        const query = new Query($("#pop_ex_timeline #__txt_search_query").val())
        const rest_promises = []
        // すべてのアカウントから検索処理を実行(検索結果をPromise配列に)
        Account.each(account => rest_promises.push(query.search(account)))
        // すべての検索結果を取得したらカラムにバインド
        Query.SEARCH_PREF_TIMELINE.parent_group.onLoadTimeline(rest_promises)
    }

    async search(account) {
        let rest_promise = null
        // 検索文字列を渡して投稿を検索
        switch (account.platform) {
            case 'Mastodon': // Mastodon
                if (this.hashtag) // ハッシュタグ検索
                    rest_promise = $.ajax({
                        type: "GET",
                        url: `https://${account.pref.domain}/api/v1/timelines/tag/${this.hashtag}`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                        data: { "limit": 30 }
                    })
                else // 全文検索
                    rest_promise = $.ajax({
                        type: "GET",
                        url: `https://${account.pref.domain}/api/v2/search`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                        data: {
                            "q": this.query,
                            "type": "statuses",
                            "limit": 30
                        }
                    }).then(data => { return data.statuses })
                break
            case 'Misskey': // Misskey
                if (this.hashtag) // ハッシュタグ検索
                    rest_promise = $.ajax({
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
                    rest_promise = $.ajax({
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
        // Promiseを返却(実質非同期)
        return rest_promise.then(data => {
            return (async () => {
                const posts = []
                data.forEach(p => posts.push(
                    new Status(p, Query.SEARCH_PREF_TIMELINE, account)))
                return posts
            })()
        }).catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${account.pref.domain}での投稿の検索でエラーが発生しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }
}

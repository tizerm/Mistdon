/**
 * #Class
 * トレンドモジュール
 *
 * @author @tizerm@misskey.dev
 */
class Trend {
    // コンストラクタ: クリップエンティティからクリップオブジェクトを生成
    constructor(json, platform, auth) {
        this.platform = platform
        switch (platform) {
            case 'Mastodon': // Mastodon
                this.tag = json.name
                this.count = json.history[0].uses
                this.users = json.history[0].accounts
                break
            case 'Misskey': // Misskey
                this.tag = json.tag
                this.count = json.chart.reduce((rs, el) => rs + el, 0)
                this.users = json.usersCount
                break
            default:
                break
        }
        this.authorized = auth
    }

    // Getter: トレンド対象のアカウントカラーを取得
    get color() { return this.authorized.pref.acc_color }

    // スタティックタイムライン情報を初期化
    static {
        Trend.TREND_PREF_TIMELINE = {
            "parent_group": new Group({
                "group_id": "__trend_timeline",
                "tl_layout": "default",
                "multi_user": true
            }, null)
        }
        Trend.TREND_TAG_MAP = null
        Trend.TREND_STATUS_MAP = Trend.TREND_PREF_TIMELINE.parent_group.status_map
    }

    /**
     * #StaticMethod
     * ターゲットのインスタンスで現在話題になっている投稿を取得する.
     * 
     * @param domain トレンド取得対象のインスタンスドメイン
     * @param platform プラットフォーム
     */
    static async getFeature(domain, platform) {
        let response = null
        let query_param = null
        const auth = Account.getByDomain(domain)
        try {
            switch (platform) {
                case 'Mastodon': // Mastodon
                    query_param = { "limit": 30 }
                    let header = {}
                    if (auth) header = { "Authorization": `Bearer ${auth.pref.access_token}` }
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${domain}/api/v1/trends/statuses`,
                        dataType: "json",
                        headers: header,
                        data: query_param
                    })
                    break
                case 'Misskey': // Misskey
                    query_param = { "limit": 30 }
                    if (auth) query_param.i = auth.pref.access_token
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${domain}/api/notes/featured`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    break
                default:
                    break
            }
            const posts = []
            response.forEach(p => posts.push(new Status(p, Trend.TREND_PREF_TIMELINE, auth)))
            return posts
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.error(`${domain}のトレンドの取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    /**
     * #StaticMethod
     * ターゲットのインスタンスで現在話題になっているハッシュタグを取得する.
     * 
     * @param domain トレンド取得対象のインスタンスドメイン
     * @param platform プラットフォーム
     */
    static async getTrend(domain, platform) {
        let response = null
        let query_param = null
        const auth = Account.getByDomain(domain)
        try {
            switch (platform) {
                case 'Mastodon': // Mastodon
                    query_param = { "limit": 20 }
                    let header = {}
                    if (auth) header = { "Authorization": `Bearer ${auth.pref.access_token}` }
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${domain}/api/v1/trends/tags`,
                        dataType: "json",
                        headers: header,
                        data: query_param
                    })
                    break
                case 'Misskey': // Misskey
                    query_param = {}
                    if (auth) query_param.i = auth.pref.access_token
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${domain}/api/hashtags/trend`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    break
                default:
                    break
            }
            const tags = []
            response.forEach(t => tags.push(new Trend(t, platform, auth)))
            return tags
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.error(`${domain}のトレンドの取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    /**
     * #StaticMethod
     * 話題の投稿一覧を表示する.
     */
    static bindFeatures() {
        // 一旦中身を全消去する
        $('#pop_ex_timeline ul.trend_ul').empty()
        $('#pop_ex_timeline ul.trend_ul').before(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        const promises = []
        Account.each(account => promises.push(Trend.getFeature(account.pref.domain, account.platform)))
        const view_group = Trend.TREND_PREF_TIMELINE.parent_group
        view_group.status_map.clear()
        view_group.onLoadTimeline(promises)
    }

    /**
     * #Method
     * このトレンドタグで検索してタイムラインに表示する.
     */
    async search() {
        // 一旦中身を全消去する
        $('#pop_ex_timeline ul.trend_ul').empty()
        $('#pop_ex_timeline ul.trend_ul').before(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        const query = new Query(`#${this.tag}`)
        // すべてのアカウントから検索処理を実行してバインド
        const promises = []
        Account.each(account => promises.push(query.search(account)))
        const view_group = Trend.TREND_PREF_TIMELINE.parent_group
        view_group.status_map.clear()
        view_group.onLoadTimeline(promises)
    }

    /**
     * #StaticMethod
     * インスタンスごとのトレンドタグリストを話題順にソートしてリストとして返却する.
     * 
     * @param instance_trends インスタンスごとのトレンドリスト
     */
    static mergeTrends(instance_trends) {
        const tag_map = new Map()
        instance_trends.forEach(tags => tags.forEach(tag => {
            if (tag_map.has(tag.tag)) { // すでにあるタグの場合は注目度が高いサーバーを選ぶ
                const pre_tag = tag_map.get(tag.tag)
                if (pre_tag.count < tag.count) tag_map.set(tag.tag, tag)
            } else tag_map.set(tag.tag, tag)
        }))
        Trend.TREND_TAG_MAP = tag_map
        // 投稿数の降順でソート
        return [...tag_map.values()].sort((a, b) => b.count - a.count)
    }

    /**
     * #StaticMethod
     * トレンドを表示する画面を表示
     */
    static createTrendWindow() {
        // 検索カラムのDOM生成
        $("#pop_ex_timeline").html(`
            <h2>トレンド</h2>
            <div class="trend_timeline">
                <a class="__on_get_features">ホットトピックを表示</a>
                <ul class="trend_tags"></ul>
                <div id="__trend_timeline" class="timeline">
                    <div class="col_loading">
                        <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                        <span class="loading_text">Now Loading...</span>
                    </div>
                    <ul class="trend_ul __context_posts"></ul>
                </div>
            </div>
            <button type="button" id="__on_search_close" class="close_button">×</button>
        `).show(...Preference.getAnimation("SLIDE_RIGHT"))

        // すべてのアカウントからトレンド情報をを取得してバインド
        ;(async () => {
            const trends_promises = []
            const features_promises = []
            Account.each(account => {
                trends_promises.push(Trend.getTrend(account.pref.domain, account.platform))
                features_promises.push(Trend.getFeature(account.pref.domain, account.platform))
            })
            // トレンドタグをソートして一覧にバインド
            Promise.allSettled(trends_promises).then(results => Trend.mergeTrends(
                results.filter(res => res.status == 'fulfilled').map(res => res.value))
                .forEach(tag => $('#pop_ex_timeline>.trend_timeline>ul.trend_tags').append(tag.element)))

            // ホットトピックをタイムラインにバインド
            const view_group = Trend.TREND_PREF_TIMELINE.parent_group
            view_group.status_map.clear()
            view_group.onLoadTimeline(features_promises)
        })()
    }

    // Getter: クリップ一覧に表示するクリップ項目DOM
    get element() {
        const jqelm = $($.parseHTML(`
            <li class="trendtag_list" name="${this.tag}" title="(${this.count})"><span>#${this.tag}</span></li>
        `))
        jqelm.css("background-color", this.color)
        return jqelm
    }

    /**
     * #StaticMethod
     * トレンドウィンドウから対象のjQueryオブジェクトの投稿オブジェクトを返却する.
     * 
     * @param target_li 取得対象のjQueryオブジェクト
     */
    static getStatus(target_li) {
        return Trend.TREND_STATUS_MAP.get(target_li.attr("id"))
    }

}

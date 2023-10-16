/**
 * #Class
 * タイムラインを管理するクラス(カラムに内包)
 *
 * @author tizerm@mofu.kemo.no
 */
class Timeline {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref, column) {
        this.pref = pref
        this.__column_id = column.id
        this.status_key_map = new Map()
    }

    // Getter: このタイムラインのホスト(サーバードメイン)
    get host() { return this.pref.host }
    // Getter: このタイムラインのアカウントのフルアドレス
    get account_key() { return this.pref.key_address }
    // Getter: このタイムラインのアカウント
    get target_account() { return Account.get(this.pref.key_address) }
    // Getter: このタイムラインが所属するカラム
    get parent_column() { return Column.get(this.__column_id) }

    // Setter: ステータスIDをキーに持つ一意識別子のマップに挿入
    set id_list(arg) { this.status_key_map.set(arg.status_id, arg.status_key) }

    /**
     * #Method
     * このタイムラインの最新の投稿を30件取得する
     * (返り値は取得データのpromise)
     */
    getTimeline() {
        if (!this.target_account) return
        // クエリパラメータにlimitプロパティを事前に追加(これはMastodonとMisskeyで共通)
        this.pref.query_param.limit = 30
        let rest_promise = null
        // プラットフォーム判定
        switch (this.target_account.platform) {
            case 'Mastodon': // Mastodon
                // REST APIで最新TLを30件取得、する処理をプロミスとして格納
                rest_promise = $.ajax({
                    type: "GET",
                    url: this.pref.rest_url,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${this.target_account.pref.access_token}` },
                    data: this.pref.query_param
                }).then(data => {
                    return (async () => {
                        // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, this, this.target_account)))
                        return posts
                    })()
                })
                break
            case 'Misskey': // Misskey
                // クエリパラメータにアクセストークンをセット
                this.pref.query_param.i = this.target_account.pref.access_token
                // REST APIで最新TLを30件取得、する処理をプロミスとして格納
                rest_promise = $.ajax({
                    type: "POST",
                    url: this.pref.rest_url,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(this.pref.query_param)
                }).then(data => {
                    return (async () => {
                        // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, this, this.target_account)))
                        return posts
                    })()
                })
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.parent_column.pref.label_head}の${this.account_key}のタイムラインの取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    /**
     * #Method
     * このタイムラインのWebSocket設定パラメータをアカウント情報にわたす
     * (この段階ではWebSocketへはまだ接続しない)
     */
    setSocketParam() {
        if (!this.target_account) return

        let message_callback = null
        let send_param = null

        // プラットフォーム判定
        switch (this.target_account.platform) {
            case 'Mastodon': // Mastodon
                // メッセージ受信時のコールバック関数
                message_callback = (event) => {
                    const data = JSON.parse(event.data)
                    // TLと違うStreamは無視
                    if (data.stream[0] != this.pref.socket_param.stream) return
                    // タイムラインの更新通知
                    if (data.event == "update"
                        || (this.pref.timeline_type == "notification" && data.event == "notification"))
                        this.parent_column.prepend(new Status(JSON.parse(data.payload), this, this.target_account))
                    // 削除された投稿を検知
                    else if (data.event == "delete") this.removeStatus(data.payload)
                }
                // 購読パラメータの設定
                this.pref.socket_param.type = "subscribe"
                send_param = JSON.stringify(this.pref.socket_param)
                break
            case 'Misskey': // Misskey
                const uuid = crypto.randomUUID()
                message_callback = (event) => {
                    const data = JSON.parse(event.data)
                    // TLと違うStreamは無視
                    if (data.body.id != uuid) return
                    if (data.body.type == "note"
                        || (this.pref.timeline_type == "notification" && data.body.type == "notification"))
                        this.parent_column.prepend(new Status(data.body.body, this, this.target_account))
                }
                // 購読パラメータの設定
                this.pref.socket_param.id = uuid
                send_param = JSON.stringify({
                    'type': 'connect',
                    'body': this.pref.socket_param
                })
                break
            default:
                break
        }
        // アカウント情報にソケット設定を追加
        this.target_account.addSocketPref({
            target_col: this.parent_column,
            send_param: send_param,
            messageFunc: message_callback
        })
    }

    /**
     * #Method
     * このタイムラインに保存してあるステータス情報を削除する
     * 
     * @param arg 投稿ID
     */
    removeStatus(id) {
        const status_key = this.status_key_map.get(id)
        // タイムラインに存在する投稿だけ削除対象とする
        if (status_key) this.parent_column.removeStatus(this.parent_column.getStatusElement(status_key))
    }
}

/*====================================================================================================================*/

/**
 * #Class
 * カラムを管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Column {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref) {
        if (pref) { // prefがある(通常のカラム)
            this.pref = pref
            this.index = pref.index
            this.status_map = new Map()
            this.unread = 0
            this.counter = 0
            this.ppm_que = []
            this.timer_id = null
            this.flex = pref.d_flex
            this.open_flg = !pref.d_hide
            this.search_flg = false

            // タイムラインはインスタンスを作って管理
            const tls = []
            pref.timelines.forEach(tl => tls.push(new Timeline(tl, this)))
            this.timelines = tls
        } else { // prefがない(検索用カラム)
            this.pref = {
                "column_id": "__search_timeline",
                "multi_user": true
            }
            this.status_map = new Map()
            this.search_flg = true
        }
    }

    // Getter: カラムの一意識別IDを取得
    get id() { return this.pref.column_id }

    static TIMELINE_LIMIT = 200 // カラムのタイムラインに表示できる限界量
    static SCROLL = 200         // wsスクロールでスクロールするピクセル量
    static SHIFT_SCROLL = 800   // シフトwsスクロールでスクロールするピクセル量

    // スタティックマップを初期化(非同期)
    static {
        (async () => {
            const columns = await window.accessApi.readPrefCols()
            const col_map = new Map()
            columns?.forEach((col, index) => {
                col.index = index
                col_map.set(col.column_id, new Column(col))
            })
            Column.map = col_map
        })()
        // 検索用の静的カラムを設定
        Column.SEARCH_COL = new Column(null)
    }

    /**
     * #StaticMethod
     * カラムプロパティを取得
     * 
     * @param arg 取得に使う引数
     */
    static get(arg) {
        // 数値型だった場合インデクスとして番号からプロパティを取得
        if (typeof arg == 'number') return Column.map.get($(".column_td").eq(arg).attr("id"))
        // 文字列型だった場合はそのままキーとしてプロパティを取得
        else if (typeof arg == 'string') return Column.map.get(arg)
        // オブジェクトだった場合jQueryオブジェクトとして取得
        else return Column.map.get(arg.attr("id"))
    }

    /**
     * #StaticMethod
     * 開いているカラムの中で最初のカラムを返却
     */
    static getOpenedFirst() {
        return Column.get($(".column_td:visible").first())
    }

    /**
     * #StaticMethod
     * カラムプロパティを走査
     * 
     * @param callback 要素ごとに実行するコールバック関数
     */
    static each(callback) {
        Column.map.forEach((v, k) => callback(v))
    }

    /**
     * #Method
     * このカラムのタイムラインプロパティを走査
     * 
     * @param callback 要素ごとに実行するコールバック関数
     */
    eachTimeline(callback) {
        this.timelines.forEach(callback)
    }

    /**
     * #Method
     * このカラムのDOMを生成してテーブルにアペンドする
     */
    create() {
        // カラム本体を空の状態で生成(ナンバーアイコンは10未満のカラムのみ表示)
        const num_img = this.index < 9 ? `<img src="resources/${this.index + 1}.png" class="ic_column_num"/>` : ''
        let html /* 閉じた状態のカラム */ = `
            <td id="${this.id}_closed" class="closed_col">
                ${num_img}
                <div class="col_action">
                    <a class="__on_column_open" title="カラムを開く">
                        <img src="resources/ic_right.png" alt="カラムを開く"/>
                    </a>
                </div>
                <h2>${this.pref.label_head}
                    <span class="unread"></span>
                    <span class="speed">0.0p/h</span>
                </h2>
            </td>
        `; html /* 開いた状態のカラム */ += `
            <td id="${this.id}" class="timeline column_td">
                <div class="col_head">
                    <h2>${this.pref.label_head}</h2>
                    <div class="ic_column_cursor">
                        ${num_img}
                    </div>
                    <h6>0.0p/h</h6>
                    <div class="col_action">
                        <img src="resources/ic_warn.png" alt="何らかの問題が発生しました" class="ic_column_warn"/>
                        <a class="__on_column_reload" title="カラムをリロード"
                            ><img src="resources/ic_reload.png" alt="カラムをリロード"/></a>
                        <a class="__on_column_flex" title="可変幅ON/OFF"
                            ><img src="resources/${this.pref.d_flex ? 'ic_flex_on' : 'ic_flex_off'}.png"
                                class="ic_column_flex" alt="可変幅ON/OFF"/></a>
                        <a class="__on_column_close" title="カラムを閉じる"
                            ><img src="resources/ic_left.png" alt="カラムを閉じる"/></a>
                        <a class="__on_column_top" title="トップへ移動"
                            ><img src="resources/ic_top.png" alt="トップへ移動"/></a>
                    </div>
                </div>
                <div class="col_loading">
                    <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                    <span class="loading_text">Now Loading...</span>
                </div>
                <ul class="__context_posts"></ul>
            </td>
        `
        // テーブルにバインド(対象が複数に渡るので一度バインドしてから表示制御)
        $("#columns>table tr").append(html)

        // カラムの色と幅を変更
        $(`#${this.id}>.col_head`).css("background-color", `#${this.pref.col_color}`)
        $(`#${this.id}_closed`).css("background-color", `#${this.pref.col_color}`)
        $(`#${this.id}`).css("width", this.pref.d_flex ? "auto" : `${this.pref.col_width}px`)

        // デフォルトで閉じる場合は表示を反転
        if (this.pref.d_hide) {
            $(`#columns>table #${this.id}`).hide()
            $(`#columns>table #${this.id}_closed`).show()
        }
    }

    /**
     * #StaticMethod
     * カラムやカラムに表示する内容に関するイベントを設定する
     */
    static bindEvent() {
        // コンテンツ本文: リンクを外部ブラウザで開く
        $(document).on("click", ".content>.main_content a, .prof_field a", e => {
            const url = $(e.target).closest("a").attr("href")
            window.accessApi.openExternalBrowser(url)
            // リンク先に飛ばないようにする
            return false
        })
        // コンテンツ本文: 閲覧注意とCWのオープン/クローズ
        $(document).on("click", ".expand_header",
            e => $(e.target).next().toggle("slide", { direction: "up" }, 100))
        // カラム本体: そのカラムにカーソルを合わせる
        $(document).on("click", ".column_td", e => {
            Column.disposeCursor()
            Column.get($(e.target).closest("td")).setCursor()
        })
        // カラムボタン: トップへ移動
        $(document).on("click", ".__on_column_top",
            e => Column.get($(e.target).closest("td")).scroll(0))
        // カラムボタン: カラムを開く
        $(document).on("click", ".__on_column_open",
            e => Column.get($(e.target).closest("td").index(".closed_col")).toggle())
        // カラムボタン: カラムを閉じる
        $(document).on("click", ".__on_column_close",
            e => Column.get($(e.target).closest("td").index(".column_td")).toggle())
        // カラムボタン: 可変幅ON/OFF
        $(document).on("click", ".__on_column_flex",
            e => Column.get($(e.target).closest("td")).toggleFlex())
        // カラムボタン: リロード
        $(document).on("click", ".__on_column_reload",
            e => Column.get($(e.target).closest("td")).reload())
        // ユーザーアドレス: リモートのユーザー情報を表示
        $(document).on("click", ".__lnk_userdetail", e => User.getByAddress($(e.target).attr("name"))
            .then(user => user.createDetailWindow())
            .catch(jqXHR => toast("ユーザーの取得でエラーが発生しました.", "error")))
        // コンテンツ本文: 画像を拡大表示
        $(document).on("click", ".__on_media_expand", e => {
            // アプリケーションのアス比を計算
            const link = $(e.target).closest(".__on_media_expand")

            // 動画ファイル(GIFアニメも含む)
            if (link.attr("type") == 'video' || link.attr("type") == 'gifv') $("#header>#pop_expand_image").html(`
                <div class="expand_image_col">
                    <video src="${link.attr("href")}" autoplay controls loop></video>
                </div>`).show("slide", { direction: "right" }, 80)
            else { // それ以外は画像ファイル
                const window_aspect = window.innerWidth / window.innerHeight
                const image_aspect = link.attr("name")
                $("#header>#pop_expand_image")
                    .html(`<div class="expand_image_col"><img src="${link.attr("href")}"/></div>`)
                    .show("slide", { direction: "right" }, 80)
                if (image_aspect > window_aspect) // ウィンドウよりも画像のほうが横幅ながめ
                    $("#header>#pop_expand_image>.expand_image_col>img").css('width', '85vw').css('height', 'auto')
                else // ウィンドウよりも画像のほうが縦幅ながめ
                    $("#header>#pop_expand_image>.expand_image_col>img").css('height', '85vh').css('width', 'auto')
            }

            return false
        })
        // 画像以外をクリックすると画像ウィンドウを閉じる
        $("body").on("click", e => {
            if (!$(e.target).is(".expand_image_col>*")) $("#header>#pop_expand_image")
                // 閉じたときに動画が裏で再生されないように閉じた後中身を消す
                .hide("slide", { direction: "right" }, 80, () => $("#header>#pop_expand_image").empty())
        })
        // 投稿日付: 投稿の詳細表示
        $(document).on("click", ".__on_datelink", e => Status
            .getStatus($(e.target).closest("li").attr("name")).then(post => post.createDetailWindow()))
    }

    /**
     * #StaticMethod
     * カラムのボタンにツールチップを設定する
     */
    static tooltip() {
        // カラムオプションにツールチップ表示
        $("td .col_action").tooltip({
            position: {
                my: "center top",
                at: "center bottom"
            },
            show: {
                effect: "slideDown",
                duration: 100
            },
            hide: {
                effect: "slideUp",
                duration: 100
            }
        });
    }

    /**
     * #Method
     * このカラムのタイムラインをカラムのDOMにバインドする
     * (タイムライン取得のリクエストをすべて送ったタイミング(レスポンスが返ってきたかは問わない)で実行)
     */
    async onLoadTimeline(rest_promises) {
        // カラムのすべてのタイムラインを(成功失敗に関わらず)すべて終わったらバインド処理
        Promise.allSettled(rest_promises).then(results => {
            let all_rejected_flg = true
            const postlist = []
            // 取得に成功したPromiseだけで処理を実行
            results.filter(res => res.status == 'fulfilled').map(res => res.value).forEach(posts => {
                posts.forEach(p => this.addStatus(p, () => postlist.push(p)))
                all_rejected_flg = false
            })
            if (results.some(res => res.status == 'rejected')) // 取得に失敗したTLがひとつでもある場合
                $(`#${this.id} .col_action>.ic_column_warn`).css('display', 'inline-block') // 警告アイコンを表示

            if (!all_rejected_flg) { // ひとつでも取得に成功したタイムラインがある場合
                // すべてのデータを配列に入れたタイミングで配列を日付順にソートする
                postlist.sort((a, b) => b.sort_date - a.sort_date)
                // ロード画面削除
                $(`#${this.id}>.col_loading`).remove()
                // ソートが終わったらタイムラインをDOMに反映
                postlist.forEach(post => this.append(post))
                // 流速タイマーをセット
                this.initSpeedAnalyzer()
            } else { // すべてのカラムの取得に失敗した場合
                $(`#${this.id}>.col_loading>img`).attr('src', 'resources/illust/il_error.png')
                $(`#${this.id}>.col_loading>.loading_text`)
                    .text(`${this.pref.label_head}のタイムラインの取得に失敗しました……。`)
            }
        })
    }

    /**
     * #Method
     * 引数のステータスデータをこのカラムの末尾に追加する
     * (最初のタイムライン取得処理で使用)
     * 
     * @param post カラムに追加するステータスデータ
     */
    append(post) {
        $(`#${this.id}>ul`).append(post.element)
    }

    /**
     * #Method
     * 引数のステータスデータをこのカラムの先頭に追加する
     * (WebSocketによるStreaming APIからのデータバインドで使用)
     * 
     * @param post カラムに追加するステータスデータ
     */
    prepend(post) {
        const ul = $(`#${this.id}>ul`)
        // 重複している投稿を除外する
        this.addStatus(post, () => {
            // タイムラインキャッシュが限界に到達していたら後ろから順にキャッシュクリアする
            if (ul.find("li").length >= Column.TIMELINE_LIMIT) this.removeStatus(ul.find("li:last-child"))
            ul.prepend(post.element)
            ul.find('li:first-child').hide().show("slide", { direction: "up" }, 180)
            // 未読カウンターを上げる
            $(`#${this.id}_closed>h2>.unread`).text(++this.unread)
            this.counter++
        })

        // 通知が来た場合は通知ウィンドウに追加
        if (post.type == 'notification') window.accessApi.notification(post.notification)
    }

    /**
     * #Method
     * このカラムに存在する投稿のDOMのjQueryオブジェクトをユニークキーを使って返却する
     * 
     * @param status_key 対象の投稿のユニークキー
     */
    getStatusElement(status_key) {
        return $(`#${this.id}>ul>li[id="${status_key}"]`)
    }

    /**
     * #Method
     * 引数のステータスデータが既にこのカラムに存在するかどうか検査する
     * 存在しない場合はセットにキーを追加して追加用のコールバック関数を実行
     * 
     * @param post カラムに追加するステータスデータ
     * @param callback 重複していなかった時に実行するコールバック関数
     */
    addStatus(post, callback) {
        // 重複している、もしくはミュート対象の場合はコールバック関数の実行を無視する
        if (!this.status_map.has(post.status_key) && !post.muted) {
            // ユニークキーをキーに、ステータスインスタンスを持つ(Timelineと相互参照するため)
            this.status_map.set(post.status_key, post)
            post.from_timeline.id_list = post
            callback()
        }
    }

    /**
     * #Method
     * タイムライン流速計測タイマーをセットする
     */
    async initSpeedAnalyzer() {
        if (!this.timer_id) clearInterval(this.timer_id) // 実行中の場合は一旦削除
        this.timer_id = setInterval(() => (async () => {
            const ppm = this.counter
            this.counter = 0 // 先にカウンターを0にリセット
            this.ppm_que.push(ppm)
            if (this.ppm_que.length > 60) this.ppm_que.shift() // 1時間過ぎたら先頭から削除
            // pph(post per hour)を計算
            const pph = Math.round((this.ppm_que.reduce((pv, cv) => pv + cv) * (60 / this.ppm_que.length)) * 10) / 10
            const insert_text = `${pph}p/h${this.ppm_que.length < 10 ? '(E)' : ''}`

            const target = $(`#${this.id}`)
            target.find(".col_head h6").html(insert_text)
            target.prev().find("h2 .speed").html(insert_text)
        })(), 60000) // 1分おきに実行
    }

    /**
     * #Method
     * 引数のjQueryオブジェクトに該当する投稿データを画面から消去する
     * 
     * @param jqelm 消去対象の投稿のjQueryオブジェクト
     */
    removeStatus(jqelm) {
        const post = this.status_map.get(jqelm.attr("id"))
        post.from_timeline.status_key_map.delete(post.status_id)
        this.status_map.delete(post.status_key)
        jqelm.remove()
    }

    /**
     * #StaticMethod
     * 検索カラムに入力された情報をもとに検索処理を実効する
     */
    static async search() {
        // 一旦中身を全消去する
        $('#pop_ex_timeline').find(".col_loading").remove()
        $('#pop_ex_timeline').find("ul").empty()
        $('#pop_ex_timeline').find("ul").before(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        const query = $("#header>#pop_ex_timeline #__txt_search_query").val()
        const search_col = Column.SEARCH_COL
        const rest_promises = []
        search_col.status_map = new Map()
        // すべてのアカウントから検索処理を実行(検索結果をPromise配列に)
        Account.each(account => rest_promises.push(account.search(query)))
        // すべての検索結果を取得したらカラムにバインド
        search_col.onLoadTimeline(rest_promises)
    }

    /**
     * #Method
     * このカラムにカーソルを設定
     */
    setCursor() {
        const elm = $(`#${this.id}`)
        elm.addClass("__target_col")
            .find(".ic_column_cursor").append('<img src="resources/ani_cur.png" class="ic_cursor"/>')
        // カーソルをセットしたところまでスクロール
        elm.get()[0].scrollIntoView({ inline: 'nearest' })
    }

    /**
     * #StaticMethod
     * 現在カーソルのついているカラムのインスタンスを取得
     */
    static getCursor() {
        return Column.get($(".__target_col"))
    }

    /**
     * #StaticMethod
     * 現在カーソルのついているカラムからカーソルを消去してカラムのインスタンスを取得
     */
    static disposeCursor() {
        const target = Column.getCursor()
        $(".__target_col").removeClass("__target_col").find(".ic_cursor").remove()
        return target
    }

    /**
     * #Method
     * このカラムの表示/非表示を切り替える
     */
    toggle() {
        const target = $(`#${this.id}`)
        if (this.open_flg) {
            // Open⇒Close
            if ($(".column_td:visible").length <= 1) {
                // 全部のカラムを閉じようとしたら止める
                toast("すべてのカラムを閉じることはできません。", "error")
                return
            }
            // 自身を閉じて左隣の短縮カラムを表示
            const closed_col = target.prev()
            target.hide()
            this.unread = 0 // 未読数をリセット
            closed_col.find("h2>.unread").empty()
            closed_col.show()
            this.open_flg = false
        } else {
            // Close⇒Open
            target.prev().hide()
            target.show()
            this.open_flg = true
        }
        return this.open_flg
    }

    /**
     * #Method
     * このカラムを開く(すでに表示している場合はなにもしない)
     */
    open() {
        if (!this.open_flg) this.toggle()
    }

    /**
     * #Method
     * このカラムを閉じる(すでに非表示の場合はなにもしない)
     */
    close() {
        if (this.open_flg) this.toggle()
    }

    /**
     * #Method
     * このカラムの可変幅設定のON/OFFを切り替える
     */
    toggleFlex() {
        const target = $(`#${this.id}`)
        const img = target.find(".ic_column_flex")
        if (!this.flex) {
            // OFF⇒ON
            target.css('width', 'auto')
            img.attr('src', 'resources/ic_flex_on.png')
            this.flex = true
        } else {
            // ON⇒OFF
            target.css('width', `${this.pref.col_width}px`)
            img.attr('src', 'resources/ic_flex_off.png')
            this.flex = false
        }
    }

    /**
     * #Method
     * このカラムのスクロール位置を引数の値だけ上下する
     * 0を設定した場合は無条件で先頭までスクロールする
     *
     * @param to スクロールする量(0をセットで先頭まで移動)
     */
    scroll(to) {
        const target = $(`#${this.id}>ul`)
        // 引数が0の場合は先頭までスクロール
        if (to == 0) {
            target.scrollTop(0)
            return
        }
        let pos = target.scrollTop() + to
        target.scrollTop(pos > 0 ? pos : 0)
    }

    /**
     * #Method
     * このカラムをリロードする
     */
    reload() {
        // 一旦中身を全消去する
        $(`#${this.id}`).find(".col_loading").remove()
        $(`#${this.id}`).find("ul").empty()
        $(`#${this.id}`).find("ul").before(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        const rest_promises = []
        this.status_map = new Map()
        // カラムのタイムラインを走査して配列のAPI呼び出しパラメータを使ってタイムラインを生成
        this.timelines.forEach(tl => rest_promises.push(tl.getTimeline()))
        // カラムのすべてのタイムラインが取得し終えたらタイムラインをバインド
        this.onLoadTimeline(rest_promises)
    }

    // Getter: このカラムの右横のカラムを取得(ローテーション)
    get next() {
        let index = $(`#${this.id}`).index(".column_td") + 1
        // 右端の場合は最初の要素を選択
        if ($(".column_td").length <= index) index = 0
        return Column.get(index)
    }

    // Getter: このカラムの右横の開いているカラムを取得(ローテーション)
    get opened_next() {
        let index = $(`#${this.id}`).index(".column_td:visible") + 1
        // 右端の場合は最初の要素を選択
        if ($(".column_td:visible").length <= index) index = 0
        return Column.get($(".column_td:visible").eq(index))
    }

    // Getter: このカラムの左横のカラムを取得(ローテーション)
    get prev() {
        let index = $(`#${this.id}`).index(".column_td") - 1
        // 左端の場合は最後の要素を選択
        if (index < 0) index = $(".column_td").length - 1
        return Column.get(index)
    }

    // Getter: このカラムの左横の開いているカラムを取得(ローテーション)
    get opened_prev() {
        let index = $(`#${this.id}`).index(".column_td:visible") - 1
        // 右端の場合は最初の要素を選択
        if (index < 0) index = $(".column_td:visible").length - 1
        return Column.get($(".column_td:visible").eq(index))
    }
}

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
            this.unread = 0
            this.counter = 0
            this.ppm_que = []
            this.timer_id = null
            this.flex = pref.d_flex
            this.open_flg = !pref.d_hide
            this.search_flg = false

            // グループはインスタンスを作って管理
            const gps = new Map()
            pref.groups.forEach((gp, index) => {
                gp.index = index
                gps.set(gp.group_id, new Group(gp, this))
            })
            this.group_map = gps
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
     * #StaticMethod
     * カラムデータが存在しない場合trueを返す
     */
    static isEmpty() {
        return Column.map.size == 0
    }

    getGroup(id) {
        return this.group_map.get(id)
    }

    /**
     * #Method
     * このカラムのタイムラインプロパティを走査
     * 
     * @param callback 要素ごとに実行するコールバック関数
     */
    eachGroup(callback) {
        this.group_map.forEach((v, k) => callback(v))
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
                <div class="rotate_head">
                    <h2>${this.pref.label_head}</h2>
                </div>
            </td>
        `; html /* 開いた状態のカラム */ += `
            <td id="${this.id}" class="column_td">
                <div class="col_head">
                    <h2>${this.pref.label_head}</h2>
                    <div class="ic_column_cursor">${num_img}</div>
                    <h6></h6>
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
                <div class="col_tl_groups">
                </div>
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

        // タイムライングループをセット
        this.eachGroup(gp => {
            $(`#${this.id}>.col_tl_groups`).append(gp.create())
            $(`#${this.id}_closed>.rotate_head`).append(gp.createClosedLabel())
        })
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
        $(document).on("click", ".tl_group_box", e => {
            const target_col = Column.get($(e.target).closest("td"))
            Column.disposeCursor()
            target_col.setCursor()
            const target_gp = target_col.getGroup($(e.target).closest(".tl_group_box").attr("id"))
            Group.disposeCursor()
            target_gp.setCursor()
        })
        // カラムボタン: トップへ移動
        $(document).on("click", ".__on_column_top", // カラム内のグループすべてトップに移動
            e => Column.get($(e.target).closest("td")).eachGroup(gp => gp.scroll(0)))
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
        $(document).on("click", ".__on_column_reload", // カラム内のグループすべてリロード
            e => Column.get($(e.target).closest("td")).eachGroup(gp => gp.reload()))
        // グループボタン: トップへ移動
        $(document).on("click", ".__on_group_top", e => Column.get($(e.target).closest("td"))
            .getGroup($(e.target).closest(".tl_group_box").attr("id")).scroll(0))
        // グループボタン: リロード
        $(document).on("click", ".__on_group_reload", e => Column.get($(e.target).closest("td"))
            .getGroup($(e.target).closest(".tl_group_box").attr("id")).reload())
        // ユーザーアドレス: リモートのユーザー情報を表示
        $(document).on("click", ".__lnk_userdetail", e => User.getByAddress($(e.target).attr("name"))
            .then(user => user.createDetailWindow())
            .catch(jqXHR => toast("ユーザーの取得でエラーが発生しました.", "error")))
        // コンテンツ本文: 画像を拡大表示
        $(document).on("click", ".__on_media_expand", e => {
            // アプリケーションのアス比を計算
            const link = $(e.target).closest(".__on_media_expand")

            // 動画ファイル(GIFアニメも含む)
            if (link.attr("type") == 'video' || link.attr("type") == 'gifv') $("#pop_expand_image").html(`
                <div class="expand_image_col">
                    <video src="${link.attr("href")}" autoplay controls loop></video>
                </div>`).show("slide", { direction: "right" }, 80)
            else { // それ以外は画像ファイル
                const window_aspect = window.innerWidth / window.innerHeight
                const image_aspect = link.attr("name")
                $("#pop_expand_image")
                    .html(`<div class="expand_image_col"><img src="${link.attr("href")}"/></div>`)
                    .show("slide", { direction: "right" }, 80)
                if (image_aspect > window_aspect) // ウィンドウよりも画像のほうが横幅ながめ
                    $("#pop_expand_image>.expand_image_col>img").css('width', '85vw').css('height', 'auto')
                else // ウィンドウよりも画像のほうが縦幅ながめ
                    $("#pop_expand_image>.expand_image_col>img").css('height', '85vh').css('width', 'auto')
            }

            return false
        })
        // 画像以外をクリックすると画像ウィンドウを閉じる
        $("body").on("click", e => {
            if (!$(e.target).is(".expand_image_col>*")) $("#pop_expand_image")
                // 閉じたときに動画が裏で再生されないように閉じた後中身を消す
                .hide("slide", { direction: "right" }, 80, () => $("#pop_expand_image").empty())
        })
        // 投稿日付: 投稿の詳細表示
        $(document).on("click", ".__on_datelink", e => Status
            .getStatus($(e.target).closest("li").attr("name")).then(post => post.createDetailWindow()))
        // リストTL: 投稿のポップアップ表示
        $(document).on("click", "li.short_timeline", e => {
            const target_li = $(e.target).closest("li")
            Column.get($(e.target).closest("td")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus(target_li).createExpandWindow(target_li)
        })
        // 短縮TL: 投稿のポップアップを消す(ポップアップから出た時)
        $(document).on("mouseleave", "#pop_expand_post>ul>li", e => $("#pop_expand_post").hide("fade", 80))
    }

    /**
     * #StaticMethod
     * カラムのボタンにツールチップを設定する
     */
    static tooltip() {
        // カラムオプションにツールチップ表示
        $("td .col_action, .tl_group_box .gp_action").tooltip({
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

        const query = $("#pop_ex_timeline #__txt_search_query").val()
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
        elm.find(".tl_group_box:first-child").addClass("__target_group")
            .find(".ic_group_cursor").append('<img src="resources/ani_cur.png" class="ic_cursor"/>')
        // カーソルをセットしたところまでスクロール
        elm.get(0).scrollIntoView({ inline: 'nearest' })
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
        $(".__target_group").removeClass("__target_group").find(".ic_cursor").remove()
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
            this.eachGroup(gp => gp.unread = 0)
            closed_col.find(".group_label>.unread_count").empty()
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

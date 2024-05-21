/**
 * #Class
 * カラムを管理するクラス
 *
 * @author @tizerm@misskey.dev
 */
class Column {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref) {
        this.pref = pref
        this.index = pref.index
        this.unread = 0
        this.counter = 0
        this.ppm_que = []
        this.timer_id = null
        this.flex = pref.d_flex
        this.open_flg = !pref.d_hide

        // グループはインスタンスを作って管理
        const gps = new Map()
        pref.groups.forEach((gp, index) => {
            gp.index = index
            gps.set(gp.group_id, new Group(gp, this))
        })
        this.group_map = gps
    }

    // Getter: カラムの一意識別IDを取得
    get id() { return this.pref.column_id }
    // Getter: カラムのjQueryオブジェクト
    get element() { return $(`#${this.id}`) }
    // Getter: カラムのjQueryオブジェクト
    get close_element() { return $(`#${this.id}_closed`) }

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
    }

    /**
     * #StaticMethod
     * カラムプロパティを取得
     * 
     * @param arg 取得に使う引数
     */
    static get(arg) {
        // 数値型だった場合インデクスとして番号からプロパティを取得
        if (typeof arg == 'number') return Column.map.get($(".column_box").eq(arg).attr("id"))
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
        return Column.get($(".column_box:visible").first())
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

    /**
     * #Method
     * このカラムに属するグループをIDで取得
     * 
     * @param id グループID
     */
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
            <div id="${this.id}_closed" class="closed_col">
                ${num_img}
                <div class="col_action">
                    <a class="__on_column_open" title="カラムを開く">
                        <img src="resources/ic_right.png" alt="カラムを開く"/>
                    </a>
                </div>
                <div class="rotate_head">
                    <h2>${this.pref.label_head}</h2>
                </div>
            </div>
        `; html /* 開いた状態のカラム */ += `
            <div id="${this.id}" class="column_box ${this.pref.d_flex ? 'flex_col' : 'fixed_col'}">
                <div class="col_head">
                    <h2>${this.pref.label_head}</h2>
                    <div class="ic_column_cursor">${num_img}</div>
                    <div class="col_action">
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
            </div>
        `
        // テーブルにバインド(対象が複数に渡るので一度バインドしてから表示制御)
        $("#columns").append(html)

        // カラムの色と幅を変更
        $(`#${this.id}>.col_head, #${this.id}_closed`).css("background-color", `#${this.pref.col_color}`)

        // デフォルトで閉じる場合は表示を反転
        if (this.pref.d_hide) {
            this.element.hide()
            this.close_element.show()
        }

        // タイムライングループをセット
        this.eachGroup(gp => {
            $(`#${this.id}>.col_tl_groups`).append(gp.create())
            $(`#${this.id}_closed>.rotate_head`).append(gp.createClosedLabel())
        })
    }

    /**
     * #Method
     * このカラムにカーソルを設定
     */
    setCursor() {
        this.element.addClass("__target_col")
            .find(".ic_column_cursor").append('<img src="resources/ani_cur.png" class="ic_cursor"/>')
        this.element.find(".tl_group_box:first-child").addClass("__target_group")
            .find(".ic_group_cursor").append('<img src="resources/ani_cur.png" class="ic_cursor"/>')
        // カーソルをセットしたところまでスクロール
        this.element.get(0).scrollIntoView({ inline: 'nearest' })
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
        if (this.open_flg) {
            // Open⇒Close
            if ($(".column_box:visible").length <= 1) {
                // 全部のカラムを閉じようとしたら止める
                Notification.info("すべてのカラムを閉じることはできません.")
                return
            }
            // 自身を閉じて左隣の短縮カラムを表示
            this.element.hide()
            this.eachGroup(gp => gp.unread = 0)
            this.close_element.find(".group_label>.unread_count").empty()
            this.close_element.show()
            this.open_flg = false
        } else {
            // Close⇒Open
            this.close_element.hide()
            this.element.show()
            this.open_flg = true
            // 開いたカラムまでスクロール
            this.element.get(0).scrollIntoView({ inline: 'nearest' })
        }
        Column.setWidthLimit()
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
        const img = this.element.find(".ic_column_flex")
        if (!this.flex) {
            // OFF⇒ON
            this.element.addClass('flex_col').removeClass('fixed_col')
            img.attr('src', 'resources/ic_flex_on.png')
            this.flex = true
        } else {
            // ON⇒OFF
            this.element.removeClass('flex_col').addClass('fixed_col')
            img.attr('src', 'resources/ic_flex_off.png')
            this.flex = false
        }
        Column.setWidthLimit()
    }

    /**
     * #Method
     * このカラムをリロードする
     */
    reload() {
        // 一旦中身を全消去する
        this.element.find(".col_loading").remove()
        this.element.find("ul").empty()
        this.element.find("ul").before(`
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
        let index = this.element.index(".column_box") + 1
        // 右端の場合は最初の要素を選択
        if ($(".column_box").length <= index) index = 0
        return Column.get(index)
    }

    // Getter: このカラムの右横の開いているカラムを取得(ローテーション)
    get opened_next() {
        let index = this.element.index(".column_box:visible") + 1
        // 右端の場合は最初の要素を選択
        if ($(".column_box:visible").length <= index) index = 0
        return Column.get($(".column_box:visible").eq(index))
    }

    // Getter: このカラムの左横のカラムを取得(ローテーション)
    get prev() {
        let index = this.element.index(".column_box") - 1
        // 左端の場合は最後の要素を選択
        if (index < 0) index = $(".column_box").length - 1
        return Column.get(index)
    }

    // Getter: このカラムの左横の開いているカラムを取得(ローテーション)
    get opened_prev() {
        let index = this.element.index(".column_box:visible") - 1
        // 右端の場合は最初の要素を選択
        if (index < 0) index = $(".column_box:visible").length - 1
        return Column.get($(".column_box:visible").eq(index))
    }

    /**
     * #StaticMethod
     * 横幅の限界値を再計算する.
     */
    static setWidthLimit() {
        const box_width = window.innerWidth - 64
        let total_width = 0
        let flex_width = 0
        let flex_count = 0

        Column.each(col => { // カラム全体の横幅を計算
            const view_width = col.open_flg ? Number(col.pref.col_width) : 48
            total_width += view_width
            if (col.flex && col.open_flg) flex_count++
            else flex_width += view_width
        })

        // 空き幅を均等に分ける
        flex_width = Math.round((box_width - flex_width) / flex_count)

        Column.each(col => { // カラム全体の横幅の限界値を再設定
            if (col.flex) col.element.css('max-width',
                `${Math.min(box_width, Math.max(col.pref.col_width, flex_width))}px`)
            else col.element.css('max-width', '')
        })
    }

}

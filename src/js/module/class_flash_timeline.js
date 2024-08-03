/**
 * #Class
 * フラッシュタイムラインを生成するクラス
 *
 * @author @tizerm@misskey.dev
 */
class FlashTimeline {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(group, key) {
        this.__group_id = group.id
        this.ref_group = group

        // 日付順にソートされたキー配列を生成
        const status_list = []
        group.status_map.forEach((v, k) => status_list.push(v))
        this.key_list = status_list.sort((a, b) => a.sort_date - b.sort_date).map(s => s.status_key)

        // 現在のキーの位置を記録
        if (key) this.index = this.key_list.indexOf(key)
        // 親グループに保存済みのキーがある場合はそれを使用
        else if (this.ref_group.__flash_key) this.index = this.key_list.indexOf(this.ref_group.__flash_key)
        // キー情報がない場合は先頭(最古)に設定
        else this.index = 0
    }

    // Getter: ステータスマップ
    get status_map() { return this.ref_group.status_map }
    // Getter: 対象フラッシュタイムラインを一意に認識するためのキー
    get flash_key() { return `flash_${this.__timeline_uuid}` }

    // ウィンドウを一時保存するスタティックフィールド
    static FLASH_WINDOW_MAP = new Map()
    static CURRENT_WINDOW = null

    createWindow() {
        // 既に開いているウィンドウを削除
        $("#pop_multi_window>.flash_window>.window_buttons>.window_close_button").click()

        // 一意認識用のUUIDを生成
        this.__timeline_uuid = crypto.randomUUID()
        const window_key = `flash_window_${this.__timeline_uuid}`

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="flash_window ex_window">
                    <h2><span>${this.ref_group.pref.label_head}</span></h2>
                    <div class="window_buttons">
                        <input type="checkbox" class="__window_opacity" id="__window_opacity_${this.__timeline_uuid}"/>
                        <label for="__window_opacity_${this.__timeline_uuid}" class="window_opacity_button" title="透過"><img
                            src="resources/ic_alpha.png" alt="透過"/></label>
                        <button type="button" class="window_close_button" title="閉じる"><img
                            src="resources/ic_not.png" alt="閉じる"/></button>
                    </div>
                    <div class="timeline">
                        <button type="button" class="__on_flash_prev flash_button"><img
                            src="resources/ic_left.png" alt="戻る"/></button>
                        <ul id="${this.flash_key}" class="flash_tl __context_posts"></ul>
                        <button type="button" class="__on_flash_next flash_button"><img
                            src="resources/ic_right.png" alt="次へ"/></button>
                    </div>
                    <div class="footer">
                        <div class="flash_page"></div>
                    </div>
                </div>
            `,
            color: this.ref_group.pref.gp_color,
            resizable: false,
            drag_axis: false,
            resize_axis: "all"
        })

        // 投稿をバインド
        this.bind()
        FlashTimeline.FLASH_WINDOW_MAP.set(this.flash_key, this)
        FlashTimeline.CURRENT_WINDOW = this
    }

    // Getter: 現在のステータス
    get current() { return this.status_map.get(this.key_list[this.index]) }

    bind() {
        const post = this.current
        const elm = $(`#${this.flash_key}`).closest(".flash_window")
        if (post) { // 投稿データが取得できた場合
            // 強制的に通常表示にしてバインド
            post.detail_flg = false
            post.popout_flg = true
            $(`#${this.flash_key}`).html(post.element)

            // ページを計算してグラフ化
            const rate = floor(((this.index + 1) / this.key_list.length) * 100, 1)
            elm.find(".footer>.flash_page").css('background-image',
                `linear-gradient(to right, ${post.relative_time.color} ${rate}%, #222222 ${rate}%)`)
        } else $(`#${this.flash_key}`).html(`<li>(表示できない投稿です)</li>`)
        elm.find(".footer>.flash_page").text(`${this.index + 1}/${this.key_list.length}`)

        // インデクスによって先送りボタンを変更
        if (this.index == this.key_list.length - 1) elm.find(".timeline>.__on_flash_next").addClass("next_close")
            .find("img").attr("src", "resources/ic_not.png")
        else elm.find(".timeline>.__on_flash_next").removeClass("next_close")
            .find("img").attr("src", "resources/ic_right.png")
    }

    next() {
        // 最終投稿で送ろうとした場合は画面を閉じる
        if (this.index == this.key_list.length - 1) {
            $("#pop_multi_window>.flash_window>.window_buttons>.window_close_button").click()
            return this
        }
        this.index++
        this.__key = null
        return this
    }

    prev() {
        if (this.index > 0) this.index--
        this.__key = null
        return this
    }

    step(count) {
        this.index += count
        if (this.index >= this.key_list.length) this.index = this.key_list.length - 1
        else if (this.index < 0) this.index = 0
        this.__key = null
        return this
    }

    /*
    typeIndex(key) {
        // 前回入力値があってインデクスを超えていない場合は続けてインデクス化
        if (this.__key && (10 * this.index + key) < this.key_list.length)
            this.index = 10 * this.index + key
        else this.index = key
        // 前回入力したキーを保存
        this.__key = key
        return this
    }//*/

    /**
     * #StaticMethod
     * ローカルにキャッシュされているタイムラインウィンドウオブジェクトを取得する.
     * 
     * @param target 取得対象のターゲットDOM
     */
    static getWindow(target) {
        return FlashTimeline.FLASH_WINDOW_MAP.get(target.closest("ul.flash_tl").attr("id"))
    }

    /**
     * #StaticMethod
     * ローカルにキャッシュされているタイムラインウィンドウオブジェクトを削除する.
     * 
     * @param target 取得対象のターゲットDOM
     */
    static deleteWindow(target) {
        const key = target.find("ul.flash_tl").attr("id")
        const del_flash = FlashTimeline.FLASH_WINDOW_MAP.get(key)
        // 削除する前に最後に読んだキーをマップ
        del_flash.ref_group.__flash_key = del_flash.current?.status_key
        return FlashTimeline.FLASH_WINDOW_MAP.delete(key)
    }
}


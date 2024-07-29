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
                        <ul id="${this.flash_key}" class="flash_tl __context_posts"></ul>
                    </div>
                </div>
            `,
            color: this.ref_group.pref.gp_color,
            resizable: true,
            drag_axis: false,
            resize_axis: "all"
        })

        // 投稿をバインド
        this.bind(this.current)
        FlashTimeline.FLASH_WINDOW_MAP.set(this.flash_key, this)
        FlashTimeline.CURRENT_WINDOW = this
    }

    // Getter: 現在のステータス
    get current() { return this.status_map.get(this.key_list[this.index]) }
    // Getter: 次のステータス
    get next() { return this.status_map.get(this.key_list[++this.index]) }
    // Getter: 前のステータス
    get prev() { return this.status_map.get(this.key_list[--this.index]) }

    bind(post) {
        // 強制的に通常表示にする
        post.detail_flg = false
        post.popout_flg = true
        $(`#${this.flash_key}`).html(post.element)
    }

    bindNext() {
        this.bind(this.next)
    }

    bindPrev() {
        if (this.index <= 0) return // 何もしない
        this.bind(this.prev)
    }

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
        return FlashTimeline.FLASH_WINDOW_MAP.delete(target.find("ul.flash_tl").attr("id"))
    }
}


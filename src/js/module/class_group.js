﻿/**
 * #Class
 * タイムライングループを管理するクラス
 *
 * @author @tizerm@misskey.dev
 */
class Group {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref, column) {
        if (!column) { // 特殊グループ(検索、履歴など)
            this.pref = pref
            this.status_map = new Map()
            this.notification_map = new Map()
            this.search_flg = true
            return
        }
        this.pref = pref
        this.index = pref.index
        this.__column_id = column.id
        this.status_map = new Map()
        this.notification_map = new Map()
        this.unread = 0
        this.counter = 0
        this.ppm_que = []
        this.speed_timer_id = null
        this.color_timer_id = null
        this.search_flg = false

        // タイムラインはインスタンスを作って管理
        const tls = []
        pref.timelines.forEach(tl => tls.push(new Timeline(tl, this)))
        this.timelines = tls
    }

    // Getter: グループの一意識別IDを取得
    get id() { return this.pref.group_id }
    // Getter: このタイムラインが所属するカラム
    get parent_column() { return Column.get(this.__column_id) }
    // Getter: グループのjQueryオブジェクト
    get element() { return $(`#${this.id}`) }

    /**
     * #Method
     * このカラムのタイムラインプロパティを走査
     * 
     * @param callback 要素ごとに実行するコールバック関数
     */
    eachTimeline(callback) {
        this.timelines.forEach(callback)
    }

    // Getter: このグループの高さを返却する
    get height() {
        // 高さがnullでなければそのまま返却
        if (this.pref.gp_height) return this.pref.gp_height

        let others = 0
        this.parent_column.eachGroup(gp => others += Number(gp.pref.gp_height))
        return 100 - others
    }

    /**
     * #Method
     * このグループのDOMを生成してjQueryオブジェクトを返却する
     */
    create() {
        // カラム本体を空の状態で生成(ナンバーアイコンは10未満のカラムのみ表示)
        const num_img = this.index < 9 ? `<img src="resources/${this.index + 1}.png" class="ic_group_num"/>` : ''
        const jqelm = $($.parseHTML(`
            <div id="${this.id}" class="timeline tl_group_box">
                <div class="group_head">
                    <div class="ic_group_cursor">${num_img}</div>
                    <h4>${this.pref.label_head}</h4>
                    <h6>0.0p/h</h6>
                    <div class="gp_action">
                        <img src="resources/ic_warn.png" alt="何らかの問題が発生しました" class="ic_group_warn"/>
                        <a class="__on_group_reload" title="グループをリロード"
                            ><img src="resources/ic_reload.png" alt="グループをリロード"/></a>
                        <a class="__on_open_flash_last" title="フラッシュウィンドウを開く"
                            ><img src="resources/ic_flash.png" alt="フラッシュウィンドウを開く"/></a>
                        <a class="__on_group_top" title="トップへ移動"
                            ><img src="resources/ic_top.png" alt="トップへ移動"/></a>
                    </div>
                </div>
                <div class="col_loading">
                    <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                    <span class="loading_text">Now Loading...</span>
                </div>
                <ul class="__context_posts"></ul>
            </td>
        `))

        let box_color = null
        if (this.parent_column.pref.multi_group) {
            // 複数のタイムライングループを持つカラムの場合はタイムラインの高さを設定
            jqelm.closest(".tl_group_box").css("height", `${this.height}%`)
            jqelm.find("ul").css("height", 'calc(100% - 26px)')
            box_color = this.pref.gp_color
        } else { // 単一タイムライングループの場合はヘッダを非表示
            jqelm.find(".ic_group_cursor").hide()
            jqelm.find(".group_head>h4").hide()
            box_color = this.parent_column.pref.col_color
        }
        // カラー設定
        jqelm.find(".group_head").css("background-color", box_color)
        jqelm.find("ul").css({
            "border-left-color": box_color,
            "border-bottom-color": box_color
        })

        return jqelm
    }

    /**
     * #Method
     * このグループのカラムを閉じている時の情報のDOMを生成してjQueryオブジェクトを返却する
     */
    createClosedLabel() {
        // カラム本体を空の状態で生成(ナンバーアイコンは10未満のカラムのみ表示)
        const num_img = this.index < 9 && this.parent_column.pref.multi_group
            ? `<img src="resources/${this.index + 1}.png" class="ic_group_num"/>` : ''
        const jqelm = $($.parseHTML(`
            <span class="group_label" name="${this.id}">
                ${num_img}
                <span class="unread_count"></span>
                <span class="speed_meter">0.0p/h</span>
            </span>
        `))

        if (this.parent_column.pref.multi_group)
            jqelm.closest(".group_label").css("background-color", this.pref.gp_color)
        else // 単一タイムライングループの場合は背景を透過
            jqelm.closest(".group_label").css("background-color", 'transparent')
        return jqelm
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
                posts.forEach(p => this.addStatus({
                    post: p,
                    target_elm: null,
                    callback: (st, tgelm) => postlist.push(st)
                }))
                all_rejected_flg = false
            })
            if (results.some(res => res.status == 'rejected')) // 取得に失敗したTLがひとつでもある場合
                $(`#${this.id} .gp_action>.ic_group_warn`).css('display', 'inline-block') // 警告アイコンを表示

            if (!all_rejected_flg) { // ひとつでも取得に成功したタイムラインがある場合
                // すべてのデータを配列に入れたタイミングで配列を日付順にソートする
                postlist.sort((a, b) => b.sort_date - a.sort_date)
                // ロード画面削除
                $(`#${this.id}>.col_loading`).remove()
                // ソートが終わったらタイムラインをDOMに反映
                postlist.forEach(post => this.append(post))

                if (!this.search_flg) { // 流速タイマーをセット(検索のときはセットしない)
                    this.initSpeedAnalyzer()
                    this.initColorTimer()
                }
            } else { // すべてのカラムの取得に失敗した場合
                $(`#${this.id}>.col_loading>img`).attr('src', 'resources/illust/il_err2.png')
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
        $(`#${this.id}>ul`).append(post.timeline_element)
        post.bindAdditionalInfoAsync($(`#${this.id}>ul`))
    }

    /**
     * #Method
     * 引数のステータスデータをこのカラムの先頭に追加する
     * (WebSocketによるStreaming APIからのデータバインドで使用)
     * 
     * @param post カラムに追加するステータスデータ
     */
    prepend(post) {
        let limit = null
        switch (this.pref.tl_layout) {
            case 'chat': // チャット
                limit = Preference.GENERAL_PREFERENCE.tl_cache_limit.chat
                break
            case 'list': // リスト
                limit = Preference.GENERAL_PREFERENCE.tl_cache_limit.list
                break
            case 'media': // メディア
                limit = Preference.GENERAL_PREFERENCE.tl_cache_limit.media
                break
            case 'gallery': // ギャラリー
                limit = Preference.GENERAL_PREFERENCE.tl_cache_limit.gallery
                break
            default: // デフォルト(ノーマル)
                limit = Preference.GENERAL_PREFERENCE.tl_cache_limit.default
                break
        }

        // 重複している投稿を除外する
        this.addStatus({
            post: post,
            target_elm: $(`#${this.id}>ul`),
            callback: (st, tgelm) => {
                // タイムラインキャッシュが限界に到達していたら後ろから順にキャッシュクリアする
                let remove_flg = false
                if (tgelm.find("li").length >= limit) remove_flg = true

                // 投稿を先頭に追加
                tgelm.prepend(st.timeline_element)
                tgelm.find('li:first-child').hide().show(...Preference.getAnimation("TIMELINE_APPEND"))
                st.bindAdditionalInfoAsync(tgelm)

                // 未読カウンターを上げる
                $(`#${this.parent_column.id}_closed>.rotate_head>.group_label[name="${this.id}"]>.unread_count`)
                    .text(++this.unread)
                this.counter++
                if (remove_flg) this.removeStatus(tgelm.find("li:last-child"), false)

                // 通知が来た場合は通知ウィンドウに追加
                if (st.type == 'notification') window.accessApi.notification(st.notification)
            }
        })
    }

    /**
     * #Method
     * 投稿のDOM要素からStatusオブジェクトを返却する
     * 
     * @param status_key 対象の投稿のユニークキー
     */
    getStatus(target_li) {
        return this.status_map.get(target_li.attr("id"))
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
     * @param arg パラメータオブジェクト
     */
    addStatus(arg) {
        // 重複している、もしくはミュート対象の場合はコールバック関数の実行を無視する
        if (this.status_map.has(arg.post.status_key) || arg.post.muted) return

        // 通知の場合(オプションで有効にしている場合のみマージ)
        if (arg.post.notification_key && Preference.GENERAL_PREFERENCE.enable_merge_notification) {
            const merge_from = this.notification_map.get(arg.post.notification_key)
            if (merge_from) { // マージできる通知が存在する場合
                if (merge_from.contains(arg.post)) return // 通知が含まれていたら無視
                const [at, from] = merge_from.merge(arg.post)
                if (merge_from.status_key != at.status_key) { // マージ先の通知が既存の通知より新しい場合
                    // 通知キーとステータスキーをマップにセット
                    this.notification_map.set(at.notification_key, at)
                    this.status_map.set(at.status_key, at)
                    arg.post.from_timeline.id_list = at
                    // 既存の通知をマップとDOMから消去してコールバックを実行
                    arg.target_elm?.find(`li[id="${from.status_key}"]`).remove()
                    this.status_map.delete(from.status_key)
                    arg.callback(at, arg.target_elm)
                } else { // マージ先の通知が既存の通知より古い場合は既存の方を更新
                    if (at.is_follow) // フォローの場合は要素全体丸ごと書き換える
                        arg.target_elm?.find(`li[id="${at.status_key}"]`).replaceWith(at.timeline_element)
                    else arg.target_elm?.find(`li[id="${at.status_key}"]>.notification_summary`)
                        .replaceWith(at.summary_section)
                }
                return // マージ対象の場合は後続処理は無視
                // マージできる通知が存在しない場合はマップにセットして後続処理へ
            } else this.notification_map.set(arg.post.notification_key, arg.post)
        }

        // ユニークキーをキーに、ステータスインスタンスを持つ(Timelineと相互参照するため)
        this.status_map.set(arg.post.status_key, arg.post)
        arg.post.from_timeline.id_list = arg.post
        arg.post.from_timeline.captureNote(arg.post)
        arg.callback(arg.post, arg.target_elm)
    }

    /**
     * #Method
     * タイムライン流速計測タイマーをセットする
     */
    async initSpeedAnalyzer() {
        if (!this.speed_timer_id) clearInterval(this.speed_timer_id) // 実行中の場合は一旦削除
        this.speed_timer_id = setInterval(() => (async () => {
            const ppm = this.counter
            this.counter = 0 // 先にカウンターを0にリセット
            this.ppm_que.push(ppm)
            if (this.ppm_que.length > 60) this.ppm_que.shift() // 1時間過ぎたら先頭から削除
            // pph(post per hour)を計算
            const pph = floor(this.ppm_que.reduce((pv, cv) => pv + cv) * (60 / this.ppm_que.length), 1)
            const insert_text = `${pph}p/h${this.ppm_que.length < 10 ? '(E)' : ''}`

            // バインド
            this.element.find(".group_head>h6").html(insert_text)
            $(`#${this.parent_column.id}_closed>.rotate_head>.group_label[name="${this.id}"]>.speed_meter`)
                .html(insert_text)
        })(), 60000) // 1分おきに実行
    }

    /**
     * #Method
     * 投稿時間カラーラベルを再設定するタイマーをセットする
     */
    async initColorTimer() {
        if (!this.color_timer_id) clearInterval(this.color_timer_id) // 実行中の場合は一旦削除
        this.color_timer_id = setInterval(() => (async () => $(`#${this.id}>ul>li`).each((index, elm) => {
            const post = this.getStatus($(elm))
            const element = $(elm).is(".chat_timeline") ? $(elm).find(".content") : $(elm)

            try { // TODO: debug
                element.css('border-left-color', post.relative_time.color)
                $(elm).find(".created_at").text(post.date_text)
            } catch (err) {
                console.log(err)
                console.log(element.attr("id"))
                console.log(this)
            }
        }))(), 60000) // 1分おきに実行
    }

    /**
     * #Method
     * 引数のjQueryオブジェクトに該当する投稿データを画面から消去する
     * (キャッシュ破棄のためにDOMから要素を参照するようにしているのでこういうめんどくさい実装になってます)
     * 
     * @param jqelm 消去対象の投稿のjQueryオブジェクト
     */
    removeStatus(jqelm, delay) {
        const key = jqelm.attr("id")
        const post = this.status_map.get(key)

        post.from_timeline.status_key_map.delete(post.status_id)
        this.status_map.delete(post.status_key)
        // ギャラリーの場合は複数のまたがる可能性があるのでid検索して削除
        const del_elm = jqelm.parent().find(`li[id="${key}"]`)
        if (delay) // 遅延削除する場合は一旦時間をかけてフェードさせてから削除する
            del_elm.hide(...Preference.getAnimation("TIMELINE_DELETE"), () => del_elm.remove())
        // 遅延削除しない場合は即座にelementを削除
        else del_elm.remove()
    }

    /**
     * #Method
     * このグループにカーソルを設定
     */
    setCursor() {
        this.element.addClass("__target_group")
            .find(".ic_group_cursor").append('<img src="resources/ani_cur.png" class="ic_cursor"/>')
    }

    /**
     * #StaticMethod
     * 現在カーソルのついているカラムのインスタンスを取得
     */
    static getCursor() {
        return Column.get($(".__target_col")).getGroup($(".__target_col")
            .closest(".column_box").find(".__target_group").closest(".tl_group_box").attr("id"))
    }

    /**
     * #StaticMethod
     * 現在カーソルのついているカラムからカーソルを消去してカラムのインスタンスを取得
     */
    static disposeCursor() {
        const target = Group.getCursor()
        $(".__target_group").removeClass("__target_group").find(".ic_cursor").remove()
        return target
    }

    /**
     * #Method
     * このグループを警告表示にする(！を出す)
     *
     * @param bool trueで表示 falseで削除
     */
    setWarning(bool) {
        if (bool) this.element.find(".ic_group_warn").show()
        else this.element.find(".ic_group_warn").hide()
    }

    /**
     * #Method
     * このグループのスクロール位置を引数の値だけ上下する
     * 0を設定した場合は無条件で先頭までスクロールする
     *
     * @param to スクロールする量(0をセットで先頭まで移動)
     */
    scroll(to) {
        const to_num = Number(to) // 全体設定からだと文字列として扱われるのでパース
        const target = $(`#${this.id}>ul`)
        // 引数が0の場合は先頭までスクロール
        if (to_num == 0) {
            target.scrollTop(0)
            return
        }
        const pos = target.scrollTop() + to_num
        target.scrollTop(pos > 0 ? pos : 0)
    }

    /**
     * #Method
     * このグループをリロードする
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
        this.status_map.clear()
        this.notification_map.clear()
        // カラムのタイムラインを走査して配列のAPI呼び出しパラメータを使ってタイムラインを生成
        this.timelines.forEach(tl => { // 再取得する前にタイムラインキャッシュをリセット
            tl.reset()
            rest_promises.push(tl.getTimeline())
        })
        // カラムのすべてのタイムラインが取得し終えたらタイムラインをバインド
        this.onLoadTimeline(rest_promises)
    }

    /**
     * #Method
     * グループ内の指定したステータスキーを起点にしてフラッシュウィンドウを生成する.
     */
    createFlash(key) {
        const flash = new FlashTimeline(this, key)
        flash.createWindow()
        return flash
    }

    // Getter: このグループの下のグループを取得(ローテーション)
    get next() {
        const parent_selector = `#${this.parent_column.id} .col_tl_groups`
        let index = this.element.index(`${parent_selector}>.tl_group_box`) + 1
        // 右端の場合は最初の要素を選択
        if ($(`${parent_selector}>.tl_group_box`).length <= index) index = 0
        return this.parent_column.getGroup(this.element
            .closest(".col_tl_groups").find(".tl_group_box").eq(index).attr("id"))
    }

    // Getter: このグループの上のグループを取得(ローテーション)
    get prev() {
        const parent_selector = `#${this.parent_column.id} .col_tl_groups`
        let index = this.element.index(`${parent_selector}>.tl_group_box`) - 1
        // 左端の場合は最後の要素を選択
        if (index < 0) index = $(`${parent_selector}>.tl_group_box`).length - 1
        return this.parent_column.getGroup(this.element
            .closest(".col_tl_groups").find(".tl_group_box").eq(index).attr("id"))
    }

}

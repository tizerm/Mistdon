/**
 * #Class
 * タイムラインを管理するクラス(カラムに内包)
 *
 * @author @tizerm@misskey.dev
 */
class Timeline {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref, group) {
        this.pref = pref
        this.__group_id = group.id
        if (group.__column_id) this.__column_id = group.__column_id
        else this.__dummy_col = {}
        this.status_key_map = new Map()
        this.capture_queue = []
        this.ref_group = group
    }

    // Getter: このタイムラインのホスト(サーバードメイン)
    get host() { return this.pref.host }
    // Getter: このタイムラインのホスト(サーバードメイン)
    get platform() { return this.pref.platform }
    // Getter: 通知タイムライン判定
    get is_notification() { return this.pref.timeline_type == "notification" }
    // Getter: このタイムラインのアカウントのフルアドレス
    get account_key() { return this.pref.key_address }
    // Getter: このタイムラインのアカウント
    get target_account() { return Account.get(this.pref.key_address) }
    // Getter: このタイムラインが所属するカラム
    get parent_column() { return this.__column_id ? Column.get(this.__column_id) : this.__dummy_col }
    // Getter: このタイムラインが所属するグループ
    get parent_group() { return this.__column_id ? Column.get(this.__column_id).getGroup(this.__group_id) : this.ref_group }

    // Setter: ステータスIDをキーに持つ一意識別子のマップに挿入
    set id_list(arg) { this.status_key_map.set(arg.status_id, arg.status_key) }
    // Getter: このタイムラインのウィンドウキャッシュにアクセスするキー
    get timeline_key() { return `timeline_${this.__timeline_uuid}` }
    // Getter: 生成済みのウィンドウキーをDOMから参照
    get window_key() { return $(`#${this.timeline_key}`).closest(".timeline_window").attr("id") }

    // ウィンドウを一時保存するスタティックフィールド
    static TIMELINE_WINDOW_MAP = new Map()

    /**
     * #Method
     * このタイムラインの最新の投稿を30件取得する
     * (返り値は取得データのpromise)
     * 引数を指定した場合は、指定した投稿よりも前を30件取得する
     * 
     * @param max_id この投稿よりも前の投稿を取得する起点のID
     * @param since_id この投稿よりも後ろの投稿を取得する起点のID
     */
    async getTimeline(max_id, since_id) {
        // 外部サーバーでなくターゲットのアカウントが存在しない場合はreject
        if (!this.pref.external && !this.target_account) return Promise.reject('account not found.')
        // クエリパラメータにlimitプロパティを事前に追加(これはMastodonとMisskeyで共通)
        let query_param = structuredClone(this.pref.query_param)
        query_param.limit = 30
        let response = null
        try {
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    // ヘッダにアクセストークンをセット(認証済みの場合)
                    let header = {}
                    if (!this.pref.external) header = { "Authorization": `Bearer ${this.target_account.pref.access_token}` }
                    if (max_id) query_param.max_id = max_id
                    if (since_id) query_param.min_id = since_id
                    // REST APIで最新TLを30件取得、する処理をプロミスとして格納
                    response = await $.ajax({
                        type: "GET",
                        url: this.pref.rest_url,
                        dataType: "json",
                        headers: header,
                        data: query_param
                    })
                    // Mastodonの場合逆順にする
                    if (since_id) response = response.reverse()
                    break
                case 'Misskey': // Misskey
                    // クエリパラメータにアクセストークンをセット(認証済みの場合)
                    if (!this.pref.external) query_param.i = this.target_account.pref.access_token
                    if (max_id) query_param.untilId = max_id
                    if (since_id) query_param.sinceId = since_id
                    // REST APIで最新TLを30件取得、する処理をプロミスとして格納
                    response = await $.ajax({
                        type: "POST",
                        url: this.pref.rest_url,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    break
                default:
                    break
            }

            // 投稿データをソートマップ可能なオブジェクトにして返却
            const posts = []
            if (this.is_notification) // 通知タイムラインの場合は専用クラスで生成
                response.forEach(p => posts.push(new NotificationStatus(p, this, this.target_account)))
            else response.forEach(p => posts.push(new Status(p, this, this.target_account)))
            return posts
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            if (this.parent_column?.pref?.label_head) // 通常タイムラインの取得ミス
                Notification.error(`${this.parent_column.pref.label_head}の${this.account_key}のタイムラインの取得に失敗しました.`)
            else Notification.error(`${this.host}のタイムラインの取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    /**
     * #Method
     * このタイムラインのWebSocket設定パラメータをアカウント情報にわたす
     * WebSocket通信でメッセージ受信時のイベント関数もここで定義する
     * (この段階ではWebSocketへはまだ接続しない)
     */
    setSocketParam() {
        // 外部サーバーでなくターゲットのアカウントが存在しない場合はなにもしない
        if (!this.pref.external && !this.target_account) return

        let message_callback = null
        let send_param = null

        // プラットフォーム判定
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                // !==========> メッセージ受信時のコールバック関数
                message_callback = (event) => {
                    const data = JSON.parse(event.data)

                    // TLと違うStreamは無視
                    if (data.stream[0] != this.pref.socket_param.stream) return
                    // TLと違うリストは無視
                    if (this.pref.socket_param.stream == 'list' && data.stream[1] != this.pref.socket_param.list) return

                    // タイムラインの更新通知
                    if (data.event == "update") // 通常の投稿
                        this.parent_group.prepend(new Status(JSON.parse(data.payload), this, this.target_account))
                    else if (this.is_notification && data.event == "notification") // 通知
                        this.parent_group.prepend(new NotificationStatus(JSON.parse(data.payload), this, this.target_account))
                    // 削除された投稿を検知
                    else if (data.event == "delete") this.removeStatus(data.payload)
                    // 更新された投稿を検知
                    else if (data.event == "status.update")
                        this.updateStatus(new Status(JSON.parse(data.payload), this, this.target_account))
                }
                // !==========> ここまで

                // 購読パラメータの設定
                this.pref.socket_param.type = "subscribe"
                send_param = JSON.stringify(this.pref.socket_param)
                break
            case 'Misskey': // Misskey
                const uuid = crypto.randomUUID()
                // !==========> メッセージ受信時のコールバック関数
                message_callback = (event) => {
                    const data = JSON.parse(event.data)

                    // TLと違うStreamは無視
                    if (data.body.id != uuid) return
                    if (data.body.type == "note") // 通常の投稿
                        this.parent_group.prepend(new Status(data.body.body, this, this.target_account))
                    else if (this.is_notification && data.body.type == "notification") // 通知
                        this.parent_group.prepend(new NotificationStatus(data.body.body, this, this.target_account))
                }
                // !==========> ここまで

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
        // 認証アカウントの場合はアカウント情報にソケット設定を送信
        if (!this.pref.external) this.target_account.addSocketPref({
            target_group: this.parent_group,
            send_param: send_param,
            messageFunc: message_callback
        })
        // 外部インスタンスの場合はconnectExternalを呼び出してWebSocket接続
        else this.connectExternal({
            send_param: send_param,
            messageFunc: message_callback,
            openFunc: () => {},
            closeFunc: () => { // 一時切断でポップアップを表示しない設定の場合は表示しない
                if (!Preference.GENERAL_PREFERENCE.disable_disconnect_pop)
                    Notification.info(`${this.host}との接続が一時的に切断されました.`)
            },
            reconnect: true
        })
    }

    /**
     * #Method
     * タイムライン自動更新タイマーをセットする
     */
    async initAutoReloader() {
        if (!this.reload_timer_id) clearInterval(this.reload_timer_id) // 実行中の場合は一旦削除
        this.reload_timer_id = setInterval(() => (async () => {
            // 最新のタイムラインを取得
            const recent = await this.getTimeline()
            // 逆から順にタイムラインに追加
            recent.reverse().forEach(post => this.parent_group.prepend(post))
        })(), this.pref.reload_span * 60000)
    }

    /**
     * #Method
     * インプレッション自動マージタイマーをセットする
     */
    async initAutoMerger() {
        if (!Preference.GENERAL_PREFERENCE.tl_impression?.enabled || this.is_notification
            || this.target_account.is_skybridge
            || this.parent_group.pref.tl_layout == 'gallery') return // 通知とギャラリーは実行しない
        if (!this.reload_timer_id) clearInterval(this.reload_timer_id) // 実行中の場合は一旦削除
        this.reload_timer_id = setInterval(() => this.mergeImpressions(),
            Preference.GENERAL_PREFERENCE.tl_impression?.span * 60000)
    }

    /**
     * #Method
     * タイムラインを取得して最新のインプレッション情報をセットする
     */
    async mergeImpressions() {
        // 最新のタイムラインを取得
        const recent = await this.getTimeline()
        const group = this.parent_group

        recent.forEach(post => {
            if (!group.status_map.has(post.status_key)) return // ないときは省略
            group.status_map.set(post.status_key, post) // ステータスを更新
            if (!post.__prm_remote_status) // インプレッションの表示内容を更新(BTRNを除外)
                group.getStatusElement(post.status_key).find('.impressions').replaceWith(post.impression_section)
        })
    }

    /**
     * #Method
     * このタイムラインから外部インスタンスにWebSocket接続する
     * 
     * @param arg パラメータオブジェクト
     */
    async connectExternal(arg) {
        // WebSocket接続を開始
        this.socket = new WebSocket(this.pref.socket_url)
        this.reconnect = arg.reconnect

        // WebSocket接続開始時処理
        this.socket.addEventListener("open", (event) => {
            // 接続開始用コールバック関数を実行
            arg.openFunc()
            // ソケットに受信設定を送信
            this.socket.send(arg.send_param)
        })
        // エラーハンドラ
        this.socket.addEventListener("error", (event) => {
            Notification.error(`${this.host}で接続エラーが発生しました、再接続してください。`)
            // エラーで切れた場合は再接続しない
            this.reconnect = false
            console.log(event)
        })
        // WebSocket接続停止時処理
        this.socket.addEventListener("close", (event) => {
            // 接続停止用コールバック関数を実行
            arg.closeFunc()
            // 自身を呼び出して再接続
            if (this.reconnect) this.connectExternal(arg)
            console.log(event)
        })
        // 受信処理を設定
        this.socket.addEventListener("message", arg.messageFunc)
    }

    captureNote(post) {
        if (this.platform != 'Misskey' || this.pref.external || this.pref.timeline_type == 'notification') return

        const socket = this.target_account.socket
        // キューの先頭に対象の投稿データを追加
        this.capture_queue.unshift(post)

        let sender = JSON.stringify({ // WebSocketにCaptureリクエストを送信
            "type": "channel",
            "body": {
                "id": this.pref.socket_param.id,
                "type": "subNote",
                "body": { "id": post.id }
            }
        })

        socket.send(sender)

        // キャプチャキューが30超えてる場合PopしてWebSocketにUnCaptureリクエストを送信
        if (this.capture_queue.length > 30) socket.send(JSON.stringify({
            "type": "unsubNote",
            "body": { "id": this.capture_queue.pop().id }
        }))
    }

    /**
     * #Method
     * このタイムラインに保存してあるステータス情報を削除する.
     * 
     * @param id 投稿ID
     */
    removeStatus(id) {
        const status_key = this.status_key_map.get(id)

        // タイムラインに存在する投稿だけ削除対象とする
        if (status_key) this.parent_group.removeStatus(this.parent_group.getStatusElement(status_key), true)
    }

    /**
     * #Method
     * このタイムラインに保存してあるステータス情報を編集内容で更新する.
     * 
     * @param post 編集後の投稿オブジェクト
     */
    updateStatus(post) {
        const status_key = this.status_key_map.get(post.id)

        // タイムラインに存在する投稿だけ修正対象とする
        if (status_key) this.parent_group.updateStatus(status_key, post)
    }

    /**
     * #Method
     * タイムラインウィンドウを生成する汎用メソッド.
     * 
     * @param ref_id 起点にする投稿ID
     * @param loaderFunction スクロールローダーを生成するコールバック関数
     */
    createScrollableWindow(ref_id, loaderFunction) {
        // 一意認識用のUUIDを生成
        this.__timeline_uuid = crypto.randomUUID()
        const window_key = `timeline_window_${this.__timeline_uuid}`

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="timeline_window ex_window">
                    <h2><span>${this.host}</span></h2>
                    <div class="window_buttons">
                        <input type="checkbox" class="__window_opacity" id="__window_opacity_${this.__timeline_uuid}"/>
                        <label for="__window_opacity_${this.__timeline_uuid}" class="window_opacity_button" title="透過"><img
                            src="resources/ic_alpha.png" alt="透過"/></label>
                        <button type="button" class="window_close_button" title="閉じる"><img
                            src="resources/ic_not.png" alt="閉じる"/></button>
                    </div>
                    <div class="timeline">
                        <div class="col_loading">
                            <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                            <span class="loading_text">Now Loading...</span>
                        </div>
                        <ul id="${this.timeline_key}" class="scrollable_tl __context_posts"></ul>
                    </div>
                </div>
            `,
            color: this.pref.color ?? this.target_account?.pref.acc_color ?? getHashColor(this.host),
            resizable: true,
            drag_axis: false,
            resize_axis: "all"
        })

        // スクロールローダーを生成してマップに登録
        loaderFunction(this, ref_id, window_key)
        Timeline.TIMELINE_WINDOW_MAP.set(this.timeline_key, this)
    }

    /**
     * #Method
     * 対象の投稿IDからこのタイムラインの設定で外部タイムラインウィンドウを生成
     * 
     * @param post 取得の起点にするStatusオブジェクト
     */
    createLoadableTimeline(post) {
        // 通知の場合は参照IDを通知のIDにする
        this.createScrollableWindow(post.notification_id ?? post.id, (tl, ref_id, window_key) => {
            // 起点の投稿を表示して変数にマークする
            tl.ref_group.addStatus({
                post: post,
                target_elm: $(`#${window_key}>.timeline>ul`),
                callback: (st, tgelm) => {
                    st.getLayoutElement(tl.ref_group.pref.tl_layout)
                        .closest('li').addClass('mark_target_post').appendTo(tgelm)
                    st.bindAdditionalInfoAsync(tgelm)
                }
            })
            const mark_elm = $(`#${window_key}>.timeline>ul>li:first-child`).get(0)

            // 上下方向のローダーを生成
            Promise.all([tl.getTimeline(ref_id).then(body => createScrollLoader({ // 下方向のローダーを生成
                data: body,
                target: $(`#${window_key}>.timeline>ul`),
                bind: (data, target) => { // ステータスマップに挿入して投稿をバインド
                    data.forEach(p => tl.ref_group.addStatus({
                        post: p,
                        target_elm: target,
                        callback: (st, tgelm) => {
                            tgelm.append(st.timeline_element)
                            st.bindAdditionalInfoAsync(tgelm)
                        }
                    }))
                    // max_idとして取得データの最終IDを指定
                    if (tl.is_notification) return data.pop()?.notification_id
                    else return data.pop()?.id
                },
                load: async max_id => tl.getTimeline(max_id)
            })), tl.getTimeline(null, ref_id).then(body => createTopLoader({ // 上方向のローダーを生成
                data: body,
                target: $(`#${window_key}>.timeline>ul`),
                bind: (data, target) => { // ステータスマップに挿入して投稿をバインド
                    const first_elm = target.find('li:first-child').get(0)
                    data.forEach(p => tl.ref_group.addStatus({
                        post: p,
                        target_elm: target,
                        callback: (st, tgelm) => {
                            tgelm.prepend(st.timeline_element)
                            st.bindAdditionalInfoAsync(tgelm)
                        }
                    }))
                    first_elm.scrollIntoView({ block: 'center' })
                    // since_idとして取得データの最終IDを指定
                    if (tl.is_notification) return data.pop()?.notification_id
                    else return data.pop()?.id
                },
                load: async since_id => tl.getTimeline(null, since_id)
            }))]).then(() => { // 両方ロードが終わったらロード画面を削除してマークした要素にスクロールを合わせる
                $(`#${window_key}>.timeline>.col_loading`).remove()
                mark_elm.scrollIntoView({ block: 'center' })
            })
        })
    }

    /**
     * #StaticMethod
     * ローカルにキャッシュされているタイムラインウィンドウオブジェクトを取得する.
     * 
     * @param target 取得対象のターゲットDOM
     */
    static getWindow(target) {
        return Timeline.TIMELINE_WINDOW_MAP.get(target.closest("ul.scrollable_tl").attr("id"))
    }

    /**
     * #StaticMethod
     * ローカルにキャッシュされているタイムラインウィンドウオブジェクトを削除する.
     * 
     * @param target 取得対象のターゲットDOM
     */
    static deleteWindow(target) {
        return Timeline.TIMELINE_WINDOW_MAP.delete(target.find("ul.scrollable_tl").attr("id"))
    }
}


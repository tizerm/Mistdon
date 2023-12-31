﻿/**
 * #Class
 * タイムラインを管理するクラス(カラムに内包)
 *
 * @author tizerm@mofu.kemo.no
 */
class Timeline {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref, group) {
        this.pref = pref
        this.__group_id = group.id
        this.__column_id = group.__column_id
        this.status_key_map = new Map()
    }

    // Getter: このタイムラインのホスト(サーバードメイン)
    get host() { return this.pref.host }
    // Getter: このタイムラインのホスト(サーバードメイン)
    get platform() { return this.pref.platform }
    // Getter: このタイムラインのアカウントのフルアドレス
    get account_key() { return this.pref.key_address }
    // Getter: このタイムラインのアカウント
    get target_account() { return Account.get(this.pref.key_address) }
    // Getter: このタイムラインが所属するカラム
    get parent_column() { return Column.get(this.__column_id) }
    // Getter: このタイムラインが所属するグループ
    get parent_group() { return Column.get(this.__column_id).getGroup(this.__group_id) }

    // Setter: ステータスIDをキーに持つ一意識別子のマップに挿入
    set id_list(arg) { this.status_key_map.set(arg.status_id, arg.status_key) }

    /**
     * #Method
     * このタイムラインの最新の投稿を30件取得する
     * (返り値は取得データのpromise)
     * 引数を指定した場合は、指定した投稿よりも前を30件取得する
     * 
     * @param max_id この投稿よりも前の投稿を取得する起点のID
     */
    getTimeline(max_id) {
        // 外部サーバーでなくターゲットのアカウントが存在しない場合はreject
        if (!this.pref.external && !this.target_account) return Promise.reject('account not found.')
        // クエリパラメータにlimitプロパティを事前に追加(これはMastodonとMisskeyで共通)
        let query_param = this.pref.query_param
        query_param.limit = 30
        let rest_promise = null
        // プラットフォーム判定
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                // ヘッダにアクセストークンをセット(認証済みの場合)
                let header = {}
                if (!this.pref.external) header = { "Authorization": `Bearer ${this.target_account.pref.access_token}` }
                if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                // REST APIで最新TLを30件取得、する処理をプロミスとして格納
                rest_promise = $.ajax({
                    type: "GET",
                    url: this.pref.rest_url,
                    dataType: "json",
                    headers: header,
                    data: query_param
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
                // クエリパラメータにアクセストークンをセット(認証済みの場合)
                if (!this.pref.external) query_param.i = this.target_account.pref.access_token
                if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                // REST APIで最新TLを30件取得、する処理をプロミスとして格納
                rest_promise = $.ajax({
                    type: "POST",
                    url: this.pref.rest_url,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(query_param)
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
        // 外部サーバーでなくターゲットのアカウントが存在しない場合はなにもしない
        if (!this.pref.external && !this.target_account) return

        let message_callback = null
        let send_param = null

        // プラットフォーム判定
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                // メッセージ受信時のコールバック関数
                message_callback = (event) => {
                    const data = JSON.parse(event.data)

                    // TLと違うStreamは無視
                    if (data.stream[0] != this.pref.socket_param.stream) return
                    // TLと違うリストは無視
                    if (this.pref.socket_param.stream == 'list' && data.stream[1] != this.pref.socket_param.list) return

                    // タイムラインの更新通知
                    if (data.event == "update"
                        || (this.pref.timeline_type == "notification" && data.event == "notification"))
                        this.parent_group.prepend(new Status(JSON.parse(data.payload), this, this.target_account))
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
                        this.parent_group.prepend(new Status(data.body.body, this, this.target_account))
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
            closeFunc: () => toast(`${this.host}との接続が切断されました。`, "error"),
            reconnect: true
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
            toast(`${this.host}で接続エラーが発生しました、再接続してください。`, "error")
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

    /**
     * #Method
     * このタイムラインに保存してあるステータス情報を削除する
     * 
     * @param id 投稿ID
     */
    removeStatus(id) {
        const status_key = this.status_key_map.get(id)
        // タイムラインに存在する投稿だけ削除対象とする
        if (status_key) this.parent_group.removeStatus(this.parent_group.getStatusElement(status_key))
    }

    /**
     * #Method
     * 対象の投稿IDからこのタイムラインの設定で遡りウィンドウを生成
     * 
     * @param ref_id 起点にする投稿ID
     */
    createScrollableTimeline(ref_id) {
        // 一旦中身を消去
        $("#pop_window_timeline>.timeline").prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `).find("ul").empty()
        $("#pop_window_timeline>h2>span").text(this.host)

        // 参照した投稿からタイムラインを取得
        this.getTimeline(ref_id).then(body => {
            // ロード画面を削除
            $("#pop_window_timeline>.timeline>.col_loading").remove()
            createScrollLoader({ // スクロールローダーを生成
                data: body,
                target: $("#pop_window_timeline>.timeline>ul"),
                bind: (data, target) => {
                    data.forEach(p => target.append(p.timeline_element))
                    // max_idとして取得データの最終IDを指定
                    return data.pop().id
                },
                load: async max_id => this.getTimeline(max_id)
            })
        })

        $("#pop_window_timeline").show("fade", 150)
    }
}


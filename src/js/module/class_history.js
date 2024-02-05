/**
 * #Class
 * 送信履歴モジュール
 *
 * @author tizerm@mofu.kemo.no
 */
class History {
    // コンストラクタ: Statusオブジェクトから履歴データを生成
    constructor(post, type) {
        if (post.status_id) this.post = post
        else this.renote_id = post.renote_id
        this.account_address = post.account_address ?? post.from_account.full_address
        this.id = post.id
        this.type = type ?? 'post'
    }

    // スタティックマップを初期化(非同期)
    static {
        (async () => {
            const historys = await window.accessApi.readHistory()
            const posts = []
            const activities = []
            historys.post.forEach(elm => posts.push(new History(elm, null)))
            historys.activity.forEach(elm => activities.push(new History(elm, elm.type)))

            History.post_stack = posts
            History.activity_stack = activities
        })()
        History.HISTORY_PREF_TIMELINE = {
            "parent_group": new Group({
                "group_id": "__history_timeline",
                "tl_layout": "default",
                "multi_user": false
            }, null)
        }
    }

    /**
     * #StaticMethod
     * 送信履歴を表示する画面を表示
     */
    static createHistoryWindow() {
        // 検索カラムのDOM生成
        $("#pop_ex_timeline").html(`
            <h2>送信履歴</h2>
            <div class="history_timeline">
                <table id="history_timeline_table"><tbody><tr>
                    <td class="reaction_history">
                        <div class="col_head">
                            <h3>アクティビティ履歴</h3>
                        </div>
                        <div class="timeline">
                            <div class="col_loading">
                                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                                <span class="loading_text">Now Loading...</span>
                            </div>
                            <ul class="__context_posts"></ul>
                        </div>
                    </td>
                    <td class="post_history">
                        <div class="col_head">
                            <h3>投稿履歴</h3>
                        </div>
                        <div class="timeline">
                            <div class="col_loading">
                                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                                <span class="loading_text">Now Loading...</span>
                            </div>
                            <ul class="__context_posts"></ul>
                        </div>
                    </td>
                </tr></tbody></table>
            </div>
            <button type="button" id="__on_search_close" class="close_button">×</button>
        `).show("slide", { direction: "right" }, 150)

        History.preload($("#pop_ex_timeline .post_history ul"), History.post_stack)
        History.preload($("#pop_ex_timeline .reaction_history ul"), History.activity_stack)
    }

    static async preload(target, stack) {
        const load_stack = await History.load(target, stack, null)
        // ロード画面を消去
        target.prev().remove()
        // スクロールローダーを生成
        createScrollLoader({
            data: load_stack,
            target: target,
            bind: (data, target) => {
                data.forEach(p => target.append(p.element))
                // loadのっけた最終インデクスを参照
                return data.pop().max_id
            },
            load: async max_id => await History.load(target, stack, max_id)
        })
    }

    static async load(target, stack, max_index) {
        const start = max_index ?? 0
        const end = start + 20
        const load_stack = stack.slice(start, end)
        // ステータス情報を全部取得
        for (const elm of load_stack) await elm.getStatus()
        // 最後のデータに最終インデクスをのっける
        load_stack[load_stack.length - 1].max_id = end
        // 切り取ったスタックリストを返却(ローダー作成用)
        return load_stack
    }

    async getStatus() {
        if (this.post) return // Statusインスタンスがキャッシュされている場合はなにもしない
        let response = null
        try { // Statusインスタンスがキャッシュされていない場合はサーバーから取得
            const account = Account.get(this.account_address)
            switch (account.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${account.pref.domain}/api/v1/statuses/${this.id}`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                    })
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${account.pref.domain}/api/notes/show`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            "i": account.pref.access_token,
                            "noteId": this.id
                        })
                    })
                    break
                default:
                    break
            }
            const post = new Status(response, History.HISTORY_PREF_TIMELINE, account)
            this.post = post
        } catch (err) { // エラーはログに出す
            console.log(err)
        }
    }

    // Getter: 投稿履歴のDOM Elementを生成
    get element() {
        if (!this.post) return "" // データがとれない場合は空を返却
        // まず投稿本体のjQueryオブジェクトを取得
        const elm = this.post.element
        let button = ''
        if (this.type != 'post') { // アクティビティはヘッダラベルを追加
            let html = ''
            switch (this.type) {
                case 'reblog': // ブースト/リノート
                    const label = this.post.from_account.platform == 'Misskey' ? 'Renoted' : 'Boosted'
                    html = `
                        <div class="label_head label_reblog">
                            <span>${label} by ${this.account_address}</span>
                        </div>
                    `
                    break
                case 'favorite': // お気に入り
                    html = `
                        <div class="label_head label_favorite">
                            <span>Favorited by ${this.account_address}</span>
                        </div>
                    `
                    break
                case 'bookmark': // ブックマーク
                    html = `
                        <div class="label_head label_bookmark">
                            <span>Bookmarked by ${this.account_address}</span>
                        </div>
                    `
                    break
                case 'reaction': // リアクション
                    html = `
                        <div class="label_head label_favorite">
                            <span>Reaction from ${this.account_address}</span>
                        </div>
                    `
                    break
                default:
                    break
            }
            elm.prepend(html)
            button = '<button type="button" class="__del_history">解除</button>'
        } else { // 通常投稿はIDを書き換える
            elm.find('.user>.userid>a').html(this.account_address)
            button = '<button type="button" class="__del_history">削除</button>'
        }
        // 末尾にホバーで表示するボタンモーダルを追加
        elm.append(`
            <div class="delete_modal" id="${this.id}" name="${this.account_address}">
                ${button}
            </div>`)
        return elm
    }

    /**
     * #StaticMethod
     * 投稿時に投稿データを投稿スタックにプッシュする
     * 
     * @param post プッシュ対象の投稿Statusオブジェクト
     */
    static pushPost(post) {
        const history = new History(post, null)
        History.post_stack.unshift(history)
        if (History.post_stack.length > Preference.GENERAL_PREFERENCE.history_limit) History.post_stack.pop()
        History.writeJson()
    }

    /**
     * #StaticMethod
     * アクション実行時に実行対象の投稿をアクティビティスタックにプッシュする
     * 
     * @param post プッシュ対象の投稿Statusオブジェクト
     * @param type アクションのタイプ
     * @param renote_id (Misskey限定)リノートの場合の生成ノートID
     */
    static pushActivity(post, type, renote_id) {
        let history = new History(post, type)
        if (renote_id) history.renote_id = renote_id
        History.activity_stack.unshift(history)
        if (History.activity_stack.length > Preference.GENERAL_PREFERENCE.history_limit) History.activity_stack.pop()
        History.writeJson()
    }

    /**
     * #StaticMethod
     * 引数のターゲットエレメントの履歴の投稿を削除する
     * 
     * @param target 削除対象の投稿のjQueryオブジェクト
     */
    static delete(target) {
        const index = target.closest("li").index()
        if (target.closest("td").is(".reaction_history")) { // アクティビティ履歴
            History.activity_stack[index].undo().then(() => {
                History.activity_stack.splice(index, 1)
                History.writeJson()
                target.closest("li").remove()
            })
        } else { // 投稿履歴
            History.post_stack[index].post.delete((post, uuid) => {
                History.post_stack.splice(index, 1)
                Notification.info("対象の投稿を削除しました.")
                History.writeJson()
                target.closest("li").remove()
            })
        }
    }

    /**
     * #Method
     * このアクティビティ履歴に対してアクティビティを取り消す
     */
    async undo() {
        const notification = Notification.progress("取り消しています...")
        try {
            const account = Account.get(this.account_address)
            switch (this.type) {
                case 'reblog': // ブースト/リノート
                    switch (account.platform) {
                        case 'Mastodon': // Mastodon
                            await $.ajax({
                                type: "POST",
                                url: `https://${account.pref.domain}/api/v1/statuses/${this.id}/unreblog`,
                                headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                            })
                            break
                        case 'Misskey': // Misskey
                            await $.ajax({
                                type: "POST",
                                url: `https://${account.pref.domain}/api/notes/delete`,
                                dataType: "json",
                                headers: { "Content-Type": "application/json" },
                                data: JSON.stringify({
                                    "i": account.pref.access_token,
                                    "noteId": this.renote_id
                                })
                            })
                            break
                        default:
                            break
                    }
                    break
                case 'favorite': // お気に入り
                    switch (account.platform) {
                        case 'Mastodon': // Mastodon
                            await $.ajax({
                                type: "POST",
                                url: `https://${account.pref.domain}/api/v1/statuses/${this.id}/unfavourite`,
                                headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                            })
                            break
                        case 'Misskey': // Misskey
                            await $.ajax({
                                type: "POST",
                                url: `https://${account.pref.domain}/api/notes/favorites/delete`,
                                dataType: "json",
                                headers: { "Content-Type": "application/json" },
                                data: JSON.stringify({
                                    "i": account.pref.access_token,
                                    "noteId": this.id
                                })
                            })
                            break
                        default:
                            break
                    }
                    break
                case 'bookmark': // ブックマーク
                    await $.ajax({
                        type: "POST",
                        url: `https://${account.pref.domain}/api/v1/statuses/${this.id}/unbookmark`,
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                    })
                    break
                case 'reaction': // リアクション
                    await $.ajax({
                        type: "POST",
                        url: `https://${account.pref.domain}/api/notes/reactions/delete`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            "i": account.pref.access_token,
                            "noteId": this.id
                        })
                    })
                    break
                default:
                    break
            }
            notification.done("取り消しが完了しました.")
        } catch (err) {
            console.log(err)
            notification.error("取り消しに失敗しました.")
            return Promise.reject(err)
        }
    }

    /**
     * #StaticMethod
     * 投稿スタックに対して先頭のデータを取得してコールバックを実行する
     * 削除フラグが立っている場合はポップ(削除)する
     * 
     * @param presentCallback データが存在したときに実行するコールバック関数
     * @param del_flg 先頭のデータをポップ(削除)する場合はtrue
     */
    static popIf(presentCallback, del_flg) {
        const pop = History.post_stack[0]
        if (!pop) { // なにもなかったらそのままおしまい
            toast("直前の投稿がありません.", "error")
            return
        }
        if (!pop.post) { // データ取得前の場合はメッセージを出す
            toast("直前の投稿データが未取得です. 一度送信履歴画面を開いてください.", "error")
            return
        }
        // 削除する場合
        if (del_flg) pop.post.delete((post, uuid) => {
            Notification.info("直前の投稿を削除しました.")
            presentCallback(History.post_stack.shift())
            History.writeJson()
        }) // 参照だけする場合
        else presentCallback(pop)
    }

    /**
     * #StaticMethod
     * キャッシュしてある履歴オブジェクトリストをJSONファイルとして保存
     */
    static writeJson() {
        window.accessApi.overwriteHistory({
            "post": History.post_stack.map(elm => elm.json),
            "activity": History.activity_stack.map(elm => elm.json)
        })
    }

    // Getter: オブジェクトの情報を保存用のJSONとして返却
    get json() {
        return {
            "account_address": this.account_address,
            "id": this.id,
            "type": this.type,
            "renote_id": this.renote_id ?? null
        }
    }
}

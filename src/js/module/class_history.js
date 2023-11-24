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
     * #Method
     * このカラムのDOMを生成してテーブルにアペンドする
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
                            <ul class="__context_posts"></ul>
                        </div>
                    </td>
                    <td class="post_history">
                        <div class="col_head">
                            <h3>投稿履歴</h3>
                        </div>
                        <div class="timeline">
                            <ul class="__context_posts"></ul>
                        </div>
                    </td>
                </tr></tbody></table>
            </div>
            <button type="button" id="__on_search_close">×</button>
        `).show("slide", { direction: "right" }, 150)

        History.bindAsync($("#pop_ex_timeline .post_history ul"), History.post_stack)
        History.bindAsync($("#pop_ex_timeline .reaction_history ul"), History.activity_stack)
    }

    static async bindAsync(ul, stack) {
        let request_promise = null
        for (const elm of stack) { // 時間がかかっても上から順番に処理するためforでループする
            // Statusインスタンスがキャッシュされている場合はそのまま表示
            if (elm.post) ul.append(elm.element)
            else { // Statusインスタンスがキャッシュされていない場合はサーバーから取得
                const account = Account.get(elm.account_address)
                switch (account.platform) {
                    case 'Mastodon': // Mastodon
                        request_promise = $.ajax({
                            type: "GET",
                            url: `https://${account.pref.domain}/api/v1/statuses/${elm.id}`,
                            dataType: "json",
                            headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                        })
                        break
                    case 'Misskey': // Misskey
                        request_promise = $.ajax({
                            type: "POST",
                            url: `https://${account.pref.domain}/api/notes/show`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": account.pref.access_token,
                                "noteId": elm.id
                            })
                        })
                        break
                    default:
                        return
                }
                const post = new Status(await request_promise, History.HISTORY_PREF_TIMELINE, account)
                elm.post = post
                ul.append(elm.element)
            }
        }
    }

    get element() {
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

    static pushPost(post) {
        const history = new History(post, null)
        History.post_stack.unshift(history)
        if (History.post_stack.length > 100) History.post_stack.pop()
        History.writeJson()
    }

    static pushActivity(post, type, renote_id) {
        let history = new History(post, type)
        if (renote_id) history.renote_id = renote_id
        History.activity_stack.unshift(history)
        if (History.activity_stack.length > 100) History.activity_stack.pop()
        History.writeJson()
    }

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
                toast("対象の投稿を削除しました.", "done", uuid)
                History.writeJson()
                target.closest("li").remove()
            })
        }
    }

    async undo() {
        // 先にtoast表示
        const toast_uuid = crypto.randomUUID()
        toast("取り消しています...", "progress", toast_uuid)

        const account = Account.get(this.account_address)
        let request_promise = null
        switch (this.type) {
            case 'reblog': // ブースト/リノート
                switch (account.platform) {
                    case 'Mastodon': // Mastodon
                        request_promise = $.ajax({
                            type: "POST",
                            url: `https://${account.pref.domain}/api/v1/statuses/${this.id}/unreblog`,
                            headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                        })
                        break
                    case 'Misskey': // Misskey
                        request_promise = $.ajax({
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
                        request_promise = $.ajax({
                            type: "POST",
                            url: `https://${account.pref.domain}/api/v1/statuses/${this.id}/unfavourite`,
                            headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                        })
                        break
                    case 'Misskey': // Misskey
                        request_promise = $.ajax({
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
                request_promise = $.ajax({
                    type: "POST",
                    url: `https://${account.pref.domain}/api/v1/statuses/${this.id}/unbookmark`,
                    headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                })
                break
            case 'reaction': // リアクション
                request_promise = $.ajax({
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
        return request_promise.then(() => toast("取り消しが完了しました.", "done", toast_uuid)).catch(jqXHR => {
            // 取り消しに失敗したらリジェクトする
            toast("取り消しに失敗しました.", "error", toast_uuid)
            return Promise.reject(jqXHR)
        })
    }

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
            toast("直前の投稿を削除しました.", "done", uuid)
            presentCallback(History.post_stack.shift())
            History.writeJson()
        }) // 参照だけする場合
        else presentCallback(pop)
    }

    static writeJson() {
        window.accessApi.overwriteHistory({
            "post": History.post_stack.map(elm => elm.json),
            "activity": History.activity_stack.map(elm => elm.json)
        })
    }

    get json() {
        return {
            "account_address": this.account_address,
            "id": this.id,
            "type": this.type,
            "renote_id": this.renote_id ?? null
        }
    }
}

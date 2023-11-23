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
            button = '<button type="button" class="__del_history_act">解除</button>'
        } else { // 通常投稿はIDを書き換える
            elm.find('.user>.userid>a').html(this.account_address)
            button = '<button type="button" class="__del_history_post">削除</button>'
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
        window.accessApi.cacheHistory(history.json)
    }

    static pushActivity(post, type) {
        const history = new History(post, type)
        History.activity_stack.unshift(history)
        if (History.activity_stack.length > 100) History.activity_stack.pop()
        window.accessApi.cacheHistory(history.json)
    }

    get json() {
        return {
            "account_address": this.account_address,
            "id": this.id,
            "type": this.type
        }
    }
}

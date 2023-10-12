/**
 * #Class
 * (他人の)アカウント情報を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class User {
    // コンストラクタ: APIから来たユーザーデータを受け取って生成
    constructor(json, host, platform) {
        this.host = host
        this.platform = platform
        this.fields = []
        switch (platform) { // TODO: 暫定
            case 'Mastodon': // Mastodon
                this.id = json.id
                this.user_id = json.username
                this.full_address = `@${json.username}@${host}`
                this.username = json.display_name ?? json.username
                this.avatar_url = json.avatar
                this.header_url = json.header
                this.profile = json.note
                this.url = json.url
                this.count_post = json.statuses_count
                this.count_follow = json.following_count
                this.count_follower = json.followers_count

                // フィールドをセット
                if (json.fields) json.fields.forEach(f => this.fields.push({
                    label: f.name,
                    text: f.value
                }))
                break
            case 'Misskey': // Misskey
                this.id = json.id
                this.user_id = json.username
                this.full_address = `@${json.username}@${host}`
                this.username = json.name ?? json.username
                this.avatar_url = json.avatarUrl
                this.header_url = json.bannerUrl
                this.profile = json.description
                if (this.profile) this.profile = this.profile.replace(new RegExp('\n', 'g'), '<br/>') // 改行文字をタグに置換
                this.url = `https://${host}/@${json.username}` // URLは自前で生成
                this.count_post = json.notesCount
                this.count_follow = json.followingCount
                this.count_follower = json.followersCount

                // フィールドをセット
                if (json.fields) json.fields.forEach(f => this.fields.push({
                    label: f.name,
                    text: f.value.match(/^http/) // URLはリンクにする
                        ? `<a href="${f.value}" class="__lnk_external">${f.value}</a>` : f.value
                }))

                // ピンどめ投稿はまとめる
                this.pinneds = [] // この段階ではまだ整形しない
                if (json.pinnedNotes) json.pinnedNotes.forEach(note => this.pinneds.push(note))
                break
            default:
                break
        }
    }

    // Getter: プロフィールヘッダのDOMを返却
    get header_element() {
        let target_emojis = null
        let html /* name属性にURLを設定 */ = `
            <li class="header_userinfo">
                <div class="label_head user_header">
                    <span>&nbsp;</span>
                </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        //target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.avatar_url}" class="usericon"/>
                <h4 class="username">${this.username}</h4>
                <a href="${this.url}" class="userid __lnk_external">${this.full_address}</a>
            </div>
        `
        html += `
            <div class="detail_info">
                <span class="count_post counter label_postcount" title="投稿数">${this.count_post}</span>
                <span class="count_follow counter label_follow" title="フォロー">${this.count_follow}</span>
                <span class="count_follower counter label_follower" title="フォロワー">${this.count_follower}</span>
            </div>
        `
        html += '</li>'

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.user_header') // ヘッダ画像を縮小表示して表示
            .css('background-image', `url("${this.header_url}")`)
            .css('background-size', '420px auto')
            .css('background-position', 'center center')
        jqelm.find('.detail_info').tooltip()
        return jqelm
    }

    // Getter: プロフィール本体のDOMを返却
    get profile_element() {
        let target_emojis = null
        let html /* name属性にURLを設定 */ = '<li class="profile_userinfo">'
        html += `
            <div class="content">
                <div class="main_content">${this.profile}</div>
        `
        if (this.fields.length > 0) { // フィールドが存在する場合は表示
            html += '<table class="prof_field"><tbody>'
            this.fields.forEach(f => html += `<tr>
                <th>${f.label}</th>
                <td>${f.text}</td>
            </tr>`)
            html += '</tbody></table>'
        }
        html += '</div></li>'

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        return jqelm
    }

    // Getter: 簡易プロフィールDOMを返却
    get short_elm() {
        let target_emojis = null
        let html /* name属性にURLを設定 */ = `
            <li class="short_userinfo">
                <div class="label_head user_header">
                    <span>&nbsp;</span>
                </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        //target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.avatar_url}" class="usericon"/>
                <h4 class="username">${this.username}</h4>
                <a href="${this.url}" class="userid __lnk_external">${this.full_address}</a>
            </div>
        `
        html += `
            <div class="content"><div class="main_content">
                ${$($.parseHTML(this.profile)).text()}
            </div></div>
        `
        html += `
            <div class="detail_info">
                <span class="count_post counter label_postcount" title="投稿数">${this.count_post}</span>
                <span class="count_follow counter label_follow" title="フォロー">${this.count_follow}</span>
                <span class="count_follower counter label_follower" title="フォロワー">${this.count_follower}</span>
            </div>
        `
        html += '</li>'

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.user_header') // ヘッダ画像を縮小表示して表示
            .css('background-image', `url("${this.header_url}")`)
            .css('background-size', '480px auto')
            .css('background-position', 'center center')
        jqelm.find('.detail_info').tooltip()
        return jqelm
    }

    getPost(account) {
        let rest_promise = null
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                let header = {}
                if (account) header = { "Authorization": `Bearer ${account.pref.access_token}` }
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${this.host}/api/v1/accounts/${this.id}/statuses`,
                    dataType: "json",
                    headers: header,
                    data: {
                        "limit": 40,
                        "exclude_replies": true
                    }
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                        return posts
                    })()
                })
                break
            case 'Misskey': // Misskey
                let query_param = {
                    "userId": this.id,
                    "includeReplies": false,
                    "limit": 40,
                    "includeMyRenotes": false
                }
                if (account) query_param.i = account.pref.access_token
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.host}/api/users/notes`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(query_param)
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
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
            toast(`${this.full_address}の投稿の取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    getPinnedPost(account) {
        let rest_promise = null
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                let header = {}
                if (account) header = { "Authorization": `Bearer ${account.pref.access_token}` }
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${this.host}/api/v1/accounts/${this.id}/statuses`,
                    dataType: "json",
                    headers: header,
                    data: { "pinned": true }
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                        return posts
                    })()
                })
                break
            case 'Misskey': // Misskey
                // 既に入ってるピンどめ投稿を整形
                rest_promise = (async () => {
                    const posts = []
                    this.pinneds.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                    return posts
                })()
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.full_address}の投稿の取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    createDetailWindow() {
        const jqelm = $($.parseHTML(`
            <div class="account_timeline single_user">
                <table><tbody>
                    <tr><td id="${this.full_address}" class="timeline column_profile">
                        <div class="col_loading">
                            <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                            <span class="loading_text">Now Loading...</span>
                        </div>
                        <ul class="profile_header __context_user"></ul>
                        <ul class="profile_detail __context_user"></ul>
                        <div class="pinned_block post_div">
                            <h4>ピンどめ</h4>
                            <ul class="pinned_post __context_posts"></ul>
                        </div>
                        <div class="posts_block post_div">
                            <h4>投稿一覧</h4>
                            <ul class="posts __context_posts"></ul>
                        </div>
                    </td></tr>
                </tbody></table>
            </div>
        `))
        jqelm.find(".profile_header").html(this.header_element)
        jqelm.find(".profile_detail").html(this.profile_element)
        // 若干横幅が長いのでヘッダサイズを大きくする
        jqelm.find('.profile_header .user_header').css('background-size', '480px auto')
        $("#header>#pop_ex_timeline").html(jqelm)
            .append('<button type="button" id="__on_search_close">×</button>')
            .show("slide", { direction: "right" }, 150)

        // ユーザーの投稿を非同期で取得
        const column = $(`#header>#pop_ex_timeline>.account_timeline td`)
        const account = { // accountには最低限の情報だけ入れる
            "platform": this.platform,
            "pref": { "domain": this.host }
        }; (async () => Promise.allSettled([
            this.getPost(account).then(posts => posts.forEach(p => column.find(".posts").append(p.element))),
            this.getPinnedPost(account).then(posts => {
                if (posts.length > 0) posts.forEach(p => column.find(".pinned_post").append(p.element))
                else { // ピンどめ投稿がない場合はピンどめDOM自体を削除して投稿の幅をのばす
                    column.find(".pinned_block").remove()
                    column.find(".posts").css('height', 'calc((100vh - 310px) * 0.8)')
                }
            })
        ]).then(() => column.find(".col_loading").remove()))()
    }
}

/*================================================================================================================*/

/**
 * #Class
 * 投稿、通知データを管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Status {
    // コンストラクタ: APIから来たステータスデータを受け取って生成
    constructor(json, timeline, account) {
        // タイムラインから呼び出す場合はtimelineとaccountが渡ってくる
        // 個別の投稿をAPIから呼び出した場合はtimelineがnullで渡ってくる(accountは呼び出し元アカウント)
        this.from_timeline = timeline
        this.detail_flg = !timeline
        this.from_account = account
        this.type = this.from_timeline?.pref?.timeline_type == 'notification' ? 'notification' : 'post'
        this.status_id = json.id // 投稿ではなく元のステータスデータに対応するID
        const host = this.from_timeline?.host ?? this.from_account.pref.domain

        // TODO: debug
        if (this.detail_flg) console.log(json)

        // プラットフォーム判定
        let original_date = null // 生成キーに使用するのでJSON日付のほうも一時保存
        let data = null
        switch (this.from_account.platform) {
            case 'Mastodon': // Mastodon
                this.notif_type = this.type == 'notification' ? json.type : null
                original_date = json.created_at
                this.reblog = json.reblog ? true : false // ブーストフラグ
                this.reblog_by = this.reblog ? json.account.acct : null // ブースト元ユーザー

                // ブーストの場合はブースト先を参照データに設定
                data = this.reblog ? json.reblog : json
                this.uri = json.status?.url ?? data.url // 投稿URL(前はリプライ時のURL)
                this.id = data.id // 投稿ID

                this.use_emoji_cache = false // Mastodonの場合絵文字キャッシュは使わない

                // ユーザーに関するデータ
                this.user = {
                    username: data.account.display_name || data.account.username,
                    id: data.account.acct,
                    full_address: data.account.acct.match(/@/)
                        ? data.account.acct : `${data.account.acct}@${host}`,
                    avatar_url: data.account.avatar,
                    profile: data.account.note,
                    emojis: new Emojis({
                        host: host,
                        platform: 'Mastodon',
                        emojis: data.account.emojis
                    }),
                    post_count: data.account.statuses_count,
                    follow_count: data.account.following_count,
                    follower_count: data.account.followers_count
                }
                // 投稿コンテンツに関するデータ
                this.visibility = data.visibility
                this.reply_to = data.in_reply_to_id
                this.cw_text = data.spoiler_text // CWテキスト
                this.content = data.status?.content ?? data.content // 本文(通知の場合はstatusから)
                this.emojis = new Emojis({
                    host: host,
                    platform: 'Mastodon',
                    emojis: data.status?.emojis ?? data.emojis
                })

                // 添付メディア
                this.sensitive = data.sensitive // 閲覧注意設定
                this.medias = []
                data.media_attachments?.forEach(media => this.medias.push({
                    type: media.type,
                    url: media.url,
                    thumbnail: media.preview_url,
                    aspect: media.meta?.original?.aspect ?? 1
                }))

                // 詳細表示に関するデータ
                this.author_id = data.account.id
                if (data.tags) { // ハッシュタグ
                    const hashtags = []
                    data.tags.forEach(t => hashtags.push(t.name))
                    this.hashtags = hashtags
                }
                this.count_reply = data.replies_count
                this.count_reblog = data.reblogs_count
                this.count_fav = data.favourites_count
                break
            case 'Misskey': // Misskey
                this.notif_type = this.type == 'notification' ? json.type : null
                if (this.notif_type == 'achievementEarned') return // TODO: 実績は一旦除外

                original_date = json.createdAt
                this.reblog = json.renote && !json.text // リノートフラグ
                this.reblog_by = this.reblog ? json.user.username
                    + (json.user.host ? ('@' + json.user.host) : '') : null // リノート元ユーザー
                this.quote_flg = json.renote && json.text

                // リノートの場合はリノート先を参照データに設定
                data = this.reblog ? json.renote : json
                // ノートURL生成
                // uriが入っていない場合は自鯖の投稿なのでホストからURIを生成
                if (!data.uri) { // uriが入っていない場合は自鯖の投稿
                    // 通知の場合は本体のIDを参照
                    if (this.notif_type) this.uri = `https://${host}/notes/${data.note?.renote?.id ?? data.note?.id}`
                    else this.uri = `https://${host}/notes/${data.id}`
                } // URIが入っていてプラットフォームがMisskeyの場合はuriを参照
                else if (data.user?.instance?.softwareName == "misskey") this.uri = data.uri
                // TODO: それ以外は一旦Mastodonとして解釈する
                else this.uri = data.url
                this.id = data.id // 投稿ID

                // Misskeyの場合、自鯖の絵文字が渡ってこないのでキャッシュを利用する
                this.use_emoji_cache = !data.uri
                if (this.notif_type == 'reaction') this.reaction_emoji = data.reaction // リアクションを保存

                // ユーザーに関するデータ
                this.user = {
                    username: data.user.name || data.user.username,
                    id: data.user.username + (data.user.host ? ('@' + data.user.host) : ''),
                    full_address: `${json.user?.username}@${json.user?.host ? json.user?.host : host}`,
                    avatar_url: data.user.avatarUrl,
                    emojis: new Emojis({
                        host: host,
                        platform: 'Misskey',
                        emojis: data.user.emojis
                    })
                }
                // 投稿コンテンツに関するデータ
                this.visibility = data.visibility
                this.reply_to = data.replyId
                this.cw_text = data.cw // CWテキスト
                this.content = data.note?.renote?.text ?? data.note?.text ?? data.text // 本文(通知の場合はstatusから)
                if (this.content) this.content = this.content
                    .replace(new RegExp('<', 'g'), '&lt;') // 先にタグエスケープをする(改行がエスケープされるので)
                    .replace(new RegExp('>', 'g'), '&gt;')
                    .replace(new RegExp('\n', 'g'), '<br/>') // 改行文字をタグに置換

                this.emojis = new Emojis({
                    host: host,
                    platform: 'Misskey',
                    emojis: data.note?.renote?.emojis ?? data.note?.emojis ?? data.emojis
                })
                // 引用ノートがある場合は引用先を設定
                if (this.quote_flg) this.quote = {
                    username: data.renote.user.name,
                    user_id: data.renote.user.username,
                    content: data.renote.text,
                    emojis: new Emojis({
                        host: host,
                        platform: 'Misskey',
                        emojis: data.renote.emojis
                    })
                }

                // 添付メディア
                this.sensitive = (data.files?.filter(f => f.isSensitive)?.length ?? 0) > 0 // 閲覧注意設定
                this.medias = []
                data.files?.forEach(media => this.medias.push({
                    type: media.type.substring(0, media.type.indexOf("/")),
                    url: media.url,
                    thumbnail: media.thumbnailUrl,
                    aspect: media.properties.width / media.properties.height
                }))

                // 詳細表示に関するデータ
                this.author_id = data.user.id
                this.hashtags = data.tags
                this.count_reply = data.repliesCount
                this.count_reblog = data.renoteCount
                if (this.detail_flg && data.reactions) { // リアクションがある場合はリアクション一覧をリスト化する
                    const reactions = []
                    Object.keys(data.reactions).forEach(key => reactions.push({
                        shortcode: key,
                        count: data.reactions[key],
                        url: data.reactionEmojis ? data.reactionEmojis[key.substring(1, key.length - 1)] : null
                    }))
                    this.reactions = reactions
                }
                break
            default:
                break
        }
        // このステータスを一意に決定するためのキーを設定
        this.sort_date = new Date(original_date)
        this.status_key = `${original_date.substring(0, original_date.lastIndexOf('.'))}@${this.user.full_address}`
    }

    // Getter: 挿入先カラム
    get from_column() { return this.from_timeline?.parent_column }
    // Getter: 取得元アカウントのプラットフォーム(投稿したユーザーのプラットフォームではありません)
    get platform() { return this.from_account.platform }
    // Getter: 取得元アカウントのアカウントカラー
    get account_color() { return this.from_account.pref.acc_color }
    // Getter: 取得元アカウントのカスタム絵文字
    get host_emojis() { return this.from_account?.emojis }
    // Getter: ミュート判定(現状はBTRN除外のみ)
    get muted() { return this.from_timeline?.pref?.exclude_reblog && this.reblog }
    // Getter: 本文をHTML解析して文章の部分だけを抜き出す
    get content_text() { return $.parseHTML(`<div>${this.content}</div>`)[0].innerText }

    // 最後に投稿した投稿データを保持する領域
    static post_stack = []

    // 日付フォーマッターはstaticプロパティにする
    static {
        Status.DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
            year:   'numeric',
            month:  '2-digit',
            day:    '2-digit',
            hour:   '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }

    /**
     * #StaticMethod
     * 「直前の投稿」のスタックにこの投稿をプッシュする
     * 
     * @param original_text 投稿したときに実際に打ち込んだ生テキスト(改行とかそのままの状態で保存するため)
     */
    pushStack(original_text) {
        this.original_text = original_text
        Status.post_stack.push(this)
    }

    /**
     * #StaticMethod
     * 直前の投稿が存在する場合、その投稿に対してコールバック関数を実行する
     * フラグが経っている場合は投稿をスタックからポップする
     * 
     * @param presentCallback 直前の投稿が存在した場合に実行するコールバック関数
     * @param del_flg trueの場合スタックから投稿をポップ(削除)する
     */
    static lastStatusIf(presentCallback, del_flg) {
        const last_status = del_flg
            ? Status.post_stack.pop() : Status.post_stack[Status.post_stack.length - 1]
        if (last_status) presentCallback(last_status)
        else toast("直前の投稿がありません.", "error")
    }

    /**
     * #StaticMethod
     * URLから投稿データをリモートから直接取得する
     * 
     * @param url ステータスURL
     */
    static async getStatus(url) {
        if (url.indexOf('/') < 0) {
            toast("詳細表示のできない投稿です.", "error")
            return
        }
        // 先にtoast表示
        const toast_uuid = crypto.randomUUID()
        toast("投稿の取得中です...", "progress", toast_uuid)
        // URLパターンからプラットフォームを判定
        const spl_url = url.split('/')
        let platform = null
        let id = null
        let domain = null
        if (spl_url[spl_url.length - 2].match(/@/)) {
            // 後ろから二番目のブロックに@が入ってたらMastodon
            platform = 'Mastodon'
            id = spl_url[spl_url.length - 1]
            domain = spl_url[spl_url.length - 3]
        } else if (spl_url[spl_url.length - 2] == 'notes') {
            // 後ろから二番目のブロックが"notes"の場合Misskey
            platform = 'Misskey'
            id = spl_url[spl_url.length - 1]
            domain = spl_url[spl_url.length - 3]
        }
        let request_promise = null
        switch (platform) {
            case 'Mastodon': // Mastodon
                request_promise = $.ajax({ // リモートの投稿を直接取得
                    type: "GET",
                    url: `https://${domain}/api/v1/statuses/${id}`,
                    dataType: "json",
                })
                break
            case 'Misskey': // Misskey
                request_promise = $.ajax({ // リモートの投稿を直接取得
                    type: "POST",
                    url: `https://${domain}/api/notes/show`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({ "noteId": id })
                })
                break
            default:
                toast("詳細表示のできない投稿です.", "error", toast_uuid)
                return
        }
        return request_promise.then(data => {
            toast(null, "hide", toast_uuid)
            return new Status(data, null, { // accountには最低限の情報だけ入れる
                "platform": platform,
                "pref": { "domain": domain }
            })
        }).catch(jqXHR => toast("投稿の取得に失敗しました.", "error", toast_uuid))
    }

    /**
     * #StaticMethod
     * IDから投稿データを対象サーバーを使って取得する
     * 
     * @param arg パラメータオブジェクト
     */
    static async getTreePost(arg) {
        let request_promise = null
        switch (arg.platform) {
            case 'Mastodon': // Mastodon
                request_promise = $.ajax({ // リモートの投稿を直接取得
                    type: "GET",
                    url: `https://${arg.domain}/api/v1/statuses/${arg.id}`,
                    dataType: "json",
                })
                break
            case 'Misskey': // Misskey
                request_promise = $.ajax({ // リモートの投稿を直接取得
                    type: "POST",
                    url: `https://${arg.domain}/api/notes/show`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({ "noteId": arg.id })
                })
                break
            default:
                toast("詳細表示のできない投稿です.", "error", toast_uuid)
                return
        }
        return request_promise.then(data => {
            return new Status(data, null, { // accountには最低限の情報だけ入れる
                "platform": arg.platform,
                "pref": { "domain": arg.domain }
            })
        }).catch(jqXHR => toast("投稿の取得に失敗しました.", "error", toast_uuid))
    }

    /**
     * #Method
     * この投稿を軸としてその後に続くリプライ/ツリーと、その前に続くリプライ/ツリーを取得
     * そのあと、詳細表示ウィンドウに表示
     */
    async getThread() {
        const domain = this.from_account.pref.domain
        let main_promise = null
        const parent_promises = []
        const child_promises = []
        switch (this.from_account.platform) {
            case 'Mastodon': // Mastodon
                main_promise = $.ajax({ // ツリー元ツートとチェインしているツートを同時取得
                    type: "GET",
                    url: `https://${domain}/api/v1/statuses/${this.id}/context`,
                    dataType: "json"
                }).then(data => {
                    // ツリー元のツートを取得(逆順)
                    data.ancestors.reverse().forEach(ids => parent_promises.push(Status.getTreePost({
                        id: ids.id,
                        platform: this.from_account.platform,
                        domain: domain
                    })))
                    // チェインしているツートを取得
                    data.descendants.forEach(ids => child_promises.push(Status.getTreePost({
                        id: ids.id,
                        platform: this.from_account.platform,
                        domain: domain
                    })))
                    return 'resolve'
                })
                break
            case 'Misskey': // Misskey
                const recurseChain = async (post) => { // 再帰参照できるチェインノート取得関数
                    const recurse_promise = []
                    return $.ajax({ // チェインしているノートを取得
                        type: "POST",
                        url: `https://${domain}/api/notes/children`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ "noteId": post.id })
                    }).then(data => {
                        if (data.length == 0) return 'resolve' // 終端まで取得したら終了
                        data.forEach(post => {
                            const ins_post = new Status(post, null, { // accountには最低限の情報だけ入れる
                                "platform": 'Misskey',
                                "pref": { "domain": domain }
                            })
                            child_promises.push((async () => { return ins_post })())
                            // 取得したノートを起点に再帰的に取得処理を呼ぶ
                            recurse_promise.push(recurseChain(ins_post))
                        })
                        return Promise.all(recurse_promise)
                    })
                }
                main_promise = Promise.all([
                    $.ajax({ // ツリー元のノートを取得
                        type: "POST",
                        url: `https://${domain}/api/notes/conversation`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ "noteId": this.id })
                    }).then(data => {
                        data.forEach(post => parent_promises.push((async () => {
                            return new Status(post, null, { // accountには最低限の情報だけ入れる
                                "platform": this.from_account.platform,
                                "pref": { "domain": domain }
                            })
                        })()))
                    }), recurseChain(this)]).then(datas => { return 'resolve' })
                break
            default:
                break
        }
        // すべてのAPIの呼び出しが終わったら親と子の取得処理が終わり次第バインド処理に移行
        main_promise.then(() => {
            Promise.all(parent_promises).then(parents => parents
                .forEach(post => $("#header>#pop_extend_column .timeline>ul").prepend(post.element)))
            Promise.all(child_promises).then(children => children
                .forEach(post => $("#header>#pop_extend_column .timeline>ul").append(post.element)))
        }).catch(jqXHR => toast("スレッドの取得に失敗しました.", "error"))
    }

    /**
     * #Method
     * この投稿を書いたアカウントの情報を取得する
     */
    getAuthorInfo() {
        const domain = this.from_account.pref.domain
        let rest_promise = null
        switch (this.from_account.platform) {
            case 'Mastodon': // Mastodon
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${domain}/api/v1/accounts/${this.author_id}`,
                    dataType: "json"
                })
                break
            case 'Misskey': // Misskey
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${domain}/api/users/show`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({ "userId": this.author_id })
                })
                break
            default:
                break
        }
        return rest_promise.then(data => { return new User(data, domain, this.from_account.platform) })
    }

    // Getter: 投稿データからHTMLを生成して返却
    get element() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}">`
        if (this.type == 'notification') { // 通知タイプによって表示を変更
            switch (this.notif_type) {
                case 'favourite': // お気に入り
                    html += `
                        <div class="label_head label_favorite">
                            <span>Favorited by @${this.user.id}</span>
                        </div>
                    `
                    break
                case 'reblog': // ブースト
                    html += `
                        <div class="label_head label_reblog">
                            <span>Boosted by @${this.user.id}</span>
                        </div>
                    `
                    break
                case 'reaction': // 絵文字リアクション
                    html += `
                        <div class="label_head label_favorite">
                            <span>Reaction from @${this.user.id}</span>
                        </div>
                    `
                    break
                case 'renote': // リノート
                    html += `
                        <div class="label_head label_reblog">
                            <span>Renoted by @${this.user.id}</span>
                        </div>
                    `
                    break
                case 'follow': // フォロー通知
                    html += `
                        <div class="label_head label_follow">
                            <span>Followed by @${this.user.id}</span>
                        </div>
                    `
                    break
                default: // リプライの場合はヘッダ書かない
                    break
            }
        } else if (this.reblog) html /* ブースト/リノートのヘッダ */ += `
            <div class="label_head label_reblog">
                <span>Boosted by @${this.reblog_by}</span>
            </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.user.avatar_url}" class="usericon"/>
                <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                <span class="userid"><a class="__lnk_userdetail">@${this.user.id}</a></span>
        `; if (this.reply_to) // リプライ/ツリーの場合も識別アイコンを表示
            html += '<img src="resources/ic_reply.png" class="visibilityicon"/>'
        else { // 公開範囲がパブリック以外の場合は識別アイコンを配置
            switch (this.visibility) {
                case 'unlisted':
                case 'home': // ホーム
                    html += '<img src="resources/ic_unlisted.png" class="visibilityicon"/>'
                    break
                case 'private':
                case 'followers': // フォロ限
                    html += '<img src="resources/ic_followers.png" class="visibilityicon"/>'
                    break
                default:
                    break
            }
        }
        html += `
            </div>
            <div class="content">
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CWテキスト */ += `
            <a class="expand_header label_cw">${this.cw_text}</a>
            <div class="main_content cw_content">
        `; else html += '<div class="main_content">'

        html /* 本文(絵文字を置換) */ += target_emojis.replace(this.content)
        if (this.reaction_emoji) { // リアクション絵文字がある場合
            let alias = null
            if (this.reaction_emoji.match(/^:[a-zA-Z0-9_]+:$/g)) { // カスタム絵文字
                const emoji = this.host_emojis.emoji_map.get(this.reaction_emoji)
                if (emoji) alias = `<img src="${emoji.url}" class="inline_emoji"/>`
                else alias = `${this.reaction_emoji} (キャッシュされていないかリモートのカスタム絵文字です)`
            } else alias = this.reaction_emoji // Unicode絵文字はそのまま渡す
            html += `<p class="reaction_emoji">${alias}</p>`
        }
        html += `
                </div>
            </div>
        `
        if (this.platform == 'Misskey' && this.quote_flg) {
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.quote.emojis
            html /* 引用ノート(Misskeyのみ) */ += `
                <div class="post_quote">
                    <div>${this.quote.username}</div>
                    <div>@${this.quote.user_id}</div>
                    <div>${target_emojis.replace(this.quote.content)}</div>
                </div>
            `
        }
        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content cw_content">
            `; else if (this.medias.length > 4) /* 添付画像5枚以上 */ html += `
                <a class="expand_header label_cw">添付画像が5枚以上あります</a>
                <div class="media_content cw_content">
            `; else html += '<div class="media_content">'
            // アスペクト比をリンクオプションとして設定
            this.medias.forEach(media => {
                if (media.type == 'audio') html /* 音声ファイル(サムネなしで直接埋め込む) */+= `
                    <audio controls src="${media.url}" preload="none"></audio>
                `; else html /* 画像か動画ファイル(サムネから拡大表示) */ += `
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}" class="__on_media_expand">
                        <img src="${media.thumbnail}" class="media_preview"/>
                    </a>
                `
            })
            html += `
                    </div>
                </div>
            `
        }
        if (this.detail_flg) { // 詳細表示の場合はリプライ、BTRN、ふぁぼ数を表示
            html += '<div class="detail_info">'
            if (this.hashtags) { // ハッシュタグ
                html += '<div>'
                this.hashtags.forEach(tag => html += `<a class="hashtag">${tag}</a>`)
                html += '</div>'
            }
            // リプライ数とブースト/リノート数
            html += `
                <span class="count_reply counter label_reply" title="リプライ数">${this.count_reply}</span>
                <span class="count_reblog counter label_reblog" title="ブースト/リノート数">${this.count_reblog}</span>
            `; switch (this.platform) {
                case 'Mastodon': // Mastodon
                    // ふぁぼの表示だけする
                    html += `<span class="count_fav counter label_favorite" title="お気に入り数">${this.count_fav}</span>`
                    break
                case 'Misskey': // Misskey
                    let reaction_html = '' // リアクションHTMLは後ろにつける
                    let reaction_count = 0 // リアクション合計値を保持
                    this.reactions?.forEach(reaction => {
                        if (reaction.url) reaction_html /* URLの取得できているカスタム絵文字 */ += `
                            <span class="count_reaction">${reaction.count}
                            <img src="${reaction.url}" class="inline_emoji"/></span>
                        `; else reaction_html /* それ以外は一旦そのまま表示 */ += `
                            <span class="count_reaction">${reaction.count} ${reaction.shortcode}</span>
                        `
                        reaction_count += Number(reaction.count)
                    })
                    // 先にリアクションの合計値を表示
                    html += `<span class="count_reaction_total counter label_favorite"
                        title="リアクション合計">${reaction_count}</span>`
                    html += `<div>${reaction_html}</div>`
                    break
                default:
                    break
            }
            html += '</div>'
        }
        html /* 投稿(ステータス)日付 */ += `
            <div class="post_footer">
                <a class="created_at __on_datelink">${Status.DATE_FORMATTER.format(this.sort_date)}</a>
        `

        if (this.from_column?.pref?.multi_user) // マルチアカウントカラムの場合は表示元ユーザーを表示
            html += `<div class="from_address" name="${this.from_account.full_address}">From ${this.from_account.full_address}</div>`
        html += `
                </div>
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.post_footer>.from_address').css("background-color", `#${this.account_color}`)
        if (this.detail_flg) jqelm.find('.detail_info').tooltip()
        return jqelm
    }

    /**
     * #Method
     * この投稿をサーバーから削除する
     * 削除後にこの投稿をパラメータとしてコールバック関数を実行
     * 
     * @param callback 削除処理実行後に実行するコールバック関数
     */
    delete(callback) {
        // 先にtoast表示
        const toast_uuid = crypto.randomUUID()
        toast("投稿を削除しています...", "progress", toast_uuid)

        let request_promise = null
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                request_promise = $.ajax({ // このステータスIDを使って削除リクエストを送信
                    type: "DELETE",
                    url: `https://${this.from_account.pref.domain}/api/v1/statuses/${this.status_id}`,
                    headers: { "Authorization": `Bearer ${this.from_account.pref.access_token}` }
                })
                break
            case 'Misskey': // Misskey
                const request_param = {
                    "i": this.from_account.pref.access_token,
                    "noteId": this.status_id
                }
                request_promise = $.ajax({ // このステータスIDを使って削除リクエストを送信
                    type: "POST",
                    url: `https://${this.from_account.pref.domain}/api/notes/delete`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(request_param)
                })
                break
            default:
                break
        }
        request_promise.then(() => callback(this, toast_uuid))
            .catch(jqXHR => toast("投稿の削除に失敗しました.", "error", toast_uuid))
    }

    /**
     * #Method
     * この投稿に対する返信を投稿するための画面を表示
     */
    createReplyWindow() {
        // 返信先のアカウントが返信元のアカウントと同じ場合は先頭のユーザーIDを表示しない
        const userid = `@${this.user.full_address}` != this.from_account.full_address ? `@${this.user.id} ` : ''
        // リプライウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="reply_col">
                <h2>From ${this.from_account.full_address}</h2>
                <div class="reply_form">
                    <input type="hidden" id="__hdn_reply_id" value="${this.id}"/>
                    <input type="hidden" id="__hdn_reply_account" value="${this.from_account.full_address}"/>
                    <input type="hidden" id="__hdn_reply_visibility" value="${this.visibility}"/>
                    <textarea id="__txt_replyarea" class="__ignore_keyborad"
                        placeholder="(Ctrl+Enterでも投稿できます)">${userid}</textarea>
                    <button type="button" id="__on_reply_submit">投稿</button>
                </div>
                <div class="timeline">
                    <ul></ul>
                </div>
                <button type="button" id="__on_reply_close">×</button>
            </div>
        `))
        // 色とステータスバインドの設定をしてDOMを拡張カラムにバインド
        jqelm.find('h2').css("background-color", `#${this.account_color}`)
        jqelm.find('.timeline>ul').append(this.element)
        $("#header>#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)
        // 表示後にリプライカラムのテキストボックスにフォーカスする(カーソルを末尾につける)
        const replyarea = $("#header>#pop_extend_column #__txt_replyarea")
        replyarea.focus()
        replyarea.get(0).setSelectionRange(500, 500)
    }

    /**
     * #Method
     * この投稿にリアクションを贈るための画面を表示
     */
    createReactionWindow() {
        // リアクションウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="reaction_col">
                <h2>From ${this.from_account.full_address}</h2>
                <div class="timeline">
                    <ul></ul>
                </div>
                <div class="reaction_list">
                    <input type="hidden" id="__hdn_reaction_id" value="${this.id}"/>
                    <input type="hidden" id="__hdn_reaction_account" value="${this.from_account.full_address}"/>
                </div>
                <button type="button" id="__on_reply_close">×</button>
            </div>
        `))
        // 色とステータスバインドの設定をしてDOMを拡張カラムにバインド
        jqelm.find('h2').css("background-color", `#${this.account_color}`)
        jqelm.find('.timeline>ul').append(this.element)
        $("#header>#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)

        // 一度枠組みを表示してから非同期で絵文字一覧を動的に表示してく
        ;(async () => this.from_account.emojis.each(emoji => $("#header>#pop_extend_column .reaction_list").append(`
            <a class="__on_emoji_reaction" name="${emoji.shortcode}"><img src="${emoji.url}" alt="${emoji.name}"/></a>
            `)))()
    }

    /**
     * #Method
     * この投稿の詳細情報を表示する画面を表示
     */
    createDetailWindow() {
        // 詳細表示のDOM生成
        const jqelm = $($.parseHTML(`
            <div class="post_detail_col">
                <h2>From ${this.from_account.pref.domain}</h2>
                <a href="${this.uri}" class="__lnk_external lnk_post_browser">ブラウザで表示</a>
                <div class="timeline">
                    <ul class="__context_posts"></ul>
                </div>
                <button type="button" id="__on_reply_close">×</button>
            </div>
        `))
        // Classを設定してDOMを拡張カラムにバインド
        jqelm.find('.timeline>ul').append(this.element)
        $("#header>#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)
        const parent_post = $(`#header>#pop_extend_column .timeline>ul>li[id="${this.status_key}"]`)

        // 一度表示してからチェインしている投稿を取得する
        this.getThread()
        // 詳細表示のターゲットになっている投稿の直上に簡易プロフィールを設置
        this.getAuthorInfo().then(user => parent_post.before(user.short_elm))
    }

    // Getter: Electronの通知コンストラクタに送る通知文を生成して返却
    get notification() {
        let title = null
        let body = null
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                // 通知タイプによって表示を変更
                switch (this.notif_type) {
                    case 'favourite': // お気に入り
                        title = `${this.from_account.full_address}: ${this.user.username}からお気に入り`
                        body = this.content
                        break
                    case 'reblog': // ブースト
                        title = `${this.from_account.full_address}: ${this.user.username}からブースト`
                        body = this.content
                        break
                    case 'follow': // フォロー通知
                        title = `${this.from_account.full_address}: ${this.user.username}からフォロー`
                        body = this.user.profile
                        break
                    default: // リプライ
                        title = `${this.from_account.full_address}: ${this.user.username}から返信`
                        body = this.content
                        break
                }
                break
            case 'Misskey': // Misskey
                // 通知タイプによって表示を変更
                switch (this.notif_type) {
                    case 'reaction': // 絵文字リアクション
                        title = `${this.from_account.full_address}: ${this.user.username}からリアクション`
                        body = this.content
                        break
                    case 'renote': // リノート
                        title = `${this.from_account.full_address}: ${this.user.username}からリノート`
                        body = this.content
                        break
                    case 'follow': // フォロー通知
                        title = `${this.from_account.full_address}: ${this.user.username}からフォロー`
                        body = `@${this.user.id} - ${this.user.username}`
                        break
                    default: // リプライ
                        title = `${this.from_account.full_address}: ${this.user.username}から返信`
                        body = this.content
                        break
                }
                break;
            default:
                break;
        }

        // 通知を返却
        return {
            title: title,
            // HTMLとして解析して中身の文章だけを取り出す
            body: $($.parseHTML(body)).text()
        }
    }
}

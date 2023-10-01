/**
 * #Class
 * 投稿、通知データを管理するクラス
 *
 * @autor tizerm@mofu.kemo.no
 */
class Status {
    // コンストラクタ: APIから来たステータスデータを受け取って生成
    constructor(json, timeline, account) {
        // タイムラインから呼び出す場合はtimelineとaccountが渡ってくる
        // 個別の投稿をAPIから呼び出した場合はtimelineがnullで渡ってくる(accountは呼び出し元アカウント)
        this.from_timeline = timeline
        this.from_account = account
        this.type = this.from_timeline?.pref?.timeline_type == 'notification' ? 'notification' : 'post'
        this.status_id = json.id // 投稿ではなく元のステータスデータに対応するID
        const host = this.from_timeline?.host ?? this.from_account.pref.domain

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
                    username: data.account.display_name ?? data.account.username,
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
                    url: media.url,
                    thumbnail: media.preview_url,
                    aspect: media.meta?.original?.aspect ?? 1
                }))
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
                if (!data.uri) this.uri = `https://${host}/notes/${data.id}`
                // URIが入っていてプラットフォームがMisskeyの場合はuriを参照
                else if (data.user?.instance?.softwareName == "misskey") this.uri = data.uri
                // TODO: それ以外は一旦Mastodonとして解釈する
                else this.uri = data.url
                this.id = data.id // 投稿ID

                // Misskeyの場合、自鯖の絵文字が渡ってこないのでキャッシュを利用する
                this.use_emoji_cache = !data.uri

                // ユーザーに関するデータ
                this.user = {
                    username: data.user.name ?? data.user.username,
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
                    url: media.url,
                    thumbnail: media.thumbnailUrl,
                    aspect: media.properties.width / media.properties.height
                }))
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
    get content_text() { return $($.parseHTML(this.content)).text() }

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

    pushStack() {
        Status.post_stack.push(this)
    }

    static lastStatusIf(presentCallback, del_flg) {
        const last_status = del_flg
            ? Status.post_stack.pop() : Status.post_stack[Status.post_stack.length - 1]
        if (last_status) presentCallback(last_status)
        else toast("直前の投稿がありません.", "error")
    }

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
        }).catch((jqXHR, textStatus, errorThrown) => toast("投稿の取得に失敗しました.", "error", toast_uuid))
    }

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
        }).catch((jqXHR, textStatus, errorThrown) => toast("投稿の取得に失敗しました.", "error", toast_uuid))
    }

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
                    dataType: "json",
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
        }).catch((jqXHR, textStatus, errorThrown) => toast("スレッドの取得に失敗しました.", "error"))
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
                            <span>ReAction from @${this.user.id}</span>
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
                <a class="userid">@${this.user.id}</a>
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
        html /* 本文(絵文字を置換) */ += `   
                    ${target_emojis.replace(this.content)}
                </div>
            </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        if (this.platform == 'Misskey' && this.quote_flg) {
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
            this.medias.forEach(media => html += `
                <a href="${media.url}" name="${media.aspect}" class="__on_media_expand">
                    <img src="${media.thumbnail}" class="media_preview"/>
                </a>
            `)
            html += `
                    </div>
                </div>
            `
        }
        html /* 投稿(ステータス)日付 */ += `
            <div class="post_footer">
                <a class="created_at __on_datelink">${Status.DATE_FORMATTER.format(this.sort_date)}</a>
        `
        /*
            case 'follow': // フォロー通知
        html += `
            <div class="created_at">
                Post: ${value.account.statuses_count} /
                Follow: ${value.account.following_count} /
                Follower: ${value.account.followers_count}
            </div>
        `;//*/

        if (this.from_column?.pref?.multi_user) // マルチアカウントカラムの場合は表示元ユーザーを表示
            html += `<div class="from_address" name="${this.from_account.full_address}">From ${this.from_account.full_address}</div>`
        html += `
                </div>
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.post_footer>.from_address').css("background-color", `#${this.account_color}`)
        return jqelm
    }

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
        request_promise.then(() => callback(this, toast_uuid)).catch(
            (jqXHR, textStatus, errorThrown) => toast("投稿の削除に失敗しました.", "error", toast_uuid))
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

    createDetailWindow() {
        // 詳細表示のDOM生成
        const jqelm = $($.parseHTML(`
            <div class="post_detail_col">
                <h2>From ${this.from_account.pref.domain}</h2>
                <a href="${this.uri}" class="__lnk_external lnk_post_browser">ブラウザで表示</a>
                <div class="timeline">
                    <ul></ul>
                </div>
                <button type="button" id="__on_reply_close">×</button>
            </div>
        `))
        // Classを設定してDOMを拡張カラムにバインド
        jqelm.find('.timeline>ul').append(this.element)
        $("#header>#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)

        // 一度表示してからチェインしている投稿を取得する
        this.getThread()
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

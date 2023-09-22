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

    static lastStatusIf(presentCallback, absentCallback) {
        const last_status = Status.post_stack.pop()
        if (last_status) presentCallback(last_status)
        else absentCallback()
    }

    // Getter: 投稿データからHTMLを生成して返却
    get element() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

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
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.user.avatar_url}" class="usericon"/>
                <h4 class="username">${this.user.emojis.replace(this.user.username)}</h4>
                <a class="userid">@${this.user.id}</a>
        ` // 公開範囲がパブリック以外の場合は識別アイコンを配置
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
        html += `
            </div>
            <div class="content">
        `
        if (this.cw_text) html /* CWテキスト */ += `
            <a class="expand_header label_cw">${this.cw_text}</a>
            <div class="main_content cw_content">
        `; else html += '<div class="main_content">'
        html /* 本文(絵文字を置換) */ += `   
                    ${this.emojis.replace(this.content)}
                </div>
            </div>
        `
        if (this.platform == 'Misskey' && this.quote_flg) html /* 引用ノート(Misskeyのみ) */ += `
            <div class="post_quote">
                <div>${this.quote.username}</div>
                <div>@${this.quote.user_id}</div>
                <div>${this.quote.emojis.replace(this.quote.content)}</div>
            </div>
        `
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
        // リプライウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="reply_col">
                <h2>From ${this.from_account.full_address}</h2>
                <div class="reply_form">
                    <input type="hidden" id="__hdn_reply_id" value="${this.id}"/>
                    <input type="hidden" id="__hdn_reply_account" value="${this.from_account.full_address}"/>
                    <textarea id="__txt_replyarea" class="__ignore_keyborad"
                        placeholder="(Ctrl+Enterでも投稿できます)">@${this.user.id} </textarea>
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
        // 表示後にリプライカラムのテキストボックスにフォーカスする
        $("#header>#pop_extend_column #__txt_replyarea").focus()
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

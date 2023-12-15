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
        this.user_profile_flg = timeline?.parent_column == null
        this.from_account = account
        this.type = this.from_timeline?.pref?.timeline_type == 'notification' ? 'notification' : 'post'
        this.status_id = json.id // 投稿ではなく元のステータスデータに対応するID
        this.platform = this.from_account?.platform ?? this.from_timeline?.platform
        const host = this.from_timeline?.host ?? this.from_account.pref.domain

        if (timeline?.__extended_timeline == 'profile_post') // プロフィールのユーザー投稿の場合
            this.profile_post_flg = true

        // プラットフォーム判定
        let original_date = null // 生成キーに使用するのでJSON日付のほうも一時保存
        let data = null

        // TODO: debug
        if (this.detail_flg) console.log(json)

        switch (this.platform) {
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

                // 投票がある場合は投票に関するデータ
                if (data.poll) {
                    this.poll_expired = data.poll.expired
                    this.poll_expired_time = new Date(data.poll.expires_at)
                    this.poll_multiple = data.poll.multiple
                    this.poll_options = []
                    data.poll.options.forEach(elm => this.poll_options.push({
                        text: elm.title,
                        count: elm.votes_count
                    }))
                }

                // 添付メディア
                this.sensitive = data.sensitive // 閲覧注意設定
                this.medias = []
                data.media_attachments?.forEach(media => this.medias.push({
                    type: media.type,
                    url: media.url,
                    thumbnail: media.preview_url,
                    sensitive: this.sensitive,
                    aspect: media.meta?.original?.aspect ?? 1
                }))

                // 詳細表示に関するデータ
                this.author_id = data.account.id
                this.card = data.card
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
                // TODO: それ以外は一旦Mastodonとして解釈する(Misskey v11も同じ)
                else this.uri = data.url ?? data.uri
                this.id = data.id // 投稿ID

                // Misskeyの場合、自鯖の絵文字が渡ってこないのでキャッシュを利用する
                this.use_emoji_cache = !data.uri
                if (this.notif_type == 'reaction') this.reaction_emoji = data.reaction // リアクションを保存

                // ユーザーに関するデータ
                this.user = {
                    username: data.user?.name || data.user?.username,
                    id: data.user?.username + (data.user?.host ? ('@' + data.user?.host) : ''),
                    full_address: `${data.user?.username}@${data.user?.host ? data.user?.host : host}`,
                    avatar_url: data.user?.avatarUrl,
                    emojis: new Emojis({
                        host: host,
                        platform: 'Misskey',
                        emojis: data.user?.emojis
                    })
                }
                // 投稿コンテンツに関するデータ
                this.visibility = data.visibility
                this.local_only = data.localOnly
                this.reply_to = data.replyId
                this.cw_text = data.cw // CWテキスト
                this.content = data.note?.renote?.text ?? data.note?.text ?? data.text // 本文(通知の場合はstatusから)
                if (this.content) this.content = this.content
                    .replace(new RegExp('<', 'g'), '&lt;') // 先にタグエスケープをする(改行がエスケープされるので)
                    .replace(new RegExp('>', 'g'), '&gt;')
                    .replace(new RegExp('https?://[^ 　\n]+', 'g'), // MisskeyはURLをリンクをリンクとして展開する
                        match => `<a href="${match}">${match}</a>`)
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

                // 投票がある場合は投票に関するデータ
                if (data.poll) {
                    //this.poll_expired = data.poll.expired
                    this.poll_expired_time = new Date(data.poll.expiresAt)
                    this.poll_multiple = data.poll.multiple
                    this.poll_options = []
                    data.poll.choices.forEach(elm => this.poll_options.push({
                        text: elm.text,
                        count: elm.votes
                    }))
                }

                // 添付メディア
                this.sensitive = (data.files?.filter(f => f.isSensitive)?.length ?? 0) > 0 // 閲覧注意設定
                this.medias = []
                data.files?.forEach(media => this.medias.push({
                    type: media.type.substring(0, media.type.indexOf("/")),
                    url: media.url,
                    thumbnail: media.thumbnailUrl,
                    sensitive: media.isSensitive,
                    aspect: media.properties.width / media.properties.height
                }))

                // 詳細表示に関するデータ
                this.author_id = data.user?.id
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
        this.status_key = `${original_date.substring(0, original_date.lastIndexOf('.'))}@${this.user?.full_address}`
    }

    // Getter: 挿入先カラム
    get from_column() { return this.from_timeline?.parent_column }
    // Getter: 挿入先タイムライングループ
    get from_group() { return this.from_timeline?.parent_group }
    // Getter: 取得元アカウントのカスタム絵文字
    get host_emojis() { return this.from_account?.emojis }
    // Getter: 本文をHTML解析して文章の部分だけを抜き出す
    get content_text() { return $($.parseHTML(this.content)).text() }
    // Getter: オリジナルテキスト(投稿時そのままの形式)
    get original_text() { return this.__original_text ?? $($.parseHTML(this.content)).text() }

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

    // Getter: 取得元アカウントのアカウントカラー
    get account_color() {
        return this.from_timeline?.pref?.timeline_type == 'channel' || this.from_timeline?.pref?.external ? this.from_timeline?.pref?.color : this.from_account?.pref.acc_color
    }
    // Getter: ミュート判定
    get muted() { // 文を分けると機能しなくなるっぽい
        return (this.from_timeline?.pref?.exclude_reblog && this.reblog) || (this.from_group?.pref?.tl_layout == 'gallery' && this.medias.length == 0)
    }

    /**
     * #StaticMethod
     * 「直前の投稿」のスタックにこの投稿をプッシュする
     * 
     * @param original_text 投稿したときに実際に打ち込んだ生テキスト(改行とかそのままの状態で保存するため)
     */
    pushStack(original_text) {
        this.__original_text = original_text
        History.pushPost(this)
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
                .forEach(post => $("#pop_extend_column .timeline>ul").prepend(post.element)))
            Promise.all(child_promises).then(children => children
                .forEach(post => $("#pop_extend_column .timeline>ul").append(post.element)))
        }).catch(jqXHR => toast("スレッドの取得に失敗しました.", "error"))
    }

    /**
     * #Method
     * この投稿を書いたアカウントの情報を取得する
     */
    getAuthorInfo() {
        return User.get({
            id: this.author_id,
            platform: this.from_account.platform,
            host: this.from_account.pref.domain
        })
    }

    // Getter: タイムラインに表示する投稿HTMLを生成して返却(オプションで変化)
    get timeline_element() {
        switch (this.from_group.pref.tl_layout) {
            case 'chat': // チャット
                if (this.type == 'notification') { // 通知の場合リプライ以外はリスト
                    if (this.notif_type == 'mention' || this.notif_type == 'reply')
                        return this.chat_elm
                    else this.list_elm
                } else return this.chat_elm
            case 'list': // リスト
                return this.list_elm
            case 'media': // メディア
                // 通知は通常と同じ、メディアがあるときだけ専用の様式、あとはリストと同じ
                if (this.type == 'notification') return this.element
                else if (this.medias.length > 0) return this.media_elm
                else return this.list_elm
            case 'gallery': // ギャラリー
                return this.gallery_elm
            default: // デフォルト(ノーマル)
                return this.element
        }
    }

    // Getter: 投稿データからHTMLを生成して返却(ノーマルレイアウト)
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
        } else if (this.reblog) { // ブースト/リノートのヘッダ
            const label = this.platform == 'Misskey' ? "Renoted" : "Boosted"
             html += `
                <div class="label_head label_reblog">
                    <span>${label} by @${this.reblog_by}</span>
                </div>
            `
        }

        // プロフィール表示の場合はユーザーアカウント情報を省略
        if (!this.profile_post_flg || this.reblog) {
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
            html /* ユーザーアカウント情報 */ += `
                <div class="user">
                    <img src="${this.user.avatar_url}" class="usericon"/>
                    <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                    <span class="userid">
                        <a class="__lnk_userdetail" name="@${this.user.full_address}">
                            @${this.user.id}
                        </a>
                    </span>
            `; if (this.reply_to) // リプライ/ツリーの場合も識別アイコンを表示
                html += '<img src="resources/ic_reply.png" class="visibilityicon"/>'
            else if (this.from_timeline?.pref?.timeline_type != 'channel' && this.local_only)
                // 連合なしのノートはアイコン表示(チャンネルは除外)
                html += '<img src="resources/ic_local.png" class="visibilityicon"/>'
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
            html += '</div>'
        }
        html += '<div class="content">'
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CWテキスト */ += `
            <a class="expand_header label_cw">${target_emojis.replace(this.cw_text)}</a>
        `; html += `<div class="main_content">
                    ${target_emojis.replace(this.content)}
                </div>
            </div>
        `
        if (this.poll_options) { // 投票
            let options = ''
            this.poll_options.forEach(elm => options += `
                <button type="button" class="__on_poll_vote"${this.poll_expired ? ' disabled' : ''}>${elm.text}</button>
            `)
            html /* 投票ブロック */ += `
                <div class="post_poll">
                    <div class="options">${options}</div>
                    <div class="poll_info">${Status.DATE_FORMATTER.format(this.poll_expired_time)} まで</div>
                </div>
            `
        }
        if (this.platform == 'Misskey' && this.quote_flg) {
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.quote.emojis
            html /* 引用ノート(Misskeyのみ) */ += `
                <div class="post_quote">
                    <div class="quote_userarea">
                        <span>${this.quote.username}</span>
                        <span>@${this.quote.user_id}</span>
                    </div>
                    <div>${target_emojis.replace(this.quote.content)}</div>
                </div>
            `
        }
        if (this.reaction_emoji) { // リアクション絵文字がある場合
            let alias = null
            if (this.reaction_emoji.match(/^:[a-zA-Z0-9_]+:$/g)) { // カスタム絵文字
                const emoji = this.host_emojis.emoji_map.get(this.reaction_emoji)
                if (emoji) alias = `<img src="${emoji.url}" class="inline_emoji"/>`
                else alias = `${this.reaction_emoji} (未キャッシュです)`
            } else alias = this.reaction_emoji // Unicode絵文字はそのまま渡す
            html += `<div class="reaction_emoji">${alias}</div>`
        }
        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content">
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
            // カード
            if (this.card) html += `
                <a href="${this.card.url}" class="card_link __lnk_external">
                    <div class="descriptions">
                        <h6>${this.card.title}</h6>
                        <div class="desc_text">${this.card.description}</div>
                    </div>
                </a>`
            if (this.hashtags) { // ハッシュタグ
                html += '<div class="hashtags">'
                this.hashtags.forEach(tag => html += `<a class="__on_detail_hashtag" name="${tag}">#${tag}</a>`)
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
                        `; else if (reaction.shortcode.lastIndexOf('@') > 0) reaction_html /* 取得できなかった絵文字 */ += `
                            <span class="count_reaction __yet_replace_reaction">
                                ${reaction.count}
                                :${reaction.shortcode.substring(1, reaction.shortcode.lastIndexOf('@'))}:
                            </span>
                        `; else reaction_html /* それ以外はそのまま表示 */ += `
                            <span class="count_reaction">
                                ${reaction.count} ${reaction.shortcode}
                            </span>
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

        if (this.from_group?.pref?.multi_timeline && this.from_timeline?.pref?.timeline_type == 'channel')
            // チャンネルでタイムラインが複数ある場合、チャンネル名でフッタを生成
            html += `<div class="from_address from_channel">${this.from_timeline?.pref?.channel_name}</div>`
        else if (this.from_group?.pref?.multi_user) { // マルチアカウントカラムの場合は表示元ユーザーを表示
            if (this.from_timeline?.pref?.external) // 外部インスタンスの場合はホスト名を表示
                html += `<div class="from_address from_external ${this.from_timeline?.pref.platform}">From ${this.from_timeline?.pref.host}</div>`
            else html += `<div class="from_address from_auth_user">From ${this.from_account.full_address}</div>`
        }
        html += `
                </div>
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.post_footer>.from_address').css("background-color", `#${this.account_color}`)
        jqelm.find('.post_footer>.from_address.from_auth_user')
            .css("background-image", `url("${this.from_account?.pref.avatar_url}")`)
        // カードがある場合はカードに背景を設定
        if (this.detail_flg && this.card) jqelm.find('.detail_info>.card_link')
            .css("background-image", `url("${this.card.image}")`)
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && `@${this.user.full_address}` == this.from_account?.full_address)
            jqelm.closest('li').addClass('self_post')
        // BTRNにはクラスをつける
        if (this.reblog) jqelm.closest('li').addClass('rebloged_post')
        if (this.cw_text && !this.from_timeline?.pref?.expand_cw)
            jqelm.find('.content>.main_content').hide()  // CWを非表示にする
        if (this.sensitive && !this.from_timeline?.pref?.expand_media)
            jqelm.find('.media>.media_content').hide() // 閲覧注意メディアを非表示にする

        return jqelm
    }

    // Getter: チャットタイプの投稿HTMLを生成して返却
    get chat_elm() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        const self_flg = `@${this.user.full_address}` == this.from_account?.full_address
        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="chat_timeline">`
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.user.avatar_url}" class="usericon"/>
                <span class="userid">
                    <a class="__lnk_userdetail" name="@${this.user.full_address}">
                        @${this.user.id}
                    </a>
                </span>
                <a class="created_at __on_datelink">${Status.DATE_FORMATTER.format(this.sort_date)}</a>
            </div>
            <div class="content">
        `
        if (this.reply_to) // リプライ/ツリーの場合も識別アイコンを表示
            html += '<img src="resources/ic_reply.png" class="visibilityicon"/>'
        else if (this.from_timeline?.pref?.timeline_type != 'channel' && this.local_only)
            // 連合なしのノートはアイコン表示(チャンネルは除外)
            html += '<img src="resources/ic_local.png" class="visibilityicon"/>'
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
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CWテキスト */ += `
            <a class="expand_header label_cw">${target_emojis.replace(this.cw_text)}</a>
        `
        html += `<div class="main_content">${target_emojis.replace(this.content)}</div>`

        if (this.from_group?.pref?.multi_timeline && this.from_timeline?.pref?.timeline_type == 'channel')
            // チャンネルでタイムラインが複数ある場合、チャンネル名でフッタを生成
            html += `<div class="from_address">
                <div class="from_channel"><span>${this.from_timeline?.pref?.channel_name}</span></div>
            </div>`
        if (this.from_group?.pref?.multi_user && !self_flg) {
            if (this.from_timeline?.pref.external) // 外部インスタンスの場合
                html += `<div class="from_address">
                    <div class="from_external ${this.from_timeline?.pref.platform}">
                        <span>${this.from_timeline?.pref.host}</span>
                    </div>
                </div>`
            else html += `<div class="from_address">
                <div class="from_auth_user"><span>${this.from_account.full_address}</span></div>
            </div>`
        }

        html += '</div>'
        if (this.reblog) { // ブースト/リノートのヘッダ
            const label = this.platform == 'Misskey' ? "Renoted" : "Boosted"
            html += `
                <div class="label_head label_reblog">
                    <span>${label} by @${this.reblog_by}</span>
                </div>
            `
        }
        if (this.poll_options) { // 投票
            let options = ''
            this.poll_options.forEach(elm => options += `
                <button type="button" class="__on_poll_vote"${this.poll_expired ? ' disabled' : ''}>${elm.text}</button>
            `)
            html /* 投票ブロック */ += `
                <div class="post_poll">
                    <div class="options">${options}</div>
                </div>
            `
        }
        if (this.platform == 'Misskey' && this.quote_flg) {
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.quote.emojis
            html /* 引用ノート(Misskeyのみ) */ += `
                <div class="post_quote">
                    <div>
                        <span>${this.quote.username}</span>
                        <span>@${this.quote.user_id}</span>
                    </div>
                    <div>${target_emojis.replace(this.quote.content)}</div>
                </div>
            `
        }
        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content">
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
        html += `
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.from_address>div').css("background-color", `#${this.account_color}`)
        jqelm.find('.from_address>.from_auth_user').css("background-image", `url("${this.from_account?.pref.avatar_url}")`)
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && self_flg) jqelm.closest('li').addClass('self_post')
        // BTRNにはクラスをつける
        if (this.reblog) jqelm.closest('li').addClass('rebloged_post')
        if (this.cw_text && !this.from_timeline?.pref?.expand_cw)
            jqelm.find('.content>.main_content').hide()  // CWを非表示にする
        if (this.sensitive && !this.from_timeline?.pref?.expand_media)
            jqelm.find('.media>.media_content').hide() // 閲覧注意メディアを非表示にする

        return jqelm
    }

    // Getter: リストタイプの投稿HTMLを生成して返却
    get list_elm() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外
        const notif_flg = this.type == 'notification'

        let target_emojis = null
        let html = `
            <li id="${this.status_key}" name="${this.uri}" class="short_timeline">
                <img src="${this.user.avatar_url}" class="usericon"/>
                <div class="content">
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CW時はCWのみ */ += `
                    <span class="main_content label_cw">${target_emojis.replace(this.cw_text)}</span>
        `; else if (notif_flg && this.notif_type == 'follow') html /* フォローの場合はユーザーアドレス */ += `
                    <span class="main_content">@${this.user.full_address}</span>
        `; else html /* 本文(マークアップを無視して1行だけ) */ += `
                    <span class="main_content">${target_emojis.replace(this.content_text)}</span>
        `
        html += '</div>'
        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            const media = this.medias[0]
            html /* 最初の1枚だけ表示(センシの場合は！アイコンのみ) */ += `
                <div class="list_media">
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}" class="__on_media_expand">
                        <img src="${this.sensitive ? 'resources/ic_warn.png' : media.thumbnail}" class="media_preview"/>
                    </a>
                </div>
            `
        }
        if (notif_flg) { // 通知の場合後ろにアイコンを配置
            html /* 最初の1枚だけ表示(センシの場合は！アイコンのみ) */ += `
                <div class="notif_footer">
                    <img src="" class="ic_notif_type"/>
            `; if (this.from_group?.pref?.multi_user) // マルチアカウントカラムの場合は後ろにアイコン表示
                html += `<img src="${this.from_account?.pref.avatar_url}" class="ic_target_account"/>`
            html += '</div>'
        }
        html += `
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && `@${this.user.full_address}` == this.from_account?.full_address)
            jqelm.closest('li').addClass('self_post')
        // BTRNにはクラスをつける
        if (this.reblog) jqelm.closest('li').addClass('rebloged_post')
        if (notif_flg) {
            jqelm.closest('li').addClass('short_notification')
            switch (this.notif_type) {
                case 'favourite': // お気に入り
                    jqelm.closest('li').addClass('favorited_post')
                    jqelm.find('.ic_notif_type').attr('src', 'resources/ic_cnt_fav.png')
                    break
                case 'reblog': // ブースト
                case 'renote': // リノート
                    jqelm.closest('li').addClass('rebloged_post')
                    jqelm.find('.ic_notif_type').attr('src', 'resources/ic_cnt_rblg.png')
                    break
                case 'reaction': // 絵文字リアクション
                    jqelm.closest('li').addClass('favorited_post')
                    jqelm.find('.ic_notif_type').remove() // 一旦消す
                    let alias = null
                    if (this.reaction_emoji.match(/^:[a-zA-Z0-9_]+:$/g)) { // カスタム絵文字
                        const emoji = this.host_emojis.emoji_map.get(this.reaction_emoji)
                        if (emoji) alias = `<img src="${emoji.url}" class="ic_notif_type"/>`
                        else alias = '×'
                    } else if (this.reaction_emoji.match(/^[a-zA-Z0-9\.:@_]+$/g)) // リモートの絵文字
                        alias = '<img src="resources/ic_emoji_remote.png" class="ic_notif_type"/>'
                    else alias = this.reaction_emoji // Unicode絵文字はそのまま渡す
                    jqelm.find('.notif_footer').prepend(alias)
                    break
                case 'follow': // フォロー通知
                    jqelm.closest('li').addClass('self_post')
                    jqelm.find('.ic_notif_type').attr('src', 'resources/ic_cnt_flwr.png')
                    break
                default: // リプライ、引用の場合はアイコン削除
                    jqelm.find('.ic_notif_type').remove()
                    break
            }
        }

        return jqelm
    }

    // Getter: メディアタイプのHTMLを生成して返却
    get media_elm() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="media_timeline">`
        if (this.reblog) { // ブースト/リノートのヘッダ
            const label = this.platform == 'Misskey' ? "Renoted" : "Boosted"
             html += `
                <div class="label_head label_reblog">
                    <span>${label} by @${this.reblog_by}</span>
                </div>
            `
        }
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.user.avatar_url}" class="usericon"/>
                <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                <span class="userid">
                    <a class="__lnk_userdetail" name="@${this.user.full_address}">
                        @${this.user.id}
                    </a>
                </span>
        `
        html += `
            </div>
        `
        // 本文よりも先にメディアを表示
        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content">
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
        html += `
            <div class="content">
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CWテキスト */ += `
            <a class="expand_header label_cw">${target_emojis.replace(this.cw_text)}</a>
        `; html += '<div class="main_content">'

        html /* 本文(絵文字を置換) */ += target_emojis.replace(this.content)
        html += `
                </div>
            </div>
        `
        html /* 投稿(ステータス)日付 */ += `
            <div class="post_footer">
                <a class="created_at __on_datelink">${Status.DATE_FORMATTER.format(this.sort_date)}</a>
        `

        if (this.from_group?.pref?.multi_timeline && this.from_timeline?.pref?.timeline_type == 'channel')
            // チャンネルでタイムラインが複数ある場合、チャンネル名でフッタを生成
            html += `<div class="from_address from_channel">${this.from_timeline?.pref?.channel_name}</div>`
        else if (this.from_group?.pref?.multi_user) { // マルチアカウントカラムの場合は表示元ユーザーを表示
            if (this.from_timeline?.pref?.external) // 外部インスタンスの場合はホスト名を表示
                html += `<div class="from_address from_external ${this.from_timeline?.pref.platform}">From ${this.from_timeline?.pref.host}</div>`
            else html += `<div class="from_address from_auth_user">From ${this.from_account.full_address}</div>`
        }
        html += `
                </div>
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.post_footer>.from_address').css("background-color", `#${this.account_color}`)
        jqelm.find('.post_footer>.from_address.from_auth_user')
            .css("background-image", `url("${this.from_account?.pref.avatar_url}")`)
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && `@${this.user.full_address}` == this.from_account?.full_address)
            jqelm.closest('li').addClass('self_post')
        // BTRNにはクラスをつける
        if (this.reblog) jqelm.closest('li').addClass('rebloged_post')
        if (this.cw_text && !this.from_timeline?.pref?.expand_cw)
            jqelm.find('.content>.main_content').hide()  // CWを非表示にする
        if (this.sensitive && !this.from_timeline?.pref?.expand_media)
            jqelm.find('.media>.media_content').hide() // 閲覧注意メディアを非表示にする

        return jqelm
    }

    // Getter: ギャラリータイプのHTMLを生成して返却
    get gallery_elm() {
        // メディアごとにタイルブロックを生成
        let html = ''
        this.medias.forEach(media => html /* name属性にURLを設定 */ += `
            <li id="${this.status_key}" name="${this.uri}" class="gallery_timeline">
                <a href="${media.url}" type="${media.type}" name="${media.aspect}"
                    class="__on_media_expand${media.sensitive ? ' warn_sensitive' : ''}">
                    <img src="${!this.from_timeline?.pref?.expand_media && media.sensitive ? 'resources/illust/ic_unauth.jpg' : media.thumbnail}" class="media_preview"/>
                </a>
            </li>
        `)

        // 生成したHTMLをjQueryオブジェクトとして返却
        return $($.parseHTML(html))
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
     * #StaticMethod
     * スクロール末尾に表示されたら自動で続きを読み込むローダーを生成する
     * 
     * @param arg パラメータオブジェクト
     */
    static createScrollLoader(arg) {
        const last_id = arg.list.pop().id
        // ローダーエレメントを生成
        arg.target.append(`
            <li id="${last_id}" class="__scroll_loader">
                <span class="loader_message">続きを読み込みます...</span>
            </li>
        `)
        // Intersection Observerを生成
        const observer = new IntersectionObserver((entries, obs) => (async () => {
            const e = entries[0]
            if (!e.isIntersecting) return // 見えていないときは実行しない
            console.log('ローダー表示: ' + last_id)
            // ローダーを一旦削除
            obs.disconnect()
            $(e.target).remove()
            const data = await arg.asyncLoader(last_id)
            //console.log(data)
            if (data?.length > 0) { // データが存在する場合は取得して再帰的にローダーを生成
                /* TODO: 勘違いで実装した処理なので一旦保留
                { // 最初のデータだけは重複判定のために独自実装
                    arg.binder(data.shift(), arg.target)
                    const key = arg.target.find(">li:last-child").attr("name")
                    if (arg.target.find(`>li[name="${key}"]:not(:last-child)`).length > 0) {
                        // 既に存在するデータがある場合は要素を削除して再帰を終了
                        arg.target.find(">li:last-child").remove()
                        return
                    }
                }//*/
                data.forEach(elm => arg.binder(elm, arg.target))
                arg.list = data
                Status.createScrollLoader(arg)
            }
        })(), {
            root: arg.target.get(0),
            rootMargin: "0px",
            threshold: 1.0,
        })
        observer.observe(arg.target.find(".__scroll_loader").get(0))
    }

    /**
     * #Method
     * この投稿に添付されているメディアを拡大表示するモーダルウィンドウを生成
     * 
     * @param url ターゲットの画像URL
     * @param index ターゲットの画像のインデクス
     */
    createImageModal(url, index) {
        // 一旦全部クリア
        $("#modal_expand_image>*").empty()
        this.medias.forEach(media => {
            // 動画ファイルの場合はvideoを使う
            if (media.type == 'video' || media.type == 'gifv') $("#modal_expand_image>#expand_image_box").append(`
                <li name="${this.uri}">
                    <video src="${media.url}" class="expanded_media" preload controls loop></video>
                </li>
            `); else /* それ以外は画像ファイル */ $("#modal_expand_image>#expand_image_box").append(`
                <li name="${this.uri}"><img src="${media.url}" class="expanded_media"/></li>
            `)
            // サムネイルリスト
            $("#modal_expand_image>#expand_thumbnail_list").append(`
                <li name="${media.url}"><img src="${media.thumbnail}"/></li>
            `)
        })
        const target_media = index >= 0
            ? $(`#modal_expand_image>#expand_image_box>li:nth-child(${index + 1})>.expanded_media`)
            : $(`#modal_expand_image>#expand_image_box>li>.expanded_media[src="${url}"]`)
        target_media.show()
        // 動画の場合は自動再生
        if (target_media.is("video")) target_media.get(0).play()
        $(`#modal_expand_image>#expand_thumbnail_list>li[name="${url}"]`).addClass("selected_image")
        $("#modal_expand_image").show("fade", 80)
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
        $("#pop_extend_column").html(jqelm).show("slide", { direction: "up" }, 150)
        // 表示後にリプライカラムのテキストボックスにフォーカスする(カーソルを末尾につける)
        const replyarea = $("#pop_extend_column #__txt_replyarea")
        replyarea.focus()
        replyarea.get(0).setSelectionRange(500, 500)
    }

    /**
     * #Method
     * この投稿を引用した投稿するための画面を表示
     */
    createQuoteWindow() {
        // リプライウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="quote_col">
                <h2>From ${this.from_account.full_address}</h2>
                <div class="quote_form">
                    <input type="hidden" id="__hdn_quote_id" value="${this.id}"/>
                    <input type="hidden" id="__hdn_quote_account" value="${this.from_account.full_address}"/>
                    <div class="visibility_icon">
                        <a class="__lnk_visibility" title="公開">
                            <img src="resources/ic_public.png" alt="公開" id="visibility_public" class="selected"/></a>
                        <a class="__lnk_visibility" title="未収載/ホーム">
                            <img src="resources/ic_unlisted.png" alt="未収載/ホーム" id="visibility_unlisted"/></a>
                        <a class="__lnk_visibility" title="フォロワー限定">
                            <img src="resources/ic_followers.png" alt="フォロワー限定" id="visibility_followers"/></a>
                        <a class="__lnk_visibility" title="ダイレクトメッセージ">
                            <img src="resources/ic_direct.png" alt="ダイレクトメッセージ" id="visibility_direct"/></a>
                    </div>
                    <input type="text" id="__txt_quote_cw" class="__ignore_keyborad" placeholder="CWの場合入力"/>
                    <textarea id="__txt_quotearea" class="__ignore_keyborad"
                        placeholder="(Ctrl+Enterでも投稿できます)"></textarea>
                    <button type="button" id="__on_quote_submit">投稿</button>
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
        $("#pop_extend_column").html(jqelm).show("slide", { direction: "up" }, 150)
        // 表示後にリプライカラムのテキストボックスにフォーカスする(カーソルを末尾につける)
        const replyarea = $("#pop_extend_column #__txt_quotearea")
        replyarea.focus()
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
                <input type="text" id="__txt_reaction_search" class="__ignore_keyborad"
                    placeholder="ショートコードを入力するとサジェストされます"/>
                <div class="recent_reaction">
                    <h5>最近送ったリアクション</h5>
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
        // リアクション履歴を表示する
        jqelm.find('.recent_reaction').append(this.from_account.recent_reaction_html)
        $("#pop_extend_column").html(jqelm).show("slide", { direction: "up" }, 150)
        // サジェストテキストボックスにフォーカス
        $("#__txt_reaction_search").focus()

        // 一度枠組みを表示してから非同期で絵文字一覧を動的に表示してく
        ;(async () => this.from_account.emojis.each(emoji => $("#pop_extend_column .reaction_list").append(`
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
        $("#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)
        const parent_post = $(`#pop_extend_column .timeline>ul>li[id="${this.status_key}"]`)

        if (this.platform == 'Misskey') { // Misskeyの場合非同期絵文字置換を実行
            const host = this.from_account.pref.domain
            Emojis.replaceDomAsync(parent_post.find(".username"), host) // ユーザー名
            Emojis.replaceDomAsync(parent_post.find(".label_cw"), host) // CWテキスト
            Emojis.replaceDomAsync(parent_post.find(".main_content"), host) // 本文
            Emojis.replaceDomAsync(parent_post.find(".__yet_replace_reaction"), host) // 未置換のリアクション
        }
        // 一度表示してからチェインしている投稿を取得する(非同期)
        this.getThread()
        // 詳細表示のターゲットになっている投稿の直上に簡易プロフィールを設置(非同期)
        this.getAuthorInfo().then(user => parent_post.before(user.short_elm))
    }

    /**
     * #Method
     * この投稿をノーマルレイアウトでポップアップするウィンドウを生成
     * 
     * @param target この投稿のjQueryオブジェクト(座標決定に使用)
     */
    createExpandWindow(target) {
        // 隠しウィンドウにこの投稿を挿入
        const pos = target.offset()
        $("#pop_expand_post>ul").html(this.element).css('width', `${this.from_column.pref.col_width}px`)
        Emojis.replaceRemoteAsync($("#pop_expand_post .reaction_emoji"))

        if (window.innerHeight / 2 < pos.top) // ウィンドウの下の方にある場合は下から展開
            $("#pop_expand_post").css({
                'top': 'auto',
                'bottom': Math.round(window.innerHeight - pos.top - 48),
                'left': pos.left
            })
        else $("#pop_expand_post").css({
            'bottom': 'auto',
            'top': pos.top - 24,
            'left': pos.left
        })
        $("#pop_expand_post").show("fade", 80)
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

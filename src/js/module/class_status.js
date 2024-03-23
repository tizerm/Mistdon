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

        switch (this.platform) {
            case 'Mastodon': // Mastodon
                this.notif_type = this.type == 'notification' ? json.type : null
                this.allow_context = !(this.type == 'notification' && json.type == "follow")
                original_date = json.created_at
                this.reblog = json.reblog ? true : false // ブーストフラグ
                this.reblog_by = this.reblog ? json.account.acct : null // ブースト元ユーザー
                this.reblog_by_icon = this.reblog ? json.account.avatar : null // ブースト元ユーザーアイコン

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
                this.allow_reblog = this.visibility == 'public' || this.visibility == 'unlisted'
                this.reply_to = data.in_reply_to_id
                this.cw_text = data.spoiler_text // CWテキスト
                if (this.notif_type && this.notif_type != 'follow') { // 本文(通知の場合はstatusから)
                    this.content = data.status?.content
                    data = data.status
                } else this.content = data.content
                this.emojis = new Emojis({
                    host: host,
                    platform: 'Mastodon',
                    emojis: data.status?.emojis ?? data.emojis
                })

                // 投票がある場合は投票に関するデータ
                if (data.poll) {
                    this.poll_id = data.poll.id
                    this.poll_expired = data.poll.expired
                    this.poll_expired_time = new Date(data.poll.expires_at)
                    this.poll_unlimited = !data.poll.expires_at
                    this.poll_multiple = data.poll.multiple
                    this.poll_options = Status.asArrayPoll(data.poll, this.platform)
                    this.poll_voted = data.poll.voted
                }

                // 添付メディア
                this.sensitive = data.sensitive // 閲覧注意設定
                this.medias = []
                data.media_attachments?.forEach(media => this.medias.push({
                    id: media.id,
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
                this.allow_context = !(this.type == 'notification' && json.type == "follow")
                if (this.notif_type == 'achievementEarned') return // TODO: 実績は一旦除外

                original_date = json.createdAt
                this.reblog = json.renote && !json.text // リノートフラグ
                this.reblog_by = this.reblog ? json.user.username
                    + (json.user.host ? ('@' + json.user.host) : '') : null // リノート元ユーザー
                this.reblog_by_icon = this.reblog ? json.user?.avatarUrl : null // リノート元ユーザーアイコン

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
                this.allow_reblog = this.visibility == 'public' || this.visibility == 'home'
                this.local_only = data.localOnly
                this.reply_to = data.replyId
                this.cw_text = data.cw // CWテキスト
                if (this.notif_type == 'renote') { // リノート通知の場合は本文をリノート対象ノートにする
                    this.content = data.note.renote.text
                    data = data.note.renote
                } else if (this.notif_type) { // リノート以外の通知の場合は本文を対象ノートにする
                    this.content = data.note?.text
                    data = data?.note ?? data
                } else this.content = data.text // それ以外は通常の本文テキストを参照
                if (this.content) this.content = this.content
                    .replace(new RegExp('<', 'g'), '&lt;') // 先にタグエスケープをする(改行がエスケープされるので)
                    .replace(new RegExp('>', 'g'), '&gt;')
                    .replace(new RegExp('https?://[^ 　\n]+', 'g'), // MisskeyはURLをリンクをリンクとして展開する
                        match => `<a href="${match}">${match}</a>`)
                    .replace(new RegExp('\n', 'g'), '<br/>') // 改行文字をタグに置換

                this.quote_flg = data.renote && data.text
                this.emojis = new Emojis({
                    host: host,
                    platform: 'Misskey',
                    emojis: data.note?.renote?.emojis ?? data.note?.emojis ?? data.emojis
                })
                // 引用ノートがある場合は引用先を設定
                if (this.quote_flg) this.quote = new Status(data.renote, timeline, account)

                // 投票がある場合は投票に関するデータ
                if (data.poll) {
                    this.poll_expired_time = new Date(data.poll.expiresAt)
                    this.poll_unlimited = !data.poll.expiresAt
                    this.poll_expired = !this.poll_unlimited && this.poll_expired_time < new Date()
                    this.poll_multiple = data.poll.multiple
                    this.poll_options = Status.asArrayPoll(data.poll, this.platform)
                    this.poll_voted = data.poll.choices.some(v => v.isVoted)
                }

                // 添付メディア
                this.sensitive = (data.files?.filter(f => f.isSensitive)?.length ?? 0) > 0 // 閲覧注意設定
                this.medias = []
                data.files?.forEach(media => this.medias.push({
                    id: media.id,
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
                    this.count_fav = reactions.reduce((sum, react) => sum + Number(react.count), 0)
                }
                break
            default:
                break
        }

        // このステータスを一意に決定するためのキーを設定
        this.sort_date = new Date(original_date)
        this.relative_time = new RelativeTime(this.sort_date)
        this.status_key = `${original_date.substring(0, original_date.lastIndexOf('.'))}@${this.user?.full_address}`
    }

    // Getter: 挿入先カラム
    get from_column() { return this.from_timeline?.parent_column }
    // Getter: 挿入先タイムライングループ
    get from_group() { return this.from_timeline?.parent_group }
    // Getter: 取得元アカウントのカスタム絵文字
    get host_emojis() { return this.from_account?.emojis }
    // Getter: オリジナルテキスト(投稿時そのままの形式)
    get original_text() { return this.__original_text ?? $($.parseHTML(this.content)).text() }

    // 投稿データを一次保存するスタティックフィールド
    static TEMPORARY_CONTEXT_STATUS = null
    static TEMPORARY_ACTION_STATUS = null

    // Getter: 取得元アカウントのアカウントカラー
    get account_color() {
        return this.from_timeline?.pref?.timeline_type == 'channel'
            || this.from_timeline?.pref?.external ? this.from_timeline?.pref?.color : this.from_account?.pref.acc_color
    }
    // Getter: ミュート判定
    get muted() {
        return (this.from_timeline?.pref?.exclude_reblog && this.reblog)
            || (this.from_group?.pref?.tl_layout == 'gallery' && this.medias.length == 0)
    }
    // Getter: 本文をHTML解析して文章の部分だけを抜き出す
    get content_text() {
        return $($.parseHTML(this.content)).text()
            .replace(new RegExp('<', 'g'), '&lt;') // タグエスケープを挟む
            .replace(new RegExp('>', 'g'), '&gt;')
    }
    // Getter: 本文の文章の部分の文字数を抜き出す
    get content_length() {
        return this.content_text
            .replace(new RegExp(':[a-zA-Z0-9_]+:', 'g'), '$$')
            .replace(new RegExp('https?://[^ 　\n]+', 'g'), '$$').length
    }

    /**
     * #StaticMethod
     * Response JSONのアンケート情報を統一化した配列にして返却する
     * 
     * @param poll 生の投票データ
     * @param platform 対象プラットフォーム
     */
    static asArrayPoll(poll, platform) {
        let total_vote = 0
        const poll_options = []
        switch (platform) {
            case 'Mastodon': // Mastodon
                total_vote = poll.options.reduce((sum, elm) => sum + elm.votes_count, 0)
                poll.options.forEach(elm => poll_options.push({
                    text: elm.title,
                    count: elm.votes_count,
                    rate: total_vote > 0 ? floor((elm.votes_count / total_vote) * 100, 1) : 0
                }))
                break
            case 'Misskey': // Misskey
                total_vote = poll.choices.reduce((sum, elm) => sum + elm.votes, 0)
                poll.choices.forEach(elm => poll_options.push({
                    text: elm.text,
                    count: elm.votes,
                    rate: total_vote > 0 ? floor((elm.votes / total_vote) * 100, 1) : 0
                }))
                break
            default:
                break
        }
        return poll_options
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
        const notification = Notification.progress("投稿の取得中です...")
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

        let response = null
        try { // リモートの投稿を直接取得
            const authed_account = Account.getByDomain(domain)
            switch (platform) {
                case 'Mastodon': // Mastodon
                    let header = {}
                    if (authed_account) header = { "Authorization": `Bearer ${authed_account.pref.access_token}` }
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${domain}/api/v1/statuses/${id}`,
                        dataType: "json",
                        headers: header
                    })
                    break
                case 'Misskey': // Misskey
                    let query_param = { "noteId": id }
                    if (authed_account) query_param.i = authed_account.pref.access_token
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${domain}/api/notes/show`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    break
                default:
                    notification.error("詳細表示のできない投稿です.")
                    return
            }
            notification.done()
            return new Status(response, null, { // accountには最低限の情報だけ入れる
                "platform": platform,
                "pref": { "domain": domain }
            })
        } catch (err) {
            console.log(err)
            notification.error("投稿の取得に失敗しました.")
        }
    }

    /**
     * #StaticMethod
     * IDから投稿データを対象サーバーを使って取得する
     * 
     * @param arg パラメータオブジェクト
     */
    static async getTreePost(arg) {
        let response = null
        try { // リモートの投稿を直接取得
            switch (arg.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({ // リモートの投稿を直接取得
                        type: "GET",
                        url: `https://${arg.domain}/api/v1/statuses/${arg.id}`,
                        dataType: "json",
                    })
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({ // リモートの投稿を直接取得
                        type: "POST",
                        url: `https://${arg.domain}/api/notes/show`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ "noteId": arg.id })
                    })
                    break
                default:
                    Notification.error("詳細表示のできない投稿です.")
                    return
            }
            return new Status(response, null, { // accountには最低限の情報だけ入れる
                "platform": arg.platform,
                "pref": { "domain": arg.domain }
            })
        } catch (err) {
            console.log(err)
            Notification.error("投稿の取得に失敗しました.")
        }
    }

    /**
     * #Method
     * この投稿を軸としてその後に続くリプライ/ツリーと、その前に続くリプライ/ツリーを取得
     * そのあと、詳細表示ウィンドウに表示
     */
    async getThread() {
        const domain = this.from_account.pref.domain
        const parent_promises = []
        const child_promises = []
        let response = null
        try {
            switch (this.from_account.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({ // ツリー元ツートとチェインしているツートを同時取得
                        type: "GET",
                        url: `https://${domain}/api/v1/statuses/${this.id}/context`,
                        dataType: "json"
                    })
                    // ツリー元のツートを取得(逆順)
                    response.ancestors.reverse().forEach(ids => parent_promises.push(Status.getTreePost({
                        id: ids.id,
                        platform: this.from_account.platform,
                        domain: domain
                    })))
                    // チェインしているツートを取得
                    response.descendants.forEach(ids => child_promises.push(Status.getTreePost({
                        id: ids.id,
                        platform: this.from_account.platform,
                        domain: domain
                    })))
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
                    await Promise.all([
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
                        }), recurseChain(this)])
                    break
                default:
                    break
            }
            // すべてのAPIの呼び出しが終わったら親と子の取得処理が終わり次第バインド処理に移行
            await Promise.allSettled([ // 2つのPromiseを同時実行しながら終了までresolveしない
                Promise.all(parent_promises).then(parents => parents
                    .forEach(post => $(`#post_window_${this.__detail_uuid}>.timeline>ul`).prepend(post.element))),
                Promise.all(child_promises).then(children => children
                    .forEach(post => $(`#post_window_${this.__detail_uuid}>.timeline>ul`).append(post.element)))
            ])
            return Promise.resolve('finish.')
        } catch (err) {
            console.log(err)
            Notification.error("スレッドの取得に失敗しました.")
        }
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

    /**
     * #Method
     * この投稿を対象のタイムラインレイアウトを使って表示(DOMを返却)する.
     * 
     * @param pref 適用するタイムラインレイアウト
     */
    getLayoutElement(pref) {
        switch (pref) {
            case 'chat': // チャット
                if (this.type != 'notification' || this.notif_type == 'poll'
                    || this.notif_type == 'mention' || this.notif_type == 'reply' || this.notif_type == 'quote')
                    return this.chat_elm
                else this.list_elm // 通知はリスト表示にする
            case 'list': // リスト
                return this.list_elm
            case 'media': // メディア
                // 通知は通常と同じ、メディアがあるときだけ専用の様式、あとはリストと同じ
                if (this.type == 'notification') return this.element
                else if (this.medias.length > 0) return this.media_elm
                else return this.list_elm
            case 'gallery': // ギャラリー
                return this.gallery_elm
            case 'anonymous': // アノニマス
                return this.anonymous_elm
            case 'multi': // マルチレイアウト
                return this.mix_element
            default: // デフォルト(ノーマル)
                return this.element
        }
    }

    // Getter: タイムラインに表示する投稿HTMLを生成して返却(オプションで変化)
    get timeline_element() { return this.getLayoutElement(this.from_group.pref.tl_layout) }

    // Getter: 投稿データからHTMLを生成して返却(ノーマルレイアウト)
    get element() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="normal_layout">`
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

        // 投稿識別アイコン
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
        // プロフィール表示の場合はユーザーアカウント情報を省略
        if (!this.profile_post_flg || this.reblog) {
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
            html /* ユーザーアカウント情報(ノーマル2を使っている場合は専用のクラスを付ける) */ += `
                <div class="user${this.from_group?.pref?.tl_layout == 'normal2' ? ' prof_normal2' : ''}">
                    <img src="${this.user.avatar_url}" class="usericon" name="@${this.user.full_address}"/>
                    <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                    <span class="userid">
                        <a class="__lnk_userdetail" name="@${this.user.full_address}">
                            @${this.detail_flg || this.popout_flg ? this.user.full_address : this.user.id}
                        </a>
                    </span>
                </div>
            `
        }
        { // 投稿本文領域
            html += '<div class="content">'
            const over_content = !this.popout_flg && !this.profile_post_flg && !this.detail_flg // 文字数制限
                && this.content_length > Preference.GENERAL_PREFERENCE.contents_limit.default
            if (over_content) html += `<div class="content_length_limit label_limitover">(${this.content_length}文字)</div>`
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
            if (this.cw_text) html /* CWテキスト */ += `
                <a class="expand_header label_cw">${target_emojis.replace(this.cw_text)}</a>
            `; if (over_content) html += `<div class="hidden_content">${this.content_text}</div>`
            else html += `<div class="main_content">${target_emojis.replace(this.content)}</div>`
            html += '</div>'
        }
        if (this.poll_options) { // 投票
            let options = ''
            this.poll_options.forEach(elm => options += `
                <button type="button" class="__on_poll_vote"${this.poll_expired ? ' disabled' : ''}>${elm.text}</button>
            `)
            const label_limit = this.poll_unlimited // 投票期限テキスト
                ? '無期限' : `${RelativeTime.DATE_FORMATTER.format(this.poll_expired_time)} まで`
            html /* 投票ブロック */ += `
                <div class="post_poll">
                    <div class="options">${options}</div>
                    <div class="poll_info">${label_limit}</div>
                </div>
            `
        }
        if (this.platform == 'Misskey' && this.quote_flg) {
            const content = !this.popout_flg && !this.detail_flg // 文字数制限
                && this.quote.content_length > Preference.GENERAL_PREFERENCE.contents_limit.default ? `
                <div class="hidden_content">
                    ${this.quote.content_text.substring(0, Preference.GENERAL_PREFERENCE.contents_limit.default)}...
                </div>
                <div class="hidden_text">(長いので省略されています)</div>
            ` : `<div class="main_content">${target_emojis.replace(this.quote.content)}</div>`
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.quote.emojis
            html /* 引用ノート(Misskeyのみ) */ += `
                <div class="post_quote">
                    <div class="quote_userarea">
                        <span>${this.quote.user.username}</span>
                        <span>@${this.quote.user.id}</span>
                    </div>
                    ${content}
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
            const img_class = this.medias.length > 4 ? 'img_grid_16' : 'img_grid_4'
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content">
            `; else html += '<div class="media_content">'
            // アスペクト比をリンクオプションとして設定
            this.medias.forEach(media => {
                if (media.type == 'audio') html /* 音声ファイル(サムネなしで直接埋め込む) */+= `
                    <audio controls src="${media.url}" preload="none"></audio>
                `; else html /* 画像か動画ファイル(サムネから拡大表示) */ += `
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}"
                        class="__on_media_expand ${img_class}">
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
                <a class="created_at __on_datelink">${this.relative_time.both}</a>
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
        // 期限切れ、投票済み、詳細表示のいずれかの場合は投票ボタンを消して結果を表示する
        if (this.poll_options && (this.detail_flg || this.poll_voted || (!this.poll_unlimited && this.poll_expired)))
            jqelm.find('.post_poll').after(this.poll_graph).remove()
        // カードがある場合はカードに背景を設定
        if (this.detail_flg && this.card) jqelm.find('.detail_info>.card_link')
            .css("background-image", `url("${this.card.image}")`)
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // フォロー通知の場合はコンテキストメニューを禁止する
        if (!this.allow_context) jqelm.closest('li').addClass('context_disabled')
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && `@${this.user.full_address}` == this.from_account?.full_address)
            jqelm.closest('li').addClass('self_post')
        if (this.reblog) { // BTRNにはクラスをつけて背景をセット
            jqelm.closest('li').addClass('rebloged_post')
            jqelm.find('.label_reblog').css("background-image", `url("${this.reblog_by_icon}")`)
        }
        if (this.profile_post_flg || this.detail_flg) // プロフィールと詳細表示は投稿時刻で色分けする
            jqelm.find('.post_footer>.created_at').addClass(`from_address ${this.relative_time.color_class}`)
        // 時間で色分け
        jqelm.closest('li').css('border-left-color', this.relative_time.color)
        if (this.cw_text && !this.from_timeline?.pref?.expand_cw) // CWを非表示にする
            jqelm.find('.content>.expand_header.label_cw+div').hide()
        if (this.sensitive && !this.from_timeline?.pref?.expand_media) // 閲覧注意メディアを非表示にする
            jqelm.find('.media>.media_content').hide()

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
                <img src="${this.user.avatar_url}" class="usericon" name="@${this.user.full_address}"/>
                <span class="userid">
                    <a class="__lnk_userdetail" name="@${this.user.full_address}">
                        @${this.user.id}
                    </a>
                </span>
                <a class="created_at __on_datelink">${this.relative_time.both}</a>
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
        { // 投稿本文領域
            const over_content = !this.profile_post_flg && !this.detail_flg // 文字数制限
                && this.content_length > Preference.GENERAL_PREFERENCE.contents_limit.chat
            if (over_content) html += `<div class="content_length_limit label_limitover">(${this.content_length}文字)</div>`
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
            if (this.cw_text) html /* CWテキスト */ += `
                <a class="expand_header label_cw">${target_emojis.replace(this.cw_text)}</a>
            `; if (over_content) html += `<div class="hidden_content">${this.content_text}</div>`
            else html += `<div class="main_content">${target_emojis.replace(this.content)}</div>`
        }

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
            const content = !this.popout_flg && !this.detail_flg // 文字数制限
                && this.quote.content_length > Preference.GENERAL_PREFERENCE.contents_limit.chat ? `
                <div class="hidden_content">
                    ${this.quote.content_text.substring(0, Preference.GENERAL_PREFERENCE.contents_limit.chat)}...
                </div>
                <div class="hidden_text">(長いので省略されています)</div>
            ` : `<div class="main_content">${target_emojis.replace(this.quote.content)}</div>`
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.quote.emojis
            html /* 引用ノート(Misskeyのみ) */ += `
                <div class="post_quote">
                    <div class="quote_userarea">
                        <span>${this.quote.user.username}</span>
                        <span>@${this.quote.user.id}</span>
                    </div>
                    ${content}
                </div>
            `
        }
        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            const img_class = this.medias.length > 4 ? 'img_grid_64' : 'img_grid_16'
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content">
            `; else html += '<div class="media_content">'
            // アスペクト比をリンクオプションとして設定
            this.medias.forEach(media => {
                if (media.type == 'audio') html /* 音声ファイル(サムネなしで直接埋め込む) */+= `
                    <audio controls src="${media.url}" preload="none"></audio>
                `; else html /* 画像か動画ファイル(サムネから拡大表示) */ += `
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}"
                        class="__on_media_expand ${img_class}">
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
        jqelm.find('.label_reblog').css("background-image", `url("${this.reblog_by_icon}")`)
        // 期限切れか投票済みの場合は投票ボタンを消して結果を表示する
        if (this.poll_options && !this.detail_flg && (this.poll_voted || (!this.poll_unlimited && this.poll_expired)))
            jqelm.find('.post_poll').after(this.poll_graph).remove()
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && self_flg) jqelm.closest('li').addClass('self_post')
        // BTRNにはクラスをつける
        if (this.reblog) jqelm.closest('li').addClass('rebloged_post')
        // 時間で色分け
        jqelm.find('.content').css('border-left-color', this.relative_time.color)
        if (this.cw_text && !this.from_timeline?.pref?.expand_cw) // CWを非表示にする
            jqelm.find('.content>.expand_header.label_cw+div').hide()
        if (this.sensitive && !this.from_timeline?.pref?.expand_media) // 閲覧注意メディアを非表示にする
            jqelm.find('.media>.media_content').hide()

        return jqelm
    }

    // Getter: リストタイプの投稿HTMLを生成して返却
    get list_elm() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外
        const notif_flg = this.type == 'notification'

        let target_emojis = null
        let html = `
            <li id="${this.status_key}" name="${this.uri}" class="short_timeline">
                <img src="${this.user.avatar_url}" class="usericon" name="@${this.user.full_address}"/>
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
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // フォロー通知の場合はコンテキストメニューを禁止する
        if (!this.allow_context) jqelm.closest('li').addClass('context_disabled')
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && `@${this.user.full_address}` == this.from_account?.full_address)
            jqelm.closest('li').addClass('self_post')
        // BTRNにはクラスをつける
        if (this.reblog) jqelm.closest('li').addClass('rebloged_post')
        // 時間で色分け
        jqelm.closest('li').css('border-left-color', this.relative_time.color)
        if (notif_flg) {
            jqelm.closest('li').addClass('short_notification')
            switch (this.notif_type) {
                case 'favourite': // お気に入り
                    jqelm.closest('li').addClass('favorited_post')
                    jqelm.find('.ic_notif_type').attr('src', 'resources/ic_favorite.png')
                    break
                case 'reblog': // ブースト
                case 'renote': // リノート
                    jqelm.closest('li').addClass('rebloged_post')
                    jqelm.find('.ic_notif_type').attr('src', 'resources/ic_reblog.png')
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
                case 'poll': // 投票終了
                    jqelm.find('.ic_notif_type').attr('src', 'resources/ic_poll.png')
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
                <img src="${this.user.avatar_url}" class="usericon" name="@${this.user.full_address}"/>
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
            let img_class = 'img_grid_single'
            if (this.medias.length > 4) img_class = 'img_grid_16'
            else if (this.medias.length > 1) img_class = 'img_grid_4'
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content">
            `; else html += '<div class="media_content">'
            // アスペクト比をリンクオプションとして設定
            this.medias.forEach(media => {
                if (media.type == 'audio') html /* 音声ファイル(サムネなしで直接埋め込む) */+= `
                    <audio controls src="${media.url}" preload="none"></audio>
                `; else html /* 画像か動画ファイル(サムネから拡大表示) */ += `
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}"
                        class="__on_media_expand ${img_class}">
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

        html /* 本文(絵文字を置換) */ += target_emojis.replace(this.content_text)
        html += `
                </div>
            </div>
        `
        html /* 投稿(ステータス)日付 */ += `
            <div class="post_footer">
                <a class="created_at __on_datelink">${this.relative_time.both}</a>
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
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && `@${this.user.full_address}` == this.from_account?.full_address)
            jqelm.closest('li').addClass('self_post')
        if (this.reblog) { // BTRNにはクラスをつけて背景をセット
            jqelm.closest('li').addClass('rebloged_post')
            jqelm.find('.label_reblog').css("background-image", `url("${this.reblog_by_icon}")`)
        }
        // 時間で色分け
        jqelm.closest('li').css('border-left-color', this.relative_time.color)
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

    // Getter: アノニマスタイプのHTMLを生成して返却
    get anonymous_elm() {
        if (this.notif_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="anonymous_layout">`

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
            const label_limit = this.poll_unlimited // 投票期限テキスト
                ? '無期限' : `${RelativeTime.DATE_FORMATTER.format(this.poll_expired_time)} まで`
            html /* 投票ブロック */ += `
                <div class="post_poll">
                    <div class="options">${options}</div>
                    <div class="poll_info">${label_limit}</div>
                </div>
            `
        }
        if (this.platform == 'Misskey' && this.quote_flg) {
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.quote.emojis
            html /* 引用ノート(Misskeyのみ) */ += `
                <div class="post_quote">
                    <div>${target_emojis.replace(this.quote.content)}</div>
                </div>
            `
        }

        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            const img_class = this.medias.length > 4 ? 'img_grid_64' : 'img_grid_16'
            html += '<div class="media">'
            if (this.sensitive) html /* 閲覧注意 */ += `
                <a class="expand_header label_sensitive">閲覧注意の画像があります</a>
                <div class="media_content">
            `; else html += '<div class="media_content">'
            // アスペクト比をリンクオプションとして設定
            this.medias.forEach(media => {
                if (media.type == 'audio') html /* 音声ファイル(サムネなしで直接埋め込む) */+= `
                    <audio controls src="${media.url}" preload="none"></audio>
                `; else html /* 画像か動画ファイル(サムネから拡大表示) */ += `
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}"
                        class="__on_media_expand ${img_class}">
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
                </div>
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // 期限切れ、投票済み、詳細表示のいずれかの場合は投票ボタンを消して結果を表示する
        if (this.poll_options && (this.detail_flg || this.poll_voted || (!this.poll_unlimited && this.poll_expired)))
            jqelm.find('.post_poll').after(this.poll_graph).remove()
        if (this.cw_text && !this.from_timeline?.pref?.expand_cw) // CWを非表示にする
            jqelm.find('.content>.main_content').hide()
        if (this.sensitive && !this.from_timeline?.pref?.expand_media) // 閲覧注意メディアを非表示にする
            jqelm.find('.media>.media_content').hide()

        return jqelm
    }

    // Getter: マルチレイアウトのHTML返却
    get mix_element() {
        // メディア(無視する場合は後続の設定を使う)
        if (this.medias.length > 0 && this.from_group.pref.multi_layout_option.media != 'ignore')
            return this.getLayoutElement(this.from_group.pref.multi_layout_option.media)
        // ブースト/リノート(メディアの次に優先)
        else if (this.reblog) return this.getLayoutElement(this.from_group.pref.multi_layout_option.reblog)
        else if (this.type == 'notification') // 通知
            return this.getLayoutElement(this.from_group.pref.multi_layout_option.notification)
        // 通常の投稿
        else return this.getLayoutElement(this.from_group.pref.multi_layout_option.default)
    }

    /**
     * #Method
     * この投稿のアンケートに対して投票する
     * 
     * @param target_elm 票を入れるボタンのjQueryオブジェクト
     */
    async vote(target_elm) {
        const notification = Notification.progress(`${target_elm.text()} に投票しています...`)
        const index = target_elm.index()
        let response = null
        try { // 投票リクエストを送信
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.from_account.pref.domain}/api/v1/polls/${this.poll_id}/votes`,
                        headers: { "Authorization": `Bearer ${this.from_account.pref.access_token}` },
                        data: { "choices": [index] }
                    })
                    break
                case 'Misskey': // Misskey
                    const request_param = {
                        "i": this.from_account.pref.access_token,
                        "noteId": this.status_id,
                        "choice": index
                    }
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.from_account.pref.domain}/api/notes/polls/vote`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(request_param)
                    })
                    break
                default:
                    break
            }
            if (!response) { // Misskeyの場合投票結果がresponseに返ってこないので投稿データから取得
                response = await $.ajax({
                    type: "POST",
                    url: `https://${this.from_account.pref.domain}/api/notes/show`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        "i": this.from_account.pref.access_token,
                        "noteId": this.id
                    })
                })
                response = response.poll
            }
            notification.done(`${target_elm.text()} に投票しました. 中間結果を表示します.`)

            // 最新の投票データをステータスに書き込む
            this.poll_options = Status.asArrayPoll(response, this.platform)
            this.poll_voted = true

            // 投票ボタンを消して投票結果のグラフを表示
            target_elm.closest(".post_poll").after(this.poll_graph).remove()
        } catch (err) { // 投票失敗時
            if (err.status == 422 // Mastodonの場合、期限切れは422が返ってくる
               || err.responseJSON.error?.code == 'ALREADY_EXPIRED' // Misskeyの場合
                ) { // 投票期限の切れたアンケートに投票した場合
                notification.error("既に投票を終了しているアンケートです.")
                return
            }
            // それ以外は失敗メッセージを出す
            notification.error("投票に失敗しました.")
            console.log(err)
        }
    }

    // Getter: 投票結果のグラフのjQueryオブジェクトを返却する
    get poll_graph() {
        let total_vote = 0
        let html = '<div class="poll_graph_section">'
        this.poll_options.forEach(opt => { // 投票データを生成
            total_vote += opt.count
            html += `
                <div class="poll_opt_graph">
                    <span class="text">${opt.text}</span>
                    <span class="rate">${opt.rate}%</span>
                </div>
            `
        })
        const label_limit = this.poll_unlimited // 投票期限テキスト
            ? '無期限' : `${RelativeTime.DATE_FORMATTER.format(this.poll_expired_time)} まで`
        html += `
            <div class="poll_footer">
                <span>${total_vote} 票</span>
                <span>${label_limit}</span>
            </div>
        </div>`

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        this.poll_options.forEach((opt, index) => // 投票データからグラフCSSを生成
            jqelm.find(`.poll_opt_graph:nth-child(${index + 1})`).css('background-image',
                `linear-gradient(to right, #3c5f7a ${opt.rate}%, transparent ${opt.rate}%)`))

        return jqelm
    }

    /**
     * #Method
     * この投稿をサーバーから削除する
     */
    async delete() {
        const notification = Notification.progress("投稿を削除しています...")
        let response = null
        try {
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({ // このステータスIDを使って削除リクエストを送信
                        type: "DELETE",
                        url: `https://${this.from_account.pref.domain}/api/v1/statuses/${this.status_id}`,
                        headers: { "Authorization": `Bearer ${this.from_account.pref.access_token}` }
                    })
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({ // このステータスIDを使って削除リクエストを送信6
                        type: "POST",
                        url: `https://${this.from_account.pref.domain}/api/notes/delete`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            "i": this.from_account.pref.access_token,
                            "noteId": this.status_id
                        })
                    })
                    break
                default:
                    break
            }
            notification.done("投稿の削除が完了しました.")
        } catch (err) {
            console.log(err)
            notification.error("投稿の削除に失敗しました.")
        }
    }

    /**
     * #Method
     * この投稿を編集モードで本文投稿フォームに展開する.
     */
    edit() {
        // クリックイベントは先に実行
        $("#post_options .refernced_post+.option_close .__on_option_open").click()

        // アカウントを編集対象に変更
        Account.get(`@${this.user.full_address}`).setPostAccount()

        // 投稿本文とCWテキストをフォームに展開
        this.getRenderContent().then(text => $("#__txt_postarea").val(text))
        if (this.cw_text) $("#__txt_content_warning").val(this.cw_text)

        // メディアがある場合はアップ済みのメディアを初期添付
        if (this.medias.length > 0) $('#header>#post_options .attached_media>ul.media_list').html(Media.getAttachElement(this))

        $("#post_options ul.refernce_post").html(this.element)
        $("#post_options #__hdn_edit_id").val(this.id)
        enabledAdditionalAccount(false)

        $("#__txt_postarea").focus()
    }

    /**
     * #Method
     * この投稿の本文のレンダリングされたテキストを取得する.
     */
    async getRenderContent() {
        // 一度DOMにレンダリングする
        $("#__hdn_text_render").html(this.content)
        // 一度レンダリングされた内容でinnerTextを取得(ここはjQueryではできない)
        const render_text = document.getElementById("__hdn_text_render").innerText
        $("#__hdn_text_render").empty()
        return render_text
    }

    /**
     * #Method
     * この投稿で対象の投稿エレメントを書き換える.
     * 
     * @param post 更新された後の投稿オブジェクト
     * @param jqelm 修正対象の投稿jQueryオブジェクト
     */
    update(post, jqelm) {
        // ギャラリーは非対応
        if (jqelm.is('.gallery_timeline')) return

        // 修正対象のコンテンツを内部的に書き換える
        this.content = post.content
        this.emojis = post.emojis
        this.sensitive = post.sensitive
        this.medias = post.medias

        // メインコンテンツを書き換える
        if (jqelm.is('.short_timeline') || jqelm.is('.media_timeline')) // リストとメディアは1行で書き換え
            jqelm.find('.main_content').hide("fade", 1500,
                () => jqelm.find('.main_content').html(this.emojis.replace(this.content_text)).show("fade", 1500))
        else jqelm.find('.main_content').hide("fade", 1500,
            () => jqelm.find('.main_content').html(this.emojis.replace(this.content)).show("fade", 1500))

        if (this.medias.length > 0) { // メディアコンテンツを書き換える
            if (jqelm.is('.short_timeline')) // リストレイアウトのときは最初の一枚だけ書き換え
                jqelm.find('.list_media').hide("fade", 1500, () => jqelm.find('.list_media').html(`
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}" class="__on_media_expand">
                        <img src="${this.sensitive ? 'resources/ic_warn.png' : media.thumbnail}" class="media_preview"/>
                    </a>
                `).show("fade", 1500))
            else { // それ以外は各レイアウトに合わせて書き換え
                let img_class = 'img_grid_single'
                if (jqelm.is('.media_timeline')) { // メディアタイムライン
                    if (this.medias.length > 4) img_class = 'img_grid_16'
                    else if (this.medias.length > 1) img_class = 'img_grid_4'
                } else if (jqelm.is('.chat_timeline')) // チャットタイムライン
                    img_class = this.medias.length > 4 ? 'img_grid_64' : 'img_grid_16'
                else img_class = this.medias.length > 4 ? 'img_grid_16' : 'img_grid_4'
                jqelm.find('.media_content').hide("fade", 1500, () => {
                    let html = ''
                    // アスペクト比をリンクオプションとして設定
                    this.medias.forEach(media => {
                        if (media.type == 'audio') html /* 音声ファイル(サムネなしで直接埋め込む) */+= `
                            <audio controls src="${media.url}" preload="none"></audio>
                        `; else html /* 画像か動画ファイル(サムネから拡大表示) */ += `
                            <a href="${media.url}" type="${media.type}" name="${media.aspect}"
                                class="__on_media_expand ${img_class}">
                                <img src="${media.thumbnail}" class="media_preview"/>
                            </a>
                        `
                    })
                    jqelm.find('.media_content').html(html).show("fade", 1500)
                })
            }
        }
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
     * この投稿に対する返信を投稿するための投稿オプションを設定
     */
    createReplyWindow() {
        $("#header>#post_options").hide()
        $("#__on_reset_option").click()
        $("#post_options .refernced_post+.option_close .__on_option_open").click()
        // 返信先のアカウントが返信元のアカウントと同じ場合は先頭のユーザーIDを表示しない
        const userid = `@${this.user.full_address}` != this.from_account.full_address ? `@${this.user.id} ` : ''

        // 投稿IDを隠しフォームにセットして投稿オプションをセット
        Account.get(this.from_account.full_address).setPostAccount()
        $("#__hdn_reply_id").val(this.id)
        $("#post_options ul.refernce_post").html(this.element)
        enabledAdditionalAccount(false)
        // 表示後にリプライカラムのテキストボックスにフォーカスする(カーソルを末尾につける)
        $("#__txt_postarea").val(userid).focus().get(0).setSelectionRange(500, 500)
    }

    /**
     * #Method
     * この投稿を引用した投稿するための投稿オプションを設定
     */
    createQuoteWindow() {
        // 投稿IDを隠しフォームにセットして投稿オプションをセット
        $("#header>#post_options").hide()
        $("#__on_reset_option").click()
        Account.get(this.from_account.full_address).setPostAccount()
        $("#__hdn_quote_id").val(this.id)
        $("#post_options ul.refernce_post").html(this.element)
        $("#post_options .refernced_post+.option_close .__on_option_open").click()
        enabledAdditionalAccount(false)
        $("#__txt_postarea").focus()
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
                <button type="button" id="__on_reply_close" class="close_button">×</button>
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
        // すでに開いているウィンドウの数を算出
        const window_num = $("#pop_multi_window>.ex_window").length
        // DOMの一意認識用のUUIDを生成
        this.__detail_uuid = crypto.randomUUID()
        $("#pop_multi_window").append(`
            <div id="post_window_${this.__detail_uuid}" class="post_detail_window ex_window">
                <h2><a href="${this.uri}" class="__lnk_external">${this.uri}</a></h2>
                <div class="window_buttons">
                    <input type="checkbox" class="__window_opacity" id="__window_opacity_${this.__detail_uuid}"/>
                    <label for="__window_opacity_${this.__detail_uuid}" class="window_opacity_button" title="透過"><img
                        src="resources/ic_alpha.png" alt="透過"/></label>
                    <button type="button" class="window_close_button" title="閉じる"><img
                        src="resources/ic_not.png" alt="閉じる"/></button>
                </div>
                <div class="timeline">
                    <ul class="__context_posts"></ul>
                </div>
            </div>
        `)
        // プロフィール情報バインド処理を実行してレイアウトを設定
        $(`#post_window_${this.__detail_uuid}>h2`).css('background-color', `#${getRandomColor()}`)
        $(`#post_window_${this.__detail_uuid}`).draggable({ handle: "h2" })
        $(`#post_window_${this.__detail_uuid}>.window_buttons`).tooltip({
            position: {
                my: "center top",
                at: "center bottom"
            },
            show: {
                effect: "slideDown",
                duration: 80
            },
            hide: {
                effect: "slideUp",
                duration: 80
            }
        })
        $(`#post_window_${this.__detail_uuid}>.timeline>ul`).append(this.element)

        // 一旦ウィンドウを表示して後続の処理を非同期で実行する
        $(`#post_window_${this.__detail_uuid}`).css('right', `${window_num * 48}px`).show("fade", 150)
        const parent_post = $(`#post_window_${this.__detail_uuid}>.timeline>ul>li[id="${this.status_key}"]`)

        if (this.platform == 'Misskey') { // Misskeyの場合非同期絵文字置換を実行
            const host = this.from_account.pref.domain
            Emojis.replaceDomAsync(parent_post.find(".username"), host) // ユーザー名
            Emojis.replaceDomAsync(parent_post.find(".label_cw"), host) // CWテキスト
            Emojis.replaceDomAsync(parent_post.find(".main_content"), host) // 本文
            Emojis.replaceDomAsync(parent_post.find(".__yet_replace_reaction"), host) // 未置換のリアクション
        }
        // 親にチェインしている投稿と簡易プロフィールを取得(非同期) 終わったら対象の投稿へスクロール
        Promise.allSettled([this.getThread(),
            this.getAuthorInfo().then(user => parent_post.before(user.short_elm))
        ]).then(result => parent_post.get(0).scrollIntoView({ block: 'center' }))
    }

    /**
     * #Method
     * この投稿をノーマルレイアウトでポップアップするウィンドウを生成
     * 
     * @param target この投稿のjQueryオブジェクト(座標決定に使用)
     */
    createExpandWindow(target) {
        // 強制的に通常表示にする
        this.detail_flg = false
        this.popout_flg = true
        // 一時ステータスに保存
        Status.TEMPORARY_CONTEXT_STATUS = this

        // 隠しウィンドウにこの投稿を挿入
        const pos = target.offset()
        $("#pop_expand_post>ul").html(this.element)
            .css('width', `${target.closest('ul').outerWidth()}px`)
        Emojis.replaceRemoteAsync($("#pop_expand_post .reaction_emoji"))

        if (window.innerHeight / 2 < pos.top) // ウィンドウの下の方にある場合は下から展開
            $("#pop_expand_post").css({
                'top': 'auto',
                'bottom': Math.round(window.innerHeight - pos.top - 48),
                'left': pos.left - 12
            })
        else $("#pop_expand_post").css({
            'bottom': 'auto',
            'top': pos.top - 24,
            'left': pos.left - 12
        })
        $("#pop_expand_post").show("fade", 80)
    }

    /**
     * #Method
     * この投稿よりも前のタイムラインを取得するウィンドウを生成
     */
    openScrollableWindow() {
        this.from_timeline?.createScrollableTimeline(this.id)
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

        // 画面側にも通知を出して通知オブジェクトを返却
        Notification.info(title)
        return {
            title: title,
            // HTMLとして解析して中身の文章だけを取り出す
            body: $($.parseHTML(body)).text()
        }
    }
}

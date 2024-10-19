/**
 * #Class
 * 投稿、通知データを管理するクラス
 *
 * @author @tizerm@misskey.dev
 */
class Status {
    // コンストラクタ: APIから来たステータスデータを受け取って生成
    constructor(json, timeline, account) {
        // タイムラインから呼び出す場合はtimelineとaccountが渡ってくる
        // 個別の投稿をAPIから呼び出した場合はtimelineがnullで渡ってくる(accountは呼び出し元アカウント)
        this.from_timeline = timeline
        this.user_profile_flg = timeline?.parent_column == null
        this.from_account = account
        this.type = this.from_timeline?.pref?.timeline_type == 'notification' ? 'notification' : 'post'
        this.status_id = json.id // 投稿ではなく元のステータスデータに対応するID
        this.platform = this.from_account?.platform ?? this.from_timeline?.platform
        const host = this.from_timeline?.host ?? this.from_account.pref.domain

        if (timeline?.__extended_timeline == 'profile_post') // プロフィールのユーザー投稿の場合
            this.profile_post_flg = true
        else if (timeline?.__extended_timeline == 'detail_post') // 詳細表示の場合
            this.detail_flg = true

        // プラットフォーム判定
        let original_date = null // 生成キーに使用するのでJSON日付のほうも一時保存
        let data = null

        switch (this.platform) {
            case 'Mastodon': // Mastodon
                this.notif_type = this.type == 'notification' ? json.type : null
                this.allow_context = !(this.type == 'notification' && ['follow', 'follow_request'].includes(json.type))
                original_date = json.created_at
                // ブーストフラグとブースト関係の専用項目
                this.reblog = !!json.reblog
                this.reblog_by = this.reblog ? json.account.acct : null
                this.reblog_by_icon = this.reblog ? json.account.avatar : null
                this.reblog_origin_time = this.reblog ? new RelativeTime(new Date(json.reblog.created_at)) : null

                // ブーストの場合はブースト先を参照データに設定
                data = this.reblog ? json.reblog : json
                this.uri = json.status?.url ?? data.url // 投稿URL(前はリプライ時のURL)
                this.id = data.id // 投稿ID
                this.notif_id = json.status?.id // 通知のID

                this.use_emoji_cache = false // Mastodonの場合絵文字キャッシュは使わない
                this.remote_flg = data.account.acct.match(/@/)

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
                if (this.notif_type && !['follow', 'follow_request'].includes(this.notif_type)) {
                     // 本文(通知の場合はstatusから)
                    this.content = data.status?.content
                    if (data.status) data = data.status
                    else { // TODO: statusがnullになる場合は一旦表示をやめる
                        this.__internal_error = true
                        return
                    }
                } else this.content = data.content
                this.emojis = new Emojis({
                    host: host,
                    platform: 'Mastodon',
                    emojis: data.status?.emojis ?? data.emojis
                })

                if (this.content) this.content_length = $($.parseHTML(this.content // カスタム絵文字は4文字、URLは20字扱い
                    .replace(new RegExp( // URLはマークアップを強引に20字に落とすことで対応します
                        '<a href="https?://[^ 　\n]+".*?rel="nofollow noopener noreferrer".*?><span class="invisible">https?://.*?</span><span class="ellipsis">.+?</span>.*?</a>',
                        'g'), '12345678901234567890')
                    .replace(new RegExp( // Misskey用のURLマークアップ
                        '<a href="https?://[^ 　\n]+".*?rel="nofollow noopener noreferrer".*?>https?://.+?</a>',
                        'g'), '12345678901234567890')
                    .replace(/:[a-zA-Z0-9_]+:/g, '1234'))).text().length
                else this.content_length = 0

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

                // フィルター設定
                this.mute_warning = data.filtered?.map(m => m.filter).filter(f => f.filter_action == "warn")[0]?.title ?? null
                this.mute_exclude = data.filtered?.some(f => f.filter.filter_action == "hide") ?? false

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

                this.flg_reblog = data.reblogged
                this.flg_fav = data.favourited
                this.flg_bookmark = data.bookmarked
                this.flg_edit = !!data.edited_at

                break
            case 'Misskey': // Misskey
                this.notif_type = this.type == 'notification' ? json.type : null
                this.allow_context = !(this.type == 'notification' && json.type == 'follow')
                if (this.notif_type == 'achievementEarned') return // TODO: 実績は一旦除外

                original_date = json.createdAt
                // リノートフラグとリノート関係の専用項目
                this.reblog = json.renote && !json.text
                this.reblog_by = this.reblog ? json.user.username
                    + (json.user.host ? ('@' + json.user.host) : '') : null
                this.reblog_by_icon = this.reblog ? json.user?.avatarUrl : null
                this.reblog_origin_time = this.reblog ? new RelativeTime(new Date(json.renote.createdAt)) : null

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
                this.remote_flg = !!data.user?.host

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
                this.channel_id = data.channel?.id
                this.channel_name = data.channel?.name
                this.reply_to = data.replyId
                this.cw_text = data.cw // CWテキスト
                if (this.notif_type == 'renote') { // リノート通知の場合は本文をリノート対象ノートにする
                    this.content = data.note.renote.text
                    this.notif_id = data.note.renote.id // 通知のID
                    data = data.note.renote
                } else if (this.notif_type) { // リノート以外の通知の場合は本文を対象ノートにする
                    this.content = data.note?.text
                    this.notif_id = data.note?.id // 通知のID
                    data = data?.note ?? data
                } else this.content = data.text // それ以外は通常の本文テキストを参照

                if (this.content) { // 投稿本文の整形と字数計測
                    this.content_length = this.content // カスタム絵文字は4文字、URLは20字扱い
                        .replace(new RegExp('https?://[^ 　\n]+', 'g'), '12345678901234567890')
                        .replace(/:[a-zA-Z0-9_]+:/g, '1234').length
                    const markup_content = this.content // 投稿本文を最低限マークアップ
                        .replace(/</g, '&lt;').replace(/>/g, '&gt;') // 先にタグエスケープをする(改行がエスケープされるので)
                        // MFMのURL記法は文字列リンクとしてマークアップする(うまくいかんので一旦保留)
                        //.replace(new RegExp('[?]?\[(.+?)\]\((https?://[^ ()　\n]+?)\)', 'g'),
                        //    '<a href="$2" class="markuped_link">$1</a>')
                        // 生URLはURLリンクとして展開(直前にマークアップしたリンクは無視)
                        .replace(new RegExp('(?<!href=")https?://[^ ()　\n]+', 'g'), '<a href="$&">$&</a>')
                        .replace(new RegExp('\n', 'g'), '<br/>') // 改行文字をタグに置換
                    this.content = `<p>${markup_content}</p>` // pでマークアップ
                } else this.content_length = 0

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
                // リアクションがある場合はリアクション一覧をリスト化する
                if (data.reactions) {
                    const reactions = []
                    Object.keys(data.reactions).forEach(key => reactions.push({
                        shortcode: key,
                        count: data.reactions[key],
                        url: data.reactionEmojis ? data.reactionEmojis[key.substring(1, key.length - 1)] : null
                    }))
                    this.reactions = reactions
                    this.count_fav = reactions.reduce((sum, react) => sum + Number(react.count), 0)
                }
                this.reaction_self = data.myReaction
                break
            default:
                break
        }
        this.host = host

        // このステータスを一意に決定するためのキーを設定
        this.sort_date = new Date(original_date)
        this.relative_time = new RelativeTime(this.sort_date)
        this.status_key = `${original_date.substring(0, original_date.lastIndexOf('.'))}@${this.user?.full_address}`
        //this.status_key = `${original_date}@${this.user?.full_address}`
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

    // スタティックタイムライン情報を初期化
    static {
        Status.DETAIL_TIMELINE = { "__extended_timeline": "detail_post" }
    }

    // Getter: 日付ラベルテキスト
    get date_text() {
        switch (Preference.GENERAL_PREFERENCE.time_format) {
            case 'absolute': // 絶対表記
                if (this.reblog && Preference.GENERAL_PREFERENCE.reblog_time_format != 'quoted') {
                    if (Preference.GENERAL_PREFERENCE.reblog_time_format == 'origin') // 元の投稿
                        return this.reblog_origin_time.day_abs
                    else return `${this.relative_time.day_abs} from ${this.reblog_origin_time.day_abs}`
                } else return this.relative_time.day_abs
                break
            case 'relative': // 相対表記
                if (this.reblog && Preference.GENERAL_PREFERENCE.reblog_time_format != 'quoted') {
                    if (Preference.GENERAL_PREFERENCE.reblog_time_format == 'origin') // 元の投稿
                        return this.reblog_origin_time.week_rel
                    else return `${this.relative_time.week_rel} from ${this.reblog_origin_time.week_rel}`
                } else return this.relative_time.week_rel
                break
            default: // 両方
                if (this.reblog && Preference.GENERAL_PREFERENCE.reblog_time_format != 'quoted') {
                    if (Preference.GENERAL_PREFERENCE.reblog_time_format == 'origin') // 元の投稿
                        return this.reblog_origin_time.both
                    else return `${this.relative_time.both} from ${this.reblog_origin_time.both}`
                } else return this.relative_time.both
                break
        }
    }
    // Getter: 取得元アカウントのアカウントカラー
    get account_color() {
        return this.from_timeline?.pref?.timeline_type == 'channel'
            || this.from_timeline?.pref?.external ? this.from_timeline?.pref?.color : this.from_account?.pref.acc_color
    }
    // Getter: ミュート判定
    get muted() {
        return this.mute_exclude
            || (this.from_timeline?.pref?.exclude_reblog && this.reblog)
            || (this.from_group?.pref?.tl_layout == 'gallery' && this.medias.length == 0)
            || this.__internal_error
    }
    // Getter: 本文をHTML解析して文章の部分だけを抜き出す
    get content_text() {
        // タグエスケープを挟む
        return $($.parseHTML(this.content)).text().replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
        if (url.indexOf('/') < 0) { // URLの様式になっていない場合は無視
            Notification.error("詳細表示のできない投稿です.")
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

        try { // URL解析した情報からステータス取得処理を呼び出し
            const post = await Status.getStatusById(domain, platform, id)
            notification.done()
            return post
        } catch (err) {
            notification.error(err)
        }
    }

    /**
     * #StaticMethod
     * IDから投稿データを取得する.
     * 
     * @param host 取得対象のインスタンスホスト
     * @param platform 取得対象のインスタンスプラットフォーム
     * @param id 投稿ID
     */
    static async getStatusById(host, platform, id) {
        let response = null
        try { // リモートの投稿を直接取得
            const authed_account = Account.getByDomain(host)
            switch (platform) {
                case 'Mastodon': // Mastodon
                    let header = {}
                    if (authed_account) header = { "Authorization": `Bearer ${authed_account.pref.access_token}` }
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${host}/api/v1/statuses/${id}`,
                        dataType: "json",
                        headers: header
                    })
                    break
                case 'Misskey': // Misskey
                    let query_param = { "noteId": id }
                    if (authed_account) query_param.i = authed_account.pref.access_token
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${host}/api/notes/show`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    break
                default:
                    return Promise.reject("詳細表示のできない投稿です.")
            }
            return new Status(response, Status.DETAIL_TIMELINE, { // accountには最低限の情報だけ入れる
                "platform": platform,
                "pref": { "domain": host }
            })
        } catch (err) {
            console.log(err)
            return Promise.reject("投稿の取得に失敗しました.")
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
            return new Status(response, Status.DETAIL_TIMELINE, { // accountには最低限の情報だけ入れる
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
                                const ins_post = new Status(post, Status.DETAIL_TIMELINE, { // accountには最低限の情報だけ入れる
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
                                return new Status(post, Status.DETAIL_TIMELINE, { // accountには最低限の情報だけ入れる
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
        // フィルターされた投稿の場合はフィルターメッセージを表示する
        if (!this.popout_flg && !this.detail_flg && this.mute_warning) return this.filtered_elm
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
            case 'multi': // マルチレイアウト
                return this.mix_element
            default: // デフォルト(ノーマル)
                this.mini_normal = pref == 'normal2'
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
                case 'follow_request': // フォローリクエスト
                    html += `
                        <div class="label_head label_follow">
                            <span>Followe Requested by @${this.user.id}</span>
                        </div>
                    `
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
            // ユーザーアカウント情報
            if (this.mini_normal) { // ノーマル2レイアウトの場合
                html += `
                    <div class="user prof_normal2">
                        <img src="${this.user.avatar_url}" class="usericon" name="@${this.user.full_address}"/>
                        <div class="name_info">
                `; switch (Preference.GENERAL_PREFERENCE.normal_name_format) {
                    case 'both_prename': // ユーザーネーム+ユーザーID
                        html += `
                            <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                            <span class="userid">
                                <a class="__lnk_userdetail" name="@${this.user.full_address}">@${this.user.id}</a>
                            </span>
                        `
                        break
                    case 'both_preid': // ユーザーID+ユーザーネーム
                        html += `
                            <span class="userid">
                                <a class="__lnk_userdetail" name="@${this.user.full_address}">@${this.user.id}</a>
                            </span>
                            <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                        `
                        break
                    case 'id': // ユーザーIDのみ
                        html += `
                            <span class="userid">
                                <a class="__lnk_userdetail" name="@${this.user.full_address}">@${this.user.id}</a>
                            </span>
                        `
                        break
                    case 'name': // ユーザーネームのみ
                        html += `
                            <h4 class="username">
                                <a class="__lnk_userdetail" name="@${this.user.full_address}">${target_emojis.replace(this.user.username)}</a>
                            </h4>`
                        break
                    default:
                        break
                }
                html += '</div></div>'
            } else html /* ノーマルレイアウトの場合 */ += `
                <div class="user">
                    <img src="${this.user.avatar_url}" class="usericon" name="@${this.user.full_address}"/>
                    <div class="name_info">
                        <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                        <span class="userid">
                            <a class="__lnk_userdetail" name="@${this.user.full_address}">
                                @${this.detail_flg || this.popout_flg ? this.user.full_address : this.user.id}
                            </a>
                        </span>
                    </div>
                </div>
            `
        }
        { // 投稿本文領域
            html += '<div class="content">'
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
            if (this.cw_text) html /* CWテキスト */ += `
                <a class="expand_header warn_label label_cw">${target_emojis.replace(this.cw_text)}</a>
            `; if (!this.popout_flg && !this.profile_post_flg && !this.detail_flg // 文字数制限
                && this.content_length > Preference.GENERAL_PREFERENCE.contents_limit.default) html += `
                <div class="hidden_content"><p>
                    ${target_emojis.replace(this.content_text.substring(0, Preference.GENERAL_PREFERENCE.contents_limit.default))}...
                </p></div>
                <div class="content_length_limit warn_label label_limitover">省略: ${this.content_length}字</div>
            `; else html += `<div class="main_content">${target_emojis.replace(this.content)}</div>`
            html += '</div>'
        }
        if (this.poll_options) { // 投票
            const label_limit = this.poll_unlimited // 投票期限テキスト
                ? '無期限' : `${RelativeTime.DATE_FORMATTER.format(this.poll_expired_time)} まで`
            html /* 投票ブロック */ += `
                <div class="post_poll">
                    <div class="options">${this.poll_buttons}</div>
                    <div class="poll_info">${label_limit}</div>
                </div>
            `
        }
        if (this.platform == 'Misskey' && this.quote_flg) // 引用セクション
            html += this.bindQuoteSection(Preference.GENERAL_PREFERENCE.contents_limit.default)
        if (this.reaction_emoji) { // リアクション絵文字がある場合`
            let alias = null
            if (this.reaction_emoji.match(/^:[a-zA-Z0-9_]+:$/g)) { // カスタム絵文字
                const emoji = this.host_emojis.emoji_map.get(this.reaction_emoji)
                if (emoji) alias = `<img src="${emoji.url}" class="inline_emoji" alt=":${emoji.shortcode}:"/>`
                else alias = `${this.reaction_emoji} (未キャッシュです)`
            } else alias = this.reaction_emoji // Unicode絵文字はそのまま渡す
            html += `<div class="reaction_emoji">${alias}</div>`
        }
        if (this.medias.length > 0) // メディアセクション
            html += this.bindMediaSection(this.medias.length > 4 ? 'img_grid_16' : 'img_grid_4')
        // 投稿属性セクション
        html += this.attribute_section
        // 一部の通知はインプレッション数値を表示する
        if (Preference.GENERAL_PREFERENCE.enable_notified_impression
            && ['favourite', 'reblog', 'reaction', 'renote'].includes(this.notif_type)) {
            html += `<div class="notified_impression">
                <span class="count_reblog counter label_reblog" title="ブースト/リノート数">${this.count_reblog}</span>`
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    html += `<span class="count_fav counter label_favorite" title="お気に入り数">${this.count_fav}</span>`
                    break
                case 'Misskey': // Misskey
                    html += `<span class="count_reaction_total counter label_favorite" title="リアクション合計">${this.count_fav}</span>`
                    break
                default:
                    break
            }
            html += '</div>'
        } else if (!this.detail_flg) html += this.impression_section

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
                    html /* リアクション合計とリアクション一覧を表示 */ += `
                        <span class="count_reaction_total counter label_favorite" title="リアクション合計">
                            ${reaction_count}
                        </span>
                        <div class="count_reaction_list">${reaction_html}</div>
                    `
                    break
                default:
                    break
            }
            html += '</div>'
        }
        html /* 投稿(ステータス)日付 */ += `
            <div class="post_footer">
                <a class="created_at __on_datelink">${this.date_text}</a>
        `

        if (this.from_group?.pref?.multi_timeline && this.from_timeline?.pref?.timeline_type == 'channel')
            // チャンネルでタイムラインが複数ある場合、チャンネル名でフッタを生成
            html += `<div class="from_address from_channel">${this.from_timeline?.pref?.channel_name}</div>`
        else if (this.from_group?.pref?.multi_user) { // マルチアカウントカラムの場合は表示元ユーザーを表示
            if (this.from_timeline?.pref?.external) // 外部インスタンスの場合はホスト名を表示
                html += `<div class="from_address from_external ${this.from_timeline?.pref.platform}">From ${this.from_timeline?.pref.host}</div>`
            else html += `<div class="from_address from_auth_user">From ${this.from_account.full_address}</div>`
        }

        if (this.profile_post_flg && this.channel_id)
            // ユーザープロフィールのチャンネル投稿の場合はチャンネル名を表示
            html += `<div class="from_address from_channel">${this.channel_name}</div>`
        html += `
                </div>
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.post_footer>.from_address').css("background-color", this.account_color)
        if (this.profile_post_flg && this.channel_id) // チャンネルIDから色をハッシュ化
            jqelm.find('.post_footer>.from_address').css("background-color", getHashColor(this.channel_id))
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
        // リプライ/ツリーの投稿はクラスをつける
        if (this.reply_to) jqelm.closest('li').addClass('replied_post')
        if (this.reblog) { // BTRNにはクラスをつけて背景をセット
            jqelm.closest('li').addClass('rebloged_post')
            jqelm.find('.label_head.label_reblog').css("background-image", `url("${this.reblog_by_icon}")`)
        }
        // 時間で色分け
        jqelm.closest('li').css('border-left-color', this.profile_post_flg || this.detail_flg
            ? this.relative_time.ltcolor : this.relative_time.color)
        if (this.profile_post_flg) jqelm.find('.post_footer>.created_at').addClass('from_address')
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
        let target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="chat_timeline">`
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.user.avatar_url}" class="usericon" name="@${this.user.full_address}"/>
                <span class="userid">
                    <a class="__lnk_userdetail" name="@${this.user.full_address}">
        `; switch (Preference.GENERAL_PREFERENCE.chat_name_format) {
            case 'both_prename': // ユーザーネーム+ユーザーID
                html += `
                    <span class="inner_name">${target_emojis.replace(this.user.username)}</span>
                    <span class="inner_id">@${this.user.id}</span>
                `
                break
            case 'both_preid': // ユーザーID+ユーザーネーム
                html += `
                    <span class="inner_id">@${this.user.id}</span>
                    <span class="inner_name">${target_emojis.replace(this.user.username)}</span>
                `
                break
            case 'id': // ユーザーIDのみ
                html += `<span class="inner_id">@${this.user.id}</span>`
                break
            case 'name': // ユーザーネームのみ
                html += `<span class="inner_name">${target_emojis.replace(this.user.username)}</span>`
                break
            default:
                break
        }
        html /* ユーザーアカウント情報 */ += `
                    </a>
                </span>
                <a class="created_at __on_datelink">${this.date_text}</a>
            </div>
            <div class="content">
        `

        { // 投稿本文領域
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
            if (this.cw_text) html /* CWテキスト */ += `
                <a class="expand_header warn_label label_cw">${target_emojis.replace(this.cw_text)}</a>
            `; if (!this.profile_post_flg && !this.detail_flg // 文字数制限
                && this.content_length > Preference.GENERAL_PREFERENCE.contents_limit.chat) html += `
                <div class="hidden_content"><p>
                    ${target_emojis.replace(this.content_text.substring(0, Preference.GENERAL_PREFERENCE.contents_limit.chat))}...
                </p></div>
                <div class="content_length_limit warn_label label_limitover">省略: ${this.content_length}字</div>
            `
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
        if (this.poll_options) html /* 投票ブロック */ += `
            <div class="post_poll">
                <div class="options">${this.poll_buttons}</div>
            </div>
        `

        if (this.platform == 'Misskey' && this.quote_flg) // 引用セクション
            html += this.bindQuoteSection(Preference.GENERAL_PREFERENCE.contents_limit.chat)
        if (this.medias.length > 0) // メディアセクション
            html += this.bindMediaSection(this.medias.length > 4 ? 'img_grid_64' : 'img_grid_16')
        // 投稿属性セクション
        html += this.attribute_section
        // インプレッション(反応とリアクション)
        html += this.impression_section
        html += `
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.from_address>div').css("background-color", this.account_color)
        jqelm.find('.from_address>.from_auth_user').css("background-image", `url("${this.from_account?.pref.avatar_url}")`)
        if (this.reblog) { // BTRNにはクラスをつけて背景をセット
            jqelm.closest('li').addClass('rebloged_post')
            jqelm.find('.label_head.label_reblog').css("background-image", `url("${this.reblog_by_icon}")`)
        }
        // 期限切れか投票済みの場合は投票ボタンを消して結果を表示する
        if (this.poll_options && !this.detail_flg && (this.poll_voted || (!this.poll_unlimited && this.poll_expired)))
            jqelm.find('.post_poll').after(this.poll_graph).remove()
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && self_flg) jqelm.closest('li').addClass('self_post')
        // リプライ/ツリーの投稿はクラスをつける
        if (this.reply_to) jqelm.closest('li').addClass('replied_post')
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
        `; else if (notif_flg && ['follow', 'follow_request'].includes(this.notif_type))
            html /* フォローの場合はユーザーアドレス */ += `
                    <span class="main_content">@${this.user.full_address}</span>
        `; else html /* 本文(マークアップを無視して1行だけ) */ += `
                    <span class="main_content">${target_emojis.replace(this.content_text)}</span>
        `
        html += '</div>'
        if (this.medias.length > 0) { // 添付メディア(現状は画像のみ)
            const media = this.medias[0]
            let thumbnail = media.thumbnail
            if (this.sensitive) thumbnail = 'resources/ic_warn.png'
            else if (!thumbnail) thumbnail = 'resources/illust/mitlin_404.jpg'
            html /* 最初の1枚だけ表示(センシの場合は！アイコンのみ) */ += `
                <div class="list_media">
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}" class="__on_media_expand">
                        <img src="${thumbnail}" class="media_preview"/>
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
                    } else if (this.reaction_emoji.match(/^[a-zA-Z0-9\.\-:@_]+$/g)) // リモートの絵文字
                        alias = '<img src="resources/ic_emoji_remote.png" class="ic_notif_type"/>'
                    else alias = this.reaction_emoji // Unicode絵文字はそのまま渡す
                    jqelm.find('.notif_footer').prepend(alias)
                    break
                case 'follow':
                case 'follow_request': // フォロー通知
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
                <div class="name_info">
                    <h4 class="username">${target_emojis.replace(this.user.username)}</h4>
                    <span class="userid">
                        <a class="__lnk_userdetail" name="@${this.user.full_address}">
                            @${this.user.id}
                        </a>
                    </span>
                </div>
            </div>
        `
        if (this.medias.length > 0) { // メディアセクション
            let img_class = 'img_grid_single'
            if (this.medias.length > 4) img_class = 'img_grid_16'
            else if (this.medias.length > 1) img_class = 'img_grid_4'
            html += this.bindMediaSection(img_class)
        }
        html += `
            <div class="content">
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CWテキスト */ += `
            <div class="main_content content_length_limit warn_label label_cw">
                <span class="inner_content">${target_emojis.replace(this.cw_text)}</span>
        `; else html /* 本文(絵文字を置換) */ += `
            <div class="main_content content_length_limit expand_label label_limitover">
                <span class="inner_content">${target_emojis.replace(this.content_text)}</span>
        `

        html += `
                    <span class="break">&nbsp;</span>
                </div>
            </div>
        `
        // 投稿属性セクション
        html += this.attribute_section
        // インプレッション(反応とリアクション)
        html += this.impression_section
        html /* 投稿(ステータス)日付 */ += `
            <div class="post_footer">
                <a class="created_at __on_datelink">${this.date_text}</a>
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
        jqelm.find('.post_footer>.from_address').css("background-color", this.account_color)
        jqelm.find('.post_footer>.from_address.from_auth_user')
            .css("background-image", `url("${this.from_account?.pref.avatar_url}")`)
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // 自分の投稿にはクラスをつける
        if (!this.user_profile_flg && `@${this.user.full_address}` == this.from_account?.full_address)
            jqelm.closest('li').addClass('self_post')
        // リプライ/ツリーの投稿はクラスをつける
        if (this.reply_to) jqelm.closest('li').addClass('replied_post')
        if (this.reblog) { // BTRNにはクラスをつけて背景をセット
            jqelm.closest('li').addClass('rebloged_post')
            jqelm.find('.label_head.label_reblog').css("background-image", `url("${this.reblog_by_icon}")`)
        }
        // 時間で色分け
        jqelm.closest('li').css('border-left-color', this.relative_time.color)
        if (this.sensitive && !this.from_timeline?.pref?.expand_media)
            jqelm.find('.media>.media_content').hide() // 閲覧注意メディアを非表示にする

        return jqelm
    }

    // Getter: ギャラリータイプのHTMLを生成して返却
    get gallery_elm() {
        // メディアごとにタイルブロックを生成
        let html = ''
        this.medias.forEach(media => {
            let thumbnail = media.thumbnail
            if (!this.from_timeline?.pref?.expand_media && media.sensitive) thumbnail = 'resources/illust/mitlin_nsfw.jpg'
            else if (media.type == 'audio') thumbnail = 'resources/illust/ic_recode.jpg'
            else if (!thumbnail) thumbnail = 'resources/illust/mitlin_404.jpg'
            html /* name属性にURLを設定 */ += `
                <li id="${this.status_key}" name="${this.uri}" class="gallery_timeline">
                    <a href="${media.url}" type="${media.type}" name="${media.aspect}"
                        class="__on_media_expand${media.sensitive ? ' warn_sensitive' : ''}">
                        <img src="${thumbnail}" class="media_preview"/>
                    </a>
                </li>
            `
        })

        // 生成したHTMLをjQueryオブジェクトとして返却
        return $($.parseHTML(html))
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

    // Getter: Mastodonでフィルターされた投稿を表示するHTMLを返却
    get filtered_elm() {
        // 生成したHTMLをjQueryオブジェクトとして返却
        return $($.parseHTML(`
            <li id="${this.status_key}" name="${this.uri}" class="filtered_timeline">
                <span>フィルター: ${this.mute_warning}</span>
            </li>
        `))
    }

    /**
     * #Method
     * メディア表示セクションのHTMLを返却.
     * 
     * @param img_class 付与するグリッドサイズクラス
     */
    bindMediaSection(img_class) {
        let html = '<div class="media">'
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
                    <img src="${media.thumbnail ?? 'resources/illust/mitlin_404.jpg'}" class="media_preview"/>
                </a>
            `
        })
        html += `
                </div>
            </div>
        `
        return html
    }

    /**
     * #Method
     * 引用表示セクションのHTMLを返却.
     * 
     * @param contents_limit コンテンツ本文の文字数制限
     */
    bindQuoteSection(contents_limit) {
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        const target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.quote.emojis
        let html /* ユーザー領域 */ = `
            <div class="post_quote">
                <div class="quote_userarea">
                    <span class="username">${target_emojis.replace(this.quote.user.username)}</span>
                    <span>@${this.quote.user.id}</span>
                </div>
        `
        // コンテンツ領域(文字数オーバーしている場合は文字数制限)
        if (this.quote.cw_text) html /* CW */ += `
            <div class="warning_content label_cw">${target_emojis.replace(this.quote.cw_text)}</div>
        `; else if (!this.popout_flg && !this.detail_flg && this.quote.content_length > contents_limit) html += `
            <div class="hidden_content">
                ${target_emojis.replace(this.quote.content_text.substring(0, contents_limit))}...
            </div>
            <div class="hidden_text">(長いので省略)</div>
        `; else html += `<div class="main_content">${target_emojis.replace(this.quote.content)}</div>`
        html += '</div>'

        return html
    }

    // Getter: 投稿属性セクション
    get attribute_section() {
        let html = '<div class="post_attributes">'

        if (this.flg_reblog) html += '<img src="resources/ic_reblog.png" class="flg_reblog"/>' // ブースト
        if (this.flg_fav) html += '<img src="resources/ic_favorite.png" class="flg_fav"/>' // ふぁぼ
        if (this.flg_bookmark) html += '<img src="resources/ic_bkm.png" class="flg_bookmark"/>'  // ブックマーク
        if (this.flg_edit) html += '<img src="resources/ic_draft.png" class="flg_edit"/>' // 編集
        if (this.reply_to) html += '<img src="resources/ic_rpl.png" class="flg_reply"/>' // リプライ
        switch (this.visibility) { // 公開範囲がパブリック以外の場合は識別アイコンを配置
            case 'unlisted':
            case 'home': // ホーム
                html += '<img src="resources/ic_unlisted.png" class="attr_visible"/>'
                break
            case 'private':
            case 'followers': // フォロ限
                html += '<img src="resources/ic_followers.png" class="attr_visible"/>'
                break
            case 'direct':
            case 'specified': // ダイレクト
                html += '<img src="resources/ic_direct.png" class="attr_visible"/>'
                break
            default:
                break
        }
        if (this.from_timeline?.pref?.timeline_type != 'channel' &&
            !(this.profile_post_flg && this.channel_id) && this.local_only) // 連合なし
            html += '<img src="resources/ic_local.png" class="flg_local"/>'

        html += '</div>'
        return html
    }

    // Getter: タイムラインインプレッションセクション
    get impression_section() {
        // インプレッション表示をしない場合は無効化
        if (!Preference.GENERAL_PREFERENCE.tl_impression?.enabled) return ''

        let html = '<div class="impressions">'
        if ((this.reactions?.length ?? 0) > 0 || this.count_reply > 0
            || this.count_reblog > 0 || this.count_fav > 0) { // インプレッション(反応とリアクション)
            // リモートの投稿の場合は警告アイコンを表示
            if (this.remote_flg) html += `
                <span class="warn_remote" title="リモートの投稿です">
                    <img src="resources/ic_warn.png"/>
                </span>
            `
            // リプライ数とブースト/リノート数(あるやつだけ表示)
            if (this.count_reply > 0) html += `
                <span class="count_reply counter" title="リプライ数">${this.count_reply}</span>
            `; if (this.count_reblog > 0) html += `
                <span class="count_reblog counter" title="ブースト/リノート数">${this.count_reblog}</span>
            `
            let reaction_self = null
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    // ふぁぼの表示だけする
                    if (this.count_fav > 0) html += `<span class="count_fav counter" title="お気に入り数">${this.count_fav}</span>`
                    break
                case 'Misskey': // Misskey
                    let reaction_html = '' // リアクションHTMLは後ろにつける
                    let reaction_count = 0 // リアクション合計値を保持
                    this.reactions?.forEach(reaction => {
                        if (reaction.url) reaction_html /* URLの取得できているカスタム絵文字 */ += `
                            <span class="bottom_reaction"><img src="${reaction.url}" class="inline_emoji"/></span>
                        `; else if (reaction.shortcode.lastIndexOf('@') > 0) reaction_html /* 取得できなかった絵文字 */ += `
                            <span class="bottom_reaction">
                                :${reaction.shortcode.substring(1, reaction.shortcode.lastIndexOf('@'))}:
                            </span>
                        `; else reaction_html /* それ以外はそのまま表示 */ += `
                            <span class="bottom_reaction">${reaction.shortcode}</span>
                        `
                        reaction_count += Number(reaction.count)
                    })
                    if (reaction_count > 0) { // リアクションが存在する場合はカウンターをバインド
                        const emojis = this.host_emojis ?? Emojis.get(this.host)
                        // 絵文字キャッシュが取得できる場合のみ置換処理を実行
                        if (emojis) reaction_html = emojis.replace(reaction_html)
                        html += `
                            <div class="reaction_section">${reaction_html}</div>
                            <span class="count_reaction_total counter" title="リアクション合計">${reaction_count}</span>
                        `
                        if (this.reaction_self && emojis) reaction_self = // 自分のリアクションを表示
                            emojis.replace(`:${this.reaction_self.substring(1, this.reaction_self.lastIndexOf('@'))}:`)
                    }
                    break
                default:
                    break
            }
            html += '<div class="info_section">'
            if (reaction_self) html += `<span class="bottom_info">${reaction_self}</span>`
            if (this.remote_flg) html /* リモートフェッチボタンの表示 */ += `
                <button type="button" class="__fetch_remote_impression" title="リモートインプレッション表示"
                    ><img src="resources/ic_down.png" alt="リモートインプレッション表示"/></button>
                <span class="__tooltip">リモートのインプレッションを表示</span>
            `
            html += '</div>'

        }
        html += '</div>'
        return html
    }

    /**
     * #Method
     * この投稿のアンケートに対して投票する
     * 
     * @param target_index 投票対象の項目のインデクス配列
     * @param target_elm 票を入れるボタンのjQueryオブジェクト
     */
    async vote(target_index, target_elm) {
        const notification = Notification.progress('投票しています...')
        let response = null
        try { // 投票リクエストを送信
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.from_account.pref.domain}/api/v1/polls/${this.poll_id}/votes`,
                        headers: { "Authorization": `Bearer ${this.from_account.pref.access_token}` },
                        data: { "choices": target_index }
                    })
                    break
                case 'Misskey': // Misskey
                    for (const idx of target_index) // Misskeyの場合は複数投票の数だけRequestを繰り返す
                        response = await $.ajax({
                            type: "POST",
                            url: `https://${this.from_account.pref.domain}/api/notes/polls/vote`,
                            dataType: "json",
                            headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({
                                "i": this.from_account.pref.access_token,
                                "noteId": this.status_id,
                                "choice": Number(idx)
                            })
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

    // Getter: 投票ボタンを生成
    get poll_buttons() {
        let options = ''
        if (this.poll_multiple) { // 複数回答
            const uuid = crypto.randomUUID()
            this.poll_options.forEach((elm, idx) => options += `
                <input type="checkbox" id="__chk_vote_${uuid}_${idx}"
                    name="__chk_multi_vote" class="__chk_multi_vote" value="${idx}"/>
                <label for="__chk_vote_${uuid}_${idx}">${elm.text}</label>
            `)
            options += `
                <button type="button" class="__on_poll_multi_votes"${this.poll_expired ? ' disabled' : ''}>投票</button>
            `
        } else this.poll_options.forEach(elm => options /* 単体回答 */ += `
            <button type="button" class="__on_poll_vote"${this.poll_expired ? ' disabled' : ''}>${elm.text}</button>
        `)

        return options
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

        $("#__txt_postarea").focus().keyup()
    }

    /**
     * #Method
     * この投稿と同じ内容を本文投稿フォームに展開する.
     * (削除して再編集が呼び出された時用のメソッド)
     */
    reEditWithDelete() {
        // クリックイベントは先に実行
        $("#post_options .refernced_post+.option_close .__on_option_open").click()

        // アカウントを編集対象に変更
        Account.get(`@${this.user.full_address}`).setPostAccount()

        // 投稿本文とCWテキストをフォームに展開
        this.getRenderContent().then(text => $("#__txt_postarea").val(text))
        if (this.cw_text) $("#__txt_content_warning").val(this.cw_text)

        // メディアがある場合はアップ済みのメディアを初期添付
        if (this.medias.length > 0) $('#header>#post_options .attached_media>ul.media_list').html(Media.getAttachElement(this))

        // アンケートが存在する場合はアンケートの内容を再展開
        if (this.poll_options) {
            // 一旦投票項目は空にする
            $('#post_options .poll_options').empty()
            this.poll_options.forEach(elm => { // 投票項目をバインド
                $("#post_options .poll_options").append(
                    '<li><input type="text" class="__txt_poll_option __ignore_keyborad" placeholder="回答"/></li>')
                $("#post_options .poll_options>li:last-child>input.__txt_poll_option").val(elm.text)
            })

            $('#post_options #__chk_poll_multiple').prop("checked", this.poll_multiple)
            // 投票期限の単位と時間を再計算
            const expire_msec = this.poll_expired_time.getTime() - Date.now()
            let time = null
            let unit = null
            if (expire_msec / 3600000 < 1) { // 単位: 分
                time = Math.round(expire_msec / 60000)
                unit = 'min'
            } else if (expire_msec / 86400000 < 1) { // 単位: 時間
                time = Math.round(expire_msec / 3600000)
                unit = 'hour'
            } else { // 単位: 日
                time = Math.round(expire_msec / 86400000)
                unit = 'day'
            }
            $('#post_options #__txt_poll_expire_time').val(time)
            $('#post_options #__cmb_expire_unit').val(unit)
            $("#post_options .poll_setting+.option_close .__on_option_open").click()
        }

        // 返信先と引用先をを参照する
        const host = this.from_timeline?.host ?? this.from_account.pref.domain
        if (this.reply_to) Status.getStatusById(host, this.platform, this.reply_to).then(post => {
            $("#post_options ul.refernce_post").html(post.element)
            $("#post_options #__hdn_reply_id").val(post.id)
        }).catch(err => Notification.error(err))
        if (this.quote_flg) Status.getStatusById(host, this.platform, this.quote.id).then(post => {
            $("#post_options ul.refernce_post").html(post.element)
            $("#post_options #__hdn_quote_id").val(post.id)
        }).catch(err => Notification.error(err))

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
                                <img src="${media.thumbnail ?? 'resources/illust/mitlin_404.jpg'}" class="media_preview"/>
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
            `); else if (media.type == 'audio') /* オーディオ */ $("#modal_expand_image>#expand_image_box").append(`
                <li name="${this.uri}">
                    <audio controls src="${media.url}" class="expanded_media" preload="none"></audio>
                </li>
            `);
            else /* それ以外は画像ファイル */ $("#modal_expand_image>#expand_image_box").append(`
                <li name="${this.uri}"><img src="${media.url}" class="expanded_media"/></li>
            `)
            // サムネイルリスト
            $("#modal_expand_image>#expand_thumbnail_list").append(`
                <li name="${media.url}"><img src="${media.thumbnail ?? 'resources/illust/mitlin_404.jpg'}"/></li>
            `)
        })
        const target_media = index >= 0
            ? $(`#modal_expand_image>#expand_image_box>li:nth-child(${index + 1})>.expanded_media`)
            : $(`#modal_expand_image>#expand_image_box>li>.expanded_media[src="${url}"]`)
        target_media.show()
        // 動画の場合は自動再生
        if (target_media.is("video") || target_media.is("audio")) target_media.get(0).play()
        $(`#modal_expand_image>#expand_thumbnail_list>li[name="${url}"]`).addClass("selected_image")
        $("#modal_expand_image").show(...Preference.getAnimation("FADE_STD"))
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

        switch (this.visibility) { // 公開範囲に合わせてリプライの公開範囲を変更
            case 'public': // パブリック
                $('#post_options input[name="__opt_visibility"][value="public"]').prop('checked', true)
                break
            case 'unlisted':
            case 'home': // ホーム
                $('#post_options input[name="__opt_visibility"][value="unlisted"]').prop('checked', true)
                break
            case 'private':
            case 'followers': // フォロ限
                $('#post_options input[name="__opt_visibility"][value="followers"]').prop('checked', true)
                break
            case 'direct':
            case 'specified': // ダイレクト
                $('#post_options input[name="__opt_visibility"][value="direct"]').prop('checked', true)
                break
            default:
                break
        }

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
            <div class="reaction_col emoji_palette_section">
                <h2>From ${this.from_account.full_address}</h2>
                <div class="timeline">
                    <ul></ul>
                </div>
                <div class="suggest_box">
                    <input type="hidden" class="__hdn_emoji_code" value=""/>
                    <input type="text" id="__txt_reaction_search" class="__ignore_keyborad emoji_suggest_textbox"
                        tabindex="4" placeholder="ショートコードを入力するとサジェストされます"/>
                </div>
                <div class="suggest_option">
                    <div class="first_option"></div>
                    <div class="first_shortcode"></div>
                    <h5>その他の候補</h5>
                    <div class="other_option"></div>
                </div>
                <div class="recent_emoji">
                    <h5>最近送ったリアクション</h5>
                    <div class="recent_emoji_list"></div>
                </div>
                <div class="emoji_list">
                    <input type="hidden" id="__hdn_reaction_id" value="${this.id}"/>
                    <input type="hidden" id="__hdn_reaction_account" value="${this.from_account.full_address}"/>
                </div>
                <button type="button" id="__on_reply_close" class="close_button">×</button>
            </div>
        `))
        // 色とステータスバインドの設定をしてDOMを拡張カラムにバインド
        jqelm.find('h2').css("background-color", this.account_color)
        jqelm.find('.timeline>ul').append(this.element)
        $("#pop_extend_column").html(jqelm).show(...Preference.getAnimation("SLIDE_RIGHT"))
        // サジェストテキストボックスにフォーカス
        $("#__txt_reaction_search").focus()

        // 絵文字一覧をバインド
        Emojis.bindEmojiPalette(this.from_account, 'pop_extend_column', 'reaction')
    }

    /**
     * #Method
     * この投稿の詳細情報を表示する画面を表示
     */
    createDetailWindow() {
        // 一意認識用のUUIDを生成
        this.__detail_uuid = crypto.randomUUID()
        const window_key = `post_window_${this.__detail_uuid}`

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="post_detail_window ex_window">
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
            `,
            color: getHashColor(this.id),
            resizable: true,
            drag_axis: false,
            resize_axis: "all"
        })

        // 投稿内容をバインドして追加情報を非同期でバインド
        $(`#${window_key}>.timeline>ul`).append(this.element)
        const parent_post = $(`#${window_key}>.timeline>ul>li[id="${this.status_key}"]`)

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
     * @param e マウスイベント
     * @param pop_type ホバーする位置のタイプ
     */
    createExpandWindow(target, e, pop_type) {
        // 強制的に通常表示にする
        this.detail_flg = false
        this.popout_flg = true
        // 一時ステータスに保存
        Status.TEMPORARY_CONTEXT_STATUS = this

        // 隠しウィンドウにこの投稿を挿入
        const pos = target.offset()
        const outer_width = target.closest('ul').outerWidth()
        $("#pop_expand_post>ul").html(pop_type == 'reply' ? this.chat_elm : this.element).css('width', `${outer_width}px`)
        // リアクション絵文字はリモートから直接取得
        Emojis.replaceRemoteAsync($("#pop_expand_post .reaction_emoji"))

        $("#pop_expand_post").removeClass("reply_pop")
        const mouse_x = e.pageX
        const mouse_y = e.pageY
        switch (pop_type) {
            case 'under': // マウスのすぐ近くに展開
                if (window.innerHeight / 2 < mouse_y) // ウィンドウの下の方にある場合は下から展開
                    $("#pop_expand_post").css({
                        'top': 'auto',
                        'bottom': Math.round(window.innerHeight - mouse_y - 48),
                        'left': pos.left - 12
                    })
                else $("#pop_expand_post").css({
                    'bottom': 'auto',
                    'top': mouse_y - 24,
                    'left': pos.left - 12
                })
                $("#pop_expand_post").show(...Preference.getAnimation("POP_FOLD"))
                break
            case 'side': // 左右に展開
                let css = {}
                if (window.innerHeight / 2 < mouse_y) { // ウィンドウの下の方にある場合は下から展開
                    css.top = 'auto'
                    css.bottom = Math.round(window.innerHeight - mouse_y - 24)
                } else { // 通常は上から展開
                    css.top = mouse_y - 24
                    css.bottom = 'auto'
                }
                if (window.innerWidth / 2 < mouse_x) { // ウィンドウの右側にある場合は左に展開
                    css.left = 'auto'
                    css.right = Math.round(window.innerWidth - pos.left - 8)
                } else { // 通常は左から展開
                    css.left = pos.left + outer_width - 16
                    css.right = 'auto'
                }
                $("#pop_expand_post").css(css).show()
                break
            case 'reply': // 投稿の直上に展開
                $("#pop_expand_post").css({
                    'top': 'auto',
                    'bottom': Math.round(window.innerHeight - pos.top),
                    'left': pos.left - 12
                }).addClass("reply_pop").show()
                break
            default:
                break
        }
    }

    /**
     * #Method
     * この投稿よりも前のタイムラインを取得するウィンドウを生成
     * 
     * @param layout タイムラインレイアウト
     */
    openScrollableWindow(layout) {
       // 参照元のタイムラインを使って新たにタイムラインオブジェクトを生成
        let scroll_tl = new Timeline( // グループの設定はディープコピーする(レイアウトの書き換えが元に影響するため)
            this.from_timeline?.pref, new Group(structuredClone(this.from_group?.pref), null))
        // タイムラインレイアウトが指定されている場合は変更
        if (layout) scroll_tl.ref_group.pref.tl_layout = layout
        scroll_tl.createLoadableTimeline(this)
    }

    /**
     * #Method
     * この投稿の前後のローカルタイムラインを取得するウィンドウを生成
     * 
     * @param layout タイムラインレイアウト
     */
    openLocalTimelineWindow(layout) {
        const auth_account = Account.getByDomain(this.host)
        let tl_pref = { // タイムライン設定
            "key_address": auth_account?.full_address,
            "external": !auth_account,
            "host": this.host,
            "platform": this.platform,
            "color": auth_account?.pref.acc_color ?? getHashColor(this.host),
            "timeline_type": "local",
            "exclude_reblog": false,
            "expand_cw": false,
            "expand_media": false,
        }
        const gp_pref = { // グループ設定
            "multi_user": false,
            "multi_timeline": false,
            "tl_layout": layout
        }
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                tl_pref.rest_url = `https://${this.host}/api/v1/timelines/public`
                tl_pref.query_param = { 'local': true }
                break
            case 'Misskey': // Misskey
                tl_pref.rest_url = `https://${this.host}/api/notes/local-timeline`
                tl_pref.query_param = {}
                break
            default:
                break
        }

        // ローカルタイムラインオブジェクトを生成
        const scroll_tl = new Timeline(tl_pref, new Group(gp_pref, null))
        this.from_timeline = scroll_tl
        this.from_account = auth_account
        this.detail_flg = false
        scroll_tl.createLoadableTimeline(this)
    }

    /**
     * #Method
     * この投稿が存在するグループのフラッシュウィンドウをこの投稿から開く.
     */
    openFlash() {
        this.from_group.createFlash(this.status_key)
    }

    /**
     * #Method
     * このリプライのリプライ元の投稿をキャッシュから検索して返す(存在しない場合nullを返却).
     */
    findReplyTo() {
        const target_group = this.from_timeline.parent_group
        const tl_itr = target_group.timelines // タイムライングループが単一TLでない場合はイテレータを設定
            ? target_group.timelines.filter(tl => tl.host == this.from_timeline.host)[Symbol.iterator]()
            : [this.from_timeline]
        let replied_post = null
        for (const tl of tl_itr) { // 同一インスタンスのタイムラインの中からリプライ元を検索
            const replied_key = tl.status_key_map.get(this.reply_to)
            if (replied_key) { // 見つかったらこれ以上ループしない
                replied_post = target_group.status_map.get(replied_key)
                break
            }
        }
        return replied_post
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
                    case 'follow':
                    case 'follow_request': // フォロー通知
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

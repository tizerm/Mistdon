/**
 * #Class
 * 通知タイムライン上の投稿データを管理するクラス
 *
 * @author @tizerm@misskey.dev
 */
class NotificationStatus extends Status {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(json, timeline, account) {
        const platform = account.platform ?? timeline.platform

        console.log(json)

        let original_date = null

        switch (platform) {
            case 'Mastodon': // Mastodon
                // フォローはステータスデータが存在しないので生データをそのまま渡す
                if (json.type == 'follow') super(json, timeline, account)
                else super(json.status, timeline, account)
                original_date = json.created_at

                // アクションを起こしたユーザーの情報
                this.action_user = {
                    username: json.account.display_name || json.account.username,
                    id: json.account.acct,
                    full_address: json.account.acct.match(/@/)
                        ? json.account.acct : `${json.account.acct}@${this.host}`,
                    avatar_url: json.account.avatar,
                    profile: json.account.note,
                    emojis: new Emojis({
                        host: this.host,
                        platform: 'Mastodon',
                        emojis: json.account.emojis
                    }),
                    post_count: json.account.statuses_count,
                    follow_count: json.account.following_count,
                    follower_count: json.account.followers_count,
                    acted_date: original_date
                }
                break
            case 'Misskey': // Misskey
                // フォローはステータスデータが存在しないので生データをそのまま渡す
                if (json.type == 'follow') super(json, timeline, account)
                else super(json.note, timeline, account)
                original_date = json.createdAt

                // アクションを起こしたユーザーの情報
                this.action_user = {
                    username: json.user?.name || json.user?.username,
                    id: json.user?.username + (json.user?.host ? ('@' + json.user?.host) : ''),
                    full_address: `${json.user?.username}@${json.user?.host ? json.user?.host : this.host}`,
                    avatar_url: json.user?.avatarUrl,
                    roles: json.user?.badgeRoles,
                    emojis: new Emojis({
                        host: this.host,
                        platform: 'Misskey',
                        emojis: json.user?.emojis
                    }),
                    acted_date: original_date
                }
                // リアクション絵文字
                if (json.type == 'reaction') this.reaction_emoji = json.reaction
                break
            default:
                break
        }
        this.notification_id = json.id
        this.notification_type = json.type
        this.sort_date = new Date(original_date)
        this.relative_time = new RelativeTime(this.sort_date)
        this.status_key = `${this.notification_id}@${this.id}@${this.user?.full_address}`
        this.user_summary = [this.action_user]

        // マージ用の通知キー
        switch (this.notification_type) {
            case 'favourite': // お気に入り
            case 'reaction': // 絵文字リアクション
                this.notification_key = `fav_${this.id}`
                break
            case 'reblog': // ブースト
            case 'renote': // リノート
                this.notification_key = `reb_${this.id}`
                break
            case 'follow': // フォロー通知
            case 'follow_request': // フォローリクエスト
                this.notification_key = `flw${account.full_address}`
                break
            default: // リプライの場合は固有
                this.notification_key = `pst_${this.notification_id}_${this.id}`
                break
        }

    }

    merge(another) {
        // 日付が新しい方に対して通知をマージする
        const merge_at = this.sort_date > another.sort_date ? this : another
        const merge_from = this.sort_date < another.sort_date ? this : another
        merge_at.user_summary.push(...merge_from.user_summary)
        // マージされたほうを返却
        return [merge_at, merge_from]
    }

    // Getter: 投稿データからHTMLを生成して返却(ノーマルレイアウト)
    get element() {
        if (this.notification_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="normal_layout">`
        if (this.type == 'notification') { // 通知タイプによって表示を変更
            switch (this.notification_type) {
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
                        ${this.role_section}
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
                    ${this.role_section}
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
        if (Preference.GENERAL_PREFERENCE.enable_remote_label && this.remote_flg) // リモートラベルを表示
            html += `<div class="remote_label __on_remote_detail">${this.user_host}</div>`
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

        html += this.impression_section

        html += this.summary_section

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
        if (Preference.GENERAL_PREFERENCE.enable_remote_label && this.remote_flg) // リモートラベルをカラーリング
            jqelm.find('.remote_label').css("background-color", getHashColor(this.user_host))
        jqelm.find('.post_footer>.from_address.from_auth_user')
            .css("background-image", `url("${this.from_account?.pref.avatar_url}")`)
        // 期限切れ、投票済み、詳細表示のいずれかの場合は投票ボタンを消して結果を表示する
        if (this.poll_options && (this.detail_flg || this.poll_voted || (!this.poll_unlimited && this.poll_expired)))
            jqelm.find('.post_poll').after(this.poll_graph).remove()
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // フォロー通知の場合はコンテキストメニューを禁止する
        if (!this.allow_context) jqelm.closest('li').addClass('context_disabled')
        // リプライ/ツリーの投稿はクラスをつける
        if (this.reply_to) jqelm.closest('li').addClass('replied_post')
        // 時間で色分け
        jqelm.closest('li').css('border-left-color', this.relative_time.color)
        if (this.cw_text && !this.from_timeline?.pref?.expand_cw) // CWを非表示にする
            jqelm.find('.content>.expand_header.label_cw+div').hide()
        if (this.sensitive && !this.from_timeline?.pref?.expand_media) // 閲覧注意メディアを非表示にする
            jqelm.find('.media>.media_content').hide()

        return jqelm
    }

    // Getter: リストタイプの投稿HTMLを生成して返却
    get list_elm() {
        if (this.notification_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        let target_emojis = null
        let html = `
            <li id="${this.status_key}" name="${this.uri}" class="short_timeline short_notification">
                <img src="${this.action_user.avatar_url}" class="usericon" name="@${this.action_user.full_address}"/>
                <div class="content">
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CW時はCWのみ */ += `
                    <span class="main_content label_cw">${target_emojis.replace(this.cw_text)}</span>
        `; else if (['follow', 'follow_request'].includes(this.notification_type))
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
        html /* 最初の1枚だけ表示(センシの場合は！アイコンのみ) */ += `
            <div class="notif_footer">
                <img src="" class="ic_notif_type"/>
        `; if (this.from_group?.pref?.multi_user) // マルチアカウントカラムの場合は後ろにアイコン表示
            html += `<img src="${this.from_account?.pref.avatar_url}" class="ic_target_account"/>`
        html += '</div>'
        html += `
            </li>
        `

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        // フォロ限の場合はブースト/リノート禁止クラスを付与
        if (!this.allow_reblog) jqelm.closest('li').addClass('reblog_disabled')
        // フォロー通知の場合はコンテキストメニューを禁止する
        if (!this.allow_context) jqelm.closest('li').addClass('context_disabled')
        // BTRNにはクラスをつける
        if (this.reblog) jqelm.closest('li').addClass('rebloged_post')
        // 時間で色分け
        jqelm.closest('li').css('border-left-color', this.relative_time.color)

        switch (this.notification_type) {
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

        return jqelm
    }

    // Getter: 投稿属性セクション
    get summary_section() {
        let html = '<div class="notification_summary">'

        this.user_summary.forEach(u => html += `<span class="user"><img src="${u.avatar_url}" class="inline_emoji"/></span>`)

        html += '</div>'
        return html
    }

}


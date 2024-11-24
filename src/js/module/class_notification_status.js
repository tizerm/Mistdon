﻿/**
 * #Class
 * 通知タイムライン上の投稿データを管理するクラス
 *
 * @author @tizerm@misskey.dev
 */
class NotificationStatus extends Status {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(json, timeline, account) {
        const platform = account.platform ?? timeline.platform
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
                if (json.type == 'reaction') { // リアクション絵文字
                    this.reaction_emoji = json.reaction
                    this.reaction_summary = new Map()
                    this.reaction_summary.set(json.reaction, [this.action_user])
                }
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
        this.mergable = true
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
                this.mergable = false
                break
        }
    }
    // Getter: リアクション判定
    get is_reaction() { return this.notification_type == 'reaction' }

    merge(another) {
        // 日付が新しい方に対して通知をマージする
        const merge_at = this.sort_date > another.sort_date ? this : another
        const merge_from = this.sort_date < another.sort_date ? this : another
        merge_at.user_summary.push(...merge_from.user_summary)
        if (this.is_reaction) { // リアクションの場合はリアクションマップにもマージする
            let merge_react_at = null
            let merge_react_from = null
            if (this.reaction_summary.size == 1 && another.reaction_summary.size == 1) {
                // 両方容量1の場合は日付が新しい方に向かってマージする
                merge_react_at = merge_at.reaction_summary
                merge_react_from = merge_from
            } else { // どちらか容量が多い場合は多い方へマージする
                merge_react_at = this.reaction_summary.size > 1 ? this.reaction_summary : another.reaction_summary
                merge_react_from = this.reaction_summary.size == 1 ? this : another
            }
            const reaction = merge_react_from.reaction_emoji
            const merge_list = merge_react_from.reaction_summary.get(reaction)
            const user_list = merge_react_at.get(reaction)
            // リアクションユーザーをマップにマージ
            if (user_list) user_list.push(...merge_list)
            else merge_react_at.set(reaction, merge_list)
            // 多い方のマップをマージ先のオブジェクトにセット
            merge_at.reaction_summary = merge_react_at
        }
        // マージされたほうを返却
        return [merge_at, merge_from]
    }

    // Getter: 投稿データからHTMLを生成して返却(ノーマルレイアウト)
    get element() {
        if (this.notification_type == 'achievementEarned') return '' // TODO: 通知は一旦除外

        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="normal_layout">`

        // プロフィール表示の場合はユーザーアカウント情報を省略
        if (!this.profile_post_flg || this.reblog) {
            // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
            target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
            // ユーザーアカウント情報
            if (this.mini_normal) { // ノーマル2レイアウトの場合
                html += `
                    <div class="user prof_normal2">
                        <img src="${this.user.avatar_url}" class="usericon __pop_userinfo" name="@${this.user.full_address}"/>
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
                    <img src="${this.user.avatar_url}" class="usericon __pop_userinfo" name="@${this.user.full_address}"/>
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
        if (this.medias.length > 0) // メディアセクション
            html += this.bindMediaSection(this.medias.length > 4 ? 'img_grid_16' : 'img_grid_4')

        // 投稿属性/インプレッション/通知サマリセクション
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
                <img src="${this.user.avatar_url}" class="usericon __pop_userinfo" name="@${this.user.full_address}"/>
                <div class="content">
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CW時はCWのみ */ += `
                    <span class="main_content label_cw">${target_emojis.replace(this.cw_text)}</span>
        `; else if (['follow', 'follow_request'].includes(this.notification_type)) { // フォローの場合
            if (this.user_summary.length > 1) html /* 人数が複数の場合は人数を表示 */ += `
                    <span class="main_content">New ${this.user_summary.length} Followers</span>
            `; else html /* 人数が1人の場合はユーザーアドレス */ += `
                    <span class="main_content">@${this.action_user.full_address}</span>
            `
        } else html /* 本文(マークアップを無視して1行だけ) */ += `
                    <span class="main_content">${target_emojis.replace(this.content_text)}</span>
        `
        html /* フッタのアイコン表示 */ += `
                </div>
                <div class="notif_footer">
                    <img src="" class="ic_notif_type"/>
                    <img class="ic_target_account __pop_userinfo"
                        src="${this.user_summary.length > 1 ? 'resources/ic_folder.png' : this.action_user.avatar_url}"
                        name="@${this.action_user.full_address}"
                        />
                </div>
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
                if (this.reaction_summary.size > 1) // リアクションの種類が複数ある場合
                    alias = '<img src="resources/ic_emoji.png" class="ic_notif_type"/>'
                else if (this.reaction_emoji.match(/^:[a-zA-Z0-9_]+:$/g)) { // カスタム絵文字
                    const emoji = this.host_emojis.emoji_map.get(this.reaction_emoji)
                    if (emoji) alias = `<img src="${emoji.url}" class="ic_notif_type"/>`
                    else alias = '<span>×</span>'
                } else if (this.reaction_emoji.match(/^[a-zA-Z0-9\.\-:@_]+$/g)) // リモートの絵文字
                    alias = '<img src="resources/ic_emoji_remote.png" class="ic_notif_type"/>'
                else alias = `<span>${this.reaction_emoji}</span>` // Unicode絵文字はそのまま渡す
                jqelm.find('.notif_footer').prepend(alias)
                break
            case 'follow':
            case 'follow_request': // フォロー通知
                jqelm.closest('li').addClass('self_post')
                jqelm.find('.ic_notif_type').attr('src', 'resources/ic_cnt_flwr.png')
                jqelm.find('.usericon').attr('src', this.from_account?.pref.avatar_url)
                break
            case 'poll': // 投票終了
                jqelm.find('.ic_notif_type').attr('src', 'resources/ic_poll.png')
                break
            default: // リプライ、引用の場合はアイコン削除
                jqelm.find('.ic_notif_type').remove()
                jqelm.find('.ic_target_account').attr('src', this.from_account?.pref.avatar_url)
                break
        }

        return jqelm
    }

    // Getter: 投稿属性セクション
    get summary_section() {
        if (!this.mergable) return '' // お気に入り/BTRN/リアクション以外は表示しない

        let html = '<div class="notification_summary">'
        switch (this.notification_type) {
            case 'favourite': // お気に入り
                html += '<h6 class="label_favorite">Favorited Users</h6>'
                break
            case 'reblog': // ブースト
                html += '<h6 class="label_reblog">Boosted Users</h6>'
                break
            case 'reaction': // 絵文字リアクション
                html += '<h6 class="label_favorite">Reacted Users</h6>'
                break
            case 'renote': // リノート
                html += '<h6 class="label_reblog">Renoted Users</h6>'
                break
            case 'follow': // フォロー通知
            case 'follow_request': // フォローリクエスト
                html += '<h6 class="label_follow">Followed Users</h6>'
            default: // リプライの場合はヘッダ書かない
                break
        }
        // リアクションの場合はリアクションごとにまとめて列挙する
        if (this.is_reaction) this.reaction_summary.forEach((v, k) => {
            html += '<div class="reaction_section"><span class="reaction_head">'
            if (k.match(/^:[a-zA-Z0-9_]+:$/g)) { // カスタム絵文字
                const emoji = this.host_emojis.emoji_map.get(k)
                if (emoji) html += `<img src="${emoji.url}" class="inline_emoji" alt=":${emoji.shortcode}:"/>`
                else html += `${k} (未キャッシュです)`
            } else html += k // Unicode絵文字はそのまま渡す
            html += '</span>'
            v.forEach(u => html /* 対象リアクションを行ったユーザーを列挙 */ += `<img
                src="${u.avatar_url}" class="usericon __pop_userinfo" name="@${u.full_address}"/>`)
            html += '</div>'
        })
        else this.user_summary.forEach(u => html /* リアクション以外の場合は普通にユーザーを列挙 */ += `<img
            src="${u.avatar_url}" class="usericon __pop_userinfo" name="@${u.full_address}"/>`)

        html += '</div>'
        return html
    }

    // Getter: Electronの通知コンストラクタに送る通知文を生成して返却
    get notification() {
        let title = null
        let body = null
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                // 通知タイプによって表示を変更
                switch (this.notification_type) {
                    case 'favourite': // お気に入り
                        title = `${this.from_account.full_address}: ${this.action_user.username}からお気に入り`
                        body = this.content
                        break
                    case 'reblog': // ブースト
                        title = `${this.from_account.full_address}: ${this.action_user.username}からブースト`
                        body = this.content
                        break
                    case 'follow':
                    case 'follow_request': // フォロー通知
                        title = `${this.from_account.full_address}: ${this.action_user.username}からフォロー`
                        body = this.action_user.profile
                        break
                    default: // リプライ
                        title = `${this.from_account.full_address}: ${this.action_user.username}から返信`
                        body = this.content
                        break
                }
                break
            case 'Misskey': // Misskey
                // 通知タイプによって表示を変更
                switch (this.notification_type) {
                    case 'reaction': // 絵文字リアクション
                        title = `${this.from_account.full_address}: ${this.action_user.username}からリアクション`
                        body = this.content
                        break
                    case 'renote': // リノート
                        title = `${this.from_account.full_address}: ${this.action_user.username}からリノート`
                        body = this.content
                        break
                    case 'follow': // フォロー通知
                        title = `${this.from_account.full_address}: ${this.action_user.username}からフォロー`
                        body = `@${this.action_user.id} - ${this.action_user.username}`
                        break
                    default: // リプライ
                        title = `${this.from_account.full_address}: ${this.action_user.username}から返信`
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

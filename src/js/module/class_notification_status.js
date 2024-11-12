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
    }

    merge(another) {
        // 日付が新しい方に対して通知をマージする
        const merge_at = this.sort_date > another.sort_date ? this : another
        const merge_from = this.sort_date < another.sort_date ? this : another
        merge_at.user_summary.push(...merge_from.user_summary)
        // マージされたほうを返却
        return merge_at
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
}


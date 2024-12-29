/**
 * #Class
 * 投稿データを表示するベースレイアウトを定義するクラス(abstract)
 *
 * @author @tizerm@misskey.dev
 */
/* abstract */ class StatusLayout {
    // コンストラクタ: 定義しない
    constructor() { }

    /**
     * #Default #Method
     * ノーマルレイアウトのベースHTMLを返却する.
     * 
     * @param isNotification 通知の場合はtrue
     */
    getHtmlNormal(isNotification) {
        let target_emojis = null
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="normal_layout">`
        if (this.reblog) { // ブースト/リノートのヘッダ
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
        // 投稿属性セクション
        html += this.attribute_section
        // 一部の通知はインプレッション数値を表示する
        if (!this.detail_flg) html += this.impression_section
        if (isNotification) html += this.summary_section

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

        return html
    }

    /**
     * #Default #Method
     * チャットレイアウトのベースHTMLを返却する.
     * 
     * @param isNotification 通知の場合はtrue
     * @param self_flg 自分の投稿の場合はtrue
     */
    getHtmlChat(isNotification, self_flg) {
        let target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        let html /* name属性にURLを設定 */ = `<li id="${this.status_key}" name="${this.uri}" class="chat_timeline">`
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.user.avatar_url}" class="usericon __pop_userinfo" name="@${this.user.full_address}"/>
                ${this.role_section}
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
        `
        if (Preference.GENERAL_PREFERENCE.enable_remote_label && this.remote_flg) // リモートラベルを表示
            html += `<div class="remote_label __on_remote_detail">${this.user_host}</div>`
        html += '<div class="content">'
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
        if (isNotification) html += this.summary_section
        else html += this.impression_section
        html += '</li>'

        return html
    }

    /**
     * #Default #Method
     * リストレイアウトのベースHTMLを返却する.
     */
    getHtmlList() {
        let target_emojis = null
        let html = `
            <li id="${this.status_key}" name="${this.uri}" class="short_timeline">
                <img src="${this.user.avatar_url}" class="usericon __pop_userinfo" name="@${this.user.full_address}"/>
                <div class="content">
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        if (this.cw_text) html /* CW時はCWのみ */ += `
                    <span class="main_content label_cw">${target_emojis.replace(this.cw_text)}</span>
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
        html += '</li>'

        return html
    }

    /**
     * #Default #Method
     * メディアレイアウトのベースHTMLを返却する.
     * 
     * @param isNotification 通知の場合はtrue
     */
    getHtmlMedia(isNotification) {
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
                <img src="${this.user.avatar_url}" class="usericon __pop_userinfo" name="@${this.user.full_address}"/>
                ${this.role_section}
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
        if (Preference.GENERAL_PREFERENCE.enable_remote_label && this.remote_flg) // リモートラベルを表示
            html += `<div class="remote_label __on_remote_detail">${this.user_host}</div>`
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
        if (isNotification) html += this.summary_section
        else html += this.impression_section
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

        return html
    }

    /**
     * #Default #Method
     * ギャラリーレイアウトのベースHTMLを返却する.
     */
    getHtmlGallery() {
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
        return html
    }

    /**
     * #Default #Method
     * Mastodonのフィルター対象の投稿のベースHTMLを返却する.
     */
    getHtmlFiltered() {
        return `
            <li id="${this.status_key}" name="${this.uri}" class="filtered_timeline">
                <span>フィルター: ${this.mute_warning}</span>
            </li>
        `
    }

    /**
     * #Default #Method
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
     * #Default #Method
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

    // Getter: Misskeyのロール表示セクション
    get role_section() {
        if ((this.user.roles?.length ?? 0) == 0) return ''
        let html = '<div class="user_role">'
        this.user.roles.forEach(role => html += `<img src="${role.iconUrl}" alt="${role.name}"/>`)
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
}

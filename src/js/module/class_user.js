/**
 * #Class
 * (他人の)アカウント情報を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class User {
    // コンストラクタ: APIから来たユーザーデータを受け取って生成
    constructor(arg) {
        this.platform = arg.platform
        this.fields = []
        let host = null

        switch (arg.platform) {
            case 'Mastodon': // Mastodon
                // リモートの情報を直に取得する場合引数をそのまま使う
                if (arg.remote) host = arg.host
                else // ローカルサーバーからユーザー情報を取得している場合
                    host = arg.json.acct.match(/@/) // リモートホストはアドレスから取得
                        ? arg.json.acct.substring(arg.json.acct.lastIndexOf('@') + 1) : arg.host

                this.use_emoji_cache = false // Mastodonの場合絵文字キャッシュは使わない
                this.emojis = new Emojis({
                    host: host,
                    platform: 'Mastodon',
                    emojis: arg.json.emojis
                })

                this.id = arg.json.id
                this.user_id = arg.json.username
                this.full_address = `@${arg.json.username}@${host}`
                this.username = arg.json.display_name || arg.json.username
                this.avatar_url = arg.json.avatar
                this.header_url = arg.json.header
                this.profile = arg.json.note
                this.url = arg.json.url
                this.count_post = arg.json.statuses_count
                this.count_follow = arg.json.following_count
                this.count_follower = arg.json.followers_count

                // フィールドをセット
                if (arg.json.fields) arg.json.fields.forEach(f => this.fields.push({
                    label: f.name,
                    text: f.value
                }))
                console.log(arg.json)
                break
            case 'Misskey': // Misskey
                // リモートの情報を直に取得する場合引数をそのまま使う
                if (arg.remote) host = arg.host
                else // ローカルサーバーからユーザー情報を取得している場合ホスト情報を参照する
                    host = arg.json.host ?? arg.host

                this.emojis = new Emojis({
                    host: host,
                    platform: 'Misskey',
                    emojis: arg.json.emojis
                })

                this.id = arg.json.id
                this.user_id = arg.json.username
                this.full_address = `@${arg.json.username}@${host}`
                this.username = arg.json.name || arg.json.username
                this.avatar_url = arg.json.avatarUrl
                this.header_url = arg.json.bannerUrl
                this.profile = arg.json.description
                if (this.profile) this.profile = this.profile.replace(new RegExp('\n', 'g'), '<br/>') // 改行文字をタグに置換
                this.url = `https://${host}/@${arg.json.username}` // URLは自前で生成
                this.count_post = arg.json.notesCount
                this.count_follow = arg.json.followingCount
                this.count_follower = arg.json.followersCount
                this.hide_ff = (arg.json.ffVisibility ?? 'public') != 'public'

                // フィールドをセット
                if (arg.json.fields) arg.json.fields.forEach(f => this.fields.push({
                    label: f.name,
                    text: f.value.match(/^http/) // URLはリンクにする
                        ? `<a href="${f.value}" class="__lnk_external">${f.value}</a>` : f.value
                }))

                // ピンどめ投稿はまとめる
                this.pinneds = [] // この段階ではまだ整形しない
                if (arg.json.pinnedNotes) arg.json.pinnedNotes.forEach(note => this.pinneds.push(note))
                break
            default:
                break
        }
        this.host = host
        this.all_account_flg = arg.auth
        // Mistdonに認証情報のあるホストの場合は対象アカウントを引っ張ってくる
        this.authorized = Account.getByDomain(host)
        if (this.platform == 'Misskey') this.use_emoji_cache = this.authorized ? true : false
    }

    // Getter: 取得元アカウントのカスタム絵文字
    get host_emojis() { return this.authorized?.emojis }

    /**
     * #StaticMethod
     * リモートホストも含めたユーザーアドレスからリモートのユーザー情報を取得する
     * 
     * @param address ユーザーアカウントのフルアドレス
     */
    static async getByAddress(address) {
        const notification = Notification.progress("対象ユーザーのリモートIDを取得中です...")
        const user_id = address.substring(1, address.lastIndexOf('@'))
        const host = address.substring(address.lastIndexOf('@') + 1)

        return await Promise.any([
            // アドレスからプラットフォームの種類が判定できないので、request送信してうまくいったやつだけ返す
            $.ajax({ // Mastodon
                type: "GET",
                url: `https://${host}/api/v1/accounts/lookup`,
                dataType: "json",
                data: { "acct": user_id }
            }).then(data => { return {
                platform: 'Mastodon',
                id: data.id
            }}),
            $.ajax({ // Misskey
                type: "POST",
                url: `https://${host}/api/users/show`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    "username": user_id,
                    "host": host
                })
            }).then(data => { return {
                platform: 'Misskey',
                id: data.id
            }})
        ]).then(info => {
            notification.done()
            return User.get({
                id: info.id,
                platform: info.platform,
                host: host
            })
        }).catch(jqXHR => notification.error(`ユーザーIDの取得でエラーが発生しました. 
            サポート外のプラットフォームの可能性があります.`))

    }

    /**
     * #StaticMethod
     * サーバーのアカウントIDからユーザー情報を取得する
     * 
     * @param arg パラメータオブジェクト
     */
    static async get(arg) {
        let response = null
        try {
            switch (arg.platform) {
                case 'Mastodon': // Mastodon
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${arg.host}/api/v1/accounts/${arg.id}`,
                        dataType: "json"
                    })
                    break
                case 'Misskey': // Misskey
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${arg.host}/api/users/show`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({ "userId": arg.id })
                    })
                    break
                default:
                    break
            }
            return new User({ // ユーザーオブジェクトを生成
                json: response,
                host: arg.host,
                remote: true,
                auth: false,
                platform: arg.platform
            })
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
        }
    }

    static createDetailHtml(address) {
        return `
            <td id="${address}" class="timeline column_profile">
                <div class="col_loading">
                    <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                    <span class="loading_text">Now Loading...</span>
                </div>
                <ul class="profile_header __context_user"></ul>
                <ul class="profile_detail __context_user"></ul>
                <div class="user_post_elm">
                    <div class="tab">
                        <a class="__tab_profile_posts">全投稿</a>
                        <a class="__tab_profile_medias">メディア</a>
                    </div>
                    <div class="post_uls">
                        <div class="pinned_block post_div">
                            <h4>ピンどめ</h4>
                            <ul class="pinned_post __context_posts"></ul>
                        </div>
                        <div class="posts_block post_div">
                            <ul class="posts __context_posts"></ul>
                        </div>
                    </div>
                    <div class="media_uls">
                        <ul class="media_post __context_posts"></ul>
                    </div>
                </div>
                <div class="user_ff_elm">
                    <ul class="ff_short_profile">
                        <li class="__initial_text">
                            ※ユーザーにしばらくマウスを乗せるとここに簡易プロフィールが表示されます。
                        </li>
                    </ul>
                    <ul class="ff_nametags"></ul>
                </div>
            </td>
        `
    }

    // Getter: プロフィールヘッダのDOMを返却
    get header_element() {
        let html /* name属性にURLを設定 */ = `
            <li class="header_userinfo">
                <div class="label_head user_header">
                    <span>&nbsp;</span>
                </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        const target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.avatar_url}" class="usericon"/>
                <h4 class="username">${target_emojis.replace(this.username)}</h4>
                <a href="${this.url}" class="userid __lnk_external">${this.full_address}</a>
        `
        let bookmarks = ''
        let instance = ''
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                html += '<img src="resources/ic_mastodon.png" class="instance_icon"/>'
                bookmarks = `
                    <a class="__on_show_bookmark" title="ブックマーク"
                        ><img src="resources/ic_bkm.png" alt="ブックマーク"/></a>
                    <a class="__on_show_mastfav" title="お気に入り"
                        ><img src="resources/ic_cnt_fav.png" alt="お気に入り"/></a>
                `
                instance = `
                    <a class="__on_show_instance" title="所属インスタンス情報"
                        ><img src="resources/ic_mastodon.png" alt="所属インスタンス情報"/></a>
                `
                break
            case 'Misskey': // Misskey
                html += '<img src="resources/ic_misskey.png" class="instance_icon"/>'
                bookmarks = `
                    <a class="__on_show_reaction" title="リアクション"
                        ><img src="resources/ic_emoji.png" alt="リアクション"/></a>
                    <a class="__on_show_miskfav" title="お気に入り"
                        ><img src="resources/ic_cnt_fav.png" alt="お気に入り"/></a>
                `
                instance = `
                    <a class="__on_show_instance" title="所属インスタンス情報"
                        ><img src="resources/ic_misskey.png" alt="所属インスタンス情報"/></a>
                `
                break
            default:
                break
        }
        html += `
            </div>
            <div class="detail_info">
                <span class="count_post counter label_postcount" title="投稿数">${this.count_post}</span>
        `
        // フォロー/フォロワー数(非公開の場合は非公開ラベルを出す)
        if (this.hide_ff) html += `
            <span class="ff_private counter label_private">フォロー/フォロワー非公開</span>
        `; else html += `
            <span class="count_follow counter label_follow" title="フォロー">${this.count_follow}</span>
            <span class="count_follower counter label_follower" title="フォロワー">${this.count_follower}</span>
        `
        html += '</div></li>'

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.user_header') // ヘッダ画像を縮小表示して表示
            .css('background-image', `url("${this.header_url}")`)
            .css('background-size', '420px auto')
            .css('background-position', 'center center')
        if (this.all_account_flg) // 認証プロフィール表示の場合はブックマークアイコンを追加
            jqelm.find('.detail_info').addClass('auth_details').prepend(bookmarks)
        else // 認証されていないプロフィール表示の場合は所属インスタンスボタンを追加
            jqelm.find('.detail_info').prepend(instance)
        return jqelm
    }

    // Getter: プロフィール本体のDOMを返却
    get profile_element() {
        const target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        let html /* name属性にURLを設定 */ = '<li class="profile_userinfo">'
        html += `
            <div class="content">
                <div class="main_content">${target_emojis.replace(this.profile)}</div>
        `
        if (this.fields.length > 0) { // フィールドが存在する場合は表示
            html += '<table class="prof_field"><tbody>'
            this.fields.forEach(f => html += `<tr>
                <th>${target_emojis.replace(f.label)}</th>
                <td>${target_emojis.replace(f.text)}</td>
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
        let html /* name属性にURLを設定 */ = `
            <li class="short_userinfo" name="${this.full_address}">
                <div class="label_head user_header">
                    <span>&nbsp;</span>
                </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        const target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.avatar_url}" class="usericon"/>
                <h4 class="username">${target_emojis.replace(this.username)}</h4>
                <a href="${this.url}" class="userid __lnk_external">${this.full_address}</a>
        `
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                html += '<img src="resources/ic_mastodon.png" class="instance_icon"/>'
                break
            case 'Misskey': // Misskey
                html += '<img src="resources/ic_misskey.png" class="instance_icon"/>'
                break
            default:
                break
        }
        html += `
            </div>
            <div class="content"><div class="main_content">
                ${$($.parseHTML(this.profile)).text()}
            </div></div>
        `
        html += `
            <div class="detail_info">
                <span class="count_post counter label_postcount" title="投稿数">${this.count_post}</span>
        `
        // フォロー/フォロワー数(非公開の場合は非公開ラベルを出す)
        if (this.hide_ff) html += `
            <span class="ff_private counter label_private">フォロー/フォロワー非公開</span>
        `; else html += `
            <span class="count_follow counter label_follow" title="フォロー">${this.count_follow}</span>
            <span class="count_follower counter label_follower" title="フォロワー">${this.count_follower}</span>
        `
        html += '</div></li>'

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.user_header') // ヘッダ画像を縮小表示して表示
            .css('background-image', `url("${this.header_url}")`)
            .css('background-size', '480px auto')
            .css('background-position', 'center center')
        return jqelm
    }

    // Getter: インラインで名前だけ表示するネームタグ表示用DOM
    get inline_nametag() {
        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(`
            <li class="user_nametag" name="${this.full_address}">
                <div class="user">
                    <img src="${this.avatar_url}" class="usericon"/>
                    <h4 class="username">${this.username}</h4>
                    <span class="userid">${this.full_address}</a>
                </div>
            </li>
        `))
        return jqelm
    }

    /**
     * #Method #Ajax #jQuery
     * このユーザーの投稿一覧を取得する
     * 
     * @param account リモートホストの情報を入れた最小限のアカウントオブジェクト
     * @param max_id 前のページの最後の投稿のページングID
     */
    async getPost(account, media_flg, max_id) {
        let response = null
        let query_param = null
        try {
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    query_param = {
                        "limit": 40,
                        "only_media": media_flg,
                        "exclude_replies": true
                    }
                    if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                    // あればアクセストークンを設定
                    let header = {}
                    if (this.authorized) header = { "Authorization": `Bearer ${this.authorized.pref.access_token}` }
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${this.host}/api/v1/accounts/${this.id}/statuses`,
                        dataType: "json",
                        headers: header,
                        data: query_param
                    })
                    break
                case 'Misskey': // Misskey
                    query_param = {
                        "userId": this.id,
                        "includeReplies": false,
                        "limit": 40,
                        "withFiles": media_flg,
                        "includeMyRenotes": false
                    }
                    if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                    if (this.authorized) query_param.i = this.authorized.pref.access_token
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.host}/api/users/notes`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    break
                default:
                    break
            }
            const posts = []
            response.forEach(p => posts.push(new Status(p, { "__extended_timeline": "profile_post" }, account)))
            return posts
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.error(`${this.full_address}の投稿の取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    /**
     * #Method #Ajax #jQuery
     * このユーザーのピンどめされた投稿一覧を取得する
     * 
     * @param account リモートホストの情報を入れた最小限のアカウントオブジェクト
     */
    async getPinnedPost(account) {
        let response = null
        try {
            let posts = []
            switch (this.platform) {
                case 'Mastodon': // Mastodon
                    let header = {}
                    if (this.authorized) header = { "Authorization": `Bearer ${this.authorized.pref.access_token}` }
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${this.host}/api/v1/accounts/${this.id}/statuses`,
                        dataType: "json",
                        headers: header,
                        data: { "pinned": true }
                    })
                    response.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                    break
                case 'Misskey': // Misskey
                    // 既に入ってるピンどめ投稿を整形
                    this.pinneds.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                    break
                default:
                    break
            }
            return posts
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.info(`${this.full_address}の投稿の取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    /**
     * #Method
     * このユーザーのお気に入り/ブックマーク/リアクション履歴一覧を取得する
     * 
     * @param account このユーザーのアカウントオブジェクト
     * @param type お気に入り/ブックマーク/リアクションか指定
     * @param max_id 前のページの最後の投稿のページングID
     */
    async getBookmarks(account, type, max_id) {
        let response = null
        let query_param = null
        try {
            switch (type) {
                case 'Favorite_Mastodon': // お気に入り(Mastodon)
                    query_param = { "limit": 40 }
                    if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                    response = await ajax({ // response Headerが必要なのでfetchを使うメソッドを呼ぶ
                        method: "GET",
                        url: `https://${this.host}/api/v1/favourites`,
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                        data: query_param
                    })
                    response = {
                        body: response.body,
                        link: response.headers.get("link")
                    }
                    break
                case 'Favorite_Misskey': // お気に入り(Misskey)
                    query_param = {
                        "i": account.pref.access_token,
                        "limit": 40
                    }
                    if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.host}/api/i/favorites`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    response = { body: response }
                    break
                case 'Bookmark': // ブックマーク(Mastodon)
                    query_param = { "limit": 40 }
                    if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                    response = await ajax({ // response Headerが必要なのでfetchを使うメソッドを呼ぶ
                        method: "GET",
                        url: `https://${this.host}/api/v1/bookmarks`,
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                        data: query_param
                    })
                    response = {
                        body: response.body,
                        link: response.headers.get("link")
                    }
                    break
                case 'Reaction': // リアクション(Misskey)
                    query_param = {
                        "i": account.pref.access_token,
                        "userId": this.id,
                        "limit": 40
                    }
                    if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${this.host}/api/users/reactions`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    response = { body: response }
                    break
                default:
                    break
            }
            // 残りのデータがない場合はreject
            if (response.body.length == 0) throw new Error('empty')

            const posts = []
            response.body.forEach(p => posts.push(new Status(p.note ?? p, { "parent_column": null }, account)))
            let next_id = null
            // Headerのlinkからページング処理のnext_idを抽出
            if (response.link) next_id = response.link.match(/max_id=(?<id>[0-9]+)>/)?.groups.id
            else next_id = response.body.pop().id // 特殊ページング以外は普通に投稿IDをnext_idとする
            return {
                datas: posts,
                max_id: next_id
            }
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            if (err.message == 'empty') { // もうデータがない場合は専用メッセージを出す
                Notification.info("これ以上データがありません.")
                return Promise.reject(err)
            }
            console.log(err)
            Notification.error('取得に失敗しました.')
            return Promise.reject(err)
        }
    }

    /**
     * #Method
     * このユーザーのフォロー/フォロワー一覧を取得する
     * 
     * @param account このユーザーのアカウントオブジェクト
     * @param type フォローかフォロワーか指定
     * @param max_id 前のページの最後のユーザーのページングID
     */
    async getFFUsers(account, type, max_id) {
        const platform = account?.platform ?? this.platform
        let api_url = null
        let query_param = null
        let response = null
        try {
            let users = []
            switch (platform) {
                case 'Mastodon': // Mastodon
                    if (type == 'follows') api_url = `https://${this.host}/api/v1/accounts/${this.id}/following`
                    else if (type == 'followers') api_url = `https://${this.host}/api/v1/accounts/${this.id}/followers`
                    query_param = { "limit": 80 }
                    if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                    // あればアクセストークンを設定
                    let header = {}
                    if (this.authorized) header = { "Authorization": `Bearer ${this.authorized.pref.access_token}` }
                    response = await ajax({ // response Headerが必要なのでfetchを使うメソッドを呼ぶ
                        method: "GET",
                        url: api_url,
                        headers: header,
                        data: query_param
                    })
                    response.body.forEach(u => users.push(new User({
                        json: u,
                        host: this.host,
                        remote: false,
                        auth: false,
                        platform: platform
                    })))
                    response = {
                        body: users,
                        link: response.headers.get("link")
                    }
                    break
                case 'Misskey': // Misskey
                    if (type == 'follows') api_url = `https://${this.host}/api/users/following`
                    else if (type == 'followers') api_url = `https://${this.host}/api/users/followers`
                    query_param = {
                        "userId": this.id,
                        "limit": 80
                    }
                    if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                    if (this.authorized) query_param.i = this.authorized.pref.access_token
                    response = await $.ajax({
                        type: "POST",
                        url: api_url,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    response.forEach(u => users.push(new User({
                        json: u.followee ?? u.follower,
                        host: this.host,
                        remote: false,
                        auth: false,
                        platform: platform
                    })))
                    response = { body: users }
                    break
                default:
                    break
            }
            let next_id = null
            // Headerのlinkからページング処理のnext_idを抽出
            if (response.link) next_id = response.link.match(/max_id=(?<id>[0-9]+)>/)?.groups.id
            else next_id = response.body[response.body.length - 1].id // 特殊ページング以外は普通に投稿IDをnext_idとする
            return {
                datas: response.body,
                max_id: next_id
            }
        } catch (err) { // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.error(`${this.full_address}のFFの取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    async getInstance() {
        return await Instance.getDetail(this.host, this.platform)
    }

    /**
     * #Method
     * このユーザーの詳細情報を表示するウィンドウのDOMを生成して表示する
     */
    createDetailWindow() {
        $("#pop_ex_timeline").html(`
            <div class="account_timeline single_user">
                <table><tbody><tr>
                    <td class="timeline column_instance_info">
                        <div class="col_loading">
                            <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                            <span class="loading_text">Now Loading...</span>
                        </div>
                    </td>
                    ${User.createDetailHtml(this.full_address)}
                </tr></tbody></table>
            </div>
            <button type="button" id="__on_search_close" class="close_button">×</button>
        `)
        this.bindDetail()
        $("#pop_ex_timeline").show("slide", { direction: "right" }, 150)
    }

    /**
     * #Method
     * このユーザーの詳細情報を表示するポップアップウィンドウのDOMを生成して表示する
     * 
     * @param target クリックしたElementの親のユーザーのjQueryオブジェクト
     */
    createDetailPop(target) {
        const pos = target.closest("td").offset()
        this.createDetailHtml("#pop_ex_timeline>.ff_pop_user")
        $("#pop_ex_timeline>.ff_pop_user").css({
            'left': `${pos.left - 138}px`,
            'top': `${pos.top - 48}px`,
        }).show("fade", 80)
    }

    async bindDetail() {
        const target_elm = $(`#pop_ex_timeline>.account_timeline td[id="${this.full_address}"]`)
        // ヘッダとプロフィール詳細を表示
        target_elm.find(".profile_header").html(this.header_element)
        target_elm.find(".profile_detail").html(this.profile_element)
        // 認証プロフィール一覧表示時にはブックマークブロックも追加すてヘッダサイズを変える
        if (this.all_account_flg) target_elm.append(`
            <div class="user_bookmark_elm">
                <ul class="bookmarks __context_posts"></ul>
            </div>
        `); else target_elm.find('.profile_header .user_header').css('background-size', '480px auto')

        // ヘッダ部分にツールチップを生成
        target_elm.find(".detail_info").tooltip({
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
        if (this.platform == 'Misskey') { // Misskeyの場合非同期絵文字置換を実行
            Emojis.replaceDomAsync(target_elm.find(".profile_header .username"), this.host) // ユーザー名
            Emojis.replaceDomAsync(target_elm.find(".profile_detail .main_content"), this.host) // プロフィール文
        }

        try { // ピンどめ投稿と通常投稿を取得
            const account = { // accountには最低限の情報だけ入れる
                "platform": this.platform,
                "pref": { "domain": this.host }
            }
            const response = await Promise.all([this.getPost(account, false, null), this.getPinnedPost(account)])
            target_elm.find(".col_loading").remove()

            // 最新投稿データはスクロールローダーを生成
            createScrollLoader({
                data: response[0],
                target: target_elm.find(".posts"),
                bind: (data, target) => {
                    data.forEach(p => target.append(p.element))
                    // max_idとして取得データの最終IDを指定
                    return data.pop().id
                },
                load: async max_id => this.getPost(account, false, max_id)
            })
            { // ピンどめ投稿を展開
                const exist_pinned = response[1].length > 0
                if (exist_pinned) response[1].forEach(p => target_elm.find(".pinned_post").append(p.element))
                User.setHeight(target_elm, exist_pinned) // 高さを設定
            }

            // ピンどめ投稿と通常投稿の絵文字を取得
            if (this.platform == 'Misskey') { // Misskeyの場合非同期絵文字置換を実行
                Emojis.replaceDomAsync(target_elm.find(".pinned_post .username"), this.host) // ユーザー名
                Emojis.replaceDomAsync(target_elm.find(".pinned_post .label_cw"), this.host) // CWテキスト
                Emojis.replaceDomAsync(target_elm.find(".pinned_post .main_content"), this.host) // 本文
                Emojis.replaceDomAsync(target_elm.find(".posts .username"), this.host) // ユーザー名
                Emojis.replaceDomAsync(target_elm.find(".posts .label_cw"), this.host) // CWテキスト
                Emojis.replaceDomAsync(target_elm.find(".posts .main_content"), this.host) // 本文
            }
        } catch (err) {
            console.log(err)
            Notification.error(`${this.full_address}のプロフィールの表示に失敗しました.`)
        }
    }

    static setHeight(target_elm, exist_pinned) {
        const detail_height = target_elm.find("ul.profile_detail").outerHeight()
        const pinned_height = exist_pinned ? target_elm.find("ul.pinned_post").outerHeight() : 0
        // ピンどめ投稿がない場合はピン留めブロックを削除
        if (!exist_pinned) target_elm.find(".pinned_block").remove()

        // ブロックの高さを計算
        target_elm.find("ul.posts").css('height', `calc(100vh - ${340 + detail_height + pinned_height}px)`)
        target_elm.find("ul.media_post").css('height', `calc(100vh - ${340 + detail_height}px)`)
        target_elm.find("ul.bookmarks").css('height', `calc(100vh - ${309 + detail_height}px)`)
        target_elm.find("ul.ff_nametags").css('height', `calc(100vh - ${520 + detail_height}px)`)
    }

    /**
     * #Method
     * このユーザーのお気に入り/ブックマーク/リアクション履歴を取得して表示する
     * 
     * @param type お気に入り/ブックマーク/リアクションのどれかを指定
     */
    async createBookmarkList(type) {
        const target_td = $(`#pop_ex_timeline>.account_timeline td[id="${this.full_address}"]`)
        target_td.prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)
        target_td.find(".user_post_elm").hide()
        target_td.find(".user_ff_elm").hide()
        target_td.find(".user_bookmark_elm>ul.bookmarks").empty()
        target_td.find(".user_bookmark_elm").show()

        // ブックマークデータを取得してローダーを生成
        const response = await this.getBookmarks(Account.get(this.full_address), type, null)
        target_td.find(".col_loading").remove()
        createScrollLoader({ // スクロールローダーを生成
            data: response,
            target: target_td.find(".user_bookmark_elm>.bookmarks"),
            bind: (data, target) => {
                data.datas.forEach(post => target.append(post.element))
                // Headerを経由して取得されたmax_idを返却
                return data.max_id
            },
            load: async max_id => this.getBookmarks(Account.get(this.full_address), type, max_id)
        })
    }

    /**
     * #Method
     * このユーザーのフォロー/フォロワーの一覧を表示するリストを生成する
     * 
     * @param type フォローを取得するかフォロワーを取得するか指定
     */
    async createFFTaglist(type) {
        const target_td = $(`#pop_ex_timeline>.account_timeline td[id="${this.full_address}"]`)
        target_td.prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)
        target_td.find(".user_post_elm").hide()
        target_td.find(".user_bookmark_elm").hide()
        target_td.find(".user_ff_elm>ul.ff_short_profile").html(`
            <li class="__initial_text">※ユーザーにしばらくマウスを乗せるとここに簡易プロフィールが表示されます。</li>
        `)
        target_td.find(".user_ff_elm>ul.ff_nametags").empty()
        target_td.find(".user_ff_elm").show()

        // ユーザーデータを取得してローダーを生成
        const response = await this.getFFUsers(Account.get(this.full_address), type, null)
        target_td.find(".col_loading").remove()
        createScrollLoader({ // スクロールローダーを生成
            data: response,
            target: target_td.find(".user_ff_elm>.ff_nametags"),
            bind: (data, target) => {
                data.datas.forEach(u => target.append(u.inline_nametag))
                // Headerを経由して取得されたmax_idを返却
                return data.max_id
            },
            load: async max_id => this.getFFUsers(Account.get(this.full_address), type, max_id)
        })
    }

    async createMediaGallery() {
        const target_td = $(`#pop_ex_timeline>.account_timeline td[id="${this.full_address}"]`)
        target_td.prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        const account = { // accountには最低限の情報だけ入れる
            "platform": this.platform,
            "pref": { "domain": this.host }
        }
        // メディア投稿データを取得してローダーを生成
        const response = await this.getPost(account, true, null)
        target_td.find(".col_loading").remove()
        createScrollLoader({ // スクロールローダーを生成
            data: response,
            target: target_td.find(".media_post"),
            bind: (data, target) => {
                data.forEach(p => target.append(p.gallery_elm))
                // max_idとして取得データの最終IDを指定
                return data.pop().id
            },
            load: async max_id => this.getPost(account, true, max_id)
        })
    }
}


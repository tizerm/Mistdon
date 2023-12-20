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

        switch (arg.platform) { // TODO: 暫定
            case 'Mastodon': // Mastodon
                // リモートの情報を直に取得する場合引数をそのまま使う
                if (arg.remote) host = arg.host
                else // ローカルサーバーからユーザー情報を取得している場合
                    host = arg.json.acct.match(/@/) // リモートホストはアドレスから取得
                        ? arg.json.acct.substring(arg.json.acct.lastIndexOf('@') + 1) : arg.host

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
                break
            case 'Misskey': // Misskey
                // リモートの情報を直に取得する場合引数をそのまま使う
                if (arg.remote) host = arg.host
                else // ローカルサーバーからユーザー情報を取得している場合ホスト情報を参照する
                    host = arg.json.host ?? arg.host

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
        this.auth = arg.auth
    }

    /**
     * #StaticMethod
     * リモートホストも含めたユーザーアドレスからリモートのユーザー情報を取得する
     * 
     * @param address ユーザーアカウントのフルアドレス
     */
    static async getByAddress(address) {
        const toast_uuid = crypto.randomUUID()
        toast("対象ユーザーのリモートIDを取得中です...", "progress", toast_uuid)
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
            // 一旦toastを消去
            toast(null, "hide", toast_uuid)
            return User.get({
                id: info.id,
                platform: info.platform,
                host: host
            })
        }).catch(jqXHR => toast(`ユーザーIDの取得でエラーが発生しました. 
            サポート外のプラットフォームの可能性があります.`, "error", toast_uuid))
    }

    /**
     * #StaticMethod
     * サーバーのアカウントIDからユーザー情報を取得する
     * 
     * @param arg パラメータオブジェクト
     */
    static get(arg) {
        let rest_promise = null
        switch (arg.platform) {
            case 'Mastodon': // Mastodon
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${arg.host}/api/v1/accounts/${arg.id}`,
                    dataType: "json"
                })
                break
            case 'Misskey': // Misskey
                rest_promise = $.ajax({
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
        return rest_promise.then(data => { return new User({
            json: data,
            host: arg.host,
            remote: true,
            auth: false,
            platform: arg.platform
        })})
    }

    // Getter: プロフィールヘッダのDOMを返却
    get header_element() {
        let target_emojis = null
        let html /* name属性にURLを設定 */ = `
            <li class="header_userinfo">
                <div class="label_head user_header">
                    <span>&nbsp;</span>
                </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        //target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.avatar_url}" class="usericon"/>
                <h4 class="username">${this.username}</h4>
                <a href="${this.url}" class="userid __lnk_external">${this.full_address}</a>
        `
        let bookmarks = ''
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                html += '<img src="resources/ic_mastodon.png" class="instance_icon"/>'
                bookmarks = `
                    <a class="__on_show_bookmark" title="ブックマーク"
                        ><img src="resources/ic_bkm.png" alt="ブックマーク"/></a>
                    <a class="__on_show_mastfav" title="お気に入り"
                        ><img src="resources/ic_cnt_fav.png" alt="お気に入り"/></a>
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
                break
            default:
                break
        }
        html += `
            </div>
            <div class="detail_info">
                <span class="count_post counter label_postcount" title="投稿数">${this.count_post}</span>
                <span class="count_follow counter label_follow" title="フォロー">${this.count_follow}</span>
                <span class="count_follower counter label_follower" title="フォロワー">${this.count_follower}</span>
            </div>
        `
        html += '</li>'

        // 生成したHTMLをjQueryオブジェクトとして返却
        const jqelm = $($.parseHTML(html))
        jqelm.find('.user_header') // ヘッダ画像を縮小表示して表示
            .css('background-image', `url("${this.header_url}")`)
            .css('background-size', '420px auto')
            .css('background-position', 'center center')
        if (this.auth) // 認証プロフィール表示の場合はブックマークアイコンを追加
            jqelm.find('.detail_info').addClass('auth_details').prepend(bookmarks)
        return jqelm
    }

    // Getter: プロフィール本体のDOMを返却
    get profile_element() {
        let target_emojis = null
        let html /* name属性にURLを設定 */ = '<li class="profile_userinfo">'
        html += `
            <div class="content">
                <div class="main_content">${this.profile}</div>
        `
        if (this.fields.length > 0) { // フィールドが存在する場合は表示
            html += '<table class="prof_field"><tbody>'
            this.fields.forEach(f => html += `<tr>
                <th>${f.label}</th>
                <td>${f.text}</td>
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
        let target_emojis = null
        let html /* name属性にURLを設定 */ = `
            <li class="short_userinfo" name="${this.full_address}">
                <div class="label_head user_header">
                    <span>&nbsp;</span>
                </div>
        `
        // カスタム絵文字が渡ってきていない場合はアプリキャッシュを使う
        //target_emojis = this.use_emoji_cache && this.host_emojis ? this.host_emojis : this.user.emojis
        html /* ユーザーアカウント情報 */ += `
            <div class="user">
                <img src="${this.avatar_url}" class="usericon"/>
                <h4 class="username">${this.username}</h4>
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
                <span class="count_follow counter label_follow" title="フォロー">${this.count_follow}</span>
                <span class="count_follower counter label_follower" title="フォロワー">${this.count_follower}</span>
            </div>
        `
        html += '</li>'

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
    getPost(account, max_id) {
        let rest_promise = null
        let query_param = null
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                query_param = {
                    "limit": 40,
                    "exclude_replies": true
                }
                if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                // あればアクセストークンを設定
                let header = {}
                if (account) header = { "Authorization": `Bearer ${account.pref.access_token}` }
                rest_promise = $.ajax({
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
                    "includeMyRenotes": false
                }
                if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                if (account) query_param.i = account.pref.access_token
                rest_promise = $.ajax({
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
        // Promiseを返却(実質非同期)
        return rest_promise.then(data => {
            return (async () => {
                const posts = []
                data.forEach(p => posts.push(new Status(p, { "__extended_timeline": "profile_post" }, account)))
                return posts
            })()
        }).catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.full_address}の投稿の取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    /**
     * #Method #Ajax #jQuery
     * このユーザーのピンどめされた投稿一覧を取得する
     * 
     * @param account リモートホストの情報を入れた最小限のアカウントオブジェクト
     */
    getPinnedPost(account) {
        let rest_promise = null
        switch (this.platform) {
            case 'Mastodon': // Mastodon
                let header = {}
                if (account) header = { "Authorization": `Bearer ${account.pref.access_token}` }
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${this.host}/api/v1/accounts/${this.id}/statuses`,
                    dataType: "json",
                    headers: header,
                    data: { "pinned": true }
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                        return posts
                    })()
                })
                break
            case 'Misskey': // Misskey
                // 既に入ってるピンどめ投稿を整形
                rest_promise = (async () => {
                    const posts = []
                    this.pinneds.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                    return posts
                })()
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.full_address}の投稿の取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    /**
     * #Method
     * このユーザーのお気に入り/ブックマーク/リアクション履歴一覧を取得する
     * 
     * @param account このユーザーのアカウントオブジェクト
     * @param type お気に入り/ブックマーク/リアクションか指定
     * @param max_id 前のページの最後の投稿のページングID
     */
    getBookmarks(account, type, max_id) {
        let rest_promise = null
        let query_param = null
        switch (type) {
            case 'Favorite_Mastodon': // お気に入り(Mastodon)
                query_param = { "limit": 40 }
                if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                rest_promise = ajax({ // response Headerが必要なのでfetchを使うメソッドを呼ぶ
                    method: "GET",
                    url: `https://${this.host}/api/v1/favourites`,
                    headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                    data: query_param
                }).then(data => { return {
                    body: data.body,
                    link: data.headers.get("link")
                }})
                break
            case 'Favorite_Misskey': // お気に入り(Misskey)
                query_param = {
                    "i": account.pref.access_token,
                    "limit": 40
                }
                if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.host}/api/i/favorites`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(query_param)
                }).then(data => { return { body: data }})
                break
            case 'Bookmark': // ブックマーク(Mastodon)
                query_param = { "limit": 40 }
                if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                rest_promise = ajax({ // response Headerが必要なのでfetchを使うメソッドを呼ぶ
                    method: "GET",
                    url: `https://${this.host}/api/v1/bookmarks`,
                    headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                    data: query_param
                }).then(data => { return {
                    body: data.body,
                    link: data.headers.get("link")
                }})
                break
            case 'Reaction': // リアクション(Misskey)
                query_param = {
                    "i": account.pref.access_token,
                    "userId": this.id,
                    "limit": 40
                }
                if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.host}/api/users/reactions`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(query_param)
                }).then(data => { return { body: data }})
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.then(data => {
            return (async () => {
                const posts = []
                data.body.forEach(p => posts.push(new Status(p.note ?? p, { "parent_column": null }, account)))
                let max_id = null
                // Headerのlinkからページング処理のmax_idを抽出
                if (data.link) max_id = data.link.match(/max_id=(?<id>[0-9]+)>/)?.groups.id
                else max_id = data.body.pop().id // 特殊ページング以外は普通に投稿IDをmax_idとする
                return {
                    datas: posts,
                    max_id: max_id
                }
            })()
        }).catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.full_address}のFFの取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    /**
     * #Method
     * このユーザーのフォロー/フォロワー一覧を取得する
     * 
     * @param account このユーザーのアカウントオブジェクト
     * @param type フォローかフォロワーか指定
     * @param max_id 前のページの最後のユーザーのページングID
     */
    getFFUsers(account, type, max_id) {
        let api_url = null
        let rest_promise = null
        let query_param = null
        switch (account.platform) {
            case 'Mastodon': // Mastodon
                if (type == 'follows') api_url = `https://${this.host}/api/v1/accounts/${this.id}/following`
                else if (type == 'followers') api_url = `https://${this.host}/api/v1/accounts/${this.id}/followers`
                query_param = { "limit": 80 }
                if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                rest_promise = ajax({ // response Headerが必要なのでfetchを使うメソッドを呼ぶ
                    method: "GET",
                    url: api_url,
                    headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                    data: query_param
                }).then(data => {
                    return (async () => {
                        const users = []
                        data.body.forEach(u => users.push(new User({
                            json: u,
                            host: this.host,
                            remote: false,
                            auth: false,
                            platform: account.platform
                        })))
                        return {
                            body: users,
                            link: data.headers.get("link")
                        }
                    })()
                })
                break
            case 'Misskey': // Misskey
                if (type == 'follows') api_url = `https://${this.host}/api/users/following`
                else if (type == 'followers') api_url = `https://${this.host}/api/users/followers`
                query_param = {
                    "i": account.pref.access_token,
                    "userId": this.id,
                    "limit": 80
                }
                if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                rest_promise = $.ajax({
                    type: "POST",
                    url: api_url,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(query_param)
                }).then(data => {
                    return (async () => {
                        const users = []
                        data.forEach(u => users.push(new User({
                            json: u.followee ?? u.follower,
                            host: this.host,
                            remote: false,
                            auth: false,
                            platform: account.platform
                        })))
                        return { body: users }
                    })()
                })
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.then(data => {
            let max_id = null
            // Headerのlinkからページング処理のmax_idを抽出
            if (data.link) max_id = data.link.match(/max_id=(?<id>[0-9]+)>/)?.groups.id
            else max_id = data.body[data.body.length - 1].id // 特殊ページング以外は普通に投稿IDをmax_idとする
            return {
                datas: data.body,
                max_id: max_id
            }
        }).catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.full_address}のFFの取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    /**
     * #Method
     * このユーザーの詳細情報を表示するDOMを対象セレクタに対して生成
     * 
     * @param bind_selector 生成した詳細情報をバインドする要素のjQueryオブジェクト
     */
    createDetailHtml(bind_selector) {
        const jqelm = $($.parseHTML(`
            <table><tbody>
                <tr><td id="${this.full_address}" class="timeline column_profile">
                    <div class="col_loading">
                        <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                        <span class="loading_text">Now Loading...</span>
                    </div>
                    <ul class="profile_header __context_user"></ul>
                    <ul class="profile_detail __context_user"></ul>
                    <div class="pinned_block post_div">
                        <h4>ピンどめ</h4>
                        <ul class="pinned_post __context_posts"></ul>
                    </div>
                    <div class="posts_block post_div">
                        <ul class="posts __context_posts"></ul>
                    </div>
                </td></tr>
            </tbody></table>
        `))
        jqelm.find(".profile_header").html(this.header_element)
        jqelm.find(".profile_detail").html(this.profile_element)
        // 若干横幅が長いのでヘッダサイズを大きくする
        jqelm.find('.profile_header .user_header').css('background-size', '480px auto')
        $(bind_selector).html(jqelm)

        // ユーザーの投稿を非同期で取得
        const column = $(`${bind_selector} td`)
        if (this.platform == 'Misskey') { // Misskeyの場合非同期絵文字置換を実行
            const host = this.host
            Emojis.replaceDomAsync(column.find(".profile_header .username"), host) // ユーザー名
            Emojis.replaceDomAsync(column.find(".profile_detail .main_content"), host) // プロフィール文
        }
        const account = { // accountには最低限の情報だけ入れる
            "platform": this.platform,
            "pref": { "domain": this.host }
        }; (async () => Promise.allSettled([
            this.getPost(account, null).then(posts => createScrollLoader({
                // 最新投稿データはスクロールローダーを生成
                data: posts,
                target: column.find(".posts"),
                bind: (data, target) => {
                    data.forEach(p => target.append(p.element))
                    // max_idとして取得データの最終IDを指定
                    return data.pop().id
                },
                load: async max_id => this.getPost(account, max_id)
            })), this.getPinnedPost(account).then(posts => {
                if (posts.length > 0) posts.forEach(p => column.find(".pinned_post").append(p.element))
                else { // ピンどめ投稿がない場合はピンどめDOM自体を削除して投稿の幅をのばす
                    column.find(".pinned_block").remove()
                    column.find(".posts").css('height', 'calc((100vh - 310px) * 0.8)')
                }
            })
        ]).then(() => {
            column.find(".col_loading").remove()
            // ピンどめ投稿と通常投稿の絵文字を取得
            if (this.platform == 'Misskey') { // Misskeyの場合非同期絵文字置換を実行
                const host = this.host
                Emojis.replaceDomAsync(column.find(".pinned_post .username"), host) // ユーザー名
                Emojis.replaceDomAsync(column.find(".pinned_post .label_cw"), host) // CWテキスト
                Emojis.replaceDomAsync(column.find(".pinned_post .main_content"), host) // 本文
                Emojis.replaceDomAsync(column.find(".posts .username"), host) // ユーザー名
                Emojis.replaceDomAsync(column.find(".posts .label_cw"), host) // CWテキスト
                Emojis.replaceDomAsync(column.find(".posts .main_content"), host) // 本文
            }
        }))()
    }

    /**
     * #Method
     * このユーザーの詳細情報を表示するウィンドウのDOMを生成して表示する
     */
    createDetailWindow() {
        $("#pop_ex_timeline").html('<div class="account_timeline single_user"></div>')
        this.createDetailHtml("#pop_ex_timeline>.account_timeline")
        $("#pop_ex_timeline").append('<button type="button" id="__on_search_close" class="close_button">×</button>')
            .show("slide", { direction: "right" }, 150)
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

    /**
     * #Method
     * このユーザーのお気に入り/ブックマーク/リアクション履歴を取得して表示する
     * 
     * @param type お気に入り/ブックマーク/リアクションのどれかを指定
     */
    createBookmarkList(type) {
        const target_td = $(`#pop_ex_timeline>.account_timeline td[id="${this.full_address}"]`)
        target_td.prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)
        target_td.find(".user_post_elm").hide()
        target_td.find(".user_ff_elm").hide()
        target_td.find(".user_bookmark_elm").html('<ul class="bookmarks __context_posts"></ul>').show()

        this.getBookmarks(Account.get(this.full_address), type, null).then(body => (async () => {
            // ロード待ち画面を消去
            target_td.find(".col_loading").remove()
            createScrollLoader({ // スクロールローダーを生成
                data: body,
                target: target_td.find(".user_bookmark_elm>.bookmarks"),
                bind: (data, target) => {
                    data.datas.forEach(post => target.append(post.element))
                    // Headerを経由して取得されたmax_idを返却
                    return data.max_id
                },
                load: async max_id => this.getBookmarks(Account.get(this.full_address), type, max_id)
            })
        })())
    }

    /**
     * #Method
     * このユーザーのフォロー/フォロワーの一覧を表示するリストを生成する
     * 
     * @param type フォローを取得するかフォロワーを取得するか指定
     */
    createFFTaglist(type) {
        const target_td = $(`#pop_ex_timeline>.account_timeline td[id="${this.full_address}"]`)
        target_td.prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)
        target_td.find(".user_post_elm").hide()
        target_td.find(".user_bookmark_elm").hide()
        target_td.find(".user_ff_elm").html(`
            <ul class="ff_short_profile">
                <li class="__initial_text">※ユーザーにしばらくマウスを乗せるとここに簡易プロフィールが表示されます。</li>
            </ul>
            <ul class="ff_nametags"></ul>
        `).show()

        this.getFFUsers(Account.get(this.full_address), type, null).then(body => (async () => {
            // ロード待ち画面を消去
            target_td.find(".col_loading").remove()
            createScrollLoader({ // スクロールローダーを生成
                data: body,
                target: target_td.find(".user_ff_elm>.ff_nametags"),
                bind: (data, target) => {
                    data.datas.forEach(u => target.append(u.inline_nametag))
                    // Headerを経由して取得されたmax_idを返却
                    return data.max_id
                },
                load: async max_id => this.getFFUsers(Account.get(this.full_address), type, max_id)
            })
        })())
    }
}


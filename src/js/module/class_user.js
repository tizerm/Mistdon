/**
 * #Class
 * (他人の)アカウント情報を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class User {
    // コンストラクタ: APIから来たユーザーデータを受け取って生成
    constructor(json, host, platform) {
        this.host = host
        this.platform = platform
        this.fields = []
        switch (platform) { // TODO: 暫定
            case 'Mastodon': // Mastodon
                this.id = json.id
                this.user_id = json.username
                this.full_address = `@${json.username}@${host}`
                this.username = json.display_name || json.username
                this.avatar_url = json.avatar
                this.header_url = json.header
                this.profile = json.note
                this.url = json.url
                this.count_post = json.statuses_count
                this.count_follow = json.following_count
                this.count_follower = json.followers_count

                // フィールドをセット
                if (json.fields) json.fields.forEach(f => this.fields.push({
                    label: f.name,
                    text: f.value
                }))
                break
            case 'Misskey': // Misskey
                this.id = json.id
                this.user_id = json.username
                this.full_address = `@${json.username}@${host}`
                this.username = json.name || json.username
                this.avatar_url = json.avatarUrl
                this.header_url = json.bannerUrl
                this.profile = json.description
                if (this.profile) this.profile = this.profile.replace(new RegExp('\n', 'g'), '<br/>') // 改行文字をタグに置換
                this.url = `https://${host}/@${json.username}` // URLは自前で生成
                this.count_post = json.notesCount
                this.count_follow = json.followingCount
                this.count_follower = json.followersCount

                // フィールドをセット
                if (json.fields) json.fields.forEach(f => this.fields.push({
                    label: f.name,
                    text: f.value.match(/^http/) // URLはリンクにする
                        ? `<a href="${f.value}" class="__lnk_external">${f.value}</a>` : f.value
                }))

                // ピンどめ投稿はまとめる
                this.pinneds = [] // この段階ではまだ整形しない
                if (json.pinnedNotes) json.pinnedNotes.forEach(note => this.pinneds.push(note))
                break
            default:
                break
        }
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
        return rest_promise.then(data => { return new User(data, arg.host, arg.platform) })
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
            </div>
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
            .css('background-size', '420px auto')
            .css('background-position', 'center center')
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
            <li class="short_userinfo">
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
            </div>
        `
        html += `
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
     */
    getPost(account) {
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
                    data: {
                        "limit": 40,
                        "exclude_replies": true
                    }
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                        return posts
                    })()
                })
                break
            case 'Misskey': // Misskey
                let query_param = {
                    "userId": this.id,
                    "includeReplies": false,
                    "limit": 40,
                    "includeMyRenotes": false
                }
                if (account) query_param.i = account.pref.access_token
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${this.host}/api/users/notes`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(query_param)
                }).then(data => {
                    return (async () => {
                        const posts = []
                        data.forEach(p => posts.push(new Status(p, { "parent_column": null }, account)))
                        return posts
                    })()
                })
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

    getFFUsers(account, type) {
        let api_url = null
        let rest_promise = null
        switch (account.platform) {
            case 'Mastodon': // Mastodon
                if (type == 'follows') api_url = `https://${this.host}/api/v1/accounts/${this.id}/following`
                else if (type == 'followers') api_url = `https://${this.host}/api/v1/accounts/${this.id}/followers`
                rest_promise = $.ajax({
                    type: "GET",
                    url: api_url,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                    data: { "limit": 80 }
                }).then(data => {
                    return (async () => {
                        const users = []
                        data.forEach(u => users.push(new User(data, this.host, account.platform)))
                        return users
                    })()
                })
                break
            case 'Misskey': // Misskey
                if (type == 'follows') api_url = `https://${this.host}/api/users/following`
                else if (type == 'followers') api_url = `https://${this.host}/api/users/followers`
                rest_promise = $.ajax({
                    type: "POST",
                    url: api_url,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        "i": account.pref.access_token,
                        "userId": this.id,
                        "limit": 80
                    })
                }).then(data => {
                    return (async () => {
                        const users = []
                        data.forEach(u => users.push(new User(data, this.host, account.platform)))
                        return users
                    })()
                })
                break
            default:
                break
        }
        // Promiseを返却(実質非同期)
        return rest_promise.catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${this.full_address}のFFの取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    /**
     * #Method
     * このユーザーの詳細情報を表示するウィンドウのDOMを生成して表示する
     */
    createDetailWindow() {
        const jqelm = $($.parseHTML(`
            <div class="account_timeline single_user">
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
                            <h4>投稿一覧</h4>
                            <ul class="posts __context_posts"></ul>
                        </div>
                    </td></tr>
                </tbody></table>
            </div>
        `))
        jqelm.find(".profile_header").html(this.header_element)
        jqelm.find(".profile_detail").html(this.profile_element)
        // 若干横幅が長いのでヘッダサイズを大きくする
        jqelm.find('.profile_header .user_header').css('background-size', '480px auto')
        $("#pop_ex_timeline").html(jqelm)
            .append('<button type="button" id="__on_search_close">×</button>')
            .show("slide", { direction: "right" }, 150)

        // ユーザーの投稿を非同期で取得
        const column = $(`#pop_ex_timeline>.account_timeline td`)
        if (this.platform == 'Misskey') { // Misskeyの場合非同期絵文字置換を実行
            const host = this.host
            Emojis.replaceDomAsync(column.find(".profile_header .username"), host) // ユーザー名
            Emojis.replaceDomAsync(column.find(".profile_detail .main_content"), host) // プロフィール文
        }
        const account = { // accountには最低限の情報だけ入れる
            "platform": this.platform,
            "pref": { "domain": this.host }
        }; (async () => Promise.allSettled([
            this.getPost(account).then(posts => posts.forEach(p => column.find(".posts").append(p.element))),
            this.getPinnedPost(account).then(posts => {
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

    createFFTaglist(type) {
        const target = $(`#pop_ex_timeline>.account_timeline td[id="${this.full_address}"]`)
        target.find(".user_post_elm").hide()
        target.find(".user_ff_elm").html(`
            <ul class="ff_short_profile">
                <li class="__initial_text">※ユーザーにしばらくマウスを乗せるとここに簡易プロフィールが表示されます。</li>
            </ul>
            <ul class="ff_nametags"></ul>
        `).show()

        this.getFFUsers(Account.get(this.full_address), type).then(data => (async () => data.forEach(
            u => target.find(".user_ff_elm>.ff_nametags").append(u.inline_nametag)))())
    }
}


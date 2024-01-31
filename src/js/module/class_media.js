/**
 * #Class
 * メディアファイルを管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Media {
    // コンストラクタ: APIから来たユーザーデータを受け取って生成
    constructor(account, json) {
        this.account = account

        switch (account.platform) {
            case 'Mastodon': // Mastodon
                this.id = json.id
                this.type = json.type
                this.url = json.url
                this.thumbnail = json.preview_url
                this.sensitive = false
                this.width = json.meta.original.width
                this.height = json.meta.original.height
                break
            case 'Misskey': // Misskey
                this.id = json.id
                this.type = json.type
                this.url = json.url
                this.thumbnail = json.thumbnailUrl
                this.sensitive = json.isSensitive
                this.width = json.properties.width
                this.height = json.properties.height
                break
            default:
                break
        }
    }

    // 添付メディア
    static ATTACH_MEDIA = new Map()

    static async attachMedia(files) {
        const preview_elm = $('#header>#post_options .attached_media>ul.media_list')
        // 初期メッセージを削除
        preview_elm.find(".__initial_message").remove()
        files.forEach(file => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            // ファイルのURLを生成して画像として埋め込む
            reader.addEventListener("load", () => preview_elm.append(`
                <li><img src="${reader.result}" class="__img_attach" name="${file.name}"/></li>
            `))
            // 添付メディアマップに追加
            Media.ATTACH_MEDIA.set(file.name, file)
        })
    }

    static async attachDriveMedia() {
        const medias = []
        $("#pop_util_window ul.drive_media_list input.__chk_drive_media:checked")
            .each((index, elm) => medias.push({
                id: $(elm).val(),
                url: $(elm).next().find("img").attr("src"),
                sensitive: false // TODO: 一旦falseで
            }))

        const preview_elm = $('#header>#post_options .attached_media>ul.media_list')
        // 初期メッセージを削除
        preview_elm.find(".__initial_message").remove()
        medias.forEach(media => preview_elm.append(`
            <li><img src="${media.url}" class="__img_attach media_from_drive" name="${media.id}"/></li>
        `))
        $("#pop_util_window").hide("fade", 120)
        $("#header>#post_options").show("slide", { direction: "up" }, 120)
    }

    static clearAttachMedia() {
        $('#header>#post_options .attached_media>ul.media_list').html(`
            <li class="__initial_message">ドラッグ&amp;ドロップでメディアを追加します。</li>
        `)
        Media.ATTACH_MEDIA.clear()
    }

    /**
     * #StaticMethod
     * リモートホストも含めたユーザーアドレスからリモートのユーザー情報を取得する
     * 
     * @param address ユーザーアカウントのフルアドレス
     */
    static async getRecentMedia(address, max_id) {
        const toast_uuid = crypto.randomUUID()
        toast("対象ユーザーの投稿メディアを取得中です...", "progress", toast_uuid)

        // アカウントをユーザー情報として取得
        const account = Account.get(address)
        const user = await account.getInfo()

        let rest_promise = null
        let query_param = null
        switch (user.platform) {
            case 'Mastodon': // Mastodon
                query_param = {
                    "limit": 40,
                    "only_media": true,
                    "exclude_replies": false,
                    "exclude_reblogs": true
                }
                if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                rest_promise = $.ajax({
                    type: "GET",
                    url: `https://${user.host}/api/v1/accounts/${user.id}/statuses`,
                    dataType: "json",
                    headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                    data: query_param
                }).then(data => {
                    const medias = []
                    data.forEach(p => p.media_attachments.forEach(m => medias.push(new Media(account, m))))
                    toast(null, "hide", toast_uuid)
                    return medias
                })
                break
            case 'Misskey': // Misskey
                query_param = {
                    "i": account.pref.access_token,
                    "limit": 40
                }
                if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                rest_promise = $.ajax({
                    type: "POST",
                    url: `https://${user.host}/api/drive/files`,
                    dataType: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(query_param)
                }).then(data => {
                    return (async () => {
                        const medias = []
                        data.forEach(m => medias.push(new Media(account, m)))
                        toast(null, "hide", toast_uuid)
                        return medias
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
            toast(`${address}の投稿の取得に失敗しました.`, "error")
            return Promise.reject(jqXHR)
        })
    }

    static async uploadMedia(account, filename) {
        // 先にtoastを表示
        const toast_uuid = crypto.randomUUID()
        toast(`${filename}をアップロードしています...`, "progress", toast_uuid)

        let upload_promise = null
        let query_param = null
        const target_file = Media.ATTACH_MEDIA.get(filename)
        switch (account.platform) {
            case 'Mastodon': // Mastodon
                query_param = { file: target_file }
                upload_promise = sendFileRequest({ // ファイルのアップロードが必要なのでmultipart/form-dataで送信a
                    url: `https://${account.pref.domain}/api/v2/media`,
                    headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                    data: query_param
                }).then(data => { return data.body.id })
                break
            case 'Misskey': // Misskey
                query_param = {
                    i: account.pref.access_token,
                    name: filename,
                    isSensitive: false, // TODO: 一旦無効固定
                    file: target_file
                }
                upload_promise = sendFileRequest({ // ファイルのアップロードが必要なのでmultipart/form-dataで送信a
                    url: `https://${account.pref.domain}/api/drive/files/create`,
                    //headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                    data: query_param
                }).then(data => { return data.body.id })
                break
            default:
                break
        }
        return upload_promise.then(id => {
            toast(null, "hide", toast_uuid)
            return id
        }).catch(jqXHR => {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(jqXHR)
            toast(`${filename}のアップロードに失敗しました. 投稿を中断します.`, "error", toast_uuid)
            return Promise.reject(jqXHR)
        })
    }

    get li_element() {
        // メディアごとにタイルブロックを生成
        let html = `<li>
            <input type="checkbox" id="__chk_${this.id}"
                name="__chk_drive_media" class="__chk_drive_media" value="${this.id}"/>
            <label for="__chk_${this.id}"${this.sensitive ? ' class="warn_sensitive"' : ''}
                ><img src="${this.thumbnail}"/><div class="check_mask"></div></label>
        </li>`

        // 生成したHTMLをjQueryオブジェクトとして返却
        return $($.parseHTML(html))
    }

    static openDriveWindow(address) {
        // 一旦中身を消去
        $("#pop_util_window>.content").html(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
            <ul class="drive_media_list"></ul>
        `)
        $("#pop_util_window>h2>span").text("過去のメディア一覧")
        $("#pop_util_window>.footer").html(`
            <button type="button" id="__on_drive_media_confirm" class="close_button">これで決定</button>
        `)

        // 参照したアドレスから過去のメディア(ドライブ)を取得
        Media.getRecentMedia(address, null).then(body => {
            // ロード画面を削除
            $("#pop_util_window>.content>.col_loading").remove()
            createScrollLoader({ // スクロールローダーを生成
                data: body,
                target: $("#pop_util_window>.content>ul.drive_media_list"),
                bind: (data, target) => {
                    data.forEach(m => target.append(m.li_element))
                    // max_idとして取得データの最終IDを指定
                    return data.pop().id
                },
                load: async max_id => Media.getRecentMedia(address, max_id)
            })
        })
        $("#pop_util_window").show()
    }
}


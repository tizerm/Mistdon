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

    /**
     * #StaticMethod
     * ローカルから読み込んだファイルをメディアマップに追加してサムネイル表示する.
     * 
     * @param files 読み込み対象のファイル
     */
    static async attachMedia(files) {
        const preview_elm = $('#header>#post_options .attached_media>ul.media_list')
        // 初期メッセージを削除
        preview_elm.find(".__initial_message").remove()
        files.forEach(file => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            // ファイルの識別はUUIDで
            const uuid = crypto.randomUUID()
            // ファイルのURLを生成して画像として埋め込む
            reader.addEventListener("load", () => preview_elm.append(`
                <li>
                    <input type="checkbox" id="__chk_attach_${uuid}"
                        name="__chk_attach_sensitive" class="__chk_attach_sensitive"/>
                    <label for="__chk_attach_${uuid}"><img src="${reader.result}" class="__img_attach" name="${uuid}"/
                        ><div class="check_mask"></div></label>\
                </li>
            `))
            // 添付メディアマップに追加
            Media.ATTACH_MEDIA.set(uuid, file)
        })
    }

    /**
     * #StaticMethod
     * Misskeyのドライブから参照したメディアファイルを追加してサムネイル表示する.
     */
    static async attachDriveMedia() {
        const medias = []
        $("#pop_dirve_window ul.drive_media_list input.__chk_drive_media:checked")
            .each((index, elm) => medias.push({
                id: $(elm).val(),
                url: $(elm).next().find("img").attr("src"),
                sensitive: $(elm).next().is(".warn_sensitive")
            }))

        const preview_elm = $('#header>#post_options .attached_media>ul.media_list')
        // 初期メッセージを削除
        preview_elm.find(".__initial_message").remove()
        medias.forEach(media => preview_elm.append(`
            <li${media.sensitive ? ' class="warn_sensitive"' : ''}>
                <img src="${media.url}" class="__img_attach media_from_drive" name="${media.id}"/>
            </li>
        `))
        $("#pop_dirve_window").hide("fade", 120)
        $("#header>#post_options").show("slide", { direction: "up" }, 120)
    }

    /**
     * #StaticMethod
     * 添付メディアリストをクリアする.
     */
    static clearAttachMedia() {
        $('#header>#post_options .attached_media>ul.media_list').html(`
            <li class="__initial_message">ドラッグ&amp;ドロップでメディアを追加します。</li>
        `)
        // アドレス参照を変えるためclearでなく新規で作る
        Media.ATTACH_MEDIA = new Map()
    }

    /**
     * #StaticMethod
     * 最近投稿したメディア一覧を取得する.
     * 
     * @param address 取得対象のユーザーアカウントのフルアドレス
     * @param folder_id MisskeyドライブのフォルダID
     * @param max_id ページ送り用のメディアID
     */
    static async getRecentMedia(address, folder_id, max_id) {
        let response = null
        let query_param = null

        try {
            // アカウントをユーザー情報として取得
            const account = Account.get(address)
            const user = await account.getInfo()
            const medias = []
            switch (user.platform) {
                case 'Mastodon': // Mastodon
                    query_param = {
                        "limit": 40,
                        "only_media": true,
                        "exclude_replies": false,
                        "exclude_reblogs": true
                    }
                    if (max_id) query_param.max_id = max_id // ページ送りの場合はID指定
                    response = await $.ajax({
                        type: "GET",
                        url: `https://${user.host}/api/v1/accounts/${user.id}/statuses`,
                        dataType: "json",
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                        data: query_param
                    })
                    response.forEach(p => p.media_attachments.forEach(m => medias.push(new Media(account, m))))
                    break
                case 'Misskey': // Misskey
                    query_param = {
                        "i": account.pref.access_token,
                        "limit": 40
                    }
                    if (folder_id) query_param.folderId = folder_id // フォルダIDを指定
                    if (max_id) query_param.untilId = max_id // ページ送りの場合はID指定
                    response = await $.ajax({
                        type: "POST",
                        url: `https://${user.host}/api/drive/files`,
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(query_param)
                    })
                    response.forEach(m => medias.push(new Media(account, m)))
                    break
                default:
                    break
            }
            return medias
        } catch (err) {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.error(`${address}のメディアの取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    /**
     * #StaticMethod
     * アカウントのドライブフォルダを取得する.
     * 
     * @param address 取得対象のユーザーアカウントのフルアドレス
     * @param max_id ページ送り用のメディアID
     */
    static async getFolders(address) {
        let response = null

        try {
            // アカウントをユーザー情報として取得
            const account = Account.get(address)
            const folders = []

            response = await $.ajax({
                type: "POST",
                url: `https://${account.pref.domain}/api/drive/folders`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    "i": account.pref.access_token,
                    "limit": 100
                })
            })

            return response
        } catch (err) {
            // 取得失敗時、取得失敗のtoastを表示してrejectしたまま次に処理を渡す
            console.log(err)
            Notification.error(`${address}のフォルダの取得に失敗しました.`)
            return Promise.reject(err)
        }
    }

    /**
     * #StaticMethod
     * メディアをインスタンスにアップロードする.
     * 
     * @param account アップロード対象のアカウント
     * @param file アップロード対象のファイルオブジェクト
     * @param sensitive センシティブ判定
     */
    static async uploadMedia(account, file, sensitive) {
        const filename = file.name
        const notification = Notification.progress(`${filename}をアップロードしています...`)
        let response = null
        let query_param = null
        try {
            switch (account.platform) {
                case 'Mastodon': // Mastodon
                    query_param = { file: file }
                    response = await sendFileRequest({ // ファイルのアップロードが必要なのでmultipart/form-dataで送信a
                        url: `https://${account.pref.domain}/api/v2/media`,
                        headers: { "Authorization": `Bearer ${account.pref.access_token}` },
                        data: query_param
                    })

                    // 非同期アップロードの場合は処理待ちする
                    if (response.progress) {
                        const media_id = response.body.id
                        do {
                            console.log('upload progress...')
                            await sleep(5000) // 5秒待機
                            response = await ajax({ // ステータスコードを取得できるメソッドを使用
                                method: "GET",
                                url: `https://${account.pref.domain}/api/v1/media/${media_id}`,
                                headers: { "Authorization": `Bearer ${account.pref.access_token}` }
                            })
                        } while (response.status == '206') // HTTP 206が返ってくる間ループ
                    }
                    break
                case 'Misskey': // Misskey
                    query_param = {
                        i: account.pref.access_token,
                        name: filename,
                        isSensitive: sensitive,
                        file: file
                    }
                    response = await sendFileRequest({ // ファイルのアップロードが必要なのでmultipart/form-dataで送信a
                        url: `https://${account.pref.domain}/api/drive/files/create`,
                        data: query_param
                    })
                    break
                default:
                    break
            }
            response = response.body.id
            notification.done()
            return response
        } catch (err) {
            console.log(err)
            notification.error(`${filename}のアップロードに失敗しました. 投稿を中断します.`)
            return Promise.reject(err)
        }
    }

    // Getter: 最近のメディア一覧を取得した際のメディア選択項目
    get li_element() {
        // メディアごとにタイルブロックを生成
        let html = `<li>
            <input type="checkbox" id="__chk_drive_${this.id}"
                name="__chk_drive_media" class="__chk_drive_media" value="${this.id}"/>
            <label for="__chk_drive_${this.id}"${this.sensitive ? ' class="warn_sensitive"' : ''}
                ><img src="${this.thumbnail}"/><div class="check_mask"></div></label>
        </li>`

        // 生成したHTMLをjQueryオブジェクトとして返却
        return $($.parseHTML(html))
    }

    /**
     * #StaticMethod
     * 対象のMisskeyアカウントのドライブを開いて表示する.
     * 
     * @param address ドライブを開くアカウント
     */
    static openDriveWindow(address) {
        // 一旦中身を消去
        $("#pop_dirve_window>ul.drive_folder_list").empty()
        $("#pop_dirve_window>ul.drive_media_list").empty()
        $("#pop_dirve_window").prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        // フォルダを取得して表示
        Media.getFolders(address).then(body => {
            let html = '<li class="__on_select_folder" name="__root">..</li>'
            body.forEach(folder => html += `
                <li class="__on_select_folder" name="${folder.id}">
                    ${folder.name}
                </li>
            `)
            $("#pop_dirve_window>.drive_folder_list").html(html)
        })

        // 参照したアドレスから過去のメディア(ドライブ)を取得
        Media.getRecentMedia(address, null, null).then(body => {
            // ロード画面を削除
            $("#pop_dirve_window>.col_loading").remove()
            createScrollLoader({ // スクロールローダーを生成
                data: body,
                target: $("#pop_dirve_window>ul.drive_media_list"),
                bind: (data, target) => {
                    data.forEach(m => target.append(m.li_element))
                    // max_idとして取得データの最終IDを指定
                    return data.pop().id
                },
                load: async max_id => Media.getRecentMedia(address, null, max_id)
            })
        })
        $("#pop_dirve_window").show("fade", 120)
    }

    /**
     * #StaticMethod
     * 対象のMisskeyアカウントのドライブからフォルダを開いて表示する.
     * 
     * @param address ドライブを開くアカウント
     * @param folder_id MisskeyドライブのフォルダID
     */
    static openFolder(address, folder_id) {
        // 一旦中身を消去
        $("#pop_dirve_window>ul.drive_media_list").empty()
        $("#pop_dirve_window").prepend(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        // フォルダIDを参照してフォルダの中身を検索
        const id = folder_id != '__root' ? folder_id : null
        Media.getRecentMedia(address, id, null).then(body => {
            // ロード画面を削除
            $("#pop_dirve_window>.col_loading").remove()
            createScrollLoader({ // スクロールローダーを生成
                data: body,
                target: $("#pop_dirve_window>ul.drive_media_list"),
                bind: (data, target) => {
                    data.forEach(m => target.append(m.li_element))
                    // max_idとして取得データの最終IDを指定
                    return data.pop().id
                },
                load: async max_id => Media.getRecentMedia(address, id, max_id)
            })
        })
    }
}


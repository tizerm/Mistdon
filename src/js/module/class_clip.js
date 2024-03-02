/**
 * #Class
 * クリップモジュール
 *
 * @author tizerm@mofu.kemo.no
 */
class Clip {
    // コンストラクタ: クリップエンティティからクリップオブジェクトを生成
    constructor(json, account) {
        this.id = json.id
        this.author = {
            username: json.user.name,
            id: json.user.username,
            avatar_url: json.user.avatarUrl
        }
        this.title = json.name
        this.description = json.description

        this.host_account = account
    }

    // スタティックマップを初期化(非同期)
    static {
        Clip.CLIP_PREF_TIMELINE = {
            "parent_group": new Group({
                "group_id": "__clip_timeline",
                "tl_layout": "default"
            }, null)
        }
    }

    /**
     * #Method
     * 検索欄を表示する画面を表示
     */
    static createClipWindow() {
        // 検索カラムのDOM生成
        $("#pop_ex_timeline").html(`
            <h2>クリップ (Misskey)</h2>
            <div class="clip_timeline">
                <div class="clip_options timeline">
                    <ul class="clip_list"></ul>
                    <div class="clip_description">
                        クリップの説明がここに表示されます。
                    </div>
                </div>
                <div id="__clip_timeline" class="timeline">
                    <div class="col_loading">
                        <img src="resources/illust/il_done.png" alt="done"/><br/>
                        <span class="loading_text">クリップの投稿がここに表示されます。</span>
                    </div>
                    <ul class="clip_ul __context_posts"></ul>
                </div>
            </div>
            <button type="button" id="__on_search_close" class="close_button">×</button>
        `).show("slide", { direction: "up" }, 150)

        // 非同期でクリップ一覧を表示
        ; (async () => Account.eachPlatform('Misskey', account => account.getClips()
                .then(clips => clips.forEach(clip => $("#pop_ex_timeline ul.clip_list").append(clip.element)))))()
    }

    /**
     * #StaticMethod
     * 検索カラムに入力された情報をもとに検索処理を実行(ロード画面生成もいっしょに)
     */
    static async loadClip(account_address, id) {
        const account = Account.get(account_address)
        // 一旦中身を全消去する
        $('#pop_ex_timeline').find(".col_loading").remove()
        $('#pop_ex_timeline ul.clip_ul').empty().before(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)

        try {
            // クリップノートを取得
            let response = await $.ajax({
                type: "POST",
                url: `https://${account.pref.domain}/api/clips/notes`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    "i": account.pref.access_token,
                    "limit": 80,
                    "clipId": id
                })
            })

            // クリップノートをバインド
            $('#pop_ex_timeline').find(".col_loading").remove()
            response.forEach(p => {
                const note = new Status(p, Clip.CLIP_PREF_TIMELINE, account)
                $('#pop_ex_timeline ul.clip_ul').append(note.element)
            })

            // クリップ情報をバインド
            response = await $.ajax({
                type: "POST",
                url: `https://${account.pref.domain}/api/clips/show`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    "i": account.pref.access_token,
                    "clipId": id
                })
            })
            $('#pop_ex_timeline .clip_options>.clip_description').html(response.description)
        } catch (err) {
            console.log(err)
            return Promise.reject(err)
        }
    }

    get element() {
        return $($.parseHTML(`
            <li class="clip_list" id="${this.id}" name="${this.host_account.full_address}">
                <div class="user">
                    <img src="${this.author.avatar_url}" class="usericon"/>
                    <h4 class="username">${this.title}</h4>
                    <a class="userid">@${this.author.id}</a>
                </div>
                <div class="content"><div class="main_content">${this.description}</div></div>
            </li>
        `))
    }
}

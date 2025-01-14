﻿/**
 * #Class
 * 一時タイムラインを生成するクラス(タイムラインクラスを継承)
 *
 * @author @tizerm@misskey.dev
 */
class TemporaryTimeline extends Timeline {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref, tlp) {
        // グループオブジェクトを生成してからスーパーコンストラクタを呼び出す
        const group = new Group({ // グループオブジェクト用の設定JSON
            'group_id': `gp_${crypto.randomUUID()}`,
            'multi_user': false,
            'multi_timeline': false,
            'tl_layout': pref.tl_layout,
            'multi_layout_option': pref.multi_layout_option,
        })
        super(tlp, group)
        // グループオブジェクトの参照設定を変更
        group.search_flg = false
        group.timelines = [this]
        this.temptl_pref = pref
    }

    // スタティックマップを初期化(非同期)
    static {
        (async () => {
            const temptl_jsons = await window.accessApi.readTemptl()
            const temptl_map = new Map()
            for (const elm of temptl_jsons) { // お気に入りの一時タイムラインオブジェクトを作成
                const obj = await TemporaryTimeline.create(elm)
                temptl_map.set(elm.ttl_id, obj)
            }
            TemporaryTimeline.map = temptl_map
        })()
    }

    // Getter: グループオブジェクトへの参照
    get group() { return this.ref_group }

    /**
     * #StaticMethod
     * お気に入りに登録した一時タイムラインを取得.
     * 
     * @param id お気に入りしたときの一意ID
     */
    static get(id) {
        return TemporaryTimeline.map.get(id)
    }

    /**
     * #StaticMethod
     * お気に入りに登録した一時タイムラインをインデクスから取得.
     * 
     * @param index インデクス
     */
    static getIndex(index) {
        return [...TemporaryTimeline.map.values()][index]
    }

    /**
     * #StaticMethod
     * 画面で入力した一時タイムライン設定を設定JSONとして生成.
     */
    static getPrefForm() {
        const opt_elm = $("#pop_temporary_option")
        const account_address = opt_elm.find(".__cmb_tl_account").val()

        let multi_layout = null
        // タイムラインレイアウトがマルチの場合はマルチレイアウト設定を保存
        if (opt_elm.find(".__cmb_tl_layout").val() == 'multi') multi_layout = {
            'default': opt_elm.find('.__cmb_tll_default').val(),
            'reblog': opt_elm.find('.__cmb_tll_btrn').val(),
            'media': opt_elm.find('.__cmb_tll_media').val(),
            'notification': opt_elm.find('.__cmb_tll_notif').val()
        }

        return { // 一時タイムラインの設定JSONを生成
            'ttl_id': `ttl_${crypto.randomUUID()}`,
            'key_address': account_address != '__external' ? account_address : null,
            'timeline_type': opt_elm.find(".__cmb_tl_type").val(),
            'ex_host': opt_elm.find(".__txt_external_instance").val(),
            'ex_platform': opt_elm.find(".__hdn_external_platform").val(),
            'list_id': opt_elm.find(".__cmb_tl_list").val(),
            'channel_id': opt_elm.find(".__cmb_tl_channel").val(),
            'channel_name': opt_elm.find(".__cmb_tl_channel>option:checked").text(),
            'antenna_id': opt_elm.find(".__cmb_tl_antenna").val(),
            'clip_id': opt_elm.find(".__cmb_tl_clip").val(),
            'exclude_reblog': opt_elm.find(".__chk_exclude_reblog").prop("checked"),
            'expand_cw': opt_elm.find(".__chk_expand_cw").prop("checked"),
            'expand_media': opt_elm.find(".__chk_expand_media").prop("checked"),
            'tl_layout': opt_elm.find(".__cmb_tl_layout").val(),
            'multi_layout_option': multi_layout
        }
    }

    /**
     * #StaticMethod
     * 設定JSONから一時タイムラインのオブジェクトを生成..
     * 
     * @param pref 一時タイムラインの設定JSON
     */
    static async create(pref) {
        // オブジェクト生成に必要なパラメータを設定JSONから取得
        const account = Account.get(pref.key_address)
        const host = account?.pref.domain ?? pref.ex_host
        const platform = account?.pref.platform ?? pref.ex_platform
        const tl_param = await window.accessApi.getAPIParams({
            host: host,
            platform: platform,
            timeline: pref
        })

        // タイムラインとグループの設定を生成して一時タイムラインオブジェクトを生成
        return new TemporaryTimeline(pref, { // タイムラインオブジェクト用の設定JSON
            'key_address': account?.full_address ?? null,
            'external': !account,
            'host': host,
            'platform': platform,
            'timeline_type': pref.timeline_type,
            'list_id': pref.timeline_type == 'list' ? pref.list_id : null,
            'channel_id': pref.timeline_type == 'channel' ? pref.channel_id : null,
            'channel_name': pref.timeline_type == 'channel' ? pref.channel_name : null,
            'antenna_id': pref.timeline_type == 'antenna' ? pref.antenna_id : null,
            'clip_id': pref.timeline_type == 'clip' ? pref.clip_id : null,
            'rest_url': tl_param.url,
            'socket_url': tl_param.socket_url,
            'query_param': tl_param.query_param,
            'socket_param': tl_param.socket_param,
            'exclude_reblog': pref.exclude_reblog,
            'expand_cw': pref.expand_cw,
            'expand_media': pref.expand_media
        })
    }

    /**
     * #StaticMethod
     * お気に入りの一時タイムライン一覧を生成.
     */
    static createFavoriteMenu() {
        const target = $("#pop_temporary_option>.temp_favorite")
        if (TemporaryTimeline.map.size == 0) { // お気に入りがなかったら空にする
            target.html('<li class="fav_empty">(お気に入りなし)</li>')
            return
        }

        target.empty()
        TemporaryTimeline.map.forEach((v, k) => target.append(v.element))
    }

    /**
     * #Method
     * この一時タイムラインを起動してウィンドウを表示する.
     */
    createTemporaryTimeline() {
        super.createScrollableWindow(null, (tl, empty, window_key) => {
            // 一時タイムライン独自のウィンドウボタンを追加
            $(`#${window_key}>.window_buttons`).prepend(`
                <button type="button" class="window_temp_reload_button" title="リロード"><img
                    src="resources/ic_reload.png" alt="リロード"/></button>
                <button type="button" class="window_temp_favorite_button" title="お気に入り"><img
                    src="resources/ic_favorite.png" alt="お気に入り"/></button>
            `)
            // ローダー生成
            tl.loadTemporaryTimeline(window_key)
        })
    }

    /**
     * #Method
     * 対象のウィンドウに対してタイムラインを読み込んで表示する.
     * 
     * @param window_key 表示する対象のウィンドウキー
     */
    loadTemporaryTimeline(window_key) {
        this.group.status_map.clear()
        this.group.notification_map.clear()
        this.status_key_map = new Map()
        super.getTimeline().then(body => createScrollLoader({ // 下方向のローダーを生成
            data: body,
            target: $(`#${window_key}>.timeline>ul`),
            bind: (data, target) => { // ステータスマップに挿入して投稿をバインド
                data.forEach(p => this.group.addStatus({
                    post: p,
                    target_elm: target,
                    callback: (st, tgelm) => {
                        tgelm.append(st.timeline_element)
                        st.bindAdditionalInfoAsync(tgelm)
                    }
                }))
                // max_idとして取得データの最終IDを指定
                if (this.is_notification) return data.pop()?.notification_id
                else return data.pop()?.id
            },
            load: async max_id => super.getTimeline(max_id)
        })).then(() => { // ロードが終わったらロード画面を削除してトップローダーを生成
            $(`#${window_key}>.timeline>.col_loading`).remove()
            $(`#${window_key}>.timeline>ul`).prepend(`<li class="__on_temp_top_loader">続きをロード</li>`)
        })
    }

    /**
     * #Method
     * 先頭から先のタイムラインを読み込む.
     */
    async loadTop() {
        // ボタンをロード画面に変更
        $(`#${this.timeline_key}>.__on_temp_top_loader`).empty().addClass('loader_loading')

        // 先頭の投稿から先のタイムラインを取得
        const top_elm = $(`#${this.timeline_key}>.__on_temp_top_loader+li`)
        const data = await super.getTimeline(null, this.group.getStatus(top_elm).id)

        // ローダーを消して投稿をバインド
        const ul_elm = $(`#${this.timeline_key}`)
        $(`#${this.timeline_key}>.__on_temp_top_loader`).remove()
        data.forEach(p => this.group.addStatus({
            post: p,
            target_elm: ul_elm,
            callback: (st, tgelm) => {
                tgelm.prepend(st.timeline_element)
                st.bindAdditionalInfoAsync(tgelm)
            }
        }))

        ul_elm.prepend(`<li class="__on_temp_top_loader">続きをロード</li>`)
        // スクロール位置を調整
        top_elm.get(0).scrollIntoView({ block: 'center' })
    }

    /**
     * #Method
     * タイムラインを再読み込みする.
     */
    reload() {
        // ロードウィンドウを生成
        $(`#${this.timeline_key}`).empty().before(`
            <div class="col_loading">
                <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                <span class="loading_text">Now Loading...</span>
            </div>
        `)
        // キャッシュをリセットしてウィンドウ内のタイムラインをリロード
        this.loadTemporaryTimeline(this.window_key)
    }

    /**
     * #Method
     * この一時タイムラインをお気に入りに登録する.
     */
    async favorite() {
        TemporaryTimeline.map.set(this.temptl_pref.ttl_id, this)
        await TemporaryTimeline.writeFile()
        Notification.info(`対象の一時タイムラインをお気に入りに登録しました.`)
    }

    /**
     * #Method
     * この一時タイムラインをお気に入りにから削除する.
     */
    async delete() {
        TemporaryTimeline.map.delete(this.temptl_pref.ttl_id)
        await TemporaryTimeline.writeFile()
        TemporaryTimeline.createFavoriteMenu()
        Notification.info(`対象の一時タイムラインをお気に入りから削除しました.`)
    }

    /**
     * #StaticMethod
     * キャッシュされている一時タイムラインお気に入りマップをJSONファイルに書き出す.
     */
    static async writeFile() {
        const temptls = []
        TemporaryTimeline.map.forEach((v, k) => temptls.push(v.temptl_pref))
        await window.accessApi.overwriteTemptl(temptls)
    }

    // Getter: 一時タイムラインお気に入りを一覧に表示する際の項目DOM
    get element() {
        const label = this.temptl_pref.timeline_type != 'channel' ? this.temptl_pref.timeline_type : this.temptl_pref.channel_name
        const jqelm = $($.parseHTML(`<li class="temptl_list" name="${this.temptl_pref.ttl_id}">
            ${this.temptl_pref.key_address ?? this.temptl_pref.ex_host} - ${label}
            <button type="button" class="delele_tempfav_button" title="削除"><img
                src="resources/ic_not.png" alt="削除"/></button>

        </li>`))
        jqelm.css("background-color",
            Account.get(this.temptl_pref.key_address)?.pref.acc_color ?? getHashColor(this.temptl_pref.ex_host))

        return jqelm
    }

    /**
     * #StaticMethod
     * ローカルにキャッシュされている一時タイムラインウィンドウオブジェクトを取得する.
     * 
     * @param target 取得対象のターゲットDOM
     */
    static getTempWindow(target) {
        return Timeline.TIMELINE_WINDOW_MAP.get(target.closest(".timeline_window").find("ul.scrollable_tl").attr("id"))
    }
}


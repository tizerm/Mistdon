/**
 * #Class
 * タイムラインの設定値を管理するクラス(カラムに内包)
 *
 * @author tizerm@mofu.kemo.no
 */
class TimelinePref {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref, column) {
        this.pref = pref
        this.__column_id = column.id
    }

    // Getter: このタイムラインが所属するカラム
    get parent_column() { return ColumnPref.get(this.__column_id) }

    /**
     * #Method
     * このタイムラインの設定DOMを生成しjQueryオブジェクトを返却
     */
    create(index) {
        const uuid = crypto.randomUUID()
        // コンボボックスのアカウントリストを先に生成
        let account_list = ''
        if (!Account.isEmpty()) Account.each(account => account_list += `
                <option value="${account.full_address}">
                    ${account.pref.username} - ${account.full_address}
                </option>
            `)

        // タイムラインの設定ブロックをjQueryオブジェクトとして生成
        const jqelm = $($.parseHTML(`
            <li class="ui-sortable">
                <h4>
                    <span class="tl_header_label">Timeline ${index}</span>
                    <a class="__on_remove_timeline ic_button" title="このタイムラインを削除"
                        ><img src="resources/ic_rem24.png" alt="このタイムラインを削除"/></a>
                </h4>
                <div class="tl_option">
                    <div class="lbl_disp_account">
                        表示アカウント:<br/><select class="__cmb_tl_account">
                            ${account_list}
                            <option value="__external">その他のインスタンス</option>
                        </select>
                    </div>
                    <div class="lbl_external_instance">
                        対象インスタンス:<br/>
                        https://<input type="text" class="__txt_external_instance"/>/
                        <input type="hidden" class="__hdn_external_platform" value="null"/>
                        <div class="instance_info">(URLを入力してください)</div>
                        <div class="color_info">
                            色: #<input type="text" class="__txt_external_color __pull_color_palette" size="6"/>
                        </div>
                    </div>
                    <div class="lbl_tl_type">
                        タイムラインの種類:<br/><select class="__cmb_tl_type">
                            <option value="home">ホーム</option>
                            <option value="local">ローカル</option>
                            <option value="federation">連合</option>
                            <option value="list">リスト</option>
                            <option value="notification">通知</option>
                            <option value="mention">通知(メンションのみ)</option>
                        </select>
                    </div>
                    <div class="lbl_list">
                        対象リスト:<br/><select class="__cmb_tl_list">
                        </select>
                    </div>
                    <div class="lbl_checkbox">
                        <input type="checkbox" id="xr_${uuid}" class="__chk_exclude_reblog"/>
                        <label for="xr_${uuid}">ブースト/リノートを非表示</label><br/>
                        <input type="checkbox" id="xcw_${uuid}" class="__chk_expand_cw"/>
                        <label for="xcw_${uuid}">デフォルトでCWを展開</label><br/>
                        <input type="checkbox" id="xsm_${uuid}" class="__chk_expand_media"/>
                        <label for="xsm_${uuid}">デフォルトで閲覧注意メディアを展開</label><br/>
                    </div>
                </div>
            </li>
        `))
        // 初期値が存在する場合は初期値を設定
        if (this.pref?.key_address) { // 表示対象アカウント
            jqelm.find(`.__cmb_tl_account>option[value="${this.pref.key_address}"]`).prop("selected", true)
            jqelm.find("h4").css("background-color", `#${Account.get(this.pref.key_address)?.pref.acc_color}`)
            jqelm.find(".lbl_external_instance").hide()
        } else if (this.pref?.external) { // 外部インスタンスが表示対象の場合は「その他」を初期設定
            jqelm.find(`.__cmb_tl_account>option[value="__external"]`).prop("selected", true)
            jqelm.find(".__txt_external_instance").val(this.pref.host)
            jqelm.find(".__hdn_external_platform").val(this.pref.platform)
            jqelm.find(".__txt_external_color").val(this.pref.color)
            jqelm.find("h4").css("background-color", `#${this.pref.color}`)
            jqelm.find(".lbl_external_instance").show()
            jqelm.find('.__cmb_tl_type>option[value="home"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="list"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="notification"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="mention"]').prop("disabled", true)
        }
        if (this.pref?.timeline_type) { // タイムラインの種類
            jqelm.find(`.__cmb_tl_type>option[value="${this.pref.timeline_type}"]`).prop("selected", true)
            if (this.pref.timeline_type == 'list') // リストの場合はリストブロックを表示
                jqelm.find(".lbl_list").show()
            else jqelm.find(".lbl_list").hide()
        }
        if (this.pref?.exclude_reblog) // ブースト/リノートを非表示
            jqelm.find(".__chk_exclude_reblog").prop("checked", true)
        if (this.pref?.expand_cw) // デフォルトでCWを展開
            jqelm.find(".__chk_expand_cw").prop("checked", true)
        if (this.pref?.expand_media) // デフォルトで閲覧注意メディアを展開
            jqelm.find(".__chk_expand_media").prop("checked", true)

        // 初期値が存在しない(追加)場合は初期表示設定
        if (!this.pref) {
            if (!Account.isEmpty()) {  // アカウント情報があれば背景色は先頭にしてホスト情報を非表示
                jqelm.find("h4").css("background-color", `#${Account.get(0).pref.acc_color}`)
                jqelm.find(".lbl_list").hide()
                jqelm.find(".lbl_external_instance").hide()
            } else { // アカウント情報がない場合は
                jqelm.find(`.__cmb_tl_account>option[value="__external"]`).prop("selected", true)
                jqelm.find(".lbl_external_instance").show()
                jqelm.find('.__cmb_tl_type>option[value="home"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="list"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="notification"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="mention"]').prop("disabled", true)
            }
        }

        // jQueryオブジェクトを返却
        return jqelm
    }

    /**
     * #StaticMethod
     * 表示アカウントを変更したときのイベントメソッド
     * 
     * @param target イベントが発火したコンボボックスのjQueryオブジェクト
     */
    static changeAccountEvent(target) {
        const target_li = target.closest("li")
        const account = Account.get(target.find("option:selected").val())
        if (account) { // 対象アカウントが存在する場合はアカウントカラーを変更してホスト画面を非表示
            target_li.find("h4").css("background-color", `#${account.pref.acc_color}`)
            target_li.find(".lbl_external_instance").hide()
            target_li.find('.__cmb_tl_type>option').prop("disabled", false)
            target_li.find('.__cmb_tl_type>option[value="home"]').prop("selected", true)
        } else { // 「その他のインスタンス」を選択している場合はホスト画面を出して一部項目を無効化
            target_li.find("h4").css("background-color", `#999999`)
            target_li.find(".lbl_external_instance").show()
            target_li.find('.__cmb_tl_type>option[value="home"]').prop("disabled", true)
            target_li.find('.__cmb_tl_type>option[value="list"]').prop("disabled", true)
            target_li.find('.__cmb_tl_type>option[value="notification"]').prop("disabled", true)
            target_li.find('.__cmb_tl_type>option[value="mention"]').prop("disabled", true)
            target_li.find('.__cmb_tl_type>option[value="local"]').prop("selected", true)
        }
        // リストは一律非表示
        target_li.find(".lbl_list").hide()
        ColumnPref.setButtonPermission()
    }

    /**
     * #StaticMethod
     * 外部インスタンスのドメインを変更したときのイベントメソッド
     * 
     * @param target イベントが発火したテキストボックスのjQueryオブジェクト
     */
    static async changeExternalHostEvent(target) {
        const domain = target.val()
        const info_dom = target.closest(".lbl_external_instance").find(".instance_info")
        if (!domain) { // 空の場合はメッセージを初期化
            info_dom.text("(URLを入力してください)")
            return
        }
        // ロード待ち画面を生成
        info_dom.html("&nbsp;").css('background-image', 'url("resources/illust/ani_wait.png")')

        // インスタンス情報を取得
        const instance = await Instance.get(domain)

        info_dom.css('background-image', 'none')
        if (!instance) { // 不正なインスタンスの場合はエラーメッセージを表示
            info_dom.text("!不正なインスタンスです!")
            return
        }

        // インスタンス名をセット
        info_dom.text(`(${instance.platform == 'Mastodon' ? 'M' : 'Mi'}) ${instance.name}`)
        target.closest(".lbl_external_instance").find(".__hdn_external_platform").val(instance.platform)
    }

    /**
     * #StaticMethod
     * タイムラインタイプを変更したときのイベントメソッド
     * 
     * @param target イベントが発火したコンボボックスのjQueryオブジェクト
     */
    static async changeTypeEvent(target) {
        const li_dom = target.closest("li")
        if (target.val() != 'list') { // リスト以外の場合はリストウィンドウを閉じて終了
            li_dom.find(".lbl_list").hide()
            return
        }

        // リストの場合はリスト取得処理を実行
        const toast_uuid = crypto.randomUUID()
        toast("対象アカウントのリストを取得中です...", "progress", toast_uuid)

        Account.get(li_dom.find(".__cmb_tl_account>option:selected").val()).getLists().then(lists => {
            // リストのコンボ値のDOMを生成
            let options = ''
            lists.forEach(l => options += `<option value="${l.id}">${l.listname}</option>`)
            li_dom.find('.__cmb_tl_list').html(options)
            li_dom.find(".lbl_list").show()
            toast(null, "hide", toast_uuid)
        }).catch(error => {
            if (error == 'empty') { // リストを持っていない
                li_dom.find('.__cmb_tl_type>option[value="home"]').prop("selected", true)
                li_dom.find('.__cmb_tl_type>option[value="list"]').prop("disabled", true)
                toast("このアカウントにはリストがありません.", "error", toast_uuid)
            } else // それ以外は単にリストの取得エラー
                toast("リストの取得で問題が発生しました.", "error", toast_uuid)
        })
    }
}

/*====================================================================================================================*/

/**
 * #Class
 * タイムライングループの設定値を管理するクラス(カラムに内包)
 *
 * @author tizerm@mofu.kemo.no
 */
class GroupPref {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref, column) {
        if (pref) { // 設定ファイルがある場合
            this.pref = pref
            this.__column_id = column.id

            // タイムライン設定も追加
            const timelines = []
            this.pref?.timelines?.forEach(tl => timelines.push(new TimelinePref(tl, column)))
            this.timelines = timelines
        } else { // 設定ファイルがない場合は新規UUIDを生成してカラムを新規作成
            this.pref = { "group_id": crypto.randomUUID() }
            this.timelines = []
        }
    }

    // Getter: カラムの一意識別IDを取得
    get id() { return this.pref?.group_id }
    // Getter: このタイムライングループが所属するカラム
    get parent_column() { return ColumnPref.get(this.__column_id) }

    get height() {
        // 高さがnullでなければそのまま返却
        if (this.pref.gp_height) return this.pref.gp_height

        let others = 0
        this.parent_column.eachGroup(gp => others += Number(gp.pref.gp_height))
        return 100 - others
    }

    /**
     * #Method
     * このカラムの設定DOMを生成してテーブルにアペンドする
     */
    create() {
        // カラム本体を空の状態でjQueryオブジェクトとして生成
        const jqelm = $($.parseHTML(`
            <div id="${this.id}" class="tl_group timeline ui-sortable">
                <div class="group_head">
                    <h3><input type="text" class="__txt_group_head" placeholder="(グループの名前を設定してください)"/></h3>
                    <div class="group_button">
                        <a class="__on_add_tl ic_button" title="タイムラインを追加"
                            ><img src="resources/ic_add24.png" alt="タイムラインを追加"/></a>
                        <a class="__on_remove_group ic_button" title="このグループを削除"
                            ><img src="resources/ic_rem24.png" alt="このグループを削除"/></a>
                    </div>
                    <div class="group_pref">
                        <input type="text" class="__txt_group_height" size="4"/>%
                        色: #<input type="text" class="__txt_group_color __pull_color_palette" size="6"/><br/>
                        <select class="__cmb_tl_layout">
                            <option value="default">ノーマル</option>
                            <option value="chat">チャット</option>
                            <option value="list">リスト</option>
                            <option value="gallery">ギャラリー</option>
                        </select>
                    </div>
                </div>
                <ul class="__ui_tl_sortable"></ul>
            </div>
        `))
        // 初期値が存在する場合は初期値を設定
        if (this.pref?.label_head) // グループ名称
            jqelm.find(".__txt_group_head").val(this.pref.label_head)
        if (this.pref?.gp_height) { // グループ高
            jqelm.find(".__txt_group_height").val(this.pref.gp_height)
        }
        if (this.pref?.gp_color) { // グループカラー
            jqelm.find(".__txt_group_color").val(this.pref.gp_color)
            jqelm.find(".group_head").css("background-color", `#${this.pref.gp_color}`)
        }
        if (this.pref?.tl_layout) // タイムラインレイアウト
            jqelm.find(`.__cmb_tl_layout>option[value="${this.pref.tl_layout}"]`).prop("selected", true)
        // タイムラインの設定値をDOMと共に生成
        this.timelines.forEach((tl, index) => jqelm.find("ul").append(tl.create(index + 1)))

        // jQueryオブジェクトを返却
        return jqelm
    }

    /**
     * #Method
     * このグループにタイムラインを追加する
     */
    addTimeline() {
        const tl = new TimelinePref(null, this)
        this.timelines.push(tl)
        const jqelm = tl.create(this.timelines.length)
        $(`#${this.id}>ul`).append(jqelm)
        ColumnPref.setButtonPermission()
        setColorPalette($(`#${this.id}>ul>li:last-child`))
    }

    /**
     * #Method
     * このカラムのタイムラインを削除する
     * 
     * @param index 削除対象のタイムラインのインデクス
     */
    removeTimeline(index) {
        this.timelines.splice(index, 1)
        $(`#${this.id}>ul>li`).eq(index).remove()
        // タイムラインの連番を再生成
        $(`#${this.id}>ul>li`).each((index, elm) => $(elm).find(".tl_header_label").text(`Timeline ${index + 1}`))
        ColumnPref.setButtonPermission()
    }
}

/*====================================================================================================================*/

/**
 * #Class
 * カラムの設定値を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class ColumnPref {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref) {
        if (pref) { // 設定ファイルがある場合
            this.pref = pref

            // タイムライン設定も追加
            const groups = new Map()
            this.pref?.groups?.forEach(group => {
                const group_obj = new GroupPref(group, this)
                groups.set(group_obj.id, group_obj)
            })
            this.tl_groups = groups
        } else { // 設定ファイルがない場合は新規UUIDを生成してカラムを新規作成
            this.pref = { "column_id": crypto.randomUUID() }
            //this.timelines = []
            this.tl_groups = new Map()
        }
    }

    // Getter: カラムの一意識別IDを取得
    get id() { return this.pref?.column_id }

    // スタティックマップを初期化(非同期)
    static {
        (async () => {
            const columns = await window.accessApi.readPrefCols()
            const col_map = new Map()
            columns?.forEach((col, index) => {
                col.index = index
                col_map.set(col.column_id, new ColumnPref(col))
            })
            ColumnPref.map = col_map
        })()
    }

    /**
     * #StaticMethod
     * カラムプロパティを取得
     * 
     * @param arg 取得に使う引数
     */
    static get(arg) {
        // 数値型だった場合インデクスとして番号からプロパティを取得
        if (typeof arg == 'number') return ColumnPref.map.get($(".column_td").eq(arg).attr("id"))
        // 文字列型だった場合はそのままキーとしてプロパティを取得
        else if (typeof arg == 'string') return ColumnPref.map.get(arg)
        // オブジェクトだった場合jQueryオブジェクトとして取得
        else return ColumnPref.map.get(arg.attr("id"))
    }

    static getGroup(target) {
        return ColumnPref.map.get(target.closest("td").attr("id")).tl_groups.get(target.closest(".tl_group").attr("id"))
    }

    /**
     * #StaticMethod
     * カラムプロパティを走査
     * 
     * @param callback 要素ごとに実行するコールバック関数
     */
    static each(callback) {
        ColumnPref.map.forEach((v, k) => callback(v))
    }

    /**
     * #StaticMethod
     * カラムデータが存在しない場合trueを返す
     */
    static isEmpty() {
        return ColumnPref.map.size == 0
    }

    /**
     * #Method
     * このカラムの設定DOMを生成してテーブルにアペンドする
     */
    create() {
        // カラム本体を空の状態でjQueryオブジェクトとして生成
        const jqelm = $($.parseHTML(`
            <td id="${this.id}" class="column_td ui-sortable">
                <div class="col_head">
                    <h2><input type="text" class="__txt_col_head" placeholder="(カラムの名前を設定してください)"/></h2>
                    <div class="group_button">
                        <a class="__on_add_group ic_button" title="タイムライングループを追加"
                            ><img src="resources/ic_add32.png" alt="タイムライングループを追加"/></a>
                        <a class="__on_remove_column ic_button" title="このカラムを削除"
                            ><img src="resources/ic_rem32.png" alt="このカラムを削除"/></a>
                    </div>
                    <div class="col_pref">
                        <input type="text" class="__txt_col_width" size="5"/>px
                    </div>
                </div>
                <div class="col_option">
                    <input type="checkbox" id="dh_${this.id}" class="__chk_default_hide"/>
                    <label for="dh_${this.id}">デフォルトで閉じる</label><br/>
                    <input type="checkbox" id="df_${this.id}" class="__chk_default_flex"/>
                    <label for="df_${this.id}">デフォルトで可変幅にする</label><br/>
                    色: #<input type="text" class="__txt_col_color __pull_color_palette" size="6"/>
                </div>
                <div class="col_tl_groups __ui_gp_sortable">
                </div>
            </td>
        `))
        // 初期値が存在する場合は初期値を設定
        if (this.pref?.label_head) // カラム名称
            jqelm.find(".__txt_col_head").val(this.pref.label_head)
        if (this.pref?.col_width) { // カラム幅
            jqelm.find(".__txt_col_width").val(this.pref.col_width)
            jqelm.closest("td").css("width", `${this.pref.col_width}px`)
        }
        if (this.pref?.d_hide) // デフォルトで閉じる
            jqelm.find(".__chk_default_hide").prop("checked", true)
        if (this.pref?.d_flex) // デフォルトで可変幅にする
            jqelm.find(".__chk_default_flex").prop("checked", true)
        if (this.pref?.col_color) { // カラムカラー
            jqelm.find(".__txt_col_color").val(this.pref.col_color)
            jqelm.find(".col_head").css("background-color", `#${this.pref.col_color}`)
        }
        // タイムラインの設定値をDOMと共に生成
        this.tl_groups.forEach((v, k) => jqelm.find(".col_tl_groups").append(v.create()))

        // 最後にカラムのDOMを追加
        $("#columns>table>tbody>tr").append(jqelm)
    }

    /**
     * #StaticMethod
     * カラムを追加する
     */
    static addColumn() {
        const column = new ColumnPref(null)
        ColumnPref.map.set(column.id, column)
        column.create()
        column.addGroup()
        ColumnPref.setButtonPermission()
        setColorPalette($(`#columns>table #${column.id}>.col_option`))
    }

    /**
     * #Method
     * このカラムを削除する
     */
    removeColumn() {
        $(`#${this.id}`).remove()
        ColumnPref.map.delete(this.id)
        ColumnPref.setButtonPermission()
    }

    /**
     * #Method
     * このグループにタイムラインを追加する
     */
    addGroup() {
        const group = new GroupPref(null, this)
        this.tl_groups.set(group.id, group)
        const jqelm = group.create()
        $(`#${this.id}>.col_tl_groups`).append(jqelm)
        group.addTimeline()
        // グループの高さを再設定
        const reset_rate = Math.round(100 / this.tl_groups.size)
        $(`#${this.id}>.col_tl_groups>.tl_group .__txt_group_height`).val(reset_rate)
        ColumnPref.setButtonPermission()
        setColorPalette($(`#${this.id}>.col_tl_groups>.tl_group:last-child>.group_head`))
    }

    /**
     * #Method
     * このカラムのタイムラインを削除する
     * 
     * @param index 削除対象のタイムラインのインデクス
     */
    removeGroup(id) {
        const group = this.tl_groups.get(id)
        $(`#${group.id}`).remove()
        this.tl_groups.delete(id)
        ColumnPref.setButtonPermission()
    }

    /**
     * #StaticMethod
     * 設定を変えたときに制御しないといけないボタンを一括制御する
     */
    static setButtonPermission() {
        // 最後のタイムライングループの縦幅を編集禁止にする
        $(".__txt_group_height").prop("disabled", false)
        $("#columns>table>tbody>tr>td>.col_tl_groups>.tl_group:last-child .__txt_group_height").prop("disabled", true).val("")
        // すべてのタイムライングループの高さを再設定
        $("#columns>table td").each((col_index, col_elm) => { // カラムイテレータ
            let total = 0
            $(col_elm).find(".col_tl_groups>.tl_group").each((gp_index, gp_elm) => { // タイムライングループイテレータ
                let height = $(gp_elm).find('.__txt_group_height').val()
                if (!height) height = 100 - total
                else total += Number(height)
                $(gp_elm).css("height", `${height}%`)
                $(gp_elm).find("ul").css("height", 'calc(100% - 82px)')

                // タイムラインタイトルを再設定
                $(gp_elm).find("ul>li").each((tl_index, tl_elm) => $(tl_elm)
                    .find(".tl_header_label").text(`Timeline ${gp_index + 1}-${tl_index + 1}`))
            })
        })

        // ツールチップを設定し直す
        $(".ic_button").tooltip({
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
    }

    /**
     * #StaticMethod
     * タイムライン設定をファイルに保存する
     */
    static async save() {
        // 現在のカラムを構成しているDOMのHTML構造から設定JSONを生成する
        const col_list = []
        $("#columns>table td").each((col_index, col_elm) => { // カラムイテレータ
            const group_list = []
            $(col_elm).find(".col_tl_groups>.tl_group").each((gp_index, gp_elm) => { // タイムライングループイテレータ
                const tl_list = []
                $(gp_elm).find("ul>li").each((tl_index, tl_elm) => { // タイムラインイテレータ
                    // アカウントコンボボックスの値を取得
                    const account_address = $(tl_elm).find(".__cmb_tl_account").val()
                    tl_list.push({ // タイムラインプリファレンス
                        'key_address': account_address,
                        'timeline_type': $(tl_elm).find(".__cmb_tl_type").val(),
                        'account': Account.get(account_address)?.pref,
                        'ex_host': $(tl_elm).find(".__txt_external_instance").val(),
                        'ex_platform': $(tl_elm).find(".__hdn_external_platform").val(),
                        'ex_color': $(tl_elm).find(".__txt_external_color").val(),
                        'list_id': $(tl_elm).find(".__cmb_tl_list").val(),
                        'exclude_reblog': $(tl_elm).find(".__chk_exclude_reblog").prop("checked"),
                        'expand_cw': $(tl_elm).find(".__chk_expand_cw").prop("checked"),
                        'expand_media': $(tl_elm).find(".__chk_expand_media").prop("checked")
                    })
                })
                group_list.push({ // タイムライングループプリファレンス
                    // デフォルトグループ名は「Group XX」
                    'label_head': $(gp_elm).find(".__txt_group_head").val() || `Group ${gp_index + 1}`,
                    'timelines': tl_list,
                    // デフォルトグループカラーは#777777(グレー)
                    'gp_color': $(gp_elm).find(".__txt_group_color").val() || '777777',
                    'gp_height': $(gp_elm).find(".__txt_group_height").val(),
                    'tl_layout': $(gp_elm).find(".__cmb_tl_layout").val()
                })
            })
            col_list.push({ // カラムプリファレンス
                // デフォルトカラム名は「Column XX」
                'label_head': $(col_elm).find(".__txt_col_head").val() || `Column ${col_index + 1}`,
                'groups': group_list,
                // デフォルトカラムカラーは#808080(グレー)
                'col_color': $(col_elm).find(".__txt_col_color").val() || '808080',
                // デフォルトカラム長は330px
                'col_width': $(col_elm).find(".__txt_col_width").val() || '330',
                'd_hide': $(col_elm).find(".__chk_default_hide").prop("checked"),
                'd_flex': $(col_elm).find(".__chk_default_flex").prop("checked")
            })
        })
        // ファイルに追加する処理を書く(整形はメインプロセスで)
        await window.accessApi.writePrefCols(col_list)
        dialog({
            type: 'alert',
            title: "カラム設定",
            text: "カラム設定を保存しました。"
        })
    }
}

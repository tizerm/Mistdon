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
            <li>
                <h4><span class="tl_header_label">Timeline ${index}</span></h4>
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
                            TLカラー:
                            #<input type="text" class="__txt_external_color __pull_color_palette" size="6"/>
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
                    <div class="foot_button">
                        <button type="button" class="__btn_del_tl">タイムラインを削除</button>
                    </div>
                </div>
            </li>
        `))
        // 初期値が存在する場合は初期値を設定
        if (this.pref?.key_address) { // 表示対象アカウント
            jqelm.find(`.__cmb_tl_account>option[value="${this.pref.key_address}"]`).prop("selected", true)
            jqelm.find("h4").css("background-color", `#${Account.get(this.pref.key_address)?.pref.acc_color}`)
            jqelm.find(".lbl_external_instance").hide()
        } else if (this.pref?.external_instance) { // 外部インスタンスが表示対象の場合は「その他」を初期設定
            jqelm.find(`.__cmb_tl_account>option[value="__external"]`).prop("selected", true)
            jqelm.find(".__txt_external_instance").val(this.pref.host)
            jqelm.find(".__hdn_external_platform").val(this.pref.platform)
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
            const timelines = []
            this.pref?.timelines?.forEach(tl => timelines.push(new TimelinePref(tl, this)))
            this.timelines = timelines
        } else { // 設定ファイルがない場合は新規UUIDを生成してカラムを新規作成
            this.pref = { "column_id": crypto.randomUUID() }
            this.timelines = []
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
            <td id="${this.id}" class="timeline ui-sortable">
                <div class="col_head">
                    <h2><input type="text" class="__txt_col_head" placeholder="(カラムの名前を設定してください)"/></h2>
                    <div class="col_pref">
                        <input type="text" class="__txt_col_width" size="5"/>px
                    </div>
                </div>
                <div class="col_option">
                    <button type="button" class="__btn_add_tl">TL追加</button>
                    <button type="button" class="__btn_del_col">列削除</button><br/>
                    <input type="checkbox" id="dh_${this.id}" class="__chk_default_hide"/>
                    <label for="dh_${this.id}">デフォルトで閉じる</label><br/>
                    <input type="checkbox" id="df_${this.id}" class="__chk_default_flex"/>
                    <label for="df_${this.id}">デフォルトで可変幅にする</label><br/>
                    カラムカラー:
                    #<input type="text" class="__txt_col_color __pull_color_palette" size="6"/>
                </div>
                <ul></ul>
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
        this.timelines.forEach((tl, index) => jqelm.find("ul").append(tl.create(index + 1)))

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
        column.addTimeline()
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
     * このカラムにタイムラインを追加する
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

    /**
     * #StaticMethod
     * 設定を変えたときに制御しないといけないボタンを一括制御する
     */
    static setButtonPermission() {
        // タイムラインが1つの場合はタイムライン削除を禁止
        $("#columns>table>tbody>tr>td").each(
            (index, elm) => $(elm).find(".__btn_del_tl").prop("disabled", $(elm).find("li").length == 1));
    }

    /**
     * #StaticMethod
     * タイムライン設定をファイルに保存する
     */
    static async save() {
        // 現在のカラムを構成しているDOMのHTML構造から設定JSONを生成する
        const col_list = []
        $("#columns>table td").each((col_index, col_elm) => {
            // タイムライン一覧を走査
            const tl_list = []
            $(col_elm).find("ul>li").each((tl_index, tl_elm) => {
                // アカウントコンボボックスの値を取得
                const acc_address = $(tl_elm).find(".__cmb_tl_account").val()
                // 各フォームの情報をJSONでリストに追加
                tl_list.push({
                    'key_address': acc_address,
                    'timeline_type': $(tl_elm).find(".__cmb_tl_type").val(),
                    'account': Account.get(acc_address).pref,
                    'exclude_reblog': $(tl_elm).find(".__chk_exclude_reblog").prop("checked"),
                    'expand_cw': $(tl_elm).find(".__chk_expand_cw").prop("checked"),
                    'expand_media': $(tl_elm).find(".__chk_expand_media").prop("checked")
                })
            })
            // 各フォームの情報をJSONでリストに追加
            col_list.push({
                // デフォルトカラム名は「Column XX」
                'label_head': $(col_elm).find(".__txt_col_head").val() || `Column ${col_index + 1}`,
                'timelines': tl_list,
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

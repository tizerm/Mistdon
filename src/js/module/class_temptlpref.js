/**
 * #Class
 * 一時タイムラインの設定値を管理するクラス
 *
 * @author @tizerm@misskey.dev
 */
class TempTLPref {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref) {
        this.pref = pref
        this.id = `ttl_${crypto.randomUUID()}`
    }

    // スタティックマップを初期化(非同期)
    static {
        (async () => {
            const temptl_jsons = await window.accessApi.readTemptl()
            const temptl_list = []
            temptl_jsons?.forEach(tl => temptl_list.push(new TempTLPref(tl)))
            TempTLPref.list = temptl_list
        })()
    }

    /**
     * #Method
     * この一時タイムラインの設定DOMを生成しjQueryオブジェクトを返却.
     */
    create() {
        // コンボボックスのアカウントリストを先に生成
        let account_list = ''
        if (!Account.isEmpty()) Account.each(account => account_list += `
            <option value="${account.full_address}">
                ${account.pref.username} - ${account.full_address}
            </option>
        `)

        // カラム本体を空の状態でjQueryオブジェクトとして生成
        const jqelm = $($.parseHTML(`<li id="${this.id}" class="ui-sortable">
            <h4>
                <span class="tl_header_label">Timeline</span>
                <a class="__on_remove_temptl ic_button tooltip" title="このタイムラインを削除"
                    ><img src="resources/ic_rem32.png" alt="このタイムラインを削除"/></a>
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
                    https://<input type="text" class="__txt_external_instance __ignore_keyborad"/>/
                    <input type="hidden" class="__hdn_external_platform" value="null"/>
                    <div class="instance_info">(URLを入力してください)</div>
                </div>
                <div class="lbl_tl_type">
                    タイムラインの種類:<br/><select class="__cmb_tl_type">
                        <option value="home">ホーム</option>
                        <option value="local">ローカル</option>
                        <option value="federation">連合</option>
                        <option value="list">リスト</option>
                        <option value="channel">チャンネル</option>
                        <option value="antenna">アンテナ</option>
                        <option value="clip">クリップ</option>
                        <option value="notification">通知</option>
                    </select>
                </div>
                <div class="lbl_tl_layout">
                    タイムラインレイアウト:<br/><select class="__cmb_tl_layout tooltip" title="タイムラインレイアウト">
                        <option value="default">ノーマル</option>
                        <option value="normal2">ノーマル2</option>
                        <option value="chat">チャット</option>
                        <option value="list">リスト</option>
                        <option value="media">メディア</option>
                        <option value="gallery">ギャラリー</option>
                        <option value="multi">マルチ</option>
                    </select>
                </div>
                <table class="tl_layout_options"><tbody>
                    <tr>
                        <th class="default">通常</th>
                        <th class="btrn">ブースト/リノート</th>
                    </tr>
                    <tr>
                        <td><select class="__cmb_tll_default">
                            <option value="default">ノーマル</option>
                            <option value="normal2">ノーマル2</option>
                            <option value="chat">チャット</option>
                            <option value="list">リスト</option>
                        </select></td>
                        <td><select class="__cmb_tll_btrn">
                            <option value="default">ノーマル</option>
                            <option value="normal2">ノーマル2</option>
                            <option value="chat">チャット</option>
                            <option value="list">リスト</option>
                        </select></td>
                    </tr>
                    <tr>
                        <th class="media">メディア</th>
                        <th class="notification">通知</th>
                    </tr>
                    <tr>
                        <td><select class="__cmb_tll_media">
                            <option value="default">ノーマル</option>
                            <option value="normal2">ノーマル2</option>
                            <option value="chat">チャット</option>
                            <option value="list">リスト</option>
                            <option value="media">メディア</option>
                            <option value="gallery">ギャラリー</option>
                            <option value="ignore">無視</option>
                        </select></td>
                        <td><select class="__cmb_tll_notif">
                            <option value="default">ノーマル</option>
                            <option value="normal2">ノーマル2</option>
                            <option value="list">リスト</option>
                        </select></td>
                    </tr>
                </tbody></table>
                <div class="lbl_load_progress">&nbsp;</div>
                <div class="lbl_list">
                    対象リスト:<br/><select class="__cmb_tl_list">
                    </select>
                </div>
                <div class="lbl_channel">
                    対象チャンネル:<br/><select class="__cmb_tl_channel">
                    </select>
                </div>
                <div class="lbl_antenna">
                    対象アンテナ:<br/><select class="__cmb_tl_antenna">
                    </select>
                </div>
                <div class="lbl_clip">
                    対象クリップ:<br/><select class="__cmb_tl_clip">
                    </select>
                </div>
                <div class="lbl_checkbox">
                    <input type="checkbox" id="xr_${this.id}" class="__chk_exclude_reblog"/>
                    <label for="xr_${this.id}">ブースト/リノートを非表示</label><br/>
                    <input type="checkbox" id="xcw_${this.id}" class="__chk_expand_cw"/>
                    <label for="xcw_${this.id}">デフォルトでCWを展開</label><br/>
                    <input type="checkbox" id="xsm_${this.id}" class="__chk_expand_media"/>
                    <label for="xsm_${this.id}">デフォルトで閲覧注意メディアを展開</label><br/>
                    <input type="checkbox" id="dws_${this.id}" class="__chk_disabled_websocket"/>
                </div>
            </div>
        </li>`))

        // 初期値が存在する場合は初期値を設定
        if (this.pref?.key_address) { // 表示対象アカウント
            const account = Account.get(this.pref.key_address)
            jqelm.find(`.__cmb_tl_account>option[value="${this.pref.key_address}"]`).prop("selected", true)
            jqelm.find("h4>.tl_header_label").text(this.pref.key_address)
            jqelm.find("h4").css("background-color", account?.pref.acc_color)
            jqelm.find('.__cmb_tl_type>option[value="channel"]').prop("disabled", account?.pref.platform != 'Misskey')
            jqelm.find('.__cmb_tl_type>option[value="antenna"]').prop("disabled", account?.pref.platform != 'Misskey')
            //jqelm.find(".__txt_channel_color").val(this.pref.color)
            jqelm.find(".lbl_external_instance").hide()
        } else if (this.pref?.ex_host) { // 外部インスタンスが表示対象の場合は「その他」を初期設定
            jqelm.find(`.__cmb_tl_account>option[value="__external"]`).prop("selected", true)
            jqelm.find(".__txt_external_instance").val(this.pref.ex_host)
            jqelm.find("h4>.tl_header_label").text(this.pref.ex_host)
            jqelm.find("h4").css("background-color", getHashColor(this.pref.ex_host))
            jqelm.find(".__hdn_external_platform").val(this.pref.ex_platform)
            //jqelm.find(".__txt_external_color").val(this.pref.color)
            // TODO: なぜかshowが効かない
            jqelm.find(".lbl_external_instance").css('display', 'block')
            jqelm.find('.__cmb_tl_type>option[value="home"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="list"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="channel"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="antenna"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="clip"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="notification"]').prop("disabled", true)
            jqelm.find('.__cmb_tl_type>option[value="mention"]').prop("disabled", true)
        }
        if (this.pref?.timeline_type) { // タイムラインの種類
            jqelm.find(`.__cmb_tl_type>option[value="${this.pref.timeline_type}"]`).prop("selected", true)
            if (this.pref.timeline_type == 'list') {
                // リストの場合はリストブロックを表示(後で検索用にリストIDを記録)
                jqelm.find(".lbl_list").show()
                jqelm.find(".__cmb_tl_list").attr("value", this.pref.list_id)
            }
            else jqelm.find(".lbl_list").hide()

            if (this.pref.timeline_type == 'channel') {
                // チャンネルの場合はチャンネルブロックを表示(後で検索用にリストIDを記録)
                jqelm.find(".lbl_channel").show()
                jqelm.find(".__cmb_tl_channel").attr("value", this.pref.channel_id)
            }
            else jqelm.find(".lbl_channel").hide()

            if (this.pref.timeline_type == 'antenna') {
                // アンテナの場合はアンテナブロックを表示(後で検索用にリストIDを記録)
                jqelm.find(".lbl_antenna").show()
                jqelm.find(".__cmb_tl_antenna").attr("value", this.pref.antenna_id)
            }
            else jqelm.find(".lbl_antenna").hide()
        }
        if (this.pref?.tl_layout) { // タイムラインレイアウト
            jqelm.find(`.__cmb_tl_layout>option[value="${this.pref.tl_layout}"]`).prop("selected", true)
            if (this.pref.tl_layout == 'multi') {
                // TODO: なぜかshowが効かない
                jqelm.find(".tl_layout_options").css('display', 'table')
                jqelm.find(`.__cmb_tll_default>option[value="${this.pref.multi_layout_option.default}"]`).prop("selected", true)
                jqelm.find(`.__cmb_tll_btrn>option[value="${this.pref.multi_layout_option.reblog}"]`).prop("selected", true)
                jqelm.find(`.__cmb_tll_media>option[value="${this.pref.multi_layout_option.media}"]`).prop("selected", true)
                jqelm.find(`.__cmb_tll_notif>option[value="${this.pref.multi_layout_option.notification}"]`).prop("selected", true)
            }
            else jqelm.find(".lbl_tl_layout_optionslist").hide()
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
                const account = Account.get(0)
                jqelm.find("h4").css("background-color", account.pref.acc_color)
                jqelm.find('.__cmb_tl_type>option[value="channel"]').prop("disabled", account?.pref.platform != 'Misskey')
                jqelm.find('.__cmb_tl_type>option[value="antenna"]').prop("disabled", account?.pref.platform != 'Misskey')
                jqelm.find(".lbl_list").hide()
                jqelm.find(".lbl_channel").hide()
                jqelm.find(".lbl_antenna").hide()
                jqelm.find(".lbl_external_instance").hide()
            } else { // アカウント情報がない場合は
                jqelm.find(`.__cmb_tl_account>option[value="__external"]`).prop("selected", true)
                jqelm.find(".lbl_external_instance").show()
                jqelm.find('.__cmb_tl_type>option[value="home"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="list"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="channel"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="antenna"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="notification"]').prop("disabled", true)
                jqelm.find('.__cmb_tl_type>option[value="mention"]').prop("disabled", true)
            }
        }

        // jQueryオブジェクトを返却
        return jqelm
    }

    /**
     * #StaticMethod
     * 一時タイムライン設定ウィンドウを生成して表示.
     */
    static openTemptlPrefConfig() {
        const window_key = 'singleton_temptlpref_window'
        if ($(`#${window_key}`).length > 0) return // 既に開いている場合は何もしない

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="temptlpref_window ex_window">
                    <h2><span>一時タイムラインお気に入り</span></h2>
                    <div class="window_buttons">
                        <input type="checkbox" class="__window_opacity" id="__window_opacity_temptl"/>
                        <label for="__window_opacity_temptl" class="window_opacity_button" title="透過"><img
                            src="resources/ic_alpha.png" alt="透過"/></label>
                        <button type="button" class="window_close_button" title="閉じる"><img
                            src="resources/ic_not.png" alt="閉じる"/></button>
                    </div>
                    <ul class="temptl_fav_list"></ul>
                    <div class="footer">
                        <button type="button" id="__on_tamptl_save" class="close_button">OK</button>
                        <button type="button" id="__on_tamptl_close" class="close_button">キャンセル</button>
                    </div>
                </div>
            `,
            color: getRandomColor(),
            resizable: true,
            drag_axis: false,
            resize_axis: "all"
        })

        // 一時タイムラインのお気に入り情報をバインド
        TempTLPref.list.forEach(p => $(`#${window_key}>ul.temptl_fav_list`).append(p.create()))

        // お気に入りをソート可能にする
        $(`#${window_key}>ul.temptl_fav_list`).sortable({
            axis: "y",
            delay: 100,
            distance: 48,
            handle: "h4",
            revert: 50,
            tolerance: "pointer"
        })
        // ツールチップを設定し直す
        $(".tooltip").tooltip({
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

        // 初期化イベントを発火
        $(`#${window_key}>ul.temptl_fav_list>li`).each((index, elm) => {
            changeColTypeEvent($(elm), $(elm).find(".__cmb_tl_type").val())
            changeColExternalHostEvent($(elm).find(".__txt_external_instance").val(), $(elm).find(".lbl_external_instance"))
        })
    }

    /**
     * #StaticMethod
     * 一時タイムラインのお気に入り設定を保存する.
     */
    static async save() {
        const fav_list = []
        // 上から順番に設定値をJSONリスト化
        $('#singleton_temptlpref_window>ul.temptl_fav_list>li').each((index, elm) => {
            const opt_elm = $(elm)
            const account_address = opt_elm.find(".__cmb_tl_account").val()

            let multi_layout = null
            // タイムラインレイアウトがマルチの場合はマルチレイアウト設定を保存
            if (opt_elm.find(".__cmb_tl_layout").val() == 'multi') multi_layout = {
                'default': opt_elm.find('.__cmb_tll_default').val(),
                'reblog': opt_elm.find('.__cmb_tll_btrn').val(),
                'media': opt_elm.find('.__cmb_tll_media').val(),
                'notification': opt_elm.find('.__cmb_tll_notif').val()
            }
            fav_list.push({ // 一時タイムラインの設定JSONを生成
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
            })
        })

        // 設定ファイルを保存
        await window.accessApi.overwriteTemptl(fav_list)
        TempTLPref.list = fav_list.map(tl => new TempTLPref(tl))
        dialog({
            type: 'alert',
            title: "一時タイムライン設定",
            text: "一時タイムラインのお気に入り設定を保存しました。",
            // サブウィンドウを閉じる
            accept: () => $("#singleton_temptlpref_window .window_close_button").click()
        })
    }

}


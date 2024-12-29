$(() => {
    /*=== On Load Process ========================================================================================*/

    (async () => {
        // メインプロセスメソッドが非同期なのでawaitかけてアカウント情報を取得
        await window.accessApi.readPrefAccs()
        await window.accessApi.readPrefCols()

        // データがなかったらDOM生成はしない
        if (ColumnPref.isEmpty()) return

        // カラム設定情報からDOMを生成
        ColumnPref.each(col => col.create())
        ColumnPref.setButtonPermission()
        ColumnPref.initRemoteInfo()
        ColumnPref.setInnerSortable()
    })()

    /*=== UI Setting Process =====================================================================================*/

    // カラムをSortableにする(これはカラムの有無にかかわらず実行)
    $(".__ui_col_sortable").sortable({
        axis: "x",
        delay: 100,
        distance: 48,
        handle: ".col_head",
        placeholder: "ui-sortable-placeholder",
        revert: 50,
        opacity: 0.75,
        tolerance: "pointer"
    })
    $("#header>.head_buttons").tooltip({
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

    /*=== Preference Window Events ===============================================================================*/

    /**
     * #Event
     * ヘッダボタン: カラム追加ボタンイベント.
     * => カラムを追加
     */
    $("#on_add_column").on("click", e => ColumnPref.addColumn())

    /**
     * #Event
     * カラム: カラム削除ボタンイベント.
     * => 対象のカラムを削除
     */
    $(document).on("click", ".__on_remove_column", e => ColumnPref.get($(e.target).closest(".column_box")).removeColumn())

    /**
     * #Event
     * カラム: グループ追加ボタンイベント.
     * => 対象のカラムにグループを追加
     */
    $(document).on("click", ".__on_add_group", e => ColumnPref.get($(e.target).closest(".column_box")).addGroup())

    /**
     * #Event
     * グループ: グループ削除ボタンイベント.
     * => 対象のグループを削除
     */
    $(document).on("click", ".__on_remove_group", 
        e => ColumnPref.get($(e.target).closest(".column_box")).removeGroup($(e.target).closest(".tl_group").attr("id")))

    /**
     * #Event
     * グループ: タイムライン追加ボタンイベント.
     * => 対象のグループにタイムラインを追加
     */
    $(document).on("click", ".__on_add_tl", e => ColumnPref.getGroup($(e.target)).addTimeline())

    /**
     * #Event
     * タイムライン: タイムライン削除ボタンイベント.
     * => 対象のタイムラインを削除
     */
    $(document).on("click", ".__on_remove_timeline", 
        e => ColumnPref.getGroup($(e.target)).removeTimeline($(e.target).closest("li").index()))

    /**
     * #Event #Blur
     * タイムライン: タイムラインカラー変更イベント.
     * => 対象のタイムラインのヘッダカラーを変更
     */
    $(document).on("blur", ".__txt_col_color",
        e => $(e.target).closest(".column_box").find(".col_head").css("background-color", $(e.target).val()))

    /**
     * #Event #Blur
     * グループ: グループカラー変更イベント.
     * => 対象のグループのヘッダカラーを変更
     */
    $(document).on("blur", ".__txt_group_color",
        e => $(e.target).closest(".tl_group").find(".group_head").css("background-color", $(e.target).val()))

    /**
     * #Event
     * グループ: マルチタイムラインレイアウトボタンイベント.
     * => マルチタイムラインレイアウト編集ウィンドウを開く
     */
    $(document).on("click", ".__open_multi_tl_layout",
        e => $(e.target).closest(".tl_group").find(".tl_layout_options").toggle(...Preference.getAnimation("SLIDE_FAST")))

    /**
     * #Event #Blur
     * タイムライン: 外部タイムラインカラー変更イベント.
     * => タイムラインヘッダに色を適用する
     */
    $(document).on("blur", ".__txt_external_color",
        e => $(e.target).closest("li").find("h4").css("background-color", $(e.target).val()))

    /**
     * #Event #Blur
     * カラム: カラム幅変更イベント.
     * => カラムの幅を入力内容で設定する
     */
    $(document).on("blur", ".__txt_col_width",
        e => $(e.target).closest(".column_box").css("width", `${$(e.target).val()}px`))

    /**
     * #Event #Change
     * グループ: グループのタイムラインレイアウト変更イベント.
     * => マルチタイムラインレイアウトボタンの有効無効制御を行う
     */
    $(document).on("change", ".__cmb_tl_layout", e => GroupPref.changeLayoutEvent($(e.target)))

    /**
     * #Event
     * グループ: マルチタイムラインレイアウト編集ウィンドウの閉じるボタン.
     * => マルチタイムラインレイアウト編集ウィンドウを閉じる
     */
    $(document).on("click", ".__on_layout_close",
        e => $(e.target).closest(".tl_layout_options").hide(...Preference.getAnimation("SLIDE_FAST")))

    /**
     * #Event #Blur
     * グループ: グループ高変更イベント.
     * => グループの高さを再設定する
     */
    $(document).on("blur", ".__txt_group_height", e => ColumnPref.recalcHeight($(e.target)))

    /**
     * #Event #Change
     * タイムライン: 対象アカウント変更イベント.
     * => アカウント変更による表示制御を行う
     */
    $(document).on("change", ".__cmb_tl_account", e => TimelinePref.changeAccountEvent($(e.target)))

    /**
     * #Event #Change
     * タイムライン: 外部インスタンスアドレス変更イベント.
     * => インスタンス情報を取得して名称表示する
     */
    $(document).on("change", ".__txt_external_instance", e => TimelinePref.changeExternalHostEvent($(e.target)))

    /**
     * #Event #Change
     * タイムライン: タイムラインタイプ変更イベント.
     * => タイプ変更による表示制御を行う
     */
    $(document).on("change", ".__cmb_tl_type", e => TimelinePref.changeTypeEvent($(e.target)))

    /**
     * #Event
     * ヘッダボタン: 設定を保存ボタン.
     * => カラム設定を保存
     */
    $("#on_save_pref").on("click", e => ColumnPref.save())

    /**
     * #Event
     * ヘッダボタン: 戻るボタン.
     * => メイン画面に戻る
     */
    $("#on_close").on("click", e => window.open("index.html", "_self"))

    /**
     * #Event
     * ヘッダボタン: 全体設定ボタン.
     * => 全体設定ウィンドウを開く
     */
    $("#on_general_pref").on("click", e => Preference.openGeneralPrefConfig())

    /*=== General Preference Window Events =======================================================================*/

    /**
     * #Event #Change
     * 全体設定: 背景ファイル変更.
     * => 背景ファイル名を隠し項目に設定
     */
    $(document).on("change", "#__file_gen_background", e => $("#__hdn_gen_bgfile").val(e.target.files[0].path))

    /**
     * #Event #Focus
     * 全体設定: フォントサイズボックス変更.
     * => サンプルのフォントサイズを変更
     */
    $(document).on("focus", "input.__gen_fontsize", e => $(".font_sample_box").css("font-size", `${$(e.target).val()}px`))

    /**
     * #Event #Keyup
     * 全体設定: フォントサイズボックスのキーアップイベント.
     * => サンプルのフォントサイズを変更
     */
    let font_timer = 0
    $(document).on("keyup", "input.__gen_fontsize", e => {
        clearTimeout(font_timer)
        font_timer = setTimeout(() => $(".font_sample_box").css("font-size", `${$(e.target).val()}px`), 500)
    })

    /**
     * #Event #Change
     * 全体設定: 投稿フォームの個別表示チェックボックスイベント.
     * => 小項目の有効無効制御をする
     */
    $(document).on("change", "input.__opt_gen_flex_headform", e => $("#__gp_gen_headforms input")
        .prop("disabled", $("#__opt_gen_flex_headform1").prop("checked")))

    /**
     * #Event #Change
     * 全体設定: 簡易アクションパレットのチェックボックスイベント.
     * => 小項目の有効無効制御をする
     */
    $(document).on("change", "input#__chk_gen_use_action_palette", e => $("#__gp_gen_actionpalette input")
        .prop("disabled", !$("#__chk_gen_use_action_palette").prop("checked")))

    /**
     * #Event
     * 全体設定: 保存して閉じるボタン.
     * => 全体設定を保存してウィンドウを閉じる
     */
    $(document).on("click", "#__on_pref_save", e => Preference.saveGeneralPreference())

    /**
     * #Event
     * 全体設定: ウィンドウ閉じるボタン.
     * => 全体設定を保存せずにウィンドウを閉じる
     */
    $(document).on("click", "#pop_multi_window .window_close_button, #__on_pref_close", e => {
        const target_window = $(e.target).closest(".ex_window")
        target_window.hide(...Preference.getAnimation("WINDOW_FOLD"), () => target_window.remove())
    })
})

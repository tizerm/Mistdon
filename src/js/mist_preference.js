$(() => {
    // カラム初期表示(非同期)
    (async () => {
        // メインプロセスメソッドが非同期なのでawaitかけてアカウント情報を取得
        await window.accessApi.readPrefAccs()
        await window.accessApi.readPrefCols()

        // データがなかったらDOM生成はしない
        if (ColumnPref.isEmpty()) {
            setColorPalette()
            return
        }

        // カラム設定情報からDOMを生成
        ColumnPref.each(col => col.create())
        ColumnPref.setButtonPermission()
        ColumnPref.initRemoteInfo()
        setColorPalette()
        ColumnPref.setInnerSortable()
    })()
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

    // 背景ファイル変更イベント
    $(document).on("change", "#__file_gen_background", e => $("#__hdn_gen_bgfile").val(e.target.files[0].path))
    // 全体設定-フォントサイズボックスのフォーカスイベント
    $(document).on("focus", "input.__gen_fontsize", e => $(".font_sample_box").css("font-size", `${$(e.target).val()}px`))
    // 全体設定-フォントサイズボックスのキーボードイベント
    let font_timer = 0
    $(document).on("keyup", "input.__gen_fontsize", e => {
        clearTimeout(font_timer)
        font_timer = setTimeout(() => $(".font_sample_box").css("font-size", `${$(e.target).val()}px`), 500)
    })

    // カラム追加ボタンイベント
    $("#on_add_column").on("click", e => ColumnPref.addColumn())
    // カラム削除ボタンイベント(動的バインド)
    $(document).on("click", ".__on_remove_column", e => ColumnPref.get($(e.target).closest(".column_box")).removeColumn())
    // グループ追加ボタンイベント(動的バインド)
    $(document).on("click", ".__on_add_group", e => ColumnPref.get($(e.target).closest(".column_box")).addGroup())
    // グループ削除ボタンイベント(動的バインド)
    $(document).on("click", ".__on_remove_group", 
        e => ColumnPref.get($(e.target).closest(".column_box")).removeGroup($(e.target).closest(".tl_group").attr("id")))
    // タイムライン追加ボタンイベント(動的バインド)
    $(document).on("click", ".__on_add_tl", e => ColumnPref.getGroup($(e.target)).addTimeline())
    // タイムライン削除ボタンイベント(動的バインド)
    $(document).on("click", ".__on_remove_timeline", 
        e => ColumnPref.getGroup($(e.target)).removeTimeline($(e.target).closest("li").index()))
    // カラムカラー変更イベント(動的バインド)
    $(document).on("blur", ".__txt_col_color",
        e => $(e.target).closest(".column_box").find(".col_head").css("background-color", `#${$(e.target).val()}`))
    // グループカラー変更イベント(動的バインド)
    $(document).on("blur", ".__txt_group_color",
        e => $(e.target).closest(".tl_group").find(".group_head").css("background-color", `#${$(e.target).val()}`))
    // マルチタイムラインレイアウト表示
    $(document).on("click", ".__open_multi_tl_layout",
        e => $(e.target).closest(".tl_group").find(".tl_layout_options").toggle("blind", { direction: "up" }, 120))
    // 外部タイムラインカラー変更イベント(動的バインド)
    $(document).on("blur", ".__txt_external_color",
        e => $(e.target).closest("li").find("h4").css("background-color", `#${$(e.target).val()}`))
    // カラム幅変更イベント(動的バインド)
    $(document).on("blur", ".__txt_col_width",
        e => $(e.target).closest(".column_box").css("width", `${$(e.target).val()}px`))
    // グループレイアウト変更イベント
    $(document).on("change", ".__cmb_tl_layout", e => GroupPref.changeLayoutEvent($(e.target)))
    // グループレイアウト閉じるボタン
    $(document).on("click", ".__on_layout_close",
        e => $(e.target).closest(".tl_layout_options").hide("blind", { direction: "up" }, 120))
    // グループ高変更イベント(動的バインド)
    $(document).on("blur", ".__txt_group_height", e => ColumnPref.recalcHeight($(e.target)))
    // 表示アカウント変更イベント(動的バインド)
    $(document).on("change", ".__cmb_tl_account", e => TimelinePref.changeAccountEvent($(e.target)))
    // 外部インスタンスアドレス変更イベント(動的バインド)
    $(document).on("change", ".__txt_external_instance", e => TimelinePref.changeExternalHostEvent($(e.target)))
    // タイムラインタイプ変更イベント(動的バインド)
    $(document).on("change", ".__cmb_tl_type", e => TimelinePref.changeTypeEvent($(e.target)))
    // 設定を保存ボタンイベント
    $("#on_save_pref").on("click", e => ColumnPref.save())
    // 戻るボタンイベント
    $("#on_close").on("click", e => window.open("index.html", "_self"))
    // 全体設定ボタンイベント
    $("#on_general_pref").on("click", e => Preference.openGeneralPrefConfig())
    // 全体設定-保存して閉じるボタンイベント
    $(document).on("click", "#__on_pref_save", e => Preference.saveGeneralPreference())
    // 全体設定-ウィンドウ閉じるボタンイベント
    $(document).on("click", "#pop_multi_window .window_close_button, #__on_pref_close", e => {
        const target_window = $(e.target).closest(".ex_window")
        target_window.hide(...Preference.getAnimation("WINDOW_FOLD"), () => target_window.remove())
    })
})

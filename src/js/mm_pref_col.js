$(() => {
    // カラム初期表示(非同期)
    (async () => {
        // メインプロセスメソッドが非同期なのでawaitかけてアカウント情報を取得
        await window.accessApi.readPrefAccs();
        await window.accessApi.readPrefCols();

        // データがなかったらDOM生成はしない
        if (ColumnPref.isEmpty()) {
            setColorPalette();
            return;
        }

        // カラム設定情報からDOMを生成
        ColumnPref.each(col => col.create())
        ColumnPref.setButtonPermission();
        setColorPalette();
    })();
    // カラムをSortableにする(これはカラムの有無にかかわらず実行)
    $(".__ui_sortable").sortable({
        axis: "x",
        delay: 100,
        distance: 48,
        handle: ".col_head",
        revert: 50,
        tolerance: "pointer"
    });

    // カラム追加ボタンイベント
    $("#on_add_column").on("click", e => ColumnPref.addColumn());
    // カラム削除ボタンイベント(動的バインド)
    $(document).on("click", ".__btn_del_col", e => ColumnPref.get($(e.target).closest("td")).removeColumn());
    // タイムライン追加ボタンイベント(動的バインド)
    $(document).on("click", ".__btn_add_tl", e => ColumnPref.get($(e.target).closest("td")).addTimeline());
    // タイムライン削除ボタンイベント(動的バインド)
    $(document).on("click", ".__btn_del_tl", 
        e => ColumnPref.get($(e.target).closest("td")).removeTimeline($(e.target).closest("li").index()));
    // カラムカラー変更イベント(動的バインド)
    $(document).on("blur", ".__txt_col_color",
        e => $(e.target).closest("td").find(".col_head").css("background-color", `#${$(e.target).val()}`));
    // 外部タイムラインカラー変更イベント(動的バインド)
    $(document).on("blur", ".__txt_external_color",
        e => $(e.target).closest("li").find("h4").css("background-color", `#${$(e.target).val()}`));
    // カラム幅変更イベント(動的バインド)
    $(document).on("blur", ".__txt_col_width",
        e => $(e.target).closest("td").css("width", `${$(e.target).val()}px`));
    // 表示アカウント変更イベント(動的バインド)
    $(document).on("change", ".__cmb_tl_account", e => TimelinePref.changeAccountEvent($(e.target)));
    // 外部インスタンスアドレス変更イベント(動的バインド)
    $(document).on("change", ".__txt_external_instance", e => TimelinePref.changeExternalHostEvent($(e.target)));
    // タイムラインタイプ変更イベント(動的バインド)
    $(document).on("change", ".__cmb_tl_type", e => TimelinePref.changeTypeEvent($(e.target)));
    // 設定を保存ボタンイベント
    $("#on_save_pref").on("click", e => ColumnPref.save());
    // 戻るボタンイベント
    $("#on_close").on("click", e => window.open("index.html", "_self"));
});

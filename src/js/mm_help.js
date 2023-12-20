$(() => {
    // ヘルプを表示
    $("#navi #on_help").on("click", e => {
        // ヘルプウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="help_col">
                <h2>Mistdon Help</h2>
                <nav class="help_navi"></nav>
                <div class="help_content"></div>
                <button type="button" id="__on_help_close" class="close_button">×</button>
            </div>
        `))
        $("#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)
        $.ajax({
            url: "help/help_main.html",
            cache: false
        }).then(data => {
            $.each($.parseHTML(data), (index, value) => {
                if ($(value).is("#help_navi")) $("#pop_extend_column .help_navi").html($(value));
                if ($(value).is("#main")) $("#pop_extend_column .help_content").html($(value));
            });
        });
    });
    // 閉じるボタンクリックイベント
    $(document).on("click", "#__on_help_close", 
        e => $("#pop_extend_column").hide("slide", { direction: "right" }, 150));
    $("body").keydown(e => {
        if (e.keyCode == 112) {
            if ($("#pop_extend_column").has(".help_col").is(":visible")) $("#__on_help_close").click();
            else $("#navi #on_help").click();
            return false;
        }
    });
});

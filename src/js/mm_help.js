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

    // TIPSタイマーセット
    if ($("#header>h1>.head_tips").length > 0 && Preference.GENERAL_PREFERENCE.enable_tips) {
        const timer_interval = 30000
        setTipsTimer(timer_interval);

        // スクロールアニメーションが終わったら再帰的にタイマーセットしてもとに戻す
        $("#header>h1>.head_tips").get(0).addEventListener('animationend', () => {
            $("#header>h1>.head_tips").hide().css('animation', '');
            $("#header>h1>.head_user").show("slide", { direction: "up" }, 500);
            setTipsTimer(timer_interval);
        });
    }
});

/**
 * #Util
 * Tipsをヘッダ部に表示させるタイマーをセットする関数
 * 
 * @param msec Tipsを表示させるインターバル(ミリセカンド)
 */
function setTipsTimer(msec) {
    // タイムアウトでTipsのHTMLを読み込む
    setTimeout(() => $.ajax({
        url: "help/help_tips.html",
        cache: false
    }).then(data => {
        $.each($.parseHTML(data), (index, value) => {
            if ($(value).is("#main")) {
                const tips_elms = $(value).find(".tips>li")
                const tips_length = tips_elms.length

                // ヘッダをTipsスクロールに切り替える
                $("#header>h1>.head_user").hide("slide", { direction: "down" }, 500, () => $("#header>h1>.head_tips")
                    .html(tips_elms.eq(Math.floor(Math.random() * tips_length)).html())
                    .show().css('animation', 'marquee-anim 20s linear'))
            }
        })
    }), msec)
}

const color_palette = [
    // デフォルトで選択できるカラーパレット
    'b53a2a', 'bf7a41', '56873b', '428a6f', '42809e', '3b5da1', '564391', '933ba1', 'b53667',
    '666666', '997460', '87995f', '738c83', '676a82', '996a88'
]

$(() => {
    // ナビゲーションメニューホバー時にツールチップ表示
    $("#navi").tooltip({
        position: {
            my: "left+15 bottom+2",
            at: "right center"
        },
        show: {
            effect: "slide",
            duration: 80
        },
        hide: {
            effect: "slide",
            duration: 80
        }
    });
    // 公開範囲ホバー時にツールチップ表示
    $("#header>#head_postarea").tooltip({
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
    });
    // ヘルプを表示
    $("#navi #on_help").on("click", e => {
        // ヘルプウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="help_col">
                <h2>Mistdon Help</h2>
                <div class="help_content"></div>
                <button type="button" id="__on_help_close">×</button>
            </div>
        `))
        $("#header>#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)
        $.ajax({
            url: "help/help_main.html",
            cache: false
        }).then(data => {
            $.each($.parseHTML(data), (index, value) => {
                if ($(value).is("#main")) $("#header>#pop_extend_column .help_content").html($(value));
            });
        });
    });
    // 閉じるボタンクリックイベント
    $(document).on("click", "#__on_help_close", 
        e => $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150));
    // 外部表示リンククリックイベント
    $(document).on("click", ".__lnk_external", e => {
        const url = $(e.target).closest("a").attr("href");
        window.accessApi.openExternalBrowser(url);
        // リンク先に飛ばないようにする
        return false;
    });
    $("body").keydown(e => {
        if (e.keyCode == 112) { // ヘルプだけは全画面共通
            if ($("#header>#pop_extend_column").has(".help_col").is(":visible")) $("#__on_help_close").click();
            else $("#navi #on_help").click();
            return false;
        }
    });
});

/**
 * #Renderer #jQuery
 * カラーフォームにカラーパレット表示機能を追加
 * (動的に生成する関係で後付しないと動かないので関数化)
 */
function setColorPalette(target) {
    if (target) {
        target.find(".__pull_color_palette")
            .after('<a class="__on_call_palette" title="ドラッグ&ドロップで色を選択できます">&nbsp;</a>');
        target.find(".__pull_color_palette+.__on_call_palette").tooltip({
            position: {
                my: "left+6 bottom+18",
                at: "right center"
            },
            show: {
                effect: "slide",
                duration: 80
            },
            hide: {
                effect: "slide",
                duration: 80
            }
        });
        return;
    }
    const palette_dom = $("#header>#pop_palette");
    color_palette.forEach(color => {
        palette_dom.append(`<a id="${color}" class="__on_select_color">&nbsp;</a>`);
        palette_dom.find('.__on_select_color:last-child').css("background-color", `#${color}`);
    });
    // カラーパレットの直後にパレット呼び出しボタンをセット
    $(".__pull_color_palette").each((index, elm) => {
        $(elm).after('<a class="__on_call_palette" title="ドラッグ&ドロップで色を選択できます">&nbsp;</a>');
        $(elm).next().css("background-color", `#${$(elm).val()}`);
    });
    $(".__on_call_palette").tooltip({
        position: {
            my: "left+6 bottom+18",
            at: "right center"
        },
        show: {
            effect: "slide",
            duration: 80
        },
        hide: {
            effect: "slide",
            duration: 80
        }
    });

    $(document).on("mousedown", ".__on_call_palette", e => {
        // イベントターゲットにするためのクラスを付与
        $(e.target).addClass("__target_color_button").prev().addClass("__target_color_box");

        palette_dom.css('top', (e.pageY + 12) + 'px').css('left', (e.pageX - 132) + 'px')
            .show("slide", { direction: "up" }, 50);
        return false;
    });
    $("body *").on("mouseup", e => {
        const target = $(e.target);
        if (target.is(".__on_select_color")) {
            const color = target.attr("id");
            $(".__target_color_box").val(color).blur();
            $(".__target_color_button").css("background-color", `#${color}`);
        }
        $("body *").removeClass("__target_color_button __target_color_box");
        palette_dom.hide("slide", { direction: "up" }, 50);
    });
}

/**
 * #Renderer #jQuery
 * トーストを表示
 * 
 * @param text 表示する文章
 * @param type トーストのタイプ
 * @param type トーストを一意に認識するためのID
 */
function toast(text, type, progress_id) {
    const toast_block = $("#header>#pop_toast");
    if (type != 'progress' && progress_id) {
        // progressモード以外でIDが渡ってきた場合は対象toastを削除
        const target_toast = toast_block.find(`#${progress_id}`);
        target_toast.hide("slide", { direction: "up" }, 120, () => target_toast.remove());
    }
    // hideの場合はそのまま終了
    if (type == 'hide') return;
    // トーストを画面に追加
    if (type == 'progress' && progress_id) 
        toast_block.append(`<span id="${progress_id}">${text}</span>`);
    else toast_block.append(`<span>${text}</span>`);
    const added = toast_block.find("span:last-child");
    if (type != 'progress') {
        // 実行中トースト以外は3秒後に消去する
        if (type == 'error') {
            added.addClass("toast_error");
            prependNotification(text, true);
        } else added.addClass("toast_done");
        // 3秒後に隠して要素自体を削除
        (async () => setTimeout(() => added.hide("slide", { direction: "up" }, 120, () => added.remove()), 3000))()
    } else added.addClass("toast_progress");
    // 追加アニメーション
    added.hide().show("slide", { direction: "up" }, 80);
}

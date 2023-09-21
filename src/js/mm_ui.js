const color_palette = [
    // デフォルトで選択できるカラーパレット
    'b53a2a', 'bf7a41', '56873b', '428a6f', '42809e', '3b5da1', '564391', '933ba1', 'b53667', '666666'
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
            duration: 100
        },
        hide: {
            effect: "slide",
            duration: 100
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
            duration: 100
        },
        hide: {
            effect: "slideUp",
            duration: 100
        }
    });
});

/**
 * #Renderer #jQuery
 * カラーフォームにカラーパレット表示機能を追加
 * (動的に生成する関係で後付しないと動かないので関数化)
 */
function setColorPalette() {
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
        target_toast.hide("slide", 1000, () => target_toast.remove());
    }
    if (type == 'hide') {
        // hideの場合はそのまま終了
        return;
    }
    // トーストを画面に追加
    if (type == 'progress' && progress_id) {
        toast_block.append(`<span id="${progress_id}">${text}</span>`);
    } else {
        toast_block.append(`<span>${text}</span>`);
    }
    const added = toast_block.find("span:last-child");
    if (type != 'progress') {
        // 実行中トースト以外は3秒後に消去する
        if (type == 'error') {
            added.css("background-color", "rgba(115,68,68,0.85)");
            prependNotification(text, true);
        } else {
            added.css("background-color", "rgba(68,83,115,0.85)");
        }
        // 3秒後に隠して要素自体を削除
        (async () => setTimeout(() => added.hide("slide", 500, () => added.remove()), 3000))()
    } else {
        // 実行中は初期カラーにもどす
        added.css("background-color", "rgba(32,32,32,0.85)");
    }
    // 追加アニメーション
    added.hide().show("slide", 250);
}

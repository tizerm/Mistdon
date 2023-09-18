const color_palette = [
    // デフォルトで選択できるカラーパレット
    '8a3f3f', '8a543f', '8a683f', '8a873f', '708a3f', '3f8a43', '3f8a63',
    '3f8a84', '3f6b8a', '3f4f8a', '573f8a', '7a3f8a', '8a3f77', '8a3f5b', '666666'
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
    /* TODO: バグの温床になっているので一旦カラーパレット機能をオミットします……
    // カラーパレットの生成と表示(フォーカス時)
    $(document).on("focus", ".__pull_color_palette", (e) => {
        // 最初にカラーパレットを生成
        $("#header>#pop_palette").append("<div></div>");
        const palette_dom = $("#header>#pop_palette>div:last-child");
        color_palette.forEach((color) => {
            palette_dom.append(`<a id="${color}" class="__on_select_color">&nbsp;</a>`);
            palette_dom.find('.__on_select_color:last-child').css("background-color", `#${color}`);
        });

        // 対象フォームの位置を取得して配置
        let pos = $(e.target).offset();
        pos.left -= 132; // 表示位置を微調整
        pos.top += 24;
        palette_dom.css(pos).show("slide", { direction: "up" }, 50);

        // イベントターゲットにするためのクラスを付与
        $(e.target).addClass("__target_color_box");
    });
    // カラーパレットの非表示と削除(フォーカスアウト時)
    $(document).on("blur", ".__pull_color_palette", (e) => {
        const palette_dom = $("#header>#pop_palette>div:first-child");
        (async () => setTimeout(() => palette_dom.hide("slide", { direction: "up" }, 50, () => {
            // 完全に消えたらDOM自体を消去してターゲットからクラスを外す
            palette_dom.remove();
            $(e.target).removeClass("__target_color_box");
        }), 100))()
    });
    // カラーパレットの色をフォームに適用(パレットクリック時)
    $(document).on("click", ".__on_select_color",
        (e) => $(".__target_color_box").val($(e.target).attr("id")).blur());
        //*/
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

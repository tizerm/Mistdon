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
 * カラムのオプションアイコンにツールチップを設定
 * (動的に生成する関係で後付しないと動かないので関数化)
 */
function setColumnTooltip() {
    // カラムオプションにツールチップ表示
    $("td .col_action").tooltip({
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
}

/**
 * #Renderer #jQuery
 * カラーフォームにカラーパレット表示機能を追加
 * (動的に生成する関係で後付しないと動かないので関数化)
 */
function setColorPalette() {
    // カラーパレットを設定
    const palette_dom = $("#header>#pop_palette");
    color_palette.forEach((color) => {
        palette_dom.append('<a id="' + color + '" class="__on_select_color">&nbsp;</a>');
        palette_dom.find('.__on_select_color:last-child').css("background-color", `#${color}`);
    });
    // カラーパレット表示(フォーカス時)
    $(document).on("focus", ".__pull_color_palette", (e) => {
        let pos = $(e.target).offset();
        $(".__pull_color_palette").removeClass("__target_color_box");
        $(e.target).addClass("__target_color_box");
        pos.left -= 132; // 表示位置を微調整
        pos.top += 24;
        $("#header>#pop_palette").css(pos).show("slide", { direction: "up" }, 120);
        // カラーパレット表示中は一時的にソート無効化
        $(".__ui_sortable").sortable("disable");
    });
    // カラーパレット消去(フォーカスアウト時)
    $(document).on("blur", ".__pull_color_palette", (e) => {
        $("#header>#pop_palette").hide();
        // ソート有効化
        $(".__ui_sortable").sortable("enable");
    });
    // カラーパレットの色をフォームに適用(パレットクリック時)
    $(document).on("click", ".__on_select_color", (e) => {
        $(".__target_color_box").val($(e.target).attr("id")).blur();
        $("#header>#pop_palette").hide("slide", { direction: "up" }, 150);
        // ソート有効化
        $(".__ui_sortable").sortable("enable");
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
    added.hide();
    added.show("slide", 250);
}

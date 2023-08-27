/**
 * #Renderer #jQuery
 * トーストを表示
 * 
 * @param text 表示する文章
 * @param type トーストのタイプ
 */
function toast(text, type) {
    const toast = $("#header>#pop_toast");
    if (type == 'hide') { // toast削除
        toast.css('visibility', 'hidden');
        return;
    }
    toast.html('<span>' + text + '</span>');
    if (type != 'progress') {
        // 実行中トースト以外は3秒後に消去する
        if (type == 'error') {
            toast.css("background-color", "rgba(115,68,68,0.85)");
        } else {
            toast.css("background-color", "rgba(68,83,115,0.85)");
        }
        (async () => setTimeout(() => toast.css('visibility', 'hidden'), 3000))()
    } else {
        // 実行中は初期カラーにもどす
        toast.css("background-color", "rgba(32,32,32,0.85)");
    }
    toast.css('visibility', 'visible');
}
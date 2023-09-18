/**
 * #Renderer #jQuery #TemplateLiteral
 * 特殊通知をタイムラインに追加
 * 
 * @param arg パラメータ一括指定JSON
 */
function prependInfo(arg) {
    const ul = $(`#columns>table #${arg.column_id}>ul`);
    ul.prepend(`<li class="inserted_info">${arg.text}</li>`)

    const added = ul.find("li:first-child");
    // 追加アニメーション
    added.hide().show("slide", { direction: "up" }, 200);
    if (arg.clear) {
        // インフォ一覧を消す場合は5秒後にすべて消滅させる
        const infos = ul.find(".inserted_info");
        (async () => setTimeout(() => ul.find(".inserted_info").remove(), 10000))()
    }
}

/**
 * #Renderer #jQuery
 * 通知ウィンドウに通知を追加
 * 
 * @param text 通知テキスト
 * @param error_flg エラーの場合はtrue
 */
function prependNotification(text, error_flg) {
    const ymd = Status.DATE_FORMATTER.format(new Date());
    $("#pop_notification_console").prepend(
        `${error_flg ? '<span class="console_error">' : '<span>'}${ymd}@${error_flg ? 'ERR' : 'INF'}: ${text}</span><br/>`);
    const count = Number($(".__on_show_notifications").text()) + 1;
    $(".__on_show_notifications").text(count);
}


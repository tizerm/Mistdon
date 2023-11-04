/**
 * #Renderer #jQuery 
 * 検索ウィンドウを生成
 */
function createSearchWindow() {
    // 検索カラムのDOM生成
    $("#pop_ex_timeline").html(`
        <h2>Toot/Note検索</h2>
        <div class="search_timeline">
            <div class="search_options">
                <input type="text" id="__txt_search_query" class="__ignore_keyborad" placeholder="(検索語句を入力してEnterで検索)"/>
                <button type="button" id="__on_search">search</button>
            </div>
            <div id="__search_timeline" class="timeline">
                <div class="col_loading">
                    <img src="resources/illust/il_done.png" alt="done"/><br/>
                    <span class="loading_text">検索結果がここに表示されます。</span>
                </div>
                <ul class="search_ul __context_posts"></ul>
            </div>
        </div>
        <button type="button" id="__on_search_close">×</button>
    `).show("slide", { direction: "right" }, 150, () => $("#__txt_search_query").focus())
}

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


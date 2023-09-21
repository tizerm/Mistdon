/**
 * #Renderer #jQuery
 * カラムのテンプレートを生成する
 * 中身は後入れ
 * 
 * @param column カラム情報のJSON
 */
function createColumn(column) {
    // カラム識別ID(新規作成の場合は識別IDを生成)
    const column_uuid = column?.column_id ?? `col_${crypto.randomUUID()}`;
    // カラム本体を空の状態で生成
    $("#columns>table>tbody>tr").append(`
        <td id="${column_uuid}" class="timeline ui-sortable">
            <div class="col_head">
                <h2><input type="text" class="__txt_col_head" value="${column?.label_head ?? ''}"/></h2>
                <div class="col_pref">
                    <input type="text" class="__txt_col_width" value="${column?.col_width ?? ''}" size="5"/>px
                </div>
            </div>
            <div class="col_option">
                <button type="button" class="__btn_add_tl">TL追加</button>
                <button type="button" class="__btn_del_col">列削除</button><br/>
                <input type="checkbox" id="dh_${column_uuid}" class="__chk_default_hide"${column?.d_hide ? ' checked' : ''}/>
                <label for="dh_${column_uuid}">デフォルトで閉じる</label><br/>
                <input type="checkbox" id="df_${column_uuid}" class="__chk_default_flex"${column?.d_flex ? ' checked' : ''}/>
                <label for="df_${column_uuid}">デフォルトで可変幅にする</label><br/>
                カラムカラー:
                #<input type="text" class="__txt_col_color __pull_color_palette" value="${column?.col_color ?? ''}" size="6"/>
            </div>
            <ul></ul>
        </td>
    `);
    // カラムレイアウトを変更
    if (column?.col_color) {
        $(`#columns>table #${column_uuid}>.col_head`).css("background-color", `#${column.col_color}`);
    }
    if (column?.col_width) {
        $(`#columns>table #${column_uuid}`).css("width", `${column.col_width}px`);
    }
    // カラムのUUIDを返却
    return column_uuid;
}

/**
 * #Renderer #jQuery
 * タイムライン設定JSONをHTMLとして生成
 * 
 * @param array_json 設定JSON
 * @param j カラム番号
 * @param accounts アカウントマップ
 */
function createTimelineOptions(col, accounts) {
    let html = '';
    $.each(col.timelines, (index, value) => {
        html += createTimelineOptionLine({
            value: value,
            index: index + 1,
            accounts: accounts
        });
    });
    $(`#columns>table #${col.column_id}>ul`).append(html);
}

/**
 * #Renderer #jQuery
 * タイムライン設定をHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 * @param index タイムライン番号
 * @param accounts アカウントマップ
 */
function createTimelineOptionLine(arg) {
    const uuid = crypto.randomUUID();
    let html = `
        <li>
            <h4><span class="tl_header_label">Timeline ${arg.index}</span></h4>
            <div class="tl_option">
                <div class="lbl_disp_account">
                    表示アカウント:<br/>
                    <select class="__cmb_tl_account">
    `;
    // アカウントをコンボボックスにセット
    arg.accounts?.forEach((v, k) => html += `
        <option value="${k}"${arg.value?.key_address == k ? ' selected' : ''}>${v.username} - ${k}</option>
    `);
    html += `
                    </select>
                </div>
                <div class="lbl_tl_type">
                    追加するカラムの種類:<br/>
                    <select class="__cmb_tl_type">
                        <option value="home"${arg.value?.timeline_type == 'home' ? ' selected' : ''}>ホーム</option>
                        <option value="local"${arg.value?.timeline_type == 'local' ? ' selected' : ''}>ローカル</option>
                        <option value="federation"${arg.value?.timeline_type == 'federation' ? ' selected' : ''}>連合</option>
                        <option value="notification"${arg.value?.timeline_type == 'notification' ? ' selected' : ''}>通知</option>
                    </select>
                </div>
                <div class="lbl_checkbox">
                    <input type="checkbox" id="xr_${uuid}" class="__chk_exclude_reblog"${arg.value?.exclude_reblog ? ' checked' : ''}/>
                    <label for="xr_${uuid}">ブースト/リノートを非表示</label>
                </div>
                <div class="foot_button">
                    <button type="button" class="__btn_del_tl">タイムラインを削除</button>
                </div>
            </div>
        </li>
    `;
    return html;
}

/**
 * #Renderer #jQuery
 * 使えるボタンと使えないボタンを再設定
 */
function setButtonPermission() {
    // タイムラインが1つの場合はタイムライン削除を禁止
    $("#columns>table>tbody>tr>td").each(
        (index, elm) => $(elm).find(".__btn_del_tl").prop("disabled", $(elm).find("li").length == 1));
}

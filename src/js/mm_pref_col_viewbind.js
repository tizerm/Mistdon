/**
 * #Renderer #jQuery
 * カラムのテンプレートを生成する
 * 中身は後入れ
 * 
 * @param col_json カラム情報のJSON
 */
function createColumn(col_json, index) {
    // カラム本体を空の状態で生成
    html = '<td id="col' + index + '" class="timeline ui-sortable">'
        + '<div class="col_head">'
        + '<h2><input type="text" class="__txt_col_head" value="' + (col_json?.label_head ?? '') + '"/></h2>'
        + '<div class="col_pref">'
        + '#<input type="text" class="__txt_col_color __pull_color_palette" value="' + (col_json?.col_color ?? '') + '" size="6"/>'
        + '</div><div class="col_layout">'
        + '<input type="text" class="__txt_col_width" value="' + (col_json?.col_width ?? '') + '" size="5"/>px'
        + '</div></div><div class="col_option">'
        + '<button type="button" class="__btn_add_tl">TL追加</button>'
        + '<button type="button" class="__btn_del_col">列削除</button>'
        + '<br/><input type="checkbox" id="dh_' + index + '" class="__chk_default_hide"' + (col_json?.d_hide ? ' checked' : '') + '/>'
        + '<label for="dh_' + index + '">デフォルトで閉じる</label>'
        + '<br/><input type="checkbox" id="df_' + index + '" class="__chk_default_flex"' + (col_json?.d_flex ? ' checked' : '') + '/>'
        + '<label for="df_' + index + '">デフォルトで可変幅にする</label>'
        + '</div><ul></ul></td>';
    $("#columns>table>tbody>tr").append(html);
    
    // カラムレイアウトを変更
    if (col_json?.col_color) {
        $("#columns>table #col" + index + ">.col_head")
            .css("background-color", "#" + col_json.col_color);
    }
    if (col_json?.col_width) {
        $("#columns>table #col" + index)
            .css("width", col_json.col_width + "px");
    }
}

/**
 * #Renderer #jQuery
 * タイムライン設定JSONをHTMLとして生成
 * 
 * @param array_json 設定JSON
 * @param j カラム番号
 * @param accounts アカウントマップ
 */
function createTimelineOptions(array_json, j, accounts) {
    let html = '';
    $.each(array_json, (index, value) => {
        html += createTimelineOptionLine({
            value: value,
            col_num: j,
            index: index + 1,
            accounts: accounts
        });
    });
    $("#columns>table #col" + j + ">ul").append(html);
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
    let html = '<li>'
        + '<h4><span class="tl_header_label">Timeline ' + arg.index
        + '</span></h4>'
        + '<div class="tl_option"><div class="lbl_disp_account">'
        + '表示アカウント:<br/><select class="__cmb_tl_account">';
        // アカウントセット
        arg.accounts?.forEach((v, k) => {
            html += '<option value="' + k + '"' + (arg.value?.key_address == k ? ' selected' : '') + '>'
                + v.username + ' - ' + k + '</option>';
        });
    html += '</select></div><div class="lbl_tl_type">'
        + '追加するカラムの種類:<br/><select class="__cmb_tl_type">'
        + '<option value="home"' + (arg.value?.timeline_type == 'home' ? ' selected' : '') + '>ホーム</option>'
        + '<option value="local"' + (arg.value?.timeline_type == 'local' ? ' selected' : '') + '>ローカル</option>'
        + '<option value="federation"' + (arg.value?.timeline_type == 'federation' ? ' selected' : '') + '>連合</option>'
        + '<option value="notification"' + (arg.value?.timeline_type == 'notification' ? ' selected' : '') + '>通知</option>'
        + '</select></div><div class="lbl_checkbox">'
        + '<input type="checkbox" id="xr_' + arg.col_num + '_' + arg.index + '" class="__chk_exclude_reblog"' + (arg.value?.exclude_reblog ? ' checked' : '') + '/>'
        + '<label for="xr_' + arg.col_num + '_' + arg.index + '">ブースト/リノートを非表示</label>'
        + '</div><div class="foot_button">'
        + '<button type="button" class="__btn_del_tl">タイムラインを削除</button>'
        + '</div></div></li>';
    return html;
}

/**
 * #Renderer #jQuery
 * カラムのDOMを削除
 * 
 * @param target_td 削除対象のtd要素のjQueryオブジェクト
 */
function removeColumn(target_td) {
    target_td.remove();
}

/**
 * #Renderer #jQuery
 * 使えるボタンと使えないボタンを再設定
 */
function setButtonPermission() {
    $("#columns>table>tbody>tr>td").each((index, elm) => {
        // 左右ボタンは一旦有効にする
        $(elm).find(".__btn_to_left").prop("disabled", false);
        $(elm).find(".__btn_to_right").prop("disabled", false);
        
        // タイムラインが1つの場合はタイムライン削除を禁止
        const single_tl_flg = $(elm).find("li").length == 1;
        $(elm).find(".__btn_del_tl").prop("disabled", single_tl_flg);
    });
    // 最初の最後のカラムの左右ボタンを禁止する
    $("#columns>table>tbody>tr>td:first-child").find(".__btn_to_left").prop("disabled", true);
    $("#columns>table>tbody>tr>td:last-child").find(".__btn_to_right").prop("disabled", true);
}

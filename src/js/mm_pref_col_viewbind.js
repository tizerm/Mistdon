/**
 * #Renderer #jQuery
 * カラムのテンプレートを生成する
 * 中身は後入れ
 * 
 * @param col_json カラム情報のJSON
 */
function createColumn(col_json, index) {
	// カラムヘッダを生成
	var html = '<th id="col' + index + '_head" class="head">'
		+ '<h2><input type="text" class="__txt_col_head" value="' + (col_json?.label_head ?? '') + '" size="50"/></h2>'
		+ '<h3><input type="text" class="__txt_col_type" value="' + (col_json?.label_type ?? '') + '" size="50"/></h3>'
		+ '<div class="col_layout">'
		+ '#<input type="text" class="__txt_col_color" value="' + (col_json?.col_color ?? '') + '" size="8"/><br/>'
		+ '<input type="text" class="__txt_col_width" value="' + (col_json?.col_width ?? '') + '" size="8"/>px'
		+ '</div></th>';
	$("#columns>table>thead>tr").append(html);
	
	// カラム本体を空の状態で生成
	html = '<td id="col' + index + '_body" class="timeline">'
		+ '<div class="col_option">'
		+ '<button type="button" class="__btn_to_left">＜</button>'
		+ '<button type="button" class="__btn_add_tl">TL追加</button>'
		+ '<button type="button" class="__btn_del_col">列削除</button>'
		+ '<button type="button" class="__btn_to_right">＞</button>'
		+ '</div><ul></ul></td>';
	$("#columns>table>tbody>tr").append(html);
	
	// カラムレイアウトを変更
	if (col_json?.col_color) {
		$("#columns>table>thead>tr>#col" + index + "_head")
			.css("background-color", "#" + col_json.col_color);
	}
	if (col_json?.col_width) {
		$("#columns>table>thead>tr>#col" + index + "_head")
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
	var html = '';
	$.each(array_json, (index, value) => {
		html += createTimelineOptionLine(value, index + 1, accounts);
	});
	$("#columns>table>tbody>tr>#col" + j + "_body>ul").append(html);
}

/**
 * #Renderer #jQuery
 * タイムライン設定をHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 * @param index タイムライン番号
 * @param accounts アカウントマップ
 */
function createTimelineOptionLine(value, index, accounts) {
	var html = '<li>'
		+ '<h4><span class="tl_header_label">Timeline ' + index
		+ '</span><div class="tl_color">'
		+ '#<input type="text" class="__txt_tl_color" value="' + (value?.tl_color ?? '') + '" size="8"/>'
		+ '</div></h4>'
		+ '<div class="tl_option"><div class="lbl_disp_account">'
		+ '表示アカウント:<br/><select class="__cmb_tl_account">';
		// アカウントセット
		accounts?.forEach((v, k) => {
			html += '<option value="' + k + '"' + (value?.key_address == k ? ' selected' : '') + '>'
				+ v.username + ' - ' + k + '</option>';
		});
	html += '</select></div><div class="lbl_tl_type">'
		+ '追加するカラムの種類:<br/><select class="__cmb_tl_type">'
		+ '<option value="home"' + (value?.timeline_type == 'home' ? ' selected' : '') + '>ホーム</option>'
		+ '<option value="local"' + (value?.timeline_type == 'local' ? ' selected' : '') + '>ローカル</option>'
		+ '<option value="federation"' + (value?.timeline_type == 'federation' ? ' selected' : '') + '>連合</option>'
		+ '<option value="notification"' + (value?.timeline_type == 'notification' ? ' selected' : '') + '>通知</option>'
		+ '</select></div><div class="foot_button">'
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
	// カラムの番号を指定して削除
	var index = target_td.index();
	$("#columns>table>thead>tr>th").eq(index).remove();
	target_td.remove();
}

/**
 * #Renderer #jQuery
 * カラムを左右に移動
 * 
 * @param target_td 移動対象のtd要素のjQueryオブジェクト
 * @param move 移動方向(-1が左、1が右)
 */
function moveColumn(target_td, move) {
	// まず移動対象のヘッダも取得
	var index = target_td.index();
	var target_th = $("#columns>table>thead>tr>th").eq(index);
	
	switch (move) {
		case 1: // 右に移動
			target_td.insertAfter(target_td.next());
			target_th.insertAfter(target_th.next());
			//removeColumn(target_td);
			break;
		case -1: // 左に移動
			target_td.insertBefore(target_td.prev());
			target_th.insertBefore(target_th.prev());
			//removeColumn(target_td);
			break;
		default:
			break;
	}
}
/**
 * #Renderer #jQuery
 * 使えるボタンと使えないボタンを再設定
 */
function setButtonPermission() {
	var columns = $("#columns>table>tbody>tr>td");
	$("#columns>table>tbody>tr>td").each((index, elm) => {
		// 左右ボタンは一旦有効にする
		$(elm).find(".__btn_to_left").prop("disabled", false);
		$(elm).find(".__btn_to_right").prop("disabled", false);
		
		// タイムラインが1つの場合はタイムライン削除を禁止
		var single_tl_flg = $(elm).find("li").length == 1;
		$(elm).find(".__btn_del_tl").prop("disabled", single_tl_flg);
	});
	// 最初の最後のカラムの左右ボタンを禁止する
	$("#columns>table>tbody>tr>td:first-child").find(".__btn_to_left").prop("disabled", true);
	$("#columns>table>tbody>tr>td:last-child").find(".__btn_to_right").prop("disabled", true);
}

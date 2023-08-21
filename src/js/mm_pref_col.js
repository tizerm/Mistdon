$(() => {
	// ロードされた段階で認証情報を見に行く
	var accounts = null;
	var columns = null;
	const getFunc = async () => {
		// メインプロセスメソッドが非同期なのでawaitかけてアカウント情報を取得
		accounts = await window.accessApi.readPrefAccs();
		columns = await window.accessApi.readPrefCols();
		
		// データがなかったらDOM生成はしない
		if (!columns) {
			return;
		}
		
		// カラム設定情報からDOMを生成
		columns.forEach((col, index) => {
			createColumn(col, index + 1);
			createTimelineOptions(col.timelines, index + 1, accounts);
		});
		// タイムラインカラーを初期設定
		$(".__txt_tl_color").each((index, elm) => {
			var color = $(elm).val();
			$(elm).closest("h4").css("background-color", "#" + color);
		});
		setButtonPermission();
	}
	getFunc()
	
	// カラム追加ボタンイベント
	$("#on_add_column").on("click", (e) => {
		// カラム数を取得してカラムDOM生成と単体のタイムラインDOM生成を実行
		var index = $("#columns>table>thead>tr>th").length;
		createColumn(null, index + 1);
		$("#columns>table>tbody>tr>td").eq(index)
			.find("ul").append(createTimelineOptionLine(null, 1, accounts));
		setButtonPermission();
	});

	// カラム削除ボタンイベント(動的バインド)
	$(document).on("click", ".__btn_del_col", (e) => {
		// ボタンを押したカラムのtdを取得してタイムラインDOM生成を実行
		removeColumn($(e.target).closest("td"));
		setButtonPermission();
	});

	// カラム左移動ボタンイベント(動的バインド)
	$(document).on("click", ".__btn_to_left", (e) => {
		// ボタンを押したカラムのtdを取得してタイムラインDOM生成を実行
		moveColumn($(e.target).closest("td"), -1);
		setButtonPermission();
	});

	// カラム右移動ボタンイベント(動的バインド)
	$(document).on("click", ".__btn_to_right", (e) => {
		// ボタンを押したカラムのtdを取得してタイムラインDOM生成を実行
		moveColumn($(e.target).closest("td"), 1);
		setButtonPermission();
	});

	// タイムライン追加ボタンイベント(動的バインド)
	$(document).on("click", ".__btn_add_tl", (e) => {
		// ボタンを押したカラムのulリストを取得してタイムラインDOM生成を実行
		var ul = $(e.target).closest("td").find("ul");
		var index = ul.children().length + 1;
		ul.append(createTimelineOptionLine(null, index, accounts));
		setButtonPermission();
	});

	// タイムライン削除ボタンイベント(動的バインド)
	$(document).on("click", ".__btn_del_tl", (e) => {
		// 削除前に親のulのオブジェクトを保持
		var ul = $(e.target).closest("ul");
		// ボタンのあるタイムラインDOMを削除する
		$(e.target).closest("li").remove();
		ul.children().each((index, elm) => {
			// タイムラインの連番を再生成
			$(elm).find(".tl_header_label").text("Timeline " + (index + 1));
		});
		setButtonPermission();
	});
	
	// カラムカラー変更イベント(動的バインド)
	$(document).on("blur", ".__txt_col_color", (e) => {
		// カラムカラーを入力した色にする
		var target = $(e.target);
		target.closest("th").css("background-color", "#" + target.val());
	});

	// タイムラインカラー変更イベント(動的バインド)
	$(document).on("blur", ".__txt_tl_color", (e) => {
		// カラムカラーを入力した色にする
		var target = $(e.target);
		target.closest("h4").css("background-color", "#" + target.val());
	});

	// カラム幅変更イベント(動的バインド)
	$(document).on("blur", ".__txt_col_width", (e) => {
		// カラム幅を入力した幅にする
		var target = $(e.target);
		target.closest("th").css("width", target.val() + "px");
	});

	// 設定を保存ボタンイベント
	$("#on_save_pref").on("click", (e) => {
		// 現在のカラムを構成しているDOMのHTML構造から設定JSONを生成する
		var col_list = [];
		$("#columns>table>thead>tr>th").each((col_index, col_elm) => {
			var target_th = $(col_elm);
			// タイムライン一覧を走査
			var tl_list = [];
			$("#columns>table>tbody>tr>td").eq(target_th.index()).find("li").each((tl_index, tl_elm) => {
				// アカウントコンボボックスの値を取得
				var acc_address = $(tl_elm).find(".__cmb_tl_account").val();
				// 各フォームの情報をJSONでリストに追加
				tl_list.push({
					'key_address': acc_address,
					'timeline_type': $(tl_elm).find(".__cmb_tl_type").val(),
					'account': accounts.get(acc_address),
					'tl_color': $(tl_elm).find(".__txt_tl_color").val()
				});
			});
			// 各フォームの情報をJSONでリストに追加
			col_list.push({
				'label_head': $(col_elm).find(".__txt_col_head").val(),
				'label_type': $(col_elm).find(".__txt_col_type").val(),
				'timelines': tl_list,
				'col_color': $(col_elm).find(".__txt_col_color").val(),
				'col_width': $(col_elm).find(".__txt_col_width").val(),
			});
		});
		// ファイルに追加する処理を書く(整形はメインプロセスで)
		window.accessApi.writePrefCols(col_list);
		
		alert("カラム設定を保存しました。");
	});

	// 戻るボタンイベント
	$("#on_close").on("click", (e) => {
		window.open("index.html", "_self");
	});

});

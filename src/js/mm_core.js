$(() => {
	// ロードされた段階でカラムを生成
	var accounts = null;
	var columns = null;
	const viewFunc = async () => {
		// メインプロセスメソッドが非同期なのでawaitかけてアカウント情報を取得
		accounts = await window.accessApi.readPrefAccs();
		// 認証情報がなかったら何もせずに終わる
		if (!accounts) {
			return;
		}
		// メインプロセスメソッドが非同期なのでawaitかけてカラム情報を取得
		columns = await window.accessApi.readPrefCols();
		// カラム情報がなかったら何もせずに終わる
		if (!columns) {
			return;
		}
		
		// カラム生成処理
		columns.forEach((col) => {
			// カラム本体を生成
			createColumn(col);
			col.timelines.forEach((tl) => {
				// 配列のAPI呼び出しパラメータを使ってタイムラインを生成
				// クエリパラメータにlimitプロパティを事前に追加
				tl.query_param.limit = 30;
				$.ajax({
					type: "GET",
					url: tl.api_url,
					dataType: "json",
					headers: { "Authorization": "Bearer " + accounts.get(tl.key_address).access_token },
					data: tl.query_param
				}).then((data) => {
					// 取得成功時
					createTimelineMast(data, col.column_id + "_body");
					console.log(data);
				}).catch((jqXHR, textStatus, errorThrown) => {
					// 取得失敗時
					console.log('!ERR: timeline get failed. ' + textStatus);
				});
			});
		});
	}
	viewFunc()
	/*

	// TL取得ボタンイベント
	$("#on_gettl_msky").on("click", function(e) {
		// ajaxでタイムラインのJSONを取得
		var access_token = "";
		
		$.ajax({
			type: "POST",
			url: "https://misskey.design/api/notes/timeline",
			dataType: "json",
			headers: { "Content-Type": "application/json" },
			data: JSON.stringify({
				'limit': 40,
				'i': access_token
			})
		}).done(function(data) {
			// 取得成功時
			createHeader("Misskey", "col3_head");
			createTimelineMsky(data, "col3_body");
			console.log(data);
		}).fail(function(jqXHR, textStatus) {
			// 取得失敗時
			console.log(jqXHR);
			alert( "Request failed: " + textStatus );
		});
	});
	//*/
});

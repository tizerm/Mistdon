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
					url: tl.rest_url,
					dataType: "json",
					headers: { "Authorization": "Bearer " + accounts.get(tl.key_address).access_token },
					data: tl.query_param
				}).then((data) => {
					// 取得成功時
					if (tl.timeline_type == 'notification') {
						// 通知欄の場合
						createNotificationMast(data, col.column_id + "_body");
					} else {
						// タイムラインの場合
						createTimelineMast(data, col.column_id + "_body");
					}
				}).catch((jqXHR, textStatus, errorThrown) => {
					// 取得失敗時
					console.log('!ERR: timeline get failed. ' + textStatus);
				});
				// REST API呼び出してる間にStreaming API用のWebSocketを準備
				var socket = new WebSocket(tl.socket_url
					+ "&access_token=" + accounts.get(tl.key_address).access_token);
				socket.addEventListener("message", (event) => {
					// 更新通知が来た場合
					var data = JSON.parse(event.data);
					if (data.event == "update") {
						// タイムラインの更新通知
						$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
							.prepend(createTimelineMastLine(JSON.parse(data.payload)));
					} else if (tl.timeline_type == "notification" && data.event == "notification") {
						// 通知の更新通知
						$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
							.prepend(createNotificationMastLine(JSON.parse(data.payload)));
					}
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

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
		
		// 事前にCWと閲覧注意のイベントを設定
		$(document).on("click", ".expand_header", (e) => {
			$(e.target).next().toggle();
		});
		// カラム生成処理
		columns.forEach((col) => {
			// カラム本体を生成
			createColumn(col);
			col.timelines.forEach((tl) => {
				// 配列のAPI呼び出しパラメータを使ってタイムラインを生成
				// クエリパラメータにlimitプロパティを事前に追加
				tl.query_param.limit = 30;
				var tl_acc = accounts.get(tl.key_address);
				
				// プラットフォームによって通信様式が違うので個別に設定
				switch (tl_acc.platform) {
					case 'Mastodon': // Mastodon
						$.ajax({
							type: "GET",
							url: tl.rest_url,
							dataType: "json",
							headers: { "Authorization": "Bearer " + tl_acc.access_token },
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
							console.log(data); // デバッグ
						}).catch((jqXHR, textStatus, errorThrown) => {
							// 取得失敗時
							console.log('!ERR: timeline get failed. ' + textStatus);
						});
						// REST API呼び出してる間にStreaming API用のWebSocketを準備
						var socket = new WebSocket(tl.socket_url
							+ "&access_token=" + tl_acc.access_token);
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
						socket.addEventListener("error", (event) => {
							// HTTPエラーハンドルした場合
							alert(tl.key_address + "で接続エラーが発生しました、再接続してください。");
							console.log(event);
						});
						break;
					case 'Misskey': // Misskey
						// クエリパラメータにアクセストークンをセット
						tl.query_param.i = tl_acc.access_token;
						$.ajax({
							type: "POST",
							url: tl.rest_url,
							dataType: "json",
							headers: { "Content-Type": "application/json" },
							data: JSON.stringify(tl.query_param)
						}).then((data) => {
							// 取得成功時
							if (tl.timeline_type == 'notification') {
								// 通知欄の場合
								// TODO: 未実装
								//createNotificationMast(data, col.column_id + "_body");
							} else {
								// タイムラインの場合
								createTimelineMsky(data, col.column_id + "_body");
							}
							console.log(data); // デバッグ
						}).catch((jqXHR, textStatus, errorThrown) => {
							// 取得失敗時
							console.log('!ERR: timeline get failed. ' + textStatus);
						});
						// TODO: WebSocketによるリアルタイム通信はちょい待って
						break;
					default:
						break;
				}
			});
		});
	}
	viewFunc()
});

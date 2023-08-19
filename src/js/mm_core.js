$(() => {
	// ロードされた段階でカラムを生成
	var accounts = null;
	var columns = null;
	var sockets = null;
	var send_params = null;
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
		
		// 事前にWebSocketマップとCWと閲覧注意のイベントを設定
		sockets = new Map();
		send_params = new Map();
		$(document).on("click", ".expand_header", (e) => {
			$(e.target).next().toggle();
		});
		// カラム生成処理
		columns.forEach((col) => {
			// カラム本体を生成
			createColumn(col);
			col.timelines.forEach((tl) => {
				// 配列のAPI呼び出しパラメータを使ってタイムラインを生成
				// クエリパラメータにlimitプロパティを事前に追加(これはMastodonとMisskeyで共通)
				tl.query_param.limit = 30;
				var tl_acc = accounts.get(tl.key_address);
				
				// プラットフォームによって通信様式が違うので個別に設定
				switch (tl_acc.platform) {
					case 'Mastodon': // Mastodon
						// 最初にREST APIで最新TLを30件取得
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
							console.log(tl.key_address + tl.timeline_type);
							console.log(data); // TODO: デバッグ
						}).catch((jqXHR, textStatus, errorThrown) => {
							// 取得失敗時
							console.log('!ERR: timeline get failed. ' + textStatus);
						});
						// REST API呼び出してる間にStreaming API用のWebSocketを準備
						var socket_exist_flg = sockets.has(tl.key_address);
						if (!socket_exist_flg) {
							// アカウントのWebSocket存在しない場合はコネクションの確立から始める
							sockets.set(tl.key_address, new WebSocket(
								tl_acc.socket_url + "?access_token=" + tl_acc.access_token));
							send_params.set(tl.key_address, []);
						}
						var skt = sockets.get(tl.key_address);
						// 更新通知のイベントハンドラーを作る
						skt.addEventListener("message", (event) => {
							var data = JSON.parse(event.data);
							if (data.stream[0] != tl.socket_param.stream) {
								// TLと違うStreamは無視
								return;
							}
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
						// ソケットパラメータに受信開始の設定をセット
						tl.socket_param.type = "subscribe";
						//skt.send(JSON.stringify(tl.socket_param));
						send_params.get(tl.key_address).push(JSON.stringify(tl.socket_param));
						if (!socket_exist_flg) {
							// ソケットを初めて作る場合はエラーハンドルもする
							skt.addEventListener("error", (event) => {
								// HTTPエラーハンドルした場合
								alert(tl.key_address + "で接続エラーが発生しました、再接続してください。");
								console.log(event);
							});
						}
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
								createNotificationMsky(data, col.column_id + "_body");
							} else {
								// タイムラインの場合
								createTimelineMsky(data, col.column_id + "_body");
							}
							console.log(tl.key_address + tl.timeline_type);
							console.log(data); // TODO: デバッグ
						}).catch((jqXHR, textStatus, errorThrown) => {
							// 取得失敗時
							console.log('!ERR: timeline get failed. ' + textStatus);
						});
						// REST API呼び出してる間にStreaming API用のWebSocketを準備
						var socket_exist_flg = sockets.has(tl.key_address);
						if (!socket_exist_flg) {
							// アカウントのWebSocket存在しない場合はコネクションの確立から始める
							sockets.set(tl.key_address, new WebSocket(
								tl_acc.socket_url + "?i=" + tl_acc.access_token));
							send_params.set(tl.key_address, []);
						}
						var skt = sockets.get(tl.key_address);
						var uuid = crypto.randomUUID();
						// 更新通知のイベントハンドラーを作る
						skt.addEventListener("message", (event) => {
							var data = JSON.parse(event.data);
							if (data.body.id != uuid) {
								// TLと違うStreamは無視
								return;
							}
							if (data.body.type == "note") {
								// タイムラインの更新通知
								$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
									.prepend(createTimelineMskyLine(data.body.body));
							} else if (tl.timeline_type == "notification" && data.body.type == "notification") {
								// 通知の更新通知
								$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
									.prepend(createNotificationMskyLine(data.body.body));
							}
						});
						// ソケットパラメータに受信開始の設定をセット
						tl.socket_param.id = uuid;
						/*
						skt.send(JSON.stringify({
							'type': 'connect',
							'body': tl.socket_param
						}));//*/
						send_params.get(tl.key_address).push(JSON.stringify({
							'type': 'connect',
							'body': tl.socket_param
						}));
						if (!socket_exist_flg) {
							// ソケットを初めて作る場合はエラーハンドルもする
							skt.addEventListener("error", (event) => {
								// HTTPエラーハンドルした場合
								alert(tl.key_address + "で接続エラーが発生しました、再接続してください。");
								console.log(event);
							});
						}
						break;
					default:
						break;
				}
			});
		});
		// すべてのカラムを生成し終えたタイミングでWebSocketのopenイベントに送信処理をバインド
		sockets.forEach((v, k) => {
			v.addEventListener("open", (event) => {
				send_params.get(k).forEach((p) => {
					v.send(p);
				});
			});
		});
	}
	viewFunc()
});

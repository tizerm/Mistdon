$(() => {
	// ロードされた段階でカラムを生成
	var accounts = null;
	var columns = null;
	var sockets = null;
	var send_params = null;
	var post_keysets = null;
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
		post_keysets = new Map();
		$(document).on("click", ".expand_header", (e) => {
			$(e.target).next().toggle();
		});
		// カラム生成処理
		columns.forEach((col) => {
			// カラム本体を生成
			createColumn(col);
			// タイムライン取得処理のプロミスを格納する配列と投稿のユニークキーを格納するセット
			var rest_promises = [];
			post_keysets.set(col.column_id, new Set());
			const keyset = post_keysets.get(col.column_id);
			col.timelines.forEach((tl) => {
				// 配列のAPI呼び出しパラメータを使ってタイムラインを生成
				// クエリパラメータにlimitプロパティを事前に追加(これはMastodonとMisskeyで共通)
				tl.query_param.limit = 30;
				var tl_acc = accounts.get(tl.key_address);
				
				// プラットフォームによって通信様式が違うので個別に設定
				switch (tl_acc.platform) {
					case 'Mastodon': // Mastodon
						// 最初にREST APIで最新TLを30件取得、する処理をプロミス配列に追加
						rest_promises.push(
							$.ajax({
								type: "GET",
								url: tl.rest_url,
								dataType: "json",
								headers: { "Authorization": "Bearer " + tl_acc.access_token },
								data: tl.query_param
							}).then((data) => {
								const mapFunc = async () => {
									// 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
									var toots = [];
									data.forEach((toot) => {
										toots.push(getIntegratedPost(toot, tl, tl_acc));
									});
									return toots;
								}
								return mapFunc();
							}));
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
							// 別のデータが来たときに余計な処理を挟まないよう同じ処理だけどif内で書く
							if (data.event == "update") {
								// タイムラインの更新通知
								var integrated = getIntegratedPost(JSON.parse(data.payload), tl, tl_acc);
								// 重複している投稿を除外する
								if (!keyset.has(integrated.post_key)) {
									keyset.add(integrated.post_key);
									$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
										.prepend(createTimelineMastLine(integrated.post));
								}
							} else if (tl.timeline_type == "notification" && data.event == "notification") {
								// 通知の更新通知
								var integrated = getIntegratedPost(JSON.parse(data.payload), tl, tl_acc);
								// 重複している投稿を除外する
								if (!keyset.has(integrated.post_key)) {
									keyset.add(integrated.post_key);
									$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
										.prepend(createNotificationMastLine(integrated.post));
								}
							}
						});
						// ソケットパラメータに受信開始の設定をセット
						tl.socket_param.type = "subscribe";
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
						// 最初にREST APIで最新TLを30件取得、する処理をプロミス配列に追加
						rest_promises.push(
							$.ajax({
								type: "POST",
								url: tl.rest_url,
								dataType: "json",
								headers: { "Content-Type": "application/json" },
								data: JSON.stringify(tl.query_param)
							}).then((data) => {
								const mapFunc = async () => {
									// 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
									var notes = [];
									data.forEach((note) => {
										notes.push(getIntegratedPost(note, tl, tl_acc));
									});
									return notes;
								}
								return mapFunc();
							}));
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
							// 別のデータが来たときに余計な処理を挟まないよう同じ処理だけどif内で書く
							if (data.body.type == "note") {
								// タイムラインの更新通知
								var integrated = getIntegratedPost(data.body.body, tl, tl_acc);
								// 重複している投稿を除外する
								if (!keyset.has(integrated.post_key)) {
									keyset.add(integrated.post_key);
									$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
										.prepend(createTimelineMskyLine(integrated.post));
								}
							} else if (tl.timeline_type == "notification" && data.body.type == "notification") {
								// 通知の更新通知
								var integrated = getIntegratedPost(data.body.body, tl, tl_acc);
								// 重複している投稿を除外する
								if (!keyset.has(integrated.post_key)) {
									keyset.add(integrated.post_key);
									$("#columns>table>tbody>tr>#" + col.column_id + "_body>ul")
										.prepend(createNotificationMskyLine(integrated.post));
								}
							}
						});
						// ソケットパラメータに受信開始の設定をセット
						tl.socket_param.id = uuid;
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
			// カラムのすべてのタイムラインのREST APIが呼び出し終わったか判定するためにPromise.allを使用
			Promise.all(rest_promises).then((datas) => {
				// タイムラインのPromise配列を走査
				var postlist = [];
				datas.forEach((posts) => {
					posts.forEach((p) => {
						// 重複している投稿を除外する
						if (!keyset.has(p.post_key)) {
							postlist.push(p);
							keyset.add(p.post_key);
						}
					});
				});
				//*
				console.log(col.label_head); // TODO: debug
				console.log(keyset); // TODO: debug
				console.log(postlist); // TODO: debug
				//*/
				// すべてのデータを配列に入れたタイミングで配列を日付順にソートする(単一TLのときはしない)
				if (datas.length > 1) {
					postlist.sort((a, b) => new Date(b.sort_date) - new Date(a.sort_date));
				}
				// ソートが終わったらタイムラインをDOMに反映
				createIntegratedTimeline(postlist,  col.column_id + "_body");
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

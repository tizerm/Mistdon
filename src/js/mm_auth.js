$(() => {
	// ドメイン入力時のイベント
	$("#txt_mst_instance_domain").on("blur", (e) => {
		var instance_domain = $("#txt_mst_instance_domain").val();
		if (!instance_domain) {
			// 空の場合は表示リセット
			$("#lbl_mst_instance_name").text("(Instance Name)");
			return;
		}
	
		// ajaxでインスタンス情報を取得
		$.ajax({
			type: "GET",
			url: "https://" + instance_domain + "/api/v2/instance",
			dataType: "json"
		}).then((data) => {
			// 取得できたらインスタンス情報をセット
			console.log(data);
			$("#lbl_mst_instance_name").text(data.title);
		}).catch((jqXHR, textStatus, errorThrown) => {
			// 取得失敗時はエラー文字を入れる(v3.x.xは取得できない)
			$("#lbl_mst_instance_name").text("(不正なインスタンスかv3.x.x以下です)");
		});
	});

	/*============================================================================================*/
	// ↓Mastodonの認証ロジック↓

	// 認証ボタンイベント(インスタンスを検索)
	$("#on_mst_auth_instance").on("click", (e) => {
		var instance_domain = $("#txt_mst_instance_domain").val();
		var permission = ["read", "write", "follow", "push"].join(" ");
	
		// ajaxでアプリケーション登録
		$.ajax({
			type: "POST",
			url: "https://" + instance_domain + "/api/v1/apps",
			dataType: "json",
			headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
			data: {
				"client_name": "MMchan",
				"redirect_uris": "urn:ietf:wg:oauth:2.0:oob",
				"scopes": permission,
				"website": "https://github.com/tizerm/MMchan"
			}
		}).then((data) => {
			// 認証に成功したらクライアントIDを保存してウィンドウを開く
			$("#hdn_client_id").val(data.client_id);
			$("#hdn_client_secret").val(data.client_secret);
			window.open("https://" + instance_domain
				+ "/oauth/authorize?client_id=" + data.client_id
				+ "&scope=" + encodeURIComponent(permission)
				+ "&response_type=code&redirect_uri=urn:ietf:wg:oauth:2.0:oob", "_blank");
		}).catch((jqXHR, textStatus, errorThrown) => {
			// 取得失敗時
			alert( "Request failed: " + textStatus );
		});
	});

	// 登録ボタンイベント(アクセストークン取得)
	$("#on_mst_auth_token").on("click", (e) => {
		var access_token = null;

		var instance_domain = $("#txt_mst_instance_domain").val();
		var auth_code = $("#txt_mst_auth_code").val();
		var client_id = $("#hdn_client_id").val();
		var client_secret = $("#hdn_client_secret").val();

		// ajaxでOAuth認証
		$.ajax({
			type: "POST",
			url: "https://" + instance_domain + "/oauth/token",
			dataType: "json",
			headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
			data: {
				"client_id": client_id,
				"client_secret": client_secret,
				"redirect_uri": "urn:ietf:wg:oauth:2.0:oob",
				"grant_type": "authorization_code",
				"code": auth_code
			}
		}).then((data) => {
			// 認証に成功した場合そのアクセストークンを使って認証アカウントの情報を取得(Promise返却)
			access_token = data.access_token;
			return $.ajax({
				type: "GET",
				url: "https://" + instance_domain + "/api/v1/accounts/verify_credentials",
				dataType: "json",
				headers: { "Authorization": "Bearer " + access_token }
			});
		}).then((data) => {
			// アカウント情報の取得に成功した場合はユーザー情報とアクセストークンを保存
			window.accessApi.writePrefMstdAccs({
				'domain': instance_domain,
				'user_id': data.username,
				'username': data.display_name,
				"client_id": client_id,
				"client_secret": client_secret,
				'access_token': access_token,
				'avatar_url': data.avatar
			});
			alert("アカウントの認証に成功しました！");
		}).catch((jqXHR, textStatus, errorThrown) => {
			// 取得失敗時
			alert( "Request failed: " + textStatus );
		});
	});

	/*============================================================================================*/
	// ↓Misskeyの認証ロジック↓

	// 認証ボタンイベント(アプリ登録と認証)
	$("#on_msk_auth_instance").on("click", (e) => {
		var instance_domain = $("#txt_msk_instance_domain").val();
		var permission = ["read:account", "read:notes", "write:notes", "write:blocks",
			"read:drive", "read:favorites", "write:favorites", "read:following", "write:following",
			"write:mutes", "read:notifications", "read:reactions", "write:reactions",
			"write:votes", "read:channels", "write:channels"];
	
		// ajaxでアプリケーション登録
		$.ajax({
			type: "POST",
			url: "https://" + instance_domain + "/api/app/create",
			dataType: "json",
			headers: { "Content-Type": "application/json" },
			data: JSON.stringify({
				'name': 'MMchan',
				'description': 'This is Electron base Mastodon and Misskey client.',
				'permission': permission
			})
		}).then((data) => {
			// アプリ登録に成功したらsecretを保存して認証セッションを開始
			$("#hdn_app_secret").val(data.secret);
			return $.ajax({
				type: "POST",
				url: "https://" + instance_domain + "/api/auth/session/generate",
				dataType: "json",
				headers: { "Content-Type": "application/json" },
				data: JSON.stringify({
					'appSecret': data.secret
				})
			});
		}).then((data) => {
			// 無事にレスポンスが返ったらtokenを保存して認証許可ウィンドウを生成
			$("#hdn_app_token").val(data.token);
			window.open(data.url, "_blank");
		}).catch((jqXHR, textStatus, errorThrown) => {
			// 取得失敗時
			alert( "Request failed: " + textStatus );
		});
	});

	// 登録ボタンイベント(アクセストークンの生成と保存)
	$("#on_msk_auth_token").on("click", (e) => {
		var instance_domain = $("#txt_msk_instance_domain").val();
		var app_secret = $("#hdn_app_secret").val();
		var app_token = $("#hdn_app_token").val();

		// ajaxでアクセストークン取得
		$.ajax({
			type: "POST",
			url: "https://" + instance_domain + "/api/auth/session/userkey",
			dataType: "json",
			headers: { "Content-Type": "application/json" },
			data: JSON.stringify({
				'appSecret': app_secret,
				'token': app_token
			})
		}).then((data) => {
			// 無事にレスポンスが返ったら、返ってきたアクセストークンをメインプロセスに渡す
			window.accessApi.writePrefMskyAccs({
				'domain': instance_domain,
				'user': data.user,
				'app_secret': app_secret,
				'access_token': data.accessToken
			});
			alert("アカウントの認証に成功しました！");
		}).catch((jqXHR, textStatus, errorThrown) => {
			// 取得失敗時
			alert( "Request failed: " + textStatus );
		});
	});
});

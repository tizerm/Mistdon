$(() => {
    // ロードされた段階でアカウントリストを生成(非同期)
    (async () => {
        // 保険用にアカウント情報とカラム情報が読めてなかったら一時停止
        if (!await window.accessApi.readPrefAccs()) return;
        
        // アカウント情報をもとにアカウントリストを生成
        $("#content>#account_list>ul").html(Account.createAccountPrefList());
        $(".__ui_sortable").sortable({
            axis: "y",
            delay: 100,
            distance: 48,
            handle: "h3",
            revert: 50,
            tolerance: "pointer"
        });
        setColorPalette();

        // アカウントカラー変更時イベントを追加
        $(document).on("blur", ".__txt_acc_color", (e) => {
            // アカウントカラーを入力した色にする
            const target = $(e.target);
            target.closest("li").find("h3").css("background-color", `#${target.val()}`);
        });
        // アカウントカラー初期設定
        $(".__txt_acc_color").each((index, elm) => {
            const target = $(elm);
            target.closest("li").find("h3").css("background-color", `#${target.val()}`);
        });
        
        // アカウントカラー反映ボタン
        $("#on_save_color").on("click", e => (async () => {
            const toast_uuid = crypto.randomUUID();
            toast("アカウント設定を保存中です...", "progress", toast_uuid);

            const param_json = [];
            // awaitを使えるようにforでループする
            for (const elm of $("#content>#account_list>ul>li").get()) {
                const userinfo = await Account.get($(elm).find(".userid").text()).getInfo();
                param_json.push({
                    'user_id': userinfo?.user_id ?? null,
                    'username': userinfo?.username ?? null,
                    'avatar_url': userinfo?.avatar_url ?? null,
                    'key_address': $(elm).find(".userid").text(),
                    'acc_color': $(elm).find(".__txt_acc_color").val()
                });
            }
            // アカウントカラーをファイルに書き込み
            await window.accessApi.writePrefAccColor(param_json);
            toast("アカウント設定を保存しました.", "done", toast_uuid);
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "設定を保存しました。",
                // OKボタンを押してから画面をリロード
                accept: () => location.reload()
            });
        })());

        // アカウント認証解除ボタンイベント
        $(document).on("click", ".__btn_unauth_acc", e => dialog({
            type: 'confirm',
            title: "アカウント認証解除",
            text: "このアカウントのこのアプリケーションとの認証を解除します。<br/>よろしいですか？",
            accept: () => { // OKボタン押下時の処理
                const target_li = $(e.target).closest("li");
                const target_account = Account.get(target_li.attr("name"));
                target_account.unauthorize(() => {
                    target_li.remove();
                    $("#on_save_color").click();
                });
            }
        }));
    })()

    /*================================================================================================================*/

    // プラットフォーム選択でMastodonを選択したときのイベント
    $("#on_platform_mastodon").on("click",
        (e) => $("#select_platform").hide("slide", { direction: "right" }, 200,
        () => $("#form_mastodon").show("slide", { direction: "right" }, 200)));
    // プラットフォーム選択でMisskeyを選択したときのイベント
    $("#on_platform_misskey").on("click",
        (e) => $("#select_platform").hide("slide", { direction: "right" }, 200,
        () => $("#form_misskey").show("slide", { direction: "right" }, 200)));
    // 前に戻るボタン
    $(".__on_return").on("click",
        (e) => $(e.target).closest(".platform_section").hide("slide", { direction: "right" }, 200,
        () => $("#select_platform").show("slide", { direction: "right" }, 200)));
    // 前に戻るボタン(認証コード画面版)
    $(".__on_instance_return").on("click",
        (e) => $(e.target).closest(".auth_form").hide("slide", { direction: "right" }, 200,
        () => $(".instance_form").show("slide", { direction: "right" }, 200)));
    // 最初に戻るボタン
    $(".__on_return_top").on("click",
        (e) => $(e.target).closest(".platform_section").hide("slide", { direction: "right" }, 200, () => {
            $("#select_platform").show("slide", { direction: "right" }, 200);
            $(".instance_form").show();
            $(".auth_form").hide();
        }));

    // ドメイン入力時のイベント
    $("#txt_mst_instance_domain").on("blur", (e) => {
        const instance_domain = $("#txt_mst_instance_domain").val();
        if (!instance_domain) {
            // 空の場合は表示リセット
            $("#lbl_mst_instance_name").text("(Instance Name)");
            return;
        }

        // ajaxでインスタンス情報を取得
        $.ajax({
            type: "GET",
            url: `https://${instance_domain}/api/v2/instance`,
            dataType: "json"
        }).then(data => {
            // 取得できたらインスタンス情報をセット
            console.log(data);
            $("#lbl_mst_instance_name").text(data.title);
        }).catch(jqXHR => {
            // 取得失敗時はエラー文字を入れる(v3.x.xは取得できない)
            $("#lbl_mst_instance_name").text("(不正なインスタンスかv3.x.x以下です)");
        });
    });

    /*================================================================================================================*/
    // ↓Mastodonの認証ロジック↓

    // 認証ボタンイベント(インスタンスを検索)
    $("#on_mst_auth_instance").on("click", (e) => {
        const instance_domain = $("#txt_mst_instance_domain").val();
        const permission = ["read", "write", "follow", "push"].join(" ");

        // ajaxでアプリケーション登録
        $.ajax({
            type: "POST",
            url: `https://${instance_domain}/api/v1/apps`,
            dataType: "json",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            data: {
                "client_name": "Mistdon",
                "redirect_uris": "urn:ietf:wg:oauth:2.0:oob",
                "scopes": permission,
                "website": "https://github.com/tizerm/Mistdon"
            }
        }).then(data => {
            // 認証に成功したらクライアントIDを保存して外部ブラウザで認証画面を開く
            $("#hdn_client_id").val(data.client_id);
            $("#hdn_client_secret").val(data.client_secret);
            window.accessApi.openExternalBrowser(
                `https://${instance_domain}/oauth/authorize?client_id=${data.client_id}&scope=${encodeURIComponent(permission)}&response_type=code&redirect_uri=urn:ietf:wg:oauth:2.0:oob`
            );
            // 画面を認証コード画面に遷移
            $("#form_mastodon>.instance_form").hide("fade", 500, () => $("#form_mastodon>.auth_form").show("fade", 500));
        }).catch(jqXHR => dialog({
            type: 'alert',
            title: "アカウント設定",
            text: "認証リクエスト実行中に問題が発生しました。"
        }));
    });

    // 登録ボタンイベント(アクセストークン取得)
    $("#on_mst_auth_token").on("click", (e) => {
        let access_token = null;

        const instance_domain = $("#txt_mst_instance_domain").val();
        const auth_code = $("#txt_mst_auth_code").val();
        const client_id = $("#hdn_client_id").val();
        const client_secret = $("#hdn_client_secret").val();

        // ajaxでOAuth認証
        $.ajax({
            type: "POST",
            url: `https://${instance_domain}/oauth/token`,
            dataType: "json",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            data: {
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": "urn:ietf:wg:oauth:2.0:oob",
                "grant_type": "authorization_code",
                "code": auth_code
            }
        }).then(data => {
            // 認証に成功した場合そのアクセストークンを使って認証アカウントの情報を取得(Promise返却)
            access_token = data.access_token;
            return $.ajax({
                type: "GET",
                url: `https://${instance_domain}/api/v1/accounts/verify_credentials`,
                dataType: "json",
                headers: { "Authorization": `Bearer ${access_token}` }
            });
        }).then(data => (async () => {
            // アカウント情報の取得に成功した場合はユーザー情報とアクセストークンを保存
            await window.accessApi.writePrefMstdAccs({
                'domain': instance_domain,
                'user_id': data.username,
                'username': data.display_name,
                "client_id": client_id,
                "client_secret": client_secret,
                'access_token': access_token,
                'avatar_url': data.avatar
            });
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "アカウントの認証に成功しました！",
                // OKボタンを押してから画面をリロード
                accept: () => location.reload()
            });
        })()).catch(jqXHR => dialog({
            type: 'alert',
            title: "アカウント設定",
            text: "認証リクエスト実行中に問題が発生しました。"
        }));
    });

    /*================================================================================================================*/
    // ↓Misskeyの認証ロジック↓

    // 認証ボタンイベント(アプリ登録と認証)
    $("#on_msk_auth_instance").on("click", (e) => {
        const instance_domain = $("#txt_msk_instance_domain").val();
        const permission = ["read:account", "read:notes", "write:notes", "write:blocks",
            "read:drive", "read:favorites", "write:favorites", "read:following", "write:following",
            "write:mutes", "read:notifications", "read:reactions", "write:reactions",
            "write:votes", "read:channels", "write:channels"];
    
        // ajaxでアプリケーション登録
        $.ajax({
            type: "POST",
            url: `https://${instance_domain}/api/app/create`,
            dataType: "json",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                'name': 'Mistdon',
                'description': 'This is Electron base Mastodon and Misskey client.',
                'permission': permission
            })
        }).then(data => {
            // アプリ登録に成功したらsecretを保存して認証セッションを開始
            $("#hdn_app_secret").val(data.secret);
            return $.ajax({
                type: "POST",
                url: `https://${instance_domain}/api/auth/session/generate`,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ 'appSecret': data.secret })
            });
        }).then(data => {
            // 無事にレスポンスが返ったらtokenを保存して認証許可ウィンドウを生成
            $("#hdn_app_token").val(data.token);
            window.accessApi.openExternalBrowser(data.url);
            // 画面を認証コード画面に遷移
            $("#form_misskey>.instance_form").hide("fade", 500, () => $("#form_misskey>.auth_form").show("fade", 500));
        }).catch(jqXHR => dialog({
            type: 'alert',
            title: "アカウント設定",
            text: "認証リクエスト実行中に問題が発生しました。"
        }));
    });

    // 登録ボタンイベント(アクセストークンの生成と保存)
    $("#on_msk_auth_token").on("click", (e) => {
        const instance_domain = $("#txt_msk_instance_domain").val();
        const app_secret = $("#hdn_app_secret").val();
        const app_token = $("#hdn_app_token").val();

        // ajaxでアクセストークン取得
        $.ajax({
            type: "POST",
            url: `https://${instance_domain}/api/auth/session/userkey`,
            dataType: "json",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                'appSecret': app_secret,
                'token': app_token
            })
        }).then(data => (async () => {
            // 無事にレスポンスが返ったら、返ってきたアクセストークンをメインプロセスに渡す
            await window.accessApi.writePrefMskyAccs({
                'domain': instance_domain,
                'user': data.user,
                'app_secret': app_secret,
                'access_token': data.accessToken
            });
            dialog({
                type: 'alert',
                title: "アカウント設定",
                text: "アカウントの認証に成功しました！",
                // OKボタンを押してから画面をリロード
                accept: () => location.reload()
            });
        })());
    });
});

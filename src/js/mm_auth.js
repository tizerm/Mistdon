$(() => {
    // ロードされた段階でアカウントリストを生成(非同期)
    (async () => {
        // 保険用にアカウント情報とカラム情報が読めてなかったら一時停止
        if (!await window.accessApi.readPrefAccs()) return;
        
        // アカウント情報をもとにアカウントリストを生成
        $("#content>#account_list>ul").html(await Account.createAccountPrefList());
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
            target.closest(".account_box").find("h3").css("background-color", `#${target.val()}`);
        });
        
        // アカウントカラー反映ボタン
        $("#on_save_color").on("click", e => (async () => {
            const toast_uuid = crypto.randomUUID();
            toast("アカウント設定を保存中です...", "progress", toast_uuid);

            const param_json = [];
            // awaitを使えるようにforでループする
            for (const elm of $("#content>#account_list>ul>li").get()) {
                const userinfo = await Account.get($(elm).find(".userid").text()).getInfo();
                let maxlength = 500;
                try { // サーバーごとの投稿文字数上限を設定
                    const instance = await userinfo.getInstance();
                    maxlength = instance.post_maxlength
                } catch (err) {
                    console.log(err)
                }
                param_json.push({
                    'user_id': userinfo?.user_id ?? null,
                    'username': userinfo?.username ?? null,
                    'avatar_url': userinfo?.avatar_url ?? null,
                    'key_address': $(elm).find(".userid").text(),
                    'post_maxlength': maxlength,
                    'acc_color': $(elm).find(".__txt_acc_color").val(),
                    'default_local': $(elm).find(".__chk_default_local").prop("checked") ?? null,
                    'default_channel': $(elm).find(".__cmb_default_channel").val() ?? null
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
                target_account.unauthorize().then(() => dialog({
                    type: 'alert',
                    title: "アカウント認証解除",
                    text: "アカウントの認証解除に成功しました。",
                    // OKボタンを押してから画面をリロード
                    accept: () => {
                        target_li.remove()
                        $("#on_save_color").click()
                    }
                })).catch(err => dialog({
                    type: 'alert',
                    title: "アカウント認証解除",
                    text: "アカウントの認証解除に失敗しました。<br/>処理を中断します。",
                }))
            }
        }));
    })()

    /*================================================================================================================*/

    // ドメイン入力時のイベント
    $("#txt_instance_domain").on("blur", e => {
        // 一旦認証ボタンを無効化
        $("#on_auth_instance").prop("disabled", true)
        const instance_domain = $(e.target).val();
        const info_dom = $(e.target).closest("#select_platform").find(".instance_info")
        Instance.showInstanceName(instance_domain, info_dom).then(instance => {
            if (!instance) return // インスタンスが確認できなかった場合はなにもしない
            $(e.target).closest("#select_platform").find(".__hdn_instance_platform").val(instance.platform)
            $("#on_auth_instance").prop("disabled", false)
            Instance.AUTH_INSTANCE = instance
        })
    });

    // 認証ボタン押したときのイベント
    $("#on_auth_instance").on("click", e => Instance.AUTH_INSTANCE.authorize().then(data => {
        switch (data.platform) {
            case 'Mastodon': // Mastodon
                $("#select_platform").hide("fade", 500, () => $("#form_mastodon").show("fade", 500));
                break
            case 'Misskey': // Misskey
                $("#select_platform").hide("fade", 500, () => $("#form_misskey").show("fade", 500));
                break
            default:
                break
        }
    }));

    // Mastodonの登録ボタンを押したときのイベント
    $("#on_mst_auth_token").on("click", e => Instance.AUTH_INSTANCE.saveTokenMastodon($("#txt_mst_auth_code").val()));

    // Misskeyの登録ボタンを押したときのイベント
    $("#on_msk_auth_token").on("click", e => Instance.AUTH_INSTANCE.saveTokenMisskey());

});

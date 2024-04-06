﻿$(() => {
    /*=== On Load Process ========================================================================================*/

    (async () => {
        // 保険用にアカウント情報とカラム情報が読めてなかったら一時停止
        if (!await window.accessApi.readPrefAccs()) return

        // アカウント情報をもとにアカウントリストを生成
        $("#content>#account_list>ul").html(await Account.createAccountPrefList())
        $(".__ui_sortable").sortable({
            axis: "y",
            delay: 100,
            distance: 48,
            handle: "h3",
            revert: 50,
            tolerance: "pointer"
        })
        setColorPalette()

        // アカウントカラー初期設定
        $(".__txt_acc_color").each((index, elm) => {
            const target = $(elm)
            target.closest(".account_box").find("h3").css("background-color", `#${target.val()}`)
        })
    })()

    /*=== Authorize Window Events ================================================================================*/

    /**
     * #Event #Blur
     * アカウントリスト: アカウントカラー変更時処理.
     * => アカウントカラーを入力した色にする
     */
    $(document).on("blur", ".__txt_acc_color", e => {
        const target = $(e.target)
        target.closest("li").find("h3").css("background-color", `#${target.val()}`)
    })

    /**
     * #Event
     * アカウントリスト: アカウント設定を保存.
     * => アカウントの追加設定を保存する
     */
    $("#on_save_account_info").on("click", e => (async () => {
        const toast_uuid = crypto.randomUUID()
        toast("アカウント設定を保存中です...", "progress", toast_uuid)

        const param_json = []
        // awaitを使えるようにforでループする
        for (const elm of $("#content>#account_list>ul>li").get()) {
            const userinfo = await Account.get($(elm).find(".userid").text()).getInfo()
            let maxlength = 500
            try { // サーバーごとの投稿文字数上限を設定
                const instance = await userinfo.getInstance()
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
            })
        }
        // アカウントカラーをファイルに書き込み
        await window.accessApi.writePrefAccColor(param_json)
        toast("アカウント設定を保存しました.", "done", toast_uuid)
        dialog({
            type: 'alert',
            title: "アカウント設定",
            text: "設定を保存しました。",
            // OKボタンを押してから画面をリロード
            accept: () => location.reload()
        })
    })())

    /**
     * #Event
     * アカウントリスト: 認証解除ボタン.
     * => アカウント認証解除を実行
     */
    $(document).on("click", ".__btn_unauth_acc", e => {
        const target_li = $(e.target).closest("li")
        const target_account = Account.get(target_li.attr("name"))

        // 認証解除処理はMastodonとMisskeyでやることが違うので分岐
        switch (target_account.pref.platform) {
            case 'Mastodon': // Mastodon
                dialog({ // Mastodonは普通に認証解除処理を実行
                    type: 'confirm',
                    title: "アカウント認証解除",
                    text: "このアカウントのMistdonとの認証を解除します。<br/>よろしいですか？",
                    // OKボタン押下時の処理
                    accept: () => target_account.unauthorize().then(() => dialog({
                        type: 'alert',
                        title: "アカウント認証解除",
                        text: "アカウントの認証解除に成功しました。",
                        // OKボタンを押してから画面をリロード
                        accept: () => {
                            target_li.remove()
                            $("#on_save_account_info").click()
                        }
                    })).catch(err => dialog({
                        type: 'alert',
                        title: "アカウント認証解除",
                        text: "アカウントの認証解除に失敗しました。<br/>処理を中断します。",
                    }))
                })
                break
            case 'Misskey': // Misskey
                dialog({ // MisskeyはDOM上から消すだけ
                    type: 'confirm',
                    title: "アカウント認証情報削除",
                    text: "このアカウントの認証情報をMistdonから削除します。<br/>よろしいですか？",
                    // OKボタン押下時の処理
                    accept: () => {
                        target_li.remove()
                        dialog({
                            type: 'alert',
                            title: "アカウント認証情報削除",
                            text: `アカウントの認証情報を削除しました。<br/>
                                Misskeyはサードパーティアプリからアプリの認証解除ができないため、<br/>
                                認証情報を完全に削除する場合は、ブラウザで対象のサーバーを開き、<br/>
                                設定 -> API -> アクセストークンの管理からMistdonのアプリ情報を削除してください。`,
                            // OKボタンを押してから画面をリロード
                            accept: () => $("#on_save_account_info").click()
                        })
                    }
                })
                break
            default:
                break
        }
    })

    /**
     * #Event #Blur
     * 新規アカウント認証: ドメイン入力ボックス(フォーカスアウト).
     * => 入力ドメインからインスタンスを推定して認証待機状態にする
     */
    $("#txt_instance_domain").on("blur", e => {
        // 一旦認証ボタンを無効化
        $("#on_auth_instance, #on_auth_instance_oauth").prop("disabled", true)
        const instance_domain = $(e.target).val()
        const info_dom = $(e.target).closest("#select_platform").find(".instance_info")
        Instance.showInstanceName(instance_domain, info_dom).then(instance => {
            if (!instance) return // インスタンスが確認できなかった場合はなにもしない
            $(e.target).closest("#select_platform").find(".__hdn_instance_platform").val(instance.platform)
            $("#on_auth_instance, #on_auth_instance_oauth").prop("disabled", false)
            $("#on_auth_instance_oauth").text(instance.platform == 'Misskey' ? 'MiAuth認証' : 'OAuth認証')
            Instance.AUTH_INSTANCE = instance
        })
    })

    /**
     * #Event
     * 新規アカウント認証: OAuth認証ボタン.
     * => OAuth認証セッションを開始(以降の処理はメインプロセスに移譲)
     */
    $("#on_auth_instance_oauth").on("click", e => Instance.AUTH_INSTANCE.openOAuth())

    /**
     * #Event
     * 新規アカウント認証: 認証ボタン(旧方式).
     * => アプリ登録方式の認証セッションを開始
     */
    $("#on_auth_instance").on("click", e => Instance.AUTH_INSTANCE.authorize().then(data => {
        switch (data.platform) {
            case 'Mastodon': // Mastodon
                $("#select_platform").hide("fade", 500, () => $("#form_mastodon").show("fade", 500))
                break
            case 'Misskey': // Misskey
                $("#select_platform").hide("fade", 500, () => $("#form_misskey").show("fade", 500))
                break
            default:
                break
        }
    }))

    /**
     * #Event
     * 新規アカウント認証: 登録ボタン(旧方式).
     * => インスタンスにアクセストークン取得リクエストを送信してアカウントを登録
     */
    $("#on_mst_auth_token").on("click", e => Instance.AUTH_INSTANCE.saveTokenMastodon($("#txt_mst_auth_code").val()))
    $("#on_msk_auth_token").on("click", e => Instance.AUTH_INSTANCE.saveTokenMisskey())

    /**
     * #Event
     * 新規アカウント認証: キャンセルボタン(旧方式).
     * => 認証セッションを放棄して前の状態に戻る
     */
    $(".on_close_auth").on("click", e => {
        $(".platform_section").hide()
        $("#select_platform").show("fade", 120)
    })

})
$(() => {
    /*=== On Load Process ========================================================================================*/

    (async () => {
        // 保険用にアカウント情報とカラム情報が読めてなかったら一時停止
        if (!await window.accessApi.readPrefAccs()) return

        ;(async () => { // アカウント情報をもとにアカウントリストを生成(非同期実行)
            $("#content>#account_list>ul").before(`
                <div class="col_loading">
                    <img src="resources/illust/ani_wait.png" alt="Now Loading..."/><br/>
                    <span class="loading_text">Now Loading...</span>
                </div>
            `)
            const html = await Account.createAccountPrefList()
            $("#content>#account_list>.col_loading").remove()
            $("#content>#account_list>ul").html(html)

            // アカウントカラー初期設定
            $(".__txt_acc_color").each((index, elm) => {
                const target = $(elm)
                target.closest(".account_box").find("h3").css("background-color", target.val())
            })
        })()
        $(".__ui_sortable").sortable({
            axis: "y",
            delay: 100,
            distance: 48,
            handle: "h3",
            revert: 50,
            tolerance: "pointer"
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
        target.closest("li.account_box").find("h3").css("background-color", target.val())
    })

    /**
     * #Event
     * アカウントリスト: アカウント設定を保存.
     * => アカウントの追加設定を保存する
     */
    $("#on_save_account_info").on("click", e => (async () => {
        const notification = Notification.progress("アカウント設定を保存中です...")
        trimHexColor() // 色情報を変換

        const param_json = []
        const profile_update = $("#__chk_update_profile").prop("checked")
        // awaitを使えるようにforでループする
        for (const elm of $("#content>#account_list>ul>li").get()) {
            const account = Account.get($(elm).find(".userid").text())
            let userinfo = null
            // チェックが入っている場合はユーザープロフィールを更新
            if (profile_update) userinfo = await account.getInfo()
            else userinfo = { // 更新しない場合は設定オブジェクトをそのまま生成
                user_id: account.pref.user_id,
                username: account.pref.username,
                avatar_url: account.pref.avatar_url
            }
            let maxlength = account.pref.post_maxlength
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
        notification.done("アカウント設定を保存しました.")
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
                    text: `
                        このアカウントの認証情報をMistdonから削除します。<br/>
                        よろしいですか？<br/><br/>
                        ※Misskeyアカウントのため、Misskey側のアクセストークンを削除することはできません。<br/>
                        詳細はヘルプの「アカウント管理/認証画面」＞「アカウント一覧」＞「認証解除」を参照ください。
                    `,
                    // OKボタン押下時の処理
                    accept: () => {
                        target_li.remove()
                        $("#on_save_account_info").click()
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
            $("#on_auth_instance_oauth>span").text(instance.platform == 'Misskey' ? 'MiAuth認証' : 'OAuth認証')
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

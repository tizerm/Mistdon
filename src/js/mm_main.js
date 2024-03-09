﻿// HTMLロード時に非同期で実行
$(() => (async () => {
    // 設定ファイル不在での起動制御
    await window.accessApi.readPrefAccs()
    await window.accessApi.readPrefCols()
    await window.accessApi.readGeneralPref()
    await window.accessApi.readWindowPref()
    await window.accessApi.readCustomEmojis()

    if (Account.isEmpty()) { // アカウントが未登録(これだけではストップしない)
        $("#header>#head_postarea .__lnk_postuser>img").attr('src', 'resources/illust/ic_unauth.jpg')
        $("#header>h1").text('認証されているアカウントがありません。 - Mistdon')
    } else { // 投稿ユーザーリストを作って先頭のアカウントをセット
        $("#pop_postuser>ul").html(Account.createPostAccountList())
        $("#post_options .additional_users ul").html(Account.createAdditionalPostAccountList())
        Account.get(0).setPostAccount()
    }
    if (Column.isEmpty()) { // カラムが未登録(この場合はストップする)
        $("#columns").prepend(`
            <div class="__initial_message">
                アカウントの認証 <img src="resources/ic_auth.png" class="ic_inline"/>
                とカラムの設定 <img src="resources/ic_pref.png" class="ic_inline"/>
                からはじめよう！<br/>
                わからないときは左下の？をクリックするかF1キーでヘルプを表示できます。
            </div>
        `)
        return
    }

    // カスタム絵文字のキャッシュ確認
    Account.cacheEmojis()

    ;(async () => { // 右クリック時のメニュー生成(時間かかるのでこのセクションだけ非同期実行)
        $("#pop>.pop_context>.ui_menu>li ul.account_menu").each((index, elm) => {
            // プラットフォーム指定がある場合は対象プラットフォームのアカウントだけ抽出
            if ($(elm).attr("name")) $(elm).html(Account.createContextMenuAccountList($(elm).attr("name")))
            // それ以外は全アカウントをリストに表示
            else $(elm).html(Account.createContextMenuAccountList())
        })
        const limited_renote_html = await Account.createContextLimitedRenoteList()
        $("#pop>.pop_context>.ui_menu>li ul.limited_renote_menu").html(limited_renote_html)
        $("#pop>.pop_context>.ui_menu").menu()
    })()

    // 添付メディアリストをSortableにする
    $(".__ui_media_sortable").sortable({
        axis: "x",
        delay: 100,
        distance: 48,
        placeholder: "ui-sortable-placeholder",
        cancel: ".__initial_message",
        revert: 50,
        opacity: 0.75,
        tolerance: "pointer"
    })
    // 一時タイムラインウィンドウをドラッグ/リサイズ可能にする
    $("#pop_window_timeline").draggable({
        handle: "h2",
        stop: (ext, ui) => Preference.storeTempWindowPosition(ui)
    })
    $("#pop_window_timeline").resizable({
        stop: (ext, ui) => Preference.storeTempWindowSize(ui),
        handles: "all"
    })
    // 一時タイムラインウィンドウの保存をするイベントを登録
    Preference.setTempWindow()
    window.addEventListener("beforeunload", e => Preference.saveTempWindowPref($("#pop_window_timeline")))
    // 投稿フォームの各種ボタン表示制御
    if (!Preference.GENERAL_PREFERENCE.enable_tool_button) $("#header>#head_postarea>.opt_buttons").hide()
    if (!Preference.GENERAL_PREFERENCE.enable_post_button) $("#header>#head_postarea>.submit_button").hide()
    if (!Preference.GENERAL_PREFERENCE.enable_last_edit_button) $("#header>#head_postarea>.additional_buttons").hide()
    if (Preference.GENERAL_PREFERENCE.hide_additional_account) // 投稿オプションの投稿アカウントを自動で閉じる
        $("#header>#post_options .additional_users .__on_option_close").click()
    enabledAdditionalAccount(true)

    // ツールチップを設定表示
    $("#header>#head_postarea").tooltip({
        position: {
            my: "center top",
            at: "center bottom"
        },
        show: {
            effect: "slideDown",
            duration: 80
        },
        hide: {
            effect: "slideUp",
            duration: 80
        }
    })
    $("#pop_expand_action, #post_options").tooltip({
        position: {
            my: "center bottom-8",
            at: "center top"
        }
        ,
        show: {
            effect: "fade",
            duration: 80
        },
        hide: {
            effect: "fade",
            duration: 80
        }
    })

    // カラム生成
    Column.each(col => {
        col.create()
        // タイムライン取得処理をプロミス配列に格納してWebSocketの設定をセット
        col.eachGroup(gp => {
            const rest_promises = []
            gp.eachTimeline(tl => {
                rest_promises.push(tl.getTimeline())
                tl.setSocketParam()
            })
            // タイムラインをDOMにバインド
            gp.onLoadTimeline(rest_promises)
        })
    })
    // 対象アカウントをWebSocketに接続
    Account.each(account => account.connect({
        openFunc: () => {},
        closeFunc: () => Notification.info(`${account.full_address}との接続が一時的に切断されました.`),
        reconnect: true
    }))
    Column.tooltip() // カラムにツールチップを設定
    // 見えている中で最初のカラムにカーソルをセット
    Column.getOpenedFirst().setCursor()
})())

function deleteQuoteInfo() {
    $('#header>#post_options input[type="hidden"]').val("")
    $('#header>#post_options ul.refernce_post')
        .html('<li class="__initial_message">返信/引用元なし</li>')
}

function enabledAdditionalAccount(enable) {
    const close_elm = $('#header>#post_options .additional_users+.option_close')
    if (Account.isMultiAccount() && enable) {
        close_elm.find("button.__on_option_open").prop('disabled', false)
            .find("img").attr('src', 'resources/ic_right.png')
        close_elm.css('background-color', '#514285').hide()
        $('#header>#post_options .additional_users').show()
    } else {
        close_elm.find("button.__on_option_open").prop('disabled', true)
            .find("img").attr('src', 'resources/ic_not.png')
        close_elm.css('background-color', '#777777').show()
        $('#header>#post_options .additional_users').hide()
    }
}


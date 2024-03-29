// HTMLロード時に非同期で実行
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
    $("#post_options .__ui_media_sortable").sortable({
        connectWith: "#post_options  .__attach_delete_box",
        delay: 100,
        distance: 48,
        placeholder: "ui-sortable-placeholder",
        cancel: ".__initial_message",
        revert: 50,
        opacity: 0.75,
        tolerance: "pointer",
        start: (e, ui) => $("#post_options  .__attach_delete_box").show("fade", 80),
        stop: (e, ui) => $("#post_options  .__attach_delete_box").hide("fade", 80),
        update: (e, ui) => {
            // 添付メディアが空になったら初期化メッセージを表示
            if ($("#post_options .__ui_media_sortable>li").length == 0)
                $("#post_options .__ui_media_sortable")
                    .html('<li class="__initial_message">ドラッグ&amp;ドロップでメディアを追加します。</li>')
        }
    })
    $("#post_options .__attach_delete_box").sortable({
        cancel: "span",
        update: (e, ui) => $("#post_options .__attach_delete_box>li").remove()
    })

    // ナビゲーションの表示設定
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.home) $("#navi .li_home").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.auth) $("#navi .li_auth").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.search) $("#navi .li_search").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.trend) $("#navi .li_trend").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.history) $("#navi .li_history").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.profile) $("#navi .li_profile").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.clip) $("#navi .li_clips").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.emoji_cache) $("#navi .li_emoji").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.help_keyborad) $("#navi .li_keyborad").hide()
    if (!Preference.GENERAL_PREFERENCE.navigation_visible.help) $("#navi .li_help").hide()
    // 投稿フォームの各種ボタン表示制御
    if (!Preference.GENERAL_PREFERENCE.enable_tool_button) $("#header>#head_postarea>.opt_buttons").hide()
    if (!Preference.GENERAL_PREFERENCE.enable_post_button) $("#header>#head_postarea>.submit_button").hide()
    if (!Preference.GENERAL_PREFERENCE.enable_last_edit_button) $("#header>#head_postarea>.additional_buttons").hide()
    if (Preference.GENERAL_PREFERENCE.hide_additional_account) // 投稿オプションの投稿アカウントを自動で閉じる
        $("#header>#post_options .additional_users .__on_option_close").click()
    enabledAdditionalAccount(true)
    // 一時タイムライン設定を反映
    Preference.setAlternateTimelinePref()

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

    // 設定からスタイルシートを生成
    Preference.generateStylesheet()

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

/**
 * #LimitedMethod
 * リプライ/引用/編集元の投稿情報を削除する.
 */
function deleteQuoteInfo() {
    $('#header>#post_options input[type="hidden"]').val("")
    $('#header>#post_options ul.refernce_post')
        .html('<li class="__initial_message">返信/引用元なし</li>')
}

/**
 * #LimitedMethod
 * 追加投稿アカウントの表示を有効/無効化する.
 * 
 * @param enable 有効にする場合はtrue
 */
function enabledAdditionalAccount(enable) {
    const close_elm = $('#header>#post_options .additional_users+.option_close')
    if (Account.isMultiAccount() && enable) { // アカウントが複数ある場合のみ有効にする
        close_elm.find("button.__on_option_open").prop('disabled', false)
            .find("img").attr('src', 'resources/ic_right.png')
        close_elm.css('background-color', '#514285').hide()
        $('#header>#post_options .additional_users').show()
    } else { // 単一アカウントか無効化の設定にされた場合は追加投稿を無効化
        close_elm.find("button.__on_option_open").prop('disabled', true)
            .find("img").attr('src', 'resources/ic_not.png')
        close_elm.css('background-color', '#777777').show()
        $('#header>#post_options .additional_users').hide()
    }
}


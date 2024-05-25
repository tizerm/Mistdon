$(() => (async () => {
    /*============================================================================================================*/

    // 設定ファイル不在での起動制御
    await window.accessApi.readPrefAccs()
    await window.accessApi.readPrefCols()
    await window.accessApi.readGeneralPref()
    await window.accessApi.readWindowPref()
    await window.accessApi.readCustomEmojis()

    if (Account.isEmpty()) { // アカウントが未登録(これだけではストップしない)
        $("#header>#head_postarea .__lnk_postuser>img").attr('src', 'resources/illust/mitlin_404.jpg')
        $("#header>h1").html(`
            <div class="head_user">
                <span class="username">認証されているアカウントがありません。</span>
                <span class="useraddress">- Mistdon</span>
            </div>
        `)
    } else { // 投稿ユーザーリストを作って先頭のアカウントをセット
        $("#pop_postuser>ul").html(Account.createPostAccountList())
        $("#post_options .additional_users ul").html(Account.createAdditionalPostAccountList())
        Account.get(0).setPostAccount()
    }
    if (Column.isEmpty()) { // カラムが未登録(この場合はストップする)
        $("#columns").prepend(`
            <div class="__initial_message">
                <div class="inner">
                    <img src="resources/illust/mitlin_error.png" class="initial_image"/><br/>
                    カラムが設定されていません。<br/>
                    アカウントの認証 <img src="resources/ic_auth.png" class="ic_inline"/>
                    とカラムの設定 <img src="resources/ic_pref.png" class="ic_inline"/>
                    からはじめよう！<br/>
                    わからないときは左下の？をクリックするかF1キーでヘルプを表示できます。
                </div>
            </div>
        `)
        return
    }

    /*============================================================================================================*/

    ;(async () => { // 右クリック時のメニュー生成(async)
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

    // カスタム絵文字のキャッシュ確認(async)
    Account.cacheEmojis()

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
        start: (e, ui) => $("#post_options  .__attach_delete_box").show(...Preference.getAnimation("FADE_FAST")),
        stop: (e, ui) => $("#post_options  .__attach_delete_box").hide(...Preference.getAnimation("FADE_FAST")),
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

    // 全体設定から各種設定項目を適用
    Preference.initAlternateTimelinePref()
    Preference.initVisibility()
    Preference.initBookmarkPref()
    Preference.generateStylesheet()
    Preference.initBackground()

    enabledAdditionalAccount(true)
    $("#__txt_postarea").blur()
    $("#header>h1").click()

    // ツールチップを設定表示
    $("#header>#head_postarea").tooltip(Preference.getUIPref("DROP", "UI_FADE_ANIMATION"))
    $("#pop_expand_action, #post_options").tooltip(Preference.getUIPref("UPPER", "UI_FADE_ANIMATION"))

    // カラム生成
    Column.each(col => {
        col.create()
        // タイムライン取得処理をプロミス配列に格納してWebSocketの設定をセット
        col.eachGroup(gp => {
            const rest_promises = []
            gp.eachTimeline(tl => {
                rest_promises.push(tl.getTimeline())
                // WebSocket接続が無効な場合は自動更新タイマーをセット
                if (tl.pref.disable_websocket) tl.initAutoReloader()
                else tl.setSocketParam()
            })
            // タイムラインをDOMにバインド
            gp.onLoadTimeline(rest_promises)
        })
    })

    // 対象アカウントをWebSocketに接続
    Account.each(account => account.connect({
        openFunc: () => {},
        closeFunc: () => { // 一時切断でポップアップを表示しない設定の場合は表示しない
            if (!Preference.GENERAL_PREFERENCE.disable_disconnect_pop)
                Notification.info(`${account.full_address}との接続が一時的に切断されました.`)
        },
        reconnect: true
    }))

    // カラムにツールチップを設定しカーソルと横幅を設定
    $(".column_box .col_action, .tl_group_box .gp_action").tooltip(Preference.getUIPref("DROP", "UI_FADE_ANIMATION"))
    Column.getOpenedFirst().setCursor()
    Column.setWidthLimit()
})())

/*================================================================================================================*/

/**
 * #LimitedMethod
 * 同時投稿アカウントに応じてヘッダカラーを変更する.
 */
function separateHeaderColor() {
    const current_color = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).pref.acc_color
    const add_color = []
    $("#header>#post_options ul.account_list input.__chk_add_account:checked:not(:disabled)")
        .each((index, elm) => add_color.push(Account.get($(elm).val()).pref.acc_color))
    if (add_color.length > 0) { // 複数のアカウントが選択されている場合はグラデーションにする
        const color_str = add_color.reduce((rs, el) => `${rs},#${el}`, '')
        $("#header>h1, #singleton_submit_window>h2")
            .css('background-image', `linear-gradient(0.25turn, #${current_color}${color_str}`)
    } else $("#header>h1, #singleton_submit_window>h2").css({ // 追加アカウントがない場合はカレントカラーで塗る
        'background-image': 'none',
        'background-color': `#${current_color}`
    })
}

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

/**
 * #LimitedMethod
 * 投稿本文のテキストエリアを画面上部とウィンドウで切り替える.
 */
function toggleTextarea() {
    const text = $("#__txt_postarea").val()
    const window_key = 'singleton_submit_window'

    if ($("#header>#head_postarea>.textbox_area>#__txt_postarea").length > 0) {
        // ヘッダ領域からウィンドウへ
        $("#__txt_postarea").remove()
        $("#header>#head_postarea>.textbox_area").prepend('<div class="__window_opened">ウィンドウ展開中</div>')

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="submit_window ex_window">
                    <h2><span>投稿本文</span></h2>
                    <div class="window_buttons">
                        <input type="checkbox" class="__window_opacity" id="__window_opacity_submit"/>
                        <label for="__window_opacity_submit" class="window_opacity_button" title="透過"><img
                            src="resources/ic_alpha.png" alt="透過"/></label>
                        <button type="button" class="window_close_button" title="閉じる"><img
                            src="resources/ic_not.png" alt="閉じる"/></button>
                    </div>
                    <div class="submit_box">
                        <textarea id="__txt_postarea" class="__ignore_close_option __ignore_keyborad __emoji_suggest"
                            placeholder="いまなにしてる？(Ctrl+Enterでも投稿できます)" tabindex="1"></textarea>
                    </div>
                    <div class="footer">
                        <button type="button" id="__on_textwindow_submit" class="close_button">投稿</button>
                        <button type="button" id="__on_textwindow_close" class="close_button">上に戻す</button>
                    </div>
                </div>
            `,
            color: '42809e',
            resizable: true,
            drag_axis: false,
            resize_axis: "all"
        })
        separateHeaderColor()
        if (Preference.GENERAL_PREFERENCE.default_textopacity) $(`#${window_key} #__window_opacity_submit`).prop("checked", true)
        // 入力テキストを引き継ぐ
        $("#__txt_postarea").val(text).focus()
    } else $(`#${window_key}`).hide(...Preference.getAnimation("WINDOW_FOLD"), () => {
        // ウィンドウからヘッダ領域へ
        $(`#${window_key}`).remove()
        $("#header>#head_postarea>.textbox_area>.__window_opened").remove()
        $("#header>#head_postarea>.textbox_area").prepend(`
            <textarea id="__txt_postarea" class="__ignore_close_option __ignore_keyborad __emoji_suggest"
                placeholder="いまなにしてる？(Ctrl+Enterでも投稿できます)" tabindex="1"></textarea>
        `)
        // 入力テキストを引き継ぐ
        $("#__txt_postarea").val(text).focus()
    })
}


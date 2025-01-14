﻿$(() => {
    /*=== Navigation Event =======================================================================================*/

    /**
     * #Event
     * アプリアイコン.
     * => 通知ログを生成
     */
    $("#navi #__on_notification").on("click", e => Notification.createLog())

    /**
     * #Event #Mouseenter
     * アプリアイコン(ホバー).
     * => 実行中のタスクを表示
     */
    $("#navi #__on_notification").on("mouseenter", e => Notification.showProgress())

    /**
     * #Event #Mouseleave
     * アプリアイコン(ホバーアウト).
     * => 実行中のタスク一覧を消去
     */
    $("#navi #__on_notification").on("mouseleave", e => {
        if (!$("#pop_notification>ul.progress").is(":visible")) return // 表示されていなかったらなにもしない
        $("#pop_notification>ul.progress").hide(...Preference.getAnimation("LEFT_DROP"),
            () => $("#pop_notification>ul.progress").empty())
    })

    /**
     * #Event
     * 検索ボタン.
     */
    $("#navi .navi_search").on("click", e => Query.createSearchWindow())

    /**
     * #Event
     * トレンドボタン.
     */
    $("#navi .navi_trend").on("click", e => Trend.createTrendWindow())

    /**
     * #Event
     * 送信履歴ボタン.
     */
    $("#navi .navi_history").on("click", e => History.createHistoryWindow())

    /**
     * #Event
     * 拡張ブックマーク/お気に入りボタン.
     */
    $("#navi .navi_show_bookmark").on("click", e => {
        $("#pop>.ex_mini_window").hide()
        // 先頭がMisskeyアカウントだったときのために強制的にチェンジイベントを発火
        $("#pop_bookmark_option #__cmb_ex_bookmark_account").change()
        const mouse_y = e.pageY
        if (window.innerHeight / 2 < mouse_y) // ウィンドウの下の方にある場合は下から展開
            $("#pop_bookmark_option").css({
                'top': 'auto',
                'bottom': Math.round(window.innerHeight - mouse_y - 24)
            })
        else $("#pop_bookmark_option").css({
            'bottom': 'auto',
            'top': mouse_y - 24
        })
        $("#pop_bookmark_option").show(...Preference.getAnimation("LEFT_DROP"))
    })

    /**
     * #Event
     * 一時タイムライン表示ボタン.
     */
    $("#navi .navi_show_temporary").on("click", e => {
        $("#pop>.ex_mini_window").hide()
        const mouse_y = e.pageY
        if (window.innerHeight / 2 < mouse_y) // ウィンドウの下の方にある場合は下から展開
            $("#pop_temporary_option").css({
                'top': 'auto',
                'bottom': Math.round(window.innerHeight - mouse_y - 24)
            })
        else $("#pop_temporary_option").css({
            'bottom': 'auto',
            'top': mouse_y - 24
        })
        TemporaryTimeline.createFavoriteMenu()
        $("#pop_temporary_option").show(...Preference.getAnimation("LEFT_DROP"))
    })

    /**
     * #Event
     * 全体プロフィールボタン.
     */
    $("#navi .navi_show_profile").on("click", e => Account.createProfileTimeline())

    /**
     * #Event
     * 絵文字キャッシュクリアボタン.
     */
    $("#navi .navi_reset_emoji").on("click", e => dialog({
        type: 'confirm',
        title: "絵文字キャッシュ取得",
        text: `登録アカウントすべてのカスタム絵文字のキャッシュを更新します。<br/>
            よろしいですか？<br/>
            (Misskeyのサーバーに新しいカスタム絵文字が追加されたときに実行するのをおすすめします。)`,
        accept: () => { // OKボタン押下時の処理
            Emojis.clearCache()
            Account.cacheEmojis()
        }
    }))

    /**
     * #Event
     * 再接続ボタン.
     */
    $("#navi #on_reconnect").on("click", e => {
        const label = [...Account.map.values()].filter(f => f.disconnect_time)
            .reduce((rs, el) => `${rs}<br/>${el.full_address}: ${el.disconnect_time.both} 切断`, '')
        dialog({
            type: 'confirm',
            title: "リアルタイム更新再接続",
            text: `エラーによって切断されたインスタンスと再接続します。<br/>
                よろしいですか？<br/>${label}`,
            accept: () => { // OKボタン押下時の処理
                Account.reconnect()
                $("#navi .li_reconnect").hide(...Preference.getAnimation("FADE_STD"))
            }
        })
    })

    /**
     * #Event
     * キーボードショートカット早見表ボタン.
     */
    $("#navi #on_help_keybind").on("click", e => {
        // ヘルプウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="help_col">
                <h2>キーボードショートカット早見表</h2>
                <div class="help_content shortcut_list"></div>
                <button type="button" id="__on_help_close" class="close_button">×</button>
            </div>
        `))
        $("#pop_extend_column").html(jqelm).show(...Preference.getAnimation("SLIDE_RIGHT"))
        $.ajax({
            url: "help/help_keybind.html",
            cache: false
        }).then(data => {
            $.each($.parseHTML(data), (index, value) => {
                if ($(value).is("#main")) $("#pop_extend_column .help_content").html($(value))
            })
        })
    })

    /*=== Post Article Area Event ================================================================================*/

    /**
     * #Event
     * 投稿アカウントアイコン.
     * => アカウント変更メニュー表示
     */
    $("#header>#head_postarea .__lnk_postuser").on("click", e =>
        $("#pop_postuser").show(...Preference.getAnimation("WINDOW_FOLD")))

    /**
     * #Event
     * アカウント変更メニュー項目.
     * => 投稿アカウントを変更
     */
    $(document).on("click", ".__lnk_account_elm", e => {
        Account.get($(e.target).closest(".__lnk_account_elm").attr('name')).setPostAccount()
        $("#pop_postuser").hide(...Preference.getAnimation("WINDOW_FOLD"))
    })

    /**
     * #Event
     * ツールメニュー: 下描き一覧呼び出しボタン.
     * => 下描き一覧を表示
     */
    $("#__open_draft").on("click", e => Draft.createDraftMenu())

    /**
     * #Event
     * ツールメニュー-下描き一覧: 下描き一覧項目.
     * => 下描き内容を投稿フォームに展開する.
     */
    $(document).on("click", "#pop_draft>.draft_menu>.draft_list", e => Draft.loadDraft($(e.target).closest("li").index()))

    /**
     * #Event
     * ツールメニュー: カスタム絵文字呼び出しボタン.
     * => カスタム絵文字一覧を表示(カスタム絵文字関係のイベントは別所に記載)
     */
    $("#__open_emoji_palette").on("click", e => Emojis.createEmojiPaletteWindow('palette'))

    /**
     * #Event #Keyup
     * 本文投稿フォーム+CWフォーム(キーアップイベント).
     * => 文字数をカウントしてメーターに表示
     */
    $(document).on("keyup", "#__txt_postarea, #__txt_content_warning", e => {
        const length = $("#__txt_postarea").val().length + $("#__txt_content_warning").val().length
        const limit = Account.CURRENT_ACCOUNT?.pref.post_maxlength ?? 500
        const rate = length / limit
        const deg = 360 * rate

        if (length > 0) {
            if (rate < 0.9) $("#post_length_graph").css({ // 9割まではグリーン
                "border-color": "#21dec8",
                "background-image": `conic-gradient(#21dec8 ${deg}deg, #222222 ${deg}deg)`
            }); else if (rate <= 1) $("#post_length_graph").css({ // 残り1割でオレンジ
                "border-color": "#dea521",
                "background-image": `conic-gradient(#dea521 ${deg}deg, #222222 ${deg}deg)`
            }); else $("#post_length_graph").css({ // 文字数超過でレッド
                "border-color": "#de3121",
                "background-image": "none",
                "background-color": "#de3121"
            })
        } else $("#post_length_graph").css({ // 入力されていない場合はグレー
            "border-color": "#aaaaaa",
            "background-image": "none",
            "background-color": "transparent"
        })
    })

    /**
     * #Event
     * ツールメニュー: 投稿オプション呼び出しボタン.
     * => 投稿オプションの表示をトグルする
     */
    $("#__open_post_option").on("click",
        e => $("#header>#post_options").toggle(...Preference.getAnimation("SLIDE_FAST")))

    /**
     * #Event #Focus
     * 本文投稿フォームとCW入力フォーム(フォーカスイベント)
     * => 投稿オプションを表示する
     */
    $(document).on("focus", "#__txt_postarea, #__txt_content_warning", e => {
        if ($("#header>#post_options").is(":visible")) return // 投稿オプションが見えていたらなにもしない
        $("#header>#post_options").show(...Preference.getAnimation("SLIDE_FAST"))
    })

    /**
     * #Event
     * 投稿オプションを閉じない設定の場所をクリック.
     * => 投稿オプションを閉じる
     */
    $("body").on("click", e => {
        // 投稿オプションを閉じない場所をクリックした場合はなにもしない
        if ($(e.target).closest(".__ignore_close_option").length > 0 || !$("#header>#post_options").is(":visible")) return
        $("#header>#post_options").hide(...Preference.getAnimation("SLIDE_FAST"))
    })

    /**
     * #Event
     * 投稿フォームウィンドウ化ボタン.
     */
    $("#__open_submit_window").on("click", e => toggleTextarea())

    /**
     * #Event
     * 投稿ボタン.
     * => メディア投稿を確認する場合は確認ダイアログを出す
     */
    $("#__on_submit").on("click", e => {
        if (!Preference.IGNORE_DIALOG && $("#post_options .media_list>li:not(.__initial_message)").length > 0
            && Preference.GENERAL_PREFERENCE.enable_media_confirm) {
            // メディア付きの投稿を確認する
            const account_list = [$("#header>#head_postarea .__lnk_postuser>img").attr("name")]
            $("#post_options input.__chk_add_account:checked").each((index, elm) => account_list.push($(elm).val()))
            const account_label = account_list.reduce((rs, el) => `${rs}<br/>${el}`, '')
            dialog({
                type: 'confirm',
                title: "画像投稿",
                text: `
                    以下のアカウントに対してメディア付きの投稿をします。<br/>
                    よろしいですか？<br/>${account_label}
                `,
                accept: () => { // OKボタン押下時の処理
                    Preference.IGNORE_DIALOG = true
                    $("#__txt_postarea").blur()
                    $("#__on_submit").click()
                }
            })
            // ダイアログフラグをリセット
            Preference.IGNORE_DIALOG = false
            return
        }
        // 投稿処理
        Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).post({
            content: $("#__txt_postarea").val(),
            option_obj: $("#post_options"),
            // 投稿成功時処理(書いた内容を消す)
            success: () => {
                $("#__on_reset_option").click()
                $("#header>#post_options").hide(...Preference.getAnimation("SLIDE_FAST"))
                $("#singleton_emoji_window .window_close_button").click()
            }
        })
        // ダイアログフラグをリセット
        Preference.IGNORE_DIALOG = false
    })

    /**
     * #Event
     * 投稿ボタン(サブ).
     */
    $("#__on_another_submit").on("click", e => $("#__on_submit").click())

    /**
     * #Event
     * リアクション絵文字一覧の絵文字.
     * => リアクションを送信
     */
    $(document).on("click", "#pop_extend_column>.reaction_col .__on_emoji_reaction",
        e => Account.get($("#__hdn_reaction_account").val()).sendReaction({
            id: $("#__hdn_reaction_id").val(),
            shortcode: $(e.target).closest(".__on_emoji_reaction").attr("name"),
            // 投稿成功時処理(リプライウィンドウを閉じる)
            success: () => $("#pop_extend_column").hide(...Preference.getAnimation("EXTEND_DROP"))
        }))

    /**
     * #Event
     * 直前の投稿を削除ボタン.
     */
    $("#__on_last_delete").on("click", e => History.popIf(last => {}, true))

    /**
     * #Event
     * 直前の投稿を削除して編集ボタン.
     */
    $("#__on_last_delete_paste").on("click", e => History.popIf(last => last.post.reEditWithDelete(), true))

    /**
     * #Event
     * 直前の投稿をコピーボタン.
     */
    $("#__on_on_last_copy").on("click", e => History.popIf(last => {
        last.post.getRenderContent().then(text => $("#__txt_postarea").val(text).keyup())
        $("#__txt_content_warning").val(last.post.cw_text)
    }, false))

    /**
     * #Event
     * 直前の投稿につなげるボタン.
     */
    $("#__on_last_replychain").on("click", e => History.popIf(last => last.post.createReplyWindow(), false))

    /**
     * #Event
     * 直前の投稿を編集ボタン.
     */
    $("#__on_last_edit").on("click", e => History.popIf(last => last.post.edit(), false))

    /**
     * #Event
     * 現在入力中のフォーム内容を下描きに保存ボタン.
     */
    $("#__on_save_draft").on("click", e => Draft.saveDraft({
        account: Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")),
        content: $("#__txt_postarea").val(),
        option_obj: $("#post_options")
    }))

    /*=== Custom Emoji Palette Event =============================================================================*/

    /**
     * #Event #Keyup
     * カスタム絵文字系のサジェストテキストボックス.
     * => カスタム絵文字をショートコードで絞り込み(変わってなかったらなにもしない)
     */
    $(document).on("keyup", ".emoji_suggest_textbox", e => {
        const target = $(e.target).closest(".emoji_palette_section")
        const word = $(e.target).val()
        if (target.find(".__hdn_emoji_code").val() == word) return
        Emojis.filterEmojiPalette(target, word)
    })

    /**
     * #Event
     * カスタム絵文字パレット: カスタム絵文字一覧の絵文字.
     * => 現在アクティブなフォームにカスタム絵文字のショートコードを挿入
     */
    $(document).on("click", "#singleton_emoji_window .__on_emoji_append", e => {
        const target_elm = $(`#${$("#__hdn_emoji_target_elm_id").val() || "__txt_postarea"}`)
        const cursor_pos = target_elm.get(0).selectionStart
        const target_text = target_elm.val()
        let target_emoji = $(e.target).closest(".__on_emoji_append").attr("name")
        const target_account = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"))
        // Mastodonの場合前後にスペースを入れる
        if (target_account.platform == 'Mastodon') target_emoji = ` ${target_emoji} `

        // 挿入モードで文字の切り出し位置を変える
        const start_pos = $('#emoji_mode_method').is('.active')
            ? $("#__hdn_emoji_cursor").val() - 1 : cursor_pos

        // 入力中の文章中にカスタム絵文字コードを挿入してカーソル位置を調整
        const text_before = target_text.substring(0, start_pos) + target_emoji
        const selection_pos = text_before.length
        target_elm.val(text_before + target_text.substring(cursor_pos, target_text.length))
        target_elm.get(0).selectionStart = selection_pos
        target_elm.get(0).selectionEnd = selection_pos

        // 最近使用した絵文字に登録してパレットモードに戻す
        target_account.updateEmojiHistory(target_emoji)
        Emojis.toggleEmojiPaletteMode(target_elm, true)
        target_elm.focus()
    })

    // カスタム絵文字パレットの変換モードが有効の場合は以下のイベントを定義
    if (Preference.GENERAL_PREFERENCE.enable_emoji_suggester) {
        /**
         * #Event #Keyup
         * カスタム絵文字の変換対象フォームでキーアップ.
         * => カスタム絵文字パレットを開いて:以降の入力コードをサジェストテキストボックスにトレースする
         */
        $(document).on("keyup", ".__emoji_suggest", e => {
            // サジェスター停止中は以後なにもしない
            if ($('#singleton_emoji_window').length == 0 || $('#emoji_mode_palette').is(".active")) return

            // サジェスターを起動してから入力された内容を抜き出す
            const start = $("#__hdn_emoji_cursor").val()
            const end = e.target.selectionStart

            if (start > end) { // コロンよりも前に来たらサジェスター停止
                Emojis.toggleEmojiPaletteMode($(e.target), true)
                return
            }

            // 入力中のコードをサジェスターに移してイベント発火
            $('#__txt_emoji_search').val($(e.target).val().substring(start, end)).keyup()
        })

        /**
         * #Event #Blur
         * カスタム絵文字の変換対象フォームでフォーカスアウト.
         * => 変換モードを一瞬有効にするため変換モードを遅延停止する
         */
        $(document).on("blur", ".__emoji_suggest",
            e => setTimeout(() => Emojis.toggleEmojiPaletteMode($(e.target), true), 250))
    }

    /*=== Post Option Article Area Event =========================================================================*/

    /**
     * #Event
     * オプション各項目のクローズボタン.
     * => 各オプション項目を閉じて縮小する
     */
    $("#header>#post_options .__on_option_close").on("click",
        e => $(e.target).closest(".closeable_block").hide().next().show())

    /**
     * #Event
     * オプション各項目のオープンボタン.
     * => 各オプション項目を開いて表示する
     */
    $("#header>#post_options .__on_option_open").on("click",
        e => $(e.target).closest(".option_close").hide().prev().show())

    /**
     * #Event #Change
     * 投稿アカウント: アカウントアイコン(チェック変更時).
     * => 同時投稿アカウントに応じてヘッダカラーをセパレートする
     */
    $(document).on("change", "#header>#post_options ul.account_list input.__chk_add_account", e => separateHeaderColor())

    /**
     * #Event #Dblclick
     * 投稿アカウント: アカウントアイコン(ダブルクリック).
     * => メインの投稿先をそのアカウントに切り替え
     */
    $(document).on("dblclick", "#header>#post_options ul.account_list input.__chk_add_account+label",
        e => Account.get($(e.target).closest("li").find("input.__chk_add_account").val()).setPostAccount())

    /**
     * #Event #Change
     * CW/公開/投稿先: 投稿チャンネルコンボボックス(変更時).
     * => ヘッダのチャンネル名を変える
     */
    $("#__cmb_post_to").on("change", e => {
        const value = $(e.target).val()
        if (value == "__default") { // 通常投稿の場合はチャンネル表示を削除
            $("#header>h1>.head_user>.channelname").empty()
            return
        }
        const name = $(e.target).find(`option[value="${value}"]`).text()
        $("#header>h1>.head_user>.channelname").text(`#${name}`)
    })

    /**
     * #Event
     * CW/公開/投稿先: リセットボタン.
     * => 投稿先アカウントと公開範囲以外をすべて初期状態に戻す
     */
    $("#__on_reset_option").on("click", e => {
        $("#__txt_postarea").val("")
        $('#header>#post_options input[type="text"]').val("")
        $('#header>#post_options input[type="number"]').val("")
        $("#post_options .poll_setting .__on_option_close").click()
        $("#post_options .refernced_post .__on_option_close").click()
        if (Preference.GENERAL_PREFERENCE.reset_post_visibility) // 公開範囲をリセットする
            $('#post_options input[name="__opt_visibility"][value="public"]').prop('checked', true)
        Media.clearAttachMedia()
        deleteQuoteInfo()
        enabledAdditionalAccount(true)
        $("#__txt_postarea").keyup()
    })

    /**
     * #Event
     * アンケート: 追加ボタン.
     * => 回答項目を追加する
     */
    $("#header>#post_options #__on_poll_add_item").on("click", e => $("#header>#post_options .poll_options")
        .append('<li><input type="text" class="__txt_poll_option __ignore_keyborad" placeholder="回答"/></li>'))

    /**
     * #Event
     * アンケート: 削除ボタン.
     * => 最後の回答項目を削除する
     */
    $("#header>#post_options #__on_poll_remove_item").on("click",
        e => $("#header>#post_options .poll_options>li:last-child").remove())

    /**
     * #Event
     * 添付メディア: すべて閲覧注意にするボタン.
     * => 添付メディアをすべて閲覧注意設定に変更する
     */
    $("#header>#post_options #__on_set_sensitive").on("click", e => {
        const target_ul = $('#header>#post_options .attached_media>ul.media_list')
        if (target_ul.find('input[type="checkbox"]:not(:checked)').length > 0)
            // 未チェックの項目が1つでもある場合は全部センシティブにする
            target_ul.find('input[type="checkbox"]').prop("checked", true)
        else target_ul.find('input[type="checkbox"]').prop("checked", false)
    })

    /**
     * #Event
     * 添付メディア: ドライブから添付ボタン.
     * => メイン投稿アカウントのMisskeyドライブを開く
     */
    $("#header>#post_options #__on_open_drive").on("click",
        e => Media.openDriveWindow($("#header>#head_postarea .__lnk_postuser>img").attr("name")))

    /**
     * #Event
     * 添付メディア-ドライブウィンドウ: フォルダ一覧項目.
     * => 対象のフォルダを開く
     */
    $(document).on("click", ".drive_window>ul.drive_folder_list>.__on_select_folder", e => Media.openFolder(
        $("#header>#head_postarea .__lnk_postuser>img").attr("name"), $(e.target)))

    /**
     * #Event
     * 添付メディア-ドライブウィンドウ: OKボタン.
     * => 選択したメディアを添付メディアに追加する
     */
    $(document).on("click", ".__on_drive_media_confirm", e => Media.attachDriveMedia($(e.target).closest(".drive_window")))

    /**
     * #Event #Dragenter
     * 添付メディア: 外部ファイラーからファイルをドラッグ.
     * => ファイル添付モーダルを表示
     */
    document.addEventListener("dragenter", e => {
        e.preventDefault()
        // 画面内の画像をドラッグした場合は発火しない
        if (e.dataTransfer.types[0] != 'Files' || $("#modal_drop_files").is(":visible")) return
        $("#modal_drop_files").show(...Preference.getAnimation("FADE_STD"))
    })

    /**
     * #Event #Dragleave
     * 添付メディア-ファイル添付モーダル: Mistdonからドラッグアウト.
     * => ファイル添付モーダルをフェードアウトさせる
     */
    $("#modal_drop_files>.dropbox").get(0).addEventListener("dragover", e => e.preventDefault())
    $("#modal_drop_files>.dropbox").get(0).addEventListener("dragleave", e => {
        e.preventDefault()
        // 内部の要素に移動した場合は発火しない
        if (e.relatedTarget && !$(e.relatedTarget).is("#modal_drop_files")) return
        // 再発火の可能性をおさえるため遅めにフェードアウトする(これは設定で無効化しない)
        $("#modal_drop_files").hide("fade", 750)
    })

    /**
     * #Event #Drop
     * 添付メディア-ファイル添付モーダル: ファイルをドロップ.
     * => ドロップしたファイルをサムネイル表示して添付メディアに追加する
     */
    $("#modal_drop_files").get(0).addEventListener("drop", e => {
        // デフォルトイベントを無視してファイルを添付メソッドに渡す
        e.preventDefault()
        if ($(e.target).closest(".dropbox").length == 0) return // ボックス外で外した場合は無視
        Media.attachMedia([...e.dataTransfer.files])

        // ドロップ領域を消して投稿オプションを開く
        $("#modal_drop_files").hide(...Preference.getAnimation("FADE_STD"))
        if (!$("#header>#post_options").is(":visible")) // 投稿オプションを開く
            $("#header>#post_options").show(...Preference.getAnimation("SLIDE_FAST"))
    })

    /**
     * #Event #Drop
     * 本文投稿フォーム(画像ファイルがクリップボードにある状態でペースト).
     * => ペースとした画像を添付メディアに追加する
     */
    document.addEventListener("paste", e => {
        // 本文フォーム以外とファイル以外は無視(普通のペースト)
        if (!$(e.target).is("#__txt_postarea") || e.clipboardData.types[0] != 'Files') return true

        // デフォルトイベントを無視してクリップボードをファイル化して添付メソッドに渡す
        e.preventDefault()
        Media.attachMedia([e.clipboardData.items[0].getAsFile()])

        if (!$("#header>#post_options").is(":visible")) // 投稿オプションを開く
            $("#header>#post_options").show(...Preference.getAnimation("SLIDE_FAST"))
    })

    /*=== Column And Group Event =================================================================================*/

    /**
     * #Event
     * タイムライングループ本体.
     * => そのタイムライングループにカーソルを合わせる
     */
    $(document).on("click", ".tl_group_box", e => {
        const target_col = Column.get($(e.target).closest(".column_box"))
        Column.disposeCursor()
        target_col.setCursor()
        const target_gp = target_col.getGroup($(e.target).closest(".tl_group_box").attr("id"))
        Group.disposeCursor()
        target_gp.setCursor()
    })

    /**
     * #Event
     * カラムボタン: トップへ移動.
     * => カラム内のグループすべてトップに移動
     */
    $(document).on("click", ".__on_column_top", e =>
        Column.get($(e.target).closest(".column_box")).eachGroup(gp => gp.scroll(0)))

    /**
     * #Event
     * カラムボタン: カラムを開く.
     */
    $(document).on("click", ".__on_column_open", e =>
        Column.get($(e.target).closest(".closed_col").index(".closed_col")).toggle())

    /**
     * #Event
     * カラムボタン: カラムを閉じる.
     */
    $(document).on("click", ".__on_column_close", e =>
        Column.get($(e.target).closest(".column_box")).toggle())

    /**
     * #Event
     * カラムボタン: 可変幅ON/OFF.
     */
    $(document).on("click", ".__on_column_flex", e =>
        Column.get($(e.target).closest(".column_box")).toggleFlex())

    /**
     * #Event
     * カラムボタン: リロード.
     * => カラム内のグループすべてリロード
     */
    $(document).on("click", ".__on_column_reload", e =>
        Column.get($(e.target).closest(".column_box")).eachGroup(gp => gp.reload()))

    /**
     * #Event
     * グループボタン: トップへ移動.
     */
    $(document).on("click", ".__on_group_top", e => Column.get($(e.target).closest(".column_box"))
        .getGroup($(e.target).closest(".tl_group_box").attr("id")).scroll(0))

    /**
     * #Event
     * グループボタン: リロード.
     */
    $(document).on("click", ".__on_group_reload", e => Column.get($(e.target).closest(".column_box"))
        .getGroup($(e.target).closest(".tl_group_box").attr("id")).reload())

    /**
     * #Event
     * グループボタン: フラッシュ.
     * => 対象グループで最後にフラッシュした投稿でフラッシュウィンドウを開く(ない場合は最古の投稿)
     */
    $(document).on("click", ".__on_open_flash_last", e => Column.get($(e.target).closest(".column_box"))
        .getGroup($(e.target).closest(".tl_group_box").attr("id")).createFlash())

    /*=== Post Event =============================================================================================*/

    /**
     * #Event
     * ユーザーアドレス.
     * => リモートのユーザー情報を右ウィンドウに表示
     */
    $(document).on("click", ".__lnk_userdetail, .__pop_userinfo",
        e => User.getByAddress($(e.currentTarget).attr("name")).then(user => user.createDetailWindow()))

    /**
     * #Event #Hover
     * ユーザーアイコン(遅延ホバーイベント).
     * => リモートからユーザー情報を取得して簡易表示ウィンドウを開く
     */
    delayHoverEvent({
        selector: ".__pop_userinfo",
        enterFunc: e => {
            $("#pop_expand_user>ul").empty()

            // ポップする座標を決定
            const mouse_x = e.pageX
            const mouse_y = e.pageY
            let css = {}
            if (window.innerHeight / 2 < mouse_y) { // ウィンドウの下の方にある場合は下から展開
                css.top = 'auto'
                css.bottom = Math.round(window.innerHeight - mouse_y - 32)
            } else { // 通常は上から展開
                css.top = mouse_y - 32
                css.bottom = 'auto'
            }
            if (window.innerWidth / 2 < mouse_x) { // ウィンドウの右側にある場合は左に展開
                css.left = 'auto'
                css.right = Math.round(window.innerWidth - mouse_x + 24)
            } else { // 通常は左から展開
                css.left = mouse_x + 24
                css.right = 'auto'
            }

            $("#pop_expand_user").css(css).show(...Preference.getAnimation("POP_FOLD")).prepend(`
                <div class="col_loading">
                    <img src="resources/illust/ani_wait.png" alt="Now Loading..."/>
                </div>`)
            User.getByAddress($(e.target).attr("name"), true).then(user => {
                $("#pop_expand_user>.col_loading").remove()
                $("#pop_expand_user>ul").html(user.short_elm)
            })
        },
        leaveFunc: e => $("#pop_expand_user").hide(...Preference.getAnimation("POP_FOLD")),
        delay: 750
    })

    /**
     * #Event
     * Contents Warningヘッダ.
     * => 非表示にしている閲覧注意情報をトグルする
     */
    $(document).on("click", ".expand_header", e =>
        $(e.target).closest("a").next().toggle(...Preference.getAnimation("SLIDE_DOWN")))

    /**
     * #Event
     * リモートサーバーラベル.
     * => リモートサーバーのインスタンス詳細ウィンドウを表示する
     */
    $(document).on("click", ".__on_remote_detail", e => (async () => {
        const notification = Notification.progress(`${$(e.target).text()}のサーバー情報を取得中です...`)
        try {
            const simple_ins = await Instance.get($(e.target).text())
            const detail_ins = await Instance.getDetail(simple_ins.host, simple_ins.platform)
            detail_ins.createDetailHtml()
            notification.done()
        } catch (err) {
            console.log(err)
            notification.error("サーバー情報の取得で問題が発生しました. サポート外のサーバーの可能性があります.")
        }
    })())

    /**
     * #Event
     * 本文のリンク.
     * => 外部ブラウザでリンクを開く
     */
    $(document).on("click", ".content>.main_content a, .post_quote>.main_content a, .prof_field a", e => {
        const url = $(e.target).closest("a").attr("href")
        window.accessApi.openExternalBrowser(url)
        // リンク先に飛ばないようにする
        return false
    })

    /**
     * #Event
     * 画像サムネイル.
     * => 画像拡大モーダルを表示
     */
    $(document).on("click", ".__on_media_expand", e => {
        const image_url = $(e.target).closest(".__on_media_expand").attr("href")
        const target_li = $(e.target).closest("li")
        if ($(e.target).closest(".tl_group_box").length > 0) Column // カラム内の投稿の場合
            .get($(e.target).closest(".column_box"))
            .getGroup($(e.target).closest(".tl_group_box").attr("id"))
            .getStatus(target_li).createImageModal(image_url)
        else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
            Timeline.getWindow($(e.target)).ref_group.getStatus(target_li).createImageModal(image_url)
        else if ($(e.target).closest("ul.flash_tl").length > 0) // フラッシュタイムラインの場合
            FlashTimeline.getWindow($(e.target)).current.createImageModal(image_url)
        else if ($(e.target).closest("ul.expanded_post").length > 0) // ポップアップ表示投稿の場合
            Status.TEMPORARY_CONTEXT_STATUS.createImageModal(image_url)
        else if ($(e.target).closest("ul.trend_ul").length > 0) // トレンドタイムラインの場合
            Trend.getStatus(target_li).createImageModal(image_url)
        else // リモートのデータを直接取得して表示する場合はURLではなくインデクスで判定を行う
            Status.getStatus(target_li.attr("name"))
                .then(post => post.createImageModal(image_url, $(e.target).closest("a").index()))
        return false
    })

    /**
     * #Event
     * モーダル内部の要素をクリック.
     * => 画像拡大モーダルを閉じる(動画には反応しない)
     */
    $(document).on("click", "#modal_expand_image", e => {
        if ($(e.target).is("video")) return // 動画の場合はなにもしない
        $("#modal_expand_image").hide(...Preference.getAnimation("FADE_STD"),
            () => $("#modal_expand_image video, #modal_expand_image audio").remove())
    })

    /**
     * #Event #Mouseenter
     * モーダル下部の画像サムネイルにホバー.
     * => 対象の画像に切り替える
     */
    $(document).on("mouseenter", "#modal_expand_image>#expand_thumbnail_list>li", e => {
        const url = $(e.target).closest("li").attr("name")
        $('#modal_expand_image>#expand_image_box>li>*:visible').hide()
        const target_media = $(`#modal_expand_image>#expand_image_box>li>*[src="${url}"]`)
        target_media.show()
        // 動画の場合は自動再生
        if (target_media.is("video")) target_media.get(0).play()
        $('#modal_expand_image>#expand_thumbnail_list>*').removeClass("selected_image")
        $(e.target).closest("li").addClass("selected_image")
        return false
    })

    /**
     * #Event
     * アンケートの投票ボタン(単体).
     * => 押した内容で投票して中間結果を表示する
     */
    $(document).on("click", ".__on_poll_vote", e => {
        const vote_target = [$(e.target).index()] // 単体投票の場合は単一配列
        if ($(e.target).closest(".tl_group_box").length > 0) // TLに表示されているものはそのまま使用
            Column.get($(e.target).closest(".column_box"))
                .getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus($(e.target).closest("li")).vote(vote_target, $(e.target))
        else Status.TEMPORARY_CONTEXT_STATUS.vote(vote_target, $(e.target)) // ポップアップの場合は一時保存から取得
    })

    /**
     * #Event
     * アンケートの投票ボタン(複数).
     * => チェックした内容で投票して中間結果を表示する
     */
    $(document).on("click", ".__on_poll_multi_votes", e => {
        const vote_targets = []
        $(e.target).closest(".post_poll").find("input.__chk_multi_vote:checked")
            .each((index, elm) => vote_targets.push($(elm).val()))
        if ($(e.target).closest(".tl_group_box").length > 0) // TLに表示されているものはそのまま使用
            Column.get($(e.target).closest(".column_box"))
                .getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus($(e.target).closest("li")).vote(vote_targets, $(e.target))
        else Status.TEMPORARY_CONTEXT_STATUS.vote(vote_targets, $(e.target)) // ポップアップの場合は一時保存から取得
    })

    /**
     * #Event
     * 投稿日時.
     * => 投稿を右ウィンドウに詳細表示する
     */
    $(document).on("click", ".__on_datelink", e =>
        Status.getStatus($(e.target).closest("li").attr("name")).then(post => post.createDetailWindow()))

    /**
     * #Event
     * リモートインプレッション取得ボタン.
     * => リモートのインプレッション数を直接取得してタイムラインインプレッションを書き換える.
     */
    if (Preference.GENERAL_PREFERENCE.tl_impression?.enabled)
        $(document).on("click", ".__fetch_remote_impression", e => {
            const target_li = $(e.target).closest("li")
            Status.getStatus(target_li.attr("name")).then(post => {
                // インプレッションセクションを最新の状態で置き換える
                target_li.find('.impressions').replaceWith(post.impression_section)
                // Misskeyの場合未変換のカスタム絵文字を置換
                if (post.platform == 'Misskey') Emojis.replaceDomAsync(target_li.find('.impressions'), post.host)
            })
        })

    /**
     * #Event #Hold
     * リストレイアウトの投稿本体を長押し.
     * => 詳細表示ウィンドウを表示
     */
    delayHoldEvent({
        selector: ".__context_posts>li.short_timeline",
        holdFunc: e =>
            Status.getStatus($(e.target).closest("li").attr("name")).then(post => post.createDetailWindow()),
        delay: 750
    })

    /**
     * #Event
     * 投稿本体(リストレイアウトと文字数超過限定).
     * => 投稿をノーマルレイアウトでポップアップ表示する
     */
    $(document).on("click", "li.short_timeline, li.filtered_timeline, .content_length_limit", e => {
        $("#pop_expand_post").hide() // 一旦閉じる
        const target_li = $(e.target).closest("li")
        if ($(e.target).closest(".tl_group_box").length > 0) // メイン画面のTLの場合はグループから取ってきて表示
            Column.get($(e.target).closest(".column_box")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus(target_li).createExpandWindow(target_li, e, "under")
        else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
            Timeline.getWindow($(e.target)).ref_group.getStatus(target_li).createExpandWindow(target_li, e, "under")
        else if ($(e.target).closest("ul.trend_ul").length > 0) // トレンドタイムラインの場合
            Trend.getStatus(target_li).createExpandWindow(target_li, e, "under")
        else // 他の部分は直接リモートの投稿を取る
            Status.getStatus(target_li.attr("name")).then(post => post.createExpandWindow(target_li, e, "under"))
    })

    /**
     * #Event
     * Misskeyのノート内の引用ノート.
     * => 引用先をノーマルレイアウトでポップアップ表示する
     */
    $(document).on("click", "li .post_quote", e => {
        const target_li = $(e.target).closest("li")
        if ($(e.target).closest(".tl_group_box").length > 0) // メイン画面のTLの場合はグループから取ってきて表示
            Column.get($(e.target).closest(".column_box")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus(target_li).quote.createExpandWindow(target_li, e, "under")
        else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
            Timeline.getWindow($(e.target)).ref_group.getStatus(target_li).quote.createExpandWindow(target_li, e, "under")
        else if ($(e.target).closest("ul.flash_tl").length > 0) // フラッシュタイムラインの場合
            FlashTimeline.getWindow($(e.target)).current.quote.createExpandWindow(target_li, e, "under")
        else if ($(e.target).closest("ul.trend_ul").length > 0) // トレンドタイムラインの場合
            Trend.getStatus(target_li).quote.createExpandWindow(target_li, e, "under")
        else // 他の部分は直接リモートの投稿を取る
            Status.getStatus(target_li.attr("name")).then(post => post.quote.createExpandWindow(target_li, e, "under"))
    })

    /**
     * #Event #Mouseleave
     * 投稿ポップアップ.
     * => マウスが出たらポップアップを消す(リプライとそれ以外で動きを変える)
     */
    $(document).on("mouseleave", "#pop_expand_post>ul>li", e => {
        if ($("#pop_expand_post").is(".reply_pop")) $("#pop_expand_post").hide()
        else $("#pop_expand_post").hide(...Preference.getAnimation("POP_FOLD"))
    })

    /**
     * #Event #Mouseenter #Mouseleave
     * リストレイアウトの投稿本体に対してホバー.
     * => オプションが有効な場合は両脇サイドにポップアップを表示する
     */
    if (Preference.GENERAL_PREFERENCE.enable_pop_hover_list) { // オプションが有効な場合にイベント定義
        $(document).on("mouseenter", "li.short_timeline", e => {
            const target_li = $(e.target).closest("li")
            if ($(e.target).closest(".tl_group_box").length > 0) // メイン画面のTLの場合はグループから取ってきて表示
                Column.get($(e.target).closest(".column_box")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
                    .getStatus(target_li).createExpandWindow(target_li, e, "side")
            else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
                Timeline.getWindow($(e.target)).ref_group.getStatus(target_li).createExpandWindow(target_li, e, "side")
            else if ($(e.target).closest("ul.trend_ul").length > 0) // トレンドタイムラインの場合
                Trend.getStatus(target_li).createExpandWindow(target_li, e, "side")
        })
        // マウスを離したら閉じる
        $(document).on("mouseleave", "li.short_timeline", e => {
            // 発火した場所がポップアップした投稿の場合は無視
            if ($(e.relatedTarget).closest("#pop_expand_post").length > 0) return
            $("#pop_expand_post").hide()
        })
    }

    /**
     * #Event #Mouseenter
     * リプライ付きの投稿本体に対してホバー.
     * => 直前のリプライを表示
     */
    if (Preference.GENERAL_PREFERENCE.enable_pop_prev_reply) $(document).on("mouseenter",
        "li.replied_post:not(.chat_timeline), li.replied_post.chat_timeline>.content", e => {
            const target_li = $(e.target).closest("li")
            let target_post = null
            if ($(e.target).closest(".tl_group_box").length > 0) // メイン画面のTLの場合はグループから取ってきて表示
                target_post = Column.get($(e.target).closest(".column_box"))
                    .getGroup($(e.target).closest(".tl_group_box").attr("id")).getStatus(target_li)
            else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
                target_post = Timeline.getWindow($(e.target)).ref_group.getStatus(target_li)

            // 対象の投稿が取得できたらそこからリプライ先を探して表示
            target_post?.findReplyTo()?.createExpandWindow(target_li, e, "reply")
        })

    /**
     * #Event #Mouseenter
     * 投稿本体に対してホバー.
     * => 表示アカウントのアクションバーを表示
     */
    if (Preference.GENERAL_PREFERENCE.enable_action_palette) $(document).on("mouseenter",
        "li:not(.chat_timeline, .filtered_timeline, .context_disabled), li.chat_timeline>.content", e => {
            // リストレイアウト無効化オプションがついているときはなにもしない
            if (!Preference.GENERAL_PREFERENCE.enable_list_action_palette && $(e.currentTarget).is(".short_timeline")) return
            let target_post = null
            if ($(e.target).closest(".tl_group_box").length > 0)
                // メインタイムラインの場合はGroupのステータスマップから取得
                target_post = Column.get($(e.target).closest(".column_box"))
                    .getGroup($(e.target).closest(".tl_group_box").attr("id")).getStatus($(e.target).closest("li"))
            else if ($(e.target).closest("ul.scrollable_tl").length > 0)
                // 一時スクロールタイムラインの場合は静的マップから取得
                target_post = Timeline.getWindow($(e.target)).ref_group.getStatus($(e.target).closest("li"))
            else if ($(e.target).closest("ul.flash_tl").length > 0)
                // フラッシュタイムラインの場合も静的マップから取得
                target_post = FlashTimeline.getWindow($(e.target)).current
            else return  // 取得できないタイムラインは実行しない

            // 外部インスタンスに対しては使用不可
            if (target_post.from_timeline?.pref?.external) return
            const pos = $(e.currentTarget).offset()
            const height = $(e.currentTarget).innerHeight()

            // リストレイアウトの場合は縮小表示
            if ($(e.target).closest("li").is(".short_timeline")) $("#pop_expand_action").addClass("list_action")
            else $("#pop_expand_action").removeClass("list_action")

            // プラットフォームによって初期表示を変更
            if (target_post.from_account.platform == 'Misskey') { // Misskey
                $("#pop_expand_action>.reactions>.recent").html(target_post.from_account.recent_reaction_html)
                // 既についてるリアクションを表示(オプションが有効な場合)
                if (Preference.GENERAL_PREFERENCE.enable_already_reaction) target_post.bindSentReactions()
                $("#pop_expand_action .__short_quote").prop("disabled", !target_post.allow_reblog)
                $("#pop_expand_action .__short_bookmark").hide()
                $("#pop_expand_action .__short_quote").show()
                $("#pop_expand_action .__short_open_reaction").show()
            } else { // Mastodon
                $("#pop_expand_action .__short_bookmark").show()
                $("#pop_expand_action .__short_quote").hide()
                $("#pop_expand_action .__short_open_reaction").hide()
                $("#pop_expand_action>.sent_reactions").hide()
            }
            $("#pop_expand_action .__short_reblog").prop("disabled", !target_post.allow_reblog)
            $("#pop_expand_action>.reactions").hide()
            $("#pop_expand_action>.impressions").hide()

            // 一時データに設定してアクションバーを開く
            Status.TEMPORARY_ACTION_STATUS = target_post
            $("#pop_expand_action").css({
                "top": `${pos.top + height - 4}px`,
                "left": `${pos.left}px`,
            }).show()
        })

    /**
     * #Event
     * 簡易アクションバー: リプライ.
     */
    $(document).on("click", ".__short_reply", e => Status.TEMPORARY_ACTION_STATUS.from_account
        .reaction('__menu_reply', null, Status.TEMPORARY_ACTION_STATUS))

    /**
     * #Event
     * 簡易アクションバー: ブースト/リノート.
     */
    $(document).on("click", ".__short_reblog", e => Status.TEMPORARY_ACTION_STATUS.from_account
        .reaction('__menu_reblog', null, Status.TEMPORARY_ACTION_STATUS))

    /**
     * #Event
     * 簡易アクションバー: 引用.
     */
    $(document).on("click", ".__short_quote", e => Status.TEMPORARY_ACTION_STATUS.from_account
        .reaction('__menu_quote', null, Status.TEMPORARY_ACTION_STATUS))

    /**
     * #Event
     * 簡易アクションバー: お気に入り.
     */
    $(document).on("click", ".__short_fav", e => Status.TEMPORARY_ACTION_STATUS.from_account
        .reaction('__menu_favorite', null, Status.TEMPORARY_ACTION_STATUS))

    /**
     * #Event
     * 簡易アクションバー: ブックマーク.
     */
    $(document).on("click", ".__short_bookmark", e => Status.TEMPORARY_ACTION_STATUS.from_account
        .reaction('__menu_bookmark', null, Status.TEMPORARY_ACTION_STATUS))

    /**
     * #Event
     * 簡易アクションバー: 最近のリアクションを開く.
     */
    $(document).on("click", ".__short_open_reaction",
        e => $("#pop_expand_action>.reactions").show(...Preference.getAnimation("SLIDE_DOWN")))

    /**
     * #Event
     * 簡易アクションバー: 外部ブラウザで開く.
     */
    $(document).on("click", ".__short_browser",
        e => window.accessApi.openExternalBrowser(Status.TEMPORARY_ACTION_STATUS.uri))

    /**
     * #Event
     * 簡易アクションバー: ここから遡る.
     */
    $(document).on("click", ".__short_prepost", e => Status.TEMPORARY_ACTION_STATUS.openScrollableWindow())

    /**
     * #Event
     * 簡易アクションバー: ここからフラッシュする.
     */
    $(document).on("click", ".__short_flash", e => Status.TEMPORARY_ACTION_STATUS.openFlash())

    /**
     * #Event
     * 簡易アクションバー: リストレイアウトで開く.
     */
    $(document).on("click", ".__short_open_list",
        e => Status.TEMPORARY_ACTION_STATUS.openScrollableWindow("list"))

    /**
     * #Event
     * 簡易アクションバー: 簡易インプレッション表示.
     */
    $(document).on("click", ".__short_impression",
        e => Status.getStatus(Status.TEMPORARY_ACTION_STATUS.uri).then(post => {
            $("#pop_expand_action>.impressions>.impress_reply").text(post.count_reply)
            $("#pop_expand_action>.impressions>.impress_reblog").text(post.count_reblog)
            $("#pop_expand_action>.impressions>.impress_fav").text(post.count_fav)
            $("#pop_expand_action>.impressions").show(...Preference.getAnimation("FADE_STD"))
        }))

    /**
     * #Event
     * 簡易アクションバー: 直近のリアクション.
     */
    $(document).on("click", "#pop_expand_action .__on_emoji_reaction",
        e => Status.TEMPORARY_ACTION_STATUS.from_account.sendReaction({
            id: Status.TEMPORARY_ACTION_STATUS.id,
            shortcode: $(e.target).closest(".__on_emoji_reaction").attr("name"),
            success: () => $("#pop_expand_action").hide()
        }))

    /**
     * #Event
     * 簡易アクションバー: 他のリアクションを送る.
     */
    $(document).on("click", ".__short_other_reaction", e => Status.TEMPORARY_ACTION_STATUS.from_account
        .reaction('__menu_reaction', null, Status.TEMPORARY_ACTION_STATUS))

    /**
     * #Event #Mouseleave
     * 投稿本体からマウスアウト.
     * => アクションバー以外の場所にマウスが出たらアクションバーポップアップを消す
     */
    $(document).on("mouseleave", "li:not(.chat_timeline), li.chat_timeline>.content", e => {
        if ($(e.target).closest(".tl_group_box").length == 0 && $(e.target).closest("ul.scrollable_tl").length == 0
            && $(e.target).closest("ul.flash_tl").length == 0) return

        // ポップアップが表示されている場合は消去
        if ($("#pop_expand_post").is(':visible') && $(e.relatedTarget).closest("#pop_expand_post").length == 0)
            $("#pop_expand_post").hide() // 位置がおかしくなるので即座に消す

        // アクションバーに移動した場合は消さない
        if ($(e.relatedTarget).closest("#pop_expand_action").length > 0) return
        $("#pop_expand_action").hide()
    })

    /**
     * #Event #Mouseleave
     * アクションバーからマウスアウト.
     * => アクションバーポップアップを消す
     */
    $(document).on("mouseleave", "#pop_expand_action", e => {
        // 元のウィンドウに移動した場合は消さない
        if ($(e.relatedTarget).closest("li.normal_layout, li.chat_timeline>.content").length > 0) return
        $("#pop_expand_action").hide()
    })

    /**
     * #Event
     * 詳細表示: ハッシュタグ.
     * => ハッシュタグ検索を実行
     */
    $(document).on("click", ".__on_detail_hashtag", e => {
        Query.createSearchWindow()
        $("#pop_ex_timeline #__txt_search_query").val(`#${$(e.target).attr('name')}`)
        $("#pop_ex_timeline #__on_search").click()
    })

    /**
     * #Event
     * 送信履歴: 削除/解除ボタン.
     * => 対象の投稿を削除/アクション解除する
     */
    $(document).on("click", ".__del_history", e => History.delete($(e.target)))

    /**
     * #Event
     * 送信履歴: 編集ボタン.
     * => 対象の投稿を編集モードで本文投稿フォームに展開する
     */
    $(document).on("click", ".__edit_history", e => History.edit($(e.target)))

    /**
     * #Event
     * ユーザープロフィール: ピンどめ.
     * => ピンどめ投稿を閉じる
     */
    $(document).on("click", ".account_timeline .pinned_block>h4", e => {
        const btn = $(e.target)
        if (btn.is(".closed")) { // 既に閉じていた場合は開く
            btn.removeClass("closed")
            btn.next().css('height', 'calc((100vh - 310px) * 0.2)')
            btn.closest(".column_profile").find(".posts").css('height', 'calc((100vh - 310px) * 0.6)')
        } else { // 開いている場合は閉じる
            btn.addClass("closed")
            btn.next().css('height', '32px')
            btn.closest(".column_profile").find(".posts").css('height', 'calc(((100vh - 310px) * 0.8) - 32px)')
        }
    })

    /**
     * #Event
     * ユーザープロフィール: 投稿数.
     * => ユーザーの投稿を表示
     */
    $(document).on("click", ".account_timeline .count_post", e => {
        $(e.target).closest(".column_profile").find(".user_ff_elm").hide()
        $(e.target).closest(".column_profile").find(".user_bookmark_elm").hide()
        $(e.target).closest(".column_profile").find(".user_post_elm").show()
    })

    /**
     * #Event
     * ユーザープロフィール: フォロー数.
     * => フォロイー一覧を表示
     */
    $(document).on("click", ".account_timeline .count_follow:not(.label_private)",
        e => User.getCache($(e.target).closest(".column_profile")).createFFTaglist('follows'))

    /**
     * #Event
     * ユーザープロフィール: フォロワー数.
     * => フォロワー一覧を表示
     */
    $(document).on("click", ".account_timeline .count_follower:not(.label_private)",
        e => User.getCache($(e.target).closest(".column_profile")).createFFTaglist('followers'))

    /**
     * #Event
     * ユーザープロフィール: お気に入り(Mastodon).
     * => お気に入り一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_mastfav",
        e => User.getCache($(e.target).closest(".column_profile")).createBookmarkList('Favorite_Mastodon'))

    /**
     * #Event
     * ユーザープロフィール: お気に入り(Misskey).
     * => お気に入り一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_miskfav",
        e => User.getCache($(e.target).closest(".column_profile")).createBookmarkList('Favorite_Misskey'))

    /**
     * #Event
     * ユーザープロフィール: ブックマーク.
     * => ブックマーク一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_bookmark",
        e => User.getCache($(e.target).closest(".column_profile")).createBookmarkList('Bookmark'))

    /**
     * #Event
     * ユーザープロフィール: リアクション.
     * => 最近リアクションを送信したノート一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_reaction",
        e => User.getCache($(e.target).closest(".column_profile")).createBookmarkList('Reaction'))

    /**
     * #Event
     * ユーザープロフィール: プラットフォームアイコン.
     * => ユーザーが所属しているインスタンスの情報を表示
     */
    $(document).on("click", ".account_timeline .__on_show_instance",
        e => User.getCache($(e.target).closest(".column_profile")).getInstance().then(instance => instance.createDetailHtml()))

    /**
     * #Event
     * ユーザープロフィール: 投稿タブ.
     * => ユーザーの投稿一覧を表示
     */
    $(document).on("click", ".account_timeline .__tab_profile_posts", e => {
        $(e.target).closest(".user_post_elm").find(".media_uls").hide()
        $(e.target).closest(".user_post_elm").find(".channel_uls").hide()
        $(e.target).closest(".user_post_elm").find(".post_uls").show()
    })

    /**
     * #Event
     * ユーザープロフィール: チャンネルタブ.
     * => ユーザーのチャンネル投稿一覧を表示
     */
    $(document).on("click", ".account_timeline .__tab_profile_channels", e => {
        if ($(e.target).closest(".user_post_elm").find(".channel_uls>ul").is(":empty"))
            // メディアタイムラインを未取得の場合は取得する
            User.getCache($(e.target).closest(".column_profile")).createChannelPosts()
        $(e.target).closest(".user_post_elm").find(".post_uls").hide()
        $(e.target).closest(".user_post_elm").find(".media_uls").hide()
        $(e.target).closest(".user_post_elm").find(".channel_uls").show()
    })

    /**
     * #Event
     * ユーザープロフィール: メディアタブ.
     * => ユーザーのメディアを含む投稿の一覧を表示
     */
    $(document).on("click", ".account_timeline .__tab_profile_medias", e => {
        if ($(e.target).closest(".user_post_elm").find(".media_uls>ul").is(":empty"))
            // メディアタイムラインを未取得の場合は取得する
            User.getCache($(e.target).closest(".column_profile")).createMediaGallery()
        $(e.target).closest(".user_post_elm").find(".post_uls").hide()
        $(e.target).closest(".user_post_elm").find(".channel_uls").hide()
        $(e.target).closest(".user_post_elm").find(".media_uls").show()
    })

    /**
     * #Event
     * ユーザープロフィール: フォロー/フォロワーのネームタグ.
     * => フルプロフィールを新しくウィンドウを生成して表示
     */
    $(document).on("click", ".account_timeline .ff_nametags>li",
        e => User.getByAddress($(e.target).closest("li").attr("name")).then(user => user.createDetailWindow()))

    /*=== Context Menu Event =====================================================================================*/

    /**
     * #Event #Contextmenu
     * ポストを右クリック.
     * => 投稿用のコンテキストメニューを表示
     */
    $(document).on("contextmenu", "ul.__context_posts>li:not(.short_userinfo, .context_disabled)", e => {
        // タイムライングループでの表示(メイン画面のTL)の場合のフラグを保存
        const tl_group_flg = $(e.target).closest(".tl_group_box").length > 0

        // 認証アカウント一覧と自分の投稿は削除可能にする
        if ($(e.target).closest("li").is(".self_post")) {
            const post_id = $(e.target).closest("li").attr("id")
            $("#pop_context_menu .__menu_post_del, #pop_context_menu .__menu_post_edit")
                .removeClass("ui-state-disabled").attr("name", post_id.substring(post_id.indexOf('@')))
        } else if ($(e.target).closest(".allaccount_user").length > 0) // すべてのアカウント一覧
            $("#pop_context_menu .__menu_post_del, #pop_context_menu .__menu_post_edit")
                .removeClass("ui-state-disabled").attr("name", $(e.target).closest(".column_profile").attr("name"))
        else $("#pop_context_menu .__menu_post_del, #pop_context_menu .__menu_post_edit").addClass("ui-state-disabled")

        // フォロ限などはブースト/リノートを禁止
        if ($(e.target).closest("li").is(".reblog_disabled")) $(
            "#pop_context_menu #__menu_reblog, #pop_context_menu #__menu_quote, #pop_context_menu #__menu_limited_renote")
            .closest("li").addClass("ui-state-disabled")
        else $("#pop_context_menu #__menu_reblog, #pop_context_menu #__menu_quote, #pop_context_menu #__menu_limited_renote")
            .closest("li").removeClass("ui-state-disabled")

        // メイン画面のTL出ない場合は遡りを禁止
        if (!tl_group_flg) $("#pop_context_menu .__menu_post_open_temporary, #pop_context_menu .__menu_post_open_flash, #pop_context_menu .__menu_parent_post_open_layout").addClass("ui-state-disabled")
        else $("#pop_context_menu .__menu_post_open_temporary, #pop_context_menu .__menu_post_open_flash, #pop_context_menu .__menu_parent_post_open_layout").removeClass("ui-state-disabled")

        // コンテキストメニューを表示して投稿データをstaticに一時保存
        popContextMenu(e, "pop_context_menu")
        if (tl_group_flg) Status.TEMPORARY_CONTEXT_STATUS = Column.get($(e.target).closest(".column_box"))
            .getGroup($(e.target).closest(".tl_group_box").attr("id")).getStatus($(e.target).closest("li"))
        $("#pop_context_menu").attr("name", $(e.target).closest("li").attr("name"))
        return false
    })

    /**
     * #Event #Contextmenu
     * ユーザー詳細を右クリック.
     * => ユーザーアクション用のコンテキストメニューを表示
     */
    $(document).on("contextmenu", "ul.__context_user>li", e => {
        popContextMenu(e, "pop_context_user")
        $("#pop_context_user").attr("name", $(e.target).closest(".column_profile").attr("name"))
        return false
    })
    $(document).on("contextmenu", "li.short_userinfo, li.user_nametag", e => {
        popContextMenu(e, "pop_context_user")
        $("#pop_context_user").attr("name", $(e.target).closest("li").attr("name"))
        return false
    })

    /**
     * #Event #Contextmenu
     * コンテキストメニュー以外をクリック.
     * => 表示してあるコンテキストメニューを閉じる
     */
    $("body").on("click", e => {
        $("#pop_context_menu").hide(...Preference.getAnimation("WINDOW_FOLD"))
        $("#pop_context_user").hide(...Preference.getAnimation("WINDOW_FOLD"))
        if (!$(e.target).is("#header>#head_postarea .posticon"))
            // 投稿アイコン以外をクリックした場合に投稿アカウント変更を隠す
            $("#pop_postuser").hide(...Preference.getAnimation("WINDOW_FOLD"))
        if ($(e.target).closest("#__open_draft").length == 0)
            $("#pop_draft").hide(...Preference.getAnimation("WINDOW_FOLD"))
        if ($(e.target).closest("#pop_notif_log").length == 0 && $(e.target).closest("#__on_notification").length == 0)
            $("#pop_notif_log").hide(...Preference.getAnimation("WINDOW_FOLD"))
    })

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: アカウント項目.
     * => 投稿に対して指定したアカウントからアクションを実行
     */
    $(document).on("click", "#pop_context_menu>.ui_menu>li ul.account_menu>li", e => {
        const target_account = Account.get($(e.target).closest("li").attr("name"))
        $("#pop_context_menu").hide(...Preference.getAnimation("WINDOW_FOLD"))
        target_account.reaction($(e.target).closest("ul").attr("id"), $("#pop_context_menu").attr("name"), null)
    })

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 範囲指定リノートの各項目.
     * => 投稿を指定した範囲にリノートする
     */
    $(document).on("click",
        "#pop_context_menu>.ui_menu ul.__limited_renote_send>li, #pop_context_menu>.ui_menu ul.__renote_send_channel>li", e => {
            const target_account = Account.get($(e.target).closest("ul.__limited_renote_send").attr("name"))
            $("#pop_context_menu").hide(...Preference.getAnimation("WINDOW_FOLD"))
            const clicked_elm = $(e.target).closest("li")
            let option = null
            if (clicked_elm.is(".__renote_send_local")) option = 'local'
            else if (clicked_elm.is(".__renote_send_home")) option = 'home'
            else option = clicked_elm.attr("name")
            target_account.renote($("#pop_context_menu").attr("name"), option)
        })

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 詳細表示.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_detail",
        e => Status.getStatus($("#pop_context_menu").attr("name")).then(post => post.createDetailWindow()))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: URLをコピー.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_url",
        e => navigator.clipboard.writeText($("#pop_context_menu").attr("name"))
            .then(() => Notification.info("投稿のURLをコピーしました.")))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: ブラウザで開く.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_open_browser",
        e => window.accessApi.openExternalBrowser($("#pop_context_menu").attr("name")))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: ここから前に遡る.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_open_temporary",
        e => Status.TEMPORARY_CONTEXT_STATUS.openScrollableWindow())

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: ここからフラッシュする.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_open_flash",
        e => Status.TEMPORARY_CONTEXT_STATUS.openFlash())

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 別レイアウトで遡る.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu ul#__menu_post_open_layout>li",
        e => Status.TEMPORARY_CONTEXT_STATUS.openScrollableWindow($(e.target).closest("li").attr("name")))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 前後のLTLを取得.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu ul#__menu_post_open_localtimeline>li",
        e => Status.getStatus($("#pop_context_menu").attr("name"))
        .then(post => post.openLocalTimelineWindow($(e.target).closest("li").attr("name"))))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 編集.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_edit",
        e => Status.getStatus($("#pop_context_menu").attr("name")).then(post => post.edit()))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 削除.
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_del", e =>
        Account.get($(e.target).closest("li").attr("name")).deletePost($("#pop_context_menu").attr("name")))

    /**
     * #Event #Contextmenu
     * ユーザー系メニュー: アカウント項目.
     * => ユーザーに対して指定したアカウントからアクションを実行
     */
    $(document).on("click", "#pop_context_user>.ui_menu>li ul>li", e => {
        const target_account = Account.get($(e.target).closest("li").attr("name"))
        $("#pop_context_user").hide(...Preference.getAnimation("WINDOW_FOLD"))
        target_account.userAction({
            target_mode: $(e.target).closest("ul").attr("id"),
            target_user: $("#pop_context_user").attr("name")
        })
    })

    /*=== Other Event ============================================================================================*/

    /**
     * #Event
     * 投稿本文ウィンドウ: 投稿ボタン.
     * => ヘッダ領域の投稿ボタンをクリック
     */
    $(document).on("click", "#__on_textwindow_submit", e => $("#header #__on_submit").click())

    /**
     * #Event
     * 投稿本文ウィンドウ: 上に戻すボタン.
     * => ウィンドウを閉じる
     */
    $(document).on("click", "#__on_textwindow_close", e => toggleTextarea())

    /**
     * #Event #Keydown
     * 検索ウィンドウ: 検索フォームでエンターで検索処理を実行.
     */
    $(document).on("click", "#__on_search", e => Query.onSearchTimeline())
    $(document).on("keydown", "#__txt_search_query", e => {
        if (e.keyCode === 13) { // Enterで検索処理実行
            $("#__on_search").click()
            return false
        }
    })

    /**
     * #Event
     * トレンドウィンドウ: トレンドタグ.
     * => 対象のタグで投稿を検索してウィンドウに表示する
     */
    $(document).on("click", "#pop_ex_timeline>.trend_timeline>ul.trend_tags>li",
        e => Trend.TREND_TAG_MAP.get($(e.target).closest("li").attr("name")).search())

    /**
     * #Event
     * トレンドウィンドウ: ホットトピックを表示ボタン.
     * => 各サーバーで注目の投稿を一覧表示する
     */
    $(document).on("click", "#pop_ex_timeline>.trend_timeline>.__on_get_features", e => Trend.bindFeatures())

    /**
     * #Event
     * マルチウィンドウ: 閉じるボタン.
     * => キャッシュを消してからウィンドウを閉じてDOM自体を消去する
     */
    $(document).on("click", "#pop_multi_window .window_close_button", e => {
        const target_window = $(e.target).closest(".ex_window")
        if (target_window.is("#singleton_submit_window")) {
            // 投稿ウィンドウの場合トグルルーチンを呼んで終了
            toggleTextarea()
            return
        } else if (target_window.is(".account_timeline.single_user")) User.deleteCache(target_window.find(".column_profile"))
        else if (target_window.is(".account_timeline.allaccount_user")) // ユーザーキャッシュをすべてクリア
            target_window.find(".column_profile").each((index, elm) => User.deleteCache($(elm)))
        else if (target_window.is(".timeline_window")) Timeline.deleteWindow(target_window)
        else if (target_window.is(".flash_window")) FlashTimeline.deleteWindow(target_window)
        target_window.hide(...Preference.getAnimation("WINDOW_FOLD"), () => target_window.remove())
    })

    /**
     * #Event #Mousedown
     * マルチウィンドウ: どっかしらクリック.
     * => クリックしたウィンドウを先頭に移動
     */
    $(document).on("mousedown", "#pop_multi_window>.ex_window", e => {
        $("#pop_multi_window>.ex_window").removeClass('active')
        $(e.target).closest(".ex_window").addClass('active')
    })

    /**
     * #Event
     * フラッシュウィンドウ: 次へボタン.
     * => 次の投稿を表示する(次がない場合は閉じる)
     */
    $(document).on("click", ".__on_flash_next",
        e => FlashTimeline.getWindow($(e.target).closest(".flash_window").find("ul.flash_tl")).next().bind())

    /**
     * #Event
     * フラッシュウィンドウ: 前へボタン.
     * => 前の投稿を表示する
     */
    $(document).on("click", ".__on_flash_prev",
        e => FlashTimeline.getWindow($(e.target).closest(".flash_window").find("ul.flash_tl")).prev().bind())

    /**
     * #Event #Wheel
     * フラッシュウィンドウ: マウスホイール移動.
     * => 下スクロールで過去へ、上スクロールで現在へ向かって投稿を送る
     */
    window.addEventListener("wheel", e => {
        if ($(e.target).closest(".flash_tl").length == 0) return
        if (e.deltaY > 0) FlashTimeline.getWindow($(e.target).closest(".flash_window").find("ul.flash_tl")).prev().bind()
        else FlashTimeline.getWindow($(e.target).closest(".flash_window").find("ul.flash_tl")).next().bind()
    })

    /**
     * #Event
     * 一時タイムラインウィンドウ: リロードボタン.
     * => 一時タイムラインを再読み込みする.
     */
    $(document).on("click", "#pop_multi_window .window_temp_reload_button",
        e => TemporaryTimeline.getTempWindow($(e.target)).reload())

    /**
     * #Event
     * 一時タイムラインウィンドウ: リロードボタン.
     * => 一時タイムラインを再読み込みする.
     */
    $(document).on("click", "#pop_multi_window .window_temp_favorite_button",
        e => TemporaryTimeline.getTempWindow($(e.target)).favorite())

    /**
     * #Event
     * 一時タイムラインウィンドウ: 続きをロードボタン.
     * => 一時タイムラインのトップから先の投稿を取得する.
     */
    $(document).on("click", ".__on_temp_top_loader", e => TemporaryTimeline.getTempWindow($(e.target)).loadTop())

    /**
     * #Event
     * 画面リサイズイベント.
     * => プロフィール画面を表示している場合は適当な大きさにリサイズする
     */
    let resize_timer = 0
    window.addEventListener("resize", () => {
        clearTimeout(resize_timer)
        resize_timer = setTimeout(() => {
            // カラムをリサイズ
            Column.setWidthLimit()
            // ユーザープロフィールウィンドウをリサイズ
            if ($("#pop_multi_window>.account_timeline").length > 0) $(".account_timeline .column_profile")
                .each((index, elm) => User.setHeight($(elm), $(elm).find(".pinned_block").length > 0))
        }, 250)
    })

    /**
     * #Event #Change
     * ブックマーク/お気に入り: アカウント変更時.
     * => ブックマークとリアクションを切り替える
     */
    $(document).on("change", "#pop_bookmark_option #__cmb_ex_bookmark_account", e => {
        if (Account.get($("#__cmb_ex_bookmark_account").val()).platform == 'Misskey') { // Misskey
            $("#__opt_ex_bookmark_type1").attr("value", "Favorite_Misskey")
            $("#__opt_ex_bookmark_type2").attr("value", "Reaction")
            $("#__opt_ex_bookmark_type2+label").text("リアクション")
        } else { // Mastodon
            $("#__opt_ex_bookmark_type1").attr("value", "Favorite_Mastodon")
            $("#__opt_ex_bookmark_type2").attr("value", "Bookmark")
            $("#__opt_ex_bookmark_type2+label").text("ブックマーク")
        }
    })

    /**
     * #Event
     * ブックマーク/お気に入り: OKボタン.
     * => ブックマークを展開
     */
    $(document).on("click", "#pop_bookmark_option #__on_ex_bookmark_confirm", e => {
        Account.get($("#__cmb_ex_bookmark_account").val()).getUserCache().then(user => user.createBookmarkWindow({
            type: $("input.__opt_ex_bookmark_type:checked").val(),
            layout: $("#__cmb_ex_bookmark_layout").val(),
            expand_cw: $("#__chk_ex_bookmark_cw").prop("checked"),
            expand_media: $("#__chk_ex_bookmark_media").prop("checked")
        }))
        // ミニウィンドウを閉じる
        $("#pop_bookmark_option").hide(...Preference.getAnimation("LEFT_DROP"))
    })

    /**
     * #Event #Change
     * 一時タイムライン: アカウント変更時.
     * => タイプ/リスト/チャンネルコンボボックスの表示制御(mist_ui.js)
     */
    $(document).on("change", "#pop_temporary_option .__cmb_tl_account",
        e => changeColAccountEvent($("#pop_temporary_option"), Account.get($(e.target).val())))

    /**
     * #Event #Change
     * 一時タイムライン: その他のインスタンスドメイン変更時.
     * => インスタンスの簡易情報を取得
     */
    $(document).on("change", "#pop_temporary_option .__txt_external_instance",
        e => changeColExternalHostEvent($(e.target).val(), $(e.target).closest(".lbl_external_instance")))

    /**
     * #Event #Change
     * 一時タイムライン: タイムラインの種類変更時.
     * => タイプ/リスト/チャンネルコンボボックスの表示制御(mist_ui.js)
     */
    $(document).on("change", "#pop_temporary_option .__cmb_tl_type", e => changeColTypeEvent($("#pop_temporary_option"), $(e.target).val()))

    /**
     * #Event #Change
     * 一時タイムライン: レイアウトの種類変更時.
     * => マルチ以外はマルチの設定を表示しない
     */
    $(document).on("change", "#pop_temporary_option .__cmb_tl_layout", e => {
        if ($(e.target).find("option:selected").val() != 'multi') $("#pop_temporary_option .tl_layout_options").hide()
        else $("#pop_temporary_option .tl_layout_options").show()
    })

    /**
     * #Event
     * 一時タイムライン: お気に入りクリック時.
     * => お気に入りの設定をロードして一時タイムラインを開く.
     */
    $(document).on("click", "#pop_temporary_option>.temp_favorite>.temptl_list", e => {
        TemporaryTimeline.get($(e.target).attr("name")).createTemporaryTimeline()
        // ミニウィンドウを閉じる
        $("#pop_temporary_option").hide(...Preference.getAnimation("LEFT_DROP"))
    })

    /**
     * #Event
     * 一時タイムライン: お気に入りの削除ボタンクリック時.
     * => 対象のお気に入りを削除する.
     */
    $(document).on("click", "#pop_temporary_option>.temp_favorite>.temptl_list>.delele_tempfav_button",
        e => TemporaryTimeline.get($(e.target).closest(".temptl_list").attr("name")).delete())

    /**
     * #Event
     * 一時タイムライン: OKボタン.
     * => 入力した設定内容で一時タイムラインを展開.
     */
    $(document).on("click", "#pop_temporary_option #__on_ex_temporary_confirm", e => {
        const temptl_pref = TemporaryTimeline.getPrefForm()
        TemporaryTimeline.create(temptl_pref).then(tl => tl.createTemporaryTimeline())
        // ミニウィンドウを閉じる
        $("#pop_temporary_option").hide(...Preference.getAnimation("LEFT_DROP"))
    })

    /**
     * #Event
     * 各種ウィンドウの閉じるボタン.
     */
    $(document).on("click", "#__on_reply_close", e => $("#pop_extend_column").hide(...Preference.getAnimation("EXTEND_DROP")))
    $(document).on("click", "#__on_search_close", e => $("#pop_ex_timeline").hide(...Preference.getAnimation("EXTEND_DROP")))
    $(document).on("click", ".__on_drive_media_cancel", e => $(e.target).closest(".drive_window").find(".window_close_button").click())
    $(document).on("click", "#__on_ex_bookmark_cancel", e => $("#pop_bookmark_option").hide(...Preference.getAnimation("LEFT_DROP")))
    $(document).on("click", "#__on_ex_temporary_cancel", e => $("#pop_temporary_option").hide(...Preference.getAnimation("LEFT_DROP")))
    $(document).on("click", "#pop_lastest_release .window_close_button",
        e => $("#pop_lastest_release").hide(...Preference.getAnimation("LEFT_DROP"), () => $("#pop_lastest_release").remove()))

})

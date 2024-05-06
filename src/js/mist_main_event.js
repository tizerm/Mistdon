$(() => {
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
     * => カスタム絵文字一覧を表示
     */
    $("#__open_emoji_palette").on("click", e => {
        Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).createEmojiList()
        // サジェストテキストボックスにフォーカス
        $("#__txt_emoji_search").focus()
    })

    /**
     * #Event #Keyup
     * ツールメニュー-カスタム絵文字一覧: カスタム絵文字一覧のサジェストテキストボックス.
     * => カスタム絵文字をショートコードで絞り込み
     */
    $(document).on("keyup", "#__txt_emoji_search", e => {
        const suggest = $(e.target).val()
        if (!suggest) { // 空欄の場合すべて表示
            $(".emoji_list>*").show()
            return
        }
        // 一旦全部消してから一致するやつを抽出
        $(".emoji_list>*").hide()
        $(`.emoji_list>a.__on_emoji_append[name*="${suggest}"]`).show()
    })

    /**
     * #Event #Keyup
     * リアクション一覧のサジェストテキストボックス.
     * => リアクション絵文字をショートコードで絞り込み
     */
    $(document).on("keyup", "#__txt_reaction_search", e => {
        const suggest = $(e.target).val()
        if (!suggest) { // 空欄の場合すべて表示
            $(".reaction_list>*").show()
            return
        }
        // 一旦全部消してから一致するやつを抽出
        $(".reaction_list>*").hide()
        $(`.reaction_list>a.__on_emoji_reaction[name*="${suggest}"]`).show()
    })

    /**
     * #Event
     * ツールメニュー-カスタム絵文字一覧: カスタム絵文字一覧の絵文字.
     * => 現在アクティブなフォームにカスタム絵文字のショートコードを挿入
     */
    $(document).on("click", "#pop_custom_emoji .__on_emoji_append", e => {
        let target = null
        let target_account = null
        if ($(".reply_col").is(":visible")) { // リプライウィンドウ
            target = $(".reply_col #__txt_replyarea")
            target_account = Account.get($("#__hdn_reply_account").val())
        } else if ($(".quote_col").is(":visible")) { // 引用ウィンドウ
            target = $(".quote_col #__txt_quotearea")
            target_account = Account.get($("#__hdn_quote_account").val())
        } else {
            target = $("#header #__txt_postarea")
            target_account = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"))
        }
        const cursor_pos = target.get(0).selectionStart
        const target_text = target.val()
        let target_emoji = $(e.target).closest(".__on_emoji_append").attr("name")
        // Mastodonの場合前後にスペースを入れる
        if (target_account.platform == 'Mastodon') target_emoji = ` ${target_emoji} `
        target.val(target_text.substring(0, cursor_pos) + target_emoji + target_text.substring(cursor_pos, target_text.length))
        target.focus()

        // 最近使った絵文字に登録
        target_account.updateEmojiHistory(target_emoji)
    })

    /**
     * #Event #Keyup
     * 本文投稿フォーム(キーアップイベント).
     * => 文字数をカウントしてメーターに表示(設定が有効な場合のみ)
     */
    if (Preference.GENERAL_PREFERENCE.enable_tool_button) // ツールボタンが表示されている場合のみイベント定義
        $("#header>#head_postarea #__txt_postarea").on("keyup", e => {
            const length = $(e.target).val().length
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
    $("#__txt_postarea, #__txt_content_warning").on("focus", e => {
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
                $("#__on_emoji_close").click()
            }
        })
        // ダイアログフラグをリセット
        Preference.IGNORE_DIALOG = false
    })

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
        last.post.getRenderContent().then(text => $("#__txt_postarea").val(text))
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
        Media.clearAttachMedia()
        deleteQuoteInfo()
        enabledAdditionalAccount(true)
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
    $(document).on("click", "#pop_dirve_window>ul.drive_folder_list>.__on_select_folder", e => Media.openFolder(
        $("#header>#head_postarea .__lnk_postuser>img").attr("name"), $(e.target).attr("name")))

    /**
     * #Event
     * 添付メディア-ドライブウィンドウ: OKボタン.
     * => 選択したメディアを添付メディアに追加する
     */
    $(document).on("click", "#__on_drive_media_confirm", e => Media.attachDriveMedia())

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
    $("#__txt_postarea").get(0).addEventListener("paste", e => {
        // ファイル以外は無視(普通のペースト)
        if (e.clipboardData.types[0] != 'Files') return true

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
        const target_col = Column.get($(e.target).closest("td"))
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
        Column.get($(e.target).closest("td")).eachGroup(gp => gp.scroll(0)))

    /**
     * #Event
     * カラムボタン: カラムを開く.
     */
    $(document).on("click", ".__on_column_open", e =>
        Column.get($(e.target).closest("td").index(".closed_col")).toggle())

    /**
     * #Event
     * カラムボタン: カラムを閉じる.
     */
    $(document).on("click", ".__on_column_close", e =>
        Column.get($(e.target).closest("td").index(".column_td")).toggle())

    /**
     * #Event
     * カラムボタン: 可変幅ON/OFF.
     */
    $(document).on("click", ".__on_column_flex", e =>
        Column.get($(e.target).closest("td")).toggleFlex())

    /**
     * #Event
     * カラムボタン: リロード.
     * => カラム内のグループすべてリロード
     */
    $(document).on("click", ".__on_column_reload", e =>
        Column.get($(e.target).closest("td")).eachGroup(gp => gp.reload()))

    /**
     * #Event
     * グループボタン: トップへ移動.
     */
    $(document).on("click", ".__on_group_top", e => Column.get($(e.target).closest("td"))
        .getGroup($(e.target).closest(".tl_group_box").attr("id")).scroll(0))

    /**
     * #Event
     * グループボタン: リロード.
     */
    $(document).on("click", ".__on_group_reload", e => Column.get($(e.target).closest("td"))
        .getGroup($(e.target).closest(".tl_group_box").attr("id")).reload())

    /*=== Post Event =============================================================================================*/

    /**
     * #Event
     * ユーザーアドレス.
     * => リモートのユーザー情報を右ウィンドウに表示
     */
    $(document).on("click", ".__lnk_userdetail, .usericon",
        e => User.getByAddress($(e.currentTarget).attr("name")).then(user => user.createDetailWindow()))

    /**
     * #Event
     * Contents Warningヘッダ.
     * => 非表示にしている閲覧注意情報をトグルする
     */
    $(document).on("click", ".expand_header", e =>
        $(e.target).closest("a").next().toggle(...Preference.getAnimation("SLIDE_DOWN")))

    /**
     * #Event
     * 本文のリンク.
     * => 外部ブラウザでリンクを開く
     */
    $(document).on("click", ".content>.main_content a, .prof_field a", e => {
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
            .get($(e.target).closest("td"))
            .getGroup($(e.target).closest(".tl_group_box").attr("id"))
            .getStatus(target_li).createImageModal(image_url)
        else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
            Timeline.getWindow($(e.target)).ref_group.getStatus(target_li).createImageModal(image_url)
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
            Column.get($(e.target).closest("td"))
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
            Column.get($(e.target).closest("td"))
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
        const target_li = $(e.target).closest("li")
        if (target_li.is('.context_disabled')) // フォロー通知の場合はユーザーを直接表示
            User.getByAddress(target_li.find("img.usericon").attr("name")).then(user => user.createDetailWindow())
        else if ($(e.target).closest(".tl_group_box").length > 0) // メイン画面のTLの場合はグループから取ってきて表示
            Column.get($(e.target).closest("td")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus(target_li).createExpandWindow(target_li, e, false)
        else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
            Timeline.getWindow($(e.target)).ref_group.getStatus(target_li).createExpandWindow(target_li, e, false)
        else if ($(e.target).closest("ul.trend_ul").length > 0) // トレンドタイムラインの場合
            Trend.getStatus(target_li).createExpandWindow(target_li, e, false)
        else // 他の部分は直接リモートの投稿を取る
            Status.getStatus(target_li.attr("name")).then(post => post.createExpandWindow(target_li, e, false))
    })

    /**
     * #Event
     * Misskeyのノート内の引用ノート.
     * => 引用先をノーマルレイアウトでポップアップ表示する
     */
    $(document).on("click", "li .post_quote", e => {
        const target_li = $(e.target).closest("li")
        if ($(e.target).closest(".tl_group_box").length > 0) // メイン画面のTLの場合はグループから取ってきて表示
            Column.get($(e.target).closest("td")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus(target_li).quote.createExpandWindow(target_li, e, false)
        else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
            Timeline.getWindow($(e.target)).ref_group.getStatus(target_li).quote.createExpandWindow(target_li, e, false)
        else if ($(e.target).closest("ul.trend_ul").length > 0) // トレンドタイムラインの場合
            Trend.getStatus(target_li).quote.createExpandWindow(target_li, e, false)
        else // 他の部分は直接リモートの投稿を取る
            Status.getStatus(target_li.attr("name")).then(post => post.quote.createExpandWindow(target_li, e, false))
    })

    /**
     * #Event #Mouseleave
     * 投稿ポップアップ.
     * => マウスが出たらポップアップを消す
     */
    $(document).on("mouseleave", "#pop_expand_post>ul>li",
        e => $("#pop_expand_post").hide(...Preference.getAnimation("POP_FOLD")))

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
                target_post = Column.get($(e.target).closest("td"))
                    .getGroup($(e.target).closest(".tl_group_box").attr("id")).getStatus(target_li)
            else if ($(e.target).closest("ul.scrollable_tl").length > 0) // 一時スクロールの場合
                target_post = Timeline.getWindow($(e.target)).ref_group.getStatus(target_li)

            if (target_post) { // 対象の投稿が取得できたらそこからタイムライン上のリプライ元を探す
                const target_timeline = target_post.from_timeline
                const replied_key = target_timeline.status_key_map.get(target_post.reply_to)
                const replied_post = target_timeline.parent_group.status_map.get(replied_key)

                // 存在したらリプライ先を表示
                replied_post?.createExpandWindow(target_li, e, true)
            }
        })

    /**
     * #Event #Mouseenter
     * 投稿本体に対してホバー.
     * => 表示アカウントのアクションバーを表示
     */
    if (Preference.GENERAL_PREFERENCE.enable_action_palette) $(document).on("mouseenter",
        "li:not(.chat_timeline, .short_timeline, .filtered_timeline, .context_disabled), li.chat_timeline>.content", e => {
            let target_post = null
            if ($(e.target).closest(".tl_group_box").length > 0)
                // メインタイムラインの場合はGroupのステータスマップから取得
                target_post = Column.get($(e.target).closest("td"))
                    .getGroup($(e.target).closest(".tl_group_box").attr("id")).getStatus($(e.target).closest("li"))
            else if ($(e.target).closest("ul.scrollable_tl").length > 0)
                // 一時スクロールタイムラインの場合は静的マップから取得
                target_post = Timeline.getWindow($(e.target)).ref_group.getStatus($(e.target).closest("li"))
            else return  // 取得できないタイムラインは実行しない

            // 外部インスタンスに対しては使用不可
            if (target_post.from_timeline?.pref?.external) return
            const pos = $(e.currentTarget).offset()
            const height = $(e.currentTarget).innerHeight()

            // プラットフォームによって初期表示を変更
            if (target_post.from_account.platform == 'Misskey') { // Misskey
                $("#pop_expand_action>.reactions>.recent").html(target_post.from_account.recent_reaction_html)
                $("#pop_expand_action .__short_quote").prop("disabled", !target_post.allow_reblog)
                $("#pop_expand_action .__short_bookmark").hide()
                $("#pop_expand_action .__short_quote").show()
                $("#pop_expand_action .__short_open_reaction").show()
            } else { // Mastodon
                $("#pop_expand_action .__short_bookmark").show()
                $("#pop_expand_action .__short_quote").hide()
                $("#pop_expand_action .__short_open_reaction").hide()
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
    $(document).on("click", ".__short_prepost",
        e => Status.TEMPORARY_ACTION_STATUS.openScrollableWindow())

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
            id: Status.TEMPORARY_ACTION_STATUS.notif_id ?? Status.TEMPORARY_ACTION_STATUS.id,
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
    $(document).on("mouseleave", "li:not(.chat_timeline, .short_timeline), li.chat_timeline>.content", e => {
        if ($(e.target).closest(".tl_group_box").length == 0 && $(e.target).closest("ul.scrollable_tl").length == 0) return

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
            btn.closest("td").find(".posts").css('height', 'calc((100vh - 310px) * 0.6)')
        } else { // 開いている場合は閉じる
            btn.addClass("closed")
            btn.next().css('height', '32px')
            btn.closest("td").find(".posts").css('height', 'calc(((100vh - 310px) * 0.8) - 32px)')
        }
    })

    /**
     * #Event
     * ユーザープロフィール: 投稿数.
     * => ユーザーの投稿を表示
     */
    $(document).on("click", ".account_timeline .count_post", e => {
        $(e.target).closest("td").find(".user_ff_elm").hide()
        $(e.target).closest("td").find(".user_bookmark_elm").hide()
        $(e.target).closest("td").find(".user_post_elm").show()
    })

    /**
     * #Event
     * ユーザープロフィール: フォロー数.
     * => フォロイー一覧を表示
     */
    $(document).on("click", ".account_timeline .count_follow:not(.label_private)",
        e => User.getCache($(e.target).closest("td")).createFFTaglist('follows'))

    /**
     * #Event
     * ユーザープロフィール: フォロワー数.
     * => フォロワー一覧を表示
     */
    $(document).on("click", ".account_timeline .count_follower:not(.label_private)",
        e => User.getCache($(e.target).closest("td")).createFFTaglist('followers'))

    /**
     * #Event
     * ユーザープロフィール: お気に入り(Mastodon).
     * => お気に入り一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_mastfav",
        e => User.getCache($(e.target).closest("td")).createBookmarkList('Favorite_Mastodon'))

    /**
     * #Event
     * ユーザープロフィール: お気に入り(Misskey).
     * => お気に入り一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_miskfav",
        e => User.getCache($(e.target).closest("td")).createBookmarkList('Favorite_Misskey'))

    /**
     * #Event
     * ユーザープロフィール: ブックマーク.
     * => ブックマーク一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_bookmark",
        e => User.getCache($(e.target).closest("td")).createBookmarkList('Bookmark'))

    /**
     * #Event
     * ユーザープロフィール: リアクション.
     * => 最近リアクションを送信したノート一覧を表示
     */
    $(document).on("click", ".account_timeline .__on_show_reaction",
        e => User.getCache($(e.target).closest("td")).createBookmarkList('Reaction'))

    /**
     * #Event
     * ユーザープロフィール: プラットフォームアイコン.
     * => ユーザーが所属しているインスタンスの情報を表示
     */
    $(document).on("click", ".account_timeline .__on_show_instance",
        e => User.getCache($(e.target).closest("td")).getInstance().then(instance => instance.createDetailHtml()))

    /**
     * #Event
     * ユーザープロフィール: 全投稿タブ.
     * => ユーザーの投稿一覧を表示
     */
    $(document).on("click", ".account_timeline .__tab_profile_posts", e => {
        $(e.target).closest(".user_post_elm").find(".media_uls").hide()
        $(e.target).closest(".user_post_elm").find(".post_uls").show()
    })

    /**
     * #Event
     * ユーザープロフィール: メディアタブ.
     * => ユーザーのメディアを含む投稿の一覧を表示
     */
    $(document).on("click", ".account_timeline .__tab_profile_medias", e => {
        if ($(e.target).closest(".user_post_elm").find(".media_uls>ul").is(":empty"))
            // メディアタイムラインを未取得の場合は取得する
            User.getCache($(e.target).closest("td")).createMediaGallery()
        $(e.target).closest(".user_post_elm").find(".post_uls").hide()
        $(e.target).closest(".user_post_elm").find(".media_uls").show()
    })

    /**
     * #Event #Delayhover
     * ユーザープロフィール: フォロー/フォロワーのネームタグに遅延ホバー.
     * => 上部に簡易プロフィールを表示
     */
    delayHoverEvent({
        selector: ".account_timeline .ff_nametags>li",
        enterFunc: e => User.getByAddress($(e.target).closest("li").attr("name"))
            .then(user => $(e.target).closest(".user_ff_elm").find(".ff_short_profile").html(user.short_elm)),
        leaveFunc: e => {},
        delay: 700
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
        } else if ($(e.target).closest("table").is("#auth_account_table"))
            $("#pop_context_menu .__menu_post_del, #pop_context_menu .__menu_post_edit")
                .removeClass("ui-state-disabled").attr("name", $(e.target).closest("td").attr("name"))
        else $("#pop_context_menu .__menu_post_del, #pop_context_menu .__menu_post_edit").addClass("ui-state-disabled")

        // フォロ限などはブースト/リノートを禁止
        if ($(e.target).closest("li").is(".reblog_disabled")) $(
            "#pop_context_menu #__menu_reblog, #pop_context_menu #__menu_quote, #pop_context_menu #__menu_limited_renote")
            .closest("li").addClass("ui-state-disabled")
        else $("#pop_context_menu #__menu_reblog, #pop_context_menu #__menu_quote, #pop_context_menu #__menu_limited_renote")
            .closest("li").removeClass("ui-state-disabled")

        // メイン画面のTL出ない場合は遡りを禁止
        if (!tl_group_flg) $("#pop_context_menu .__menu_post_open_temporary").addClass("ui-state-disabled")
        else $("#pop_context_menu .__menu_post_open_temporary").removeClass("ui-state-disabled")

        // コンテキストメニューを表示して投稿データをstaticに一時保存
        popContextMenu(e, "pop_context_menu")
        if (tl_group_flg) Status.TEMPORARY_CONTEXT_STATUS = Column.get($(e.target).closest("td"))
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
        $("#pop_context_user").attr("name", $(e.target).closest("td").attr("name"))
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
        // ユーザーウィンドウとタイムラインウィンドウはキャッシュマップを削除
        if (target_window.is(".account_timeline")) User.deleteCache(target_window.find("td"))
        else if (target_window.is(".timeline_window")) Timeline.deleteWindow(target_window)
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
     * 画面リサイズイベント.
     * => プロフィール画面を表示している場合は適当な大きさにリサイズする
     */
    let resize_timer = 0
    window.addEventListener("resize", () => {
        // プロフィール画面が表示されていなかったらなにもしない
        if (!$("#pop_ex_timeline").is(":visible") && $("#pop_multi_window>.account_timeline").length == 0) return
        clearTimeout(resize_timer)
        resize_timer = setTimeout(() => $(".account_timeline td.column_profile")
            .each((index, elm) => User.setHeight($(elm), $(elm).find(".pinned_block").length > 0)), 250)
    })

    /**
     * #Event
     * 各種ウィンドウの閉じるボタン.
     */
    $(document).on("click", "#__on_reply_close", e => $("#pop_extend_column").hide(...Preference.getAnimation("EXTEND_DROP")))
    $(document).on("click", "#__on_search_close", e => $("#pop_ex_timeline").hide(...Preference.getAnimation("EXTEND_DROP")))
    $(document).on("click", "#__on_emoji_close", e => $("#pop_custom_emoji").hide(...Preference.getAnimation("LEFT_DROP")))
    $(document).on("click", "#__on_drive_media_cancel", e => $("#pop_dirve_window").hide(...Preference.getAnimation("FADE_STD")))
    $(document).on("click", "#pop_lastest_release .window_close_button",
        e => $("#pop_lastest_release").hide(...Preference.getAnimation("LEFT_DROP"), () => $("#pop_lastest_release").remove()))

    /**
     * #Event
     * すべての認証アカウントのプロフィール表示: 閉じるボタン.
     * => キャッシュを消してからウィンドウを閉じる
     */
    $(document).on("click", "#__on_alluser_close", e => {
        // ユーザーキャッシュをすべてクリア
        $("#pop_ex_timeline td.column_profile").each((index, elm) => User.deleteCache($(elm)))
        $("#pop_ex_timeline").hide(...Preference.getAnimation("EXTEND_DROP"))
    })

})

// HTMLロード時にイベントをバインド
$(() => {
    /*=== Navigation Event =======================================================================================*/

    /**
     * #Event
     * 検索ボタン
     */
    $("#navi .navi_search").on("click", e => Query.createSearchWindow())

    /**
     * #Event
     * 送信履歴ボタン
     */
    $("#navi .navi_history").on("click", e => History.createHistoryWindow())

    /**
     * #Event
     * 全体プロフィールボタン
     */
    $("#navi .navi_show_profile").on("click", e => Account.createProfileTimeline())

    /**
     * #Event
     * 絵文字キャッシュクリアボタン
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
     * キーボードショートカット早見表ボタン
     */
    $("#navi #on_help_keybind").on("click", e => {
        // ヘルプウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="help_col">
                <h2>キーボードショートカット早見表</h2>
                <div class="help_content"></div>
                <button type="button" id="__on_help_close" class="close_button">×</button>
            </div>
        `))
        $("#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)
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
     * 投稿アカウントアイコン
     * => アカウント変更メニュー表示
     */
    $("#header>#head_postarea .__lnk_postuser").on("click", e =>
        $("#pop_postuser").show("slide", { direction: "up" }, 150))

    /**
     * #Event
     * アカウント変更メニュー項目
     * => 投稿アカウントを変更
     */
    $(document).on("click", ".__lnk_account_elm", e => {
        Account.get($(e.target).closest(".__lnk_account_elm").attr('name')).setPostAccount()
        $("#pop_postuser").hide("slide", { direction: "up" }, 150)
    })

    /**
     * #Event
     * カスタム絵文字呼び出しボタン
     * => カスタム絵文字一覧を表示
     */
    $("#header>#head_postarea #__open_emoji_palette").on("click", e => {
        Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).createEmojiList()
        // サジェストテキストボックスにフォーカス
        $("#__txt_emoji_search").focus()
    })

    /**
     * #Event #Keyup
     * カスタム絵文字一覧のサジェストテキストボックス
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
     * リアクション一覧のサジェストテキストボックス
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
     * カスタム絵文字一覧の絵文字
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

    // TODO: このへん投稿オプションに関して
    $("#header>#head_postarea #__open_post_options").on("click",
        e => $("#header>#post_options").toggle("slide", { direction: "up" }, 120))

    $("#header>#head_postarea #__txt_postarea").on("focus", e => {
        if ($("#header>#post_options").is(":visible")) return // 投稿オプションが見えていたらなにもしない
        $("#header>#post_options").show("slide", { direction: "up" }, 120)
    })

    $("body").on("click", e => {
        if ($(e.target).closest("#post_options").length > 0
            || $(e.target).is("#__txt_postarea")) return // オプションをクリックしたときは無視
        $("#header>#post_options").hide("slide", { direction: "up" }, 120)
    })

    /**
     * #Event
     * 投稿ボタン
     */
    $("#header #__on_submit").on("click", e =>
        Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).post({
            content: $("#__txt_postarea").val(),
            option_obj: $("#post_options"),
            // 投稿成功時処理(書いた内容を消す)
            success: () => {
                $("#__txt_postarea").val("")
                $("#__on_reset_option").click()
                $("#header>#post_options").hide("slide", { direction: "up" }, 120)
                $("#__on_emoji_close").click()
            }
        }))

    /**
     * #Event
     * リアクション絵文字一覧の絵文字
     * => リアクションを送信
     */
    $(document).on("click", "#pop_extend_column>.reaction_col .__on_emoji_reaction",
        e => Account.get($("#__hdn_reaction_account").val()).sendReaction({
            id: $("#__hdn_reaction_id").val(),
            shortcode: $(e.target).closest(".__on_emoji_reaction").attr("name"),
            // 投稿成功時処理(リプライウィンドウを閉じる)
            success: () => $("#pop_extend_column").hide("slide", { direction: "right" }, 150)
        }))

    /**
     * #Event
     * 直前の投稿を削除ボタン
     */
    $("#header #on_last_delete").on("click", e => History.popIf(last => {}, true))

    /**
     * #Event
     * 直前の投稿を削除して編集ボタン
     */
    $("#header #on_last_delete_paste").on("click", e => History.popIf(last => {
        last.post.from_account.setPostAccount()
        $("#__txt_postarea").val(last.post.original_text)
        $("#__txt_content_warning").val(last.post.cw_text)
    }, true))

    /**
     * #Event
     * 直前の投稿をコピーボタン
     */
    $("#header #on_last_copy").on("click", e => History.popIf(last => {
        $("#__txt_postarea").val(last.post.original_text)
        $("#__txt_content_warning").val(last.post.cw_text)
        toast("直前の投稿内容を再展開しました.", "done")
    }, false))

    /**
     * #Event
     * 直前の投稿につなげるボタン
     */
    $("#header #on_last_replychain").on("click", e => History.popIf(last => last.post.createReplyWindow(), false))

    /*=== Post Option Article Area Event =========================================================================*/

    $("#header>#post_options #__on_reset_option").on("click", e => {
        $('#header>#post_options input[type="text"]').val("")
        deleteQuoteInfo()
    })

    $("#header>#post_options #open_drive").on("click",
        e => Media.openDriveWindow($("#header>#head_postarea .__lnk_postuser>img").attr("name")))

    /*=== Column And Group Event =================================================================================*/

    /**
     * #Event
     * タイムライングループ本体
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
     * カラムボタン: トップへ移動
     * => カラム内のグループすべてトップに移動
     */
    $(document).on("click", ".__on_column_top", e =>
        Column.get($(e.target).closest("td")).eachGroup(gp => gp.scroll(0)))

    /**
     * #Event
     * カラムボタン: カラムを開く
     */
    $(document).on("click", ".__on_column_open", e =>
        Column.get($(e.target).closest("td").index(".closed_col")).toggle())

    /**
     * #Event
     * カラムボタン: カラムを閉じる
     */
    $(document).on("click", ".__on_column_close", e =>
        Column.get($(e.target).closest("td").index(".column_td")).toggle())

    /**
     * #Event
     * カラムボタン: 可変幅ON/OFF
     */
    $(document).on("click", ".__on_column_flex", e =>
        Column.get($(e.target).closest("td")).toggleFlex())

    /**
     * #Event
     * カラムボタン: リロード
     * => カラム内のグループすべてリロード
     */
    $(document).on("click", ".__on_column_reload", e =>
        Column.get($(e.target).closest("td")).eachGroup(gp => gp.reload()))

    /**
     * #Event
     * グループボタン: トップへ移動
     */
    $(document).on("click", ".__on_group_top", e => Column.get($(e.target).closest("td"))
        .getGroup($(e.target).closest(".tl_group_box").attr("id")).scroll(0))

    /**
     * #Event
     * グループボタン: リロード
     */
    $(document).on("click", ".__on_group_reload", e => Column.get($(e.target).closest("td"))
        .getGroup($(e.target).closest(".tl_group_box").attr("id")).reload())

    /*=== Post Event =============================================================================================*/

    /**
     * #Event
     * ユーザーアドレス
     * => リモートのユーザー情報を右ウィンドウに表示
     */
    $(document).on("click", ".__lnk_userdetail, .usericon", e => User.getByAddress($(e.target).attr("name"))
        .then(user => user.createDetailWindow())
        .catch(jqXHR => toast("ユーザーの取得でエラーが発生しました.", "error")))

    /**
     * #Event
     * Contents Warningヘッダ
     * => 非表示にしている閲覧注意情報をトグルする
     */
    $(document).on("click", ".expand_header", e =>
        $(e.target).closest("a").next().toggle("slide", { direction: "up" }, 100))

    /**
     * #Event
     * 本文のリンク
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
     * 画像サムネイル
     * => 画像拡大モーダルを表示
     */
    $(document).on("click", ".__on_media_expand", e => {
        const image_url = $(e.target).closest(".__on_media_expand").attr("href")
        if ($(e.target).closest(".tl_group_box").length > 0) Column // カラム内の投稿の場合
            .get($(e.target).closest("td"))
            .getGroup($(e.target).closest(".tl_group_box").attr("id"))
            .getStatus($(e.target).closest("li"))
            .createImageModal(image_url)
        else // リモートのデータを直接取得して表示する場合はURLではなくインデクスで判定を行う
            Status.getStatus($(e.target).closest("li").attr("name"))
                .then(post => post.createImageModal(image_url, $(e.target).closest("a").index()))
        return false
    })

    /**
     * #Event
     * モーダル内部の要素をクリック
     * => 画像拡大モーダルを閉じる(動画には反応しない)
     */
    $(document).on("click", "#modal_expand_image", e => {
        if ($(e.target).is("video")) return // 動画の場合はなにもしない
        $("#modal_expand_image").hide("fade", 80, () => $("#modal_expand_image video").remove())
    })

    /**
     * #Event #Mouseenter
     * モーダル下部の画像サムネイルにホバー
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
     * アンケートの投票ボタン
     * => 押した内容で投票して中間結果を表示する
     */
    $(document).on("click", ".__on_poll_vote", e => {
        if ($(e.target).closest(".tl_group_box").length > 0) // TLに表示されているものはそのまま使用
            Column.get($(e.target).closest("td"))
                .getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus($(e.target).closest("li")).vote($(e.target))
        else Status.TEMPORARY_CONTEXT_STATUS.vote($(e.target)) // ポップアップの場合は一時保存から取得
    })

    /**
     * #Event
     * 投稿日時
     * => 投稿を右ウィンドウに詳細表示する
     */
    $(document).on("click", ".__on_datelink", e =>
        Status.getStatus($(e.target).closest("li").attr("name")).then(post => post.createDetailWindow()))

    /**
     * #Event #Hold
     * リストレイアウトの投稿本体を長押し
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
     * 投稿本体(チャットレイアウトとリストレイアウト限定)
     * => 投稿をノーマルレイアウトでポップアップ表示する
     */
    $(document).on("click", "li.short_timeline, li.chat_timeline>.content", e => {
        if ($(e.target).is(".expand_header")) return // CW展開は無視
        const target_li = $(e.target).closest("li")
        if ($(e.target).closest(".tl_group_box").length > 0) // メイン画面のTLの場合はグループから取ってきて表示
            Column.get($(e.target).closest("td")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
                .getStatus(target_li).createExpandWindow(target_li)
        else // 他の部分は直接リモートの投稿を取る
            Status.getStatus(target_li.attr("name")).then(post => post.createExpandWindow(target_li))
    })

    /**
     * #Event #Mouseleave
     * 投稿ポップアップ
     * => マウスが出たらポップアップを消す
     */
    $(document).on("mouseleave", "#pop_expand_post>ul>li", e => $("#pop_expand_post").hide("fade", 80))

    /**
     * #Event #Mouseenter
     * 投稿本体に対してホバー(ノーマルレイアウトとチャットレイアウト限定)
     * => 表示アカウントのアクションバーを表示
     */
    $(document).on("mouseenter", "li.normal_layout, li.chat_timeline>.content", e => {
        // メイン画面のタイムラインのみ有効
        if ($(e.target).closest(".tl_group_box").length == 0) return
        const target_post = Column.get($(e.target).closest("td"))
            .getGroup($(e.target).closest(".tl_group_box").attr("id")).getStatus($(e.target).closest("li"))
        // 外部インスタンスに対しては使用不可
        if (target_post.from_timeline?.pref?.external) return
        const pos = $(e.currentTarget).offset()
        const height = $(e.currentTarget).innerHeight()

        // プラットフォームによって初期表示を変更
        if (target_post.from_account.platform == 'Misskey') { // Misskey
            $("#pop_expand_action>.reactions>.recent").html(target_post.from_account.recent_reaction_html)
            $("#pop_expand_action .__short_bookmark").hide()
            $("#pop_expand_action .__short_quote").show()
            $("#pop_expand_action .__short_open_reaction").show()
        } else { // Mastodon
            $("#pop_expand_action .__short_bookmark").show()
            $("#pop_expand_action .__short_quote").hide()
            $("#pop_expand_action .__short_open_reaction").hide()
        }
        $("#pop_expand_action>.reactions").hide()

        // 一時データに設定してアクションバーを開く
        Status.TEMPORARY_ACTION_STATUS = target_post
        $("#pop_expand_action").css({
            "top": `${pos.top + height - 2}px`,
            "left": `${pos.left}px`,
        }).show()
    })

    /**
     * #Event
     * 簡易アクションバー: リプライ
     */
    $(document).on("click", ".__short_reply", e => Status.TEMPORARY_ACTION_STATUS.from_account.reaction({
        target_mode: '__menu_reply',
        target_url: Status.TEMPORARY_ACTION_STATUS.uri
    }))

    /**
     * #Event
     * 簡易アクションバー: ブースト/リノート
     */
    $(document).on("click", ".__short_reblog", e => Status.TEMPORARY_ACTION_STATUS.from_account.reaction({
        target_mode: '__menu_reblog',
        target_url: Status.TEMPORARY_ACTION_STATUS.uri
    }))

    /**
     * #Event
     * 簡易アクションバー: 引用
     */
    $(document).on("click", ".__short_quote", e => Status.TEMPORARY_ACTION_STATUS.from_account.reaction({
        target_mode: '__menu_quote',
        target_url: Status.TEMPORARY_ACTION_STATUS.uri
    }))

    /**
     * #Event
     * 簡易アクションバー: お気に入り
     */
    $(document).on("click", ".__short_fav", e => Status.TEMPORARY_ACTION_STATUS.from_account.reaction({
        target_mode: '__menu_favorite',
        target_url: Status.TEMPORARY_ACTION_STATUS.uri
    }))

    /**
     * #Event
     * 簡易アクションバー: ブックマーク
     */
    $(document).on("click", ".__short_bookmark", e => Status.TEMPORARY_ACTION_STATUS.from_account.reaction({
        target_mode: '__menu_bookmark',
        target_url: Status.TEMPORARY_ACTION_STATUS.uri
    }))

    /**
     * #Event
     * 簡易アクションバー: 最近のリアクションを開く
     */
    $(document).on("click", ".__short_open_reaction",
        e => $("#pop_expand_action>.reactions").show("slide", { direction: "up" }, 80))

    /**
     * #Event
     * 簡易アクションバー: 外部ブラウザで開く
     */
    $(document).on("click", ".__short_browser",
        e => window.accessApi.openExternalBrowser(Status.TEMPORARY_ACTION_STATUS.uri))

    /**
     * #Event
     * 簡易アクションバー: ここから遡る
     */
    $(document).on("click", ".__short_prepost",
        e => Status.TEMPORARY_ACTION_STATUS.openScrollableWindow())

    /**
     * #Event
     * 簡易アクションバー: 直近のリアクション
     */
    $(document).on("click", "#pop_expand_action .__on_emoji_reaction",
        e => Status.TEMPORARY_ACTION_STATUS.from_account.sendReaction({
            id: Status.TEMPORARY_ACTION_STATUS.id,
            shortcode: $(e.target).closest(".__on_emoji_reaction").attr("name"),
            success: () => $("#pop_expand_action").hide()
        }))

    /**
     * #Event
     * 簡易アクションバー: 他のリアクションを送る
     */
    $(document).on("click", ".__short_other_reaction", e => Status.TEMPORARY_ACTION_STATUS.from_account.reaction({
        target_mode: '__menu_reaction',
        target_url: Status.TEMPORARY_ACTION_STATUS.uri
    }))

    /**
     * #Event #Mouseleave
     * 投稿本体からマウスアウト
     * => アクションバー以外の場所にマウスが出たらアクションバーポップアップを消す
     */
    $(document).on("mouseleave", "li.normal_layout, li.chat_timeline>.content", e => {
        // メイン画面のタイムラインのみ有効
        if ($(e.target).closest(".tl_group_box").length == 0) return
        // アクションバーに移動した場合は消さない
        if ($(e.relatedTarget).closest("#pop_expand_action").length > 0) return
        $("#pop_expand_action").hide()
    })

    /**
     * #Event #Mouseleave
     * アクションバーからマウスアウト
     * => アクションバーポップアップを消す
     */
    $(document).on("mouseleave", "#pop_expand_action", e => {
        // 元のウィンドウに移動した場合は消さない
        if ($(e.relatedTarget).closest("li.normal_layout, li.chat_timeline>.content").length > 0) return
        $("#pop_expand_action").hide()
    })

    /**
     * #Event
     * 詳細表示: ハッシュタグ
     * => ハッシュタグ検索を実行
     */
    $(document).on("click", ".__on_detail_hashtag", e => {
        $("#pop_extend_column").hide()
        Query.createSearchWindow()
        $("#pop_ex_timeline #__txt_search_query").val(`#${$(e.target).attr('name')}`)
        $("#pop_ex_timeline #__on_search").click()
    })

    /**
     * #Event
     * 送信履歴: 削除/解除ボタン
     * => 対象の投稿を削除/アクション解除する
     */
    $(document).on("click", ".__del_history", e => History.delete($(e.target)))

    /**
     * #Event
     * ユーザープロフィール: ピンどめ
     * => ピンどめ投稿を閉じる
     */
    $(document).on("click", "#pop_ex_timeline .pinned_block>h4", e => {
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
     * ユーザープロフィール: 投稿数
     * => ユーザーの投稿を表示
     */
    $(document).on("click", "#pop_ex_timeline>.account_timeline .count_post", e => {
        $(e.target).closest("td").find(".user_ff_elm").hide()
        $(e.target).closest("td").find(".user_bookmark_elm").hide()
        $(e.target).closest("td").find(".user_post_elm").show()
    })

    /**
     * #Event
     * ユーザープロフィール: フォロー数
     * => フォロイー一覧を表示
     */
    $(document).on("click", "#pop_ex_timeline>.account_timeline .count_follow", e =>
        User.getByAddress($(e.target).closest("td").attr("id")).then(user => user.createFFTaglist('follows')))

    /**
     * #Event
     * ユーザープロフィール: フォロワー数
     * => フォロワー一覧を表示
     */
    $(document).on("click", "#pop_ex_timeline>.account_timeline .count_follower", e =>
        User.getByAddress($(e.target).closest("td").attr("id")).then(user => user.createFFTaglist('followers')))

    /**
     * #Event
     * ユーザープロフィール: お気に入り(Mastodon)
     * => お気に入り一覧を表示
     */
    $(document).on("click", "#pop_ex_timeline .auth_details .__on_show_mastfav", e =>
        Account.get($(e.target).closest("td").attr("id")).getInfo().then(user => user.createBookmarkList('Favorite_Mastodon')))

    /**
     * #Event
     * ユーザープロフィール: お気に入り(Misskey)
     * => お気に入り一覧を表示
     */
    $(document).on("click", "#pop_ex_timeline .auth_details .__on_show_miskfav", e =>
        Account.get($(e.target).closest("td").attr("id")).getInfo().then(user => user.createBookmarkList('Favorite_Misskey')))

    /**
     * #Event
     * ユーザープロフィール: ブックマーク
     * => ブックマーク一覧を表示
     */
    $(document).on("click", "#pop_ex_timeline .auth_details .__on_show_bookmark", e =>
        Account.get($(e.target).closest("td").attr("id")).getInfo().then(user => user.createBookmarkList('Bookmark')))

    /**
     * #Event
     * ユーザープロフィール: リアクション
     * => 最近リアクションを送信したノート一覧を表示
     */
    $(document).on("click", "#pop_ex_timeline .auth_details .__on_show_reaction", e =>
        Account.get($(e.target).closest("td").attr("id")).getInfo().then(user => user.createBookmarkList('Reaction')))

    /**
     * #Event #Delayhover
     * ユーザープロフィール: フォロー/フォロワーのネームタグに遅延ホバー
     * => 上部に簡易プロフィールを表示
     */
    delayHoverEvent({
        selector: "#pop_ex_timeline>.auth_user .ff_nametags>li",
        enterFunc: e => User.getByAddress($(e.target).closest("li").attr("name"))
            .then(user => $(e.target).closest(".user_ff_elm").find(".ff_short_profile").html(user.short_elm)),
        leaveFunc: e => {},
        delay: 500
    })

    /**
     * #Event
     * ユーザープロフィール: フォロー/フォロワーのネームタグ
     * => フルプロフィールの簡易ポップアップを表示
     */
    $(document).on("click", "#pop_ex_timeline>.auth_user .ff_nametags>li", e =>
        User.getByAddress($(e.target).closest("li").attr("name")).then(user => user.createDetailPop($(e.target))))

    /**
     * #Event #Delayhover
     * ユーザープロフィール: 簡易ポップアップからリリース
     * => 簡易ポップアップを閉じる
     */
    $(document).on("mouseleave", "#pop_ex_timeline>.ff_pop_user", e => {
        const to = $(e.relatedTarget)
        // コンテキストメニューに移動した場合はなにもしない
        if (to.closest(".pop_context").length > 0) return
        $(e.currentTarget).hide("fade", 80)
    })

    /*=== Context Menu Event =====================================================================================*/

    /**
     * #Event #Contextmenu
     * ポストを右クリック
     * => 投稿用のコンテキストメニューを表示
     */
    $(document).on("contextmenu", "ul.__context_posts>li", e => {
        // タイムライングループでの表示(メイン画面のTL)の場合のフラグを保存
        const tl_group_flg = $(e.target).closest(".tl_group_box").length > 0
        if ($(e.target).closest("li").is(".short_userinfo")) return // 簡易プロフィールは無視
        if ($(e.target).closest("table").is("#auth_account_table")) // 認証アカウント一覧のときは削除可能にする
            $("#pop_context_menu .__menu_post_del") // 削除クラスを消してnameにアカウントアドレスを付与
                .removeClass("ui-state-disabled").attr("name", $(e.target).closest("td").attr("id"))
        else $("#pop_context_menu .__menu_post_del").addClass("ui-state-disabled")
        if (!tl_group_flg) // メイン画面のTL出ない場合は遡りを禁止
            $("#pop_context_menu .__menu_post_open_temporary").addClass("ui-state-disabled")
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
     * ユーザー詳細を右クリック
     * => ユーザーアクション用のコンテキストメニューを表示
     */
    $(document).on("contextmenu", "ul.__context_user>li", e => {
        popContextMenu(e, "pop_context_user")
        $("#pop_context_user").attr("name", $(e.target).closest("td").attr("id"))
        return false
    })
    $(document).on("contextmenu", "li.short_userinfo, li.user_nametag", e => {
        popContextMenu(e, "pop_context_user")
        $("#pop_context_user").attr("name", $(e.target).closest("li").attr("name"))
        return false
    })

    /**
     * #Event #Contextmenu
     * コンテキストメニュー以外をクリック
     * => 表示してあるコンテキストメニューを閉じる
     */
    $("body").on("click", e => {
        $("#pop_context_menu").hide("slide", { direction: "left" }, 100)
        $("#pop_context_user").hide("slide", { direction: "left" }, 100)
        if (!$(e.target).is("#header>#head_postarea .posticon")) 
            // 投稿アイコン以外をクリックした場合に投稿アカウント変更を隠す
            $("#pop_postuser").hide("slide", { direction: "up" }, 150)
        if (!$(e.target).is("#header>#head_postarea #__on_post_to_misskey>*")) 
            // 投稿アイコン以外をクリックした場合に投稿アカウント変更を隠す
            $("#pop_post_to").hide("slide", { direction: "up" }, 150)
    })

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: アカウント項目
     * => 投稿に対して指定したアカウントからアクションを実行
     */
    $(document).on("click", "#pop_context_menu>.ui_menu>li ul>li", e => {
        const target_account = Account.get($(e.target).closest("li").attr("name"))
        $("#pop_context_menu").hide("slide", { direction: "up" }, 100)
        target_account.reaction({
            target_mode: $(e.target).closest("ul").attr("id"),
            target_url: $("#pop_context_menu").attr("name")
        })
    })

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 詳細表示
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_detail",
        e => Status.getStatus($("#pop_context_menu").attr("name")).then(post => post.createDetailWindow()))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: URLをコピー
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_url",
        e => navigator.clipboard.writeText($("#pop_context_menu").attr("name"))
            .then(() => toast(`投稿のURLをコピーしました.`, "done")))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: ブラウザで開く
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_open_browser",
        e => window.accessApi.openExternalBrowser($("#pop_context_menu").attr("name")))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: ここから前に遡る
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_open_temporary",
        e => Status.TEMPORARY_CONTEXT_STATUS.openScrollableWindow())

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: 削除
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_del", e =>
        Account.get($(e.target).closest("li").attr("name")).deletePost($("#pop_context_menu").attr("name")))

    /**
     * #Event #Contextmenu
     * ユーザー系メニュー: アカウント項目
     * => ユーザーに対して指定したアカウントからアクションを実行
     */
    $(document).on("click", "#pop_context_user>.ui_menu>li ul>li", e => {
        const target_account = Account.get($(e.target).closest("li").attr("name"))
        $("#pop_context_user").hide("slide", { direction: "up" }, 100)
        target_account.userAction({
            target_mode: $(e.target).closest("ul").attr("id"),
            target_user: $("#pop_context_user").attr("name")
        })
    })

    /*=== Other Event ============================================================================================*/

    /**
     * #Event
     * 検索ウィンドウ: 検索処理実行
     */
    $(document).on("click", "#__on_search", e => Query.onSearchTimeline())

    /**
     * #Event
     * 一時ウィンドウ: 透過ボックス
     * => ホバーアウトしたときにウィンドウを透過するクラスを付与する
     */
    $(document).on("change", "#__window_opacity", e => {
        if ($(e.target).prop('checked')) $("#pop_window_timeline").addClass("__opacity_on")
        else $("#pop_window_timeline").removeClass("__opacity_on")
    })

    /**
     * #Event
     * 各種閉じるボタン
     */
    $(document).on("click", "#__on_reply_close", e =>
        $("#pop_extend_column").hide("slide", { direction: "right" }, 150))
    $(document).on("click", "#__on_search_close", e =>
        $("#pop_ex_timeline").hide("slide", { direction: "right" }, 150))
    $(document).on("click", "#__on_emoji_close", e =>
        $("#pop_custom_emoji").hide("slide", { direction: "left" }, 150))
    $(document).on("click", "#__on_pop_window_close", e =>
        $("#pop_window_timeline").hide("fade", 150))
})

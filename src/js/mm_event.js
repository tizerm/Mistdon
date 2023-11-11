﻿// HTMLロード時にイベントをバインド
$(() => {
    /*=== Navigation Event =======================================================================================*/

    /**
     * #Event
     * 検索ボタン
     */
    $("#navi .navi_search").on("click", e => Query.createSearchWindow())

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
                <button type="button" id="__on_help_close">×</button>
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
     * 公開範囲(Visibility)
     */
    $(document).on("click", ".__lnk_visibility", e => {
        // 選択中のオプションにselectedクラスを付与
        $(e.target).closest(".visibility_icon").find("img").removeClass("selected")
        $(e.target).closest(".__lnk_visibility").find("img").addClass("selected")
    })

    /**
     * #Event
     * カスタム絵文字呼び出しボタン
     * => カスタム絵文字一覧を表示
     */
    $("#header>#head_postarea #on_custom_emoji").on("click", e => {
        // リプライウィンドウを開いている場合はリプライアカウントに合わせる
        if ($(".reply_col").is(":visible")) Account.get($("#__hdn_reply_account").val()).createEmojiList()
        else if ($(".quote_col").is(":visible")) Account.get($("#__hdn_quote_account").val()).createEmojiList()
        else Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).createEmojiList()
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
        target.val(target_text.substr(0, cursor_pos) + target_emoji + target_text.substr(cursor_pos, target_text.length))
        target.focus()
    })

    /**
     * #Event
     * 投稿ボタン
     */
    $("#header #on_submit").on("click", e =>
        Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).post({
            content: $("#__txt_postarea").val(),
            cw_text: $("#__txt_content_warning").val(),
            visibility_id: $("#header>#head_postarea .visibility_icon .selected").attr("id"),
            // 投稿成功時処理(書いた内容を消す)
            success: () => {
                $("#__txt_postarea").val("")
                $("#__txt_content_warning").val("")
                $("#__on_emoji_close").click()
            }
        }))

    /**
     * #Event
     * 投稿ボタン(リプライウィンドウ)
     */
    $(document).on("click", "#__on_reply_submit", e => Account.get($("#__hdn_reply_account").val()).post({
        content: $("#__txt_replyarea").val(),
        visibility_id: $("#__hdn_reply_visibility").val(), // 投稿元の公開範囲を継承する
        reply_id: $("#__hdn_reply_id").val(),
        // 投稿成功時処理(リプライウィンドウを閉じる)
        success: () => {
            $("#pop_extend_column").hide("slide", { direction: "right" }, 150)
            $("#__on_emoji_close").click()
        }
    }))

    /**
     * #Event
     * 投稿ボタン(引用投稿ウィンドウ)
     */
    $(document).on("click", "#__on_quote_submit", e => Account.get($("#__hdn_quote_account").val()).post({
        content: $("#__txt_quotearea").val(),
        cw_text: $("#__txt_quote_cw").val(),
        visibility_id: $("#pop_extend_column .visibility_icon .selected").attr("id"),
        quote_id: $("#__hdn_quote_id").val(),
        // 投稿成功時処理(引用ウィンドウを閉じる)
        success: () => {
            $("#pop_extend_column").hide("slide", { direction: "right" }, 150)
            $("#__on_emoji_close").click()
        }
    }))

    /**
     * #Event
     * リアクション絵文字一覧の絵文字
     * => リアクションを送信
     */
    $(document).on("click", ".__on_emoji_reaction", e => Account.get($("#__hdn_reaction_account").val()).sendReaction({
        id: $("#__hdn_reaction_id").val(),
        shortcode: $(e.target).closest(".__on_emoji_reaction").attr("name"),
        // 投稿成功時処理(リプライウィンドウを閉じる)
        success: () => $("#pop_extend_column").hide("slide", { direction: "right" }, 150)
    }))

    /**
     * #Event
     * 直前の投稿を削除ボタン
     */
    $("#header #on_last_delete").on("click", e => Status.lastStatusIf(
        last => last.delete((post, uuid) => toast("直前の投稿を削除しました.", "done", uuid)), true))

    /**
     * #Event
     * 直前の投稿を削除して編集ボタン
     */
    $("#header #on_last_delete_paste").on("click", e => Status.lastStatusIf(
        last => last.delete((post, uuid) => {
            post.from_account.setPostAccount()
            $("#__txt_postarea").val(post.original_text)
            $("#__txt_content_warning").val(post.cw_text)
            toast("直前の投稿を削除しました. 内容を再展開します.", "done", uuid)
        }), true))

    /**
     * #Event
     * 直前の投稿をコピーボタン
     */
    $("#header #on_last_copy").on("click", e => Status.lastStatusIf(last => {
        $("#__txt_postarea").val(last.original_text)
        $("#__txt_content_warning").val(last.cw_text)
        toast("直前の投稿内容を再展開しました.", "done")
    }, false))

    /**
     * #Event
     * 直前の投稿につなげるボタン
     */
    $("#header #on_last_replychain").on("click", e => Status.lastStatusIf(last => last.createReplyWindow(), false))

    /**
     * #Event #Focus
     * 投稿本文テキストエリア
     * => ウィンドウの横幅が800pxを切っていた場合テキストエリアを拡張
     */
    $("#header #__txt_postarea").on("focus", e => {
        if (window.innerWidth < 800) $(e.target).css("width", "calc(100vw - 334px)")
    })

    /**
     * #Event #Blur
     * 投稿本文テキストエリア
     * => 拡張されたテキストエリアをもとに戻す
     */
    $("#header #__txt_postarea").on("blur", e => $(e.target).css("width", "calc(100vw - 514px)"))

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
    $(document).on("click", ".__lnk_userdetail", e => User.getByAddress($(e.target).attr("name"))
        .then(user => user.createDetailWindow())
        .catch(jqXHR => toast("ユーザーの取得でエラーが発生しました.", "error")))

    /**
     * #Event
     * Contents Warningヘッダ
     * => 非表示にしている閲覧注意情報をトグルする
     */
    $(document).on("click", ".expand_header", e =>
        $(e.target).next().toggle("slide", { direction: "up" }, 100))

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
     * => 画像を右に拡大表示する
     */
    $(document).on("click", ".__on_media_expand", e => {
        const link = $(e.target).closest(".__on_media_expand")

        // 動画ファイル(GIFアニメも含む)
        if (link.attr("type") == 'video' || link.attr("type") == 'gifv') $("#pop_expand_image").html(`
            <div class="expand_image_col">
                <video src="${link.attr("href")}" autoplay controls loop></video>
            </div>`).show("slide", { direction: "right" }, 80)
        else { // それ以外は画像ファイル
            // アプリケーションのアス比を計算
            const window_aspect = window.innerWidth / window.innerHeight
            const image_aspect = link.attr("name")
            $("#pop_expand_image")
                .html(`<div class="expand_image_col"><img src="${link.attr("href")}"/></div>`)
                .show("slide", { direction: "right" }, 80)
            if (image_aspect > window_aspect) // ウィンドウよりも画像のほうが横幅ながめ
                $("#pop_expand_image>.expand_image_col>img").css('width', '85vw').css('height', 'auto')
            else // ウィンドウよりも画像のほうが縦幅ながめ
                $("#pop_expand_image>.expand_image_col>img").css('height', '85vh').css('width', 'auto')
        }

        return false
    })

    /**
     * #Event
     * 拡大された画像以外の場所をクリック
     * => 表示されている拡大画像を閉じる
     */
    $("body").on("click", e => {
        if (!$(e.target).is(".expand_image_col>*")) $("#pop_expand_image")
            // 閉じたときに動画が裏で再生されないように閉じた後中身を消す
            .hide("slide", { direction: "right" }, 80, () => $("#pop_expand_image").empty())
    })

    /**
     * #Event
     * 投稿日時
     * => 投稿を右ウィンドウに詳細表示する
     */
    $(document).on("click", ".__on_datelink", e =>
        Status.getStatus($(e.target).closest("li").attr("name")).then(post => post.createDetailWindow()))

    /**
     * #Event
     * 投稿本体(チャットレイアウトとリストレイアウト限定)
     * => 投稿をノーマルレイアウトでポップアップ表示する
     */
    $(document).on("click", "li.short_timeline, li.chat_timeline>.content", e => {
        if ($(e.target).is(".expand_header")) return // CW展開は無視
        const target_li = $(e.target).closest("li")
        Column.get($(e.target).closest("td")).getGroup($(e.target).closest(".tl_group_box").attr("id"))
            .getStatus(target_li).createExpandWindow(target_li)
    })

    /**
     * #Event #Mouseleave
     * 投稿ポップアップ
     * => マウスが出たらポップアップを消す
     */
    $(document).on("mouseleave", "#pop_expand_post>ul>li", e => $("#pop_expand_post").hide("fade", 80))

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
     * TODO: まだ実装中やねん
     */
    $(document).on("click", "#pop_ex_timeline>.auth_user .profile_header>.header_userinfo .count_post", e => {
        $(e.target).closest("td").find(".user_ff_elm").hide()
        $(e.target).closest("td").find(".user_post_elm").show()
    })

    $(document).on("click", "#pop_ex_timeline>.auth_user .profile_header>.header_userinfo .count_follow", e =>
        Account.get($(e.target).closest("td").attr("id")).getInfo().then(user => user.createFFTaglist('follows')))

    $(document).on("click", "#pop_ex_timeline>.auth_user .profile_header>.header_userinfo .count_follower", e =>
        Account.get($(e.target).closest("td").attr("id")).getInfo().then(user => user.createFFTaglist('followers')))

    delayMouseEvent({ // user_ff_elm ul.ff_short_profile
        selector: "#pop_ex_timeline>.auth_user .ff_nametags>li",
        enterFunc: e => User.getByAddress($(e.target).closest("li").attr("name"))
            .then(user => $(e.target).closest(".user_ff_elm").find(".ff_short_profile").html(user.short_elm)),
        leaveFunc: e => {},
        delay: 500
    })

    /*=== Context Menu Event =====================================================================================*/

    /**
     * #Event #Contextmenu
     * ポストを右クリック
     * => 投稿用のコンテキストメニューを表示
     */
    $(document).on("contextmenu", "ul.__context_posts>li", e => {
        if ($(e.target).closest("li").is(".short_userinfo")) return // 簡易プロフィールは無視
        if ($(e.target).closest("table").is("#auth_account_table")) // 認証アカウント一覧のときは削除可能にする
            $("#pop_context_menu .__menu_post_del") // 削除クラスを消してnameにアカウントアドレスを付与
                .removeClass("ui-state-disabled").attr("name", $(e.target).closest("td").attr("id"))
        else $("#pop_context_menu .__menu_post_del").addClass("ui-state-disabled")
        popContextMenu(e, "pop_context_menu")
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
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_detail", e =>
        Status.getStatus($("#pop_context_menu").attr("name")).then(post => post.createDetailWindow()))

    /**
     * #Event #Contextmenu
     * 投稿系メニュー: URLをコピー
     */
    $(document).on("click", "#pop_context_menu>.ui_menu .__menu_post_url", e =>
        navigator.clipboard.writeText($("#pop_context_menu").attr("name"))
            .then(() => toast(`投稿のURLをコピーしました.`, "done")))

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
     * 各種閉じるボタン
     */
    $(document).on("click", "#__on_reply_close", e =>
        $("#pop_extend_column").hide("slide", { direction: "right" }, 150))
    $(document).on("click", "#__on_search_close", e =>
        $("#pop_ex_timeline").hide("slide", { direction: "right" }, 150))
    $(document).on("click", "#__on_emoji_close", e =>
        $("#pop_custom_emoji").hide("slide", { direction: "left" }, 150))
})

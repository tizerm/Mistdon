// HTMLロード時に非同期で実行
$(() => (async () => {
    // 設定ファイル不在での起動制御
    await window.accessApi.readPrefAccs();
    await window.accessApi.readPrefCols();
    await window.accessApi.readCustomEmojis();

    // 通知ボタンクリック時
    /*
    $(document).on("click", ".__on_show_notifications", e => {
        $(".__on_show_notifications").text("0");
        $("#pop_notification_console").toggle("slide", { direction: "down" }, 250);
    });//*/
    // キーボードショートカット早見表を表示(これはユーザー有無に関わらず常にイベント登録)
    $("#navi #on_help_keybind").on("click", e => {
        // ヘルプウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="help_col">
                <h2>キーボードショートカット早見表</h2>
                <div class="help_content"></div>
                <button type="button" id="__on_help_close">×</button>
            </div>
        `))
        $("#header>#pop_extend_column").html(jqelm).show("slide", { direction: "right" }, 150)
        $.ajax({
            url: "help/help_keybind.html",
            cache: false
        }).then(data => {
            $.each($.parseHTML(data), (index, value) => {
                if ($(value).is("#main")) $("#header>#pop_extend_column .help_content").html($(value));
            });
        });
    });

    if (Account.isEmpty()) { // アカウントが未登録(これだけではストップしない)
        $("#header>#head_postarea .__lnk_postuser>img").attr('src', 'resources/illust/ic_unauth.jpg')
        $("#header>h1").text('認証されているアカウントがありません。 - Mistdon')
    } else Account.get(0).setPostAccount();
    if (Column.isEmpty()) { // カラムが未登録(この場合はストップする)
        $("#columns").prepend(`
            <div class="__initial_message">
                アカウントの認証 <img src="resources/ic_auth.png" class="ic_inline"/>
                とカラムの設定 <img src="resources/ic_pref.png" class="ic_inline"/>
                からはじめよう！<br/>
                わからないときは左下の？をクリックするかF1キーでヘルプを表示できます。
            </div>
        `);
        return;
    }

    /*============================================================================================================*/

    // カスタム絵文字のキャッシュ確認
    Account.cacheEmojis();

    // 投稿アイコンクリック時のメニュー生成と表示(クリックイベント)
    $("#header>#pop_postuser").html(Account.createPostAccountList());
    $("#header>#head_postarea .__lnk_postuser").on("click",
        e => $("#header>#pop_postuser").show("slide", { direction: "up" }, 150));
    // アカウントリストのアカウント選択時に投稿先アカウントを変更
    $(document).on("click", ".__lnk_account_elm", e => {
        Account.get($(e.target).closest(".__lnk_account_elm").attr('name')).setPostAccount();
        $("#header>#pop_postuser").hide("slide", { direction: "up" }, 150);
    });

    // 公開範囲クリックイベント
    $(document).on("click", ".__lnk_visibility", e => {
        // 選択中のオプションにselectedクラスを付与
        $(e.target).closest(".visibility_icon").find("img").removeClass("selected");
        $(e.target).closest(".__lnk_visibility").find("img").addClass("selected");
    });

    // カスタム絵文字ウィンドウ表示クリックイベント
    $("#header>#head_postarea #on_custom_emoji").on("click", e => {
        // リプライウィンドウを開いている場合はリプライアカウントに合わせる
        if ($(".reply_col").is(":visible")) Account.get($("#__hdn_reply_account").val()).createEmojiList();
        else if ($(".quote_col").is(":visible")) Account.get($("#__hdn_quote_account").val()).createEmojiList();
        else Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).createEmojiList();
        // サジェストテキストボックスにフォーカス
        $("#__txt_emoji_search").focus();
    });
    // カスタム絵文字サジェストイベント
    $(document).on("keyup", "#__txt_emoji_search", e => {
        const suggest = $(e.target).val()
        if (!suggest) { // 空欄の場合すべて表示
            $(".emoji_list>*").show();
            return;
        }
        // 一旦全部消してから一致するやつを抽出
        $(".emoji_list>*").hide();
        $(`.emoji_list>a.__on_emoji_append[name*="${suggest}"]`).show();
    });
    // リアクションサジェストイベント
    $(document).on("keyup", "#__txt_reaction_search", e => {
        const suggest = $(e.target).val()
        if (!suggest) { // 空欄の場合すべて表示
            $(".reaction_list>*").show();
            return;
        }
        // 一旦全部消してから一致するやつを抽出
        $(".reaction_list>*").hide();
        $(`.reaction_list>a.__on_emoji_reaction[name*="${suggest}"]`).show();
    });
    // カスタム絵文字クリックイベント
    $(document).on("click", "#pop_custom_emoji .__on_emoji_append", e => {
        let target = null;
        let target_account = null;
        if ($(".reply_col").is(":visible")) { // リプライウィンドウ
            target = $(".reply_col #__txt_replyarea");
            target_account = Account.get($("#__hdn_reply_account").val());
        } else if ($(".quote_col").is(":visible")) { // 引用ウィンドウ
            target = $(".quote_col #__txt_quotearea");
            target_account = Account.get($("#__hdn_quote_account").val());
        } else {
            target = $("#header #__txt_postarea");
            target_account = Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"));
        }
        const cursor_pos = target.get(0).selectionStart;
        const target_text = target.val();
        let target_emoji = $(e.target).closest(".__on_emoji_append").attr("name");
        // Mastodonの場合前後にスペースを入れる
        if (target_account.platform == 'Mastodon') target_emoji = ` ${target_emoji} `;
        target.val(target_text.substr(0, cursor_pos) + target_emoji + target_text.substr(cursor_pos, target_text.length));
        target.focus();
    });

    // 投稿ボタンクリックイベント(投稿処理)
    $("#header #on_submit").on("click",
        e => Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).post({
            content: $("#__txt_postarea").val(),
            cw_text: $("#__txt_content_warning").val(),
            visibility_id: $("#header>#head_postarea .visibility_icon .selected").attr("id"),
            // 投稿成功時処理(書いた内容を消す)
            success: () => {
                $("#__txt_postarea").val("");
                $("#__txt_content_warning").val("");
                $("#__on_emoji_close").click();
            }
        }));

    // リプライウィンドウの投稿ボタンクリックイベント(リプライ送信処理)
    $(document).on("click", "#__on_reply_submit", e => Account.get($("#__hdn_reply_account").val()).post({
        content: $("#__txt_replyarea").val(),
        visibility_id: $("#__hdn_reply_visibility").val(), // 投稿元の公開範囲を継承する
        reply_id: $("#__hdn_reply_id").val(),
        // 投稿成功時処理(リプライウィンドウを閉じる)
        success: () => {
            $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150);
            $("#__on_emoji_close").click();
        }
    }));

    // 引用ウィンドウの投稿ボタンクリックイベント(引用投稿送信処理)
    $(document).on("click", "#__on_quote_submit", e => Account.get($("#__hdn_quote_account").val()).post({
        content: $("#__txt_quotearea").val(),
        cw_text: $("#__txt_quote_cw").val(),
        visibility_id: $("#header>#pop_extend_column .visibility_icon .selected").attr("id"),
        quote_id: $("#__hdn_quote_id").val(),
        // 投稿成功時処理(引用ウィンドウを閉じる)
        success: () => {
            $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150);
            $("#__on_emoji_close").click();
        }
    }));

    // リアクションウィンドウでリアクション選択時イベント(リアクション送信)
    $(document).on("click", ".__on_emoji_reaction", e => Account.get($("#__hdn_reaction_account").val()).sendReaction({
        id: $("#__hdn_reaction_id").val(),
        shortcode: $(e.target).closest(".__on_emoji_reaction").attr("name"),
        // 投稿成功時処理(リプライウィンドウを閉じる)
        success: () => $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150)
    }));

    // 閉じるボタンクリックイベント
    $(document).on("click", "#__on_reply_close", 
        e => $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150));
    $(document).on("click", "#__on_search_close", 
        e => $("#header>#pop_ex_timeline").hide("slide", { direction: "right" }, 150));
    $(document).on("click", "#__on_emoji_close", 
        e => $("#header>#pop_custom_emoji").hide("slide", { direction: "left" }, 150));

    // オプションボタンイベント: 直前の投稿を削除
    $("#header #on_last_delete").on("click", e => Status.lastStatusIf(
        last => last.delete((post, uuid) => toast("直前の投稿を削除しました.", "done", uuid)), true));
    // オプションボタンイベント: 直前の投稿を削除して編集
    $("#header #on_last_delete_paste").on("click", e => Status.lastStatusIf(
        last => last.delete((post, uuid) => {
            post.from_account.setPostAccount();
            $("#__txt_postarea").val(post.original_text);
            $("#__txt_content_warning").val(post.cw_text);
            toast("直前の投稿を削除しました. 内容を再展開します.", "done", uuid);
        }), true));
    // オプションボタンイベント: 直前の投稿をコピー
    $("#header #on_last_copy").on("click", e => Status.lastStatusIf(last => {
        $("#__txt_postarea").val(last.original_text);
        $("#__txt_content_warning").val(last.cw_text);
        toast("直前の投稿内容を再展開しました.", "done");
    }, false));
    // オプションボタンイベント: 直前の投稿につなげる
    $("#header #on_last_replychain").on("click", e => Status.lastStatusIf(last => last.createReplyWindow(), false));

    // ウィンドウサイズが800を下回った場合、投稿フォームを拡張する
    $("#header #__txt_postarea").on("focus", e => {
        if (window.innerWidth < 800) $(e.target).css("width", "calc(100vw - 334px)");
    });
    $("#header #__txt_postarea").on("blur", e => $(e.target).css("width", "calc(100vw - 514px)"));

    /*============================================================================================================*/

    // 全般イベント処理
    // カラムに関するイベントはカラムクラスでバインド
    Column.bindEvent();

    // 右クリック時のコンテキストメニュー表示イベント
    $("#header>.pop_context>.ui_menu>li ul").each((index, elm) => {
        // プラットフォーム指定がある場合は対象プラットフォームのアカウントだけ抽出
        if ($(elm).attr("name")) $(elm).html(Account.createContextMenuAccountList($(elm).attr("name")));
        else $(elm).html(Account.createContextMenuAccountList());
    });
    // 投稿を右クリックしたときのコンテキストメニュー
    $("#header>.pop_context>.ui_menu").menu();
    $(document).on("contextmenu", "ul.__context_posts>li", e => {
        if ($(e.target).closest("li").is(".short_userinfo")) return; // 簡易プロフィールは無視
        if ($(e.target).closest("table").is("#auth_account_table")) // 認証アカウント一覧のときは削除可能にする
            $("#header>#pop_context_menu .__menu_post_del") // 削除クラスを消してnameにアカウントアドレスを付与
                .removeClass("ui-state-disabled").attr("name", $(e.target).closest("td").attr("id"));
        else $("#header>#pop_context_menu .__menu_post_del").addClass("ui-state-disabled");
        $("#header>#pop_context_menu")
            .css('top', (e.pageY - 8) + 'px')
            .css('left', (e.pageX - 64) + 'px')
            .show("slide", { direction: "up" }, 100);
        $("#header>#pop_context_menu").attr("name", $(e.target).closest("li").attr("name"));
        return false;
    });
    // ユーザー詳細を右クリックしたときのコンテキストメニュー
    $(document).on("contextmenu", "ul.__context_user>li, li.short_userinfo", e => {
        $("#header>#pop_context_user")
            .css('top', (e.pageY - 8) + 'px')
            .css('left', (e.pageX - 64) + 'px')
            .show("slide", { direction: "up" }, 100);
        $("#header>#pop_context_user").attr("name", $(e.target).closest("td").attr("id"));
        return false;
    });
    $("body").on("click", e => {
        $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100);
        $("#header>#pop_context_user").hide("slide", { direction: "up" }, 100);
        if (!$(e.target).is("#header>#head_postarea .posticon")) 
            // 投稿アイコン以外をクリックした場合に投稿アカウント変更を隠す
            $("#header>#pop_postuser").hide("slide", { direction: "up" }, 150);
    });
    // コンテキストメニュー(投稿系)項目クリック時処理
    $(document).on("click", "#header>#pop_context_menu>.ui_menu>li ul>li", e => {
        const target_account = Account.get($(e.target).closest("li").attr("name"));
        $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100);
        target_account.reaction({
            target_mode: $(e.target).closest("ul").attr("id"),
            target_url: $("#header>#pop_context_menu").attr("name")
        });
    });
    // コンテキストメニュー「詳細表示」クリック時処理
    $(document).on("click", "#header>#pop_context_menu>.ui_menu .__menu_post_detail", e => Status
            .getStatus($("#header>#pop_context_menu").attr("name")).then(post => post.createDetailWindow()));
    // コンテキストメニュー「URLをコピー」クリック時処理
    $(document).on("click", "#header>#pop_context_menu>.ui_menu .__menu_post_url",
        e => navigator.clipboard.writeText($("#header>#pop_context_menu").attr("name"))
            .then(() => toast(`投稿のURLをコピーしました.`, "done")));
    // コンテキストメニュー「削除」クリック時処理
    $(document).on("click", "#header>#pop_context_menu>.ui_menu .__menu_post_del", e => Account
        .get($(e.target).closest("li").attr("name")).deletePost($("#header>#pop_context_menu").attr("name")));
    // コンテキストメニュー(ユーザー系)項目クリック時処理
    $(document).on("click", "#header>#pop_context_user>.ui_menu>li ul>li", e => {
        const target_account = Account.get($(e.target).closest("li").attr("name"));
        $("#header>#pop_context_user").hide("slide", { direction: "up" }, 100);
        target_account.userAction({
            target_mode: $(e.target).closest("ul").attr("id"),
            target_user: $("#header>#pop_context_user").attr("name")
        });
    });
    // ナビゲーション-検索ボタンクリック時処理
    $("#navi .navi_search").on("click", e => createSearchWindow());
    // ナビゲーション-全体プロフィールボタンクリック時処理
    $("#navi .navi_show_profile").on("click", e => Account.createProfileTimeline());
    // ナビゲーション-絵文字キャッシュクリアボタンクリック時処理
    $("#navi .navi_reset_emoji").on("click", e => dialog({
        type: 'confirm',
        title: "絵文字キャッシュ取得",
        text: `登録アカウントすべてのカスタム絵文字のキャッシュを更新します。<br/>
            よろしいですか？<br/>
            (Misskeyのサーバーに新しいカスタム絵文字が追加されたときに実行するのをおすすめします。)`,
        accept: () => { // OKボタン押下時の処理
            Emojis.clearCache();
            Account.cacheEmojis();
        }
    }));
    // 検索処理実行
    $(document).on("click", "#__on_search", e => Column.search());
    // プロフィールウィンドウ-ピンどめを閉じる
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
    });
    // プロフィールウィンドウ-フォロー数表示
    $(document).on("click", "#pop_ex_timeline .profile_header>.header_userinfo .count_follow", e => {
    });

    /*============================================================================================================*/

    // カラム生成処理
    Column.each(col => {
        // カラム本体を生成
        col.create();
        // タイムライン取得処理をプロミス配列に格納してWebSocketの設定をセット
        col.eachGroup(gp => {
            const rest_promises = [];
            gp.eachTimeline(tl => {
                rest_promises.push(tl.getTimeline());
                tl.setSocketParam();
            })
            // タイムラインをDOMにバインド
            gp.onLoadTimeline(rest_promises);
        });
    });
    // 対象アカウントをWebSocketに接続
    Account.each(account => account.connect({
        openFunc: () => {},
        closeFunc: () => toast(`${account.full_address}との接続が切断されました。`, "error"),
        reconnect: true
    }));
    Column.tooltip(); // カラムにツールチップを設定
    // 見えている中で最初のカラムにカーソルをセット
    Column.getOpenedFirst().setCursor();
})());

// HTMLロード時に非同期で実行
$(() => (async () => {
    { // 保険用にアカウント情報とカラム情報が読めてなかったら一時停止
        let unread_flg = false;
        if (!await window.accessApi.readPrefAccs()) unread_flg = true;
        if (!await window.accessApi.readPrefCols()) unread_flg = true;
        if (unread_flg) {
            // まだ設定ファイルを作っていない場合は初期メッセージを表示
            $("#columns").prepend(`
                <div class="__initial_message">
                    アカウントの認証とカラムの設定からはじめよう！<br/>
                    わからないときは左下の？をクリックするかF1キーでヘルプを表示できます。
                </div>
            `);
            return;
        }
        await window.accessApi.readCustomEmojis()
    }

    /*============================================================================================================*/

    // 投稿先アカウントの初期設定とカスタム絵文字のキャッシュ確認
    Account.cacheEmojis();
    Account.get(0).setPostAccount();

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
    $("#header>#head_postarea .__lnk_visibility").on("click", e => {
        // 選択中のオプションにselectedクラスを付与
        $(".__lnk_visibility>img").removeClass("selected");
        $(e.target).closest(".__lnk_visibility").find("img").addClass("selected");
    });

    // カスタム絵文字ウィンドウ表示クリックイベント
    $("#header>#head_postarea #on_custom_emoji").on("click", e => {
        // リプライウィンドウを開いている場合はリプライアカウントに合わせる
        if ($(".reply_col").is(":visible")) Account.get($("#__hdn_reply_account").val()).createEmojiList();
        else Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).createEmojiList();
    });
    // カスタム絵文字クリックイベント
    $(document).on("click", "#pop_custom_emoji .__on_emoji_append", e => {
        const is_reply = $(".reply_col").is(":visible");
        const target = is_reply ? $(".reply_col #__txt_replyarea") : $("#header #__txt_postarea");
        const cursor_pos = target.get(0).selectionStart;
        const target_text = target.val();
        let target_emoji = $(e.target).closest(".__on_emoji_append").attr("name");
        const target_account = is_reply ? Account.get($("#__hdn_reply_account").val())
            : Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name"));
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
        e => $("#header>#pop_search_column").hide("slide", { direction: "right" }, 150));
    $(document).on("click", "#__on_emoji_close", 
        e => $("#header>#pop_custom_emoji").hide("slide", { direction: "left" }, 150));

    // オプションボタンイベント: 直前の投稿を削除
    $("#header #on_last_delete").on("click", e => Status.lastStatusIf(
        last => last.delete((post, uuid) => toast("直前の投稿を削除しました.", "done", uuid)), true));
    // オプションボタンイベント: 直前の投稿を削除して編集
    $("#header #on_last_delete_paste").on("click", e => Status.lastStatusIf(
        last => last.delete((post, uuid) => {
            post.from_account.setPostAccount();
            $("#__txt_postarea").val(post.content_text);
            $("#__txt_content_warning").val(post.cw_text);
            toast("直前の投稿を削除しました. 内容を再展開します.", "done", uuid);
        }), true));
    // オプションボタンイベント: 直前の投稿をコピー
    $("#header #on_last_copy").on("click", e => Status.lastStatusIf(last => {
        $("#__txt_postarea").val(last.content_text);
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

    // 投稿右クリック時のコンテキストメニュー表示イベント
    $("#header>#pop_context_menu>.ui_menu>li ul").each((index, elm) => {
        // プラットフォーム指定がある場合は対象プラットフォームのアカウントだけ抽出
        if ($(elm).attr("name")) $(elm).html(Account.createContextMenuAccountList($(elm).attr("name")));
        else $(elm).html(Account.createContextMenuAccountList());
    });
    $("#header>#pop_context_menu>.ui_menu").menu();
    $(document).on("contextmenu", "#columns>table>tbody>tr>.column_td>ul>li", e => {
        $("#header>#pop_context_menu")
            .css('top', e.pageY + 'px')
            .css('left', (e.pageX - 48) + 'px')
            .show("slide", { direction: "up" }, 100);
        $("#header>#pop_context_menu").attr("name", $(e.target).closest("li").attr("name"));
        return false;
    });
    $("body").on("click", e => {
        $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100);
        if (!$(e.target).is("#header>#head_postarea .posticon")) 
            // 投稿アイコン以外をクリックした場合に投稿アカウント変更を隠す
            $("#header>#pop_postuser").hide("slide", { direction: "up" }, 150);
    });
    // コンテキストメニュー項目クリック時処理
    $(document).on("click", "#header>#pop_context_menu>.ui_menu>li ul>li", e => {
        const target_account = Account.get($(e.target).closest("li").attr("name"));
        $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100);
        target_account.reaction({
            target_mode: $(e.target).closest("ul").attr("id"),
            target_url: $("#header>#pop_context_menu").attr("name")
        });
    });
    // ナビゲーション-検索ボタンクリック時処理
    $("#navi .navi_search").on("click", e => createSearchWindow());
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
    // 通知ボタンクリック時
    $(document).on("click", ".__on_show_notifications", e => {
        $(".__on_show_notifications").text("0");
        $("#pop_notification_console").toggle("slide", { direction: "down" }, 250);
    });
    // キーボードショートカット早見表を表示
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

    /*============================================================================================================*/

    // カラム生成処理
    Column.each(col => {
        // カラム本体を生成
        col.create();
        const rest_promises = [];
        // タイムライン取得処理をプロミス配列に格納してWebSocketの設定をセット
        col.eachTimeline(tl => {
            rest_promises.push(tl.getTimeline());
            tl.setSocketParam();
        });
        // タイムラインをDOMにバインド
        col.onLoadTimeline(rest_promises);
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

$(() => {
    // HTMLロード時に非同期で実行
    (async () => {
        // 保険用にアカウント情報とカラム情報が読めてなかったら一時停止
        if (!await window.accessApi.readPrefAccs()) return;
        if (!await window.accessApi.readPrefCols()) return;

        /*============================================================================================================*/

        // 投稿先アカウントの初期設定
        Account.get(0).setPostAccount();

        // 投稿アイコンクリック時のメニュー生成と表示(クリックイベント)
        $("#header>#pop_postuser").html(Account.createPostAccountList());
        $("#header>#head_postarea>.__lnk_postuser").on("click",
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
            $(e.target).closest("img").addClass("selected");
        });

        // 投稿ボタンクリックイベント(投稿処理)
        $("#header #on_submit").on("click",
            e => Account.get($("#header>#head_postarea>.__lnk_postuser>img").attr("name")).post({
                content: $("#__txt_postarea").val(),
                cw_text: $("#__txt_content_warning").val(),
                visibility_id: $("#header>#head_postarea>.visibility_icon .selected").attr("id"),
                // 投稿成功時処理(書いた内容を消す)
                success: () => {
                    $("#__txt_postarea").val("");
                    $("#__txt_content_warning").val("");
                }
            }));

        // リプライウィンドウの投稿ボタンクリックイベント(リプライ送信処理)
        $(document).on("click", "#__on_reply_submit", e => Account.get($("#__hdn_reply_account").val()).post({
            content: $("#__txt_replyarea").val(),
            visibility_id: $("#__hdn_reply_visibility").val(), // 投稿元の公開範囲を継承する
            reply_id: $("#__hdn_reply_id").val(),
            // 投稿成功時処理(リプライウィンドウを閉じる)
            success: () => $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150)
        }));
        // 閉じるボタンクリックイベント
        $(document).on("click", "#__on_reply_close", 
            e => $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150));

        // オプションボタンイベント: 直前の投稿を削除
        $("#header #on_last_delete").on("click", e => Status.lastStatusIf(
            last => last.delete((post, uuid) => toast("直前の投稿を削除しました.", "done", uuid))));
        // オプションボタンイベント: 直前の投稿を削除して編集
        $("#header #on_last_delete_paste").on("click", e => Status.lastStatusIf(
            last => last.delete((post, uuid) => {
                post.from_account.setPostAccount();
                $("#__txt_postarea").val(post.content_text);
                $("#__txt_content_warning").val(post.cw_text);
                toast("直前の投稿を削除しました. 内容を再展開します.", "done", uuid);
            })));
        // オプションボタンイベント: 直前の投稿をコピー
        $("#header #on_last_copy").on("click", e => Status.lastStatusIf(last => {
            $("#__txt_postarea").val(last.content_text);
            $("#__txt_content_warning").val(last.cw_text);
            toast("直前の投稿内容を再展開しました.", "done");
        }));
        // オプションボタンイベント: 直前の投稿につなげる
        $("#header #on_last_replychain").on("click", e => Status.lastStatusIf(last => last.createReplyWindow()));

        /*============================================================================================================*/

        // 全般イベント処理
        // カラムに関するイベントはカラムクラスでバインド
        Column.bindEvent();

        // 投稿右クリック時のコンテキストメニュー表示イベント
        $("#header>#pop_context_menu>.ui_menu>li ul").html(Account.createContextMenuAccountList());
        $("#header>#pop_context_menu>.ui_menu").menu();
        $(document).on("contextmenu", "#columns>table>tbody>tr>.column_td>ul>li", e => {
            $("#header>#pop_context_menu")
                .css('top', e.pageY + 'px')
                .css('left', (e.pageX - 48) + 'px')
                .show("slide", { direction: "up" }, 100);
            $("#header>#pop_context_menu").attr("name", $(e.target).closest("li").attr("name"));
            return false;
        });
        $("body").on("click", e => $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100));
        // コンテキストメニュー項目クリック時処理
        $(document).on("click", "#header>#pop_context_menu>.ui_menu>li ul>li", e => {
            const target_account = Account.get($(e.target).closest("li").attr("name"));
            $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100);
            target_account.reaction({
                target_mode: $(e.target).closest("ul").attr("id"),
                target_url: $("#header>#pop_context_menu").attr("name")
            });
        });
        // 通知ボタンクリック時
        $(document).on("click", ".__on_show_notifications", e => {
            $(".__on_show_notifications").text("0");
            $("#pop_notification_console").toggle("slide", { direction: "down" }, 250);
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
    })()
});

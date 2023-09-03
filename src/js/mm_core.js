$(() => {
    var accounts = null;
    var columns = null;
    var socket_prefs = null;
    var column_cache = null;
    // タイムラインキャッシュ カラムひとつあたりこの数を超えたら後ろから自動的に消える
    const timeline_limit = 150;
    // ロードされた段階でカラムを生成(非同期)
    (async () => {
        // メインプロセスメソッドが非同期なのでawaitかけてアカウント情報を取得
        accounts = await window.accessApi.readPrefAccs();
        // 認証情報がなかったら何もせずに終わる
        if (!accounts) {
            return;
        }
        // メインプロセスメソッドが非同期なのでawaitかけてカラム情報を取得
        columns = await window.accessApi.readPrefCols();
        // カラム情報がなかったら何もせずに終わる
        if (!columns) {
            return;
        }

        /*========================================================================================*/

        // 投稿アカウント変更処理(何回も使うのでメソッド化)
        const changeAccount = async (key_address) => {
            $("#header>#head_postarea>.__lnk_postuser>img").attr('src', accounts.get(key_address).avatar_url);
            $("#header>#head_postarea>.__lnk_postuser>img").attr('name', key_address);
            $("#header>h1").text(accounts.get(key_address).username + ' - ' + key_address);
            $("#header>h1").css("background-color", "#" + accounts.get(key_address).acc_color);
        }
        // 投稿アイコンとnameだけ先に設定
        changeAccount(columns[0].timelines[0].key_address);
        
        // 投稿アイコンクリック時のメニュー生成と表示
        $("#header>#pop_postuser").html(createSelectableAccounts(accounts));
        $("#header>#head_postarea>.__lnk_postuser").on("click", (e) => {
            // アイコンをクリックするとアカウントリストを表示
            $("#header>#pop_postuser").show("slide", { direction: "up" }, 150);
        });
        // アカウントリストのアカウント選択時に投稿先アカウントを変更
        $(document).on("click", ".__lnk_account_elm", (e) => {
            changeAccount($(e.target).closest(".__lnk_account_elm").attr('name'))
            $("#header>#pop_postuser").hide("slide", { direction: "up" }, 150);
        });

        // 公開範囲クリック時
        $("#header>#head_postarea .__lnk_visibility").on("click", (e) => {
            // 選択中のオプションにselectedクラスを付与
            $(".__lnk_visibility>img").removeClass("selected");
            $(e.target).closest("img").addClass("selected");
        });

        /*========================================================================================*/

        // 投稿処理(煩雑なので実際の処理はメソッド化)
        const procPost = async () => post({
            content: $("#__txt_postarea").val(),
            cw_text: $("#__txt_content_warning").val(),
            visibility_id: $("#header>#head_postarea>.visibility_icon .selected").attr("id"),
            post_account: accounts.get($("#header>#head_postarea>.__lnk_postuser>img").attr("name")),
            success: () => {
                // 投稿成功時(書いた内容を消す)
                $("#__txt_postarea").val("");
                $("#__txt_content_warning").val("");
            }
        });
        $("#header #on_submit").on("click", (e) => procPost());
        // 現在選択中の投稿アカウントの前後のアカウントアドレスを取得するメソッド
        const getNeiborAccount = (move) => {
            const key_address = $("#header>#head_postarea>.__lnk_postuser>img").attr("name");
            const current_link = $('#header>#pop_postuser>.account_list>a[name="' + key_address + '"]');
            let neibor_link = null;
            switch (move) {
                case 1: // 下へ移動
                    neibor_link = current_link.next();
                    if (neibor_link.length == 0) {
                        // なかったら一番上
                        neibor_link = $('#header>#pop_postuser>.account_list>a:first-child');
                    }
                    break;
                case -1: // 上へ移動
                    neibor_link = current_link.prev();
                    if (neibor_link.length == 0) {
                        // なかったら一番下
                        neibor_link = $('#header>#pop_postuser>.account_list>a:last-child');
                    }
                    break;
                default:
                    break;
            }
            return neibor_link.attr('name');
        }
        $("#header>#head_postarea").keydown((e) => {
            // Ctrl+Enterを押したときに投稿処理を実行
            if (event.ctrlKey && e.keyCode === 13) {
                procPost();
                return false;
            }
            // Alt+↑↓でアカウントを切り替え
            if (event.altKey) {
                if (e.keyCode === 38) { // ↑
                    changeAccount(getNeiborAccount(-1));
                    return false;
                } else if (e.keyCode === 40) { // ↓
                    changeAccount(getNeiborAccount(1));
                    return false;
                }
            }
        });

        // リプライ投稿処理(煩雑なので実際の処理はメソッド化)
        const procMentionPost = async () => post({
            content: $("#__txt_replyarea").val(),
            visibility_id: 'visibility_public', // TODO: 一旦公開にする
            post_account: accounts.get($("#__hdn_reply_account").val()),
            reply_id: $("#__hdn_reply_id").val(),
            success: () => {
                // 投稿成功時(リプライウィンドウを閉じる)
                $("#header>#pop_extend_column").hide("slide", { direction: "right" }, 150);
            }
        });
        // 
        $(document).on("click", "#__on_reply_submit", (e) => procMentionPost());
        $(document).on("keydown", "#__txt_replyarea", (e) => {
            // Ctrl+Enterを押したときに投稿処理を実行
            if (event.ctrlKey && e.keyCode === 13) {
                procMentionPost();
                return false;
            }
        });
        // 閉じるボタン
        $(document).on("click", "#__on_reply_close", (e) => $("#header>#pop_extend_column")
            .hide("slide", { direction: "right" }, 150));

        /*========================================================================================*/

        // 画面全体としてのキーボードショートカット
        $("body").keydown((e) => {
            if (event.altKey) { // 基本的にはAltと併用します
                switch (e.keyCode) {
                    case 78: // Alt+N: 投稿テキストボックスにフォーカス
                        $("#__txt_postarea").focus();
                        return false;
                    case 67: // Alt+C: CWテキストボックスにフォーカス
                        $("#__txt_content_warning").focus();
                        return false;
                    default:
                        break;
                }
            }
        });

        /*========================================================================================*/

        // 全般イベント処理
        // 本文コンテンツ内のリンクを外部ブラウザで開く
        $(document).on("click", ".content>.main_content a", (e) => {
            const url = $(e.target).closest("a").attr("href");
            window.accessApi.openExternalBrowser(url);
            // リンク先に飛ばないようにする
            return false;
        });
        // 本文コンテンツ内のCWと閲覧注意のオープン/クローズイベント
        $(document).on("click", ".expand_header",
            (e) => $(e.target).next().toggle("slide", { direction: "up" }, 100));
        // カラムのトップへ移動ボタン
        $(document).on("click", ".__on_column_top",
            (e) => $(e.target).closest("td").find("ul").scrollTop(0));
        // カラムオープンボタン
        $(document).on("click", ".__on_column_open", (e) => {
            // 自身を閉じて右隣の本体カラムを表示
            const target_col = $(e.target).closest("td");
            
            target_col.hide();
            target_col.next().show();
        });
        // カラムクローズボタン
        $(document).on("click", ".__on_column_close", (e) => {
            if ($(e.target).closest("tr").find("td.timeline:visible").length <= 1) {
                // 全部のカラムを閉じようとしたら止める
                toast("すべてのカラムを閉じることはできません。", "error");
                return false;
            }
            // 自身を閉じて左隣の短縮カラムを表示
            const target_col = $(e.target).closest("td");
            const closed_col = target_col.prev();
            target_col.hide();
            // 未読数をリセットしてから表示
            column_cache.get(target_col.attr("id")).unread = 0;
            closed_col.find("h2>span").empty();
            closed_col.show();
        });
        // 可変幅カラムのON/OFFイベント
        $(document).on("click", ".__on_column_flex", (e) => {
            const target_col = $(e.target).closest("td");
            const column = column_cache.get(target_col.attr("id"));
            const img = $(e.target).closest("img");
            if (!column.flex) {
                // OFF⇒ON
                target_col.css('width', 'auto');
                img.attr('src', 'resources/ic_flex_on.png');
                column.flex = true;
            } else {
                // ON⇒OFF
                target_col.css('width', column.pref.col_width + 'px');
                img.attr('src', 'resources/ic_flex_off.png');
                column.flex = false;
            }
        });
        // カラムリロードボタン
        $(document).on("click", ".__on_column_reload", (e) => {
            const column = column_cache.get($(e.target).closest("td").attr("id"));
            // カラムの中身を全部消す
            $(e.target).closest("td").find("ul").empty();
            reload(column, accounts);
        });
        // 画像を拡大表示するイベント
        $(document).on("click", ".__on_media_expand", (e) => {
            // アプリケーションのアス比を計算
            const window_aspect = window.innerWidth / window.innerHeight;
            const link = $(e.target).closest(".__on_media_expand");
            createImageWindow({
                url: link.attr("href"),
                image_aspect: link.attr("name"),
                window_aspect: window_aspect,
            });
            // リンク先に飛ばないようにする
            return false;
        });
        // 画像を拡大表示したときだけどこクリックしても閉じるようにする
        $("body").on("click", (e) => $("#header>#pop_extend_column>.expand_image_col")
            .closest("#pop_extend_column").hide("slide", { direction: "right" }, 100));

        // 投稿右クリック時のコンテキストメニュー表示イベント
        $("#header>#pop_context_menu>.ui_menu>li ul").html(createContextMenuAccounts(accounts));
        $("#header>#pop_context_menu>.ui_menu").menu();
        $(document).on("contextmenu", "#columns>table>tbody>tr>.timeline>ul>li", (e) => {
            $("#header>#pop_context_menu")
                .css('top', e.pageY + 'px')
                .css('left', (e.pageX - 72) + 'px')
                .show("slide", { direction: "up" }, 100);
            $("#header>#pop_context_menu").attr("name", $(e.target).closest("li").attr("name"));
            return false;
        });
        $("body").on("click", (e) => {
            $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100);
        });
        // コンテキストメニュー項目クリック時処理
        $(document).on("click", "#header>#pop_context_menu>.ui_menu>li ul>li", (e) => {
            const key_address = $(e.target).closest("li").attr("name");
            const target_account = accounts.get(key_address);
            $("#header>#pop_context_menu").hide("slide", { direction: "up" }, 100);
            // リアクション実行(煩雑なので実際の処理はメソッド化)
            reaction({
                target_account: target_account,
                target_mode: $(e.target).closest("ul").attr("id"),
                target_url: $("#header>#pop_context_menu").attr("name"),
                replyFunc: (target_post) => {
                    // リプライカラムを表示するための処理
                    $("#header>#pop_extend_column").html(createReplyColumn({
                        post: target_post,
                        key_address: key_address,
                        platform: target_account.platform
                    }));
                    $("#header>#pop_extend_column h2").css("background-color", "#" + target_account.acc_color);
                    $("#header>#pop_extend_column").show("slide", { direction: "right" }, 150);
                }
            });
        });
        // 通知ボタンクリック時
        $(document).on("click", ".__on_show_notifications", (e) => {
            $(".__on_show_notifications").text("0");
            $("#pop_notification_console").toggle("slide", { direction: "down" }, 250);
        });

        /*========================================================================================*/

        // カラム生成処理
        socket_prefs = new Map();
        column_cache = new Map();
        columns.forEach((col) => {
            // カラム本体を生成
            createColumn(col);
            // タイムライン取得処理のプロミスを格納する配列と投稿のユニークキーを格納するセット
            const rest_promises = [];
            column_cache.set(col.column_id, {
                pref: col,
                post_keyset: new Set(),
                unread: 0,
                flex: false
            });
            const cache = column_cache.get(col.column_id);
            col.timelines.forEach((tl) => {
                // 配列のAPI呼び出しパラメータを使ってタイムラインを生成
                // クエリパラメータにlimitプロパティを事前に追加(これはMastodonとMisskeyで共通)
                tl.query_param.limit = 30;
                const tl_acc = accounts.get(tl.key_address);

                // 最初にREST APIで最新TLを30件取得、する処理をプロミス配列に追加
                rest_promises.push(getTimeline({
                    timeline: tl,
                    tl_account: tl_acc,
                    column: col
                }));
                // WebSocketのタイムライン設定を保存
                createConnectPref({
                    timeline: tl,
                    tl_account: tl_acc,
                    column: col,
                    timeline_limit: timeline_limit
                }, socket_prefs, cache);
            });
            // カラムのすべてのタイムラインが取得し終えたらタイムラインをバインド
            bindTimeline({
                rest_promises: rest_promises,
                column_cache: cache,
                accounts: accounts
            });
        });
        // すべてのカラムを生成し終えたタイミングでWebSocketの接続を開始
        socket_prefs.forEach((v, k) => connect({
            pref: v,
            key_address: k,
            openFunc: () => {
                const text = k + "との接続を開始しました。";
                v.subscribes.forEach((s) => prependInfo({
                    column_id: s.target_col.column_id,
                    text: text,
                    clear: true
                }));
                prependNotification(text, false);
            },
            closeFunc: () => {
                toast(k + "との接続が切断されました。", "error");
                // 対象カラムに接続が切れた通知を出す
                v.subscribes.forEach((s) => prependInfo({
                    column_id: s.target_col.column_id,
                    text: k + "との接続が切断されました。",
                    clear: false
                }));
            },
            reconnect: true
        }));
        // カラムオプションにツールチップをセット
        setColumnTooltip();
    })()
});

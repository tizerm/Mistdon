$(() => {
    var accounts = null;
    var columns = null;
    var socket_prefs = null;
    var post_keysets = null;
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
        } else {
            // 投稿アイコンとnameだけ先に設定
            const key_address = columns[0].timelines[0].key_address;
            $("#header>#head_postarea>.__lnk_postuser>img").attr('src', accounts.get(key_address).avatar_url);
            $("#header>#head_postarea>.__lnk_postuser>img").attr('name', key_address);
            $("#header>h1").text(accounts.get(key_address).username + ' - ' + key_address);
            $("#header>h1").css("background-color", "#" + accounts.get(key_address).acc_color);
        }
        
        // 投稿アイコンクリック時のメニュー生成と表示
        $("#header>#pop_postuser").html(createSelectableAccounts(accounts));
        $("#header>#head_postarea>.__lnk_postuser").on("click", (e) => {
            // アイコンをクリックするとアカウントリストを表示
            $("#header>#pop_postuser").css("visibility", "visible");
        });
        $(document).on("click", ".__lnk_account_elm", (e) => {
            // クリックしたアカウントのアイコンとkey_addressをセットしてリスト表示を消す
            const key_address = $(e.target).closest(".__lnk_account_elm").attr('name');
            $("#header>#head_postarea>.__lnk_postuser>img").attr('src', accounts.get(key_address).avatar_url);
            $("#header>#head_postarea>.__lnk_postuser>img").attr('name', key_address);
            $("#header>h1").text(accounts.get(key_address).username + ' - ' + key_address);
            $("#header>h1").css("background-color", "#" + accounts.get(key_address).acc_color);
            $("#header>#pop_postuser").css("visibility", "hidden");
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
        $("#header>#head_postarea").keydown((e) => {
            // Ctrl+Enterを押したときに投稿処理を実行
            if (event.ctrlKey && e.keyCode === 13) {
                procPost();
                return false;
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
                $("#header>#pop_extend_column").css('visibility', 'hidden');
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
        $(document).on("click", "#__on_reply_close", (e) => { // 閉じるボタン
            $("#header>#pop_extend_column").css('visibility', 'hidden');
        });

        /*========================================================================================*/

        // 事前にWebSocketマップとCWと閲覧注意のイベントとトップへ移動処理を設定
        $(document).on("click", ".expand_header", (e) => $(e.target).next().toggle());
        $(document).on("click", ".__on_column_top", (e) => $(e.target).closest("td").find("ul").scrollTop(0));

        // 投稿右クリック時のコンテキストメニュー表示イベント
        $("#header>#pop_context_menu>.ui_menu>li ul").html(createContextMenuAccounts(accounts));
        $("#header>#pop_context_menu>.ui_menu").menu();
        $(document).on("contextmenu", "#columns>table>tbody>tr>.timeline>ul>li", (e) => {
            $("#header>#pop_context_menu")
                .css('top', e.pageY + 'px')
                .css('left', (e.pageX - 72) + 'px')
                .css('visibility', 'visible');
            $("#header>#pop_context_menu").attr("name", $(e.target).closest("li").attr("name"));
            return false;
        });
        $("body").on("click", (e) => {
            $("#header>#pop_context_menu").css('visibility', 'hidden');
        });
        // コンテキストメニュー項目クリック時処理
        $(document).on("click", "#header>#pop_context_menu>.ui_menu>li ul>li", (e) => {
            const key_address = $(e.target).closest("li").attr("name");
            const target_account = accounts.get(key_address);
            $("#header>#pop_context_menu").css('visibility', 'hidden');
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
                    $("#header>#pop_extend_column").css('visibility', 'visible');
                }
            });
        });

        /*========================================================================================*/

        // カラム生成処理
        socket_prefs = new Map();
        post_keysets = new Map();
        columns.forEach((col) => {
            // カラム本体を生成
            createColumn(col);
            // タイムライン取得処理のプロミスを格納する配列と投稿のユニークキーを格納するセット
            const rest_promises = [];
            post_keysets.set(col.column_id, new Set());
            const keyset = post_keysets.get(col.column_id);
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
                }, socket_prefs, keyset);
            });
            // カラムのすべてのタイムラインのREST APIが呼び出し終わったか判定するためにPromise.allを使用
            Promise.all(rest_promises).then((datas) => {
                // タイムラインのPromise配列を走査
                const postlist = [];
                datas.forEach((posts) => {
                    posts.forEach((p) => {
                        // 重複している投稿を除外する
                        if (!keyset.has(p.post_key)) {
                            postlist.push(p);
                            keyset.add(p.post_key);
                        }
                    });
                });
                /*
                console.log(col.label_head); // TODO: debug
                console.log(postlist); // TODO: debug
                //*/
                // すべてのデータを配列に入れたタイミングで配列を日付順にソートする(単一TLのときはしない)
                if (datas.length > 1) {
                    postlist.sort((a, b) => new Date(b.sort_date) - new Date(a.sort_date));
                }
                // ソートが終わったらタイムラインをDOMに反映
                createIntegratedTimeline(postlist,  col.column_id + "_body", accounts);
            }).catch((jqXHR, textStatus, errorThrown) => {
                // 取得失敗時
                toast("タイムラインの取得に失敗したカラムがあります。", "error");
            });
        });
        // すべてのカラムを生成し終えたタイミングでWebSocketの接続を開始
        socket_prefs.forEach((v, k) => connect({
            pref: v,
            key_address: k,
            closeFunc: () => {
                toast(v.key_address + "との接続が切断されました。", "error");
            }
        }));
    })()
});

$(() => {
    var accounts = null;
    var columns = null;
    var sockets = null;
    var send_params = null;
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

        // 事前にWebSocketマップとCWと閲覧注意のイベントを設定
        sockets = new Map();
        send_params = new Map();
        post_keysets = new Map();
        $(document).on("click", ".expand_header", (e) => $(e.target).next().toggle());
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
        // メニュー項目クリック時処理
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
                
                // プラットフォームによって通信様式が違うので個別に設定
                switch (tl_acc.platform) {
                    case 'Mastodon': // Mastodon
                        // 最初にREST APIで最新TLを30件取得、する処理をプロミス配列に追加
                        rest_promises.push(
                            $.ajax({
                                type: "GET",
                                url: tl.rest_url,
                                dataType: "json",
                                headers: { "Authorization": "Bearer " + tl_acc.access_token },
                                data: tl.query_param
                            }).then((data) => {
                                return (async () => {
                                    // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                                    const toots = [];
                                    data.forEach((toot) => toots.push(getIntegratedPost({
                                        data: toot,
                                        timeline: tl,
                                        tl_account: tl_acc,
                                        multi_flg: col.multi_user
                                    })));
                                    return toots;
                                })();
                            }));
                        // REST API呼び出してる間にStreaming API用のWebSocketを準備
                        var socket_exist_flg = sockets.has(tl.key_address);
                        if (!socket_exist_flg) {
                            // アカウントのWebSocket存在しない場合はコネクションの確立から始める
                            sockets.set(tl.key_address, new WebSocket(
                                tl_acc.socket_url + "?access_token=" + tl_acc.access_token));
                            send_params.set(tl.key_address, []);
                        }
                        var skt = sockets.get(tl.key_address);
                        // 更新通知のイベントハンドラーを作る
                        skt.addEventListener("message", (event) => {
                            const data = JSON.parse(event.data);
                            //console.log(data); // TODO: debug
                            if (data.stream[0] != tl.socket_param.stream) {
                                // TLと違うStreamは無視
                                return;
                            }
                            if (data.event == "update") {
                                // タイムラインの更新通知
                                prependPost({
                                    data: JSON.parse(data.payload),
                                    column_id: col.column_id,
                                    multi_flg: col.multi_user,
                                    timeline: tl,
                                    tl_account: tl_acc,
                                    limit: timeline_limit,
                                    bindFunc: createTimelineMastLine
                                }, keyset);
                            } else if (tl.timeline_type == "notification" && data.event == "notification") {
                                // 通知の更新通知
                                prependPost({
                                    data: JSON.parse(data.payload),
                                    column_id: col.column_id,
                                    multi_flg: col.multi_user,
                                    timeline: tl,
                                    tl_account: tl_acc,
                                    limit: timeline_limit,
                                    bindFunc: createNotificationMastLine
                                }, keyset);
                            }
                        });
                        // ソケットパラメータに受信開始の設定をセット
                        tl.socket_param.type = "subscribe";
                        send_params.get(tl.key_address).push(JSON.stringify(tl.socket_param));
                        if (!socket_exist_flg) {
                            // ソケットを初めて作る場合はエラーハンドルもする
                            skt.addEventListener("error", (event) => {
                                // HTTPエラーハンドルした場合
                                alert(tl.key_address + "で接続エラーが発生しました、再接続してください。");
                                console.log(event);
                            });
                        }
                        break;
                    case 'Misskey': // Misskey
                        // クエリパラメータにアクセストークンをセット
                        tl.query_param.i = tl_acc.access_token;
                        // 最初にREST APIで最新TLを30件取得、する処理をプロミス配列に追加
                        rest_promises.push(
                            $.ajax({
                                type: "POST",
                                url: tl.rest_url,
                                dataType: "json",
                                headers: { "Content-Type": "application/json" },
                                data: JSON.stringify(tl.query_param)
                            }).then((data) => {
                                return (async () => {
                                    // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                                    const notes = [];
                                    data.forEach((note) => notes.push(getIntegratedPost({
                                        data: note,
                                        timeline: tl,
                                        tl_account: tl_acc,
                                        multi_flg: col.multi_user
                                    })));
                                    return notes;
                                })();
                            }));
                        // REST API呼び出してる間にStreaming API用のWebSocketを準備
                        var socket_exist_flg = sockets.has(tl.key_address);
                        if (!socket_exist_flg) {
                            // アカウントのWebSocket存在しない場合はコネクションの確立から始める
                            sockets.set(tl.key_address, new WebSocket(
                                tl_acc.socket_url + "?i=" + tl_acc.access_token));
                            send_params.set(tl.key_address, []);
                        }
                        var skt = sockets.get(tl.key_address);
                        var uuid = crypto.randomUUID();
                        // 更新通知のイベントハンドラーを作る
                        skt.addEventListener("message", (event) => {
                            const data = JSON.parse(event.data);
                            //console.log(data); // TODO: debug
                            if (data.body.id != uuid) {
                                // TLと違うStreamは無視
                                return;
                            }
                            // 別のデータが来たときに余計な処理を挟まないよう同じ処理だけどif内で書く
                            if (data.body.type == "note") {
                                // タイムラインの更新通知
                                prependPost({
                                    data: data.body.body,
                                    column_id: col.column_id,
                                    multi_flg: col.multi_user,
                                    timeline: tl,
                                    tl_account: tl_acc,
                                    limit: timeline_limit,
                                    bindFunc: createTimelineMskyLine
                                }, keyset);
                            } else if (tl.timeline_type == "notification" && data.body.type == "notification") {
                                // 通知の更新通知
                                prependPost({
                                    data: data.body.body,
                                    column_id: col.column_id,
                                    multi_flg: col.multi_user,
                                    timeline: tl,
                                    tl_account: tl_acc,
                                    limit: timeline_limit,
                                    bindFunc: createNotificationMskyLine
                                }, keyset);
                            }
                        });
                        // ソケットパラメータに受信開始の設定をセット
                        tl.socket_param.id = uuid;
                        send_params.get(tl.key_address).push(JSON.stringify({
                            'type': 'connect',
                            'body': tl.socket_param
                        }));
                        if (!socket_exist_flg) {
                            // ソケットを初めて作る場合はエラーハンドルもする
                            skt.addEventListener("error", (event) => {
                                // HTTPエラーハンドルした場合
                                alert(tl.key_address + "で接続エラーが発生しました、再接続してください。");
                                console.log(event);
                            });
                        }
                        break;
                    default:
                        break;
                }
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
                console.log('!ERR: timeline get failed. ' + textStatus);
            });
        });
        // すべてのカラムを生成し終えたタイミングでWebSocketのopenイベントに送信処理をバインド
        sockets.forEach((v, k) => {
            v.addEventListener("open", (event) => {
                send_params.get(k).forEach((p) => v.send(p));
            });
        });
    })()
});

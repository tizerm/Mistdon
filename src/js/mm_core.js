$(() => {
    var accounts = null;
    var columns = null;
    var sockets = null;
    var send_params = null;
    var post_keysets = null;
    // ロードされた段階でカラムを生成(非同期)
    const proc = async () => {
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
            $("#header>#pop_postuser").css("visibility", "hidden");
        });
        
        // 公開範囲クリック時
        $("#header>#head_postarea .__lnk_visibility").on("click", (e) => {
            // 選択中のオプションにselectedクラスを付与
            $(".__lnk_visibility>img").removeClass("selected");
            $(e.target).closest("img").addClass("selected");
        });

        // 投稿処理
        const procPost = async () => {
            const content = $("#__txt_postarea").val();
            if (!content) {
                // 何も書いてなかったら何もしない
                return;
            }
            const tl_acc = accounts.get($("#header>#head_postarea>.__lnk_postuser>img").attr("name"));
            const cw_text = $("#__txt_content_warning").val();
            const visibility_id = $("#header>#head_postarea>.visibility_icon .selected").attr("id");
            let visibility = null;
            let request_promise = null;
            switch (tl_acc.platform) {
                case 'Mastodon': // Mastodon
                    var request_param = {
                        "status": content
                    };
                    if (cw_text) {
                        // CWがある場合はCWテキストも追加
                        request_param.spoiler_text = cw_text;
                    }
                    // 公開範囲を取得
                    switch (visibility_id) {
                        case 'visibility_public': // 公開
                            visibility = "public";
                            break;
                        case 'visibility_unlisted': // ホーム
                            visibility = "unlisted";
                            break;
                        case 'visibility_followers': // フォロ限
                            visibility = "private";
                            break;
                        default:
                            break;
                    }
                    request_param.visibility = visibility;
                    request_promise = $.ajax({ // APIに投稿を投げる
                        type: "POST",
                        url: "https://" + tl_acc.domain + "/api/v1/statuses",
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + tl_acc.access_token,
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                        },
                        data: request_param
                    });
                    break;
                case 'Misskey': // Misskey
                    var request_param = {
                        "i": tl_acc.access_token,
                        "text": content
                    };
                    if (cw_text) {
                        // CWがある場合はCWテキストも追加
                        request_param.cw = cw_text;
                    }
                    // 公開範囲を取得
                    switch (visibility_id) {
                        case 'visibility_public': // 公開
                            visibility = "public";
                            break;
                        case 'visibility_unlisted': // ホーム
                            visibility = "home";
                            break;
                        case 'visibility_followers': // フォロ限
                            visibility = "followers";
                            break;
                        default:
                            break;
                    }
                    request_param.visibility = visibility;
                    request_promise = $.ajax({ // APIに投稿を投げる
                        type: "POST",
                        url: "https://" + tl_acc.domain + "/api/notes/create",
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(request_param)
                    });
                    break;
                default:
                    break;
            }
            request_promise.then(() => {
                // 投稿成功時(書いた内容を消す)
                $("#__txt_postarea").val("");
                $("#__txt_content_warning").val("");
            }).catch((jqXHR, textStatus, errorThrown) => {
                // 投稿失敗時
                console.log('!ERR: 投稿に失敗しました. ' + textStatus);
            });
        };
        $("#header #on_submit").on("click", (e) => procPost());
        $("#header>#head_postarea").keydown((e) => {
            // Ctrl+Enterを押したときに投稿処理を実行
            if (event.ctrlKey && e.keyCode === 13) {
                procPost();
                return false;
            }
        });

        /*========================================================================================*/

        // 事前にWebSocketマップとCWと閲覧注意のイベントを設定
        sockets = new Map();
        send_params = new Map();
        post_keysets = new Map();
        $(document).on("click", ".expand_header", (e) => $(e.target).next().toggle());
        
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
                                const mapFunc = async () => {
                                    // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                                    const toots = [];
                                    data.forEach((toot) => toots.push(getIntegratedPost(toot, tl, tl_acc)));
                                    return toots;
                                }
                                return mapFunc();
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
                            if (data.stream[0] != tl.socket_param.stream) {
                                // TLと違うStreamは無視
                                return;
                            }
                            // 別のデータが来たときに余計な処理を挟まないよう同じ処理だけどif内で書く
                            if (data.event == "update") {
                                // タイムラインの更新通知
                                prependPost(JSON.parse(data.payload),
                                    col.column_id, keyset, tl, tl_acc, createTimelineMastLine);
                            } else if (tl.timeline_type == "notification" && data.event == "notification") {
                                // 通知の更新通知
                                prependPost(JSON.parse(data.payload),
                                    col.column_id, keyset, tl, tl_acc, createNotificationMastLine);
                            }
                            // TODO: debug
                            console.log(col.column_id + 'size: ' + $("#columns>table>tbody>tr>#" + col.column_id + "_body>ul>li").length);
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
                                const mapFunc = async () => {
                                    // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                                    const notes = [];
                                    data.forEach((note) => notes.push(getIntegratedPost(note, tl, tl_acc)));
                                    return notes;
                                }
                                return mapFunc();
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
                            if (data.body.id != uuid) {
                                // TLと違うStreamは無視
                                return;
                            }
                            // 別のデータが来たときに余計な処理を挟まないよう同じ処理だけどif内で書く
                            if (data.body.type == "note") {
                                // タイムラインの更新通知
                                prependPost(data.body.body,
                                    col.column_id, keyset, tl, tl_acc, createTimelineMskyLine);
                            } else if (tl.timeline_type == "notification" && data.body.type == "notification") {
                                // 通知の更新通知
                                prependPost(data.body.body, col.column_id,
                                    keyset, tl, tl_acc, createNotificationMskyLine);
                            }
                            // TODO: debug
                            console.log(col.column_id + 'size: ' + $("#columns>table>tbody>tr>#" + col.column_id + "_body>ul>li").length);
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
                //*
                console.log(col.label_head); // TODO: debug
                console.log(keyset); // TODO: debug
                console.log(postlist); // TODO: debug
                //*/
                // すべてのデータを配列に入れたタイミングで配列を日付順にソートする(単一TLのときはしない)
                if (datas.length > 1) {
                    postlist.sort((a, b) => new Date(b.sort_date) - new Date(a.sort_date));
                }
                // ソートが終わったらタイムラインをDOMに反映
                createIntegratedTimeline(postlist,  col.column_id + "_body");
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
    }
    proc()
});

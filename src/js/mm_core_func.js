/**
 * #Ajax #jQuery
 * 投稿処理
 * 
 * @param arg パラメータJSON
 */
async function post(arg) {
    if (!arg.content) {
        // 何も書いてなかったら何もしない
        return;
    }
    let visibility = null;
    let request_param = null;
    let request_promise = null;
    // 先にtoast表示
    toast("投稿中です...", "progress");
    switch (arg.post_account.platform) {
        case 'Mastodon': // Mastodon
            // 公開範囲を取得
            switch (arg.visibility_id) {
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
            request_param = {
                "status": arg.content,
                "visibility": visibility
            };
            // CWがある場合はCWテキストも追加
            if (arg.cw_text) {
                request_param.spoiler_text = arg.cw_text;
            }
            // リプライの場合はリプライ先ツートIDを設定
            if (arg.reply_id) {
                request_param.in_reply_to_id = arg.reply_id;
            }
            request_promise = $.ajax({ // APIに投稿を投げる
                type: "POST",
                url: "https://" + arg.post_account.domain + "/api/v1/statuses",
                dataType: "json",
                headers: {
                    "Authorization": "Bearer " + arg.post_account.access_token,
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                data: request_param
            });
            break;
        case 'Misskey': // Misskey
            // 公開範囲を取得
            switch (arg.visibility_id) {
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
            request_param = {
                "i": arg.post_account.access_token,
                "text": arg.content,
                "visibility": visibility
            };
            // CWがある場合はCWテキストも追加
            if (arg.cw_text) {
                request_param.cw = arg.cw_text;
            }
            // リプライの場合はリプライ先ツートIDを設定
            if (arg.reply_id) {
                request_param.replyId = arg.reply_id;
            }
            request_promise = $.ajax({ // APIに投稿を投げる
                type: "POST",
                url: "https://" + arg.post_account.domain + "/api/notes/create",
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(request_param)
            });
            break;
        default:
            break;
    }
    request_promise.then(() => {
        // 投稿成功時(コールバック関数実行)
        arg.success();
        toast("投稿しました.", "done");
    }).catch((jqXHR, textStatus, errorThrown) => {
        // 投稿失敗時
        toast("投稿に失敗しました.", "error");
    });
}

/**
 * #Ajax #jQuery
 * リアクション(リプライ/ブースト/リノート/お気に入り/リアクション)処理
 * 
 * @param arg パラメータJSON
 */
async function reaction(arg) {
    let request_promise = null;
    let target_post = null;
    // 先にtoast表示
    toast("対象の投稿を取得中です...", "progress");
    // ターゲットの投稿データを取得
    switch (arg.target_account.platform) {
        case 'Mastodon': // Mastodon
            request_promise = $.ajax({ // 検索から投稿を取得
                type: "GET",
                url: "https://" + arg.target_account.domain + "/api/v2/search",
                dataType: "json",
                headers: {
                    "Authorization": "Bearer " + arg.target_account.access_token
                },
                data: {
                    "q": arg.target_url,
                    "type": "statuses",
                    "resolve": true
                }
            }).then((data) => {
                // 取得データをPromiseで返却
                return data.statuses[0];
            }).catch((jqXHR, textStatus, errorThrown) => {
                // 取得失敗時
                toast("投稿の取得でエラーが発生しました.", "error");
            });
            break;
        case 'Misskey': // Misskey
            request_promise = $.ajax({
                type: "POST",
                url: "https://" + arg.target_account.domain + "/api/ap/show",
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    "i": arg.target_account.access_token,
                    "uri": arg.target_url
                })
            }).then((data) => {
                // 取得データをPromiseで返却
                return data.object;
            }).catch((jqXHR, textStatus, errorThrown) => {
                // 取得失敗時
                toast("投稿の取得でエラーが発生しました.", "error");
            });
            break;
        default:
            break;
    }
    // データが取得されるのを待ってtarget_postに代入
    target_post = await request_promise;
    if (!target_post) { // 投稿を取得できなかったらなにもしない
        return;
    }
    switch (arg.target_account.platform) {
        case 'Mastodon': // Mastodon
            switch (arg.target_mode) {
                case '__menu_reply': // リプライ
                    arg.replyFunc(target_post);
                    toast(null, "hide"); // toastを消す
                    break;
                case '__menu_reblog': // ブースト
                    $.ajax({
                        type: "POST",
                        url: "https://" + arg.target_account.domain
                            + "/api/v1/statuses/" + target_post.id + "/reblog",
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + arg.target_account.access_token
                        }
                    }).then((data) => {
                        toast("投稿をブーストしました.", "done");
                    }).catch((jqXHR, textStatus, errorThrown) => {
                        // 取得失敗時
                        toast("ブーストに失敗しました.", "error");
                    });
                    break;
                case '__menu_favorite': // お気に入り
                    $.ajax({
                        type: "POST",
                        url: "https://" + arg.target_account.domain
                            + "/api/v1/statuses/" + target_post.id + "/favourite",
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + arg.target_account.access_token
                        }
                    }).then((data) => {
                        toast("投稿をお気に入りしました.", "done");
                    }).catch((jqXHR, textStatus, errorThrown) => {
                        // 取得失敗時
                        toast("お気に入りに失敗しました.", "error");
                    });
                    break;
                default:
                    break;
            }
            break;
        case 'Misskey': // Misskey
            switch (arg.target_mode) {
                case '__menu_reply': // リプライ
                    arg.replyFunc(target_post);
                    toast(null, "hide"); // toastを消す
                    break;
                case '__menu_reblog': // リノート
                    $.ajax({
                        type: "POST",
                        url: "https://" + arg.target_account.domain + "/api/notes/create",
                        dataType: "json",
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            "i": arg.target_account.access_token,
                            "renoteId": target_post.id
                        })
                    }).then((data) => {
                        toast("投稿をリノートしました.", "done");
                    }).catch((jqXHR, textStatus, errorThrown) => {
                        // 取得失敗時
                        toast("リノートに失敗しました.", "error");
                    });
                    break;
                case '__menu_favorite': // お気に入り
                    toast("Misskeyでお気に入りは現状非対応です…….", "error");
                    break;
                default:
                    break;
            }
            break;
        default:
            break;
    }
}

/**
 * #Ajax #jQuery
 * タイムライン取得処理(REST)
 * 
 * @param arg パラメータJSON
 */
function getTimeline(arg) {
    let rest_promise = null;
    // プラットフォーム判定
    switch (arg.tl_account.platform) {
        case 'Mastodon': // Mastodon
            // REST APIで最新TLを30件取得、する処理をプロミスとして格納
            rest_promise = $.ajax({
                type: "GET",
                url: arg.timeline.rest_url,
                dataType: "json",
                headers: { "Authorization": "Bearer " + arg.tl_account.access_token },
                data: arg.timeline.query_param
            }).then((data) => {
                return (async () => {
                    // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                    const toots = [];
                    data.forEach((toot) => toots.push(getIntegratedPost({
                        data: toot,
                        timeline: arg.timeline,
                        tl_account: arg.tl_account,
                        multi_flg: arg.column.multi_user
                    })));
                    return toots;
                })();
            });
            break;
        case 'Misskey': // Misskey
            // クエリパラメータにアクセストークンをセット
            arg.timeline.query_param.i = arg.tl_account.access_token;
            // REST APIで最新TLを30件取得、する処理をプロミスとして格納
            rest_promise = $.ajax({
                type: "POST",
                url: arg.timeline.rest_url,
                dataType: "json",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(arg.timeline.query_param)
            }).then((data) => {
                return (async () => {
                    // 投稿データをソートマップ可能にする処理を非同期で実行(Promise返却)
                    const notes = [];
                    data.forEach((note) => notes.push(getIntegratedPost({
                        data: note,
                        timeline: arg.timeline,
                        tl_account: arg.tl_account,
                        multi_flg: arg.column.multi_user
                    })));
                    return notes;
                })();
            });
            break;
        default:
            break;
    }
    // Promiseを返却(実質非同期)
    return rest_promise;
}

/**
 * #WebSocket
 * WebSocket接続を行うための設定値とコールバック関数を生成
 * 
 * @param arg パラメータJSON
 * @param params WebSocket設定を保存するためのSet
 * @param keyset タイムライン重複削除のためのkeyset
 */
function createConnectPref(arg, params, keyset) {
    let socket_url = null;
    let message_callback = null;
    let send_param = null;
    
    // プラットフォーム判定
    switch (arg.tl_account.platform) {
        case 'Mastodon': // Mastodon
            socket_url = arg.tl_account.socket_url + "?access_token=" + arg.tl_account.access_token;
            // メッセージ受信時のコールバック関数
            message_callback = (event) => {
                const data = JSON.parse(event.data);
                if (data.stream[0] != arg.timeline.socket_param.stream) {
                    // TLと違うStreamは無視
                    return;
                }
                if (data.event == "update") {
                    // タイムラインの更新通知
                    prependPost({
                        data: JSON.parse(data.payload),
                        column_id: arg.column.column_id,
                        multi_flg: arg.column.multi_user,
                        timeline: arg.timeline,
                        tl_account: arg.tl_account,
                        limit: arg.timeline_limit,
                        bindFunc: createTimelineMastLine
                    }, keyset);
                } else if (arg.timeline.timeline_type == "notification" && data.event == "notification") {
                    // 通知の更新通知
                    prependPost({
                        data: JSON.parse(data.payload),
                        column_id: arg.column.column_id,
                        multi_flg: arg.column.multi_user,
                        timeline: arg.timeline,
                        tl_account: arg.tl_account,
                        limit: arg.timeline_limit,
                        bindFunc: createNotificationMastLine
                    }, keyset);
                }
            }
            // 購読パラメータの設定
            arg.timeline.socket_param.type = "subscribe";
            send_param = JSON.stringify(arg.timeline.socket_param);
            break;
        case 'Misskey': // Misskey
            const uuid = crypto.randomUUID();
            socket_url = arg.tl_account.socket_url + "?i=" + arg.tl_account.access_token;
            message_callback = (event) => {
                const data = JSON.parse(event.data);
                if (data.body.id != uuid) {
                    // TLと違うStreamは無視
                    return;
                }
                if (data.body.type == "note") {
                    // タイムラインの更新通知
                    prependPost({
                        data: data.body.body,
                        column_id: arg.column.column_id,
                        multi_flg: arg.column.multi_user,
                        timeline: arg.timeline,
                        tl_account: arg.tl_account,
                        limit: arg.timeline_limit,
                        bindFunc: createTimelineMskyLine
                    }, keyset);
                } else if (arg.timeline.timeline_type == "notification" && data.body.type == "notification") {
                    // 通知の更新通知
                    prependPost({
                        data: data.body.body,
                        column_id: arg.column.column_id,
                        multi_flg: arg.column.multi_user,
                        timeline: arg.timeline,
                        tl_account: arg.tl_account,
                        limit: arg.timeline_limit,
                        bindFunc: createNotificationMskyLine
                    }, keyset);
                }
            }
            // 購読パラメータの設定
            arg.timeline.socket_param.id = uuid;
            send_param = JSON.stringify({
                'type': 'connect',
                'body': arg.timeline.socket_param
            });
            break;
        default:
            break;
    }
    // パラメータセットにデータがなかったらセットに配列を作る
    if (!params.has(arg.timeline.key_address)) {
        params.set(arg.timeline.key_address, {
            socket_url: socket_url,
            subscribes: []
        });
    }
    // subscribesにソケット設定を追加
    params.get(arg.timeline.key_address).subscribes.push({
        target_col: arg.column,
        send_param: send_param,
        messageFunc: message_callback
    });
}

/**
 * #WebSocket
 * WebSocket接続を開始して一連のイベント設定をする
 * 
 * @param arg パラメータJSON
 */
async function connect(arg) {
    // WebSocket接続を開始
    const socket = new WebSocket(arg.pref.socket_url);
    console.log(arg.key_address + ": socket create."); // TODO: debug
    
    // WebSocket接続開始時処理
    socket.addEventListener("open", (event) => {
        console.log(arg.key_address + ": socket opened."); // TODO: debug
        // ソケットに受信設定を送信
        arg.pref.subscribes.forEach((p) => socket.send(p.send_param));
    });
    // エラーハンドラ
    socket.addEventListener("error", (event) => {
        toast(arg.key_address + "で接続エラーが発生しました、再接続してください。", "error");
        console.log(event);
    });
    // WebSocket接続停止時処理
    socket.addEventListener("close", (event) => {
        // 接続停止用コールバック関数を実行
        arg.closeFunc();
        console.log(arg.key_address + ": socket closed."); // TODO: debug
        console.log(event);
    });
    // 受信処理を設定
    arg.pref.subscribes.forEach((p) => socket.addEventListener("message", p.messageFunc));
}
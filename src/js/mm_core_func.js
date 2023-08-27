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
    }).catch((jqXHR, textStatus, errorThrown) => {
        // 投稿失敗時
        console.log('!ERR: 投稿に失敗しました. ' + textStatus);
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
                alert("投稿の取得でエラーが発生しました。");
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
                alert("投稿の取得でエラーが発生しました。");
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
                        console.log("Boost Success: " + target_post.id);
                    }).catch((jqXHR, textStatus, errorThrown) => {
                        // 取得失敗時
                        alert("ブーストに失敗しました。");
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
                        console.log("Favorite Success: " + target_post.id);
                    }).catch((jqXHR, textStatus, errorThrown) => {
                        // 取得失敗時
                        alert("お気に入りに失敗しました。");
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
                        console.log("Renote Success: " + target_post.id);
                    }).catch((jqXHR, textStatus, errorThrown) => {
                        // 取得失敗時
                        alert("リノートに失敗しました。");
                    });
                    break;
                case '__menu_favorite': // お気に入り
                    alert("Misskeyでお気に入りは現状非対応です……。");
                    break;
                default:
                    break;
            }
            break;
        default:
            break;
    }
}

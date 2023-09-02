// 日付フォーマッター
const yyyymmdd = new Intl.DateTimeFormat(undefined, {
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
})

/**
 * #Renderer #jQuery
 * カラムのテンプレートを生成する
 * 中身は後入れ
 * 
 * @param col_json カラム情報のJSON
 */
function createColumn(col_json) {
    // カラム本体を空の状態で生成
    let html = '<td id="' + col_json.column_id + '_closed" class="closed_col">'
        + '<div class="col_action"><a class="__on_column_open" title="カラムを開く">'
        + '<img src="resources/ic_right.png" alt="カラムを開く"/></a></div>'
        + '<h2>' + col_json.label_head + '<span></span></h2>'
        + '</td><td id="' + col_json.column_id + '" class="timeline">'
        + '<div class="col_head">'
        + '<h2>' + col_json.label_head + '</h2>'
        + '<h3>' + col_json.label_type + '</h3>'
        + '<div class="col_action">'
        + '<a class="__on_column_close" title="カラムを閉じる"><img src="resources/ic_left.png" alt="カラムを閉じる"/></a>'
        + '<a class="__on_column_top" title="トップへ移動"><img src="resources/ic_top.png" alt="トップへ移動"/></a>'
        + '</div></div><ul></ul></td>';
    $("#columns>table tr").append(html);
    
    // カラムヘッダの色を変更
    $("#columns>table #" + col_json.column_id + ">.col_head")
        .css("background-color", "#" + col_json.col_color);
    $("#columns>table #" + col_json.column_id + "_closed")
        .css("background-color", "#" + col_json.col_color);

    // カラムの幅を変更
    $("#columns>table #" + col_json.column_id).css("width", col_json.col_width + "px");
}

/**
 * #Renderer #jQuery
 * MastodonとMisskeyのタイムラインデータをソートマップ可能なデータとして返す
 * 
 * @param arg パラメータ一括指定JSON
 */
function getIntegratedPost(arg) {
    let binding_key = null;
    let sort_date = null;
    let user_address = null;

    // プラットフォーム判定
    switch (arg.tl_account.platform) {
        case 'Mastodon': // Mastodon
            binding_key = arg.timeline.timeline_type == 'notification'
                ? 'Mastodon-notification' : 'Mastodon-toot';
            sort_date = arg.data.created_at;
            // ローカルリモート関係なくアカウントのフルアドレスを生成
            user_address = arg.data.account.acct.match(/@/)
                ? arg.data.account.acct : (arg.data.account.acct + '@' + arg.timeline.host);
            break;
        case 'Misskey': // Misskey
            binding_key = arg.timeline.timeline_type == 'notification'
                ? 'Misskey-notification' : 'Misskey-note';
            sort_date = arg.data.createdAt;
            // ローカルリモート関係なくアカウントのフルアドレスを生成
            // TODO: 実績が来ると落ちるのでOptionalにしとく
            user_address = arg.data.user?.username + '@'
                + (arg.data.user?.host ? arg.data.user?.host : arg.timeline?.host);
            // URLを生成するためにホスト情報を強引にノートデータにねじ込む
            arg.data.__host_address = arg.timeline?.host;
            break;
        default:
            break;
    }
    // 投稿オブジェクトを含めるJSONオブジェクトとして返却
    return {
        'binding_key': binding_key,
        'sort_date': sort_date,
        // 投稿日付(小数点以下切り捨て)+ユーザーフルアドレスを投稿のユニークキーとする
        'post_key': sort_date.substring(0, sort_date.lastIndexOf('.')) + '@' + user_address,
        // カラムがマルチユーザーの場合のみ取得元ユーザーを設定
        'from_address': arg.multi_flg ? arg.timeline.key_address : null,
        'post': arg.data
    };
}

/**
 * #Renderer #jQuery
 * WebSocketから受け取った通知をもとに投稿をタイムラインに追加
 * 
 * @param arg パラメータ一括指定JSON
 * @param keyset 投稿ユニークキーセット
 */
function prependPost(arg, cache) {
    const ul = $("#columns>table #" + arg.column_id + ">ul");
    const integrated = getIntegratedPost({
        data: arg.data,
        timeline: arg.timeline,
        tl_account: arg.tl_account,
        multi_flg: arg.multi_flg
    });
    // 重複している投稿を除外する
    if (!cache.post_keyset.has(integrated.post_key)) {
        cache.post_keyset.add(integrated.post_key);
        if (ul.find("li").length >= arg.limit) {
            // タイムラインキャッシュが限界に到達していたら後ろから順にキャッシュクリアする
            ul.find("li:last-child").remove();
            // キーセットのキャッシュも消しとく(重複判定はすでに終わっているので全消しでおｋ)
            if (cache.post_keyset.size >= arg.limit) {
                cache.post_keyset.clear();
            }
        }
        ul.prepend(arg.bindFunc(integrated.post, integrated.from_address));
        // 未読カウンターを上げる
        const unread_counter = cache.unread + 1;
        $("#columns>table #" + arg.column_id + "_closed>h2>span").text(unread_counter);
        cache.unread = unread_counter;
        
        const added = ul.find("li:first-child");
        // アカウントラベルの背景を変更
        added.find(".post_footer>.from_address").css("background-color", "#" + arg.tl_account.acc_color);
        // 追加アニメーション
        added.hide();
        added.show("slide", { direction: "up" }, 180);
    }
}

/**
 * #Renderer #jQuery
 * 特殊通知をタイムラインに追加
 * 
 * @param arg パラメータ一括指定JSON
 */
function prependInfo(arg) {
    const ul = $("#columns>table #" + arg.column_id + ">ul");
    ul.prepend('<li class="inserted_info">' + arg.text +  '</li>')

    const added = ul.find("li:first-child");
    // 追加アニメーション
    added.hide();
    added.show("slide", { direction: "up" }, 200);
    if (arg.clear) {
        // インフォ一覧を消す場合は5秒後にすべて消滅させる
        const infos = ul.find(".inserted_info");
        (async () => setTimeout(() => ul.find(".inserted_info").remove(), 10000))()
    }
}

/**
 * #Renderer #jQuery
 * 統合用に整形した投稿データからタイムラインのDOMを生成
 * 
 * @param array_json 統合用に整形された投稿配列JSON
 * @param bind_id バインド先のID
 * @param accounts アカウントマップ
 */
function createIntegratedTimeline(array_json, bind_id, accounts) {
    let html = '';
    $.each(array_json, (index, value) => {
        // binding_keyによって呼び出し関数を変える
        switch (value.binding_key) {
            case 'Mastodon-toot': // Mastodon-投稿タイムライン
                html += createTimelineMastLine(value.post, value.from_address);
                break;
            case 'Mastodon-notification': // Mastodon-通知欄
                html += createNotificationMastLine(value.post, value.from_address);
                break;
            case 'Misskey-note': // Misskey-投稿タイムライン
                html += createTimelineMskyLine(value.post, value.from_address);
                break;
            case 'Misskey-notification': // Misskey-通知欄
                html += createNotificationMskyLine(value.post, value.from_address);
                break;
            default:
                break;
        }
    });
    $("#columns>table #" + bind_id + ">ul").append(html);
    // フッタのアカウントラベルに色を付ける
    $("#columns>table #" + bind_id + ">ul>li>.post_footer>.from_address").each((index, elm) => {
        $(elm).css("background-color", "#" + accounts.get($(elm).attr("name")).acc_color);
    });
}

/*================================================================================================*/

/**
 * #Renderer #jQuery
 * Mastodonから受け取ったタイムラインJSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createTimelineMastLine(value, from_address) {
    let html = '';
    // ブーストツートならブースト先を、通常なら本体を参照先にする
    const viewdata = value.reblog ?? value;
    const date = yyyymmdd.format(new Date(viewdata.created_at));
    const display_name = viewdata.account.display_name ?? viewdata.account.username;
    // Mastdonの場合URLはdata.urlを参照すればオッケー
    html += '<li name="' + viewdata.url + '">';
    if (value.reblog) {
        // ブーストツートの場合はブーストヘッダを表示
        html += '<div class="label_head label_reblog">'
            + '<span>Boosted by @' + value.account.acct + '</span>'
            + '</div>';
    }
    html += '<div class="user">'
        // ユーザーアカウント情報
        + '<img src="' + viewdata.account.avatar + '" class="usericon"/>'
        // 絵文字置換
        + '<h4 class="username">' + replaceEmojiMast(display_name, viewdata.account.emojis) + '</h4>'
        + '<a class="userid">@' + viewdata.account.acct + '</a>';
    // 公開範囲がパブリック以外の場合は識別アイコンを配置
    switch (viewdata.visibility) {
        case 'unlisted': // ホーム
            html += '<img src="resources/ic_unlisted.png" class="visibilityicon"/>';
            break;
        case 'private': // フォロ限
            html += '<img src="resources/ic_followers.png" class="visibilityicon"/>';
            break;
        default:
            break;
    }
    html += '</div><div class="content">';
    if (viewdata.spoiler_text) {
        // CWテキストがある場合CWボタンを表示
        html += '<a class="expand_header label_cw">' + viewdata.spoiler_text + '</a>'
            + '<div class="main_content cw_content">';
    } else {
        // ない場合は普通にブロックを作る
        html += '<div class="main_content">';
    }
    // 本文
    html += replaceEmojiMast(viewdata.content, viewdata.emojis) // 絵文字置換
        + '</div></div>';
    if (viewdata.media_attachments.length > 0) {
        // 添付画像がある場合は画像を表示
        html += '<div class="media">';
        if (viewdata.sensitive) {
            // 閲覧注意設定の場合は画像を隠す
            html += '<a class="expand_header label_sensitive">閲覧注意の画像があります</a>'
                + '<div class="media_content cw_content">';
        } else {
            html += '<div class="media_content">';
        }
        viewdata.media_attachments.forEach((media) => {
            // アスペクト比をリンクオプションとして設定
            html += '<a href="' + media.url + '" name="' + media.meta.original.aspect + '" class="__on_media_expand">'
                + '<img src="' + media.preview_url + '" class="media_preview"/></a>';
        });
        html += '</div></div>';
    }
    html += '<div class="post_footer">'
        + '<a class="created_at __on_datelink">' + date + '</a>';
    // 取得元ユーザーが渡されている場合は取得元ユーザーを表示
    if (from_address) {
        html += '<div class="from_address" name="' + from_address + '">From ' + from_address + '</div>';
    }
    html += '</div></li>';
    return html;
}

/**
 * #Renderer #jQuery
 * Mastodonから受け取った通知JSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createNotificationMastLine(value, from_address) {
    let html = '';
    const date = yyyymmdd.format(new Date(value.created_at));
    const display_name = value.account.display_name ?? value.account.username;
    // Mastdonの場合URLはdata.urlを参照すればオッケー
    html += '<li name="' + value.url + '">';
    // 通知タイプによって表示を変更
    switch (value.type) {
        case 'favourite': // お気に入り
            html += '<div class="label_head label_favorite">'
                + '<span>Favorited by @' + value.account.acct + '</span>'
                + '</div>';
            break;
        case 'reblog': // ブースト
            html += '<div class="label_head label_reblog">'
                + '<span>Boosted by @' + value.account.acct + '</span>'
                + '</div>';
            break;
        case 'follow': // フォロー通知
            html += '<div class="label_head label_follow">'
                + '<span>Followed by @' + value.account.acct + '</span>'
                + '</div>';
            break;
        default: // リプライの場合はヘッダ書かない
            break;
    }
    html += '<div class="user">'
        // ユーザーアカウント情報
        + '<img src="' + value.account.avatar + '" class="usericon"/>'
        + '<h4 class="username">' + replaceEmojiMast(display_name, value.account.emojis) + '</h4>'
        + '<a class="userid">@' + value.account.acct + '</a>'
        + '</div><div class="content"><div class="main_content">';
        // 本文
    if (value.type == 'follow') {
        // フォローの場合はユーザーのプロフを表示
        html += replaceEmojiMast(value.account.note, value.account.emojis);
    } else {
        html += replaceEmojiMast(value.status.content, value.status.emojis);
    }

    html += '</div></div><div class="post_footer">';
    // 通知タイプによって表示を変更
    switch (value.type) {
        case 'mention': // リプライ
            html += '<a class="created_at __on_datelink">' + date + '</a>';
            break;
        case 'follow': // フォロー通知
            html += '<div class="created_at">Post: ' + value.account.statuses_count
                + ' / Follow: ' + value.account.following_count
                + ' / Follower: ' + value.account.followers_count + '</div>';
            break;
        default: // お気に入りとブーストは日付だけ
            html += '<div class="created_at">' + date + '</div>';
            break;
    }
    // 取得元ユーザーが渡されている場合は取得元ユーザーを表示
    if (from_address) {
        html += '<div class="from_address" name="' + from_address + '">From ' + from_address + '</div>';
    }
    html += '</div></li>';
    return html;
}

/**
 * #Renderer #jQuery
 * Mastodonのテキストから絵文字のショートコードを絵文字に変換
 * 
 * @param text 変換対象テキスト
 * @param emojis レスポンスに含まれる絵文字配列
 */
function replaceEmojiMast(text, emojis) {
    if (!text) { // 文字の入力がない場合は空文字を返却
        return "";
    }
    emojis.forEach((emoji) => {
        text = text.replace(new RegExp(':' + emoji.shortcode + ':', 'g'),
            '<img src="' + emoji.url + '" class="inline_emoji"/>');
    });
    return text;
}

/*================================================================================================*/

/**
 * #Renderer #jQuery
 * Misskeyから受け取ったタイムラインJSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createTimelineMskyLine(value, from_address) {
    let html = '';
    // リノート先があり本文もある場合は引用フラグを立てる
    const quote_flg = value.renote && value.text;
    // リノートならリノート先を、通常なら本体を参照先にする
    const viewdata = !quote_flg && value.renote ? value.renote : value;
    const date = yyyymmdd.format(new Date(viewdata.createdAt));
    const display_name = viewdata.user.name ?? viewdata.user.username;
    const user_address = viewdata.user.username + (viewdata.user.host ? ('@' + viewdata.user.host) : '');

    html += '<li name="' + createMisskeyUrl(viewdata, value.__host_address) + '">';
    if (!quote_flg && value.renote) {
        // リノートの場合はリノートヘッダを表示
        const renote_address = value.user.username + (value.user.host ? ('@' + value.user.host) : '');
        html += '<div class="label_head label_reblog">'
            + '<span>Renoted by @' + renote_address + '</span>'
            + '</div>';
    }
    html += '<div class="user">'
        // ユーザーアカウント情報
        + '<img src="' + viewdata.user.avatarUrl + '" class="usericon"/>'
        + '<h4 class="username">' + replaceEmojiMsky(display_name, viewdata.user.emojis) + '</h4>'
        + '<a class="userid">@' + user_address + '</a>';
    // 公開範囲がパブリック以外の場合は識別アイコンを配置
    switch (viewdata.visibility) {
        case 'home': // ホーム
            html += '<img src="resources/ic_unlisted.png" class="visibilityicon"/>';
            break;
        case 'followers': // フォロ限
            html += '<img src="resources/ic_followers.png" class="visibilityicon"/>';
            break;
        default:
            break;
    }
    html += '</div><div class="content">';
    if (viewdata.cw) {
        // CWテキストがある場合CWボタンを表示
        html += '<a class="expand_header label_cw">' + viewdata.cw + '</a>'
            + '<div class="main_content cw_content">';
    } else {
        // ない場合は普通にブロックを作る
        html += '<div class="main_content">';
    }
    // 本文
    html += replaceEmojiMsky(viewdata.text, viewdata.emojis)
        + '</div></div>';
    if (quote_flg) {
        // 引用フラグがある場合は引用先を表示
        html += '<div class="post_quote">'
            + '<div>' + viewdata.renote.user.name +  '</div>'
            + '<div>@' + viewdata.renote.user.username +  '</div>'
            + '<div>' + replaceEmojiMsky(viewdata.renote.text, viewdata.renote.emojis) +  '</div>'
            + '</div>';
    }
    if (viewdata.files.length > 0) {
        // 添付画像がある場合は画像を表示
        html += '<div class="media">';
        if (viewdata.files.filter(f => f.isSensitive).length > 0) {
            // 閲覧注意設定のある場合が含まれている場合は画像を隠す
            html += '<a class="expand_header label_sensitive">閲覧注意の画像があります</a>'
                + '<div class="media_content cw_content">';
        } else if (viewdata.files.length > 4) {
            // 画像ファイルが5枚以上ある場合も隠す
            html += '<a class="expand_header label_cw">添付画像が5枚以上あります</a>'
                + '<div class="media_content cw_content">';
        } else {
            html += '<div class="media_content">';
        }
        viewdata.files.forEach((media) => {
            // アスペクト比をリンクオプションとして設定
            const aspect = media.properties.width / media.properties.height;
            html += '<a href="' + media.url + '" name="' + aspect + '" class="__on_media_expand">'
                + '<img src="' + media.thumbnailUrl + '" class="media_preview"/></a>';
        });
        html += '</div></div>';
    }
    html += '<div class="post_footer">'
        + '<a class="created_at __on_datelink">' + date + '</a>';
    // 取得元ユーザーが渡されている場合は取得元ユーザーを表示
    if (from_address) {
        html += '<div class="from_address" name="' + from_address + '">From ' + from_address + '</div>';
    }
    html += '</div></li>';
    return html;
}

/**
 * #Renderer #jQuery
 * Misskeyから受け取った通知JSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createNotificationMskyLine(value, from_address) {
    let html = '';
    if (value.type == 'achievementEarned') {
        // TODO: 実績は無視！とりあえず当面の間は
        return html;
    }
    const date = yyyymmdd.format(new Date(value.createdAt));
    const display_name = value.user.name ?? value.user.username;
    const user_address = value.user.username + (value.user.host ? ('@' + value.user.host) : '');

    html += '<li name="' + createMisskeyUrl(value, value.__host_address) + '">';
    // 通知タイプによって表示を変更
    switch (value.type) {
        case 'reaction': // 絵文字リアクション
            html += '<div class="label_head label_favorite">'
                + '<span>ReAction from @' + user_address + '</span>'
                + '</div>';
            break;
        case 'renote': // リノート
            html += '<div class="label_head label_reblog">'
                + '<span>Renoted by @' + user_address + '</span>'
                + '</div>';
            break;
        case 'follow': // フォロー通知
            html += '<div class="label_head label_follow">'
                + '<span>Followed by @' + user_address + '</span>'
                + '</div>';
            break;
        default: // リプライの場合はヘッダ書かない
            break;
    }
    html += '<div class="user">'
        // ユーザーアカウント情報
        + '<img src="' + value.user.avatarUrl + '" class="usericon"/>'
        + '<h4 class="username">' + replaceEmojiMsky(display_name, value.user.emojis) + '</h4>'
        + '<a class="userid">@' + user_address + '</a>'
        + '</div><div class="content"><div class="main_content">';
        // 本文
    if (value.type == 'renote') {
        // リノートの場合は二重ネストしているノートを見に行くの場合は内容を表示
        html += replaceEmojiMsky(value.note.renote.text, value.note.renote.emojis);
    } else if (value.type != 'follow' && value.type != 'followRequestAccepted') {
        // フォロー以外の場合は内容を表示
        html += replaceEmojiMsky(value.note.text, value.note.emojis);
    }
    html += '</div></div><div class="post_footer">';
    // 通知タイプによって表示を変更
    switch (value.type) {
        case 'mention': // リプライ
            html += '<a class="created_at __on_datelink">' + date + '</a>';
            break;
        case 'follow': // フォロー通知
            // TODO: Misskeyのフォロー通知は一旦なにも表示しない
            break;
        default: // お気に入りとブーストは日付だけ
            html += '<div class="created_at">' + date + '</div>';
            break;
    }
    // 取得元ユーザーが渡されている場合は取得元ユーザーを表示
    if (from_address) {
        html += '<div class="from_address" name="' + from_address + '">From ' + from_address + '</div>';
    }
    html += '</div></li>';
    return html;
}

/**
 * #Renderer #jQuery
 * Misskeyのテキストから絵文字のショートコードを絵文字に変換
 * 
 * @param text 変換対象テキスト
 * @param emojis レスポンスに含まれる絵文字オブジェクト
 */
function replaceEmojiMsky(text, emojis) {
    if (!text) { // 文字の入力がない場合は空文字を返却
        return "";
    }
    if (!emojis) { // 絵文字がない場合はそのまま返却
        return text;
    }
    Object.keys(emojis).forEach((key) => {
        text = text.replace(new RegExp(':' + key + ':', 'g'),
            '<img src="' + emojis[key] + '" class="inline_emoji"/>');
    });
    return text;
}

/**
 * #Renderer #jQuery
 * Misskeyの投稿URLを取得(Mastodonと違って判定がめんどくさいのでメソッド化)
 * 
 * @param data 対象ノート
 * @param host ホストドメイン
 */
function createMisskeyUrl(data, host) {
    let note_url = null;
    if (!data.uri) {
        // そもそもURLが入ってない⇒Misskeyのローカル投稿なので自前で生成
        // 強引にねじ込んだホスト情報を使ってURLを生成
        note_url = "https://" + host + "/notes/" + data.id;
    } else if (data.user?.instance?.softwareName == "misskey") {
        // URLが入っていてMisskeyのノートの場合⇒data.uriに参照先のURLが入ってる
        note_url = data.uri;
    } else {
        // Mastodonの場合⇒data.urlに参照先のURLが入ってる
        // TODO: これだとMastodonのMisskey以外のプラットフォームに対応できないので後で対応
        note_url = data.url;
    }
    return note_url;
}

/*================================================================================================*/

/**
 * #Renderer #jQuery
 * 選択可能なアカウントリストを生成
 * 
 * @param accounts アカウントマップ
 */
function createSelectableAccounts(accounts) {
    let html = '<div class="account_list">';
    accounts.forEach((v, k) => {
        html += '<a name="' + k + '" class="__lnk_account_elm">'
            + '<img src="' + v.avatar_url + '" class="user_icon"/>'
            + '<div class="display_name">' + v.username + '</div>'
            + '<div class="user_domain">' + k + '</div>'
            + '</a>';
    });
    html += '</div>';
    return html;
}

/**
 * #Renderer #jQuery
 * メニューに入れるアカウントリストを生成
 * 
 * @param accounts アカウントマップ
 */
function createContextMenuAccounts(accounts) {
    let html = '';
    accounts.forEach((v, k) => {
        html += '<li name="' + k + '"><div>' + v.username + ' - ' + k + '</div></li>';
    });
    return html;
}

/**
 * #Renderer #jQuery
 * リプライウィンドウの生成
 * 
 * @param arg パラメータ一括指定JSON
 */
function createReplyColumn(arg) {
    let to_address = null;
    let bindFunc = null;
    switch (arg.platform) {
        case 'Mastodon': // Mastodon
            to_address = '@' + arg.post.account.acct;
            bindFunc = createTimelineMastLine;
            break;
        case 'Misskey': // Misskey
            to_address = '@' + arg.post.user.username + (arg.post.user.host ? ('@' + arg.post.user.host) : '');
            bindFunc = createTimelineMskyLine;
            break;
        default:
            break;
    }
    let html = '<div class="reply_col">'
        + '<h2>From ' + arg.key_address + '</h2>'
        + '<div class="reply_form">'
        + '<input type="hidden" id="__hdn_reply_id" value="' + arg.post.id + '"/>'
        + '<input type="hidden" id="__hdn_reply_account" value="' + arg.key_address + '"/>'
        + '<textarea id="__txt_replyarea" placeholder="(Ctrl+Enterでも投稿できます)">' + to_address + ' </textarea>'
        + '<button type="button" id="__on_reply_submit">投稿</button>'
        + '</div><div class="timeline"><ul>'
        + bindFunc(arg.post, null)
        + '</ul></div>'
        + '<button type="button" id="__on_reply_close">×</button>'
        + '</div>';
    return html;
}

/**
 * #Renderer #jQuery
 * 画像拡大ウィンドウの生成
 * 
 * @param arg パラメータ一括指定JSON
 */
function createImageWindow(arg) {
    let html = '<div class="expand_image_col">'
        + '<img src="' + arg.url + '"/>'
        + '</div>';
    $("#header>#pop_extend_column").html(html).show("slide", { direction: "right" }, 100);
    if (arg.image_aspect > arg.window_aspect) {
        // ウィンドウよりも画像のほうが横幅ながめ
        $("#header>#pop_extend_column>.expand_image_col>img")
            .css('width', '80vw').css('height', 'auto');
    } else {
        // ウィンドウよりも画像のほうが縦幅ながめ
        $("#header>#pop_extend_column>.expand_image_col>img")
            .css('height', '80vh').css('width', 'auto');
    }
}
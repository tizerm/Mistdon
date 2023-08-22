// 日付フォーマッター
const yyyymmdd = new Intl.DateTimeFormat(undefined,
	{
		year:   'numeric',
		month:  '2-digit',
		day:    '2-digit',
		hour:   '2-digit',
		minute: '2-digit',
		second: '2-digit',
		//fractionalSecondDigits: 3,
	}
)

/**
 * #Renderer #jQuery
 * MastodonとMisskeyのタイムラインデータをソートマップ可能なデータとして返す
 * 
 * @param data ポスト情報のJSON
 * @param timeline 流れてきたタイムラインJSON
 * @param tl_acc 流れてきたアカウントJSON
 */
function getIntegratedPost(data, timeline, tl_acc) {
	var binding_key = null;
	var sort_date = null;
	var user_address = null;

	// プラットフォーム判定
	switch (tl_acc.platform) {
		case 'Mastodon': // Mastodon
			binding_key = timeline.timeline_type == 'notification'
				? 'Mastodon-notification' : 'Mastodon-toot';
			sort_date = data.created_at;
			// ローカルリモート関係なくアカウントのフルアドレスを生成
			user_address = data.account.acct.match(/@/)
				? data.account.acct : (data.account.acct + '@' + timeline.host);
			break;
		case 'Misskey': // Misskey
			binding_key = timeline.timeline_type == 'notification'
				? 'Misskey-notification' : 'Misskey-note';
			sort_date = data.createdAt;
			// ローカルリモート関係なくアカウントのフルアドレスを生成
			// TODO: 実績が来ると落ちるのでOptionalにしとく
			user_address = data?.user?.username + '@'
				+ (data?.user?.host ? data?.user?.host : timeline?.host);
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
		'post': data
	};
}

/**
 * #Renderer #jQuery
 * カラムのテンプレートを生成する
 * 中身は後入れ
 * 
 * @param col_json カラム情報のJSON
 */
function createColumn(col_json) {
	// カラムヘッダを生成
	var html = '<th id="'
		+ col_json.column_id + '_head" class="head">'
		+ '<h2>' + col_json.label_head + '</h2>'
		+ '<h3>' + col_json.label_type + '</h3>'
		+ '</th>';
	$("#columns>table>thead>tr").append(html);
	
	// カラム本体を空の状態で生成
	html = '<td id="' + col_json.column_id + '_body" class="timeline">'
		+ '<ul></ul></td>';
	$("#columns>table>tbody>tr").append(html);
	
	// カラムヘッダの色を変更
	$("#columns>table>thead>tr>#" + col_json.column_id + "_head")
		.css("background-color", "#" + col_json.col_color);

	// カラムの幅を変更
	$("#columns>table>thead>tr>#" + col_json.column_id + "_head")
		.css("width", col_json.col_width + "px");
}

/**
 * #Renderer #jQuery
 * 統合用に整形した投稿データからタイムラインのDOMを生成
 * 
 * @param array_json 統合用に整形された投稿配列JSON
 * @param bind_id バインド先のID
 */
function createIntegratedTimeline(array_json, bind_id) {
	var html = '';
	$.each(array_json, (index, value) => {
		// binding_keyによって呼び出し関数を変える
		switch (value.binding_key) {
			case 'Mastodon-toot': // Mastodon-投稿タイムライン
				html += createTimelineMastLine(value.post);
				break;
			case 'Mastodon-notification': // Mastodon-通知欄
				html += createNotificationMastLine(value.post);
				break;
			case 'Misskey-note': // Misskey-投稿タイムライン
				html += createTimelineMskyLine(value.post);
				break;
			case 'Misskey-notification': // Misskey-通知欄
				html += createNotificationMskyLine(value.post);
				break;
			default:
				break;
		}
	});
	$("#columns>table>tbody>tr>#" + bind_id + ">ul").append(html);
}

/*================================================================================================*/

/**
 * #Renderer #jQuery
 * Mastodonから受け取ったタイムラインJSONをHTMLとして生成
 * 
 * @param array_json APIから返却された投稿配列JSON
 * @param bind_id バインド先のID
 */
function createTimelineMast(array_json, bind_id) {
	var html = '';
	$.each(array_json, (index, value) => {
		html += createTimelineMastLine(value);
	});
	$("#columns>table>tbody>tr>#" + bind_id + ">ul").append(html);
}

/**
 * #Renderer #jQuery
 * Mastodonから受け取ったタイムラインJSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createTimelineMastLine(value) {
	var html = '';
	// ブーストツートならブースト先を、通常なら本体を参照先にする
	var viewdata = value.reblog ? value.reblog : value;
	// toot_url = value.url
	// account_url = value.account.url
	var date = yyyymmdd.format(new Date(viewdata.created_at));
	var display_name = viewdata.account.display_name ? viewdata.account.display_name : viewdata.account.username;
	html += '<li>';
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
		+ '<a class="userid">@' + viewdata.account.acct + '</a>'
		+ '</div><div class="content">';
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
			html += '<img src="' + media.preview_url + '" class="media_preview"/>';
		});
		html += '</div></div>';
	}
	html += '<div class="post_footer">'
		+ '<a href="' + viewdata.url + '" target="_blank" class="created_at">' + date + '</a>'
		+ '<a class="buttons option">OPT</a>'
		+ '<a class="buttons favorite">FAV</a>'
		+ '<a class="buttons boost">BT</a>'
		+ '<a class="buttons reply">RP</a>'
		+ '</div></li>';
	return html;
}

/**
 * #Renderer #jQuery
 * Mastodonから受け取った通知JSONをHTMLとして生成
 * 
 * @param array_json APIから返却された投稿配列JSON
 * @param bind_id バインド先のID
 */
function createNotificationMast(array_json, bind_id) {
	var html = '';
	$.each(array_json, (index, value) => {
		html += createNotificationMastLine(value);
	});
	$("#columns>table>tbody>tr>#" + bind_id + ">ul").append(html);
}

/**
 * #Renderer #jQuery
 * Mastodonから受け取った通知JSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createNotificationMastLine(value) {
	var html = '';
	var date = yyyymmdd.format(new Date(value.created_at));
	var display_name = value.account.display_name ? value.account.display_name : value.account.username;
	html += '<li>';
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
			html += '<a href="' + value.status.url + '" target="_blank" class="created_at">' + date + '</a>'
				+ '<a class="buttons option">OPT</a>'
				+ '<a class="buttons favorite">FAV</a>'
				+ '<a class="buttons boost">BT</a>'
				+ '<a class="buttons reply">RP</a>';
			break;
		case 'follow': // フォロー通知
			html += '<div class="created_at">Post: ' + value.account.statuses_count
				+ ' / Follow: ' + value.account.following_count
				+ ' / Follower: ' + value.account.followers_count + '</div>'
				+ '<a class="buttons option">OPT</a>'
				+ '<a class="buttons block">BL</a>'
				+ '<a class="buttons follow">FL</a>';
			break;
		default: // お気に入りとブーストは日付だけ
			html += '<div class="created_at">' + date + '</a>';
			break;
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
	emojis.forEach((emoji) => {
		text = text.replace(new RegExp(':' + emoji.shortcode + ':', 'g'),
			'<img src="' + emoji.url + '" class="inline_emoji"/>');
	});
	return text;
}

/*================================================================================================*/

/**
 * #Renderer #jQuery
 * Misskeyから受け取ったタイムラインJSONをHTMLとして生成
 * 
 * @param array_json APIから返却された投稿配列JSON
 * @param bind_id バインド先のID
 */
function createTimelineMsky(array_json, bind_id) {
	var html = '';
	$.each(array_json, (index, value) => {
		html += createTimelineMskyLine(value);
	});
	$("#columns>table>tbody>tr>#" + bind_id + ">ul").append(html);
}

/**
 * #Renderer #jQuery
 * Misskeyから受け取ったタイムラインJSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createTimelineMskyLine(value) {
	var html = '';
	// リノート先があり本文もある場合は引用フラグを立てる
	var quote_flg = value.renote && value.text;
	// リノートならリノート先を、通常なら本体を参照先にする
	var viewdata = !quote_flg && value.renote ? value.renote : value;
	// toot_url = value.uri
	// account_url = (そのままだとアクセスできない)
	var date = yyyymmdd.format(new Date(viewdata.createdAt));
	var display_name = viewdata.user.name ? viewdata.user.name : viewdata.user.username;
	var user_address = viewdata.user.username + (viewdata.user.host ? ('@' + viewdata.user.host) : '');
	html += '<li>';
	if (!quote_flg && value.renote) {
		// リノートの場合はリノートヘッダを表示
		var renote_address = value.user.username + (value.user.host ? ('@' + value.user.host) : '');
		html += '<div class="label_head label_reblog">'
			+ '<span>Renoted by @' + renote_address + '</span>'
			+ '</div>';
	}
	html += '<div class="user">'
		// ユーザーアカウント情報
		+ '<img src="' + viewdata.user.avatarUrl + '" class="usericon"/>'
		+ '<h4 class="username">' + replaceEmojiMsky(display_name, viewdata.user.emojis) + '</h4>'
		+ '<a class="userid">@' + user_address + '</a>'
		+ '</div><div class="content">';
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
			html += '<img src="' + media.thumbnailUrl + '" class="media_preview"/>';
		});
		html += '</div></div>';
	}
	html += '<div class="post_footer">'
		+ '<a href="' + viewdata.id + '" target="_blank" class="created_at">' + date + '</a>'
		+ '<a class="buttons option">OPT</a>'
		+ '<a class="buttons favorite">ACT</a>'
		+ '<a class="buttons boost">RN</a>'
		+ '<a class="buttons reply">RP</a>'
		+ '</div></li>';
	return html;
}

/**
 * #Renderer #jQuery
 * Misskeyから受け取った通知JSONをHTMLとして生成
 * 
 * @param array_json APIから返却された投稿配列JSON
 * @param bind_id バインド先のID
 */
function createNotificationMsky(array_json, bind_id) {
	var html = '';
	$.each(array_json, (index, value) => {
		html += createNotificationMskyLine(value);
	});
	$("#columns>table>tbody>tr>#" + bind_id + ">ul").append(html);
}

/**
 * #Renderer #jQuery
 * Misskeyから受け取った通知JSONをHTMLとして生成(1行だけ)
 * 
 * @param value 個別status JSON
 */
function createNotificationMskyLine(value) {
	var html = '';
	if (value.type == 'achievementEarned') {
		// TODO: 実績は無視！とりあえず当面の間は
		return html;
	}
	var date = yyyymmdd.format(new Date(value.createdAt));
	var display_name = value.user.name ? value.user.name : value.user.username;
	var user_address = value.user.username + (value.user.host ? ('@' + value.user.host) : '');
	html += '<li>';
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
			html += '<a href="' + value.note.id + '" target="_blank" class="created_at">' + date + '</a>'
				+ '<a class="buttons option">OPT</a>'
				+ '<a class="buttons favorite">ACT</a>'
				+ '<a class="buttons boost">RN</a>'
				+ '<a class="buttons reply">RP</a>';
			break;
		case 'follow': // フォロー通知
		/*
			html += '<div class="created_at">Post: ' + value.account.statuses_count
				+ ' / Follow: ' + value.account.following_count
				+ ' / Follower: ' + value.account.followers_count + '</div>'
				+ '<a class="buttons option">OPT</a>'
				+ '<a class="buttons block">BL</a>'
				+ '<a class="buttons follow">FL</a>';//*/
			break;
		default: // お気に入りとブーストは日付だけ
			html += '<div class="created_at">' + date + '</a>';
			break;
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
	if (!emojis) { // 絵文字がない場合はそのまま返却
		return text;
	}
	Object.keys(emojis).forEach((key) => {
		text = text.replace(new RegExp(':' + key + ':', 'g'),
			'<img src="' + emojis[key] + '" class="inline_emoji"/>');
	});
	return text;
}

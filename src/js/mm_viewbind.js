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
		+ '<h4 class="username">' + viewdata.account.display_name + '</h4>'
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
	html += viewdata.content + '</div></div>';
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
		+ '<h4 class="username">' + value.account.display_name + '</h4>'
		+ '<a class="userid">@' + value.account.acct + '</a>'
		+ '</div><div class="content"><div class="main_content">';
		// 本文
	if (value.type == 'follow') {
		// フォローの場合はユーザーのプロフを表示
		html += value.account.note;
	} else {
		html += value.status.content;
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
	// リノートならリノート先を、通常なら本体を参照先にする
	var viewdata = value.reblog ? value.reblog : value;
	// toot_url = value.uri
	// account_url = (そのままだとアクセスできない)
	var date = yyyymmdd.format(new Date(viewdata.createdAt));
	html += '<li>';
	if (value.reblog) {
		// ブーストツートの場合はブーストヘッダを表示
		html += '<div class="label_head label_reblog">'
			+ '<span>Renoted by @' + value.user.username + '</span>'
			+ '</div>';
	}
	html += '<div class="user">'
		// ユーザーアカウント情報
		+ '<img src="' + viewdata.user.avatarUrl + '" class="usericon"/>'
		+ '<h4 class="username">' + viewdata.user.name + '</h4>'
		+ '<a class="userid">@' + viewdata.user.username + '</a>'
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
	html += viewdata.text + '</div></div>';
	// TODO: 画像添付も一旦保留
	/*
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
	}//*/
	html += '<div class="post_footer">'
		+ '<a href="' + viewdata.uri + '" target="_blank" class="created_at">' + date + '</a>'
		+ '<a class="buttons option">OPT</a>'
		+ '<a class="buttons favorite">FAV</a>'
		+ '<a class="buttons boost">BT</a>'
		+ '<a class="buttons reply">RP</a>'
		+ '</div></li>';
	return html;
}

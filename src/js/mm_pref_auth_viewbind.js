/**
 * #Renderer #jQuery
 * アカウントリストをHTMLとして生成(1行だけ)
 * 
 * @param value アカウントJSON
 */
function createAccountLine(value) {
    let html = '<li>'
        + '<h3>' + value.domain + '</h3>'
        + '<div class="user">'
        // ユーザーアカウント情報
        + '<img src="' + value.avatar_url + '" class="usericon"/>'
        + '<h4 class="username">' + value.username + '</h4>'
        + '<div class="userid">@' + value.user_id + '@' + value.domain + '</div>'
        + '</div><div class="option">'
        + 'アカウントカラー: #<input type="text" class="__txt_acc_color" value="'
        + (value.acc_color ?? '') + '" size="6"/></div></li>';
    return html;
}

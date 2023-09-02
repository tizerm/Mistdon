/**
 * #Renderer #jQuery
 * �A�J�E���g���X�g��HTML�Ƃ��Đ���(1�s����)
 * 
 * @param value �A�J�E���gJSON
 */
function createAccountLine(value) {
    let html = '<li>'
        + '<h3>' + value.domain + '</h3>'
        + '<div class="user">'
        // ���[�U�[�A�J�E���g���
        + '<img src="' + value.avatar_url + '" class="usericon"/>'
        + '<h4 class="username">' + value.username + '</h4>'
        + '<div class="userid">@' + value.user_id + '@' + value.domain + '</div>'
        + '</div><div class="option">'
        + '�A�J�E���g�J���[: #<input type="text" class="__txt_acc_color" value="'
        + (value.acc_color ?? '') + '" size="6"/></div></li>';
    return html;
}
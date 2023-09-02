/**
 * #Renderer #jQuery
 * �J�����̃e���v���[�g�𐶐�����
 * ���g�͌����
 * 
 * @param col_json �J��������JSON
 */
function createColumn(col_json, index) {
    // �J�����{�̂���̏�ԂŐ���
    html = '<td id="col' + index + '" class="timeline">'
        + '<div class="col_head">'
        + '<h2><input type="text" class="__txt_col_head" value="' + (col_json?.label_head ?? '') + '"/></h2>'
        + '<h3><input type="text" class="__txt_col_type" value="' + (col_json?.label_type ?? '') + '"/></h3>'
        + '<div class="col_layout">'
        + '#<input type="text" class="__txt_col_color" value="' + (col_json?.col_color ?? '') + '" size="6"/><br/>'
        + '<input type="text" class="__txt_col_width" value="' + (col_json?.col_width ?? '') + '" size="5"/>px'
        + '</div></div><div class="col_option">'
        + '<button type="button" class="__btn_to_left">��</button>'
        + '<button type="button" class="__btn_add_tl">TL�ǉ�</button>'
        + '<button type="button" class="__btn_del_col">��폜</button>'
        + '<button type="button" class="__btn_to_right">��</button>'
        + '</div><ul></ul></td>';
    $("#columns>table>tbody>tr").append(html);
    
    // �J�������C�A�E�g��ύX
    if (col_json?.col_color) {
        $("#columns>table #col" + index + ">.col_head")
            .css("background-color", "#" + col_json.col_color);
    }
    if (col_json?.col_width) {
        $("#columns>table #col" + index)
            .css("width", col_json.col_width + "px");
    }
}

/**
 * #Renderer #jQuery
 * �^�C�����C���ݒ�JSON��HTML�Ƃ��Đ���
 * 
 * @param array_json �ݒ�JSON
 * @param j �J�����ԍ�
 * @param accounts �A�J�E���g�}�b�v
 */
function createTimelineOptions(array_json, j, accounts) {
    let html = '';
    $.each(array_json, (index, value) => {
        html += createTimelineOptionLine(value, index + 1, accounts);
    });
    $("#columns>table #col" + j + ">ul").append(html);
}

/**
 * #Renderer #jQuery
 * �^�C�����C���ݒ��HTML�Ƃ��Đ���(1�s����)
 * 
 * @param value ��status JSON
 * @param index �^�C�����C���ԍ�
 * @param accounts �A�J�E���g�}�b�v
 */
function createTimelineOptionLine(value, index, accounts) {
    let html = '<li>'
        + '<h4><span class="tl_header_label">Timeline ' + index
        + '</span></h4>'
        + '<div class="tl_option"><div class="lbl_disp_account">'
        + '�\���A�J�E���g:<br/><select class="__cmb_tl_account">';
        // �A�J�E���g�Z�b�g
        accounts?.forEach((v, k) => {
            html += '<option value="' + k + '"' + (value?.key_address == k ? ' selected' : '') + '>'
                + v.username + ' - ' + k + '</option>';
        });
    html += '</select></div><div class="lbl_tl_type">'
        + '�ǉ�����J�����̎��:<br/><select class="__cmb_tl_type">'
        + '<option value="home"' + (value?.timeline_type == 'home' ? ' selected' : '') + '>�z�[��</option>'
        + '<option value="local"' + (value?.timeline_type == 'local' ? ' selected' : '') + '>���[�J��</option>'
        + '<option value="federation"' + (value?.timeline_type == 'federation' ? ' selected' : '') + '>�A��</option>'
        + '<option value="notification"' + (value?.timeline_type == 'notification' ? ' selected' : '') + '>�ʒm</option>'
        + '</select></div><div class="foot_button">'
        + '<button type="button" class="__btn_del_tl">�^�C�����C�����폜</button>'
        + '</div></div></li>';
    return html;
}

/**
 * #Renderer #jQuery
 * �J������DOM���폜
 * 
 * @param target_td �폜�Ώۂ�td�v�f��jQuery�I�u�W�F�N�g
 */
function removeColumn(target_td) {
    target_td.remove();
}

/**
 * #Renderer #jQuery
 * �J���������E�Ɉړ�
 * 
 * @param target_td �ړ��Ώۂ�td�v�f��jQuery�I�u�W�F�N�g
 * @param move �ړ�����(-1�����A1���E)
 */
function moveColumn(target_td, move) {
    switch (move) {
        case 1: // �E�Ɉړ�
            target_td.insertAfter(target_td.next());
            break;
        case -1: // ���Ɉړ�
            target_td.insertBefore(target_td.prev());
            break;
        default:
            break;
    }
}
/**
 * #Renderer #jQuery
 * �g����{�^���Ǝg���Ȃ��{�^�����Đݒ�
 */
function setButtonPermission() {
    $("#columns>table>tbody>tr>td").each((index, elm) => {
        // ���E�{�^���͈�U�L���ɂ���
        $(elm).find(".__btn_to_left").prop("disabled", false);
        $(elm).find(".__btn_to_right").prop("disabled", false);
        
        // �^�C�����C����1�̏ꍇ�̓^�C�����C���폜���֎~
        const single_tl_flg = $(elm).find("li").length == 1;
        $(elm).find(".__btn_del_tl").prop("disabled", single_tl_flg);
    });
    // �ŏ��̍Ō�̃J�����̍��E�{�^�����֎~����
    $("#columns>table>tbody>tr>td:first-child").find(".__btn_to_left").prop("disabled", true);
    $("#columns>table>tbody>tr>td:last-child").find(".__btn_to_right").prop("disabled", true);
}
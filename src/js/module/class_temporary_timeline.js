/**
 * #Class
 * 一時タイムラインを生成するクラス
 *
 * @author @tizerm@misskey.dev
 */
class TemporaryTimeline {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(group, key) {
        this.__group_id = group.id
        this.ref_group = group

        // 日付順にソートされたキー配列を生成
        const status_list = []
        group.status_map.forEach((v, k) => status_list.push(v))
        this.key_list = status_list.sort((a, b) => a.sort_date - b.sort_date).map(s => s.status_key)

        // 現在のキーの位置を記録
        if (key) this.index = this.key_list.indexOf(key)
        // 親グループに保存済みのキーがある場合はそれを使用
        else if (this.ref_group.__flash_key) this.index = this.key_list.indexOf(this.ref_group.__flash_key)
        // キー情報がない場合は先頭(最古)に設定
        else this.index = 0
    }

    static createJson() {
        const opt_elm = $("#pop_temporary_option")

        return {
            'key_address': account_address,
            'timeline_type': $(tl_elm).find(".__cmb_tl_type").val(),
            'account': Account.get(account_address)?.pref,
            'ex_host': $(tl_elm).find(".__txt_external_instance").val(),
            'ex_platform': $(tl_elm).find(".__hdn_external_platform").val(),
            'list_id': $(tl_elm).find(".__cmb_tl_list").val(),
            'channel_id': $(tl_elm).find(".__cmb_tl_channel").val(),
            'channel_name': $(tl_elm).find(".__cmb_tl_channel>option:checked").text(),
            'antenna_id': $(tl_elm).find(".__cmb_tl_antenna").val(),
            'exclude_reblog': $(tl_elm).find(".__chk_exclude_reblog").prop("checked"),
            'expand_cw': $(tl_elm).find(".__chk_expand_cw").prop("checked"),
            'expand_media': $(tl_elm).find(".__chk_expand_media").prop("checked"),
        }
    }

}


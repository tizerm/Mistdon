/**
 * #Class
 * 一時タイムラインを生成するクラス
 *
 * @author @tizerm@misskey.dev
 */
class TemporaryTimeline {
    // コンストラクタ: 設定ファイルにあるカラム設定値を使って初期化
    constructor(pref) {
        this.pref = pref
    }

    static create() {
        const opt_elm = $("#pop_temporary_option")
        const account_address = opt_elm.find(".__cmb_tl_account").val()

        return new TemporaryTimeline({
            'key_address': account_address != '__external' ? account_address : null,
            'timeline_type': opt_elm.find(".__cmb_tl_type").val(),
            'ex_host': opt_elm.find(".__txt_external_instance").val(),
            'ex_platform': opt_elm.find(".__hdn_external_platform").val(),
            'list_id': opt_elm.find(".__cmb_tl_list").val(),
            'channel_id': opt_elm.find(".__cmb_tl_channel").val(),
            'channel_name': opt_elm.find(".__cmb_tl_channel>option:checked").text(),
            'antenna_id': opt_elm.find(".__cmb_tl_antenna").val(),
            'exclude_reblog': opt_elm.find(".__chk_exclude_reblog").prop("checked"),
            'expand_cw': opt_elm.find(".__chk_expand_cw").prop("checked"),
            'expand_media': opt_elm.find(".__chk_expand_media").prop("checked"),
            'tl_layout': opt_elm.find(".__cmb_tl_layout").val()
        })
    }

    async getTimeline() {
        // すでに生成済みなら生成したものを返す
        if (this.tl) return this.tl

        const account = Account.get(this.pref.key_address)
        const host = account?.pref.domain ?? this.pref.ex_host
        const platform = account?.pref.platform ?? this.pref.ex_platform
        const tl_param = await window.accessApi.getAPIParams({
            host: host,
            platform: platform,
            timeline: this.pref
        })

        // グループオブジェクトとタイムラインオブジェクトを生成
        this.gp = new Group({
            'group_id': `gp_${crypto.randomUUID()}`,
            'timelines': [{
                'key_address': account?.full_address ?? null,
                'external': !account,
                'host': host,
                'platform': platform,
                'timeline_type': this.pref.timeline_type,
                'list_id': this.pref.timeline_type == 'list' ? this.pref.list_id : null,
                'channel_id': this.pref.timeline_type == 'channel' ? this.pref.channel_id : null,
                'channel_name': this.pref.timeline_type == 'channel' ? this.pref.channel_name : null,
                'antenna_id': this.pref.timeline_type == 'antenna' ? this.pref.antenna_id : null,
                'rest_url': tl_param.url,
                'socket_url': tl_param.socket_url,
                'query_param': tl_param.query_param,
                'socket_param': tl_param.socket_param,
                'exclude_reblog': this.pref.exclude_reblog,
                'expand_cw': this.pref.expand_cw,
                'expand_media': this.pref.expand_media,
            }],
            'multi_user': false,
            'multi_timeline': false,
            'tl_layout': this.pref.tl_layout,
            'multi_layout_option': this.pref.multi_layout_option,
        }, {})

        this.tl = this.gp.timelines[0]

        return this.tl
    }

}


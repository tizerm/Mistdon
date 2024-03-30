/**
 * #Class
 * 下書きモジュール
 *
 * @author tizerm@mofu.kemo.no
 */
class Draft {
    // コンストラクタ: 下書きオブジェクトからクラスオブジェクトを生成
    constructor(arg) {
        this.account = arg.account
        this.date = new RelativeTime(new Date(arg.date))
        this.content = arg.content
        this.cw = arg.cw || null
        this.visibility = arg.visibility
        this.channel = arg.channel || null
        this.local = arg.local
        this.reply_id = arg.reply_id || null
        this.quote_id = arg.quote_id || null
        this.poll = arg.poll
    }

    // スタティックマップを初期化(非同期)
    static {
        (async () => {
            const draft_jsons = await window.accessApi.readDraft()
            const drafts = []
            draft_jsons.forEach(elm => drafts.push(new Draft(elm)))
            Draft.list = drafts
        })()
    }

    /**
     * #StaticMethod
     * 下書き一覧を表示するメニューを表示
     */
    static createDraftMenu() {
        let lists = ''
        Draft.list.forEach(d => lists += d.element)
        $("#pop_draft>.draft_menu").html(lists || '<li class="draft_empty">(下書きがありません。)</li>')
        $("#pop_draft").show(...Preference.getAnimation("FADE_STD"))
    }

    /**
     * #StaticMethod
     * 現在入力中の内容で下書きに保存する.
     * 
     * @param arg パラメータオブジェクト
     */
    static async saveDraft(arg) {
        // 各種投稿オプションパラメータを取得
        let visibility = arg.option_obj.find('input[name="__opt_visibility"]:checked').val()
        const cw_text = arg.option_obj.find('#__txt_content_warning').val()
        const post_to = arg.option_obj.find('#__cmb_post_to').val()
        const is_local = arg.option_obj.find('#__chk_local_only').prop('checked')
        const reply_id = arg.option_obj.find('#__hdn_reply_id').val()
        const quote_id = arg.option_obj.find('#__hdn_quote_id').val()

        let poll = null
        if ($(arg.option_obj.find('.__txt_poll_option').get(0)).val()) {
            // アンケートがある場合はアンケートのオブジェクトを生成
            const options = []
            arg.option_obj.find('.__txt_poll_option').each((index, elm) => options.push($(elm).val()))
            const expire_time = Number(arg.option_obj.find('#__txt_poll_expire_time').val() || '0')
            poll = {
                options: options,
                expire_time: expire_time > 0 ? expire_time : null,
                expire_unit: arg.option_obj.find('#__cmb_expire_unit').val()
            }
        }

        // 下書きオブジェクトを生成
        const draft = new Draft({
            account: arg.account.full_address,
            date: new Date().toJSON(),
            content: arg.content,
            cw: cw_text,
            visibility: visibility,
            channel: post_to,
            local: is_local,
            reply_id: reply_id,
            quote_id: quote_id,
            poll: poll
        })
        Draft.list.unshift(draft)

        // 下書きをファイルに書き出し
        await window.accessApi.overwriteDraft(Draft.list.map(elm => elm.json))
        Notification.info('下書きに保存しました.')
        $("#__on_reset_option").click()
    }

    /**
     * #StaticMethod
     * 選択された下書きをロードして入力欄に展開する.
     * 
     * @param index 下書きのインデクス
     */
    static loadDraft(index) {
        const draft = Draft.list.splice(index, 1)[0]
        $("#__on_reset_option").click()
        Account.get(draft.account).setPostAccount()
        $("#__txt_postarea").val(draft.content)
        if (draft.cw) $("#__txt_content_warning").val(draft.cw)
        $("#__txt_postarea").focus()
    }

    // Getter: 下書きを一覧に表示する際の項目DOM
    get element() {
        const account = Account.get(this.account)
        return `
            <li class="draft_list">
                <div class="user">
                    <img src="${account.pref.avatar_url}" class="user_icon"/>
                    <div class="user_id">${this.account}</div>
                    <div class="create_date">${this.date.absolute}</div>
                </div>
                <div class="content">${this.content}</div>
            </li>
        `
    }

    // Getter: オブジェクトの情報を保存用のJSONとして返却
    get json() {
        return {
            "account": this.account,
            "date": this.date.time,
            "content": this.content,
            "cw": this.cw,
            "visibility": this.visibility,
            "channel": this.channel,
            "local": this.local,
            "reply_id": this.reply_id,
            "quote_id": this.quote_id,
            "poll": this.poll
        }
    }
}

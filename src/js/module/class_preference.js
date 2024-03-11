/**
 * #Class
 * アプリケーションの全体設定を管理する静的クラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Preference {
    constructor() {}

    // スタティックマップを初期化(非同期)
    static {
        (async () => { // 全体設定の読み込み処理
            const general_pref = await window.accessApi.readGeneralPref()
            if (!general_pref) // ファイルが読み込めなかった場合は初期設定を使用
                Preference.GENERAL_PREFERENCE = { // 全体設定の初期値
                    "enable_tool_button"            : true,     // ツールボタン(左にあるやつ)
                    "enable_post_button"            : true,     // 投稿ボタン
                    "enable_last_edit_button"       : true,     // 直前編集ボタン
                    "hide_additional_account"       : false,    // 投稿アカウントを自動で閉じる
                    "enable_action_palette"         : true,     // 簡易アクションパレット
                    "enable_expand_profile_cw"      : false,    // プロフCW展開
                    "enable_expand_profile_media"   : false,    // プロフメディア展開
                    "enable_media_confirm"          : true,     // メディア投稿確認
                    "enable_tips"                   : true,     // TIPS表示
                    "tl_cache_limit": {                         // TLキャッシュ件数
                        "default"                   : 100,      // ノーマル
                        "chat"                      : 150,      // チャット
                        "list"                      : 200,      // リスト
                        "media"                     : 80,       // メディア
                        "gallery"                   : 120       // ギャラリー
                    },
                    "media_height_limit": {                     // メディアの高さ制限
                        "default"                   : 240,      // ノーマル
                        "chat"                      : 160,      // チャット
                        "media"                     : 320,      // メディア
                        "gallery"                   : 240       // ギャラリー
                    },
                    "contents_limit": {                         // 文字数制限
                        "default"                   : 250,      // ノーマル
                        "chat"                      : 140,      // チャット
                    },
                    "history_limit"                 : 200,      // 履歴件数
                    "reaction_history_limit"        : 20,       // 履歴件数
                    "scroll_speed": {                           // スクロールスピード
                        "default"                   : 250,      // ノーマル
                        "shift"                     : 800       // チャット
                    },
                    "background": {                             // 背景
                        "type"                      : "mitlin", // 背景タイプ
                        "color"                     : "222222"  // 背景色
                    }
                }
            else Preference.GENERAL_PREFERENCE = general_pref
        })(); (async () => { // ウィンドウ設定の読み込み処理
            const win_pref = await window.accessApi.readWindowPref()
            if (!win_pref) return // ファイルがないときはなにもしない
            Preference.TEMPORARY_WINDOW_POSITION = {
                "top": win_pref.top,
                "left": win_pref.left,
                "opacity": win_pref.opacity
            }
            Preference.TEMPORARY_WINDOW_SIZE = {
                "width": win_pref.width,
                "height": win_pref.height
            }
        })();
    }

    /**
     * #StaticMethod
     * 全体設定ウィンドウを生成して表示.
     */
    static openGeneralPrefConfig() {
        // ヘルプウィンドウのDOM生成
        const jqelm = $($.parseHTML(`
            <div class="pref_col">
                <h2>全体設定</h2>
                <div class="pref_content"></div>
                <button type="button" id="__on_pref_save" class="close_button">保存して閉じる</button>
                <button type="button" id="__on_pref_close" class="close_button">保存せずに閉じる</button>
            </div>
        `))
        $("#pop_extend_column").html(jqelm)
        $.ajax({
            url: "pref_general.html",
            cache: false
        }).then(data => {
            $.each($.parseHTML(data), (index, value) => {
                if ($(value).is("#main")) $("#pop_extend_column .pref_content").html($(value))
            })
            Preference.setPreference()
            $("#pop_extend_column .tooltip_help").tooltip({
                position: {
                    my: "center top",
                    at: "center bottom"
                },
                show: {
                    effect: "slideDown",
                    duration: 80
                },
                hide: {
                    effect: "slideUp",
                    duration: 80
                }
            })
            $("#pop_extend_column").show("slide", { direction: "right" }, 150)
        })
    }

    /**
     * #StaticMethod
     * 全体設定ウィンドウに現在の設定値を適用.
     */
    static setPreference() {
        // 個別オプション
        $("#__chk_gen_use_tool_button").prop("checked", Preference.GENERAL_PREFERENCE.enable_tool_button)
        $("#__chk_gen_use_post_button").prop("checked", Preference.GENERAL_PREFERENCE.enable_post_button)
        $("#__chk_gen_use_additional_button").prop("checked", Preference.GENERAL_PREFERENCE.enable_last_edit_button)
        $("#__chk_gen_hide_additional_account").prop("checked", Preference.GENERAL_PREFERENCE.hide_additional_account)
        $("#__chk_gen_use_action_palette").prop("checked", Preference.GENERAL_PREFERENCE.enable_action_palette)
        $("#__chk_gen_expand_profile_cw").prop("checked", Preference.GENERAL_PREFERENCE.enable_expand_profile_cw)
        $("#__chk_gen_expand_profile_media").prop("checked", Preference.GENERAL_PREFERENCE.enable_expand_profile_media)
        $("#__chk_gen_show_media_confirm").prop("checked", Preference.GENERAL_PREFERENCE.enable_media_confirm)
        $("#__chk_gen_show_tips").prop("checked", Preference.GENERAL_PREFERENCE.enable_tips)

        // 件数キャッシュ
        $("#__txt_gen_tlcache_default").val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.default)
        $("#__txt_gen_tlcache_chat").val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.chat)
        $("#__txt_gen_tlcache_list").val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.list)
        $("#__txt_gen_tlcache_media").val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.media)
        $("#__txt_gen_tlcache_gallery").val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.gallery)

        // メディア高さ制限
        $("#__txt_gen_imageheight_limit_default").val(Preference.GENERAL_PREFERENCE.media_height_limit?.default)
        $("#__txt_gen_imageheight_limit_chat").val(Preference.GENERAL_PREFERENCE.media_height_limit?.chat)
        $("#__txt_gen_imageheight_limit_media").val(Preference.GENERAL_PREFERENCE.media_height_limit?.media)
        $("#__txt_gen_imageheight_limit_gallery").val(Preference.GENERAL_PREFERENCE.media_height_limit?.gallery)

        // コンテンツの文字数制限
        $("#__txt_gen_content_limit_default").val(Preference.GENERAL_PREFERENCE.contents_limit?.default)
        $("#__txt_gen_content_limit_chat").val(Preference.GENERAL_PREFERENCE.contents_limit?.chat)

        // 履歴件数
        $("#__txt_gen_history_limit").val(Preference.GENERAL_PREFERENCE.history_limit)
        $("#__txt_gen_reaction_history_limit").val(Preference.GENERAL_PREFERENCE.reaction_history_limit)
        // キーボードスクロール設定
        $("#__txt_gen_keyscroll_normal").val(Preference.GENERAL_PREFERENCE.scroll_speed?.default)
        $("#__txt_gen_keyscroll_shift").val(Preference.GENERAL_PREFERENCE.scroll_speed?.shift)
    }

    /**
     * #StaticMethod
     * 全体設定ウィンドウに入力された内容をファイルに保存.
     */
    static async saveGeneralPreference() {
        const save_pref = {
            "enable_tool_button"            : $("#__chk_gen_use_tool_button").prop("checked"),
            "enable_post_button"            : $("#__chk_gen_use_post_button").prop("checked"),
            "enable_last_edit_button"       : $("#__chk_gen_use_additional_button").prop("checked"),
            "hide_additional_account"       : $("#__chk_gen_hide_additional_account").prop("checked"),
            "enable_action_palette"         : $("#__chk_gen_use_action_palette").prop("checked"),
            "enable_expand_profile_cw"      : $("#__chk_gen_expand_profile_cw").prop("checked"),
            "enable_expand_profile_media"   : $("#__chk_gen_expand_profile_media").prop("checked"),
            "enable_media_confirm"          : $("#__chk_gen_show_media_confirm").prop("checked"),
            "enable_tips"                   : $("#__chk_gen_show_tips").prop("checked"),
            "tl_cache_limit": {             // TLキャッシュ件数
                "default"                   : $("#__txt_gen_tlcache_default").val(),
                "chat"                      : $("#__txt_gen_tlcache_chat").val(),
                "list"                      : $("#__txt_gen_tlcache_list").val(),
                "media"                     : $("#__txt_gen_tlcache_media").val(),
                "gallery"                   : $("#__txt_gen_tlcache_gallery").val(),
            },
            "media_height_limit": {         // メディアの高さ制限
                "default"                   : $("#__txt_gen_imageheight_limit_default").val(),
                "chat"                      : $("#__txt_gen_imageheight_limit_chat").val(),
                "media"                     : $("#__txt_gen_imageheight_limit_media").val(),
                "gallery"                   : $("#__txt_gen_imageheight_limit_gallery").val(),
            },
            "contents_limit": {             // 文字数制限
                "default"                   : $("#__txt_gen_content_limit_default").val(),
                "chat"                      : $("#__txt_gen_content_limit_chat").val(),
            },
            "history_limit"                 : $("#__txt_gen_history_limit").val(),
            "reaction_history_limit"        : $("#__txt_gen_reaction_history_limit").val(),
            "scroll_speed": {               // スクロールスピード
                "default"                   : $("#__txt_gen_keyscroll_normal").val(),
                "shift"                     : $("#__txt_gen_keyscroll_shift").val(),
            },
            "background": {                 // 背景
                "type"                      : "mitlin", // 背景タイプ
                "color"                     : "222222"  // 背景色
            }
        }

        // 設定ファイルを保存
        await window.accessApi.writeGeneralPref(save_pref)
        dialog({
            type: 'alert',
            title: "全体設定",
            text: "全体設定を保存しました。",
            // サブウィンドウを閉じる
            accept: () => $("#pop_extend_column").hide()
        })
    }

    /**
     * #StaticMethod
     * 全体設定の内容から永続適用CSSを生成.
     * TODO: セキュリティポリシーの関係でうまく動作していません
     */
    static generateStylesheet() {
        // CSSをバインド
        $(`<style>
            .timeline ul>li {
                > .media a.__on_media_expand {
                    max-height: ${Preference.GENERAL_PREFERENCE.media_height_limit?.default}px;
                }
                &.chat_timeline>.media a.__on_media_expand {
                    max-height: ${Preference.GENERAL_PREFERENCE.media_height_limit?.chat}px;
                }
                &.media_timeline>.media a.__on_media_expand {
                    max-height: ${Preference.GENERAL_PREFERENCE.media_height_limit?.media}px;
                }
                &.gallery_timeline>a.__on_media_expand {
                    max-height: ${Preference.GENERAL_PREFERENCE.media_height_limit?.gallery}px;
                }
            }
        </style>`).appendTo('head')
    }

    /**
     * #StaticMethod
     * 設定ファイルの内容でウィンドウ設定を書き換える
     */
    static setTempWindow() {
        if (!Preference.TEMPORARY_WINDOW_POSITION) return // 設定ファイルがなかったら何もしない
        const window_elm = $("#pop_window_timeline")
        window_elm.css({
            "top": `${Preference.TEMPORARY_WINDOW_POSITION.top}px`,
            "left": `${Preference.TEMPORARY_WINDOW_POSITION.left}px`,
            "width": `${Preference.TEMPORARY_WINDOW_SIZE.width}px`,
            "height": `${Preference.TEMPORARY_WINDOW_SIZE.height}px`
        })
        if (Preference.TEMPORARY_WINDOW_POSITION.opacity) // 透過設定
            window_elm.addClass("__opacity_on").find("#__window_opacity")
                .prop("checked", Preference.TEMPORARY_WINDOW_POSITION.opacity)
    }

    /**
     * #StaticMethod
     * 一時ウィンドウの位置データを保存する
     * 
     * @param ui Draggableのイベントオブジェクト
     */
    static storeTempWindowPosition(ui) {
        Preference.TEMPORARY_WINDOW_POSITION = {
            "top": Math.round(ui.offset.top),
            "left": Math.round(ui.offset.left)
        }
    }

    /**
     * #StaticMethod
     * 一時ウィンドウのサイズデータを保存する
     * 
     * @param ui Resizableのイベントオブジェクト
     */
    static storeTempWindowSize(ui) {
        Preference.TEMPORARY_WINDOW_SIZE = {
            "width": Math.round(ui.size.width),
            "height": Math.round(ui.size.height)
        }
    }

    /**
     * #StaticMethod
     * 一時ウィンドウ設定値をファイルに書き出す
     * 
     * @param target 一時ウィンドウのjQueryオブジェクト
     */
    static saveTempWindowPref(target) {
        window.accessApi.writeWindowPref({
            "top": Preference.TEMPORARY_WINDOW_POSITION.top,
            "left": Preference.TEMPORARY_WINDOW_POSITION.left,
            "width": Preference.TEMPORARY_WINDOW_SIZE.width,
            "height": Preference.TEMPORARY_WINDOW_SIZE.height,
            "opacity": target.find("#__window_opacity").prop("checked")
        })
    }
}


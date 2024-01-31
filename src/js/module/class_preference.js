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
            //const win_pref = await window.accessApi.readWindowPref()
            //if (!win_pref) return // ファイルがないときはなにもしない
            Preference.GENERAL_PREFERENCE = { // 全体設定の初期値
                "enable_last_edit_button"       : true,     // 直前編集ボタン
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
                "chat_height_limit"             : 0,        // チャット高さ制限
                "history_limit"                 : 200,      // 履歴件数
                "scroll_speed": {                           // スクロールスピード
                    "default"                   : 250,      // ノーマル
                    "shift"                     : 800       // チャット
                },
                "notification_layout"           : "large_left", // 通知タイプ
                "background": {                             // 背景
                    "type"                      : "mitlin", // 背景タイプ
                    "color"                     : "222222"  // 背景色
                }
            }
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

    static setPreference() {
        // 個別オプション
        $("#__chk_gen_use_additional_button").prop("checked", Preference.GENERAL_PREFERENCE.enable_last_edit_button)
        $("#__chk_gen_use_action_palette").prop("checked", Preference.GENERAL_PREFERENCE.enable_action_palette)
        $("#__chk_gen_expand_profile_cw").prop("checked", Preference.GENERAL_PREFERENCE.enable_expand_profile_cw)
        $("#__chk_gen_expand_profile_media").prop("checked", Preference.GENERAL_PREFERENCE.enable_expand_profile_media)
        $("#__chk_gen_show_tips").prop("checked", Preference.GENERAL_PREFERENCE.enable_tips)

        // 件数キャッシュ
        $("#__txt_gen_tlcache_default").val(Preference.GENERAL_PREFERENCE.tl_cache_limit.default)
        $("#__txt_gen_tlcache_chat").val(Preference.GENERAL_PREFERENCE.tl_cache_limit.chat)
        $("#__txt_gen_tlcache_list").val(Preference.GENERAL_PREFERENCE.tl_cache_limit.list)
        $("#__txt_gen_tlcache_media").val(Preference.GENERAL_PREFERENCE.tl_cache_limit.media)
        $("#__txt_gen_tlcache_gallery").val(Preference.GENERAL_PREFERENCE.tl_cache_limit.gallery)

        // メディア高さ制限
        $("#__txt_gen_imageheight_limit_default").val(Preference.GENERAL_PREFERENCE.media_height_limit.default)
        $("#__txt_gen_imageheight_limit_chat").val(Preference.GENERAL_PREFERENCE.media_height_limit.chat)
        $("#__txt_gen_imageheight_limit_media").val(Preference.GENERAL_PREFERENCE.media_height_limit.media)
        $("#__txt_gen_imageheight_limit_gallery").val(Preference.GENERAL_PREFERENCE.media_height_limit.gallery)

        // チャットレイアウトの高さ制限
        $("#__txt_gen_chatmaxheight").val(Preference.GENERAL_PREFERENCE.chat_height_limit)
        // 履歴件数
        $("#__txt_gen_history_limit").val(Preference.GENERAL_PREFERENCE.history_limit)
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


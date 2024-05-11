/**
 * #Class
 * アプリケーションの全体設定を管理する静的クラス
 *
 * @author @tizerm@misskey.dev
 */
class Preference {
    constructor(pref) { // 存在しないオプション項目は自動的に初期値を入れるコンストラクタ
        this.navigation_visible = {     // ナビゲーションメニューの表示設定
            "home"                      : pref?.navigation_visible?.home            ?? true, // ホーム
            "auth"                      : pref?.navigation_visible?.auth            ?? true, // アカウント認証
            "search"                    : pref?.navigation_visible?.search          ?? true, // 検索
            "trend"                     : pref?.navigation_visible?.trend           ?? true, // トレンド
            "history"                   : pref?.navigation_visible?.history         ?? true, // 送信履歴
            "profile"                   : pref?.navigation_visible?.profile         ?? true, // 認証アカウントプロフィール
            "bookmark"                  : pref?.navigation_visible?.bookmark        ?? true, // ブックマーク/お気に入り
            "emoji_cache"               : pref?.navigation_visible?.emoji_cache     ?? true, // 絵文字キャッシュ
            "help_keyborad"             : pref?.navigation_visible?.help_keyborad   ?? true, // ショートカット早見表
            "help"                      : pref?.navigation_visible?.help            ?? true  // ヘルプ
        },                              // 個別設定
        this.enable_tool_button         = pref?.enable_tool_button          ?? true,  // ツールボタン(左にあるやつ)
        this.enable_post_button         = pref?.enable_post_button          ?? true,  // 投稿ボタン
        this.enable_last_edit_button    = pref?.enable_last_edit_button     ?? true,  // 直前編集ボタン
        this.hide_additional_account    = pref?.hide_additional_account     ?? false, // 投稿アカウントを自動で閉じる
        this.enable_emoji_suggester     = pref?.enable_emoji_suggester      ?? true,  // カスタム絵文字サジェスター
        this.enable_action_palette      = pref?.enable_action_palette       ?? true,  // 簡易アクションパレット
        this.enable_pop_prev_reply      = pref?.enable_pop_prev_reply       ?? false, // 簡易リプライ表示
        this.enable_notified_impression = pref?.enable_notified_impression  ?? true,  // 通知欄のインプレッション表示
        this.enable_media_confirm       = pref?.enable_media_confirm        ?? true,  // メディア投稿確認
        this.disable_disconnect_pop     = pref?.disable_disconnect_pop      ?? false, // 一時切断通知
        this.enable_animation           = pref?.enable_animation            ?? true,  // アニメーション
        this.enable_tips                = pref?.enable_tips                 ?? true,  // TIPS表示
        this.auto_expand = {            // 自動展開
            "search_cw"                 : pref?.auto_expand?.search_cw      ?? false, // 検索: CW
            "search_media"              : pref?.auto_expand?.search_media   ?? false, // 検索: メディア
            "trend_cw"                  : pref?.auto_expand?.trend_cw       ?? false, // トレンド: CW
            "trend_media"               : pref?.auto_expand?.trend_media    ?? false, // トレンド: メディア
            "history_cw"                : pref?.auto_expand?.history_cw     ?? false, // 送信履歴: CW
            "history_media"             : pref?.auto_expand?.history_media  ?? false, // 送信履歴: メディア
            "detail_cw"                 : pref?.auto_expand?.detail_cw      ?? false, // 詳細表示: CW
            "detail_media"              : pref?.auto_expand?.detail_media   ?? false, // 詳細表示: メディア
            "profile_cw"                : pref?.auto_expand?.profile_cw     ?? false, // プロフィール: CW
            "profile_media"             : pref?.auto_expand?.profile_media  ?? false  // プロフィール: メディア
        },
        this.normal_name_format         = pref?.normal_name_format  ?? "both_prename", // ノーマル2の名前表記
        this.chat_name_format           = pref?.chat_name_format    ?? "id",           // チャットの名前表記
        this.time_format                = pref?.time_format         ?? "both",         // 時間表記
        this.reblog_time_format         = pref?.reblog_time_format  ?? "origin",       // BTRNの時間表記
        this.tl_cache_limit = {         // TLキャッシュ件数
            "default"                   : pref?.tl_cache_limit?.default     ?? 100, // ノーマル
            "chat"                      : pref?.tl_cache_limit?.chat        ?? 150, // チャット
            "list"                      : pref?.tl_cache_limit?.list        ?? 200, // リスト
            "media"                     : pref?.tl_cache_limit?.media       ?? 80,  // メディア
            "gallery"                   : pref?.tl_cache_limit?.gallery     ?? 120  // ギャラリー
        },
        this.media_height_limit = {     // メディアの高さ制限
            "default"                   : pref?.media_height_limit?.default ?? 240, // ノーマル
            "chat"                      : pref?.media_height_limit?.chat    ?? 160, // チャット
            "media"                     : pref?.media_height_limit?.media   ?? 320, // メディア
            "gallery"                   : pref?.media_height_limit?.gallery ?? 240  // ギャラリー
        },
        this.gallery_width_limit        = pref?.gallery_width_limit         ?? 240, // ギャラリーの横幅制限
        this.contents_limit = {         // 文字数制限
            "default"                   : pref?.contents_limit?.default     ?? 250, // ノーマル
            "chat"                      : pref?.contents_limit?.chat        ?? 140  // チャット
        },
        this.history_limit              = pref?.history_limit               ?? 200, // 送信履歴件数
        this.reaction_history_limit     = pref?.reaction_history_limit      ?? 20,  // リアクション履歴件数
        this.scroll_speed = {           // スクロールスピード
            "default"                   : pref?.scroll_speed?.default       ?? 250, // ノーマル
            "shift"                     : pref?.scroll_speed?.shift         ?? 800  // チャット
        },
        this.background = {             // 背景
            "type"                      : pref?.background?.type            ?? "mitlin", // 背景タイプ
            "color"                     : pref?.background?.color           ?? "222222", // 背景色
            "mitlin_version"            : pref?.background?.mitlin_version  ?? "ver100", // 背景にするミトリンの種類
            "file_path"                 : pref?.background?.file_path       ?? null      // 背景に設定する背景画像パス
        }
    }

    // スタティックマップを初期化(非同期)
    static {
        // 全体設定の読み込み処理
        (async () => Preference.GENERAL_PREFERENCE = new Preference(await window.accessApi.readGeneralPref()))()

        // アニメーションの固定値設定
        Preference.NO_ANIMATION = ["fade", 1]
        const animation_map = new Map()

        animation_map.set("TIMELINE_APPEND"  , ["drop" , { direction: "left"  }, 250])
        animation_map.set("TIMELINE_DELETE"  , ["fade"                         , 2500])
        animation_map.set("EXTEND_DROP"      , ["drop" , { direction: "right" }, 160])
        animation_map.set("LEFT_DROP"        , ["drop" , { direction: "left"  }, 160])
        animation_map.set("NOTIFICATION_DROP", ["drop" , { direction: "left"  }, 400])
        animation_map.set("SLIDE_FAST"       , ["blind", { direction: "up"    }, 80])
        animation_map.set("SLIDE_DOWN"       , ["blind", { direction: "up"    }, 160])
        animation_map.set("SLIDE_RIGHT"      , ["blind", { direction: "right" }, 160])
        animation_map.set("SLIDE_LEFT"       , ["blind", { direction: "left"  }, 160])
        animation_map.set("FADE_FAST"        , ["fade"                         , 80])
        animation_map.set("FADE_STD"         , ["fade"                         , 160])
        animation_map.set("POP_FOLD"         , ["fold" , { size : 32          }, 80])
        animation_map.set("WINDOW_FOLD"      , ["fold" , { size : 32          }, 160])

        Preference.ANIMATION_MAP = animation_map

        // UIアニメーションの固定値設定
        const position_map = new Map()

        position_map.set("DROP", {
            my: "center top",
            at: "center bottom"
        })
        position_map.set("UPPER", {
            my: "center bottom-8",
            at: "center top"
        })
        position_map.set("RIGHT", {
            my: "left+15 bottom+2",
            at: "right center"
        })
        Preference.POSITION_MAP = position_map

        const ui_map = new Map()

        ui_map.set("UI_DROP_ANIMATION", {
            show: {
                effect: "slide",
                duration: 80
            },
            hide: {
                effect: "slide",
                duration: 80
            }
        })
        ui_map.set("UI_FADE_ANIMATION", {
            show: {
                effect: "fade",
                duration: 80
            },
            hide: {
                effect: "fade",
                duration: 80
            }
        })
        ui_map.set("UI_DIALOG_ANIMATION", {
            show: {
                effect: "fold",
                duration: 160
            },
            hide: {
                effect: "fold",
                duration: 160
            }
        })
        Preference.UI_ANIM_MAP = ui_map
        Preference.UI_NO_ANIMATION = {
            show: {
                effect: "fade",
                duration: 1
            },
            hide: {
                effect: "fade",
                duration: 1
            }
        }
    }

    // 確認ダイアログを無視するフラグ
    static IGNORE_DIALOG = false

    /**
     * #StaticMethod
     * 全体設定ウィンドウを生成して表示.
     */
    static openGeneralPrefConfig() {
        const window_key = 'singleton_pref_window'
        if ($(`#${window_key}`).length > 0) return // 既に開いている場合は何もしない

        createWindow({ // ウィンドウを生成
            window_key: window_key,
            html: `
                <div id="${window_key}" class="pref_window ex_window">
                    <h2><span>全体設定</span></h2>
                    <div class="window_buttons">
                        <input type="checkbox" class="__window_opacity" id="__window_opacity_pref"/>
                        <label for="__window_opacity_pref" class="window_opacity_button" title="透過"><img
                            src="resources/ic_alpha.png" alt="透過"/></label>
                        <button type="button" class="window_close_button" title="閉じる"><img
                            src="resources/ic_not.png" alt="閉じる"/></button>
                    </div>
                    <div class="pref_content"></div>
                    <div class="footer">
                        <button type="button" id="__on_pref_save" class="close_button">OK</button>
                        <button type="button" id="__on_pref_close" class="close_button">キャンセル</button>
                    </div>
                </div>
            `,
            color: '42809e',
            drag_only_x: false,
            resizable: true,
            resize_only_y: false
        })

        // テンプレート内容をウィンドウにバインド
        $.ajax({
            url: "pref_general.html",
            cache: false
        }).then(data => {
            $.each($.parseHTML(data), (index, value) => {
                if ($(value).is("#main")) $(`#${window_key} .pref_content`).html($(value))
            })
            Preference.setPreference()
            $(`#${window_key} .pref_content .tooltip_help`).tooltip({
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
        })
    }

    /**
     * #StaticMethod
     * 全体設定ウィンドウに現在の設定値を適用.
     */
    static setPreference() {
        // メニュー表示設定
        $("#__chk_gen_navi_home")           .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.home)
        $("#__chk_gen_navi_auth")           .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.auth)
        $("#__chk_gen_navi_search")         .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.search)
        $("#__chk_gen_navi_trend")          .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.trend)
        $("#__chk_gen_navi_history")        .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.history)
        $("#__chk_gen_navi_profile")        .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.profile)
        $("#__chk_gen_navi_bookmark")       .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.bookmark)
        $("#__chk_gen_navi_emoji")          .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.emoji_cache)
        $("#__chk_gen_navi_help_keyborad")  .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.help_keyborad)
        $("#__chk_gen_navi_help")           .prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.help)

        // 個別オプション
        $("#__chk_gen_use_tool_button")                 .prop("checked", Preference.GENERAL_PREFERENCE.enable_tool_button)
        $("#__chk_gen_use_post_button")                 .prop("checked", Preference.GENERAL_PREFERENCE.enable_post_button)
        $("#__chk_gen_use_additional_button")           .prop("checked", Preference.GENERAL_PREFERENCE.enable_last_edit_button)
        $("#__chk_gen_hide_additional_account")         .prop("checked", Preference.GENERAL_PREFERENCE.hide_additional_account)
        $("#__chk_gen_use_emoji_suggester")             .prop("checked", Preference.GENERAL_PREFERENCE.enable_emoji_suggester)
        $("#__chk_gen_use_action_palette")              .prop("checked", Preference.GENERAL_PREFERENCE.enable_action_palette)
        $("#__chk_gen_use_prev_relpy")                  .prop("checked", Preference.GENERAL_PREFERENCE.enable_pop_prev_reply)
        $("#__chk_gen_use_notified_impression")         .prop("checked", Preference.GENERAL_PREFERENCE.enable_notified_impression)
        $("#__chk_gen_show_media_confirm")              .prop("checked", Preference.GENERAL_PREFERENCE.enable_media_confirm)
        $("#__chk_gen_disable_disconnect_notification") .prop("checked", Preference.GENERAL_PREFERENCE.disable_disconnect_pop)
        $("#__chk_gen_animation")                       .prop("checked", Preference.GENERAL_PREFERENCE.enable_animation)
        $("#__chk_gen_show_tips")                       .prop("checked", Preference.GENERAL_PREFERENCE.enable_tips)

        // 自動展開
        $("#__chk_gen_expand_cw_search")    .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.search_cw)
        $("#__chk_gen_expand_media_search") .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.search_media)
        $("#__chk_gen_expand_cw_trend")     .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.trend_cw)
        $("#__chk_gen_expand_media_trend")  .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.trend_media)
        $("#__chk_gen_expand_cw_history")   .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.history_cw)
        $("#__chk_gen_expand_media_history").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.history_media)
        $("#__chk_gen_expand_cw_detail")    .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.detail_cw)
        $("#__chk_gen_expand_media_detail") .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.detail_media)
        $("#__chk_gen_expand_cw_profile")   .prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.profile_cw)
        $("#__chk_gen_expand_media_profile").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.profile_media)

        // 表記系オプション
        $(`input.__opt_gen_normal_name_format[value="${Preference.GENERAL_PREFERENCE.normal_name_format}"]`).prop("checked", true)
        $(`input.__opt_gen_chat_name_format[value="${Preference.GENERAL_PREFERENCE.chat_name_format}"]`).prop("checked", true)
        $(`input.__opt_gen_time_format[value="${Preference.GENERAL_PREFERENCE.time_format}"]`).prop("checked", true)
        $(`input.__opt_gen_reblog_time_format[value="${Preference.GENERAL_PREFERENCE.reblog_time_format}"]`).prop("checked", true)

        // 件数キャッシュ
        $("#__txt_gen_tlcache_default") .val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.default)
        $("#__txt_gen_tlcache_chat")    .val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.chat)
        $("#__txt_gen_tlcache_list")    .val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.list)
        $("#__txt_gen_tlcache_media")   .val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.media)
        $("#__txt_gen_tlcache_gallery") .val(Preference.GENERAL_PREFERENCE.tl_cache_limit?.gallery)

        // メディア高さ制限
        $("#__txt_gen_imageheight_limit_default")   .val(Preference.GENERAL_PREFERENCE.media_height_limit?.default)
        $("#__txt_gen_imageheight_limit_chat")      .val(Preference.GENERAL_PREFERENCE.media_height_limit?.chat)
        $("#__txt_gen_imageheight_limit_media")     .val(Preference.GENERAL_PREFERENCE.media_height_limit?.media)
        $("#__txt_gen_imageheight_limit_gallery")   .val(Preference.GENERAL_PREFERENCE.media_height_limit?.gallery)

        $("#__txt_gen_imagewidth_limit")            .val(Preference.GENERAL_PREFERENCE.gallery_width_limit)

        // コンテンツの文字数制限
        $("#__txt_gen_content_limit_default")   .val(Preference.GENERAL_PREFERENCE.contents_limit?.default)
        $("#__txt_gen_content_limit_chat")      .val(Preference.GENERAL_PREFERENCE.contents_limit?.chat)

        // 履歴件数
        $("#__txt_gen_history_limit")           .val(Preference.GENERAL_PREFERENCE.history_limit)
        $("#__txt_gen_reaction_history_limit")  .val(Preference.GENERAL_PREFERENCE.reaction_history_limit)

        // キーボードスクロール設定
        $("#__txt_gen_keyscroll_normal")    .val(Preference.GENERAL_PREFERENCE.scroll_speed?.default)
        $("#__txt_gen_keyscroll_shift")     .val(Preference.GENERAL_PREFERENCE.scroll_speed?.shift)

        // 背景設定
        $(`input.__opt_gen_background[value="${Preference.GENERAL_PREFERENCE.background?.type}"]`).prop("checked", true)
        $("#__txt_gen_background_color").val(Preference.GENERAL_PREFERENCE.background?.color)
        $("#__cmb_gen_backmitlin_type").val(Preference.GENERAL_PREFERENCE.background?.mitlin_version)
        $("#__hdn_gen_bgfile").val(Preference.GENERAL_PREFERENCE.background?.file_path)
    }

    /**
     * #StaticMethod
     * 全体設定ウィンドウに入力された内容をファイルに保存.
     */
    static async saveGeneralPreference() {
        const save_pref = {
            "navigation_visible": {         // ナビゲーションメニューの表示設定
                "home"                      : $("#__chk_gen_navi_home").prop("checked"),
                "auth"                      : $("#__chk_gen_navi_auth").prop("checked"),
                "search"                    : $("#__chk_gen_navi_search").prop("checked"),
                "trend"                     : $("#__chk_gen_navi_trend").prop("checked"),
                "history"                   : $("#__chk_gen_navi_history").prop("checked"),
                "profile"                   : $("#__chk_gen_navi_profile").prop("checked"),
                "bookmark"                  : $("#__chk_gen_navi_bookmark").prop("checked"),
                "emoji_cache"               : $("#__chk_gen_navi_emoji").prop("checked"),
                "help_keyborad"             : $("#__chk_gen_navi_help_keyborad").prop("checked"),
                "help"                      : $("#__chk_gen_navi_help").prop("checked")
            },
            "enable_tool_button"            : $("#__chk_gen_use_tool_button").prop("checked"),
            "enable_post_button"            : $("#__chk_gen_use_post_button").prop("checked"),
            "enable_last_edit_button"       : $("#__chk_gen_use_additional_button").prop("checked"),
            "hide_additional_account"       : $("#__chk_gen_hide_additional_account").prop("checked"),
            "enable_emoji_suggester"        : $("#__chk_gen_use_emoji_suggester").prop("checked"),
            "enable_action_palette"         : $("#__chk_gen_use_action_palette").prop("checked"),
            "enable_pop_prev_reply"         : $("#__chk_gen_use_prev_relpy").prop("checked"),
            "enable_notified_impression"    : $("#__chk_gen_use_notified_impression").prop("checked"),
            "enable_media_confirm"          : $("#__chk_gen_show_media_confirm").prop("checked"),
            "disable_disconnect_pop"        : $("#__chk_gen_disable_disconnect_notification").prop("checked"),
            "enable_animation"              : $("#__chk_gen_animation").prop("checked"),
            "enable_tips"                   : $("#__chk_gen_show_tips").prop("checked"),
            "auto_expand": {                // 自動展開
                "search_cw"                 : $("#__chk_gen_expand_cw_search").prop("checked"),
                "search_media"              : $("#__chk_gen_expand_media_search").prop("checked"),
                "trend_cw"                  : $("#__chk_gen_expand_cw_trend").prop("checked"),
                "trend_media"               : $("#__chk_gen_expand_media_trend").prop("checked"),
                "history_cw"                : $("#__chk_gen_expand_cw_history").prop("checked"),
                "history_media"             : $("#__chk_gen_expand_media_history").prop("checked"),
                "detail_cw"                 : $("#__chk_gen_expand_cw_detail").prop("checked"),
                "detail_media"              : $("#__chk_gen_expand_media_detail").prop("checked"),
                "profile_cw"                : $("#__chk_gen_expand_cw_profile").prop("checked"),
                "profile_media"             : $("#__chk_gen_expand_media_profile").prop("checked")
            },
            "normal_name_format"            : $("input.__opt_gen_normal_name_format:checked").val(),
            "chat_name_format"              : $("input.__opt_gen_chat_name_format:checked").val(),
            "time_format"                   : $("input.__opt_gen_time_format:checked").val(),
            "reblog_time_format"            : $("input.__opt_gen_reblog_time_format:checked").val(),
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
            "gallery_width_limit"           : $("#__txt_gen_imagewidth_limit").val(),
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
                "type"                      : $("input.__opt_gen_background:checked").val(),
                "color"                     : $("#__txt_gen_background_color").val(),
                "mitlin_version"            : $("#__cmb_gen_backmitlin_type").val(),
                "file_path"                 : $("#__hdn_gen_bgfile").val().replace(/\\/g, '/')
            }
        }

        // 設定ファイルを保存
        await window.accessApi.writeGeneralPref(save_pref)
        dialog({
            type: 'alert',
            title: "全体設定",
            text: "全体設定を保存しました。",
            // サブウィンドウを閉じる
            accept: () => $("#pop_multi_window").empty()
        })
    }

    /**
     * #StaticMethod
     * ブックマーク/お気に入り機能の初期値設定.
     */
    static initBookmarkPref() {
        // アカウントコンボ初期設定
        let options = ''
        Account.map.forEach((v, k) => options += `<option value="${k}">${v.pref.username} - ${k}</option>`)
        $("#__cmb_ex_bookmark_account").html(options)

        // 展開チェック初期設定
        $("#__chk_ex_bookmark_cw").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.profile_cw)
        $("#__chk_ex_bookmark_media").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.profile_media)
    }

    /**
     * #StaticMethod
     * 全体設定の内容からメインタイムライン以外のタイムライン設定を設定.
     */
    static setAlternateTimelinePref() {
        // 検索タイムライン
        Query.SEARCH_PREF_TIMELINE.pref = {
            "expand_cw": Preference.GENERAL_PREFERENCE.auto_expand?.search_cw,
            "expand_media": Preference.GENERAL_PREFERENCE.auto_expand?.search_media
        }
        // トレンドタイムライン
        Trend.TREND_PREF_TIMELINE.pref = {
            "expand_cw": Preference.GENERAL_PREFERENCE.auto_expand?.trend_cw,
            "expand_media": Preference.GENERAL_PREFERENCE.auto_expand?.trend_media
        }
        // 送信履歴タイムライン
        History.HISTORY_PREF_TIMELINE.pref = {
            "expand_cw": Preference.GENERAL_PREFERENCE.auto_expand?.history_cw,
            "expand_media": Preference.GENERAL_PREFERENCE.auto_expand?.history_media
        }
        // 詳細表示タイムライン
        Status.DETAIL_TIMELINE.pref = {
            "expand_cw": Preference.GENERAL_PREFERENCE.auto_expand?.detail_cw,
            "expand_media": Preference.GENERAL_PREFERENCE.auto_expand?.detail_media
        }
        // ユーザープロフィールタイムライン
        User.USER_MAIN_TIMELINE.pref = {
            "expand_cw": Preference.GENERAL_PREFERENCE.auto_expand?.profile_cw,
            "expand_media": Preference.GENERAL_PREFERENCE.auto_expand?.profile_media
        }
        User.DETAIL_TIMELINE.pref = {
            "expand_cw": Preference.GENERAL_PREFERENCE.auto_expand?.profile_cw,
            "expand_media": Preference.GENERAL_PREFERENCE.auto_expand?.profile_media
        }
    }

    /**
     * #StaticMethod
     * 全体設定の内容から永続適用CSSを生成.
     */
    static generateStylesheet() {
        // ギャラリーレイアウトのコンテナクエリを定義
        const width_limit = Number(Preference.GENERAL_PREFERENCE.gallery_width_limit)
        let containers = ''
        for (let i = 1; i <= 16; i++) containers += `
            @container gallery (width > ${width_limit * i}px) and (width <= ${width_limit * (i + 1)}px) {
                > li.gallery_timeline { width: calc(${100 / (i + 1)}% - 6px); }
            }
        `
        // CSSをバインド
        $('style').html(`
            .timeline ul {
                > li {
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
                @container gallery (width <= ${width_limit}px) {
                    > li.gallery_timeline { width: calc(100% - 2px); }
                }
                ${containers}
                @container gallery (width > ${width_limit * 17}px) {
                    > li.gallery_timeline { width: calc(${100 / 18}% - 6px); }
                }
            }
        `)
    }

    /**
     * #StaticMethod
     * 全体設定の内容から背景画像を設定.
     */
    static setBackground() {
        switch (Preference.GENERAL_PREFERENCE.background?.type) {
            case 'mono_color': // 単色カラー
                $("body").css({
                    "background-image": 'none',
                    "background-color": `#${Preference.GENERAL_PREFERENCE.background?.color}`
                })
                break
            case 'mitlin': // ミトリン
                // v1.0.0のミトリンのみフル尺で画面に表示
                if (Preference.GENERAL_PREFERENCE.background?.mitlin_version == 'ver100') {
                    $("body").css({
                        "background-image": `url("resources/illust/mistdon_back_v100.jpg")`,
                        "background-position": 'center center',
                        "background-size": 'cover'
                    })
                    break
                }
                let mitlin_url = null
                switch (Preference.GENERAL_PREFERENCE.background?.mitlin_version) {
                    case 'ver011':
                        mitlin_url = 'resources/illust/mitlin_back1.jpg'
                        break
                    case 'ver031':
                        mitlin_url = 'resources/illust/mitlin_back2.jpg'
                        break
                    case 'ver041':
                        mitlin_url = 'resources/illust/mitlin_back3.jpg'
                        break
                    case 'ver051':
                        mitlin_url = 'resources/illust/mitlin_back4.jpg'
                        break
                    default: // デフォルトはv1.0.0
                        mitlin_url = 'resources/illust/mitlin_back100.jpg'
                        break
                }
                $("body").css("background-image", `url("${mitlin_url}")`)
                break
            case 'select_image': // ユーザー指定画像
                $("body").css({
                    "background-image": `url("${Preference.GENERAL_PREFERENCE.background?.file_path}")`,
                    "background-position": 'center center',
                    "background-size": 'cover'
                })
                break
            default:
                break
        }
    }

    /**
     * #StaticMethod
     * イージングの種類を指定してアニメーションパラメータを取得.
     * 
     * @param type アニメーションタイプ
     */
    static getAnimation(type) {
        if (Preference.GENERAL_PREFERENCE.enable_animation) return Preference.ANIMATION_MAP.get(type)
        else return Preference.NO_ANIMATION
    }

    /**
     * #StaticMethod
     * イージングの種類を指定してjQueryUI用のパラメータを取得.
     * 
     * @param position ポジションタイプ
     * @param animation アニメーションタイプ
     */
    static getUIPref(position, animation) {
        const animation_obj = Preference.GENERAL_PREFERENCE.enable_animation
            ? Preference.UI_ANIM_MAP.get(animation) : Preference.UI_NO_ANIMATION
        return {
            position: position ? Preference.POSITION_MAP.get(position) : undefined,
            show: animation_obj?.show,
            hide: animation_obj?.hide
        }
    }}


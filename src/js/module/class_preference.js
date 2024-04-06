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
                    "navigation_visible": {                     // ナビゲーションメニューの表示設定
                        "home"                      : true,     // ホーム
                        "auth"                      : true,     // アカウント認証
                        "search"                    : true,     // 検索
                        "trend"                     : true,     // トレンド
                        "history"                   : true,     // 送信履歴
                        "profile"                   : true,     // 認証アカウントプロフィール
                        "clip"                      : true,     // クリップ
                        "emoji_cache"               : true,     // 絵文字キャッシュ
                        "help_keyborad"             : true,     // ショートカット早見表
                        "help"                      : true      // ヘルプ
                    },
                    "enable_tool_button"            : true,     // ツールボタン(左にあるやつ)
                    "enable_post_button"            : true,     // 投稿ボタン
                    "enable_last_edit_button"       : true,     // 直前編集ボタン
                    "hide_additional_account"       : false,    // 投稿アカウントを自動で閉じる
                    "enable_action_palette"         : true,     // 簡易アクションパレット
                    "enable_notified_impression"    : true,     // 通知欄のインプレッション表示
                    "enable_media_confirm"          : true,     // メディア投稿確認
                    "enable_animation"              : true,     // アニメーション
                    "enable_tips"                   : true,     // TIPS表示
                    "auto_expand": {                            // 自動展開
                        "search_cw"                 : false,    // 検索: CW
                        "search_media"              : false,    // 検索: メディア
                        "trend_cw"                  : false,    // トレンド: CW
                        "trend_media"               : false,    // トレンド: メディア
                        "history_cw"                : false,    // 送信履歴: CW
                        "history_media"             : false,    // 送信履歴: メディア
                        "clip_cw"                   : false,    // クリップ: CW
                        "clip_media"                : false,    // クリップ: メディア
                        "detail_cw"                 : false,    // 詳細表示: CW
                        "detail_media"              : false,    // 詳細表示: メディア
                        "profile_cw"                : false,    // プロフィール: CW
                        "profile_media"             : false     // プロフィール: メディア
                    },
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
                    "history_limit"                 : 200,      // 送信履歴件数
                    "reaction_history_limit"        : 20,       // リアクション履歴件数
                    "scroll_speed": {                           // スクロールスピード
                        "default"                   : 250,      // ノーマル
                        "shift"                     : 800       // チャット
                    },
                    "background": {                             // 背景
                        "type"                      : "mitlin", // 背景タイプ
                        "color"                     : "222222", // 背景色
                        "mitlin_version"            : "ver041", // 背景にするミトリンの種類
                        "file_path"                 : null      // 背景に設定する背景画像パス
                    }
                }
            else Preference.GENERAL_PREFERENCE = general_pref
        })()

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
        // メニュー表示設定
        $("#__chk_gen_navi_home").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.home)
        $("#__chk_gen_navi_auth").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.auth)
        $("#__chk_gen_navi_search").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.search)
        $("#__chk_gen_navi_trend").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.trend)
        $("#__chk_gen_navi_history").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.history)
        $("#__chk_gen_navi_profile").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.profile)
        $("#__chk_gen_navi_clip").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.clip)
        $("#__chk_gen_navi_emoji").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.emoji_cache)
        $("#__chk_gen_navi_help_keyborad").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.help_keyborad)
        $("#__chk_gen_navi_help").prop("checked", Preference.GENERAL_PREFERENCE.navigation_visible?.help)

        // 個別オプション
        $("#__chk_gen_use_tool_button").prop("checked", Preference.GENERAL_PREFERENCE.enable_tool_button)
        $("#__chk_gen_use_post_button").prop("checked", Preference.GENERAL_PREFERENCE.enable_post_button)
        $("#__chk_gen_use_additional_button").prop("checked", Preference.GENERAL_PREFERENCE.enable_last_edit_button)
        $("#__chk_gen_hide_additional_account").prop("checked", Preference.GENERAL_PREFERENCE.hide_additional_account)
        $("#__chk_gen_use_action_palette").prop("checked", Preference.GENERAL_PREFERENCE.enable_action_palette)
        $("#__chk_gen_use_notified_impression").prop("checked", Preference.GENERAL_PREFERENCE.enable_notified_impression)
        $("#__chk_gen_show_media_confirm").prop("checked", Preference.GENERAL_PREFERENCE.enable_media_confirm)
        $("#__chk_gen_animation").prop("checked", Preference.GENERAL_PREFERENCE.enable_animation)
        $("#__chk_gen_show_tips").prop("checked", Preference.GENERAL_PREFERENCE.enable_tips)

        // 自動展開
        $("#__chk_gen_expand_cw_search").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.search_cw)
        $("#__chk_gen_expand_media_search").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.search_media)
        $("#__chk_gen_expand_cw_trend").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.trend_cw)
        $("#__chk_gen_expand_media_trend").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.trend_media)
        $("#__chk_gen_expand_cw_history").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.history_cw)
        $("#__chk_gen_expand_media_history").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.history_media)
        $("#__chk_gen_expand_cw_clip").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.clip_cw)
        $("#__chk_gen_expand_media_clip").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.clip_media)
        $("#__chk_gen_expand_cw_detail").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.detail_cw)
        $("#__chk_gen_expand_media_detail").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.detail_media)
        $("#__chk_gen_expand_cw_profile").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.profile_cw)
        $("#__chk_gen_expand_media_profile").prop("checked", Preference.GENERAL_PREFERENCE.auto_expand?.profile_media)

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
                "clip"                      : $("#__chk_gen_navi_clip").prop("checked"),
                "emoji_cache"               : $("#__chk_gen_navi_emoji").prop("checked"),
                "help_keyborad"             : $("#__chk_gen_navi_help_keyborad").prop("checked"),
                "help"                      : $("#__chk_gen_navi_help").prop("checked")
            },
            "enable_tool_button"            : $("#__chk_gen_use_tool_button").prop("checked"),
            "enable_post_button"            : $("#__chk_gen_use_post_button").prop("checked"),
            "enable_last_edit_button"       : $("#__chk_gen_use_additional_button").prop("checked"),
            "hide_additional_account"       : $("#__chk_gen_hide_additional_account").prop("checked"),
            "enable_action_palette"         : $("#__chk_gen_use_action_palette").prop("checked"),
            "enable_notified_impression"    : $("#__chk_gen_use_notified_impression").prop("checked"),
            "enable_media_confirm"          : $("#__chk_gen_show_media_confirm").prop("checked"),
            "enable_animation"              : $("#__chk_gen_animation").prop("checked"),
            "enable_tips"                   : $("#__chk_gen_show_tips").prop("checked"),
            "auto_expand": {                // 自動展開
                "search_cw"                 : $("#__chk_gen_expand_cw_search").prop("checked"),
                "search_media"              : $("#__chk_gen_expand_media_search").prop("checked"),
                "trend_cw"                  : $("#__chk_gen_expand_cw_trend").prop("checked"),
                "trend_media"               : $("#__chk_gen_expand_media_trend").prop("checked"),
                "history_cw"                : $("#__chk_gen_expand_cw_history").prop("checked"),
                "history_media"             : $("#__chk_gen_expand_media_history").prop("checked"),
                "clip_cw"                   : $("#__chk_gen_expand_cw_clip").prop("checked"),
                "clip_media"                : $("#__chk_gen_expand_media_clip").prop("checked"),
                "detail_cw"                 : $("#__chk_gen_expand_cw_detail").prop("checked"),
                "detail_media"              : $("#__chk_gen_expand_media_detail").prop("checked"),
                "profile_cw"                : $("#__chk_gen_expand_cw_profile").prop("checked"),
                "profile_media"             : $("#__chk_gen_expand_media_profile").prop("checked")
            },
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
                "type"                      : $(`input.__opt_gen_background:checked`).val(),
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
            accept: () => $("#pop_extend_column").hide()
        })
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
        // クリップタイムライン
        Clip.CLIP_PREF_TIMELINE.pref = {
            "expand_cw": Preference.GENERAL_PREFERENCE.auto_expand?.clip_cw,
            "expand_media": Preference.GENERAL_PREFERENCE.auto_expand?.clip_media
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
        // CSSをバインド
        $('style').html(`
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


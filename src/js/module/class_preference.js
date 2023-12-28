/**
 * #Class
 * タイムラインの設定値を管理するクラス(カラムに内包)
 *
 * @author tizerm@mofu.kemo.no
 */
class Preference {
    constructor() {}

    // スタティックマップを初期化(非同期)
    static {
        (async () => { // ウィンドウ設定の読み込み処理
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
        })()
    }

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

    static storeTempWindowPosition(ui) {
        Preference.TEMPORARY_WINDOW_POSITION = {
            "top": Math.round(ui.offset.top),
            "left": Math.round(ui.offset.left)
        }
    }

    static storeTempWindowSize(ui) {
        Preference.TEMPORARY_WINDOW_SIZE = {
            "width": Math.round(ui.size.width),
            "height": Math.round(ui.size.height)
        }
    }

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


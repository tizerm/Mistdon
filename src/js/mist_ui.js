const color_palette = [
    // デフォルトで選択できるカラーパレット(15色)
    'b53a2a', 'bf7a41', '56873b', '428a6f', '42809e', '3b5da1', '564391', '933ba1', 'b53667', '666666',
    '997460', '87995f', '738c83', '676a82', '996a88', '694444', '693147', '3b3e63', '3b634b', '4a4a4a'
]

$(() => {
    // ナビゲーションメニューホバー時にツールチップ表示
    $("#navi").tooltip(Preference.getUIPref("RIGHT", "UI_DROP_ANIMATION"))

    // 外部表示リンククリックイベント
    $(document).on("click", ".__lnk_external", e => {
        const url = $(e.target).closest("a").attr("href");
        window.accessApi.openExternalBrowser(url);
        // リンク先に飛ばないようにする
        return false;
    });
});

/**
 * #Event #jQuery
 * 遅延ホバーによるイベントをバインド
 * 
 * @param arg パラメータオブジェクト
 */
function delayHoverEvent(arg) {
    var timer = null;
    $(document).on("mouseenter", arg.selector, e => {
        $(e.target).css('cursor', 'progress');
        timer = setTimeout(evt => { // タイマーセット
            timer = null;
            $(evt.target).css('cursor', 'default');
            arg.enterFunc(evt);
        }, arg.delay, e);
    });
    $(document).on("mouseleave", arg.selector, e => {
        if (timer) { // タイマーが未実行の場合はタイマーを削除
            $(e.target).css('cursor', 'default');
            clearTimeout(timer);
            timer = null;
        } else arg.leaveFunc(e);
    });
}

/**
 * #Event #jQuery
 * クリック長押し(ホールド)によるイベントをバインド
 * 
 * @param arg パラメータオブジェクト
 */
function delayHoldEvent(arg) {
    var timer = null;
    $(document).on("mousedown", arg.selector, e => {
        $(e.target).css('cursor', 'progress');
        timer = setTimeout(evt => { // タイマーセット
            timer = null;
            $(evt.target).css('cursor', 'default');
            arg.holdFunc(evt);
        }, arg.delay, e);

    });
    // タイマー実行前にマウスを外す、もしくはクリックをあげた場合は実行しない
    $(document).on("mouseleave", arg.selector, e => {
        if (timer) {
            $(e.target).css('cursor', 'default');
            clearTimeout(timer);
            timer = null;
        }
    });
    $(document).on("mouseup", arg.selector, e => {
        if (timer) {
            $(e.target).css('cursor', 'default');
            clearTimeout(timer);
            timer = null;
        }
    });
}

/**
 * #Renderer #jQuery
 * カラーフォームにカラーパレット表示機能を追加
 * (動的に生成する関係で後付しないと動かないので関数化)
 */
function setColorPalette(target) {
    if (target) { // 付与先のターゲットが指定されている場合は指定先にあるカラーパレットにだけセット
        target.find(".__pull_color_palette")
            .after('<a class="__on_call_palette" title="ドラッグ&ドロップで色を選択できます">&nbsp;</a>');
        target.find(".__pull_color_palette+.__on_call_palette").tooltip({
            position: {
                my: "left+6 bottom+18",
                at: "right center"
            },
            show: {
                effect: "slide",
                duration: 80
            },
            hide: {
                effect: "slide",
                duration: 80
            }
        });
        return;
    }
    const palette_dom = $("#pop_palette");
    color_palette.forEach(color => {
        palette_dom.append(`<a id="${color}" class="__on_select_color">&nbsp;</a>`);
        palette_dom.find('.__on_select_color:last-child').css("background-color", `#${color}`);
    });
    // カラーパレットの直後にパレット呼び出しボタンをセット
    $(".__pull_color_palette").each((index, elm) => {
        $(elm).after('<a class="__on_call_palette" title="ドラッグ&ドロップで色を選択できます">&nbsp;</a>');
        $(elm).next().css("background-color", `#${$(elm).val()}`);
    });
    $(".__on_call_palette").tooltip({
        position: {
            my: "left+6 bottom+18",
            at: "right center"
        },
        show: {
            effect: "slide",
            duration: 80
        },
        hide: {
            effect: "slide",
            duration: 80
        }
    });

    $(document).on("mousedown", ".__on_call_palette", e => {
        // イベントターゲットにするためのクラスを付与
        $(e.target).addClass("__target_color_button").prev().addClass("__target_color_box");

        palette_dom.css('top', (e.pageY + 12) + 'px').css('left', (e.pageX - 132) + 'px')
            .show("slide", { direction: "up" }, 50);
        return false;
    });
    $("body *").on("mouseup", e => {
        const target = $(e.target);
        if (target.is(".__on_select_color")) {
            const color = target.attr("id");
            $(".__target_color_box").val(color).blur();
            $(".__target_color_button").css("background-color", `#${color}`);
        }
        $("body *").removeClass("__target_color_button __target_color_box");
        palette_dom.hide("slide", { direction: "up" }, 50);
    });
    $(document).on("blur", ".__pull_color_palette", e => {
        const target = $(e.target);
        target.next().css("background-color", `#${target.val()}`);
    });
}

/**
 * #Renderer #jQuery
 * コンテキストメニューを表示
 * 
 * @param e マウスイベントオブジェクト
 * @param id 表示するコンテキストメニューのID
 */
function popContextMenu(e, id) {
    if (window.innerHeight / 2 < e.pageY) // ウィンドウの下の方にある場合は下から展開
        $(`#${id}`).css({
            'top': 'auto',
            'bottom': `${Math.round(window.innerHeight - e.pageY - 8)}px`,
            'left': `${e.pageX - 8}px`
        });
    else $(`#${id}`).css({
        'bottom': 'auto',
        'top': `${e.pageY - 8}px`,
        'left': `${e.pageX - 8}px`
    });
    $(`#${id}`).show(...Preference.getAnimation("WINDOW_FOLD"))
}

/**
 * #Renderer #jQuery
 * ダイアログを表示
 * 
 * @param arg 設定オブジェクト
 */
function dialog(arg) {
    const dialog_elm = $("#pop_dialog");
    dialog_elm.attr('title', arg.title).html(`<p>${arg.text}</p>`);
    const animation_pref = Preference.getUIPref(null, "UI_DIALOG_ANIMATION")
    if (arg.type == 'alert') dialog_elm.dialog({ // アラート
        resizable: false,
        draggable: false,
        width: 400,
        modal: true,
        show: animation_pref?.show,
        hide: animation_pref?.hide,
        close: (event, ui) => { // ダイアログを閉じた後になにか処理がある場合はコールバック実行
            dialog_elm.dialog("destroy");
            if (arg.accept) arg.accept();
        },
        buttons: { "OK": () => dialog_elm.dialog("close") }
    }); else if (arg.type == 'confirm') dialog_elm.dialog({ // 確認ダイアログ
        resizable: false,
        draggable: false,
        width: 400,
        modal: true,
        show: animation_pref?.show,
        hide: animation_pref?.hide,
        close: (event, ui) => dialog_elm.dialog("destroy"),
        buttons: {
            "OK": () => { // ダイアログを閉じてコールバック関数を実行
                dialog_elm.dialog("close");
                arg.accept();
            },
            "キャンセル": () => dialog_elm.dialog("close"),
        }
    });
}

/**
 * #Renderer #jQuery
 * 複数展開可能なウィンドウを生成.
 * 
 * @param arg 設定オブジェクト
 */
function createWindow(arg) {
    // すでに開いているウィンドウの数を算出
    const window_num = $("#pop_multi_window>.ex_window").length

    // 初期HTMLをバインド
    $("#pop_multi_window").append(arg.html)
    $(`#${arg.window_key}>h2`).css('background-color', `#${arg.color}`)

    // Draggableにする(横方向にしか移動不可にするならパラメータ指定)
    $(`#${arg.window_key}`).draggable({
        handle: "h2",
        axis: arg.drag_axis
    })

    // リサイズ可能にする場合はResizableにする
    if (arg.resizable) $(`#${arg.window_key}`).resizable({ handles: arg.resize_axis })

    // ヘッダボタンにツールチップを設定
    $(`#${arg.window_key}>.window_buttons`).tooltip(Preference.getUIPref("DROP", "UI_FADE_ANIMATION"))

    // 開いているウィンドウの数だけ初期配置をズラす
    $(`#${arg.window_key}`).css('right', `${window_num * 48}px`).mousedown()
    $(`#${arg.window_key}`).show(...Preference.getAnimation("WINDOW_FOLD"))
}

/**
 * #Renderer
 * ランダムでカラーパレットの色を取得する.
 */
function getRandomColor() {
    const index = Math.floor(Math.random() * color_palette.length)
    return color_palette[index]
}

/**
 * #Util
 * 要素を表示したら続きを読み込むスクロールローダーを生成する
 * 
 * @param arg パラメータオブジェクト
 */
function createScrollLoader(arg) {
    // 最初に取得したデータをもとにデータのバインド処理を行う(返り値はページング用max_id)
    const max_id = arg.bind(arg.data, arg.target)
    if (!max_id) return // max_idが空の場合はデータ終端として終了

    // Loader Elementを生成
    arg.target.append(`<li id="${max_id}" class="__scroll_loader">&nbsp;</li>`)

    // Intersection Observerを生成
    const observer = new IntersectionObserver((entries, obs) => (async () => {
        const e = entries[0]
        if (!e.isIntersecting) return // 見えていないときは実行しない
        console.log('ローダー表示: ' + max_id)
        // Loaderを一旦解除してロード画面に変更
        obs.disconnect()
        $(e.target).css('background-image', 'url("resources/illust/ani_wait.png")')

        // Loaderのmax_idを使ってデータ取得処理を実行
        arg.data = await arg.load(max_id)
        // Loaderを削除して再帰的にLoader生成関数を実行
        $(e.target).remove()
        createScrollLoader(arg)
    })(), {
        root: arg.target.get(0),
        rootMargin: "0px",
        threshold: 1.0,
    })
    observer.observe(arg.target.find(".__scroll_loader").get(0))
}

function createTopLoader(arg) {
    // 最初に取得したデータをもとにデータのバインド処理を行う(返り値はページング用since_id)
    const since_id = arg.bind(arg.data, arg.target)
    if (!since_id) return // since_idが空の場合はデータ終端として終了

    // Loader Elementを生成してクリックイベントを生成(一回だけ実行)
    arg.target.prepend(`<li id="${since_id}" class="__on_top_loader">続きをロード</li>`)
    arg.target.find(".__on_top_loader").get(0).addEventListener('click', e => (async () => {
        console.log('トップリロード: ' + since_id)
        // ボタンをロード画面に変更
        $(e.target).empty().addClass('loader_loading')

        // Loaderのsince_idを使ってデータ取得処理を実行
        arg.data = await arg.load(since_id)
        // Loaderを削除して再帰的にLoader生成関数を実行
        $(e.target).remove()
        createTopLoader(arg)
    })(), { once: true })
}


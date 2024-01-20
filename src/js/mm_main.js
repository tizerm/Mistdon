// HTMLロード時に非同期で実行
$(() => (async () => {
    // 設定ファイル不在での起動制御
    await window.accessApi.readPrefAccs();
    await window.accessApi.readPrefCols();
    await window.accessApi.readWindowPref();
    await window.accessApi.readCustomEmojis();

    if (Account.isEmpty()) { // アカウントが未登録(これだけではストップしない)
        $("#header>#head_postarea .__lnk_postuser>img").attr('src', 'resources/illust/ic_unauth.jpg')
        $("#header>h1").text('認証されているアカウントがありません。 - Mistdon')
    } else { // 投稿ユーザーリストを作って先頭のアカウントをセット
        $("#pop_postuser>ul").html(Account.createPostAccountList());
        $("#post_options .additional_users ul").html(Account.createAdditionalPostAccountList());
        Account.get(0).setPostAccount();
    }
    if (Column.isEmpty()) { // カラムが未登録(この場合はストップする)
        $("#columns").prepend(`
            <div class="__initial_message">
                アカウントの認証 <img src="resources/ic_auth.png" class="ic_inline"/>
                とカラムの設定 <img src="resources/ic_pref.png" class="ic_inline"/>
                からはじめよう！<br/>
                わからないときは左下の？をクリックするかF1キーでヘルプを表示できます。
            </div>
        `);
        return;
    }

    // カスタム絵文字のキャッシュ確認
    Account.cacheEmojis();
    // 右クリック時のメニュー生成
    $("#pop>.pop_context>.ui_menu>li ul").each((index, elm) => {
        // プラットフォーム指定がある場合は対象プラットフォームのアカウントだけ抽出
        if ($(elm).attr("name")) $(elm).html(Account.createContextMenuAccountList($(elm).attr("name")));
        // それ以外は全アカウントをリストに表示
        else $(elm).html(Account.createContextMenuAccountList());
    });
    $("#pop>.pop_context>.ui_menu").menu();
    // 一時タイムラインウィンドウをドラッグ/リサイズ可能にする
    $("#pop_window_timeline").draggable({
        handle: "h2",
        stop: (ext, ui) => Preference.storeTempWindowPosition(ui)
    });
    $("#pop_window_timeline").resizable({
        stop: (ext, ui) => Preference.storeTempWindowSize(ui)
    });
    // 一時タイムラインウィンドウの保存をするイベントを登録
    Preference.setTempWindow();
    window.addEventListener("beforeunload", e => Preference.saveTempWindowPref($("#pop_window_timeline")));
    // 公開範囲ホバー時にツールチップ表示
    $("#header>#head_postarea").tooltip({
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
    });
    $("#pop_expand_action, #post_options").tooltip({
        position: {
            my: "center bottom-8",
            at: "center top"
        }
        ,
        show: {
            effect: "fade",
            duration: 80
        },
        hide: {
            effect: "fade",
            duration: 80
        }
    });

    // カラム生成
    Column.each(col => {
        col.create();
        // タイムライン取得処理をプロミス配列に格納してWebSocketの設定をセット
        col.eachGroup(gp => {
            const rest_promises = [];
            gp.eachTimeline(tl => {
                rest_promises.push(tl.getTimeline());
                tl.setSocketParam();
            });
            // タイムラインをDOMにバインド
            gp.onLoadTimeline(rest_promises);
        });
    });
    // 対象アカウントをWebSocketに接続
    Account.each(account => account.connect({
        openFunc: () => {},
        closeFunc: () => toast(`${account.full_address}との接続が切断されました。`, "error"),
        reconnect: true
    }));
    Column.tooltip(); // カラムにツールチップを設定
    // 見えている中で最初のカラムにカーソルをセット
    Column.getOpenedFirst().setCursor();
})());

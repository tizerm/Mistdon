$(() => {
    // ショートカットキーバインド(全体)
    $("body").keydown(e => {
        // ショートカットキーのバインドを無視するフォーム内では実行しない
        if ($(e.target).is(".__ignore_keyborad")) return;
        if ($("#modal_expand_image").is(":visible")) { // 画像拡大モーダルが動いている場合
            switch (e.keyCode) {
                case 65:
                case 37: // a, <-
                case 87:
                case 38: // w, ↑: 前の画像
                    $("#modal_expand_image>#expand_thumbnail_list>li.selected_image").prev().mouseenter();
                    return false;
                case 68:
                case 39: // d, ->
                case 83:
                case 40: // s, ↓: 次の画像
                    $("#modal_expand_image>#expand_thumbnail_list>li.selected_image").next().mouseenter();
                    return false;
                case 13: // Enter: 閉じる
                    $("#modal_expand_image").click();
                    return false;
                default:
                    return;
            }
        }
        let col = null;
        switch (e.keyCode) {
            case 78: // n: 投稿テキストボックスにフォーカス
                $("#__txt_postarea").focus();
                return false;
            case 66: // b: CWテキストボックスにフォーカス
                $("#__txt_content_warning").focus();
                return false;
            case 46: // Ctrl+Del: 直前の投稿を削除する
                if (event.ctrlKey || event.metaKey) {
                    $("#header #on_last_delete").click();
                    return false;
                }
                break;
            case 90: // Ctrl+Z: 直前の投稿を削除して再展開する
                if (event.ctrlKey || event.metaKey) {
                    $("#header #on_last_delete_paste").click();
                    $("#__txt_postarea").focus();
                    return false;
                }
                break;
            case 86: // Ctrl+V: 直前の投稿をコピーして再展開する
                if (event.ctrlKey || event.metaKey) {
                    $("#header #on_last_copy").click();
                    $("#__txt_postarea").focus();
                    return false;
                }
                break;
            case 73: // Ctrl+I: 直前の投稿につなげる
                if (event.ctrlKey || event.metaKey) {
                    $("#header #on_last_replychain").click();
                    return false;
                }
                break;
            case 115: // F4: 右に表示される拡張カラムを閉じる
                $("#pop_extend_column:visible").hide("slide", { direction: "right" }, 150);
                $("#pop_ex_timeline:visible").hide("slide", { direction: "up" }, 150);
                $("#pop_custom_emoji:visible").hide("slide", { direction: "left" }, 150);
                break;
            case 65:
            case 37: // a, <-: カーソルを左に移動
                col = Column.disposeCursor();
                if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
                    // Ctrl+Shift+A: カーソル移動先のカラムを開く
                    col.prev.open();
                } else if (event.shiftKey) {
                    // Shift+A: カーソル移動先のカラムを開いて現在のカラムを閉じる
                    col.prev.open();
                    col.close();
                    col.prev.setCursor();
                    return false;
                }
                col.opened_prev.setCursor();
                return false;
            case 68:
            case 39: // d, ->: カーソルを右に移動
                col = Column.disposeCursor();
                if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
                    // Ctrl+Shift+D: カーソル移動先のカラムを開く
                    col.next.open();
                } else if (event.shiftKey) {
                    // Shift+D: カーソル移動先のカラムを開いて現在のカラムを閉じる
                    col.next.open();
                    col.close();
                    col.next.setCursor();
                    return false;
                }
                col.opened_next.setCursor();
                return false;
            case 87:
            case 38: // w, ↑: カーソルのカラムを上にスクロール
                col = Group.getCursor();
                // Ctrl+W: 先頭まで移動
                if (event.ctrlKey || event.metaKey) col.scroll(0);
                // Shift+W: 通常より多めにスクロールする
                else if (event.shiftKey) col.scroll(-Preference.GENERAL_PREFERENCE.scroll_speed.shift);
                else col.scroll(-Preference.GENERAL_PREFERENCE.scroll_speed.default);
                return false;
            case 83:
            case 40: // s, ↓: カーソルのカラムを下にスクロール
                col = Group.getCursor();
                // Shift+S: 通常より多めにスクロールする
                if (event.shiftKey) col.scroll(Preference.GENERAL_PREFERENCE.scroll_speed.shift);
                else col.scroll(Preference.GENERAL_PREFERENCE.scroll_speed.default);
                return false;
            case 70: // f: カーソルカラムの可変幅表示をトグルする
                if (event.ctrlKey || event.metaKey) { // Ctrl+F: 検索
                    $("#navi .navi_search").click();
                    return false;
                }
                Column.getCursor().toggleFlex();
                return false;
            case 72: // Ctrl+h: 送信履歴
                if (event.ctrlKey || event.metaKey) {
                    $("#navi .navi_history").click();
                    return false;
                }
                break;
            case 116: // F5: カーソルのカラムをリロードする
                if (event.ctrlKey || event.metaKey) {
                    // Ctrl+F5: 画面そのものを読み込みなおす(ブラウザリロード)
                    location.reload();
                    return false;
                }
                Group.getCursor().reload();
                return false;
            case 13: // Enter: カーソルを下に移動
                gp = Group.disposeCursor();
                if (event.shiftKey) {
                    // Shift+Enter: カーソルを上に移動
                    gp.prev.setCursor();
                    return false;
                }
                gp.next.setCursor();
                return false;
            default:
                // 1～9(+テンキー): カラムの表示をトグル
                const key_num = 49 <= e.keyCode && e.keyCode <= 57;
                const ten_num = 97 <= e.keyCode && e.keyCode <= 105;
                if (key_num || ten_num) {
                    let number = null;
                    // キーボードの数字キー
                    if (key_num) number = e.keyCode - 48;
                    // テンキー
                    else if (ten_num) number = e.keyCode - 96;

                    Column.disposeCursor();
                    col = Column.get(number - 1);
                    if (col.toggle()) col.setCursor(); // 開いた
                    else Column.getOpenedFirst().setCursor(); // 閉じた
                }
                break;
        }
    });

    /*================================================================================================================*/

    // ショートカットキーバインド(投稿フォーム内)
    $("#header>#head_postarea").keydown(e => {
        if (event.shiftKey && e.keyCode === 13) {
            // Shift+Enterで投稿処理実行
            $("#header #__on_submit").click();
            return false;
        } else if ((event.ctrlKey || event.metaKey) && e.keyCode === 13) {
            // Ctrl+Enterの場合、投稿後に自動でフォーカスを外す
            $("#header #__on_submit").click();
            $(e.target).blur();
            return false;
        } else if (e.keyCode === 27) {
            // Escでフォーカスアウト
            $(e.target).blur();
            $("#header>h1").click(); // どっか適当なところをクリック
            return false;
        }
        // Alt+↑↓でアカウントを切り替え
        if (event.altKey) {
            if (e.keyCode === 38) { // ↑
                Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).prev.setPostAccount();
                return false;
            } else if (e.keyCode === 40) { // ↓
                Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).next.setPostAccount();
                return false;
            } else if (e.keyCode === 37) { // ←
                $("#header>#head_postarea .visibility_icon .selected").closest(".__lnk_visibility").prev().click();
                return false;
            } else if (e.keyCode === 39) { // →
                $("#header>#head_postarea .visibility_icon .selected").closest(".__lnk_visibility").next().click();
                return false;
            }
        }
    });
    // ショートカットキーバインド(リプライフォーム内)
    $(document).on("keydown", "#__txt_replyarea", e => {
        // Ctrl+EnterかShift+Enterで投稿処理実行
        if ((event.ctrlKey || event.metaKey || event.shiftKey) && e.keyCode === 13) {
            $("#__on_reply_submit").click();
            return false;
        }
    });
    // ショートカットキーバインド(引用フォーム内)
    $(document).on("keydown", "#__txt_quotearea", e => {
        // Ctrl+EnterかShift+Enterで投稿処理実行
        if ((event.ctrlKey || event.metaKey || event.shiftKey) && e.keyCode === 13) {
            $("#__on_quote_submit").click();
            return false;
        }
    });
    // ショートカットキーバインド(検索フォーム内)
    $(document).on("keydown", "#__txt_search_query", e => {
        // Enterで検索処理実行
        if (e.keyCode === 13) {
            $("#__on_search").click();
            return false;
        }
    });
});


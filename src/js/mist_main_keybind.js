$(() => {
    /*=== Master Shortcut Key Events =============================================================================*/

    $("body").keydown(e => {
        // ショートカットキーのバインドを無視するフォーム内では実行しない
        if ($(e.target).is(".__ignore_keyborad")) return

        /*=== Image Modal Shortcut Key Event =====================================================================*/

        if ($("#modal_expand_image").is(":visible")) {
            switch (e.keyCode) {
                case 65:
                case 37: // a, <-
                case 87:
                case 38: // w, ↑: 前の画像
                    $("#modal_expand_image>#expand_thumbnail_list>li.selected_image").prev().mouseenter()
                    return false
                case 68:
                case 39: // d, ->
                case 83:
                case 40: // s, ↓: 次の画像
                    $("#modal_expand_image>#expand_thumbnail_list>li.selected_image").next().mouseenter()
                    return false
                case 13: // Enter: 閉じる
                    $("#modal_expand_image").click()
                    return false
                default:
                    return
            }
        }

        /*=== Flash Window Shortcut Key Event ====================================================================*/

        if ($(".flash_window").is(":visible")) {
            const current_status = FlashTimeline.CURRENT_WINDOW.current
            switch (e.keyCode) {
                case 65:
                case 37: // a, <-: 前に戻る
                    FlashTimeline.CURRENT_WINDOW.prev().bind()
                    return false
                case 68:
                case 39: // d, ->
                case 13: // Enter: 次に送る
                    FlashTimeline.CURRENT_WINDOW.next().bind()
                    return false
                case 87:
                case 38: // w, ↑: 次に10送る
                    FlashTimeline.CURRENT_WINDOW.step(10).bind()
                    return false
                case 83:
                case 40: // s, ↓: 前に10戻る
                    FlashTimeline.CURRENT_WINDOW.step(-10).bind()
                    return false
                case 77: // m: リプライ
                    current_status.from_account.reaction('__menu_reply', null, current_status)
                    return false
                case 73: // i: 引用
                    current_status.from_account.reaction('__menu_quote', null, current_status)
                    return false
                case 82: // r: ブースト/リノート
                    current_status.from_account.reaction('__menu_reblog', null, current_status)
                    return false
                case 70: // f: お気に入り
                    current_status.from_account.reaction('__menu_favorite', null, current_status)
                    return false
                case 66: // b: ブックマーク
                    current_status.from_account.reaction('__menu_bookmark', null, current_status)
                    return false
                case 69: // e: リアクション
                    current_status.from_account.reaction('__menu_reaction', null, current_status)
                    return false
                case 80: // p: メディアを開く
                    $(`#${FlashTimeline.CURRENT_WINDOW.flash_key} .__on_media_expand:first-child`).click()
                    return false
                case 79: // o: CWを開閉する
                    $(`#${FlashTimeline.CURRENT_WINDOW.flash_key} .expand_header`).click()
                    return false
                case 85: // u: ブラウザで開く
                    window.accessApi.openExternalBrowser(current_status.uri)
                    return false
                case 46: // Del
                case 81: // q: 今すぐ閉じる
                    $("#pop_multi_window>.flash_window>.window_buttons>.window_close_button").click()
                    return false
                default:
                    break
            }
        }

        /*=== Main Window Shortcut Key Event =====================================================================*/

        let col = null
        const is_control = event.ctrlKey || event.metaKey
        switch (e.keyCode) {
            case 78: // n: 投稿テキストボックスにフォーカス
                $("#__txt_postarea").focus()
                return false
            case 66: // b: CWテキストボックスにフォーカス
                if (is_control) {
                    // Ctrl+B: マルチウィンドウをすべて透過
                    // ひとつでも透過済みのウィンドウがある場合はすべての透過を解除する
                    if ($("#pop_multi_window>.ex_window>.window_buttons>input.__window_opacity:checked").length > 0)
                        $("#pop_multi_window>.ex_window>.window_buttons>input.__window_opacity").prop("checked", false)
                    else $("#pop_multi_window>.ex_window>.window_buttons>input.__window_opacity").prop("checked", true)
                    return false
                }
                $("#__txt_content_warning").focus()
                return false
            case 46: // Ctrl+Del: 直前の投稿を削除する
                if (is_control) {
                    $("#__on_last_delete").click()
                    return false
                }
                break
            case 90: // Ctrl+Z: 直前の投稿を削除して再展開する
                if (is_control) {
                    $("#__on_last_delete_paste").click()
                    $("#__txt_postarea").focus()
                    return false
                }
                break
            case 86: // Ctrl+V: 直前の投稿をコピーして再展開する
                if (is_control) {
                    $("#__on_on_last_copy").click()
                    $("#__txt_postarea").focus()
                    return false
                }
                break
            case 84: // t: カーソルグループでフラッシュウィンドウを開く
                if (is_control) { // Ctrl+T: 直前の投稿につなげる
                    $("#__on_last_replychain").click()
                    return false
                }
                Group.getCursor().createFlash()
                return false
            case 69: // Ctrl+E: 直前の投稿を編集する
                if (is_control) {
                    $("#__on_last_edit").click()
                    return false
                }
                break
            case 82: // Ctrl+R: 下書き一覧を開く
                if (is_control) {
                    $("#__open_draft").click()
                    return false
                }
                break
            case 74: // Ctrl+J: カスタム絵文字パレットを開く
                if (is_control) {
                    if (event.altKey) { // Ctrl+Alt+J: カスタムキャッシュを更新
                        $("#navi .navi_reset_emoji").click()
                        return false
                    }
                    $("#__open_emoji_palette").click()
                    return false
                }
                break
            case 115: // F4: 右に表示される拡張カラムを閉じる
                if (is_control) {
                    // Ctrl+F4: マルチウィンドウをすべて閉じる
                    $("#pop_multi_window>.ex_window>.window_buttons>.window_close_button").click()
                    return false
                }
                $("#pop_extend_column:visible").hide(...Preference.getAnimation("EXTEND_DROP"))
                $("#pop_ex_timeline:visible").hide(...Preference.getAnimation("EXTEND_DROP"))
                $("#pop_custom_emoji:visible").hide(...Preference.getAnimation("EXTEND_DROP"))
                return false
            case 65:
            case 37: // a, <-: カーソルを左に移動
                col = Column.disposeCursor()
                if ((is_control) && event.shiftKey) {
                    // Ctrl+Shift+A: カーソル移動先のカラムを開く
                    col.prev.open()
                } else if (event.shiftKey) {
                    // Shift+A: カーソル移動先のカラムを開いて現在のカラムを閉じる
                    col.prev.open()
                    col.close()
                    col.prev.setCursor()
                    return false
                }
                col.opened_prev.setCursor()
                return false
            case 68:
            case 39: // d, ->: カーソルを右に移動
                col = Column.disposeCursor()
                if ((is_control) && event.shiftKey) {
                    // Ctrl+Shift+D: カーソル移動先のカラムを開く
                    col.next.open()
                } else if (event.shiftKey) {
                    // Shift+D: カーソル移動先のカラムを開いて現在のカラムを閉じる
                    col.next.open()
                    col.close()
                    col.next.setCursor()
                    return false
                }
                col.opened_next.setCursor()
                return false
            case 87:
            case 38: // w, ↑: カーソルのカラムを上にスクロール
                col = Group.getCursor()
                // Ctrl+W: 先頭まで移動
                if (is_control) col.scroll(0)
                // Shift+W: 通常より多めにスクロールする
                else if (event.shiftKey) col.scroll(-Preference.GENERAL_PREFERENCE.scroll_speed.shift)
                else col.scroll(-Preference.GENERAL_PREFERENCE.scroll_speed.default)
                return false
            case 83:
            case 40: // s, ↓: カーソルのカラムを下にスクロール
                col = Group.getCursor()
                // Shift+S: 通常より多めにスクロールする
                if (event.shiftKey) col.scroll(Preference.GENERAL_PREFERENCE.scroll_speed.shift)
                else col.scroll(Preference.GENERAL_PREFERENCE.scroll_speed.default)
                return false
            case 70: // f: カーソルカラムの可変幅表示をトグルする
                if (is_control) { // Ctrl+F: 検索
                    $("#navi .navi_search").click()
                    return false
                }
                Column.getCursor().toggleFlex()
                return false
            case 80: // Ctrl+P: トレンド
                if (is_control) {
                    $("#navi .navi_trend").click()
                    return false
                }
                break
            case 72: // Ctrl+H: 送信履歴
                if (is_control) {
                    $("#navi .navi_history").click()
                    return false
                }
                break
            case 77: // Ctrl+M: すべてのアカウントプロフィールを表示
                if (is_control) {
                    $("#navi .navi_show_profile").click()
                    return false
                }
                break
            case 89: // Ctrl+Y: ブックマーク/お気に入り
                if (is_control) {
                    $("#navi .navi_show_bookmark").click()
                    return false
                }
                break
            case 116: // F5: カーソルのカラムをリロードする
                if (is_control || event.shiftKey) {
                    // Ctrl(or Shift)+F5: 画面そのものを読み込みなおす(ブラウザリロード)
                    location.reload()
                    return false
                }
                Group.getCursor().reload()
                return false
            case 13:
            case 9: // Enter, Tab: カーソルを下に移動
                gp = Group.disposeCursor()
                if (event.shiftKey) {
                    // Shift+Enter: カーソルを上に移動
                    gp.prev.setCursor()
                    return false
                }
                gp.next.setCursor()
                return false
            default:
                // 1～9(+テンキー): カラムの表示をトグル
                const key_num = 49 <= e.keyCode && e.keyCode <= 57
                const ten_num = 97 <= e.keyCode && e.keyCode <= 105
                if (key_num || ten_num) {
                    let number = null
                    if (key_num) number = e.keyCode - 48 // キーボードの数字キー
                    else if (ten_num) number = e.keyCode - 96 // テンキー

                    Column.disposeCursor()
                    col = Column.get(number - 1)
                    if (col.toggle()) col.setCursor() // 開いた
                    else Column.getOpenedFirst().setCursor() // 閉じた
                }
                break
        }
    })

    /*=== Custom Emoji Palette Suggest Area Events ===============================================================*/

    $(document).on("keydown", ".emoji_suggest_textbox", e => {
        switch (e.keyCode) {
            case 13: // Enter: 第一候補で確定
                $(e.target).closest(".emoji_palette_section").find(".suggest_option>.first_option>a").click()
                return false
            case 32: // Space: 候補順送り
                if (event.shiftKey) Emojis.iterateEmojiPalette($(e.target).closest(".emoji_palette_section"), true)
                else Emojis.iterateEmojiPalette($(e.target).closest(".emoji_palette_section"))
                return false
            case 27: // Esc: フォーカスアウト
                $(e.target).blur()
                $("#header>h1").click() // どっか適当なところをクリック
                return false
            default:
                return
        }
    })

    $(document).on("keydown", ".__emoji_suggest", e => {
        if (e.key == ':') { // 半角コロンを入力したらパレットのモードを変更
            Emojis.toggleEmojiPaletteMode($(e.target))
            return
        }
        // サジェスター停止中は以後なにもしない
        if ($('#singleton_emoji_window').length == 0 || $('#emoji_mode_palette').is(".active")) return

        if (e.key == ' ') { // スペースキー
            // サジェスト候補になにも入れていない場合はパレットモードに戻す
            if ($('#__txt_emoji_search').val().length == 0) {
                Emojis.toggleEmojiPaletteMode($(e.target), true)
                return
            }

            // 候補を送る
            if (event.shiftKey) Emojis.iterateEmojiPalette($('#singleton_emoji_window'), true)
            else Emojis.iterateEmojiPalette($('#singleton_emoji_window'))
            return
        }

        if (e.key == 'Enter') { // Enterキー
            // サジェスト候補になにも入れていない場合はパレットモードに戻す
            if ($('#__txt_emoji_search').val().length == 0) {
                Emojis.toggleEmojiPaletteMode($(e.target), true)
                return
            }

            // 選択中の候補で確定
            $("#singleton_emoji_window .suggest_option>.first_option>a.__on_emoji_append").click()
            return false
        }
    })

    /*=== Article Textarea Shortcut Key Events ===================================================================*/

    $(document).on("keydown", "#__txt_postarea", e => {
        const is_control = event.ctrlKey || event.metaKey
        if (event.altKey) { // Altキー併用ショートカット
            let element = null
            let index = null
            switch (e.keyCode) {
                case 65:
                case 37: // Alt+A, <-: 公開範囲を変更(左)
                    element = $('#header>#post_options .visibility_box')
                    index = element.find('input[name="__opt_visibility"]:checked').index('input[name="__opt_visibility"]')
                    element.find('input[name="__opt_visibility"]').eq(index - 1).click()
                    return false
                case 68:
                case 39: // Alt+D, ->: 公開範囲を変更(右)
                    element = $('#header>#post_options .visibility_box')
                    index = element.find('input[name="__opt_visibility"]:checked').index('input[name="__opt_visibility"]')
                    element.find('input[name="__opt_visibility"]').eq(index < 3 ? index + 1 : 0).click()
                    return false
                case 87:
                case 38: // Alt+W, ↑: 前のアカウント
                    if (is_control) { // Ctrl+Alt+W: 前のチャンネル
                        element = $('#header>#post_options select#__cmb_post_to')
                        index = element.find('option:checked').prev().val()
                        if (index) {
                            element.val(index).change()
                            return false
                        }
                    } else {
                        Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).prev.setPostAccount()
                        return false
                    }
                    return
                case 83:
                case 40: // Alt+S, ↓: 次のアカウント
                    if (is_control) { // Ctrl+Alt+S: 次のチャンネル
                        element = $('#header>#post_options select#__cmb_post_to')
                        index = element.find('option:checked').next().val()
                        if (index) {
                            element.val(index).change()
                            return false
                        }
                    } else {
                        Account.get($("#header>#head_postarea .__lnk_postuser>img").attr("name")).next.setPostAccount()
                        return false
                    }
                    return
                case 72: // Alt+H: 投稿先を通常タイムラインに戻す
                    $('#header>#post_options select#__cmb_post_to').val('__default')
                    return false
                case 71: // Alt+G: ローカルボタンをトグル
                    $('#header>#post_options input#__chk_local_only').click()
                    return false
                case 8: // Ctrl+Alt+Backspace: 入力中の内容をリセット
                    if (is_control) {
                        $('#__on_reset_option').click()
                        return false
                    }
                    break
                default:
                    // Alt+1～9(+テンキー): N番目のアカウントに切り替え
                    const key_num = 49 <= e.keyCode && e.keyCode <= 57
                    const ten_num = 97 <= e.keyCode && e.keyCode <= 105
                    if (key_num || ten_num) {
                        let number = null
                        if (key_num) number = e.keyCode - 48 // キーボードの数字キー
                        else if (ten_num) number = e.keyCode - 96 // テンキー

                        element = $('#header>#post_options input.__chk_add_account+label').eq(number - 1)
                        // Ctrl+Alt+1～9(+テンキー): 追加アカウントをトグル
                        if (is_control) element.click()
                        else element.dblclick()
                        return false
                    }
                    break
            }
        } else {
            switch (e.keyCode) {
                case 13: // Enter
                    if (is_control) { // Ctrl+Enter: 投稿(自動フォーカスアウト)
                        $("#header #__on_submit").click()
                        $(e.target).blur()
                        return false
                    } else if (Preference.GENERAL_PREFERENCE.enable_shift_confirm && event.shiftKey) {
                        // Shift+Enter: 投稿(フォーカスしたまま)(オプションで無効化)
                        $("#header #__on_submit").click()
                        return false
                    }
                    break
                case 83: // Ctrl+S: 下書きに保存
                    if (is_control) {
                        $("#__on_save_draft").click()
                        return false
                    }
                    break
                case 74: // Ctrl+J: カスタム絵文字パレットを開く
                    if (is_control) {
                        $("#__open_emoji_palette").click()
                        return false
                    }
                    break
                case 122: // F11: 投稿フォームをウィンドウ化
                    toggleTextarea()
                    return false
                case 27: // Esc: フォーカスアウト
                    $(e.target).blur()
                    $("#header>h1").click() // どっか適当なところをクリック
                    return false
                default:
                    return
            }
        }
    })
})


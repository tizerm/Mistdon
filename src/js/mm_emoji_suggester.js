$(() => {
    // 絵文字サジェスターが有効な入力フォームでのサジェスター処理
    $(document).on("keyup", ".__emoji_suggest", e => {
        if (e.key == ':') { // 半角コロンを入力したらサジェスターを起動
            Emojis.createEmojiSuggester($(e.target));
            return;
        }
        // サジェスター停止中は以後なにもしない
        if (!$("#pop_emoji_suggester").is(":visible")) return;

        // サジェスターを起動してから入力された内容を抜き出す
        const start = $("#pop_emoji_suggester>.target_cursor").val()
        const end = e.target.selectionStart
        const code = $(e.target).val().substring(start, end);
        if ((!code && e.key == ' ') || start > end) {
            // 未入力でスペースが押されたか、始点コロンが消えた場合サジェスターを停止
            $("#pop_emoji_suggester").hide("fade", 120);
            return;
        }

        if (e.key == ' ' || e.key == 'Enter' || e.key == 'Shift') return;

        // 前方一致する絵文字を出力する
        $("#pop_emoji_suggester>.suggest_emoji_list").empty();
        if (!code) return; // 何も入力しなかったら空
        Account.get($("#pop_emoji_suggester>.target_account").val()).emojis.filter(code,
            emoji => $("#pop_emoji_suggester>.suggest_emoji_list").append(`
                <li>
                    <a class="__on_emoji_suggest_append" name="${emoji.shortcode}">
                        <img src="${emoji.url}" alt="${emoji.name}"/>
                    </a>
                </li>
            `));
        // 候補の最初の絵文字を選択状態にする
        $("#pop_emoji_suggester>.suggest_emoji_list>li:first-child").addClass("__selected_emoji");
    });

    // 一部入力イベントを無効化する処理はkeydownで処理
    $(document).on("keydown", ".__emoji_suggest", e => {
        // サジェスター停止中は以後なにもしない
        if (!$("#pop_emoji_suggester").is(":visible")) return;

        if (e.key == ' ') { // スペースが押されたら候補を送る
            const target = $("#pop_emoji_suggester>.suggest_emoji_list>.__selected_emoji");
            target.removeClass("__selected_emoji");
            if (event.shiftKey) target.prev().addClass("__selected_emoji");
            else target.next().addClass("__selected_emoji");
            return false;
        }

        if (e.key == 'Enter') { // Enterが押されたら選択中の候補で決定
            $("#pop_emoji_suggester>.suggest_emoji_list>.__selected_emoji>a").click();
            $("#pop_emoji_suggester").hide("fade", 120);
            return false;
        }

        // Ctrl+1～9(+テンキー): 候補にある最近使った絵文字を入力
        const key_num = 49 <= e.keyCode && e.keyCode <= 57;
        const ten_num = 97 <= e.keyCode && e.keyCode <= 105;
        if ((event.ctrlKey || event.metaKey) && (key_num || ten_num)) {
            let number = null;
            // キーボードの数字キー
            if (key_num) number = e.keyCode - 48;
            // テンキー
            else if (ten_num) number = e.keyCode - 96;

            // テンキーの番号の絵文字をクリック
            $(`#pop_emoji_suggester>.recent_emoji_list>li:nth-child(${number})>a`).click();
            $("#pop_emoji_suggester").hide("fade", 120);
            return false;
        }

    });

    // サジェスターから絵文字選択した時のイベント
    $(document).on("click", "#pop_emoji_suggester .__on_emoji_suggest_append", e => {
        const target = $(`#${$("#pop_emoji_suggester>.target_elm_id").val()}`);
        const target_account = Account.get($("#pop_emoji_suggester>.target_account").val());

        const cursor_pos = target.get(0).selectionStart;
        const target_text = target.val();
        let target_emoji = $(e.target).closest(".__on_emoji_suggest_append").attr("name");
        // Mastodonの場合前後にスペースを入れる
        if (target_account.platform == 'Mastodon') target_emoji = ` ${target_emoji} `;
        target.val(target_text.substring(0, $("#pop_emoji_suggester>.target_cursor").val() - 1)
            + target_emoji + target_text.substring(cursor_pos, target_text.length));

        // 最近使った絵文字に登録してサジェスターを停止
        target_account.updateEmojiHistory(target_emoji);
        $("#pop_emoji_suggester").hide("fade", 120);
    });
});


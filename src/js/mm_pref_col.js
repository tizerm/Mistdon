$(() => {
	// ロードされた段階で認証情報を見に行く
	var accounts = null;
	const getFunc = async () => {
		// メインプロセスメソッドが非同期なのでawaitかけてアカウント情報を取得
		accounts = await window.accessApi.readPrefAccs();
		var html = "";
		console.log(accounts);
		accounts.forEach((v, k) => {
			html += '<option value="' + k + '">'
				+ v.username + ' - ' + k + '</option>';
		});
		$("#cmb_account").html(html);
	}
	getFunc()
	
	// 追加ボタンイベント(インスタンスを検索)
	$("#on_add_column").on("click", (e) => {
		var acc_address = $("#cmb_account").val();
		var timeline_type = $('input:radio[name="opt_timeline_type"]:checked').val();
		var color = $("#txt_col_color").val();
		var acc_info = accounts.get(acc_address);
		
		// ファイルに追加する処理を書く(整形はメインプロセスで)
		window.accessApi.writePrefCols({
			'key_address': acc_address,
			'timeline_type': timeline_type,
			'account': acc_info,
			'col_color': color
		});
	});
});

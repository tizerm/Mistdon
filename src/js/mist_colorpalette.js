$(() => {
    // Function: 登録されているCSSプロパティ値からパレット初期値を設定する
    const setColorOpt = value => {
        $("#pop_palette .color_preview").css("background-color", value)
        if (value == '') { // 空
            $("#cmb_color_space").val("rgb").change()
            $("#color_text_1, #color_param_1").val(0)
            $("#color_text_2, #color_param_2").val(0)
            $("#color_text_3, #color_param_3").val(0)
        } else if (value.match(/^#[0-9a-f]{6}/g)) { // HEXRGB
            $("#cmb_color_space").val("rgb").change()

            // 10進数のRGB色空間に変換
            const r = parseInt(value.substring(1, 3), 16)
            const g = parseInt(value.substring(3, 5), 16)
            const b = parseInt(value.substring(5, 7), 16)
            $("#color_text_1, #color_param_1").val(r)
            $("#color_text_2, #color_param_2").val(g)
            $("#color_text_3, #color_param_3").val(b)
        } else { // HEX以外の色空間
            const color_space = value.substring(0, value.indexOf('('))
            const parameter = value.substring(value.indexOf('(') + 1, value.lastIndexOf(')')).split(' ')

            $("#cmb_color_space").val(color_space).change()
            parameter.map(p => p.replace(/%/g, ''))
                .forEach((param, index) => $(`#color_text_${index + 1}, #color_param_${index + 1}`).val(param))
        }
    }

    // Function: 色空間からCSSプロパティ値を出力する
    const getColorOpt = () => {
        const p1 = $("#color_param_1").val()
        const p2 = $("#color_param_2").val()
        const p3 = $("#color_param_3").val()
        switch ($("#cmb_color_space").val()) {
            case 'rgb': // RGB
                return `rgb(${p1} ${p2} ${p3})`
            case 'hsl': // HSL
                return `hsl(${p1} ${p2}% ${p3}%)`
            case 'lab': // CIELAB
                return `lab(${p1}% ${p2}% ${p3}%)`
            case 'oklab': // OKLAB
                return `oklab(${p1}% ${p2}% ${p3}%)`
            case 'lch': // CIELCH
                return `lch(${p1}% ${p2}% ${p3})`
            case 'oklch': // OKLCH
                return `oklch(${p1}% ${p2}% ${p3})`
            default:
                break
        }
    }

    // パラーパレット対象フォームフォーカスイベント
    $(document).on("focus", ".__pull_color_palette", e => {
        $(".__target_color_box").removeClass("__target_color_box");
        $(e.target).addClass("__target_color_box")

        // 色情報をカラースライダーに適用
        setColorOpt($(e.target).val())

        const pos = $(e.target).offset()
        let css = {}
        if (window.innerHeight / 2 < pos.top) { // ウィンドウの下の方にある場合は下から展開
            css.top = 'auto'
            css.bottom = Math.round(window.innerHeight - pos.top + 4)
        } else { // 通常は上から展開
            css.top = pos.top + 24
            css.bottom = 'auto'
        }
        if (window.innerWidth / 2 < pos.left) { // ウィンドウの右側にある場合は左に展開
            css.left = 'auto'
            css.right = Math.round(window.innerWidth - pos.left - 48)
        } else { // 通常は左から展開
            css.left = pos.left - 16
            css.right = 'auto'
        }

        $("#pop_palette").css(css).show()
    })

    // カラーパレット対象フォームで直接編集した場合
    $(document).on("keyup", ".__pull_color_palette", e => setColorOpt($(e.target).val()))

    // カラースライダー値変更イベント
    $(".__sld_color_palette").on("input", e => {
        $("#pop_palette .color_preview").css("background-color", getColorOpt())
        $("#color_text_1").val($("#color_param_1").val())
        $("#color_text_2").val($("#color_param_2").val())
        $("#color_text_3").val($("#color_param_3").val())
    })

    // カラースライダー値変更完了イベント
    $(".__sld_color_palette").on("change", e => $(".__target_color_box").val(getColorOpt()).change().blur())

    // スライダー横のテキストボックス変更イベント
    $(".__txt_color_param").on("change", e => {
        $("#color_param_1").val($("#color_text_1").val())
        $("#color_param_2").val($("#color_text_2").val())
        $("#color_param_3").val($("#color_text_3").val())
        const color_prof = getColorOpt()
        $("#pop_palette .color_preview").css("background-color", color_prof)
        $(".__target_color_box").val(color_prof).change().blur()
    })

    // 色空間コンボボックス変更イベント
    $("#cmb_color_space").on("change", e => {
        switch ($(e.target).val()) {
            case 'rgb': // RGB
                $("#color_label_1").text("R")
                $("#color_label_2").text("G")
                $("#color_label_3").text("B")
                $(".__sld_color_palette").attr({ "min": "0", "max": "255" })
                break
            case 'hsl': // HSL
                $("#color_label_1").text("H")
                $("#color_label_2").text("S")
                $("#color_label_3").text("L")
                $("#color_param_1").attr({ "min": "0", "max": "360" })
                $("#color_param_2, #color_param_3").attr({ "min": "0", "max": "100" })
                break
            case 'lab': // CIELAB
            case 'oklab': // OKLAB
                $("#color_label_1").text("L")
                $("#color_label_2").text("A")
                $("#color_label_3").text("B")
                $("#color_param_1").attr({ "min": "0", "max": "100" })
                $("#color_param_2, #color_param_3").attr({ "min": "-100", "max": "100" })
                break
            case 'lch': // CIELCH
            case 'oklch': // OKLCH
                $("#color_label_1").text("L")
                $("#color_label_2").text("C")
                $("#color_label_3").text("H")
                $("#color_param_1, #color_param_2").attr({ "min": "0", "max": "100" })
                $("#color_param_3").attr({ "min": "0", "max": "360" })
                break
            default:
                break
        }
    })

    // 色をランダムで設定
    $("#on_random_color").on("click", e => {
        let p1 = 0
        let p2 = 0
        let p3 = 0
        switch ($("#cmb_color_space").val()) {
            case 'rgb': // RGB
                p1 = Math.floor(Math.random() * 256)
                p2 = Math.floor(Math.random() * 256)
                p3 = Math.floor(Math.random() * 256)
                break
            case 'hsl': // HSL
                p1 = Math.floor(Math.random() * 360)
                p2 = Math.floor(Math.random() * 101)
                p3 = Math.floor(Math.random() * 101)
                break
            case 'lab': // CIELAB
            case 'oklab': // OKLAB
                p1 = 45 + Math.floor(Math.random() * 16)
                p2 = Math.floor(Math.random() * 201) - 100
                p3 = Math.floor(Math.random() * 201) - 100
                break
            case 'lch': // CIELCH
            case 'oklch': // OKLCH
                p1 = 45 + Math.floor(Math.random() * 16)
                p2 = 10 + Math.floor(Math.random() * 61)
                p3 = Math.floor(Math.random() * 360)
                break
            default:
                break
        }

        $("#color_text_1").val(p1)
        $("#color_text_2").val(p2)
        $("#color_text_3").val(p3)
        $("#color_param_1").val(p1)
        $("#color_param_2").val(p2)
        $("#color_param_3").val(p3)
        const color_prof = getColorOpt()
        $("#pop_palette .color_preview").css("background-color", color_prof)
        $(".__target_color_box").val(color_prof).change().blur()
    })

    // カラーパレット以外をクリックしたらパレットを閉じる
    $("body").on("click", e => {
        if ($(e.target).is(".__pull_color_palette") || $(e.target).closest("#pop_palette").length > 0) return
        $("#pop_palette").hide()
    })
})

/**
 * #Renderer
 * #のついていない16進数の色を#が付いた状態にコンバートする.
 */
function trimHexColor() {
    $('.__pull_color_palette').each((index, elm) => {
        const color = $(elm).val()
        if (color.match(/^[0-9a-f]{6}$/g)) $(elm).val(`#${color}`)
    })
}

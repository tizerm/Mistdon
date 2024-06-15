/**
 * #Ajax
 * fetchでHeaderの取得も可能なAjaxメソッド.
 * 
 * @param arg パラメータオブジェクト
 */
async function ajax(arg) {
    try {
        let response = null
        let url = arg.url
        let param = {
            method: arg.method,
            mode: "cors",
            headers: arg.headers
        }
        if (arg.data) { // Request Parameterが存在する場合
            if (arg.method == "GET") { // GETはパラメータをURLに埋め込む
                const query_param = Object.keys(arg.data).reduce((str, key) => `${str}&${key}=${arg.data[key]}`, '')
                url += `?${query_param.substring(1)}`
            } else param.body = arg.data
        }

        // fetchでHTTP Requestを送信
        response = await fetch(url, param)

        // ステータスコードがエラーの場合はエラーを投げる
        if (!response.ok) throw new Error(`HTTP Status: ${response.status}`)

        // responseをjsonとheaderとHTTP Statusに分けて返却
        return {
            headers: response.headers,
            status: response.status,
            body: await response.json()
        }
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * #Ajax
 * fetchでファイルの送信も可能なAjaxメソッド.
 * 
 * @param arg パラメータオブジェクト
 */
async function sendFileRequest(arg) {
    try {
        // dataからmultipart/form-dataを生成
        const mpfd = new FormData()
        Object.keys(arg.data).forEach(key => mpfd.append(key, arg.data[key]))

        // fetchでHTTP Requestを送信
        const response = await fetch(arg.url, {
            method: "POST",
            mode: "cors",
            headers: arg.headers,
            body: mpfd
        })

        // ステータスコードがエラーの場合はエラーを投げる
        if (!response.ok) {
            response.json().then(data => console.log(data))
            throw new Error(`HTTP Status: ${response.status}`)
        }

        // HTTP 202 | 206が返ってきた場合はまだアップロード中
        return {
            headers: response.headers,
            body: await response.json(),
            progress: response.status == '202' || response.status == '206'
        }
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * #Util
 * 指定した時間待機する.
 * 
 * @param msec 待機時間(ミリセカンド)
 */
async function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec))
}

/**
 * #Util
 * 指定したスケールで切り捨てる.
 * 
 * @param num 切り捨て対象
 * @param scale 切り捨てるスケール
 */
function floor(num, scale) {
    const pow = Math.pow(10, scale)
    return Math.trunc(num * pow) / pow
}

/**
 * #Util
 * 引数の配列の先頭に要素を追加して容量超過した場合は最後の要素を削除する
 * 同一の要素が配列内に存在する場合は長さは変えずに要素を先頭に移動する
 * 
 * @param array 編集対象配列
 * @param obj 追加する要素
 * @param limit 要素を追加できる上限数
 */
function shiftArray(array, obj, limit) {
    const index = array.indexOf(obj)
    if (index < 0) // 存在しないオブジェクトは先頭に保存
        array.unshift(obj)
    else if (index > 0) { // オブジェクトが配列の先頭以外に存在する場合は先頭に場所を移す
        const removed = array.splice(index, 1)[0]
        array.unshift(removed)
    } else // 先頭に同じオブジェクトが存在する場合はなにもせずにfalseを返す
        return false
    // 限界値をオーバーしていたらオーバーした分を消す
    if (array.length > limit) array.splice(limit)

    return true
}


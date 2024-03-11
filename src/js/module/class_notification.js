/**
 * #Class
 * メイン画面のタスク通知を管理するクラス
 *
 * @author tizerm@mofu.kemo.no
 */
class Notification {
    // コンストラクタ: 通知メッセージから通知オブジェクトを生成
    constructor(message, type) {
        this.message = message
        this.type = type
        this.create_date = new Date()
        this.uuid = crypto.randomUUID()
    }

    // 通知履歴と実行中のマップ
    static NOTIFICATION_HISTORY = []
    static PROGRESS_MAP = new Map()

    /**
     * #StaticMethod
     * インフォメーション通知を発行(通知オブジェクトを返却).
     * 
     * @param message 通知メッセージ
     */
    static info(message) {
        const notification = new Notification(message, 'info')
        notification.push()
        notification.show()
        return notification
    }

    /**
     * #StaticMethod
     * 実行中の通知を発行(通知オブジェクトを返却).
     * 
     * @param message 通知メッセージ
     */
    static progress(message) {
        const notification = new Notification(message, 'progress')
        Notification.PROGRESS_MAP.set(notification.uuid, notification)
        notification.show()
        return notification
    }

    /**
     * #StaticMethod
     * エラー通知を発行(通知オブジェクトを返却).
     * 
     * @param message 通知メッセージ
     */
    static error(message) {
        const notification = new Notification(message, 'error')
        notification.push()
        notification.show()
        return notification
    }

    /**
     * #Method
     * 実行中のタスクを完了通知で発行.
     * 
     * @param message 通知メッセージ
     */
    done(message) {
        Notification.PROGRESS_MAP.delete(this.uuid)
        if (message) { // 完了メッセージがある場合は完了通知を設定
            const notification = new Notification(message, 'done')
            notification.push()
            notification.show()
        } else Notification.progressIcon()

    }

    /**
     * #Method
     * 実行中のタスクをエラー通知で発行.
     * 
     * @param message 通知メッセージ
     */
    error(message) {
        const notification = new Notification(message, 'error')
        Notification.PROGRESS_MAP.delete(this.uuid)
        notification.push()
        notification.show()
    }

    // Getter: 通知を表示するときのDOM
    get element() {
        return `<li id="${this.uuid}">
            <span class="${this.type}">${this.message}</span>
        </li>`
    }

    /**
     * #StaticMethod
     * タスクの実行状況に対応してアプリアイコンを変更する.
     */
    static progressIcon() {
        if (Notification.PROGRESS_MAP.size > 0) // 実行中のタスクがある場合はアイコンを変更
            $("#__on_notification>img").attr('src', 'resources/illust/ani_wait.png')
        else $("#__on_notification>img").attr('src', 'resources/illust/icon.png')
    }

    /**
     * #Method
     * この通知を画面に表示.
     */
    show() {
        // 通知トーストを生成して表示
        $("#pop_notification>ul").append(this.element)
        const target_elm = $(`#pop_notification>ul>li#${this.uuid}`)
        target_elm.hide().show("slide", { direction: "up" }, 80)

        // アイコンを変更
        Notification.progressIcon()
        // 1.2secでトーストを削除
        setTimeout(() => target_elm.hide("fade", 400, () => target_elm.remove()), 1600)
    }

    /**
     * #Method
     * この通知を通知キューに挿入.
     */
    push() {
        Notification.NOTIFICATION_HISTORY.unshift(this)
    }
}

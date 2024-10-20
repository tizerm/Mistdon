/**
 * #Class
 * 相対時間を算出するための時間クラス.
 *
 * @author @tizerm@misskey.dev
 */
class RelativeTime {
    // コンストラクタ: Dateオブジェクトから生成
    constructor(date) {
        this.time = date
        this.unix_msec = this.time.getTime()
    }

    // 日付フォーマッターはstaticプロパティにする
    static {
        RelativeTime.DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
            year:   'numeric',
            month:  '2-digit',
            day:    '2-digit',
            hour:   '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
        RelativeTime.TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
            hour:   '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }

    // Getter: フォーマットした絶対時間を返却
    get absolute() { return RelativeTime.DATE_FORMATTER.format(this.time) }

    // Getter: フォーマットした絶対時間を返却、24時間以内の場合は日付を省略
    get day_abs() {
        if ((Date.now() - this.unix_msec) < 86400000) return RelativeTime.TIME_FORMATTER.format(this.time)
        return this.absolute
    }

    // Getter: 相対時間を返却(ただし7日以上経った場合は判定しない)
    get relative() {
        const diff_msec = Date.now() - this.unix_msec
        if      (diff_msec < 60000)     return "Now"
        else if (diff_msec < 3600000)   return `${Math.trunc(diff_msec / 60000)}m`
        else if (diff_msec < 86400000)  return `${floor(diff_msec / 3600000, 1)}h`
        else if (diff_msec < 604800000) return `${floor(diff_msec / 86400000, 1)}d`
        else return undefined
    }

    // Getter: フォーマットした相対時間を返却、ただし7日以上経ったら絶対表記
    get week_rel() {
        return this.relative ?? this.absolute
    }

    // Getter: 絶対時間と相対時間を両方返却
    get both() {
        const relative = this.relative
        return this.day_abs + (relative ? ` (${relative})` : '')
    }

    // Getter: リアルタイム更新の投稿の時間ラベルを生成
    get color() {
        const diff_msec = Date.now() - this.unix_msec
        //if (diff_msec > 86400000) return '#444444' // 1日すぎてる場合はグレー
        if (diff_msec > 86400000) return 'lch(35% 0 0)' // 1日すぎてる場合はグレー
        // 86,400,000msec(24h)で260度になるよう対数を調整しています
        const h = Math.trunc(52.315848 * Math.log((diff_msec + 540000) / 600000))
        //return `hsl(${h > 0 ? h : 0} 50% 40%)`
        return `lch(48% 38% ${(h > 0 ? h : 0) + 30})`
    }

    // Getter: 年単位の投稿時間ラベルを生成
    get ltcolor() {
        const diff_msec = Date.now() - this.unix_msec
        //if (diff_msec > 31536000000) return '#444444' // 1年すぎてる場合はグレー
        if (diff_msec > 31536000000) return 'lch(35% 0 0)' // 1年すぎてる場合はグレー
        // 31,536,000,000msec(1year)で260度になるよう対数を調整しています
        const h = Math.trunc(44.048136 * Math.log((diff_msec + 82800000) / 86400000))
        //return `hsl(${h > 0 ? h : 0} 50% 40%)`
        return `lch(48% 38% ${(h > 0 ? h : 0) + 30})`
    }

}

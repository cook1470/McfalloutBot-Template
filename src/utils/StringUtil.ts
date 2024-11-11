/** 字串工具 */
export namespace StringUtil {

    /**
     * 檢查一個字串是否可以被轉換成數字。
     *
     * 這個函式使用正規表達式匹配以下格式的字串：
     *   - 可選的負號 (-)
     *   - 一個或多個數字
     *   - 可選的小數點 (.)
     *   - 小數點後可選的一個或多個數字
     *
     * @param str 要檢查的字串
     * @returns 如果字串符合數字格式，則返回 true，否則返回 false
     */
    export function isNumberString(str: string): boolean {
        return /^-?\d+(\.\d+)?$/.test(str);
    }

}
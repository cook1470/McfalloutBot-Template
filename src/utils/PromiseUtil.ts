/** Promise 工具，用於快速設置等待。 */
export namespace PromiseUtil {

    /**
     * 等待一段時間。
     * @param duration 等待時間（毫秒）
     * @returns 
     */
    export function wait(duration: number): Promise<void> {
        return new Promise<void>(resolve => setTimeout(resolve, duration));
    }

    /**
     * 等待直到某條件式完成。
     * @param condition 判斷函數
     * @param interval 檢查間隔（毫秒）
     * @param overTiming 超時時間（毫秒）
     */
    export async function waitUntil(condition: () => boolean, interval: number = 100, overTiming?: number): Promise<void> {
        let startTime = Date.now();
        while (!condition()) {
            if (typeof overTiming === 'number') {
                if (Date.now() >= startTime + overTiming) throw new Error("time over.");
            }
            await wait(interval);
        }
    }

}
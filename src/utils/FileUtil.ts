import fs from 'fs';
import path from 'path';

/** 檔案工具，輔助讀取、寫入檔案。 */
export class FileUtil {

    /**
     * 讀取檔案。
     * @param filePath 檔案路徑
     * @param dirPath 資料夾路徑
     * @returns 
     */
    static readFile(filePath: string, dirPath?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // 如果提供了 dirPath，則將其與 filePath 合併
            const fullPath = dirPath ? path.join(dirPath, filePath) : filePath;

            fs.readFile(fullPath, 'utf-8', (err, data) => {
                if (err) reject(`無法讀取檔案: ${err.message}`);
                else resolve(data);
            });
        });
    }

    /**
     * 寫入檔案
     * @param filePath 檔案路徑
     * @param content 寫入內容
     * @param dirPath 資料夾路徑
     */
    static async writeFile(filePath: string, content: string, dirPath?: string): Promise<void> {
        // 如果提供了 dirPath，檢查資料夾是否存在
        if (dirPath) await this.ensureDirectoryExists(dirPath);

        return new Promise((resolve, reject) => {
            // 如果提供了 dirPath，則將其與 filePath 合併
            const fullPath = dirPath ? path.join(dirPath, filePath) : filePath;

            fs.writeFile(fullPath, content, 'utf-8', (err) => {
                if (err) {
                    reject(`無法寫入檔案: ${err.message}`);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 確保資料夾存在，若資料夾不存在則自動建立。
     * @param dirPath 資料夾路徑
     */
    private static ensureDirectoryExists(dirPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.stat(dirPath, (err, stats) => {
                if (err) {
                    // 資料夾不存在，創建它
                    fs.mkdir(dirPath, { recursive: true }, (mkdirErr) => {
                        if (mkdirErr) reject(`無法創建資料夾: ${mkdirErr.message}`);
                        else resolve();
                    });
                } else if (!stats.isDirectory()) reject(`${dirPath} 不是一個資料夾`);
                else resolve();
            });
        });
    }
}

import readline from 'readline';
import path from 'path';
import { BaseBot, BaseBotConfig } from './bots/BaseBot';
import { FileUtil } from './utils/FileUtil';

// 創建 readline 介面物件
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

// 定義設定檔的資料夾路徑。
const configPath = 'config.json';
const configDirPath = path.join(__dirname, 'data');

async function start(): Promise<void> {

    console.log('歡迎使用 廢土機器人-C v0.0.1');

    const config = await (async () => {
        try {
            return JSON.parse(await FileUtil.readFile(configPath, configDirPath));
        } catch (e) {
            console.log('找不到 config.json，請輸入帳號資料：');
            const username = await question('帳號: ');
            const config: BaseBotConfig = {
                username: username,
                password: await question('密碼: '),
                auto_reconnect: true,
                white_list: ['請將此更改為您的 Minecraft ID'],
            };
            // 儲存設定檔
            FileUtil.writeFile(configPath, JSON.stringify(config, null, 2), configDirPath);
            console.log(`初次建立設定檔，建議於下方路徑打開設定檔，更改白名單玩家 ID。\n${path.join(configDirPath, configPath)}`);
            return config;
        }
    })()

    console.log(`${config.username} 登入中...`);
    BaseBot.getInstance(config).login(); // 取得 Bot 實體並登入。

}

start();

/**
 * 快速提問。
 * @param query 問題內容 
 * @returns 
 */
function question(query: string): Promise<string> {
    return new Promise<string>(resolve => {
        rl.question(query, resolve);
    })
}
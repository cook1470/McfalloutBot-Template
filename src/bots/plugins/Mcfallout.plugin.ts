import { Bot } from "mineflayer";
import { BasePlugin } from "./BasePlugin";
import { ChatMessage } from 'prismarine-chat'

/**
 * ## 廢土伺服器插件
 * 用於處理部分廢土伺服器相關的功能，包含了些許的基礎功能，例如傳送請求、私訊處理等。
 */
export class McfalloutPlugin extends BasePlugin {

    static TYPE: string = 'Mcfallout';

    setup = (bot: Bot): void => {
        // 設置監聽器
        bot.on('message', this._onMessage);
    }

    /**
     * 當接收到遊戲訊息時。
     * @param jsonMsg 一種包含了許多資訊的訊息物件，如遊戲中聊天室的文字顏色、點擊
     * @param position 訊息的來源位置，例如 chat、system、game_info 等。
     */
    private _onMessage = (jsonMsg: ChatMessage, position: string): void => {
        const message = jsonMsg.toString();

        // 處理傳送請求
        if (/^\[系統\] (.+) 想要你?傳送到 (該玩家|你) 的位置$/.test(message)) {
            this.tpaccept(/^\[系統\] (.+) 想要你?傳送到 (該玩家|你) 的位置$/.exec(message)[1]);
        }

        // 解析並處理私訊內容
        if (/^\[(.+)\-> 您] (.+)$/.test(message)) {
            const match = /^\[(.+)\-> 您] (.+)$/.exec(message);
            this.onPrivateMessage(match[1], match[2]);
        }

        console.log(jsonMsg.toAnsi());
    }

    /**
     * 當接收到玩家私訊時。
     * @param username 私訊的玩家 ID
     * @param message 私訓的內容
     */
    private onPrivateMessage(username: string, message: string): void {
        if (!this.baseBot.checkWhiteList(username)) return;

        if (message === '/tpMe') {
            this.tpa(username);
        }
    }

    /** 接受玩家的傳送請求。 */
    private tpaccept(username: string): void {
        if (this.baseBot.checkWhiteList(username)) this.bot.chat('/tpaccept');
    }

    /**
     * 向一位玩家發送傳送請求。
     * @param username 要傳送的玩家 ID
     * @param whiteList 是否啟用白名單過濾？預設不啟用
     */
    tpa(username: string, whiteList: boolean = false): void {
        if (whiteList && !this.baseBot.checkWhiteList(username)) return;
        this.bot.chat(`/tpa ${username}`);
    }

}
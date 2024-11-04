import { Bot } from "mineflayer";
import { BasePlugin } from "./BasePlugin";
import { ChatMessage } from 'prismarine-chat'
import { BaseBot } from "../BaseBot";

/** 廢土伺服器插件，用於處理部分廢土伺服器相關的功能，包含了些許的基礎功能，例如傳送請求、私訊處理等。 */
export class McfalloutPlugin extends BasePlugin {

    static TYPE: string = 'Mcfallout';

    constructor(baseBot: BaseBot) {
        super(baseBot);

        baseBot.commanderPlugin.registerCommand('tpMe', this._tpMe, this);
        baseBot.commanderPlugin.registerCommand('back', this._back, this);

    }

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

        console.log(jsonMsg.toAnsi()); // 此行用於顯示遊戲內訊息，如不需要可自行刪除
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

    // 指令

    // ex. /tpMe
    private _tpMe = async (username: string): Promise<void> => {
        this.tpa(username);
    }

    // ex. /back
    private _back = async (username: string): Promise<void> => {
        this.bot.chat(`/back`);
    }

}
import { Bot } from "mineflayer";
import { BasePlugin } from "./BasePlugin";
import { ChatMessage } from 'prismarine-chat'
import { BaseBot } from "../BaseBot";

/** 廢土伺服器插件，用於處理部分廢土伺服器相關的功能，包含了些許的基礎功能，例如傳送請求、私訊處理等。 */
export class McfalloutPlugin extends BasePlugin {

    static TYPE: string = 'Mcfallout';

    constructor(baseBot: BaseBot) {
        super(baseBot);

        baseBot.commanderPlugin.registerCommand('tpa', this._tpa, this);
        baseBot.commanderPlugin.registerCommand('tpahere', this._tpahere, this);
        baseBot.commanderPlugin.registerCommand('back', this._back, this);
        baseBot.commanderPlugin.registerCommand('ts', this._ts, this);
        baseBot.commanderPlugin.registerCommand('server', this._server, this);
        baseBot.commanderPlugin.registerCommand('warp', this._warp, this);
        baseBot.commanderPlugin.registerCommand('glist', this._glist, this);

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
            if (this.baseBot.checkWhiteList(/^\[系統\] (.+) 想要你?傳送到 (該玩家|你) 的位置$/.exec(message)[1])) this.bot.chat('/tpaccept');
        }

        console.log(jsonMsg.toAnsi()); // 此行用於顯示遊戲內訊息，如不需要可自行刪除
    }

    /** 取得 TAB 的資訊。 */
    getTabInfo() {
        const str = this.bot.tablist.header.toString();
        return {
            /** 綠寶石餘額 */
            money: (() => {
                const match = /綠寶石餘額 : ([\d,]+)/.exec(str);
                if (match) return parseInt(match[1].replace(/[^\d.]/g, ''));
            })(),
            /** 村民錠餘額 */
            coin: (() => {
                const match = /村民錠餘額 : ([\d,]+)/.exec(str);
                if (match) return parseInt(match[1].replace(/[^\d.]/g, ''));
            })(),
            /** 村民錠價格 */
            coinPrice: (() => {
                const match = /村民錠價格 : 每個約 ([\d,]+) 綠/.exec(str);
                if (match) return parseInt(match[1].replace(/[^\d.]/g, ''));
            })(),
            /** 所處伺服器 */
            server: (() => {
                const match = /所處位置 : (分流\d+|等待室)/.exec(str);
                if (match) return match[1].replace('分流', 'server')
            })(),
            /** 所處分流 */
            ts: (() => {
                const match = /分流(\d+)/.exec(str);
                if (match) return parseInt(match[1]);
            })(),
        }
    }

    /**
     * 從 TAB 讀取當前分流。
     * @returns 分流數字
     */
    getTsFromTab(): number {
        const match = /分流(\d+)/.exec(this.bot.tablist.header.toString());
        if (match) return parseInt(match[1]);
    }

    /**
     * 切換分流，並等待讀取。
     * @param ts 分流數字
     */
    async ts(ts: number): Promise<void> {
        this.bot.chat(`/ts ${ts}`);
        await this.baseBot.bot.awaitMessage(/^\[系統\].+讀取人物成功。/);
    }

    /**
     * 切換伺服器，可直接到達等待室。
     * @param server 伺服器名稱，如 wait、server32。
     * @returns 
     */
    async server(server: string): Promise<void> {
        this.bot.chat(`/server ${server}`);
        let result = await this.bot.awaitMessage(/^\[系統\].+讀取人物成功。|^The specified server does not exist.$/);
        if (result === 'The specified server does not exist.') return Promise.reject(result);
    }

    /**
     * 傳送到公共傳送點。
     * @param name 公共傳送點名稱
     * @returns 
     */
    async warp(name: string): Promise<void> {
        this.bot.chat(`/warp ${name}`);
        let result = await this.baseBot.bot.awaitMessage(/^\[系統\].+傳送您至公共傳送點|^\[系統\].+找不到公共傳送點/);
        if (/^\[系統\].+找不到公共傳送點/.test(result)) return Promise.reject(`找不到公共傳送點：${name}`);
    }

    /** 使用 /back 指令，並等待傳送完成。 */
    async back(): Promise<void> {
        this.bot.chat(`/back`);
        await this.baseBot.bot.awaitMessage(/^\[系統\].+已返回至上一個地點/);
    }

    /** 讀取銀行綠寶石貨幣數量。 */
    async getMoney(): Promise<number> {
        this.bot.chat(`/money`);
        let message = (await this.baseBot.bot.awaitMessage(/^金錢：＄/)).toString();
        return parseInt(message.replace(/[^\d.]/g, ''));
    }

    // 指令

    // ex. /tpa cook1470
    private _tpa = async (username: string, target: string): Promise<void> => {
        if (!target) return Promise.reject(`請輸入玩家ID，例如: /tpa ${target}`);
        this.bot.chat(`/tpa ${target}`);
    }

    // ex. /tpahere cook1470
    private _tpahere = async (username: string, target: string): Promise<void> => {
        if (!target) return Promise.reject(`請輸入玩家ID，例如: /tpa ${target}`);
        this.bot.chat(`/tpahere ${target}`);
    }

    // ex. /back
    private _back = async (username: string): Promise<void> => {
        return this.back();
    }

    // ex. /ts 7
    private _ts = async (username: string, ts: string): Promise<void> => {
        if (!/^\d+$/.test(ts)) return Promise.reject('請輸入一個有效的分流數字。例: /ts 7');
        return this.ts(parseInt(ts));
    }

    // ex. /server server32
    private _server = async (username: string, server: string): Promise<void> => {
        return this.server(server);
    }

    // ex. /warp cook1470_2
    private _warp = async (username: string, name: string): Promise<void> => {
        return this.warp(name);
    }

    // ex. /glist cook1470
    private _glist = async (username: string, target: string): Promise<void> => {
        if (!target) return Promise.reject(`請輸入要尋找的玩家ID。例: /glist ${target}`);
        const list: string[] = [];

        const onMessagestr = (msg: string) => {
            if (/^\[server\d+\]/.test(msg)) list.push(msg);
        } // 設置訊息監聽器，用於捕捉玩家所處伺服器的訊息。
        this.bot.on('messagestr', onMessagestr);
        this.bot.chat('/glist');
        await this.bot.awaitMessage(/^Total players online:/); // 等待直到接收到 /glist 的最後一行
        this.bot.off('messagestr', onMessagestr);

        // 開始分析訊息內容
        for (let row of list) {
            let data = row.split(' ');
            for (let i = 2; i < data.length; i++) {
                const id = data[i].replace(',', '');
                if (id === target) { // 找到目標玩家時回傳，並結束
                    this.baseBot.tell(username, `${target} 所在伺服器為 ${data[0]}`);
                    return;
                }
            }
        }

        this.baseBot.tell(username, `找不到玩家 ${target}。`);
    }

}
import { Bot } from "mineflayer";
import { BasePlugin } from "./BasePlugin";
import { ChatMessage } from 'prismarine-chat'
import { BaseBot } from "../BaseBot";

/** 指令管理器，用於方便管理機器人指令的工具。 */
export class CommanderPlugin extends BasePlugin {

    static TYPE: string = 'Commander';

    private _commandMap: { [key: string]: CommandFunction } = {};

    constructor(baseBot: BaseBot) {
        super(baseBot)

        // 預設註冊 help 指令。
        this.registerCommand('help', this._help, this);
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
        const match = /^\[(.+)\-> 您] \/(.+)$/.exec(jsonMsg.toString());
        if (!match) return; // 不符合私訊指令格式則直接結束。

        const username = match[1]; // 擷取私訊指令的玩家 ID
        if (!this.baseBot.checkWhiteList(username)) return; // 輸入指令者不在白名單內則直接結束。

        const message = match[2];        // 擷取私訊內容，不包含 / 斜線。
        const args = message.split(' '); // 擷取指令參數
        const command = args.shift();    // 擷取指令名稱。

        this.runCommand(username, command, ...args);
    }

    /**
     * 註冊指令，使玩家可在遊戲中私訊 Bot 使用指令。
     * @param commandName 指令名稱
     * @param fn 要執行的函數
     * @param context 函數的上下文，代表函數從何執行，一般請直接填 this
     */
    registerCommand(commandName: string, fn: CommandFunction, context?: any): void {
        if (this._commandMap[commandName]) console.error(`重複註冊指令：${commandName}`);
        this._commandMap[commandName] = context ? fn.bind(context) : fn;
    }

    private runCommand(username: string, commandName: string, ...args: string[]): void {
        const fn = this._commandMap[commandName];
        if (!fn) return this.baseBot.tell(username, '無效的指令。使用 /help 來查詢可用指令。');
        fn(username, ...args).catch((reason: any) => {
            if (typeof reason === 'string') this.baseBot.tell(username, reason);
            else if (reason instanceof Error) this.baseBot.tell(username, reason.message);
        })
    }

    // 指令 

    // ex. /help
    private _help = async (username: string): Promise<void> => {
        this.baseBot.tell(username, Object.keys(this._commandMap).join(', '));
    }

}

export type CommandFunction = (username: string, ...args: any[]) => Promise<void | string>;
import { Bot } from "mineflayer";
import { BaseBot } from "../BaseBot";

/** 基底插件 */
export class BasePlugin {

    /** 插件類別，每個繼承此類別的插件都需要定義自己的 TYPE。 */
    static TYPE: string = 'BasePlugin';

    constructor(private _baseBot: BaseBot) {

    }

    get baseBot(): BaseBot { return this._baseBot };
    get bot(): Bot { return this._baseBot.bot };
    get type(): string { return Object.getPrototypeOf(this).constructor.TYPE };

    /** 初始設置，每當 Bot 初次進入遊戲時自動執行。 */
    setup: (bot: Bot) => void;

}
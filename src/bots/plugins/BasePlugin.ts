import { Bot } from "mineflayer";
import { BaseBot } from "../BaseBot";

/** 基底插件 */
export class BasePlugin {

    /** 插件類別，每個繼承此類別的插件都需要定義自己的 TYPE。 */
    static TYPE: string = 'BasePlugin';

    /**
     * 依賴插件，若本插件有使用到其他插件的功能，可以考慮添加，會在插件創建時自動檢查並創建依賴插件，若依賴插件已經存在於 BaseBot 則略過。
     * 
     * 當然也可以直接在 BaseBot 內就創建好全部的插件，這只是一種保險起見。
     */
    static DEPENDENCIES: (typeof BasePlugin)[] = [];

    constructor(private _baseBot: BaseBot) {

        const MyClass = this.constructor as typeof BasePlugin;

        for (const PluginClass of MyClass.DEPENDENCIES) {
            if (!_baseBot.getPlugin(PluginClass.TYPE) && PluginClass !== MyClass) _baseBot.loadPlugin(new PluginClass(_baseBot));
        }

    }

    get baseBot(): BaseBot { return this._baseBot };
    get bot(): Bot { return this._baseBot.bot };
    get type(): string { return Object.getPrototypeOf(this).constructor.TYPE };

    /** 初始設置，每當 Bot 初次進入遊戲時自動執行。 */
    setup: (bot: Bot) => void;

}
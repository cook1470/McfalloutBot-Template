import { Bot, createBot, EquipmentDestination } from "mineflayer";
import { BasePlugin } from "./plugins/BasePlugin";
import { McfalloutPlugin } from "./plugins/Mcfallout.plugin";
import { CommanderPlugin } from "./plugins/Commander.plugin";
import { PromiseUtil } from "../utils/PromiseUtil";
import { Window } from 'prismarine-windows';

/** 基底 Bot 設定檔介面 */
export interface BaseBotConfig {
    username: string;
    password: string;
    white_list?: string[];
    auto_reconnect?: boolean;
}

/** 基底 Bot 實例物件池，基於 Bot 帳號名稱 */
const ALL: { [username: string]: BaseBot } = {};
/** 基底 Bot，包含部分基礎功能，此非 Mineflayer Bot，僅是管理系統。 */
export class BaseBot {

    /**
     * 取得基底 Bot 實體，此方法適合用於同時創建多個 Bot 實體。
     * @param config 設定檔
     * @returns 
     */
    static getInstance(config: BaseBotConfig): BaseBot {
        const instance = ALL[config.username];
        if (instance) {
            instance._config = config;
            return instance;
        }; return new BaseBot(config);
    }

    private _bot: Bot;
    private _pluginMap: Map<string, BasePlugin> = new Map();

    /** 不建議使用此方式創建基底 Bot 實體，建議使用 BaseBot.getInstance() 替代。 */
    constructor(private _config: BaseBotConfig) {
        ALL[this._config.username] = this;

        this.loadPlugin(new CommanderPlugin(this));
        this.loadPlugin(new McfalloutPlugin(this));

        this.commanderPlugin.registerCommand('equip', this._equip, this);
    }

    /** Mineflayer Bot 物件 */
    get bot(): Bot { return this._bot };
    // 插件
    get commanderPlugin() { return this.getPlugin(CommanderPlugin.TYPE) as CommanderPlugin };
    get mcfalloutPlugin() { return this.getPlugin(McfalloutPlugin.TYPE) as McfalloutPlugin };

    /** 讓 Bot 登入遊戲。 */
    login(): void {
        if (this._bot) this.end();

        const bot = this._bot = createBot({
            username: this._config.username,
            password: this._config.password,
            host: 'jp.mcfallout.net',
            auth: 'microsoft',
            hideErrors: true
        })

        // 設置監聽器
        bot.once('spawn', this._onSpawn);
        bot.once('end', this._onEnd);
        bot.once('kicked', this._onKicked);
    }

    /** 當 Bot 重生時。 */
    private _onSpawn = (): void => {
        const bot = this._bot;
        this._pluginMap.forEach((plugin: BasePlugin, key: string, map: Map<string, BasePlugin>) => {
            plugin.setup?.(bot); // 若插件需要初始設置，則進行初始化。
        })
    }

    /**
     * 當 Bot 離開遊戲時。
     * @param reason 離線原因
     */
    private _onEnd = (reason: string): void => {
        this._bot = null;
        // 若有設定自動重新連線，則 5 秒後自動重新連線。
        if (this._config.auto_reconnect) setTimeout(this.login.bind(this), 5000);
    }

    /**
     * 當 Bot 被踢出伺服器時。
     * @param reason 原因
     */
    private _onKicked = (reason: string, loggedIn: boolean): void => {
        if (typeof reason === 'string') {
            if (/You are already connected to this proxy!/.test(reason)) {
                console.error(`${this._config.username} 該帳號的機器人已經在伺服器中，強制關閉自動重新連線。`)
                this._config.auto_reconnect = false;;
            } else {
                console.error('未知的錯誤：\n', reason);
            }
        } else console.error('onKicked: ', reason);
    }

    end(): void {
        this._bot.end();
    }

    /**
     * 載入自訂插件。
     * @param plugin 插件實體
     */
    loadPlugin(plugin: BasePlugin): void {
        this._pluginMap.set(plugin.type, plugin);
    }

    /**
     * 取得自訂插件。
     * @param type 插件類別
     * @returns 
     */
    getPlugin(type: string): BasePlugin {
        return this._pluginMap.get(type);
    }

    /**
     * 檢查玩家是否存在於白名單內。
     * @param username 要檢查的玩家 ID
     * @returns 
     */
    checkWhiteList(username: string): boolean {
        return this._config.white_list?.includes(username);
    }

    /**
     * 向一位玩家發送私訊。
     * @param username 要發送私訊的玩家 ID
     * @param message 訊息內容
     * @param whiteList 是否啟用白名單過濾？預設不啟用
     */
    tell(username: string, message: string, whiteList: boolean = false): void {
        if (whiteList && !this.checkWhiteList(username)) return;
        if (message.length > 200) message = message.slice(0, 197) + '...'; // 當訊息過長時切斷，避免被踢出伺服器
        this._bot.chat(`/m ${username} ${message}`);
    }

    /**
     * 等待任意視窗開啟。
     * @param loadItem 是否等待視窗至少有一個物品。（主要適用於打開伺服器選單等確定有內容物的視窗）
     * @param overTiming 超時時間，若有設定，則時間到時回傳，可能為 null
     * @returns 
     */
    waitWindowOpen = async (loadItem: boolean = true, overTiming?: number): Promise<Window | null> => {
        await PromiseUtil.waitUntil(() => this.bot.currentWindow && (!loadItem || !!this.bot.currentWindow.containerItems().length), 50, overTiming).catch((e) => { });
        return this.bot.currentWindow;
    }

    // 指令

    // ex. /equip iron_sword hand
    private _equip = async (username: string, itemCode: string, destination: EquipmentDestination = 'hand'): Promise<void> => {
        if (!itemCode) return Promise.reject('請輸入物品代碼。例：/equip iron_sword hand');
        if (!["hand", "head", "torso", "legs", "feet", "off-hand"].includes(destination)) return Promise.reject(`請輸入裝備位置。例: /equip ${itemCode} hand，參數："[hand|head|torso|legs|feet|off-hand]`);
        const item = this._bot.inventory.slots.find(item => item && item.name === itemCode);
        if (!item) return Promise.reject('背包中沒有該物品。');
        await this._bot.equip(item, 'hand').catch(console.error);
    }
}
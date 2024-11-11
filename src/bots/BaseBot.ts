import { Bot, createBot, EquipmentDestination } from "mineflayer";
import { BasePlugin } from "./plugins/BasePlugin";
import { McfalloutPlugin } from "./plugins/Mcfallout.plugin";
import { CommanderPlugin } from "./plugins/Commander.plugin";
import { PromiseUtil } from "../utils/PromiseUtil";
import { Window } from 'prismarine-windows';
import { StringUtil } from "../utils/StringUtil";

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

        this.commanderPlugin.registerCommand('toss', this._toss, this);
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
    awaitWindowOpen = async (loadItem: boolean = true, overTiming?: number): Promise<Window | null> => {
        await PromiseUtil.waitUntil(() => this.bot.currentWindow && (!loadItem || !!this.bot.currentWindow.containerItems().length), 50, overTiming).catch((e) => { });
        return this.bot.currentWindow;
    }

    /**
     * 等待接收訊息，且可設置超時時間。
     * @param message 要等待的訊息，可傳入純字串或正規表達式。
     * @param overTiming 最多等待時間，時間到則結束等待，並回傳 reject。
     * @returns 
     */
    awaitMessage(message: string | RegExp, overTiming?: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let passed: boolean = false;

            const messageListener = (msg: string): void | Promise<void> => {
                if (typeof message === 'string') {
                    if (message !== msg) return;
                } else if (message instanceof RegExp) {
                    if (!message.test(msg)) return;
                }
                this._bot.off('messagestr', messageListener);
                resolve(msg); passed = true;
            };

            this._bot.on('messagestr', messageListener);

            if (typeof overTiming === 'number' && overTiming > 0)
                PromiseUtil.wait(overTiming).then(() => {
                    if (passed) return;
                    this._bot.off('messagestr', messageListener);
                    reject('time over.');
                })
        });
    }

    // 指令

    // ex. /toss * , /toss grass_block , /toss /shulker_box$/
    private _toss = async (username: string, itemCode: string, _minCount?: string, _slot?: string): Promise<void> => {
        if (!itemCode) return Promise.reject('請輸入要丟出的物品代碼。例: /toss grass_block、/toss *')
        if (itemCode !== '*' && !/\/.+\//.test(itemCode) && !this.bot.registry.itemsByName[itemCode]) return Promise.reject(`不存在的物品代碼 => ${itemCode}`)
        if (_minCount && !StringUtil.isNumberString(_minCount)) return Promise.reject(`請輸入有效的最低數量。例：/toss ${itemCode} 64`);
        if (_slot && !StringUtil.isNumberString(_slot)) return Promise.reject(`請輸入有效的欄位數字。例：/toss ${itemCode} ${_minCount} 1`);

        /**
         * 由於玩家在遊戲中使用指令，接收到的內容皆為 string
         * 對於需要轉型成 number 的參數，建議可以在接收參數前使用 _ 表示
         * 使用 StringUtil.isNumberString 檢查完內容後（或自行檢查）
         * 再利用 parseInt、parseFloat 等函數轉換，儲存於新變數中
         * 可維持程式碼的整潔、統一性。
         */

        const minCount = _minCount ? parseInt(_minCount) : 1;

        // 準備好正規表達式，用於稍後檢查物品代碼
        let regexp: RegExp;
        if (/\/.+\//.test(itemCode)) regexp = new RegExp(itemCode.slice(1, itemCode.length - 1));
        else regexp = new RegExp(itemCode === '*' ? '.*' : `^${itemCode}$`);

        // 若有指定欄位
        if (_slot) {
            const slot = parseInt(_slot);
            const item = this._bot.inventory.slots[slot];
            if (regexp.test(item.name) && item.count >= minCount) await this._bot.tossStack(item);
        } else {
            // 搜尋玩家庫存所有欄位
            for (let item of this._bot.inventory.slots) {
                if (!item) continue;                   // 若不存在物品則跳過
                if (!regexp.test(item.name)) continue; // 若物品代碼不符合則跳過
                if (item.count < minCount) continue;   // 若物品數量小於則跳過
                await this._bot.tossStack(item);
            }
        }
    }

    // ex. /equip iron_sword hand
    private _equip = async (username: string, itemCode: string, destination: EquipmentDestination = 'hand'): Promise<void> => {
        if (!itemCode) return Promise.reject('請輸入物品代碼。例：/equip iron_sword hand');
        if (!["hand", "head", "torso", "legs", "feet", "off-hand"].includes(destination)) return Promise.reject(`請輸入裝備位置。例: /equip ${itemCode} hand，參數："[hand|head|torso|legs|feet|off-hand]`);
        const item = this._bot.inventory.slots.find(item => item && item.name === itemCode);
        if (!item) return Promise.reject('背包中沒有該物品。');
        await this._bot.equip(item, 'hand').catch(console.error);
    }
}
# 廢土機器人模板（McfalloutBot-Template）

這是一個用於廢土伺服器的 Mineflayer 機器人模板，提供了一些基礎的設定檔建立、傳送，以及遊戲內指令管理器，可方便定義各種指令使用。

## 如何取得專案

如果你的電腦有安裝 [git](https://git-scm.com/)，那麼你可以在你想要創建專案的地方打開終端機，輸入下方指令將這個專案複製一份到你的電腦。

```bash
git clone https://github.com/cook1470/McfalloutBot-Template.git
```

如果你沒有安裝 git 也不要緊，只要在這上面找到 `<> Code` 的按鈕，你就可以直接下載這個專案的壓縮檔，解壓縮後同樣可以打開專案。

當然除了下載專案以外，你還得要有可以用來撰寫程式的軟體，例如 [Visual Studio Code](https://code.visualstudio.com/)，因為這個專案只是一個模板，僅提供了一些基礎的功能，你可以在這個專案的基礎上建立更多有趣的功能。

有了專案之後首先你必須先安裝本專案所使用到的模組們，因為複製出來的專案本身並不包含模組，這是為了節省專案的容量大小，輸入下方指令來安裝模組：

```bash
npm install
```

接著，由於本專案使用 TypeScript 進行撰寫，如果你沒有安裝過的話，必須再輸入下列指令來安裝：

```bash
npm install -g typescript
```

最後，你就可以輸入下方指令來啟動／執行你的專案了。

```bash
npm start
```

## 專案簡介

如同上方簡介所述，這是一個模板專案，僅提供了一些基礎的系統，接下來就來介紹這個專案有什麼便利的地方能夠使用。

本專案預設提供了簡單的機器人設定檔建立，初次執行時輸入機器人的帳號、密碼後，便會自動儲存於本地電腦，且會告知儲存路徑，並且具有自動重新連線、白名單功能，可自行於設定檔內更改。

由於主要是為了廢土伺服器，因此也提供了相關基礎功能，如傳送請求、指令系統，只要將玩家 ID 加入白名單內，即可以使用 /tpa、/tpahere 傳送機器人。

本專案的核心內容是將所有功能都模組化，且彼此之間有很好的溝通性，只要依照這些簡單的格式開發新功能，就可以保持專案的整潔。

例如最基礎的 `BaseBot`，這是用於所有物件互相溝通的橋樑，較大型、重要的物件、功能都存放在裡面，例如 Mineflayer 的 Bot 實體，以及其餘自訂功能，如指令管理器等。

除此之外還有兩個較為重要的系統，接下來就來介紹他們。

### 自訂插件（Plugins）

插件系統的基礎類別 BasePlugin（基底插件），這是一個用來繼承的基底類別，僅是提供了一些簡單的屬性，以及介面可供使用，真正的用途在於繼承之後，你可以直接在繼承的子類別內使用 `this.baseBot`、`this.bot` 屬性來操作兩個重點物件，並且在插件類別內複寫 `setup` 函數後，每當機器人進入世界，就會自動執行這個設置函數，用來作為插件的初始化。

目前已有兩個預設的插件可供參考、使用，分別是 `McfalloutPlugin` 和 `CommanderPlugin`，前者主要處理廢土伺服器相關的功能，如傳送，後者則是用於管理機器人的指令狀態，方便我們建立指令於遊戲內操作。

以 McfalloutPlugin 為例子：

```typescript
// 創建新插件時，首先要使用 extends 來繼承 BasePlugin 類別。
export class McfalloutPlugin extends BasePlugin {

    // 接著定義插件的 TYPE，一般使用類別名稱即可，不可與其他插件重複。
    static TYPE: string = 'Mcfallout';

    // 建構子（constructor），當類別實體被創建時執行。
    constructor(baseBot: BaseBot) {
        super(baseBot); // 由於是繼承 BasePlugin 因此需要呼叫 super

        // 因為本插件需要註冊指令，所以才有建構子，否則建構子可以省略。
        baseBot.commanderPlugin.registerCommand('tpMe', this._tpMe, this);

    }

    // 複寫 setup 函數，此函數於機器人加入世界時自動執行，並帶有 bot 參數可供使用。
    setup = (bot: Bot): void => {
        // 設置監聽器
        bot.on('message', this._onMessage);
    }

    // 其餘省略...
}
```

其中的註冊指令 `baseBot.commanderPlugin.registerCommand` 又是另一個插件的功能，待會再來詳細介紹。

建立好插件之後，必須要將插件載入到 `BaseBot` 中才可以使用。

```typescript
export class BaseBot {

    // 其餘省略...

    constructor(private _config: BaseBotConfig) {
        ALL[this._config.username] = this; // 這可以省略不看。

        // 於建構子內創建插件，並使用 this.loadPlugin 來進行加載。
        this.loadPlugin(new CommanderPlugin(this));
        this.loadPlugin(new McfalloutPlugin(this));
    }

    // 除了加載以外，你也可以將插件的取得方式包裝成 get 屬性，可以更方便的在任何地方讀取使用。
    get commanderPlugin() { return this.getPlugin(CommanderPlugin.TYPE) as CommanderPlugin };
    get mcfalloutPlugin() { return this.getPlugin(McfalloutPlugin.TYPE) as McfalloutPlugin };

    // 其餘省略...
}
```

當然，就算你不將插件包裝成屬性，還是可以在能夠讀取 BaseBot 的地方，使用 `baseBot.getPlugin(插件類別.TYPE)` 的方式來進行讀取使用。

### 指令管理器（Commander）

這是本專案目前最重要的功能之一，可利用模組化的方式來註冊、管理指令，使得添加新指令的過程更加方便，且內建 /help 指令，供玩家在遊戲中查看所有指令。

首先是當你需要定義指令的時候，以 CommanderPlugin 本身為例。

```typescript
export class CommanderPlugin extends BasePlugin {
    
    // 其餘省略...
    
    constructor(baseBot: BaseBot) {
        super(baseBot)
        
        /**
         * 第二步：註冊指令
         * 由於 registerCommand 指令在本插件內，所以可以使用 this 進行註冊
         * 在其他地方需使用 baseBot.commanderPlugin.registerCommand
         * 詳細可參考 McfalloutPlugin 的建構子（constructor）
         * 
         * 主要有三個參數，分別為
         * 指令名稱 / 執行函數 / this（可以固定寫 this 就好）
         */
        this.registerCommand('help', this._help, this);
    }

    // 其餘省略...

    /**
     * 第一步：建立指令用於執行的函數，建議使用箭頭函數 () => {}
     * 函數回傳的結果類型必須是 Promise<void | string>
     * 因此建議直接使用非同步函數 async，也可以省略後方的型別註釋
     * 詳細可至該插件底部的 CommandFunction 查看
     * 
     * 函數固定會附帶 username 參數，代表執行指令的玩家 ID
     */
    private _help = async (username: string): Promise<void> => {
        this.baseBot.tell(username, Object.keys(this._commandMap).join(', '));
    }

}
```

在執行指令時，除了預設的 username 參數，你還可以自定義接收的參數，以及錯誤回應訊息。

以 BaseBot 為例。

```typescript
export class BaseBot {

    // 其餘省略...

    /**
     * 這是一個簡單的裝備物品指令函數
     * 可以看到參數中多了 itemCode、destination
     * 指令系統會自動將玩家在指令後方輸入的參數捕捉進來，就如同在遊戲中使用指令一樣
     * 你可以任意的使用參數，不過記得，所有的參數型別都是字串
     * 如果需要 number、boolean 等型別，需自行轉換！
     * 你可以在參數不符合條件，或是有任何錯誤時
     * 使用 return Promise.reject('錯誤訊息內容');
     * 這將會停止運作指令，並使機器人通知遊戲的玩家錯誤訊息
     */
    private _equip = async (username: string, itemCode: string, destination: EquipmentDestination = 'hand'): Promise<void> => {
        if (!itemCode) return Promise.reject('請輸入物品代碼。例：/equip iron_sword hand');
        if (!["hand", "head", "torso", "legs", "feet", "off-hand"].includes(destination)) return Promise.reject(`請輸入裝備位置。例：/equip ${itemCode} hand，參數："[hand|head|torso|legs|feet|off-hand]`);
        const item = this._bot.inventory.slots.find(item => item && item.name === itemCode);
        if (!item) return Promise.reject('背包中沒有該物品。');
        await this._bot.equip(item, 'hand').catch(console.error);
    }
}
```

以上，就是本專案的主要重點，未來再慢慢將部分廢土功能內建到裡面，例如領取/存入指定數量的綠寶石、兌換，或是添加一些可選插件，例如用於將工作流程模組化的大腦插件，或是村民交易插件等等，但應該不會有太複雜的功能，畢竟主要還是一個模板，若要開發複雜的系統我應該會分支另外成另外一個專案來進行，甚至可以建立一些具有圖形化介面的應用程式。

總之如果你有什麼想法、建議，歡迎告訴我！

## 作者
**[cook1470](https://github.com/cook1470)**
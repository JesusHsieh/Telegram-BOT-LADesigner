# Telegram-BOT-LADesigner

景觀設計用的 Telegram AI 助理雛形。這個專案目前定位為「公司內部橋接型 bot」：由 Telegram 接收外部使用者指令，在 bot 端完成權限檢查與任務路由，再依任務交給 local mock、n8n mock 或 NAS mock executor。

目前仍是 MVP / mock 階段，尚未直接讀取真實 NAS，也尚未接正式 n8n workflow。

## 架構

目前主架構：

```text
Telegram
-> 公司 NAS 或本機上的 Bot Poll
-> Telegram-BOT-LADesigner
-> 權限檢查
-> Task Router
-> Executor Router
   -> Local Mock
   -> n8n Mock Bridge
   -> NAS Mock Bridge
-> 回 Task Router 整理結果
-> Telegram 回覆
```

可選 webhook 架構：

```text
Telegram
-> HTTPS Webhook Backend
-> Telegram-BOT-LADesigner
-> 權限檢查
-> Task Router
-> Executor Router
-> Telegram 回覆
```

對公司內網橋接情境，建議以 `poll` 做為主要正式執行方式，因為 NAS 或內部伺服器只需要主動連外到 Telegram API，不需要把內網服務公開給外部。

## 分層

```text
Telegram Adapter
接收 update、送出 Telegram message。

Access Control
檢查 Telegram user id，未授權使用者不會進入任務流程。

Task Router
判斷指令與任務方向，是目前的主控層。

Executor Router
決定任務要交給 local、n8n mock 或 NAS mock。

Bridge / Tools
實際執行資料查詢、AI 草稿、文件輸出或未來的內部系統操作。
```

## 目前任務分流

所有任務都會保留 local mock 基礎處理。

```text
land   -> local + NAS mock
site   -> local + NAS mock
plant  -> local + NAS mock
cost   -> local + NAS mock

brief  -> local + n8n mock
rfi    -> local + n8n mock
review -> local + n8n mock
check  -> local + n8n mock
```

`/project` 目前仍是 local mock，用內建 mock project 資料。使用者必須先執行 `/project set [project_id]`，才可以進入 `/do`、`/find`、`/read`、`/make`、`/status` 等下一層任務。

## 指令

管理與權限：

```text
/start
/whoami
/policy
/auth list
/auth add [telegram_user_id]
/auth remove [telegram_user_id]
```

專案：

```text
/project set [project_id]
/project info
```

任務：

```text
/list [task_type]
/find [keywords]
/do [task_type] [content]
/read last
/read [job_id]
/make summary
/make report [job_id]
/status
/cancel
```

目前 task type：

```text
land
site
plant
cost
rfi
brief
review
check
```

## 環境變數

先複製範例檔：

```bash
cp .env.example .env
```

必要設定：

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
TELEGRAM_POLL_DELETE_WEBHOOK=false
TELEGRAM_OWNER_ID=your_telegram_user_id
AI_PROVIDER=mock
PORT=3000
```

如果要改用 OpenAI：

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

本機 `.env` 不應提交到 git。

## 開發

安裝依賴：

```bash
npm install
```

型別檢查：

```bash
npm run typecheck
```

建置：

```bash
npm run build
```

## Poll 模式

適合公司 NAS、內部伺服器或本機長駐：

```bash
npm run poll
```

流程：

```text
Bot 主動呼叫 Telegram getUpdates
-> 收到訊息
-> 權限檢查
-> Task Router
-> 回覆 Telegram
```

注意事項：

```text
同一個 TELEGRAM_BOT_TOKEN 不要在多個地方同時跑 poll。
正式放到 NAS 時，建議用服務管理器或容器方式維持常駐與自動重啟。
如果同一個 bot 曾設定 webhook，poll 啟動時會提示；只有在 TELEGRAM_POLL_DELETE_WEBHOOK=true 時才會自動移除 webhook。
```

## Webhook 模式

如果 bot backend 部署在有公開 HTTPS 的環境，可以使用 webhook：

```bash
npm run dev
```

設定 webhook：

```bash
npm run set-webhook -- https://your-domain.example
```

實際 webhook endpoint：

```text
https://your-domain.example/telegram/webhook
```

如果 bot 主要跑在公司內網，且不打算公開 NAS，通常不需要 webhook。

## 安全

目前安全設計：

```text
TELEGRAM_OWNER_ID 是 owner。
ALLOWED_TELEGRAM_USER_IDS 可設定固定白名單。
/auth add 可把信任使用者寫入 data/security_config.json。
未授權使用者不會進入 Task Router，也不會呼叫 AI 或 bridge。
```

不要提交：

```text
.env
data/security_config.json
data/task_state.json
poll log
node_modules
dist
```

## 目前狀態

已完成：

```text
Telegram poll / webhook 入口
權限檢查
Task Router
Project gate
Local mock task flow
n8n mock bridge
NAS mock bridge
TypeScript typecheck
本機 task/project 狀態持久化
```

尚未完成：

```text
正式 NAS bridge
正式 n8n webhook client
正式專案索引
正式任務資料庫
正式文件輸出流程
```

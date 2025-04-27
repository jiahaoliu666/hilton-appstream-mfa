# Next.js 應用 - AWS Cognito 身份驗證

這是一個使用 Next.js 和 AWS Cognito 進行身份驗證的示例應用。

## 環境設置

在運行此應用之前，請設置以下環境變數。創建一個 `.env.local` 文件在項目根目錄下，並添加以下內容：

```
# API 配置
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# AWS Cognito 配置
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-southeast-1_xxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-southeast-1
```

請用您實際的 AWS Cognito 用戶池 ID、客戶端 ID 和區域替換示例值。

## 安裝依賴

```bash
npm install
# 或
yarn
```

## 開發

```bash
npm run dev
# 或
yarn dev
```

應用將在 [http://localhost:3000](http://localhost:3000) 運行。

## 構建

```bash
npm run build
npm start
# 或
yarn build
yarn start
```

## AWS Cognito 設置指南

1. 在 AWS 管理控制台中創建一個 Cognito 用戶池
2. 在「應用程序客戶端」頁面創建一個應用客戶端
3. 記錄下用戶池 ID，區域和應用客戶端 ID
4. 更新 `.env.local` 文件中的 Cognito 配置

## 功能特性

- 用戶登入
- 會話持久化
- 受保護的路由
- JWT 令牌管理
- API 請求身份驗證

## 專案結構

- `src/pages/index.tsx` - 主頁面組件，顯示 "Hello World"
- `src/styles/globals.css` - 全局樣式文件
- `src/pages/_app.tsx` - 應用程式入口文件

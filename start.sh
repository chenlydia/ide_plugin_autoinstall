#!/bin/bash

# 定义要下载的插件数组
extensions=(
  "Prettier - Code formatter",
  "ESLint"
)


# 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo "错误: 需要 Node.js"
        exit 1
    fi
    
    # 检查 Playwright
    if ! npm list playwright &> /dev/null; then
        echo "安装 Playwright..."
        npm init -y
        npm install playwright
        # 安装浏览器
        npx playwright install
    fi

node src/start.js --extensions="${extensions[*]}"

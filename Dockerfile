FROM node:20-alpine

WORKDIR /app

# 先复制 package.json 再安装，避免每次都重新安装
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码
COPY . .

# 构建前端（此时 dist 已被 gitignore，nixpacks 不会再触发）
RUN chmod +x node_modules/.bin/vite && npm run build

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server/index.js"]

# ---------- deps 阶段：安装依赖 ----------
# node:22 是 pnpm 11 的最低要求（node:sqlite 内置模块）
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# standalone 输出只需要生产依赖
RUN pnpm install --frozen-lockfile --prod=false

# ---------- build 阶段：构建 ----------
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ---------- runner 阶段：最小运行时 ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# standalone 产物自包含，无需 node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]

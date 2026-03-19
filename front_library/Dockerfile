# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制 package.json 利用 Docker 层缓存
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# 复制全部源码并构建
COPY . .

# 构建时的环境变量（可按需修改）
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage 2: Run ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 从构建阶段复制产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# 构建阶段
FROM node:16-alpine as builder

# 设置Alpine镜像源为国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /app

# 设置npm国内镜像源和超时配置
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# 复制依赖文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖，因为构建需要vue-cli-service）
RUN npm ci --timeout=600000 || \
    (echo "Retrying npm install..." && \
     npm cache clean --force && \
     npm ci --timeout=600000)

# 复制源代码和环境配置
COPY . .
COPY env.production .env.production

# 构建生产版本
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 设置Alpine镜像源为国内镜像，提高下载速度
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装curl用于健康检查，添加超时和重试机制
RUN apk update && \
    apk add --no-cache --timeout=300 curl || \
    (echo "Retrying package installation..." && \
     apk update && \
     apk add --no-cache curl)

# 复制构建文件到nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建nginx日志目录
RUN mkdir -p /var/log/nginx

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"] 
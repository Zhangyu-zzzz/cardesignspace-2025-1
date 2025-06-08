# 🚀 Car Design Space - 服务器部署指南

## 📋 目录
- [服务器要求](#服务器要求)
- [域名配置](#域名配置)
- [环境准备](#环境准备)
- [项目部署](#项目部署)
- [Nginx配置](#nginx配置)
- [SSL证书配置](#ssl证书配置)
- [数据库配置](#数据库配置)
- [启动服务](#启动服务)
- [监控和维护](#监控和维护)

## 🖥️ 服务器要求

### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 50GB SSD
- **带宽**: 5Mbps
- **操作系统**: Ubuntu 20.04+ / CentOS 7+

### 推荐配置
- **CPU**: 4核心
- **内存**: 8GB RAM
- **存储**: 100GB SSD
- **带宽**: 10Mbps+

## 🌐 域名配置

### 1. DNS解析设置
在你的域名管理面板添加以下记录：

```
类型    主机记录    记录值
A       @          服务器IP地址
A       www        服务器IP地址
CNAME   api        www.cardesignspace.com
```

### 2. 验证域名解析
```bash
# 检查域名解析
dig www.cardesignspace.com
nslookup www.cardesignspace.com
```

## 🔧 环境准备

### 1. 连接服务器
```bash
ssh root@你的服务器IP
```

### 2. 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 3. 安装必需软件
```bash
# 安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt install nginx -y

# 安装MySQL
sudo apt install mysql-server -y

# 安装Git
sudo apt install git -y

# 安装certbot (SSL证书)
sudo apt install certbot python3-certbot-nginx -y
```

### 4. 创建应用用户
```bash
# 创建专用用户
sudo adduser cardesign
sudo usermod -aG sudo cardesign

# 切换到应用用户
su - cardesign
```

## 📦 项目部署

### 1. 克隆项目
```bash
cd /home/cardesign
git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025.git
cd cardesignspace-2025
```

### 2. 配置环境变量
```bash
# 复制环境配置模板
cp env.example .env

# 编辑生产环境配置
nano .env
```

生产环境配置示例：
```bash
# ===========================================
# 🚀 Car Design Space - 生产环境配置
# ===========================================

NODE_ENV=production
APP_NAME="Car Design Space"
APP_VERSION=1.0.0

# 服务器配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
VUE_APP_API_URL=https://www.cardesignspace.com/api
VUE_APP_API_BASE_URL=https://www.cardesignspace.com

# JWT配置
JWT_SECRET=你的超级安全密钥-生产环境专用-请修改
JWT_EXPIRES_IN=7d

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=cardesign_user
DB_PASSWORD=你的数据库密码

# 腾讯云COS配置
TENCENT_SECRET_ID=你的腾讯云SecretID
TENCENT_SECRET_KEY=你的腾讯云SecretKey
COS_BUCKET=你的COS存储桶名称
COS_REGION=ap-shanghai
COS_DOMAIN=https://你的COS存储桶域名

# CORS配置
CORS_ORIGIN=https://www.cardesignspace.com,https://cardesignspace.com

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
```

### 3. 安装依赖
```bash
# 安装后端依赖
cd backend
npm install --production

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build
```

## ⚙️ Nginx配置

### 1. 创建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/cardesignspace
```

Nginx配置内容：
```nginx
# Car Design Space - Nginx配置
server {
    listen 80;
    server_name www.cardesignspace.com cardesignspace.com;
    
    # 重定向到HTTPS (SSL配置后启用)
    # return 301 https://$server_name$request_uri;
    
    # 静态文件目录
    root /home/cardesign/cardesignspace-2025/frontend/dist;
    index index.html;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 2. 启用站点配置
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 SSL证书配置

### 1. 获取免费SSL证书
```bash
# 使用Let's Encrypt获取SSL证书
sudo certbot --nginx -d www.cardesignspace.com -d cardesignspace.com
```

### 2. 自动续期
```bash
# 测试自动续期
sudo certbot renew --dry-run

# 添加定时任务
sudo crontab -e
```

添加以下行到crontab：
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🗄️ 数据库配置

### 1. 配置MySQL
```bash
# 安全初始化
sudo mysql_secure_installation

# 登录MySQL
sudo mysql
```

### 2. 创建数据库和用户
```sql
-- 创建数据库
CREATE DATABASE cardesignspace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER 'cardesign_user'@'localhost' IDENTIFIED BY '你的数据库密码';

-- 授权
GRANT ALL PRIVILEGES ON cardesignspace.* TO 'cardesign_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 3. 导入数据结构
```bash
# 如果有SQL文件，导入数据库结构
mysql -u cardesign_user -p cardesignspace < backend/sql/database.sql
```

## 🚀 启动服务

### 1. 使用PM2启动后端
```bash
cd /home/cardesign/cardesignspace-2025/backend

# 启动应用
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup
pm2 save
```

### 2. PM2配置文件
确保`backend/ecosystem.config.js`内容正确：
```javascript
module.exports = {
  apps: [{
    name: 'cardesignspace-backend',
    script: 'src/app.js',
    cwd: '/home/cardesign/cardesignspace-2025/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### 3. 检查服务状态
```bash
# 查看PM2状态
pm2 status

# 查看日志
pm2 logs

# 查看Nginx状态
sudo systemctl status nginx

# 查看MySQL状态
sudo systemctl status mysql
```

## 📊 监控和维护

### 1. 系统监控
```bash
# 安装htop
sudo apt install htop -y

# 监控系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 2. 日志管理
```bash
# PM2 日志
pm2 logs --lines 100

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -f
```

### 3. 备份脚本
创建定期备份脚本：
```bash
nano /home/cardesign/backup.sh
```

备份脚本内容：
```bash
#!/bin/bash
# Car Design Space 备份脚本

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/cardesign/backups"
PROJECT_DIR="/home/cardesign/cardesignspace-2025"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u cardesign_user -p你的数据库密码 cardesignspace > $BACKUP_DIR/db_backup_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz $PROJECT_DIR/backend/uploads/

# 清理30天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $DATE"
```

设置备份定时任务：
```bash
chmod +x /home/cardesign/backup.sh
crontab -e
```

添加每日备份：
```bash
0 2 * * * /home/cardesign/backup.sh >> /home/cardesign/backup.log 2>&1
```

### 4. 更新部署脚本
```bash
nano /home/cardesign/deploy.sh
```

部署脚本内容：
```bash
#!/bin/bash
# Car Design Space 自动部署脚本

echo "🚀 开始部署 Car Design Space..."

cd /home/cardesign/cardesignspace-2025

# 拉取最新代码
git pull origin main

# 安装/更新依赖
echo "📦 更新后端依赖..."
cd backend
npm install --production

echo "🎨 构建前端..."
cd ../frontend
npm install
npm run build

# 重启服务
echo "🔄 重启服务..."
pm2 restart cardesignspace-backend

echo "✅ 部署完成！"
```

## 🔧 故障排除

### 常见问题解决

1. **端口被占用**
```bash
sudo lsof -i :3000
sudo kill -9 PID
```

2. **权限问题**
```bash
sudo chown -R cardesign:cardesign /home/cardesign/cardesignspace-2025
sudo chmod -R 755 /home/cardesign/cardesignspace-2025
```

3. **Nginx配置错误**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. **SSL证书问题**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 📞 支持

如果遇到问题，请检查：
1. 服务器日志：`pm2 logs`
2. Nginx日志：`sudo tail -f /var/log/nginx/error.log`
3. 系统资源：`htop`, `df -h`
4. 网络连接：`curl localhost:3000`

---

🎉 **恭喜！** 按照以上步骤，你的Car Design Space项目应该已经成功部署到服务器并可以通过www.cardesignspace.com访问了！ 
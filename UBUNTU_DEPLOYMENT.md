# CarDesignSpace Ubuntu 部署指南

## 🚀 快速解决当前问题

您当前遇到的问题是 `vue-cli-service: command not found`，请在服务器上执行：

```bash
# 1. 确保在前端目录
cd /root/cardesignspace/frontend

# 2. 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 全局安装Vue CLI
npm install -g @vue/cli

# 4. 重新构建
npm run build
```

## 🔧 Ubuntu系统完整部署流程

### 第一步：系统准备
```bash
# 更新系统
apt update && apt upgrade -y

# 安装基础工具
apt install -y curl wget git build-essential
```

### 第二步：安装Node.js
```bash
# 安装Node.js 16.x
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# 验证安装
node --version
npm --version
```

### 第三步：安装全局工具
```bash
# 安装Vue CLI和PM2
npm install -g @vue/cli pm2

# 安装其他工具
apt install -y mysql-client nginx
```

### 第四步：项目部署
```bash
# 1. 克隆项目（如果还没有）
cd /root
git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025-1.git cardesignspace
cd cardesignspace

# 2. 安装后端依赖
cd backend
npm install --production

# 3. 安装前端依赖并构建
cd ../frontend
npm install
npm run build
```

### 第五步：配置环境变量

**后端环境配置**:
```bash
cd /root/cardesignspace/backend
cp env.production .env
nano .env
```

修改以下配置：
```bash
DB_HOST=您的MySQL内网IP
DB_USER=您的数据库用户名
DB_PASSWORD=您的数据库密码
JWT_SECRET=强密码32位以上
TENCENT_SECRET_ID=您的腾讯云SecretId
TENCENT_SECRET_KEY=您的腾讯云SecretKey
COS_BUCKET=您的存储桶名称
```

**前端环境配置**:
```bash
cd /root/cardesignspace/frontend
cp env.production .env.production
nano .env.production
```

修改：
```bash
VUE_APP_API_BASE_URL=http://您的服务器IP:3000
```

### 第六步：启动服务

**启动后端**:
```bash
cd /root/cardesignspace/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**配置Nginx**:
```bash
# 复制配置文件
cp /root/cardesignspace/nginx.conf /etc/nginx/sites-available/cardesignspace
ln -s /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/

# 修改配置文件中的域名/IP
nano /etc/nginx/sites-available/cardesignspace

# 测试并启动Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### 第七步：配置防火墙（Ubuntu使用ufw）
```bash
# 启用防火墙
ufw enable

# 开放端口
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # 后端API

# 查看状态
ufw status
```

## 🔍 验证部署

```bash
# 检查服务状态
pm2 status
systemctl status nginx

# 检查端口
netstat -tlnp | grep :80
netstat -tlnp | grep :3000

# 测试访问
curl http://localhost:3000/api/health
curl http://localhost
```

## 🛠️ 故障排查

### 1. 前端构建失败
```bash
# 检查Node.js版本
node --version  # 应该是v16.x

# 清理重装
cd /root/cardesignspace/frontend
rm -rf node_modules package-lock.json dist
npm cache clean --force
npm install
npm run build
```

### 2. 后端启动失败
```bash
# 查看PM2日志
pm2 logs

# 检查环境变量
cd /root/cardesignspace/backend
cat .env

# 测试数据库连接
mysql -h数据库地址 -u用户名 -p
```

### 3. Nginx配置问题
```bash
# 检查配置语法
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log

# 重启服务
systemctl restart nginx
```

## 📊 Ubuntu与CentOS命令对照

| 功能 | Ubuntu | CentOS |
|------|--------|--------|
| 包管理器 | apt | yum |
| 服务管理 | systemctl | systemctl |
| 防火墙 | ufw | firewall-cmd |
| 日志查看 | journalctl | journalctl |

## 💡 优化建议

1. **内存优化**: 如果服务器内存较小，建议构建完成后删除前端 `node_modules`
2. **缓存优化**: 配置Nginx静态文件缓存
3. **日志管理**: 定期清理PM2和Nginx日志
4. **备份策略**: 定期备份数据库和重要配置文件

现在您可以按照上面的步骤重新构建前端项目了！ 
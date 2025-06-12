# 🚀 Car Design Space 部署指南

## 📋 部署步骤

### 1. 上传部署包到服务器
```bash
# 将整个部署包上传到服务器
scp -r cardesignspace-deploy-* root@your-server:/root/
```

### 2. 在服务器上解压并安装
```bash
# 登录服务器
ssh root@your-server

# 进入部署包目录
cd /root/cardesignspace-deploy-*

# 运行安装脚本
./install-on-server.sh
```

### 3. 配置环境变量
```bash
# 复制环境配置模板
cp server-env-template /root/auto-gallery/backend/.env

# 编辑配置文件
nano /root/auto-gallery/backend/.env
```

### 4. 运行部署脚本
```bash
# 执行部署
./deploy-production.sh
```

### 5. 配置SSL证书
```bash
# 获取Let's Encrypt证书
certbot --nginx -d www.cardesignspace.com -d cardesignspace.com
```

## 🔧 配置要点

### 数据库配置
- 确保MySQL已安装并运行
- 创建数据库和用户
- 配置正确的连接信息

### 腾讯云COS配置
- 获取Secret ID和Secret Key
- 配置存储桶信息
- 设置CORS策略

### 域名配置
- 确保域名已解析到服务器IP
- 配置Nginx虚拟主机
- 获取SSL证书

## 🛠️ 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs cardesignspace-backend

# 重启服务
pm2 restart cardesignspace-backend

# 重启Nginx
systemctl restart nginx
```

## 🔍 故障排除

### 服务无法启动
1. 检查环境配置文件
2. 查看PM2日志
3. 检查端口占用

### 网站无法访问
1. 检查Nginx配置
2. 确认防火墙设置
3. 验证SSL证书

### API请求失败
1. 检查后端服务状态
2. 验证数据库连接
3. 查看错误日志

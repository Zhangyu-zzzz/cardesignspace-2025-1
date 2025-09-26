# CarDesignSpace 腾讯云部署指南

## 🚀 部署概览

本指南将帮助您将 CarDesignSpace 项目部署到腾讯云服务器上，实现生产环境运行。

## 📋 准备工作

### 1. 腾讯云资源准备

#### 云服务器 CVM
- **推荐配置**: 2核4G内存，40G SSD硬盘
- **操作系统**: CentOS 7.6 64位
- **带宽**: 5Mbps以上

#### 云数据库 MySQL
- **版本**: MySQL 5.7或8.0
- **配置**: 1核2G内存起步
- **存储**: 20GB起步

#### 对象存储 COS
- **存储桶**: 创建一个用于存储图片文件
- **访问权限**: 公有读，私有写

#### 域名（可选）
- 备案域名用于绑定服务器IP
- SSL证书（如需HTTPS）

### 2. 获取必要信息

在开始部署前，请准备以下信息：

```
# 服务器信息
服务器公网IP: xxx.xxx.xxx.xxx
服务器内网IP: xxx.xxx.xxx.xxx

# 数据库信息
MySQL内网地址: xxx.xxx.xxx.xxx
数据库名: cardesignspace
数据库用户名: your_username
数据库密码: your_password

# 腾讯云API密钥
SecretId: AKID...
SecretKey: xxxx...

# COS存储桶信息
存储桶名称: your-bucket-name-appid
所属地域: ap-beijing
访问域名: https://your-bucket-name-appid.cos.ap-beijing.myqcloud.com
```

## 🔧 部署步骤

### 第一步：连接服务器

```bash
# 使用SSH连接到腾讯云服务器
ssh root@您的服务器IP
```

### 第二步：自动部署（推荐）

1. 上传项目文件到服务器：
```bash
# 方法1：使用git（推荐）
cd /root
git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025-1.git cardesignspace
cd cardesignspace

# 方法2：使用scp上传
# scp -r ./cardesignspace-2025-1 root@服务器IP:/root/cardesignspace
```

2. 运行自动部署脚本：
```bash
chmod +x deploy-tencent-cloud.sh
./deploy-tencent-cloud.sh
```

### 第三步：配置环境变量

1. 配置后端环境变量：
```bash
cd /root/cardesignspace/backend
cp env.production .env
nano .env
```

请修改以下配置项：
```bash
# 数据库配置
DB_HOST=您的MySQL内网IP
DB_USER=您的数据库用户名
DB_PASSWORD=您的数据库密码

# JWT密钥（请生成强密码）
JWT_SECRET=your-super-strong-production-jwt-secret-key

# 腾讯云COS配置
TENCENT_SECRET_ID=您的SecretId
TENCENT_SECRET_KEY=您的SecretKey
COS_BUCKET=您的存储桶名称
```

2. 配置前端环境变量：
```bash
cd /root/cardesignspace/frontend
cp env.production .env.production
nano .env.production
```

请修改以下配置项：
```bash
# API接口地址
VUE_APP_API_BASE_URL=http://您的服务器IP:3000
# 如果有域名：
# VUE_APP_API_BASE_URL=https://您的域名
```

### 第四步：数据库初始化

1. 连接到MySQL数据库：
```bash
mysql -h您的MySQL地址 -u用户名 -p
```

2. 创建数据库：
```sql
CREATE DATABASE cardesignspace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cardesignspace;
```

3. 运行数据库迁移（如果有）：
```bash
cd /root/cardesignspace/backend
npm run migrate  # 或者导入SQL文件
```

### 第五步：构建和启动服务

1. 构建前端：
```bash
cd /root/cardesignspace/frontend
npm run build
```

2. 启动后端服务：
```bash
cd /root/cardesignspace/backend
pm2 start ecosystem.config.js
pm2 save  # 保存PM2配置
pm2 startup  # 设置开机自启
```

### 第六步：配置Nginx

1. 安装Nginx：
```bash
yum install -y nginx
```

2. 配置Nginx：
```bash
cp /root/cardesignspace/nginx.conf /etc/nginx/conf.d/cardesignspace.conf
nano /etc/nginx/conf.d/cardesignspace.conf
```

修改配置文件中的域名/IP地址。

3. 启动Nginx：
```bash
nginx -t  # 测试配置
systemctl start nginx
systemctl enable nginx  # 开机自启
```

### 第七步：配置防火墙

```bash
# 开放必要端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

## 🔍 验证部署

1. 检查服务状态：
```bash
# 检查PM2进程
pm2 status

# 检查Nginx状态
systemctl status nginx

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :3000
```

2. 测试访问：
```bash
# 测试后端API
curl http://localhost:3000/api/health

# 浏览器访问前端
http://您的服务器IP
```

## 🛠️ 常见问题排查

### 1. 服务无法启动

```bash
# 查看PM2日志
pm2 logs

# 查看Nginx错误日志
tail -f /var/log/nginx/error.log

# 检查端口占用
lsof -i :3000
```

### 2. 数据库连接失败

```bash
# 测试数据库连接
mysql -h数据库地址 -u用户名 -p

# 检查网络安全组设置
# 确保MySQL端口3306对内网开放
```

### 3. 文件上传失败

```bash
# 检查COS配置
# 验证SecretId和SecretKey
# 确保存储桶权限设置正确
```

## 📊 性能优化

### 1. 开启Nginx Gzip压缩

在nginx.conf中添加：
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### 2. 配置PM2集群模式

修改ecosystem.config.js：
```javascript
instances: 'max',  // 使用所有CPU核心
exec_mode: 'cluster'
```

### 3. 数据库优化

- 添加适当索引
- 定期备份数据
- 监控慢查询

## 🔐 安全加固

1. 更改默认SSH端口
2. 配置密钥登录
3. 安装fail2ban防暴力破解
4. 定期更新系统补丁
5. 配置SSL证书（HTTPS）

## 📱 监控和维护

```bash
# 查看系统资源使用情况
htop
df -h
free -h

# 查看应用日志
pm2 logs
tail -f /var/log/nginx/access.log

# 定期备份数据库
mysqldump -h数据库地址 -u用户名 -p cardesignspace > backup_$(date +%Y%m%d).sql
```

## 🆘 技术支持

如果在部署过程中遇到问题，请：

1. 检查日志文件获取错误信息
2. 查看GitHub Issues
3. 联系技术支持团队

---

## 📝 部署检查清单

- [ ] 腾讯云服务器已购买并配置
- [ ] MySQL数据库已创建
- [ ] COS存储桶已创建
- [ ] 项目代码已上传到服务器
- [ ] 环境变量已正确配置
- [ ] 数据库已初始化
- [ ] 前端已构建
- [ ] 后端服务已启动
- [ ] Nginx已配置并启动
- [ ] 防火墙端口已开放
- [ ] 域名已解析（如有）
- [ ] SSL证书已配置（如有）
- [ ] 服务访问测试通过

完成以上步骤后，您的CarDesignSpace项目就成功部署到腾讯云了！🎉 
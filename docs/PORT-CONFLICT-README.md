# 端口冲突问题解决方案

## 问题描述
部署过程中出现端口3000被占用的问题，导致后端服务无法正常启动。

## 错误信息
```
Error: listen EADDRINUSE: address already in use :::3000
```

## 解决方案

### 方案1: 一键解决（推荐）
执行综合解决脚本：
```bash
chmod +x final-fix-deployment.sh
./final-fix-deployment.sh
```

### 方案2: 分步解决

#### 步骤1: 强制清理端口
```bash
chmod +x force-kill-port.sh
./force-kill-port.sh
```

#### 步骤2: 单进程启动
```bash
chmod +x start-single-service.sh
./start-single-service.sh
```

## 脚本说明

### final-fix-deployment.sh
- **功能**: 综合解决方案，包含清理、启动和验证
- **特点**: 
  - 彻底清理所有相关进程
  - 使用单实例模式避免冲突
  - 自动验证部署结果
  - 提供详细的状态报告

### force-kill-port.sh
- **功能**: 强制清理端口3000占用
- **使用场景**: 当端口被顽固占用时
- **操作**: 
  - 杀死所有PM2进程
  - 清理Node.js相关进程
  - 强制释放端口3000

### start-single-service.sh
- **功能**: 单进程模式启动服务
- **特点**: 
  - 使用fork模式而非cluster
  - 限制重启次数避免循环重启
  - 验证环境配置完整性

## 部署后检查

### 1. 检查服务状态
```bash
pm2 list
```

### 2. 检查端口监听
```bash
sudo netstat -tlnp | grep :3000
```

### 3. 查看服务日志
```bash
pm2 logs cardesignspace-final --lines 20
```

### 4. 测试网站访问
```bash
curl -I http://www.cardesignspace.com
```

## 服务管理命令

```bash
# 查看服务状态
pm2 list

# 重启服务
pm2 restart cardesignspace-final

# 停止服务
pm2 stop cardesignspace-final

# 查看实时日志
pm2 logs cardesignspace-final --follow

# 重载服务（零停机时间）
pm2 reload cardesignspace-final
```

## 故障排除

### 如果服务仍无法启动
1. 检查.env文件是否存在且配置正确
2. 验证数据库连接是否正常
3. 确认Node.js版本兼容性
4. 检查文件权限设置

### 如果网站无法访问
1. 检查Nginx配置和状态
2. 验证防火墙设置
3. 确认域名解析正确
4. 检查SSL证书配置

## 注意事项

- ⚠️ 强制清理脚本会杀死所有相关Node.js进程，请谨慎使用
- 🔒 确保在生产环境中有适当的备份
- 📝 定期检查日志文件大小，避免磁盘空间不足
- 🔄 建议设置日志轮转以管理日志文件大小 
# COS配置诊断脚本使用说明

## 📍 运行位置

诊断脚本可以在**本地开发环境**或**生产服务器**上运行，用于检查COS配置是否正确。

## 🖥️ 方式一：本地开发环境运行

### 前提条件
- 项目已克隆到本地
- 已安装Node.js和npm依赖
- 项目根目录或backend目录下有`.env`文件

### 运行步骤

```bash
# 1. 进入项目根目录
cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 2. 进入backend目录
cd backend

# 3. 运行诊断脚本
node scripts/check-cos-config.js
```

### 检查内容
- ✅ 检查本地`.env`文件中的COS配置
- ✅ 测试COS连接（使用本地配置）
- ⚠️ 注意：如果本地`.env`配置与服务器不同，结果可能不同

---

## 🖥️ 方式二：生产服务器运行（推荐）

### 前提条件
- 已通过SSH连接到生产服务器
- 服务器上已部署项目代码
- 服务器上有`.env`文件（通常在`/opt/auto-gallery/backend/.env`）

### 运行步骤

```bash
# 1. SSH连接到服务器
ssh root@您的服务器IP
# 或
ssh root@49.235.98.5  # 根据实际IP

# 2. 进入项目目录
cd /opt/auto-gallery/backend

# 3. 运行诊断脚本
node scripts/check-cos-config.js
```

### 检查内容
- ✅ 检查服务器上的实际COS配置
- ✅ 测试实际生产环境的COS连接
- ✅ 验证密钥权限是否足够
- ✅ 这是最准确的诊断方式

---

## 📋 脚本输出说明

### 成功输出示例
```
=== COS配置检查 ===

✅ TENCENT_SECRET_ID: AKID...xxxx
✅ TENCENT_SECRET_KEY: xxxx...xxxx
✅ COS_BUCKET: cardesignspace-cos-1-1259492452
✅ COS_REGION: ap-shanghai

=== 测试COS连接 ===
尝试连接存储桶: cardesignspace-cos-1-1259492452 (区域: ap-shanghai)
✅ COS连接成功!
   存储桶名称: cardesignspace-cos-1-1259492452
   区域: ap-shanghai
   对象数量: 1

✅ COS配置正确，可以正常使用!
```

### 失败输出示例
```
=== COS配置检查 ===

❌ TENCENT_SECRET_ID: 未设置 (无效)
❌ COS_BUCKET: test-1250000000 (无效)

=== 测试COS连接 ===
❌ COS连接失败:
   错误代码: CredentialsError
   HTTP状态: 403
   错误信息: 密钥验证失败

   可能的原因:
   - SecretId或SecretKey错误
   - 密钥已过期或被禁用
```

---

## 🔧 常见问题排查

### 问题1: 环境变量未设置
**症状**: 显示"未设置"或"无效"

**解决方案**:
1. 检查`.env`文件是否存在
2. 确认环境变量名称正确（大小写敏感）
3. 确认环境变量值不是默认值（如`your-secret-id`）

### 问题2: COS连接失败 - 403错误
**症状**: HTTP状态码403

**解决方案**:
1. 检查密钥是否正确
2. 检查密钥是否有COS上传权限
3. 在腾讯云控制台验证密钥状态

### 问题3: COS连接失败 - 404错误
**症状**: HTTP状态码404

**解决方案**:
1. 检查存储桶名称是否正确
2. 检查区域配置是否正确
3. 在腾讯云控制台确认存储桶存在

### 问题4: 找不到.env文件
**症状**: 脚本提示"未找到.env文件"

**解决方案**:
1. 确认`.env`文件路径正确
2. 检查文件权限（`ls -la .env`）
3. 手动指定路径：`require('dotenv').config({ path: '/path/to/.env' })`

---

## 📝 环境变量配置示例

### 本地开发环境 (.env)
```bash
# 腾讯云COS配置
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
COS_BUCKET=cardesignspace-cos-1-1259492452
COS_REGION=ap-shanghai
COS_DOMAIN=https://cardesignspace-cos-1-1259492452.cos.ap-shanghai.myqcloud.com
```

### 生产服务器环境 (.env)
```bash
# 腾讯云COS配置（生产环境）
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
COS_BUCKET=cardesignspace-cos-1-1259492452
COS_REGION=ap-shanghai
COS_DOMAIN=https://cardesignspace-cos-1-1259492452.cos.ap-shanghai.myqcloud.com
```

---

## 🚀 快速诊断命令

### 本地环境
```bash
cd backend && node scripts/check-cos-config.js
```

### 生产服务器
```bash
ssh root@服务器IP "cd /opt/auto-gallery/backend && node scripts/check-cos-config.js"
```

---

## ⚠️ 注意事项

1. **敏感信息**: 脚本会隐藏密钥的中间部分，只显示前后4个字符
2. **网络要求**: 脚本需要能够访问腾讯云COS服务
3. **权限要求**: 密钥需要有COS的读取权限（至少需要`GetBucket`权限）
4. **环境差异**: 本地和生产环境的配置可能不同，建议在服务器上运行诊断

---

## 📞 获取帮助

如果诊断脚本显示配置正确，但上传仍然失败，请：
1. 查看服务器日志：`pm2 logs cardesignspace-backend`
2. 查看错误日志：`tail -f backend/logs/error.log`
3. 检查nginx日志：`tail -f /var/log/nginx/cardesignspace_error.log`


# 清除浏览器缓存解决JWT Token问题

## 🎯 问题根因
**JWT密钥不匹配** - 前端使用的Token是用旧密钥生成的，服务器现在使用新密钥

## 🔧 解决步骤

### 方法1：完全清除浏览器数据（推荐）

1. **打开浏览器开发者工具**
   - 按 `F12` 或右键点击页面选择"检查"

2. **清除所有网站数据**
   - 进入 `Application` 标签页
   - 左侧找到 `Storage` → `Local Storage`
   - 点击 `https://www.cardesignspace.com`
   - 右键选择 `Clear` 删除所有数据

3. **清除Session Storage**
   - 在 `Storage` → `Session Storage`
   - 同样清除 `https://www.cardesignspace.com` 的数据

4. **清除Cookies**
   - 在 `Application` → `Cookies`
   - 删除所有相关的cookies

### 方法2：使用浏览器隐私模式

1. **打开隐私/无痕模式**
   - Chrome: `Ctrl+Shift+N` (Windows) 或 `Cmd+Shift+N` (Mac)
   - Firefox: `Ctrl+Shift+P` (Windows) 或 `Cmd+Shift+P` (Mac)

2. **访问网站**
   - 直接访问 https://www.cardesignspace.com
   - 重新登录

### 方法3：硬刷新页面

1. **硬刷新**
   - Windows: `Ctrl+F5` 或 `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

2. **清除缓存后重新登录**

## 🎉 验证修复

完成上述步骤后：

1. **重新登录**
   - 访问 https://www.cardesignspace.com/login
   - 使用原有账号密码登录

2. **测试上传**
   - 访问 https://www.cardesignspace.com/upload
   - 选择车型和图片
   - 点击上传

3. **检查结果**
   - 应该不再出现500错误
   - 图片成功上传到服务器

## 📋 技术说明

### 问题详情：
- **服务器JWT密钥**: `production-jwt-secret-key-2024-cardesignspace`
- **前端Token**: 使用旧密钥生成，签名无效
- **错误信息**: `invalid signature`

### 解决原理：
清除浏览器缓存后，前端会重新获取新的Token，使用正确的JWT密钥进行签名验证。

## 🚨 如果仍有问题

如果清除缓存后仍然无法上传，请：
1. 检查浏览器控制台的错误信息
2. 确认是否成功重新登录
3. 提供具体的错误步骤

我会进一步排查问题。



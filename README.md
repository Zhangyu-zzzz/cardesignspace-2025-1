# 汽车设计空间 (Car Design Space)

这是一个全栈Web应用程序，用于展示和分享汽车设计图片。

## 项目结构

- `frontend/` - Vue.js前端应用
- `backend/` - Node.js/Express后端API
- `start.sh` - Linux/Mac启动脚本
- `start.bat` - Windows启动脚本

## 功能特性

- 用户注册和登录
- 图片上传和管理
- 汽车品牌和车型分类
- 用户收藏和点赞功能
- 响应式设计

## 技术栈

### 前端
- Vue.js 3
- Vue Router
- Axios
- Element Plus

### 后端
- Node.js
- Express.js
- MySQL
- MongoDB

## 快速开始

### 环境要求
- Node.js 16+
- MySQL 8.0+
- MongoDB 4.0+

### 安装和运行

1. 克隆项目
```bash
git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025.git
cd cardesignspace-2025
```

2. 安装依赖
```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

3. 配置环境变量
```bash
# 复制环境变量模板
cp backend/env.example backend/.env
# 编辑.env文件，配置数据库连接等信息
```

4. 启动应用
```bash
# 在项目根目录下
# Linux/Mac
./start.sh

# Windows
start.bat
```

## 部署

项目支持Docker部署，请参考各目录下的Dockerfile文件。

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License 
@echo off
echo ====================================
echo 开始启动汽车官方图片网站
echo ====================================

echo [提示] 请确保您的MySQL和MongoDB数据库已经启动
echo [提示] 请确保在backend目录下已创建.env文件并配置好数据库连接信息
echo.

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 创建logs目录
mkdir backend\logs 2>nul

REM 启动后端
echo [1/3] 开始安装后端依赖...
if exist backend (
  cd backend
  call npm install

  echo [2/3] 启动后端服务...
  start cmd /k "npm run dev"
  cd ..
) else (
  echo [错误] backend目录不存在，请检查项目结构
  exit /b 1
)

REM 启动前端
echo [3/3] 开始安装前端依赖并启动...
if exist frontend (
  cd frontend
  call npm install

  echo 正在启动前端服务...
  call npm run serve
) else (
  echo [错误] frontend目录不存在，请检查项目结构
  exit /b 1
)

echo 前端服务已停止，请手动关闭后端服务命令窗口 
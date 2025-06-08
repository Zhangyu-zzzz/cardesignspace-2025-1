#!/bin/bash

# ===========================================
# 🚀 Car Design Space - GitHub上传脚本
# ===========================================

echo "🚀 准备上传项目到GitHub..."

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取用户输入的GitHub用户名
read -p "请输入你的GitHub用户名: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}❌ GitHub用户名不能为空${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 使用GitHub用户名: ${GITHUB_USERNAME}${NC}"

# 设置远程仓库URL
REPO_URL="https://github.com/${GITHUB_USERNAME}/cardesignspace-2025.git"
echo -e "${BLUE}🔗 仓库地址: ${REPO_URL}${NC}"

# 检查是否已有远程仓库配置
if git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}🔄 更新远程仓库地址...${NC}"
    git remote set-url origin $REPO_URL
else
    echo -e "${YELLOW}➕ 添加远程仓库...${NC}"
    git remote add origin $REPO_URL
fi

# 检查Git状态
echo -e "${YELLOW}📊 检查Git状态...${NC}"
git status --porcelain

# 确认要推送的分支
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}🌿 当前分支: ${CURRENT_BRANCH}${NC}"

# 推送到GitHub
echo -e "${YELLOW}⬆️ 推送到GitHub...${NC}"
echo -e "${RED}⚠️ 注意：这将覆盖GitHub仓库中的所有内容${NC}"
read -p "确认要继续吗？(y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚀 开始推送...${NC}"
    
    # 强制推送到main分支（覆盖远程仓库）
    if git push -f origin $CURRENT_BRANCH; then
        echo -e "${GREEN}✅ 推送成功！${NC}"
        echo ""
        echo -e "${GREEN}🎉 项目已成功上传到GitHub！${NC}"
        echo -e "${BLUE}📂 仓库地址: ${REPO_URL}${NC}"
        echo -e "${BLUE}🌐 访问地址: https://github.com/${GITHUB_USERNAME}/cardesignspace-2025${NC}"
        echo ""
        echo -e "${YELLOW}📝 下一步操作建议：${NC}"
        echo "1. 访问GitHub仓库页面"
        echo "2. 检查README.md是否正常显示"
        echo "3. 设置仓库描述和标签"
        echo "4. 如果需要，可以设置GitHub Pages"
        echo "5. 邀请团队成员协作"
    else
        echo -e "${RED}❌ 推送失败！${NC}"
        echo -e "${YELLOW}💡 可能的解决方案：${NC}"
        echo "1. 检查GitHub仓库是否存在且有权限"
        echo "2. 检查网络连接"
        echo "3. 确认GitHub用户名拼写正确"
        echo "4. 如果仓库是私有的，可能需要使用SSH或Personal Access Token"
        exit 1
    fi
else
    echo -e "${YELLOW}❌ 操作已取消${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}📋 项目信息总结：${NC}"
echo -e "项目名称: Car Design Space"
echo -e "版本: v2.0.0" 
echo -e "主要功能: 汽车图片分享和社区交流平台"
echo -e "技术栈: Vue.js + Node.js + MySQL + MongoDB"
echo -e "部署方式: 支持Docker和传统部署" 
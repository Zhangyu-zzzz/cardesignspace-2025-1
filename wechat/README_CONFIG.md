# 微信小程序配置说明

## 配置文件

本项目包含以下配置文件：

- `project.config.json.example` - 示例配置文件（已提交到 Git）
- `project.config.json` - 实际配置文件（包含真实 appid，已添加到 .gitignore）
- `project.private.config.json` - 私有配置文件（包含敏感信息，已添加到 .gitignore）

## 首次使用

1. 复制示例配置文件：
   ```bash
   cp project.config.json.example project.config.json
   ```

2. 编辑 `project.config.json`，将 `YOUR_APPID_HERE` 替换为你的真实微信小程序 appid

3. 如果需要，创建 `project.private.config.json`（通常由微信开发者工具自动生成）

## 注意事项

- ⚠️ **不要**将包含真实 appid 的配置文件提交到 Git
- ✅ 使用 `project.config.json.example` 作为模板
- ✅ 确保 `.gitignore` 已正确配置


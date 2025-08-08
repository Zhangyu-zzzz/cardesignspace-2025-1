#!/usr/bin/env bash
set -euo pipefail

# 进入项目 backend 目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SQL_FILE="$SCRIPT_DIR/add-fk-image-assets-imageId.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "找不到 SQL 文件: $SQL_FILE" 1>&2
  exit 1
fi

# 使用 Node 脚本执行 SQL（读取 .env 中的 DB_* 配置）
node "$SCRIPT_DIR/run-sql-file.js" "$SQL_FILE" | cat

echo "完成: image_assets.imageId -> images.id 外键已确保存在（幂等）。"

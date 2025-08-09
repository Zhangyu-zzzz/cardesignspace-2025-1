#!/usr/bin/env bash
set -euo pipefail

# 快速登录 bmNAS 的 SSH 脚本（macOS 适用）
# 
# 配置方式：
#   方式1) 环境变量配置：
#     export BMNAS_HOST="your_nas_ipv6_address"
#     export BMNAS_USER="your_username"
#     export BMNAS_SSH_PASS="your_password"  # 可选
#   
#   方式2) 临时使用：
#     BMNAS_HOST="[ipv6]" BMNAS_USER="user" backend/scripts/connect-bmnas.sh
#
# 用法：
#   1) 交互输入密码：  backend/scripts/connect-bmnas.sh
#   2) 环境变量传递：  BMNAS_SSH_PASS="你的密码" backend/scripts/connect-bmnas.sh
#   3) 传递额外 SSH 参数：backend/scripts/connect-bmnas.sh -L 8080:localhost:80
#
# ⚠️  实际连接信息请查看: docs/private/credentials/nas-connection-details.md

# 配置信息（可通过环境变量覆盖）
HOST="${BMNAS_HOST:-YOUR_NAS_IPV6_ADDRESS}"
USER="${BMNAS_USER:-YOUR_USERNAME}"

# 可自定义私钥路径（默认使用本机 ~/.ssh/id_ed25519）
SSH_KEY_DEFAULT="$HOME/.ssh/id_ed25519"
SSH_KEY_PATH="${BMNAS_SSH_KEY:-$SSH_KEY_DEFAULT}"

# 构建安全的 ssh 命令（避免在 bash 3.2 下展开空数组）
SSH_CMD=(ssh -6 -o StrictHostKeyChecking=accept-new)

# 调试开关：BMNAS_SSH_DEBUG=1 会开启 -vvv
if [ "${BMNAS_SSH_DEBUG:-0}" != "0" ]; then
  SSH_CMD+=("-vvv")
fi

# 指定密钥文件（存在才添加）
if [ -f "$SSH_KEY_PATH" ]; then
  SSH_CMD+=("-i" "$SSH_KEY_PATH" -o IdentitiesOnly=yes)
fi

# 可选：强制仅使用公钥，不回退到密码
if [ "${BMNAS_FORCE_PUBKEY:-0}" != "0" ]; then
  SSH_CMD+=(
    -o PreferredAuthentications=publickey \
    -o PubkeyAuthentication=yes \
    -o PasswordAuthentication=no \
    -o KbdInteractiveAuthentication=no \
    -o ChallengeResponseAuthentication=no
  )
fi

# 仅当设置了 BMNAS_SSH_PASS 且存在 sshpass 时，才使用密码无感登录
if [ -n "${BMNAS_SSH_PASS:-}" ] && command -v sshpass >/dev/null 2>&1; then
  exec sshpass -p "$BMNAS_SSH_PASS" "${SSH_CMD[@]}" "$@" "$USER@$HOST"
else
  # 常规登录：优先尝试公钥；如失败，回退到密码交互
  [ -z "${BMNAS_SSH_PASS:-}" ] || echo "提示: 未检测到 sshpass，将使用交互式密码或公钥登录。" >&2
  exec "${SSH_CMD[@]}" "$@" "$USER@$HOST"
fi



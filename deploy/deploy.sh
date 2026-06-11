#!/usr/bin/env bash
set -euo pipefail

# AlphaFrog lilypad 部署脚本
#
# 用法：
#   ./deploy/deploy.sh <REMOTE_HOST> <REMOTE_DIR>
#
# 或设置环境变量：
#   DEPLOY_HOST=your-server DEPLOY_DIR=/var/www/alphafrog-lilypad/dist ./deploy/deploy.sh
#
# 示例：
#   ./deploy/deploy.sh my-server /var/www/alphafrog-lilypad/dist
#   DEPLOY_HOST=my-server DEPLOY_DIR=/var/www/alphafrog-lilypad/dist ./deploy/deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 从 CLI 参数或环境变量读取部署目标
REMOTE_HOST="${1:-${DEPLOY_HOST:-}}"
REMOTE_DIR="${2:-${DEPLOY_DIR:-}}"

if [ -z "${REMOTE_HOST}" ] || [ -z "${REMOTE_DIR}" ]; then
    echo "Error: 未指定部署目标。" >&2
    echo "" >&2
    echo "用法：" >&2
    echo "  ./deploy/deploy.sh <REMOTE_HOST> <REMOTE_DIR>" >&2
    echo "" >&2
    echo "或设置环境变量：" >&2
    echo "  DEPLOY_HOST=<host> DEPLOY_DIR=<dir> ./deploy/deploy.sh" >&2
    exit 1
fi

echo "=== Building lilypad ==="
cd "${PROJECT_DIR}"
npm ci
npm run build

echo ""
echo "=== Deploying to ${REMOTE_HOST}:${REMOTE_DIR} ==="
# 使用 rsync 同步 dist/ 到远程服务器
# --delete 会删除远程端存在但本地不存在的文件，保持两边一致
rsync -avz --delete "${PROJECT_DIR}/dist/" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo ""
echo "=== Deployment completed ==="
echo "  Host: ${REMOTE_HOST}"
echo "  Dir:  ${REMOTE_DIR}"

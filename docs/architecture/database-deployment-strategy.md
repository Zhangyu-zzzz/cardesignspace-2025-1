# 数据库部署策略

## 概述

本文档定义了 CardesignSpace 项目的数据库部署策略，包括多环境管理、同步机制和最佳实践。

## 环境架构

### 数据库环境定义

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Production    │    │     Backup      │    │   Development   │
│ cardesignspace  │───▶│cardesignspace_  │───▶│cardesignspace_  │
│                 │    │     backup      │    │      dev        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Local       │
                    │cardesignspace_  │
                    │     local       │
                    └─────────────────┘
```

### 环境职责

| 环境 | 数据库名 | 用途 | 数据来源 | 同步频率 |
|------|----------|------|----------|----------|
| Production | `cardesignspace` | 生产服务 | 用户数据 | - |
| Backup | `cardesignspace_backup` | 数据备份 | Production | 每日增量 |
| Development | `cardesignspace_dev` | 开发测试 | Backup + 新功能 | 按需同步 |

## 同步策略

### 1. Production → Backup (增量同步)

**目标**：确保生产数据安全备份
**频率**：每日自动执行
**方式**：增量同步，只同步变更数据

```bash
# 自动执行
./scripts/db-backup-scheduler.sh daily

# 手动执行
./scripts/incremental-db-sync.sh incremental
```

### 2. Backup → Development (增量同步 + 新功能)

**目标**：为开发环境提供稳定的数据基础
**频率**：按需执行
**方式**：增量同步 + 新功能表结构

```bash
# 同步基础数据
./scripts/incremental-db-sync.sh incremental

# 应用新功能迁移
./scripts/apply-dev-migrations.sh
```

### 3. Development → Production (表结构同步)

**目标**：将测试通过的新功能部署到生产
**频率**：功能发布时
**方式**：仅同步表结构变更，不包含测试数据

```bash
# 生成生产迁移脚本
./scripts/generate-production-migration.sh

# 执行生产部署
./scripts/deploy-to-production.sh
```

## 环境配置

### 生产环境配置

```bash
# .env.production
DB_HOST=49.235.98.5
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=Jason
DB_PASSWORD=Jason123456!
NODE_ENV=production
```

### 备份环境配置

```bash
# .env.backup
DB_HOST=124.221.249.173
DB_PORT=44302
DB_NAME=cardesignspace_backup
DB_USER=birdmanoutman
DB_PASSWORD=Zez12345687!
NODE_ENV=backup
```

### 开发环境配置

```bash
# .env.dev
DB_HOST=124.221.249.173
DB_PORT=44302
DB_NAME=cardesignspace_dev
DB_USER=birdmanoutman
DB_PASSWORD=Zez12345687!
NODE_ENV=development
```


## 迁移管理

### 开发环境迁移

开发环境支持新功能测试，可以包含额外的表结构：

```sql
-- migrations/dev/2025-01-XX-new-feature.sql
-- 这些迁移只在开发环境执行
CREATE TABLE new_feature_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    feature_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 生产环境迁移

生产环境迁移需要经过严格测试：

```sql
-- migrations/production/2025-01-XX-production-ready.sql
-- 经过开发环境测试验证的迁移
ALTER TABLE existing_table ADD COLUMN new_column VARCHAR(255);
```

## 最佳实践

### 1. 数据同步原则

- **生产 → 备份**：完整数据同步，确保备份完整性
- **备份 → 开发**：增量同步 + 新功能，保持开发环境稳定
- **开发 → 生产**：仅同步表结构，不包含测试数据

### 2. 安全措施

- 每次同步前创建备份点
- 支持快速回滚机制
- 同步后自动验证数据一致性
- 详细的日志记录

### 3. 性能优化

- 使用增量同步减少传输量
- 批量处理大数据表
- 并行处理多个表
- 智能跳过无变更表

### 4. 监控和告警

- 同步失败自动告警
- 数据一致性检查
- 性能指标监控
- 定期备份验证

## 故障处理

### 同步失败处理

```bash
# 查看详细日志
tail -f logs/incremental-sync.log

# 验证同步状态
./scripts/incremental-db-sync.sh verify

# 回滚到备份点
./scripts/incremental-db-sync.sh rollback /path/to/backup.sql.gz
```

### 数据不一致处理

```bash
# 强制全量同步
./scripts/incremental-db-sync.sh full-sync

# 验证修复结果
./scripts/incremental-db-sync.sh verify
```

## 部署流程

### 新功能开发流程

1. **开发阶段**
   ```bash
   # 在本地环境开发
   ./scripts/dev-start.sh
   
   # 创建新功能迁移
   ./scripts/create-migration.sh new-feature
   ```

2. **测试阶段**
   ```bash
   # 同步到开发环境
   ./scripts/sync-to-dev.sh
   
   # 在开发环境测试
   ./scripts/dev-test.sh
   ```

3. **发布阶段**
   ```bash
   # 生成生产迁移
   ./scripts/generate-production-migration.sh
   
   # 部署到生产
   ./scripts/deploy-to-production.sh
   ```

## 总结

这个数据库部署策略提供了：

- ✅ 清晰的环境分离
- ✅ 安全的同步机制
- ✅ 完善的回滚能力
- ✅ 灵活的迁移管理
- ✅ 全面的监控体系

通过这个策略，可以确保：
1. 生产数据的安全性
2. 开发环境的稳定性
3. 新功能的可控发布
4. 快速的问题恢复

# 增量数据库同步功能

## 概述

增量数据库同步功能是对原有完全重建同步方式的重大改进，提供了更安全、更高效的数据库同步机制。

## 主要特性

### 1. 智能增量同步
- **表结构比较**：自动检测表结构变更并同步
- **数据增量更新**：只同步变更的数据，大幅提升性能
- **主键识别**：自动识别主键，支持 `INSERT ... ON DUPLICATE KEY UPDATE`
- **新表处理**：自动检测并创建新表

### 2. 安全机制
- **备份点创建**：同步前自动创建备份点
- **回滚功能**：同步失败时可快速回滚
- **原子操作**：确保数据一致性
- **错误处理**：完善的错误处理和重试机制

### 3. 性能优化
- **批量处理**：支持批量数据同步
- **并行处理**：可配置并行同步多个表
- **压缩传输**：减少网络传输开销
- **智能跳过**：跳过无变更的表

## 使用方法

### 基本命令

```bash
# 增量同步（默认）
./scripts/incremental-db-sync.sh incremental

# 全量同步（首次同步）
./scripts/incremental-db-sync.sh full-sync

# 模拟运行（不执行实际同步）
./scripts/incremental-db-sync.sh dry-run

# 验证同步结果
./scripts/incremental-db-sync.sh verify

# 回滚到备份点
./scripts/incremental-db-sync.sh rollback /path/to/backup.sql.gz
```

### 集成到现有备份系统

增量同步已集成到现有的备份调度系统中：

```bash
# 使用增量同步
./scripts/db-backup-scheduler.sh daily

# 强制使用传统同步
./scripts/db-backup-scheduler.sh daily --full-sync
```

## 配置说明

### 环境变量

在 `.env` 文件中配置：

```bash
# 主数据库配置
DB_HOST=49.235.98.5
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=Jason
DB_PASSWORD=Jason123456!

# 备份数据库配置
BACKUP_DB_HOST=124.221.249.173
BACKUP_DB_PORT=44302
BACKUP_DB_NAME=cardesignspace_local
BACKUP_DB_USER=birdmanoutman
BACKUP_DB_PASSWORD=Zez12345687!
```

### 同步配置文件

`scripts/sync-config.json` 提供详细的同步配置：

```json
{
  "sync_settings": {
    "default_mode": "incremental",
    "backup_before_sync": true,
    "verify_after_sync": true,
    "max_retry_attempts": 3
  },
  "table_settings": {
    "exclude_tables": ["temp_*", "cache_*"],
    "force_full_sync_tables": ["users", "permissions"]
  }
}
```

## 同步流程

### 增量同步流程

1. **环境检查**
   - 验证数据库连接
   - 检查配置完整性

2. **创建备份点**
   - 备份当前备份数据库状态
   - 记录备份点信息

3. **表结构同步**
   - 比较源表和目标表结构
   - 同步结构变更
   - 创建新表

4. **数据增量同步**
   - 识别主键
   - 使用 `INSERT ... ON DUPLICATE KEY UPDATE`
   - 批量处理数据

5. **验证和清理**
   - 验证同步结果
   - 清理临时文件
   - 更新同步状态

### 全量同步流程

1. **环境检查**
2. **创建备份点**
3. **清空目标数据库**
4. **完整数据导入**
5. **验证结果**

## 监控和日志

### 日志文件

- `logs/incremental-sync.log`：增量同步日志
- `logs/db-backup.log`：备份调度日志

### 状态文件

- `sync/sync-state.json`：同步状态记录

### 监控指标

- 同步时间
- 处理表数量
- 数据行数
- 错误统计

## 性能对比

| 同步方式 | 首次同步 | 增量同步 | 网络传输 | 停机时间 |
|---------|---------|---------|---------|---------|
| 完全重建 | 100% | 100% | 100% | 较长 |
| 增量同步 | 100% | 5-20% | 5-20% | 极短 |

## 故障处理

### 常见问题

1. **同步失败**
   ```bash
   # 查看详细日志
   tail -f logs/incremental-sync.log
   
   # 回滚到备份点
   ./scripts/incremental-db-sync.sh rollback /path/to/backup.sql.gz
   ```

2. **数据不一致**
   ```bash
   # 验证同步结果
   ./scripts/incremental-db-sync.sh verify
   
   # 执行全量同步
   ./scripts/incremental-db-sync.sh full-sync
   ```

3. **性能问题**
   - 调整 `sync-config.json` 中的性能设置
   - 检查网络连接
   - 优化数据库索引

### 回滚操作

```bash
# 列出可用备份点
ls -la backups/database/backup_point_*.sql.gz

# 回滚到指定备份点
./scripts/incremental-db-sync.sh rollback backups/database/backup_point_20241201_143022.sql.gz
```

## 最佳实践

### 1. 定期验证
```bash
# 每日验证同步结果
0 4 * * * /path/to/scripts/incremental-db-sync.sh verify
```

### 2. 监控设置
- 设置同步失败告警
- 监控同步性能指标
- 定期检查日志文件

### 3. 备份策略
- 保留多个备份点
- 定期清理旧备份
- 测试回滚流程

### 4. 性能优化
- 根据数据量调整批处理大小
- 合理设置并行表数量
- 优化网络连接

## 升级说明

从传统同步升级到增量同步：

1. **备份现有配置**
   ```bash
   cp scripts/db-backup-scheduler.sh scripts/db-backup-scheduler.sh.backup
   ```

2. **部署新脚本**
   - 增量同步脚本已自动集成
   - 无需修改现有配置

3. **测试验证**
   ```bash
   # 模拟运行
   ./scripts/incremental-db-sync.sh dry-run
   
   # 执行增量同步
   ./scripts/incremental-db-sync.sh incremental
   ```

4. **监控运行**
   - 观察日志输出
   - 验证数据一致性
   - 检查性能表现

## 技术细节

### 主键识别算法
```sql
SELECT COLUMN_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'database_name' 
AND TABLE_NAME = 'table_name' 
AND CONSTRAINT_NAME = 'PRIMARY'
ORDER BY ORDINAL_POSITION;
```

### 增量同步SQL
```sql
INSERT INTO target_table 
SELECT * FROM temp_table
ON DUPLICATE KEY UPDATE
column1 = VALUES(column1),
column2 = VALUES(column2),
...
```

### 表结构比较
使用 `mysqldump --no-data` 获取表结构，然后进行字符串比较。

## 总结

增量数据库同步功能提供了：
- ✅ 更快的同步速度
- ✅ 更短的服务中断时间
- ✅ 更安全的数据保护
- ✅ 更灵活的配置选项
- ✅ 更完善的监控和日志

建议在生产环境中逐步启用增量同步，并密切监控其运行状态。

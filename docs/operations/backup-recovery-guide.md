# CarDesignSpace 备份恢复指南

## 📋 备份策略概览

CarDesignSpace 采用多层次备份策略，确保数据安全和业务连续性。

```
生产环境 (Production)    备份环境 (Backup)    开发环境 (Development)
     ↓                        ↓                    ↓
cardesignspace          cardesignspace_backup   cardesignspace_dev
49.235.98.5:3306       124.221.249.173:44302   124.221.249.173:44302
     ↓                        ↓                    ↓
  实时数据              每日增量备份            按需同步
```

## 🔄 备份流程详解

### 1. 生产环境备份
- **源数据库**: `cardesignspace` @ 49.235.98.5:3306
- **目标数据库**: `cardesignspace_backup` @ 124.221.249.173:44302
- **备份方式**: 增量同步
- **执行频率**: 每日 02:00
- **备份脚本**: `scripts/incremental-db-sync.sh`

### 2. 备份环境同步
- **源数据库**: `cardesignspace_backup` @ 124.221.249.173:44302
- **目标数据库**: `cardesignspace_dev` @ 124.221.249.173:44302
- **同步方式**: 按需手动同步
- **用途**: 开发环境数据更新

## 🛠️ 备份脚本使用

### 自动备份调度
```bash
# 设置每日备份任务
./scripts/db-backup-scheduler.sh daily

# 检查备份任务状态
crontab -l | grep backup

# 查看备份日志
tail -f logs/db-backup.log
```

### 手动备份执行
```bash
# 执行完整备份
./scripts/backup-db.sh backup

# 执行增量同步
./scripts/incremental-db-sync.sh incremental

# 验证备份结果
./scripts/incremental-db-sync.sh verify
```

### 数据库同步
```bash
# 生产 → 备份 (增量)
./scripts/incremental-db-sync.sh incremental

# 备份 → 开发 (增量 + 新功能)
./scripts/incremental-db-sync.sh test-dev

# 完整同步 (首次)
./scripts/incremental-db-sync.sh full-sync
```

## 📊 备份监控

### 备份状态检查
```bash
# 检查所有环境状态
./scripts/db-environment.sh status

# 检查特定环境
./scripts/db-environment.sh verify backup

# 生成备份报告
./scripts/db-environment.sh report
```

### 日志监控
```bash
# 查看备份日志
tail -f logs/db-backup.log

# 查看同步日志
tail -f logs/incremental-sync.log

# 查看错误日志
tail -f logs/error.log
```

## 🚨 灾难恢复流程

### 1. 生产环境故障恢复

#### 场景 A: 数据库服务中断
```bash
# 1. 立即检查服务状态
docker-compose ps
docker-compose logs backend

# 2. 尝试重启服务
docker-compose restart backend

# 3. 如果重启失败，检查数据库连接
mysql -h49.235.98.5 -P3306 -uJason -pJason123456! -e "SELECT 1;"

# 4. 联系数据库管理员
```

#### 场景 B: 数据损坏
```bash
# 1. 立即停止所有写操作
docker-compose stop backend

# 2. 从备份环境恢复数据
./scripts/incremental-db-sync.sh restore-from-backup

# 3. 验证数据完整性
./scripts/incremental-db-sync.sh verify

# 4. 重启服务
docker-compose start backend
```

#### 场景 C: 完全数据丢失
```bash
# 1. 停止所有服务
docker-compose down

# 2. 从最新备份恢复
./scripts/incremental-db-sync.sh full-restore

# 3. 验证数据完整性
./scripts/incremental-db-sync.sh verify

# 4. 重新启动服务
docker-compose up -d
```

### 2. 备份环境故障恢复

#### 场景 A: 备份环境不可用
```bash
# 1. 检查备份环境状态
./scripts/db-environment.sh verify backup

# 2. 如果网络问题，等待恢复
# 3. 如果数据库问题，联系管理员
# 4. 临时使用开发环境作为备份
```

#### 场景 B: 备份数据损坏
```bash
# 1. 停止备份同步任务
crontab -e  # 注释掉备份任务

# 2. 重新初始化备份环境
./scripts/incremental-db-sync.sh init-backup

# 3. 执行完整同步
./scripts/incremental-db-sync.sh full-sync

# 4. 重新启用备份任务
crontab -e  # 取消注释备份任务
```

## 🔧 恢复操作详解

### 完整数据恢复
```bash
# 1. 准备恢复环境
cp env/env.production .env
./scripts/db-environment.sh switch production

# 2. 停止生产服务
docker-compose down

# 3. 备份当前数据（如果可能）
mysqldump -h49.235.98.5 -P3306 -uJason -pJason123456! cardesignspace > backup_before_restore.sql

# 4. 执行恢复
./scripts/incremental-db-sync.sh full-restore

# 5. 验证恢复结果
./scripts/incremental-db-sync.sh verify

# 6. 重启服务
docker-compose up -d
```

### 部分数据恢复
```bash
# 1. 识别需要恢复的表
mysql -h49.235.98.5 -P3306 -uJason -pJason123456! cardesignspace -e "SHOW TABLES;"

# 2. 从备份环境恢复特定表
mysqldump -h124.221.249.173 -P44302 -ubirdmanoutman -pZez12345687! cardesignspace_backup [table_name] | mysql -h49.235.98.5 -P3306 -uJason -pJason123456! cardesignspace

# 3. 验证恢复结果
mysql -h49.235.98.5 -P3306 -uJason -pJason123456! cardesignspace -e "SELECT COUNT(*) FROM [table_name];"
```

### 时间点恢复
```bash
# 1. 查看可用备份
ls -la backups/database/

# 2. 选择恢复时间点
BACKUP_FILE="backup_db_backup_20251009_104359.sql.gz"

# 3. 解压备份文件
gunzip backups/database/$BACKUP_FILE

# 4. 恢复数据
mysql -h49.235.98.5 -P3306 -uJason -pJason123456! cardesignspace < backups/database/${BACKUP_FILE%.gz}

# 5. 验证恢复结果
./scripts/incremental-db-sync.sh verify
```

## 📈 备份验证

### 数据完整性检查
```bash
# 1. 检查表结构
mysql -h124.221.249.173 -P44302 -ubirdmanoutman -pZez12345687! cardesignspace_backup -e "SHOW TABLES;"

# 2. 检查数据量
mysql -h124.221.249.173 -P44302 -ubirdmanoutman -pZez12345687! cardesignspace_backup -e "SELECT COUNT(*) FROM images;"

# 3. 检查关键数据
mysql -h124.221.249.173 -P44302 -ubirdmanoutman -pZez12345687! cardesignspace_backup -e "SELECT * FROM users LIMIT 5;"
```

### 备份质量评估
```bash
# 1. 检查备份文件大小
ls -lh backups/database/

# 2. 检查备份时间
stat backups/database/backup_*.sql.gz

# 3. 检查备份完整性
gzip -t backups/database/backup_*.sql.gz
```

## 🔍 故障排除

### 常见问题

#### 1. 备份任务失败
```bash
# 检查 Cron 任务
crontab -l
systemctl status cron

# 检查脚本权限
ls -la scripts/backup-db.sh
chmod +x scripts/backup-db.sh

# 检查日志
tail -f logs/db-backup.log
```

#### 2. 同步失败
```bash
# 检查网络连接
ping 49.235.98.5
ping 124.221.249.173

# 检查数据库连接
mysql -h49.235.98.5 -P3306 -uJason -pJason123456! -e "SELECT 1;"
mysql -h124.221.249.173 -P44302 -ubirdmanoutman -pZez12345687! -e "SELECT 1;"

# 检查同步日志
tail -f logs/incremental-sync.log
```

#### 3. 恢复失败
```bash
# 检查磁盘空间
df -h

# 检查数据库权限
mysql -h49.235.98.5 -P3306 -uJason -pJason123456! -e "SHOW GRANTS;"

# 检查备份文件完整性
gzip -t backups/database/backup_*.sql.gz
```

### 调试技巧

#### 启用详细日志
```bash
# 设置调试模式
export DEBUG=true
export LOG_LEVEL=debug

# 执行备份/恢复操作
./scripts/backup-db.sh backup
```

#### 测试恢复流程
```bash
# 在开发环境测试恢复
./scripts/db-environment.sh switch dev
./scripts/incremental-db-sync.sh test-restore
```

## 📞 应急联系

### 紧急情况处理
1. **生产环境数据丢失**: 立即联系数据库管理员
2. **备份环境故障**: 联系运维团队
3. **恢复操作失败**: 联系技术支持

### 联系信息
- **数据库管理员**: [联系方式]
- **运维团队**: [联系方式]
- **技术支持**: [联系方式]

## 📋 检查清单

### 日常检查
- [ ] 检查备份任务执行状态
- [ ] 验证备份数据完整性
- [ ] 监控磁盘空间使用
- [ ] 检查日志文件大小

### 定期检查
- [ ] 测试恢复流程
- [ ] 验证备份策略
- [ ] 更新备份脚本
- [ ] 检查安全配置

### 应急准备
- [ ] 准备恢复脚本
- [ ] 测试网络连接
- [ ] 验证权限配置
- [ ] 准备联系清单

---

*最后更新: 2025-01-10*
*版本: 1.0*


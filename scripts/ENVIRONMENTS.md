# CarDesignSpace 环境策略指南

## 🌍 三环境架构概览

CarDesignSpace 采用三环境策略，确保开发、测试和生产环境的隔离与数据安全。

```
生产环境 (Production)    备份环境 (Backup)    开发环境 (Development)
     ↓                        ↓                    ↓
cardesignspace          cardesignspace_backup   cardesignspace_dev
49.235.98.5:3306       124.221.249.173:44302   124.221.249.173:44302
```

## 📊 环境详细配置

### 🏭 生产环境 (Production)
- **数据库**: `cardesignspace` @ 49.235.98.5:3306
- **用户**: Jason
- **用途**: 线上生产服务
- **特点**: 
  - 高可用性配置
  - 完整的安全策略
  - 性能监控
  - 自动备份

### 💾 备份环境 (Backup)
- **数据库**: `cardesignspace_backup` @ 124.221.249.173:44302
- **用户**: birdmanoutman
- **用途**: 生产数据备份和灾难恢复
- **特点**:
  - 每日自动同步生产数据
  - 增量备份策略
  - 数据恢复测试环境

### 🛠️ 开发环境 (Development)
- **数据库**: `cardesignspace_dev` @ 124.221.249.173:44302
- **用户**: birdmanoutman
- **用途**: 功能开发和测试
- **特点**:
  - 实验性功能支持
  - 调试模式
  - 热重载
  - 模拟数据

## 🔄 数据同步流程

### 1. 生产 → 备份 (自动)
```bash
# 每日 02:00 自动执行
./scripts/incremental-db-sync.sh incremental
```
- **频率**: 每日
- **方式**: 增量同步
- **脚本**: `incremental-db-sync.sh`
- **调度**: Cron 任务

### 2. 备份 → 开发 (按需)
```bash
# 手动同步备份数据到开发环境
./scripts/incremental-db-sync.sh test-dev
```
- **频率**: 按需
- **方式**: 增量同步 + 新功能
- **触发**: 开发人员手动执行

### 3. 开发 → 生产 (谨慎)
```bash
# 仅同步表结构变更
./scripts/incremental-db-sync.sh schema-only
```
- **频率**: 功能发布时
- **方式**: 仅表结构同步
- **审批**: 需要代码审查

## ⚙️ 环境管理命令

### 环境切换
```bash
# 切换到生产环境
./scripts/db-environment.sh switch production

# 切换到备份环境
./scripts/db-environment.sh switch backup

# 切换到开发环境
./scripts/db-environment.sh switch dev
```

### 环境验证
```bash
# 验证当前环境
./scripts/db-environment.sh verify

# 验证特定环境
./scripts/db-environment.sh verify production
./scripts/db-environment.sh verify backup
./scripts/db-environment.sh verify dev
```

### 环境状态
```bash
# 查看所有环境状态
./scripts/db-environment.sh status

# 生成环境报告
./scripts/db-environment.sh report
```

## 🔧 环境配置文件

### 配置文件位置
```
env/
├── env.production    # 生产环境配置
├── env.backup        # 备份环境配置
└── env.dev          # 开发环境配置
```

### 配置优先级
1. `.env.local` (本地覆盖)
2. `env/env.[environment]` (环境特定)
3. `env.example` (默认模板)

## 🚨 安全注意事项

### 生产环境
- ✅ 使用强密码
- ✅ 启用访问日志
- ✅ 定期安全更新
- ✅ 备份验证
- ❌ 禁止直接修改数据
- ❌ 禁止调试模式

### 备份环境
- ✅ 定期恢复测试
- ✅ 数据完整性检查
- ✅ 访问权限控制
- ❌ 禁止生产数据修改

### 开发环境
- ✅ 实验性功能测试
- ✅ 调试信息记录
- ✅ 快速迭代开发
- ❌ 禁止生产数据直接使用

## 🔍 故障排除

### 常见问题

#### 1. 环境切换失败
```bash
# 检查配置文件是否存在
ls -la env/env.*

# 重新初始化环境配置
./scripts/db-environment.sh init
```

#### 2. 数据库连接失败
```bash
# 验证数据库连接
./scripts/db-environment.sh verify [environment]

# 检查网络连接
ping [database_host]
```

#### 3. 同步失败
```bash
# 检查同步日志
tail -f logs/incremental-sync.log

# 手动执行同步测试
./scripts/incremental-db-sync.sh verify
```

### 紧急恢复

#### 生产环境故障
1. 立即切换到备份环境
2. 检查备份数据完整性
3. 执行灾难恢复流程
4. 通知相关人员

#### 数据丢失
1. 停止所有写操作
2. 从最新备份恢复
3. 验证数据完整性
4. 重新启动服务

## 📈 监控和维护

### 日常监控
- 数据库连接状态
- 同步任务执行情况
- 磁盘空间使用
- 性能指标

### 定期维护
- 清理过期日志
- 优化数据库索引
- 更新安全补丁
- 备份策略评估

## 📞 联系和支持

- **生产环境问题**: 立即联系运维团队
- **开发环境问题**: 联系开发团队
- **备份恢复**: 联系数据库管理员

---

*最后更新: 2025-01-10*
*版本: 1.0*


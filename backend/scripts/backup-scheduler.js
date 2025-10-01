#!/usr/bin/env node

/**
 * 备份任务调度器
 * 
 * 功能：
 * 1. 业务低峰期自动运行备份任务
 * 2. 智能调度避免影响生产环境
 * 3. 支持多种调度策略
 * 4. 自动重试和错误处理
 * 
 * 使用方法：
 * node backend/scripts/backup-scheduler.js [options]
 * 
 * 选项：
 * --daemon          守护进程模式
 * --schedule=cron   Cron表达式调度
 * --low-traffic     仅在业务低峰期运行
 * --max-duration=3h 最大运行时长
 */

require('dotenv').config();
const cron = require('node-cron');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 配置
const CONFIG = {
  // 业务低峰期配置（24小时制）
  LOW_TRAFFIC_HOURS: [2, 3, 4, 5], // 凌晨2-6点
  
  // 调度配置
  SCHEDULE: {
    // 默认：每天凌晨3点开始备份
    DEFAULT: '0 3 * * *',
    // 工作日凌晨3点
    WEEKDAYS: '0 3 * * 1-5',
    // 周末凌晨2点
    WEEKENDS: '0 2 * * 0,6',
    // 每6小时运行一次（仅低峰期）
    FREQUENT: '0 2,8,14,20 * * *'
  },
  
  // 任务配置
  TASK: {
    maxDuration: 3 * 60 * 60 * 1000, // 3小时
    batchSize: 50,
    delay: 2000,
    retryAttempts: 3,
    retryDelay: 5 * 60 * 1000, // 5分钟
  },
  
  // 文件路径
  PATHS: {
    backupScript: path.join(__dirname, 'cos-to-s3-backup.js'),
    logDir: './logs',
    statusFile: './backup-scheduler-status.json',
    pidFile: './backup-scheduler.pid'
  }
};

// 日志系统
class SchedulerLogger {
  constructor(logFile) {
    this.logFile = logFile;
  }
  
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
    
    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('写入日志失败:', err.message);
    }
  }
  
  info(message, data) { return this.log('info', message, data); }
  warn(message, data) { return this.log('warn', message, data); }
  error(message, data) { return this.log('error', message, data); }
}

// 任务状态管理
class TaskStatusManager {
  constructor(statusFile) {
    this.statusFile = statusFile;
    this.status = {
      isRunning: false,
      lastRun: null,
      nextRun: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      currentTask: null,
      schedule: null,
      errors: []
    };
  }
  
  async load() {
    try {
      const data = await fs.readFile(this.statusFile, 'utf8');
      this.status = { ...this.status, ...JSON.parse(data) };
    } catch (err) {
      // 文件不存在，使用默认状态
    }
  }
  
  async save() {
    try {
      await fs.writeFile(this.statusFile, JSON.stringify(this.status, null, 2));
    } catch (err) {
      console.error('保存状态文件失败:', err.message);
    }
  }
  
  startTask(taskId) {
    this.status.isRunning = true;
    this.status.currentTask = {
      id: taskId,
      startTime: Date.now(),
      pid: null
    };
  }
  
  endTask(success = true) {
    this.status.isRunning = false;
    this.status.lastRun = Date.now();
    this.status.totalRuns++;
    
    if (success) {
      this.status.successfulRuns++;
    } else {
      this.status.failedRuns++;
    }
    
    this.status.currentTask = null;
  }
  
  addError(error, context) {
    this.status.errors.push({
      timestamp: Date.now(),
      error: error.message,
      context
    });
    
    // 只保留最近50个错误
    if (this.status.errors.length > 50) {
      this.status.errors = this.status.errors.slice(-50);
    }
  }
}

// 业务低峰期检测器
class LowTrafficDetector {
  constructor(lowTrafficHours) {
    this.lowTrafficHours = lowTrafficHours;
  }
  
  isLowTrafficTime() {
    const now = new Date();
    const hour = now.getHours();
    return this.lowTrafficHours.includes(hour);
  }
  
  getNextLowTrafficTime() {
    const now = new Date();
    const currentHour = now.getHours();
    
    // 找到下一个低峰期小时
    let nextHour = this.lowTrafficHours.find(h => h > currentHour);
    if (!nextHour) {
      // 如果今天没有更多低峰期，找明天第一个
      nextHour = this.lowTrafficHours[0];
      now.setDate(now.getDate() + 1);
    }
    
    now.setHours(nextHour, 0, 0, 0);
    return now;
  }
  
  getLowTrafficDuration() {
    const now = new Date();
    const currentHour = now.getHours();
    
    // 计算当前低峰期剩余时间
    const nextHighTrafficHour = this.lowTrafficHours.find(h => h > currentHour);
    if (nextHighTrafficHour) {
      return (nextHighTrafficHour - currentHour) * 60 * 60 * 1000;
    }
    
    return 0;
  }
}

// 备份任务执行器
class BackupTaskExecutor {
  constructor(logger, statusManager) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.currentProcess = null;
  }
  
  async executeBackup(options = {}) {
    return new Promise((resolve, reject) => {
      const taskId = `backup-${Date.now()}`;
      this.statusManager.startTask(taskId);
      
      this.logger.info('开始执行备份任务', { taskId, options });
      
      // 构建命令参数
      const args = [
        CONFIG.PATHS.backupScript,
        `--batch-size=${options.batchSize || CONFIG.TASK.batchSize}`,
        `--delay=${options.delay || CONFIG.TASK.delay}`,
        '--resume'
      ];
      
      if (options.dryRun) {
        args.push('--dry-run');
      }
      
      // 启动备份进程
      this.currentProcess = spawn('node', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      
      this.statusManager.status.currentTask.pid = this.currentProcess.pid;
      this.statusManager.save();
      
      let stdout = '';
      let stderr = '';
      
      this.currentProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        this.logger.info('备份输出', { data: data.toString().trim() });
      });
      
      this.currentProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        this.logger.error('备份错误', { data: data.toString().trim() });
      });
      
      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        
        if (code === 0) {
          this.logger.info('备份任务完成', { taskId, code });
          this.statusManager.endTask(true);
          resolve({ success: true, taskId, stdout, stderr });
        } else {
          this.logger.error('备份任务失败', { taskId, code, stderr });
          this.statusManager.endTask(false);
          this.statusManager.addError(new Error(`备份任务失败，退出码: ${code}`), { taskId });
          reject(new Error(`备份任务失败，退出码: ${code}`));
        }
        
        this.statusManager.save();
      });
      
      this.currentProcess.on('error', (error) => {
        this.logger.error('备份进程启动失败', { error: error.message });
        this.statusManager.endTask(false);
        this.statusManager.addError(error, { taskId });
        reject(error);
      });
      
      // 设置超时
      setTimeout(() => {
        if (this.currentProcess && !this.currentProcess.killed) {
          this.logger.warn('备份任务超时，强制终止', { taskId });
          this.currentProcess.kill('SIGTERM');
          
          setTimeout(() => {
            if (this.currentProcess && !this.currentProcess.killed) {
              this.currentProcess.kill('SIGKILL');
            }
          }, 10000);
        }
      }, CONFIG.TASK.maxDuration);
    });
  }
  
  stopCurrentTask() {
    if (this.currentProcess && !this.currentProcess.killed) {
      this.logger.info('停止当前备份任务');
      this.currentProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.currentProcess && !this.currentProcess.killed) {
          this.currentProcess.kill('SIGKILL');
        }
      }, 10000);
    }
  }
}

// 主调度器
class BackupScheduler {
  constructor(options = {}) {
    this.options = {
      daemon: options.daemon || false,
      schedule: options.schedule || CONFIG.SCHEDULE.DEFAULT,
      lowTrafficOnly: options.lowTrafficOnly || true,
      maxDuration: options.maxDuration || CONFIG.TASK.maxDuration,
      ...options
    };
    
    this.logger = new SchedulerLogger(path.join(CONFIG.PATHS.logDir, 'backup-scheduler.log'));
    this.statusManager = new TaskStatusManager(CONFIG.PATHS.statusFile);
    this.lowTrafficDetector = new LowTrafficDetector(CONFIG.LOW_TRAFFIC_HOURS);
    this.executor = new BackupTaskExecutor(this.logger, this.statusManager);
    this.cronJob = null;
  }
  
  async initialize() {
    this.logger.info('初始化备份调度器', this.options);
    
    // 确保日志目录存在
    try {
      await fs.mkdir(CONFIG.PATHS.logDir, { recursive: true });
    } catch (err) {
      // 目录已存在
    }
    
    // 加载状态
    await this.statusManager.load();
    
    // 验证Cron表达式
    if (!cron.validate(this.options.schedule)) {
      throw new Error(`无效的Cron表达式: ${this.options.schedule}`);
    }
    
    this.logger.info('调度器初始化完成', {
      schedule: this.options.schedule,
      lowTrafficOnly: this.options.lowTrafficOnly,
      nextLowTrafficTime: this.lowTrafficDetector.getNextLowTrafficTime()
    });
  }
  
  async start() {
    await this.initialize();
    
    this.logger.info('启动备份调度器');
    
    // 创建Cron任务
    this.cronJob = cron.schedule(this.options.schedule, async () => {
      await this.runScheduledTask();
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    // 启动Cron任务
    this.cronJob.start();
    
    this.statusManager.status.schedule = this.options.schedule;
    this.statusManager.status.nextRun = this.getNextRunTime();
    await this.statusManager.save();
    
    this.logger.info('备份调度器已启动', {
      schedule: this.options.schedule,
      nextRun: this.statusManager.status.nextRun
    });
    
    // 守护进程模式
    if (this.options.daemon) {
      this.logger.info('进入守护进程模式');
      
      // 保存PID
      await fs.writeFile(CONFIG.PATHS.pidFile, process.pid.toString());
      
      // 处理退出信号
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
      // 保持进程运行
      setInterval(() => {
        // 心跳检测
      }, 60000);
    }
  }
  
  async runScheduledTask() {
    try {
      // 检查是否在业务低峰期
      if (this.options.lowTrafficOnly && !this.lowTrafficDetector.isLowTrafficTime()) {
        this.logger.info('跳过任务：当前非业务低峰期');
        return;
      }
      
      // 检查是否已有任务在运行
      if (this.statusManager.status.isRunning) {
        this.logger.warn('跳过任务：已有任务在运行');
        return;
      }
      
      // 检查低峰期剩余时间
      const remainingTime = this.lowTrafficDetector.getLowTrafficDuration();
      if (remainingTime < CONFIG.TASK.maxDuration) {
        this.logger.warn('跳过任务：低峰期剩余时间不足', { 
          remainingTime: remainingTime / 1000 / 60 + '分钟',
          requiredTime: CONFIG.TASK.maxDuration / 1000 / 60 + '分钟'
        });
        return;
      }
      
      this.logger.info('开始执行计划备份任务');
      
      await this.executor.executeBackup({
        batchSize: CONFIG.TASK.batchSize,
        delay: CONFIG.TASK.delay
      });
      
      this.logger.info('计划备份任务完成');
      
    } catch (error) {
      this.logger.error('计划备份任务失败', { error: error.message });
      this.statusManager.addError(error, { type: 'scheduled_task' });
    } finally {
      this.statusManager.status.nextRun = this.getNextRunTime();
      await this.statusManager.save();
    }
  }
  
  getNextRunTime() {
    if (!this.cronJob) return null;
    
    // 计算下次运行时间
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 简化计算
    return nextRun;
  }
  
  async stop() {
    this.logger.info('停止备份调度器');
    
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    
    this.executor.stopCurrentTask();
    
    // 删除PID文件
    try {
      await fs.unlink(CONFIG.PATHS.pidFile);
    } catch (err) {
      // 文件不存在
    }
  }
  
  async shutdown() {
    this.logger.info('关闭备份调度器');
    await this.stop();
    process.exit(0);
  }
  
  getStatus() {
    return {
      ...this.statusManager.status,
      isLowTrafficTime: this.lowTrafficDetector.isLowTrafficTime(),
      nextLowTrafficTime: this.lowTrafficDetector.getNextLowTrafficTime(),
      config: this.options
    };
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    if (arg.startsWith('--schedule=')) {
      options.schedule = arg.split('=')[1];
    } else if (arg.startsWith('--max-duration=')) {
      const duration = arg.split('=')[1];
      if (duration.endsWith('h')) {
        options.maxDuration = parseInt(duration) * 60 * 60 * 1000;
      } else if (duration.endsWith('m')) {
        options.maxDuration = parseInt(duration) * 60 * 1000;
      } else {
        options.maxDuration = parseInt(duration);
      }
    } else if (arg === '--daemon') {
      options.daemon = true;
    } else if (arg === '--low-traffic') {
      options.lowTrafficOnly = true;
    }
  }
  
  return options;
}

// 主程序
async function main() {
  const options = parseArgs();
  const scheduler = new BackupScheduler(options);
  
  try {
    await scheduler.start();
    
    // 非守护进程模式，显示状态
    if (!options.daemon) {
      console.log('备份调度器状态:');
      console.log(JSON.stringify(scheduler.getStatus(), null, 2));
      
      // 等待用户输入退出
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', async () => {
        await scheduler.shutdown();
      });
    }
    
  } catch (error) {
    console.error('调度器启动失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BackupScheduler, CONFIG };

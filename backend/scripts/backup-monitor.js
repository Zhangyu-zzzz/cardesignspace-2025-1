#!/usr/bin/env node

/**
 * 备份监控和完整性验证工具
 * 
 * 功能：
 * 1. 实时监控备份进度
 * 2. 验证备份完整性
 * 3. 生成备份报告
 * 4. 提供Web监控界面
 * 
 * 使用方法：
 * node backend/scripts/backup-monitor.js [options]
 * 
 * 选项：
 * --web           启动Web监控界面
 * --port=3001     Web服务端口
 * --verify        验证备份完整性
 * --report        生成备份报告
 * --stats         显示统计信息
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { Sequelize } = require('sequelize');
const COS = require('cos-nodejs-sdk-v5');
const { S3Client, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// 配置
const CONFIG = {
  // 数据库配置
  DB: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'mysql',
    logging: false
  },
  
  // 腾讯云COS配置
  COS: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
    Bucket: process.env.COS_BUCKET,
    Region: process.env.COS_REGION,
    Domain: process.env.COS_DOMAIN
  },
  
  // S3-bmnas配置
  S3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    publicBaseUrl: process.env.S3_DOMAIN
  },
  
  // 监控配置
  MONITOR: {
    progressFile: './backup-progress.json',
    statusFile: './backup-scheduler-status.json',
    logFile: './backup.log',
    reportDir: './backup-reports',
    webPort: 3001
  }
};

// 初始化客户端
const sequelize = new Sequelize(CONFIG.DB);
const cos = new COS({
  SecretId: CONFIG.COS.SecretId,
  SecretKey: CONFIG.COS.SecretKey,
});
const s3Client = new S3Client({
  endpoint: CONFIG.S3.endpoint,
  region: CONFIG.S3.region,
  credentials: {
    accessKeyId: CONFIG.S3.accessKeyId,
    secretAccessKey: CONFIG.S3.secretAccessKey,
  },
  forcePathStyle: true,
});

// 进度分析器
class ProgressAnalyzer {
  constructor() {
    this.progressData = null;
    this.statusData = null;
  }
  
  async loadData() {
    try {
      // 加载进度数据
      const progressContent = await fs.readFile(CONFIG.MONITOR.progressFile, 'utf8');
      this.progressData = JSON.parse(progressContent);
    } catch (err) {
      this.progressData = null;
    }
    
    try {
      // 加载状态数据
      const statusContent = await fs.readFile(CONFIG.MONITOR.statusFile, 'utf8');
      this.statusData = JSON.parse(statusContent);
    } catch (err) {
      this.statusData = null;
    }
  }
  
  getProgressSummary() {
    if (!this.progressData) {
      return {
        status: 'no_data',
        message: '无进度数据'
      };
    }
    
    const progress = this.progressData;
    const now = Date.now();
    const elapsed = now - progress.startTime;
    const remaining = progress.totalImages - progress.processedImages;
    const successRate = progress.processedImages > 0 
      ? (progress.successfulImages / progress.processedImages * 100).toFixed(2)
      : 0;
    
    return {
      status: progress.endTime ? 'completed' : 'running',
      startTime: new Date(progress.startTime).toISOString(),
      endTime: progress.endTime ? new Date(progress.endTime).toISOString() : null,
      duration: elapsed,
      totalImages: progress.totalImages,
      processedImages: progress.processedImages,
      successfulImages: progress.successfulImages,
      failedImages: progress.failedImages,
      skippedImages: progress.skippedImages,
      totalVariants: progress.totalVariants,
      processedVariants: progress.processedVariants,
      successfulVariants: progress.successfulVariants,
      failedVariants: progress.failedVariants,
      progress: progress.totalImages > 0 
        ? (progress.processedImages / progress.totalImages * 100).toFixed(2)
        : 0,
      successRate: successRate + '%',
      remainingImages: remaining,
      estimatedCompletion: remaining > 0 && progress.stats.processingRate > 0
        ? new Date(now + (remaining / progress.stats.processingRate * 60 * 1000)).toISOString()
        : null,
      stats: progress.stats,
      errors: progress.errors.slice(-10) // 最近10个错误
    };
  }
  
  getSchedulerStatus() {
    if (!this.statusData) {
      return {
        status: 'no_data',
        message: '无调度器数据'
      };
    }
    
    const status = this.statusData;
    return {
      isRunning: status.isRunning,
      lastRun: status.lastRun ? new Date(status.lastRun).toISOString() : null,
      nextRun: status.nextRun ? new Date(status.nextRun).toISOString() : null,
      totalRuns: status.totalRuns,
      successfulRuns: status.successfulRuns,
      failedRuns: status.failedRuns,
      successRate: status.totalRuns > 0 
        ? (status.successfulRuns / status.totalRuns * 100).toFixed(2) + '%'
        : '0%',
      currentTask: status.currentTask,
      schedule: status.schedule,
      errors: status.errors.slice(-10)
    };
  }
}

// 完整性验证器
class IntegrityVerifier {
  constructor() {
    this.sequelize = sequelize;
    this.cos = cos;
    this.s3Client = s3Client;
  }
  
  async verifyBackupIntegrity(sampleSize = 100) {
    console.log('开始验证备份完整性...');
    
    const results = {
      totalChecked: 0,
      successful: 0,
      failed: 0,
      missing: 0,
      sizeMismatch: 0,
      errors: []
    };
    
    try {
      // 获取样本图片
      const [images] = await this.sequelize.query(`
        SELECT id, url, filename, fileSize
        FROM images
        ORDER BY RAND()
        LIMIT :sampleSize
      `, {
        replacements: { sampleSize },
        type: Sequelize.QueryTypes.SELECT
      });
      
      results.totalChecked = images.length;
      
      for (const image of images) {
        try {
          const verification = await this.verifySingleImage(image);
          
          if (verification.success) {
            results.successful++;
          } else {
            results.failed++;
            if (verification.reason === 'missing') {
              results.missing++;
            } else if (verification.reason === 'size_mismatch') {
              results.sizeMismatch++;
            }
          }
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            imageId: image.id,
            error: error.message
          });
        }
      }
      
      // 验证变体
      const [variants] = await this.sequelize.query(`
        SELECT ia.imageId, ia.variant, ia.url, ia.size
        FROM image_assets ia
        JOIN images i ON ia.imageId = i.id
        ORDER BY RAND()
        LIMIT :sampleSize
      `, {
        replacements: { sampleSize },
        type: Sequelize.QueryTypes.SELECT
      });
      
      for (const variant of variants) {
        try {
          const verification = await this.verifySingleVariant(variant);
          
          if (verification.success) {
            results.successful++;
          } else {
            results.failed++;
            if (verification.reason === 'missing') {
              results.missing++;
            }
          }
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            imageId: variant.imageId,
            variant: variant.variant,
            error: error.message
          });
        }
      }
      
    } catch (error) {
      console.error('完整性验证失败:', error.message);
      throw error;
    }
    
    return results;
  }
  
  async verifySingleImage(image) {
    try {
      // 解析COS URL
      const cosInfo = this.parseCosUrl(image.url);
      if (!cosInfo) {
        throw new Error(`无法解析COS URL: ${image.url}`);
      }
      
      // 构建S3 Key
      const s3Key = cosInfo.key;
      
      // 检查S3中是否存在
      try {
        const s3Head = await this.s3Client.send(new HeadObjectCommand({
          Bucket: CONFIG.S3.bucket,
          Key: s3Key
        }));
        
        // 验证文件大小
        if (image.fileSize && s3Head.ContentLength !== image.fileSize) {
          return {
            success: false,
            reason: 'size_mismatch',
            cosSize: image.fileSize,
            s3Size: s3Head.ContentLength
          };
        }
        
        return { success: true };
        
      } catch (error) {
        if (error.name === 'NotFound') {
          return { success: false, reason: 'missing' };
        }
        throw error;
      }
      
    } catch (error) {
      return { success: false, reason: 'error', error: error.message };
    }
  }
  
  async verifySingleVariant(variant) {
    try {
      // 解析COS URL
      const cosInfo = this.parseCosUrl(variant.url);
      if (!cosInfo) {
        throw new Error(`无法解析变体COS URL: ${variant.url}`);
      }
      
      // 构建S3 Key
      const s3Key = cosInfo.key;
      
      // 检查S3中是否存在
      try {
        await this.s3Client.send(new HeadObjectCommand({
          Bucket: CONFIG.S3.bucket,
          Key: s3Key
        }));
        
        return { success: true };
        
      } catch (error) {
        if (error.name === 'NotFound') {
          return { success: false, reason: 'missing' };
        }
        throw error;
      }
      
    } catch (error) {
      return { success: false, reason: 'error', error: error.message };
    }
  }
  
  parseCosUrl(url) {
    const match = url.match(/https:\/\/([^\.]+)\.cos\.([^\.]+)\.myqcloud\.com\/(.+)/);
    if (!match) return null;
    
    return {
      bucket: match[1],
      region: match[2],
      key: match[3]
    };
  }
}

// 报告生成器
class ReportGenerator {
  constructor() {
    this.analyzer = new ProgressAnalyzer();
    this.verifier = new IntegrityVerifier();
  }
  
  async generateReport() {
    console.log('生成备份报告...');
    
    await this.analyzer.loadData();
    
    const progressSummary = this.analyzer.getProgressSummary();
    const schedulerStatus = this.analyzer.getSchedulerStatus();
    
    const report = {
      generatedAt: new Date().toISOString(),
      progress: progressSummary,
      scheduler: schedulerStatus,
      summary: this.generateSummary(progressSummary, schedulerStatus)
    };
    
    // 确保报告目录存在
    try {
      await fs.mkdir(CONFIG.MONITOR.reportDir, { recursive: true });
    } catch (err) {
      // 目录已存在
    }
    
    // 保存报告
    const reportFile = path.join(
      CONFIG.MONITOR.reportDir, 
      `backup-report-${new Date().toISOString().split('T')[0]}.json`
    );
    
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`报告已生成: ${reportFile}`);
    return report;
  }
  
  generateSummary(progress, scheduler) {
    const summary = {
      overallStatus: 'unknown',
      completionRate: '0%',
      successRate: '0%',
      recommendations: []
    };
    
    if (progress.status === 'completed') {
      summary.overallStatus = 'completed';
      summary.completionRate = progress.progress + '%';
      summary.successRate = progress.successRate;
      
      if (parseFloat(progress.successRate) < 95) {
        summary.recommendations.push('备份成功率较低，建议检查错误日志');
      }
      
    } else if (progress.status === 'running') {
      summary.overallStatus = 'running';
      summary.completionRate = progress.progress + '%';
      summary.successRate = progress.successRate;
      
      if (progress.remainingImages > 0) {
        summary.recommendations.push(`预计还需处理 ${progress.remainingImages} 张图片`);
      }
      
    } else {
      summary.overallStatus = 'not_started';
      summary.recommendations.push('备份任务尚未开始');
    }
    
    if (scheduler.failedRuns > scheduler.successfulRuns) {
      summary.recommendations.push('调度器失败次数较多，建议检查配置');
    }
    
    return summary;
  }
}

// Web监控界面
class WebMonitor {
  constructor(port = CONFIG.MONITOR.webPort) {
    this.app = express();
    this.port = port;
    this.analyzer = new ProgressAnalyzer();
    this.setupRoutes();
  }
  
  setupRoutes() {
    // 静态文件
    this.app.use(express.static(path.join(__dirname, 'monitor-web')));
    
    // API路由
    this.app.get('/api/status', async (req, res) => {
      try {
        await this.analyzer.loadData();
        const progress = this.analyzer.getProgressSummary();
        const scheduler = this.analyzer.getSchedulerStatus();
        
        res.json({
          success: true,
          data: {
            progress,
            scheduler,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    this.app.get('/api/verify', async (req, res) => {
      try {
        const sampleSize = parseInt(req.query.sampleSize) || 100;
        const verifier = new IntegrityVerifier();
        const results = await verifier.verifyBackupIntegrity(sampleSize);
        
        res.json({
          success: true,
          data: results
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    this.app.get('/api/report', async (req, res) => {
      try {
        const generator = new ReportGenerator();
        const report = await generator.generateReport();
        
        res.json({
          success: true,
          data: report
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    // 主页
    this.app.get('/', (req, res) => {
      res.send(this.generateWebPage());
    });
  }
  
  generateWebPage() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>备份监控面板</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
        .status.running { background: #007bff; }
        .status.completed { background: #28a745; }
        .status.failed { background: #dc3545; }
        .status.no-data { background: #6c757d; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #007bff; transition: width 0.3s ease; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .error-list { max-height: 200px; overflow-y: auto; }
        .error-item { padding: 5px; border-bottom: 1px solid #eee; font-size: 12px; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>备份监控面板</h1>
        
        <div class="card">
            <h2>备份进度</h2>
            <div id="progress-status" class="status no-data">加载中...</div>
            <div class="progress-bar">
                <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
            </div>
            <div id="progress-details"></div>
        </div>
        
        <div class="card">
            <h2>调度器状态</h2>
            <div id="scheduler-status" class="status no-data">加载中...</div>
            <div id="scheduler-details"></div>
        </div>
        
        <div class="card">
            <h2>统计信息</h2>
            <div class="stats" id="stats-container"></div>
        </div>
        
        <div class="card">
            <h2>操作</h2>
            <button class="refresh-btn" onclick="refreshData()">刷新数据</button>
            <button class="refresh-btn" onclick="verifyIntegrity()">验证完整性</button>
            <button class="refresh-btn" onclick="generateReport()">生成报告</button>
        </div>
        
        <div class="card">
            <h2>最近错误</h2>
            <div id="error-list" class="error-list"></div>
        </div>
    </div>
    
    <script>
        let refreshInterval;
        
        function updateProgress(data) {
            const statusEl = document.getElementById('progress-status');
            const fillEl = document.getElementById('progress-fill');
            const detailsEl = document.getElementById('progress-details');
            
            statusEl.textContent = data.status === 'running' ? '运行中' : 
                                 data.status === 'completed' ? '已完成' : '无数据';
            statusEl.className = 'status ' + data.status;
            
            fillEl.style.width = data.progress + '%';
            
            detailsEl.innerHTML = \`
                <p>总图片数: \${data.totalImages}</p>
                <p>已处理: \${data.processedImages}</p>
                <p>成功: \${data.successfulImages}</p>
                <p>失败: \${data.failedImages}</p>
                <p>成功率: \${data.successRate}</p>
                <p>处理速度: \${data.stats.processingRate.toFixed(2)} 张/分钟</p>
            \`;
        }
        
        function updateScheduler(data) {
            const statusEl = document.getElementById('scheduler-status');
            const detailsEl = document.getElementById('scheduler-details');
            
            statusEl.textContent = data.isRunning ? '运行中' : '已停止';
            statusEl.className = 'status ' + (data.isRunning ? 'running' : 'completed');
            
            detailsEl.innerHTML = \`
                <p>总运行次数: \${data.totalRuns}</p>
                <p>成功次数: \${data.successfulRuns}</p>
                <p>失败次数: \${data.failedRuns}</p>
                <p>成功率: \${data.successRate}</p>
                <p>上次运行: \${data.lastRun || '无'}</p>
                <p>下次运行: \${data.nextRun || '无'}</p>
            \`;
        }
        
        function updateStats(data) {
            const container = document.getElementById('stats-container');
            container.innerHTML = \`
                <div class="stat-item">
                    <div class="stat-value">\${data.progress.totalImages}</div>
                    <div class="stat-label">总图片数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">\${data.progress.processedImages}</div>
                    <div class="stat-label">已处理</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">\${data.progress.successRate}</div>
                    <div class="stat-label">成功率</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">\${(data.progress.stats.totalSize / 1024 / 1024 / 1024).toFixed(2)}GB</div>
                    <div class="stat-label">已备份大小</div>
                </div>
            \`;
        }
        
        function updateErrors(errors) {
            const container = document.getElementById('error-list');
            if (errors.length === 0) {
                container.innerHTML = '<p>无错误</p>';
                return;
            }
            
            container.innerHTML = errors.map(error => \`
                <div class="error-item">
                    <strong>\${error.timestamp}</strong>: \${error.error}
                </div>
            \`).join('');
        }
        
        async function refreshData() {
            try {
                const response = await fetch('/api/status');
                const result = await response.json();
                
                if (result.success) {
                    updateProgress(result.data.progress);
                    updateScheduler(result.data.scheduler);
                    updateStats(result.data);
                    updateErrors(result.data.progress.errors);
                } else {
                    console.error('获取状态失败:', result.error);
                }
            } catch (error) {
                console.error('刷新数据失败:', error);
            }
        }
        
        async function verifyIntegrity() {
            try {
                const response = await fetch('/api/verify?sampleSize=50');
                const result = await response.json();
                
                if (result.success) {
                    alert(\`完整性验证完成:\\n检查: \${result.data.totalChecked}\\n成功: \${result.data.successful}\\n失败: \${result.data.failed}\\n缺失: \${result.data.missing}\`);
                } else {
                    alert('验证失败: ' + result.error);
                }
            } catch (error) {
                alert('验证失败: ' + error.message);
            }
        }
        
        async function generateReport() {
            try {
                const response = await fetch('/api/report');
                const result = await response.json();
                
                if (result.success) {
                    alert('报告生成成功');
                } else {
                    alert('报告生成失败: ' + result.error);
                }
            } catch (error) {
                alert('报告生成失败: ' + error.message);
            }
        }
        
        // 自动刷新
        refreshData();
        refreshInterval = setInterval(refreshData, 30000); // 30秒刷新一次
        
        // 页面卸载时清理
        window.addEventListener('beforeunload', () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        });
    </script>
</body>
</html>
    `;
  }
  
  async start() {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`监控界面已启动: http://localhost:${this.port}`);
        resolve();
      });
    });
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1]);
    } else if (arg === '--web') {
      options.web = true;
    } else if (arg === '--verify') {
      options.verify = true;
    } else if (arg === '--report') {
      options.report = true;
    } else if (arg === '--stats') {
      options.stats = true;
    }
  }
  
  return options;
}

// 主程序
async function main() {
  const options = parseArgs();
  
  try {
    if (options.web) {
      const monitor = new WebMonitor(options.port);
      await monitor.start();
      
      // 保持进程运行
      process.on('SIGINT', () => {
        console.log('监控界面已停止');
        process.exit(0);
      });
      
    } else if (options.verify) {
      const verifier = new IntegrityVerifier();
      const results = await verifier.verifyBackupIntegrity(100);
      
      console.log('完整性验证结果:');
      console.log(`检查文件: ${results.totalChecked}`);
      console.log(`成功: ${results.successful}`);
      console.log(`失败: ${results.failed}`);
      console.log(`缺失: ${results.missing}`);
      console.log(`大小不匹配: ${results.sizeMismatch}`);
      
      if (results.errors.length > 0) {
        console.log('\n错误详情:');
        results.errors.forEach(error => {
          console.log(`- ${error.imageId}: ${error.error}`);
        });
      }
      
    } else if (options.report) {
      const generator = new ReportGenerator();
      const report = await generator.generateReport();
      
      console.log('备份报告:');
      console.log(JSON.stringify(report, null, 2));
      
    } else if (options.stats) {
      const analyzer = new ProgressAnalyzer();
      await analyzer.loadData();
      
      const progress = analyzer.getProgressSummary();
      const scheduler = analyzer.getSchedulerStatus();
      
      console.log('备份统计:');
      console.log('进度:', progress);
      console.log('调度器:', scheduler);
      
    } else {
      console.log('使用方法:');
      console.log('  --web           启动Web监控界面');
      console.log('  --verify        验证备份完整性');
      console.log('  --report        生成备份报告');
      console.log('  --stats         显示统计信息');
    }
    
  } catch (error) {
    console.error('监控程序异常:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { WebMonitor, IntegrityVerifier, ReportGenerator, CONFIG };

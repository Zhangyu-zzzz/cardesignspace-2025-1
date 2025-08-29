#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 监控配置
const LOG_FILE = path.join(__dirname, '../logs/access.log');
const ALERT_FILE = path.join(__dirname, '../logs/crawler-alerts.log');
const SUSPICIOUS_PATTERNS = [
  /wp-admin/i, /wp-login/i, /wp-signup/i, /admin/i, /administrator/i,
  /phpmyadmin/i, /mysql/i, /database/i, /db/i, /config/i, /setup/i,
  /install/i, /test/i, /debug/i, /api-docs/i, /swagger/i
];

const MALICIOUS_USER_AGENTS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /scanner/i, /probe/i,
  /wget/i, /curl/i, /python/i, /java/i, /perl/i, /ruby/i, /php/i,
  /asp/i, /jsp/i, /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i,
  /blexbot/i, /rogerbot/i, /exabot/i, /ia_archiver/i
];

// 统计数据结构
const stats = {
  totalRequests: 0,
  suspiciousRequests: 0,
  maliciousUserAgents: 0,
  blockedIPs: new Set(),
  suspiciousIPs: new Map(),
  topSuspiciousIPs: new Map(),
  topSuspiciousPaths: new Map(),
  alerts: []
};

// 解析日志行
function parseLogLine(line) {
  try {
    // 标准Nginx日志格式
    const regex = /^(\S+) - (\S+) \[([^\]]+)\] "([^"]+)" (\d+) (\d+) "([^"]*)" "([^"]*)" "([^"]*)"$/;
    const match = line.match(regex);
    
    if (!match) return null;
    
    const [, ip, user, timestamp, request, status, bytes, referer, userAgent, forwardedFor] = match;
    const [method, url, protocol] = request.split(' ');
    
    return {
      ip,
      user,
      timestamp,
      method,
      url,
      protocol,
      status: parseInt(status),
      bytes: parseInt(bytes),
      referer,
      userAgent,
      forwardedFor
    };
  } catch (error) {
    console.error('解析日志行失败:', error);
    return null;
  }
}

// 检测可疑请求
function isSuspiciousRequest(logEntry) {
  if (!logEntry) return false;
  
  // 检查可疑路径
  const suspiciousPath = SUSPICIOUS_PATTERNS.some(pattern => pattern.test(logEntry.url));
  
  // 检查恶意User-Agent
  const maliciousUA = MALICIOUS_USER_AGENTS.some(pattern => pattern.test(logEntry.userAgent));
  
  // 检查异常状态码
  const unusualStatus = logEntry.status >= 400 && logEntry.status !== 404;
  
  return suspiciousPath || maliciousUA || unusualStatus;
}

// 分析日志文件
function analyzeLogFile() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      console.log('❌ 日志文件不存在:', LOG_FILE);
      return;
    }
    
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 开始分析 ${lines.length} 条日志记录...`);
    
    lines.forEach(line => {
      const logEntry = parseLogLine(line);
      if (!logEntry) return;
      
      stats.totalRequests++;
      
      if (isSuspiciousRequest(logEntry)) {
        stats.suspiciousRequests++;
        
        // 记录可疑IP
        if (!stats.suspiciousIPs.has(logEntry.ip)) {
          stats.suspiciousIPs.set(logEntry.ip, []);
        }
        stats.suspiciousIPs.get(logEntry.ip).push(logEntry);
        
        // 统计可疑路径
        const path = logEntry.url.split('?')[0];
        stats.topSuspiciousPaths.set(path, (stats.topSuspiciousPaths.get(path) || 0) + 1);
        
        // 检测恶意User-Agent
        if (MALICIOUS_USER_AGENTS.some(pattern => pattern.test(logEntry.userAgent))) {
          stats.maliciousUserAgents++;
          stats.blockedIPs.add(logEntry.ip);
          
          // 生成警报
          const alert = {
            timestamp: logEntry.timestamp,
            ip: logEntry.ip,
            url: logEntry.url,
            userAgent: logEntry.userAgent,
            type: 'MALICIOUS_USER_AGENT',
            severity: 'HIGH'
          };
          stats.alerts.push(alert);
        }
      }
    });
    
    // 生成报告
    generateReport();
    
  } catch (error) {
    console.error('❌ 分析日志文件失败:', error);
  }
}

// 生成报告
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('🛡️  爬虫监控报告');
  console.log('='.repeat(60));
  
  console.log(`📈 总请求数: ${stats.totalRequests}`);
  console.log(`🚫 可疑请求数: ${stats.suspiciousRequests}`);
  console.log(`🤖 恶意User-Agent数: ${stats.maliciousUserAgents}`);
  console.log(`🚨 被封禁IP数: ${stats.blockedIPs.size}`);
  
  // 显示可疑IP统计
  console.log('\n🔍 可疑IP统计:');
  const sortedIPs = Array.from(stats.suspiciousIPs.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  sortedIPs.forEach(([ip, requests]) => {
    console.log(`  ${ip}: ${requests.length} 次可疑请求`);
  });
  
  // 显示可疑路径统计
  console.log('\n🔍 可疑路径统计:');
  const sortedPaths = Array.from(stats.topSuspiciousPaths.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedPaths.forEach(([path, count]) => {
    console.log(`  ${path}: ${count} 次访问`);
  });
  
  // 显示警报
  if (stats.alerts.length > 0) {
    console.log('\n🚨 安全警报:');
    stats.alerts.slice(-5).forEach(alert => {
      console.log(`  [${alert.timestamp}] ${alert.ip} - ${alert.type}`);
      console.log(`    URL: ${alert.url}`);
      console.log(`    User-Agent: ${alert.userAgent.substring(0, 100)}...`);
    });
  }
  
  // 保存警报到文件
  if (stats.alerts.length > 0) {
    const alertContent = stats.alerts.map(alert => 
      `[${alert.timestamp}] ${alert.ip} - ${alert.type} - ${alert.url} - ${alert.userAgent}`
    ).join('\n');
    
    fs.appendFileSync(ALERT_FILE, alertContent + '\n');
    console.log(`\n📝 警报已保存到: ${ALERT_FILE}`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// 实时监控模式
function startRealTimeMonitoring() {
  console.log('🔍 启动实时监控模式...');
  console.log('按 Ctrl+C 停止监控\n');
  
  let lastSize = 0;
  
  const checkForNewLogs = () => {
    try {
      if (!fs.existsSync(LOG_FILE)) return;
      
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > lastSize) {
        const stream = fs.createReadStream(LOG_FILE, { start: lastSize });
        let buffer = '';
        
        stream.on('data', (chunk) => {
          buffer += chunk.toString();
        });
        
        stream.on('end', () => {
          const lines = buffer.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            const logEntry = parseLogLine(line);
            if (logEntry && isSuspiciousRequest(logEntry)) {
              console.log(`🚨 实时警报: ${logEntry.ip} - ${logEntry.url}`);
              console.log(`   User-Agent: ${logEntry.userAgent.substring(0, 100)}...`);
              console.log('');
            }
          });
        });
        
        lastSize = stats.size;
      }
    } catch (error) {
      console.error('实时监控错误:', error);
    }
  };
  
  // 每5秒检查一次
  setInterval(checkForNewLogs, 5000);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--realtime') || args.includes('-r')) {
    startRealTimeMonitoring();
  } else {
    analyzeLogFile();
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  analyzeLogFile,
  startRealTimeMonitoring,
  isSuspiciousRequest
};

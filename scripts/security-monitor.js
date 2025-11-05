#!/usr/bin/env node

/**
 * 安全监控脚本 - 实时检测和告警异常访问
 * 
 * 功能：
 * 1. 监控Nginx访问日志
 * 2. 检测恶意访问模式
 * 3. 实时告警可疑活动
 * 4. 生成安全报告
 * 
 * 使用方法：
 * node scripts/security-monitor.js [--realtime]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ==========================================
// 配置
// ==========================================
const CONFIG = {
  // 日志文件路径
  nginxAccessLog: '/var/log/nginx/cardesignspace_access.log',
  nginxErrorLog: '/var/log/nginx/cardesignspace_error.log',
  backendLog: path.join(__dirname, '../backend/logs/app.log'),
  
  // 本地测试路径（如果生产日志不存在）
  localNginxLog: path.join(__dirname, '../logs/nginx-access.log'),
  
  // 告警阈值
  thresholds: {
    maliciousRequestsPerMinute: 5,  // 每分钟恶意请求数
    uniqueAttackIPsThreshold: 3,    // 独立攻击IP数
    sensitiveFileAccessThreshold: 1  // 敏感文件访问次数
  },
  
  // 监控间隔（毫秒）
  monitorInterval: 30000, // 30秒
  
  // 报告输出路径
  reportPath: path.join(__dirname, '../logs/security-report.log')
};

// ==========================================
// 恶意模式定义
// ==========================================
const MALICIOUS_PATTERNS = {
  // 敏感文件访问
  sensitiveFiles: [
    /\/\.env/i, /\/\.git/i, /\/\.svn/i, /\/\.htaccess/i,
    /\/composer\.json/i, /\/package\.json/i, /\/web\.config/i,
    /\/php\.ini/i, /\/\.DS_Store/i
  ],
  
  // PHP相关探测
  phpProbes: [
    /\/phpinfo/i, /\/info\.php/i, /\/test\.php/i, /\/shell\.php/i,
    /\/php-fpm\.conf/i
  ],
  
  // 后台管理探测
  adminProbes: [
    /\/wp-admin/i, /\/wp-login/i, /\/admin/i, /\/administrator/i,
    /\/console/i, /\/cpanel/i, /\/phpmyadmin/i, /\/wiki/i
  ],
  
  // Laravel特定漏洞
  laravelVulns: [
    /_ignition\/execute-solution/i, /\/telescope/i, /\/horizon/i,
    /\/debugbar/i
  ],
  
  // Shell和后门
  shellPatterns: [
    /\/shell/i, /\/backdoor/i, /\/webshell/i, /\/c99/i, /\/r57/i,
    /\/phpshell/i
  ],
  
  // SQL注入尝试
  sqlInjection: [
    /union.*select/i, /select.*from/i, /insert.*into/i,
    /delete.*from/i, /drop.*table/i, /' or '1'='1'/i
  ],
  
  // 恶意User-Agent
  maliciousUserAgents: [
    /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zmap/i,
    /^wget\//i, /^curl\//i, /python-requests/i, /^bot$/i,
    /^scanner$/i, /^probe$/i
  ]
};

// ==========================================
// 统计数据
// ==========================================
class SecurityStats {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.totalRequests = 0;
    this.maliciousRequests = 0;
    this.attackIPs = new Set();
    this.attacksByType = {
      sensitiveFiles: 0,
      phpProbes: 0,
      adminProbes: 0,
      laravelVulns: 0,
      shellPatterns: 0,
      sqlInjection: 0,
      maliciousUserAgents: 0
    };
    this.topAttackers = new Map(); // IP -> 攻击次数
    this.attackPaths = new Map();  // Path -> 访问次数
  }
  
  recordAttack(ip, path, type) {
    this.maliciousRequests++;
    this.attackIPs.add(ip);
    this.attacksByType[type]++;
    
    // 记录攻击者
    const count = this.topAttackers.get(ip) || 0;
    this.topAttackers.set(ip, count + 1);
    
    // 记录攻击路径
    const pathCount = this.attackPaths.get(path) || 0;
    this.attackPaths.set(path, pathCount + 1);
  }
  
  getTopAttackers(limit = 10) {
    return Array.from(this.topAttackers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
  
  getTopAttackPaths(limit = 10) {
    return Array.from(this.attackPaths.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}

const stats = new SecurityStats();

// ==========================================
// 日志解析
// ==========================================
function parseLogLine(line) {
  // Nginx日志格式: IP - - [时间] "请求" 状态码 大小 "Referer" "User-Agent"
  const nginxRegex = /^([\d\.]+) - - \[(.*?)\] "(.*?)" (\d+) (\d+|-) "(.*?)" "(.*?)"/;
  const match = line.match(nginxRegex);
  
  if (!match) return null;
  
  return {
    ip: match[1],
    timestamp: match[2],
    request: match[3],
    statusCode: parseInt(match[4]),
    size: match[5],
    referer: match[6],
    userAgent: match[7]
  };
}

function extractPath(request) {
  // 从 "GET /path HTTP/1.1" 中提取路径
  const parts = request.split(' ');
  return parts[1] || '';
}

// ==========================================
// 威胁检测
// ==========================================
function detectThreat(logEntry) {
  if (!logEntry) return null;
  
  const path = extractPath(logEntry.request);
  const userAgent = logEntry.userAgent;
  const ip = logEntry.ip;
  
  // 检测敏感文件访问
  if (MALICIOUS_PATTERNS.sensitiveFiles.some(p => p.test(path))) {
    return { type: 'sensitiveFiles', ip, path, severity: 'HIGH' };
  }
  
  // 检测PHP探测
  if (MALICIOUS_PATTERNS.phpProbes.some(p => p.test(path))) {
    return { type: 'phpProbes', ip, path, severity: 'HIGH' };
  }
  
  // 检测后台管理探测
  if (MALICIOUS_PATTERNS.adminProbes.some(p => p.test(path))) {
    return { type: 'adminProbes', ip, path, severity: 'MEDIUM' };
  }
  
  // 检测Laravel漏洞
  if (MALICIOUS_PATTERNS.laravelVulns.some(p => p.test(path))) {
    return { type: 'laravelVulns', ip, path, severity: 'CRITICAL' };
  }
  
  // 检测Shell模式
  if (MALICIOUS_PATTERNS.shellPatterns.some(p => p.test(path))) {
    return { type: 'shellPatterns', ip, path, severity: 'CRITICAL' };
  }
  
  // 检测SQL注入
  if (MALICIOUS_PATTERNS.sqlInjection.some(p => p.test(path))) {
    return { type: 'sqlInjection', ip, path, severity: 'CRITICAL' };
  }
  
  // 检测恶意User-Agent
  if (MALICIOUS_PATTERNS.maliciousUserAgents.some(p => p.test(userAgent))) {
    return { type: 'maliciousUserAgents', ip, path, severity: 'MEDIUM' };
  }
  
  return null;
}

// ==========================================
// 告警系统
// ==========================================
function sendAlert(threat, logEntry) {
  const timestamp = new Date().toISOString();
  const alertMessage = `
🚨 安全告警 [${threat.severity}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
时间: ${timestamp}
类型: ${threat.type}
严重程度: ${threat.severity}
攻击者IP: ${threat.ip}
访问路径: ${threat.path}
User-Agent: ${logEntry.userAgent}
状态码: ${logEntry.statusCode}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  
  console.log(alertMessage);
  
  // 写入告警日志
  const logDir = path.dirname(CONFIG.reportPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(CONFIG.reportPath, alertMessage + '\n', 'utf8');
}

// ==========================================
// 生成报告
// ==========================================
function generateReport() {
  const timestamp = new Date().toISOString();
  const topAttackers = stats.getTopAttackers(5);
  const topPaths = stats.getTopAttackPaths(10);
  
  const report = `
📊 安全监控报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
生成时间: ${timestamp}

📈 总体统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总请求数: ${stats.totalRequests}
恶意请求数: ${stats.maliciousRequests}
恶意请求占比: ${((stats.maliciousRequests / stats.totalRequests) * 100).toFixed(2)}%
独立攻击IP数: ${stats.attackIPs.size}

🎯 攻击类型分布
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
敏感文件访问: ${stats.attacksByType.sensitiveFiles}
PHP探测: ${stats.attacksByType.phpProbes}
后台探测: ${stats.attacksByType.adminProbes}
Laravel漏洞: ${stats.attacksByType.laravelVulns}
Shell攻击: ${stats.attacksByType.shellPatterns}
SQL注入: ${stats.attacksByType.sqlInjection}
恶意User-Agent: ${stats.attacksByType.maliciousUserAgents}

👤 Top5 攻击者IP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${topAttackers.map(([ip, count], index) => 
  `${index + 1}. ${ip} - ${count}次攻击`
).join('\n')}

🎯 Top10 被攻击路径
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${topPaths.map(([path, count], index) => 
  `${index + 1}. ${path} - ${count}次`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  
  console.log(report);
  return report;
}

// ==========================================
// 分析日志文件
// ==========================================
function analyzeLogFile(logPath) {
  console.log(`\n🔍 分析日志文件: ${logPath}\n`);
  
  if (!fs.existsSync(logPath)) {
    console.log(`⚠️  日志文件不存在: ${logPath}`);
    return;
  }
  
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  stats.reset();
  stats.totalRequests = lines.length;
  
  lines.forEach(line => {
    const logEntry = parseLogLine(line);
    if (!logEntry) return;
    
    const threat = detectThreat(logEntry);
    if (threat) {
      stats.recordAttack(threat.ip, threat.path, threat.type);
      sendAlert(threat, logEntry);
    }
  });
  
  // 生成报告
  const report = generateReport();
  
  // 保存报告
  fs.writeFileSync(CONFIG.reportPath, report, 'utf8');
  console.log(`\n✅ 报告已保存: ${CONFIG.reportPath}\n`);
}

// ==========================================
// 实时监控
// ==========================================
function startRealtimeMonitor(logPath) {
  console.log(`\n🔴 启动实时监控: ${logPath}`);
  console.log('按 Ctrl+C 停止监控\n');
  
  if (!fs.existsSync(logPath)) {
    console.log(`⚠️  日志文件不存在: ${logPath}`);
    console.log('将使用测试模式...\n');
    // 继续运行，等待文件创建
  }
  
  // 使用tail -f命令实时监控日志
  const tail = spawn('tail', ['-f', logPath]);
  
  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      stats.totalRequests++;
      const logEntry = parseLogLine(line);
      
      if (!logEntry) return;
      
      const threat = detectThreat(logEntry);
      if (threat) {
        stats.recordAttack(threat.ip, threat.path, threat.type);
        sendAlert(threat, logEntry);
      }
    });
  });
  
  tail.stderr.on('data', (data) => {
    console.error(`错误: ${data}`);
  });
  
  tail.on('close', (code) => {
    console.log(`监控进程退出，代码: ${code}`);
  });
  
  // 定期生成报告
  setInterval(() => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const report = generateReport();
    fs.appendFileSync(CONFIG.reportPath, report + '\n', 'utf8');
  }, CONFIG.monitorInterval);
}

// ==========================================
// 主程序
// ==========================================
function main() {
  console.log(`
╔═══════════════════════════════════════════╗
║     🛡️  安全监控系统                      ║
║     CarDesignSpace Security Monitor       ║
╚═══════════════════════════════════════════╝
  `);
  
  const args = process.argv.slice(2);
  const isRealtime = args.includes('--realtime') || args.includes('-r');
  
  // 确定日志文件路径
  let logPath = CONFIG.nginxAccessLog;
  if (!fs.existsSync(logPath)) {
    logPath = CONFIG.localNginxLog;
    console.log(`ℹ️  使用本地日志文件: ${logPath}`);
  }
  
  if (isRealtime) {
    // 实时监控模式
    startRealtimeMonitor(logPath);
  } else {
    // 分析历史日志
    analyzeLogFile(logPath);
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n\n📊 生成最终报告...');
  const report = generateReport();
  fs.writeFileSync(CONFIG.reportPath, report, 'utf8');
  console.log(`✅ 报告已保存: ${CONFIG.reportPath}`);
  console.log('\n👋 监控已停止\n');
  process.exit(0);
});

// 运行主程序
if (require.main === module) {
  main();
}

module.exports = {
  parseLogLine,
  detectThreat,
  SecurityStats
};



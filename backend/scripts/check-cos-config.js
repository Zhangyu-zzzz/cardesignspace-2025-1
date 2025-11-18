#!/usr/bin/env node

/**
 * COS配置检查脚本
 * 用于诊断COS配置问题
 */

// 尝试多个可能的.env文件路径
const path = require('path');
const fs = require('fs');

// 可能的.env文件路径（按优先级）
const envPaths = [
  path.join(process.cwd(), '.env'),               // 当前工作目录（最重要）
  path.join(__dirname, '../.env'),                 // backend目录
  path.join(__dirname, '../../.env'),              // 项目根目录
  path.join(__dirname, '../../../.env'),          // 项目根目录（从scripts目录）
  '/opt/auto-gallery/backend/.env',               // 生产环境backend路径
  '/opt/auto-gallery/.env'                        // 生产环境根目录路径
];

// 查找并加载.env文件
let envLoaded = false;
let loadedPath = null;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    loadedPath = envPath;
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  未找到.env文件，将使用系统环境变量');
  console.warn('   尝试的路径:');
  envPaths.forEach(p => console.warn(`   - ${p}`));
  console.warn('');
  require('dotenv').config(); // 尝试从系统环境变量加载
} else {
  console.log(`✅ 已加载环境变量文件: ${loadedPath}\n`);
}

console.log('=== COS配置检查 ===\n');

// 检查环境变量
const requiredVars = [
  'TENCENT_SECRET_ID',
  'TENCENT_SECRET_KEY',
  'COS_BUCKET',
  'COS_REGION'
];

const optionalVars = [
  'COS_DOMAIN'
];

console.log('必需的环境变量:');
let hasError = false;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === 'your-secret-id' || value === 'your-secret-key' || value === 'test-1250000000') {
    console.log(`  ❌ ${varName}: ${value || '未设置'} (无效)`);
    hasError = true;
  } else {
    // 隐藏敏感信息
    const displayValue = varName.includes('SECRET') 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      : value;
    console.log(`  ✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n可选的环境变量:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value}`);
  } else {
    console.log(`  ⚠️  ${varName}: 未设置 (将使用默认值)`);
  }
});

// 测试COS连接
console.log('\n=== 测试COS连接 ===');
try {
  const COS = require('cos-nodejs-sdk-v5');
  const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
  });

  const bucket = process.env.COS_BUCKET || 'test-1250000000';
  const region = process.env.COS_REGION || 'ap-beijing';

  console.log(`尝试连接存储桶: ${bucket} (区域: ${region})`);

  // 尝试获取存储桶信息
  cos.getBucket({
    Bucket: bucket,
    Region: region,
    MaxKeys: 1
  }, function(err, data) {
    if (err) {
      console.error('❌ COS连接失败:');
      console.error(`   错误代码: ${err.code || '未知'}`);
      console.error(`   HTTP状态: ${err.statusCode || '未知'}`);
      console.error(`   错误信息: ${err.message || '未知错误'}`);
      if (err.statusCode === 403) {
        console.error('\n   可能的原因:');
        console.error('   - 密钥权限不足');
        console.error('   - 存储桶访问权限设置错误');
      } else if (err.statusCode === 404) {
        console.error('\n   可能的原因:');
        console.error('   - 存储桶不存在');
        console.error('   - 区域配置错误');
      } else if (err.code === 'CredentialsError') {
        console.error('\n   可能的原因:');
        console.error('   - SecretId或SecretKey错误');
        console.error('   - 密钥已过期或被禁用');
      }
      process.exit(1);
    } else {
      console.log('✅ COS连接成功!');
      console.log(`   存储桶名称: ${data.Name}`);
      console.log(`   区域: ${data.Region}`);
      console.log(`   对象数量: ${data.Contents ? data.Contents.length : 0}`);
      console.log('\n✅ COS配置正确，可以正常使用!');
      process.exit(0);
    }
  });
} catch (error) {
  console.error('❌ COS SDK初始化失败:');
  console.error(`   错误: ${error.message}`);
  console.error('\n   可能的原因:');
  console.error('   - cos-nodejs-sdk-v5 包未安装');
  console.error('   - 环境变量配置错误');
  process.exit(1);
}


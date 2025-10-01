#!/usr/bin/env node

/**
 * DeepSeek API 综合管理脚本
 * 提供统一的接口来管理车型信息补充和图片标签补充
 */

const { exec } = require('child_process');
const path = require('path');

class DeepSeekManager {
  constructor() {
    this.scripts = {
      test: 'test-deepseek.js',
      testDb: 'test-db-connection.js',
      enhanceModels: 'simple-enhance-models.js',
      enhanceImages: 'process-empty-tags.js',
      checkTags: 'find-empty-tags.js'
    };
  }

  /**
   * 执行脚本
   */
  async runScript(scriptName) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, this.scripts[scriptName]);
      console.log(`🚀 执行脚本: ${scriptName}`);
      console.log(`📁 脚本路径: ${scriptPath}`);
      console.log('─'.repeat(50));
      
      const child = exec(`node ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ 脚本执行失败: ${error.message}`);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.error(`⚠️ 警告: ${stderr}`);
        }
        
        console.log(stdout);
        resolve();
      });
      
      child.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      child.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🤖 DeepSeek API 综合管理脚本

使用方法:
  node deepseek-manager.js <命令>

可用命令:
  test          - 测试DeepSeek API连接
  test-db       - 测试数据库连接
  enhance-models - 补充车型信息 (type, specs, description, styleTags)
  enhance-images - 补充图片标签
  check-tags   - 检查图片标签情况
  all          - 执行完整的补充流程
  help         - 显示此帮助信息

示例:
  node deepseek-manager.js test
  node deepseek-manager.js enhance-models
  node deepseek-manager.js all
    `);
  }

  /**
   * 执行完整的补充流程
   */
  async runAll() {
    try {
      console.log('🎯 开始执行完整的DeepSeek补充流程...\n');
      
      // 1. 测试API连接
      console.log('📡 步骤1: 测试DeepSeek API连接');
      await this.runScript('test');
      
      // 2. 测试数据库连接
      console.log('\n📡 步骤2: 测试数据库连接');
      await this.runScript('testDb');
      
      // 3. 检查图片标签情况
      console.log('\n📊 步骤3: 检查图片标签情况');
      await this.runScript('checkTags');
      
      // 4. 补充车型信息
      console.log('\n🚗 步骤4: 补充车型信息');
      await this.runScript('enhanceModels');
      
      // 5. 补充图片标签
      console.log('\n🖼️ 步骤5: 补充图片标签');
      await this.runScript('enhanceImages');
      
      console.log('\n🎉 完整的DeepSeek补充流程执行完成！');
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
    }
  }

  /**
   * 主执行函数
   */
  async run() {
    const command = process.argv[2];
    
    if (!command || command === 'help') {
      this.showHelp();
      return;
    }
    
    try {
      switch (command) {
        case 'test':
          await this.runScript('test');
          break;
          
        case 'test-db':
          await this.runScript('testDb');
          break;
          
        case 'enhance-models':
          await this.runScript('enhanceModels');
          break;
          
        case 'enhance-images':
          await this.runScript('enhanceImages');
          break;
          
        case 'check-tags':
          await this.runScript('checkTags');
          break;
          
        case 'all':
          await this.runAll();
          break;
          
        default:
          console.log(`❌ 未知命令: ${command}`);
          this.showHelp();
      }
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
    }
  }
}

// 执行脚本
if (require.main === module) {
  const manager = new DeepSeekManager();
  manager.run().catch(console.error);
}

module.exports = DeepSeekManager;





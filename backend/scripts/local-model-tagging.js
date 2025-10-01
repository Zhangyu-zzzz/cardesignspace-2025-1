#!/usr/bin/env node

/**
 * 纯本地模型标签生成系统
 * 只使用自训练模型进行图片标签生成
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../src/config/mysql');
const Image = require('../src/models/mysql/Image');
const Model = require('../src/models/mysql/Model');
const Brand = require('../src/models/mysql/Brand');

// 自训练模型路径
const AI_MODEL_PATH = '/Users/zobot/Desktop/unsplash-crawler/AI汽车图片打标签';

class LocalModelTagger {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
  }

  /**
   * 调用本地训练模型进行预测
   */
  async predictWithLocalModel(imageUrl, imageId) {
    return new Promise((resolve, reject) => {
      console.log(`🤖 调用本地训练模型分析图片 ${imageId}...`);
      
      // 创建临时文件保存图片URL
      const tempFile = path.join(__dirname, `temp_${imageId}.txt`);
      fs.writeFileSync(tempFile, imageUrl);
      
      // 调用本地模型预测脚本
      const pythonScript = path.join(AI_MODEL_PATH, 'simple_real_model.py');
      const pythonProcess = spawn('python', [pythonScript, tempFile, imageId.toString()], {
        cwd: AI_MODEL_PATH,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        // 清理临时文件
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.warn('清理临时文件失败:', e.message);
        }
        
        if (code === 0) {
          try {
            // 解析PREDICTION_RESULT格式的输出
            const predictionMatch = output.match(/PREDICTION_RESULT:({.*})/);
            
            if (predictionMatch) {
              const result = JSON.parse(predictionMatch[1]);
              console.log(`✅ 本地模型预测完成: ${result.label || '无标签'}`);
              console.log(`   最高置信度: ${result.confidence?.toFixed(3) || '0.000'}`);
              
              // 转换为标准格式
              const tagResult = {
                top_labels: [result.label],
                confidences: { [result.label]: result.confidence }
              };
              resolve(tagResult);
            } else {
              throw new Error('未找到PREDICTION_RESULT输出');
            }
          } catch (parseError) {
            console.error('解析模型输出失败:', parseError.message);
            console.error('原始输出:', output);
            reject(new Error('模型输出解析失败'));
          }
        } else {
          console.error('本地模型调用失败:', error);
          reject(new Error(`模型调用失败: ${error}`));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('模型调用超时'));
      }, 30000); // 30秒超时
    });
  }

  /**
   * 处理单张图片
   */
  async processImage(image) {
    try {
      console.log(`\n🔄 处理图片: ${image.filename} (ID: ${image.id})`);
      console.log(`   URL: ${image.url}`);

      // 简化处理，直接进行标签生成
      console.log(`   开始分析图片内容...`);

      // 调用本地模型进行预测
      console.log(`🚀 调用本地训练模型...`);
      const modelResult = await this.predictWithLocalModel(image.url, image.id);

      // 分析预测结果
      console.log(`\n📊 预测结果分析:`);
      console.log(`──────────────────────────────────────────────────`);
      
      if (modelResult && modelResult.top_labels && modelResult.top_labels.length > 0) {
        console.log(`✅ 本地模型: ${modelResult.top_labels.join(', ')}`);
        if (modelResult.confidences) {
          const maxConf = Math.max(...Object.values(modelResult.confidences));
          console.log(`   最高置信度: ${maxConf.toFixed(3)}`);
        }
        
        // 直接使用本地模型的结果
        const finalTags = modelResult.top_labels;
        console.log(`🎯 最终标签: ${finalTags.length}个标签 - ${finalTags.join(', ')}`);
        
        // 更新数据库
        await Image.update(
          { tags: finalTags },
          { where: { id: image.id } }
        );
        
        console.log(`✅ 图片 ${image.id} 标签更新: ${finalTags.join(', ')}`);
        this.processedCount++;
        
      } else {
        console.log(`❌ 本地模型: 无有效预测结果`);
        this.errorCount++;
      }

    } catch (error) {
      console.error(`❌ 处理图片 ${image.id} 失败:`, error.message);
      this.errorCount++;
    }
  }

  /**
   * 主处理函数
   */
  async processImages() {
    try {
      console.log('🚀 开始本地模型标签生成系统...');
      console.log('🤖 使用自训练模型进行图片标签生成');
      
      // 获取需要处理的图片
      const images = await Image.findAll({
        where: {
          // 可以添加筛选条件，比如只处理没有标签的图片
          // tags: null
        },
        limit: 10, // 限制处理数量，避免一次性处理太多
        order: [['id', 'ASC']]
      });

      console.log(`\n📊 找到 ${images.length} 张图片进行处理`);

      if (images.length === 0) {
        console.log('📭 没有找到需要处理的图片');
        return;
      }

      // 逐张处理图片
      for (const image of images) {
        await this.processImage(image);
        
        // 添加延迟，避免过度占用资源
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`\n🎉 本地模型标签生成完成！`);
      console.log(`📊 处理统计:`);
      console.log(`   - 成功处理: ${this.processedCount} 张图片`);
      console.log(`   - 处理失败: ${this.errorCount} 张图片`);

    } catch (error) {
      console.error('❌ 处理过程中发生错误:', error);
    }
  }
}

// 主执行函数
async function main() {
  const tagger = new LocalModelTagger();
  await tagger.processImages();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = LocalModelTagger;

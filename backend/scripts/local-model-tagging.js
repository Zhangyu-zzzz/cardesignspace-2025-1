#!/usr/bin/env node

/**
 * 纯本地模型标签生成系统
 * 只使用自训练模型进行图片标签生成
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
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
    this.processedIds = new Set();
    this.progressFile = path.join(__dirname, 'tagging_progress.json');
    this.loadProgress();
  }

  /**
   * 加载进度文件
   */
  loadProgress() {
    try {
      if (fs.existsSync(this.progressFile)) {
        const data = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
        this.processedIds = new Set(data.processedIds || []);
        this.processedCount = data.processedCount || 0;
        this.errorCount = data.errorCount || 0;
        console.log(`📂 加载进度: 已处理 ${this.processedIds.size} 张图片`);
      }
    } catch (error) {
      console.warn('加载进度文件失败:', error.message);
    }
  }

  /**
   * 保存进度
   */
  saveProgress() {
    try {
      const data = {
        processedIds: Array.from(this.processedIds),
        processedCount: this.processedCount,
        errorCount: this.errorCount,
        lastUpdate: new Date().toISOString()
      };
      fs.writeFileSync(this.progressFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('保存进度失败:', error.message);
    }
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
      // 检查是否已处理过
      if (this.processedIds.has(image.id)) {
        console.log(`⏭️  跳过已处理图片: ${image.filename} (ID: ${image.id})`);
        return;
      }

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
        
        // 根据置信度决定最终标签
        const maxConf = modelResult.confidences ? Math.max(...Object.values(modelResult.confidences)) : 0;
        let finalTags = maxConf >= 0.7 ? modelResult.top_labels : ['其他'];
        
        // 如果是角度标签，同时添加"外饰"标签
        const angleTags = ['前45', '正侧', '后45', '正前', '正后'];
        const hasAngleTag = finalTags.some(tag => angleTags.includes(tag));
        
        if (hasAngleTag && !finalTags.includes('外饰')) {
          finalTags.push('外饰');
        }
        
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

      // 记录已处理的图片ID
      this.processedIds.add(image.id);
      
      // 每处理10张图片保存一次进度
      if (this.processedCount % 10 === 0) {
        this.saveProgress();
        console.log(`💾 进度已保存: 已处理 ${this.processedCount} 张图片`);
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
      
      // 简化查询条件，只查询 tags 为 null 的图片
      const processedIdsArray = Array.from(this.processedIds);
      const whereCondition = {
        tags: null
      };

      // 如果有已处理的ID，排除它们
      if (processedIdsArray.length > 0) {
        whereCondition.id = { [Op.notIn]: processedIdsArray };
      }

      // 分批处理，每次处理100张图片
      const batchSize = 100;
      let offset = 0;
      let totalProcessed = 0;
      let hasMore = true;

      console.log('📊 开始分批处理图片...');
      
      while (hasMore) {
        const batchImages = await Image.findAll({
          where: whereCondition,
          order: [['id', 'ASC']],
          limit: batchSize,
          offset: offset
        });

        if (batchImages.length === 0) {
          hasMore = false;
          console.log('📭 没有更多图片需要处理');
          break;
        }

        console.log(`\n📦 处理批次: ${offset + 1}-${offset + batchImages.length} (共 ${batchImages.length} 张图片)`);

        // 处理当前批次的图片
        for (let i = 0; i < batchImages.length; i++) {
          const image = batchImages[i];
          await this.processImage(image);
          
          // 显示批次内进度
          const batchProgress = ((i + 1) / batchImages.length * 100).toFixed(1);
          console.log(`📈 批次进度: ${i + 1}/${batchImages.length} (${batchProgress}%)`);
          
          // 添加延迟，避免过度占用资源
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        totalProcessed += batchImages.length;
        offset += batchSize;
        
        console.log(`✅ 批次完成，已处理 ${totalProcessed} 张图片`);
        
        // 每批次后保存进度
        this.saveProgress();
      }

      // 最终保存进度
      this.saveProgress();

      console.log(`\n🎉 本地模型标签生成完成！`);
      console.log(`📊 处理统计:`);
      console.log(`   - 成功处理: ${this.processedCount} 张图片`);
      console.log(`   - 处理失败: ${this.errorCount} 张图片`);
      console.log(`   - 总进度: ${this.processedIds.size} 张图片已标记为已处理`);
      console.log(`   - 总处理: ${totalProcessed} 张图片`);

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

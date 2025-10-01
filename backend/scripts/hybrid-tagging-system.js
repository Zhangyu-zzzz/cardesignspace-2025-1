#!/usr/bin/env node

/**
 * 混合标签生成系统
 * 结合自训练模型和DeepSeek API，提高标签生成准确度
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../src/config/mysql');
const Image = require('../src/models/mysql/Image');
const Model = require('../src/models/mysql/Model');
const Brand = require('../src/models/mysql/Brand');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-8e14c606de1342959a484b6c860ed0a6';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 自训练模型路径
const AI_MODEL_PATH = '/Users/zobot/Desktop/unsplash-crawler/AI汽车图片打标签';

class HybridTaggingSystem {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.modelPredictions = new Map();
    this.deepseekPredictions = new Map();
  }

  /**
   * 调用自训练模型进行预测
   */
  async predictWithLocalModel(imageUrl, imageId) {
    return new Promise((resolve, reject) => {
      console.log(`🤖 调用自训练模型分析图片 ${imageId}...`);
      
      // 创建临时文件保存图片URL
      const tempFile = path.join(__dirname, `temp_${imageId}.txt`);
      fs.writeFileSync(tempFile, imageUrl);
      
      // 调用Python脚本进行预测
      const pythonScript = path.join(AI_MODEL_PATH, 'predict_single_image.py');
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
            const result = JSON.parse(output);
            console.log(`✅ 自训练模型预测完成: ${result.top_labels?.join(', ') || '无标签'}`);
            resolve(result);
          } catch (parseError) {
            console.error('解析模型输出失败:', parseError.message);
            reject(new Error('模型输出解析失败'));
          }
        } else {
          console.error('自训练模型调用失败:', error);
          reject(new Error(`模型调用失败: ${error}`));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('模型调用超时'));
      }, 30000);
    });
  }

  /**
   * 调用DeepSeek API进行预测
   */
  async predictWithDeepSeek(imageUrl, modelName, brandName, filename) {
    const prompt = `请分析这张汽车图片的内容，并生成准确的标签。

图片信息：
- 车型：${brandName} ${modelName}
- 文件名：${filename}
- 图片URL：${imageUrl}

请从以下角度分析图片内容并生成标签：

1. **图片类型**（必选一个）：
   - 外型：车辆外观照片
   - 内饰：车内空间照片
   - 零部件：发动机、轮毂等部件
   - 其他：无法明确分类

2. **拍摄角度**（必选一个）：
   - 正前：车辆正前方
   - 正侧：车辆侧面
   - 正后：车辆后方
   - 前45：前45度角
   - 后45：后45度角
   - 俯侧：俯视侧面
   - 顶视：从上往下看
   - 内饰：车内视角

3. **具体部位**（可选1-2个）：
   - 前脸：前保险杠、格栅、大灯
   - 侧面：车身侧面线条
   - 尾部：后保险杠、尾灯
   - 内饰：仪表盘、座椅、中控台
   - 仪表盘：仪表盘特写
   - 座椅：座椅特写
   - 方向盘：方向盘特写
   - 轮毂：轮毂特写
   - 发动机：发动机舱
   - 其他：其他部位

4. **风格特征**（可选1-2个）：
   - 运动：运动风格
   - 豪华：豪华风格
   - 商务：商务风格
   - 家用：家用风格
   - 时尚：时尚风格
   - 科技：科技感
   - 经典：经典风格
   - 现代：现代风格

请以JSON数组格式返回，例如：
["外型", "正前", "前脸", "运动", "时尚"]`;

    try {
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices[0].message.content;
      console.log(`📝 DeepSeek分析响应: ${content.substring(0, 150)}...`);
      
      // 解析JSON数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tags = JSON.parse(jsonMatch[0]);
        console.log(`✅ DeepSeek解析成功: ${tags.length}个标签 - ${tags.join(', ')}`);
        return tags;
      } else {
        // 如果没有找到JSON数组，尝试提取标签
        const tags = content.match(/["'][^"']*["']/g) || [];
        const cleanTags = tags.map(tag => tag.replace(/["']/g, ''));
        console.log(`✅ DeepSeek提取标签: ${cleanTags.length}个 - ${cleanTags.join(', ')}`);
        return cleanTags;
      }
    } catch (error) {
      console.error(`❌ DeepSeek API调用失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 融合两种预测结果
   */
  fusePredictions(modelResult, deepseekResult) {
    console.log('🔄 融合预测结果...');
    
    const fusedTags = new Set();
    const confidence = {
      model: 0.7,    // 自训练模型权重
      deepseek: 0.3  // DeepSeek权重
    };
    
    // 添加自训练模型的预测结果
    if (modelResult && modelResult.top_labels) {
      modelResult.top_labels.forEach(tag => {
        if (modelResult.confidences && modelResult.confidences[tag]) {
          const weightedConfidence = modelResult.confidences[tag] * confidence.model;
          if (weightedConfidence > 0.5) {
            fusedTags.add(tag);
          }
        } else {
          fusedTags.add(tag);
        }
      });
    }
    
    // 添加DeepSeek的预测结果
    if (deepseekResult && deepseekResult.length > 0) {
      deepseekResult.forEach(tag => {
        fusedTags.add(tag);
      });
    }
    
    // 标签映射和标准化
    const finalTags = this.standardizeTags(Array.from(fusedTags));
    
    console.log(`🎯 融合结果: ${finalTags.length}个标签 - ${finalTags.join(', ')}`);
    return finalTags;
  }

  /**
   * 标准化标签
   */
  standardizeTags(tags) {
    const tagMapping = {
      // 角度标签映射
      '前45': '前45',
      '正侧': '正侧', 
      '后45': '后45',
      '正前': '正前',
      '正后': '正后',
      '内饰': '内饰',
      '方向盘': '方向盘',
      '中控屏': '中控屏',
      '座椅': '座椅',
      '轮毂': '轮毂',
      '头灯': '头灯',
      '尾灯': '尾灯',
      '格栅': '格栅',
      
      // 类型标签映射
      '外型': '外型',
      '内饰': '内饰',
      '零部件': '零部件',
      '其他': '其他',
      
      // 风格标签映射
      '运动': '运动',
      '豪华': '豪华',
      '商务': '商务',
      '家用': '家用',
      '时尚': '时尚',
      '科技': '科技',
      '经典': '经典',
      '现代': '现代'
    };
    
    return tags
      .map(tag => tagMapping[tag] || tag)
      .filter(tag => tag && tag.length > 0)
      .slice(0, 5); // 限制最多5个标签
  }

  /**
   * 更新图片标签
   */
  async updateImageTags(imageId, tags) {
    try {
      await Image.update({
        tags: tags
      }, {
        where: { id: imageId }
      });
      
      console.log(`✅ 图片 ${imageId} 标签更新: ${tags.join(', ')}`);
      return true;
    } catch (error) {
      console.error(`❌ 图片 ${imageId} 标签更新失败:`, error.message);
      return false;
    }
  }

  /**
   * 处理单张图片
   */
  async processImage(image) {
    try {
      console.log(`\n🔄 处理图片: ${image.filename} (ID: ${image.id})`);
      console.log(`   URL: ${image.url}`);
      
      // 获取车型信息
      const model = await Model.findByPk(image.modelId);
      const brand = model ? await Brand.findByPk(model.brandId) : null;
      
      const modelName = model ? model.name : '未知车型';
      const brandName = brand ? brand.name : '未知品牌';
      
      console.log(`   车型: ${brandName} ${modelName}`);
      
      // 并行调用两种预测方法
      console.log('🚀 并行调用自训练模型和DeepSeek API...');
      
      const [modelResult, deepseekResult] = await Promise.allSettled([
        this.predictWithLocalModel(image.url, image.id),
        this.predictWithDeepSeek(image.url, modelName, brandName, image.filename)
      ]);
      
      // 处理预测结果
      const modelTags = modelResult.status === 'fulfilled' ? modelResult.value : null;
      const deepseekTags = deepseekResult.status === 'fulfilled' ? deepseekResult.value : [];
      
      if (modelResult.status === 'rejected') {
        console.warn('⚠️ 自训练模型调用失败:', modelResult.reason.message);
      }
      
      if (deepseekResult.status === 'rejected') {
        console.warn('⚠️ DeepSeek API调用失败:', deepseekResult.reason.message);
      }
      
      // 融合预测结果
      const fusedTags = this.fusePredictions(modelTags, deepseekTags);
      
      // 更新图片标签
      const success = await this.updateImageTags(image.id, fusedTags);
      
      if (success) {
        this.processedCount++;
      } else {
        this.errorCount++;
      }
      
      // 延迟避免API限制
      await this.delay(3000);
      
    } catch (error) {
      console.error(`❌ 图片 ${image.id} 处理失败:`, error.message);
      this.errorCount++;
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 主执行函数
   */
  async run() {
    try {
      console.log('🚀 开始混合标签生成系统...');
      console.log('🤖 结合自训练模型和DeepSeek API，提高标签准确度');
      
      // 获取需要处理的图片
      const allImages = await Image.findAll({
        limit: 5, // 限制处理数量
        attributes: ['id', 'filename', 'modelId', 'url', 'tags']
      });
      
      console.log(`📊 找到 ${allImages.length} 张图片进行测试`);
      
      if (allImages.length === 0) {
        console.log('✅ 没有找到图片');
        return;
      }
      
      // 处理图片
      for (const image of allImages) {
        await this.processImage(image);
      }
      
      console.log('\n🎉 混合标签生成完成！');
      console.log(`📊 处理统计:`);
      console.log(`   - 成功处理: ${this.processedCount} 张图片`);
      console.log(`   - 处理失败: ${this.errorCount} 张图片`);
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
    } finally {
      await sequelize.close();
    }
  }
}

// 执行脚本
if (require.main === module) {
  const system = new HybridTaggingSystem();
  system.run().catch(console.error);
}

module.exports = HybridTaggingSystem;





#!/usr/bin/env node

/**
 * DeepSeek API 车型信息补充脚本
 * 使用DeepSeek API自动补充车型的详细信息
 */

const axios = require('axios');
const { sequelize } = require('../src/config/mysql');
const Model = require('../src/models/mysql/Model');
const Image = require('../src/models/mysql/Image');
const Brand = require('../src/models/mysql/Brand');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-8e14c606de1342959a484b6c860ed0a6';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// API 请求配置
const apiClient = axios.create({
  baseURL: DEEPSEEK_API_URL,
  headers: {
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30秒超时
});

class DeepSeekEnhancer {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.batchSize = 5; // 批量处理大小
    this.delay = 1000; // 请求间隔延迟（毫秒）
  }

  /**
   * 调用DeepSeek API获取车型详细信息
   */
  async getModelInfo(modelName, brandName) {
    const prompt = `请为汽车车型"${brandName} ${modelName}"提供详细的JSON格式信息，包括：

1. 车型分类（type）：从以下选项中选择最合适的：轿车、SUV、MPV、WAGON、SHOOTINGBRAKE、皮卡、跑车、Hatchback、其他
2. 基本参数（specs）：包含长、宽、高、轴距、发动机排量、功率、扭矩等关键参数
3. 车型描述（description）：简洁的车型介绍，突出特点
4. 风格标签（styleTags）：3-5个描述车型风格的标签，如：运动、豪华、商务、家用、时尚等

请以JSON格式返回，格式如下：
{
  "type": "车型分类",
  "specs": {
    "length": "长度(mm)",
    "width": "宽度(mm)", 
    "height": "高度(mm)",
    "wheelbase": "轴距(mm)",
    "engine": "发动机信息",
    "power": "功率",
    "torque": "扭矩"
  },
  "description": "车型描述",
  "styleTags": ["标签1", "标签2", "标签3"]
}

如果无法获取准确信息，请基于车型名称进行合理推测。`;

    try {
      const response = await apiClient.post('', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.data.choices[0].message.content;
      console.log(`DeepSeek API 响应: ${content.substring(0, 200)}...`);
      
      // 解析JSON响应
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析JSON响应');
      }
    } catch (error) {
      console.error(`DeepSeek API 调用失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 调用DeepSeek API获取图片标签
   */
  async getImageTags(imageUrl, modelName, brandName) {
    const prompt = `请分析这张汽车图片，为"${brandName} ${modelName}"车型生成标签。

请从以下角度分析并生成标签：
1. 图片类型：外型、内饰、零部件、其他
2. 拍摄角度：正前、正侧、正后、前45、后45、俯侧、顶视
3. 具体部位：前脸、侧面、尾部、内饰、仪表盘、座椅等
4. 风格特征：运动、豪华、商务、家用、时尚等

请以JSON数组格式返回标签，例如：
["外型", "正前", "前脸", "运动", "时尚"]

注意：请基于图片内容进行准确分析，如果无法看到图片，请基于车型信息进行合理推测。`;

    try {
      const response = await apiClient.post('', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.data.choices[0].message.content;
      console.log(`图片标签API响应: ${content.substring(0, 100)}...`);
      
      // 解析JSON数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        // 如果没有找到JSON数组，尝试提取标签
        const tags = content.match(/["'][^"']*["']/g) || [];
        return tags.map(tag => tag.replace(/["']/g, ''));
      }
    } catch (error) {
      console.error(`图片标签API调用失败: ${error.message}`);
      return ['外型', '其他']; // 默认标签
    }
  }

  /**
   * 更新车型信息
   */
  async updateModel(modelId, enhancedData) {
    try {
      await Model.update({
        type: enhancedData.type || '其他',
        specs: enhancedData.specs || {},
        description: enhancedData.description || '',
        styleTags: enhancedData.styleTags || []
      }, {
        where: { id: modelId }
      });
      
      console.log(`✅ 车型 ${modelId} 信息更新成功`);
      return true;
    } catch (error) {
      console.error(`❌ 车型 ${modelId} 更新失败:`, error.message);
      return false;
    }
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
      
      console.log(`✅ 图片 ${imageId} 标签更新成功`);
      return true;
    } catch (error) {
      console.error(`❌ 图片 ${imageId} 标签更新失败:`, error.message);
      return false;
    }
  }

  /**
   * 处理单个车型
   */
  async processModel(model) {
    try {
      console.log(`\n🔄 处理车型: ${model.Brand?.name} ${model.name}`);
      
      // 获取车型详细信息
      const enhancedData = await this.getModelInfo(model.name, model.Brand?.name || '未知品牌');
      
      // 更新车型信息
      await this.updateModel(model.id, enhancedData);
      
      // 处理该车型的图片
      const images = await Image.findAll({
        where: { modelId: model.id },
        limit: 10 // 限制每个车型最多处理10张图片
      });
      
      console.log(`📷 找到 ${images.length} 张图片，开始处理...`);
      
      for (const image of images) {
        try {
          // 获取图片标签
          const tags = await this.getImageTags(image.url, model.name, model.Brand?.name || '未知品牌');
          
          // 更新图片标签
          await this.updateImageTags(image.id, tags);
          
          // 延迟避免API限制
          await this.delay(500);
          
        } catch (error) {
          console.error(`图片 ${image.id} 处理失败:`, error.message);
        }
      }
      
      this.processedCount++;
      console.log(`✅ 车型 ${model.id} 处理完成`);
      
    } catch (error) {
      console.error(`❌ 车型 ${model.id} 处理失败:`, error.message);
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
      console.log('🚀 开始DeepSeek车型信息补充...');
      
      // 获取需要处理的车型（优先处理信息不完整的）
      const models = await Model.findAll({
        include: [{
          model: Brand,
          attributes: ['id', 'name']
        }],
        where: {
          [sequelize.Op.or]: [
            { type: '其他' },
            { type: null },
            { description: null },
            { description: '' },
            { styleTags: null },
            { styleTags: [] }
          ]
        },
        limit: 50 // 限制处理数量
      });
      
      console.log(`📊 找到 ${models.length} 个需要处理的车型`);
      
      // 批量处理车型
      for (let i = 0; i < models.length; i += this.batchSize) {
        const batch = models.slice(i, i + this.batchSize);
        
        console.log(`\n📦 处理批次 ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(models.length / this.batchSize)}`);
        
        // 并行处理批次内的车型
        await Promise.all(batch.map(model => this.processModel(model)));
        
        // 批次间延迟
        if (i + this.batchSize < models.length) {
          console.log(`⏳ 等待 ${this.delay}ms 后处理下一批次...`);
          await this.delay(this.delay);
        }
      }
      
      console.log('\n🎉 DeepSeek车型信息补充完成！');
      console.log(`📊 处理统计:`);
      console.log(`   - 成功处理: ${this.processedCount} 个车型`);
      console.log(`   - 处理失败: ${this.errorCount} 个车型`);
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
    } finally {
      await sequelize.close();
    }
  }
}

// 执行脚本
if (require.main === module) {
  const enhancer = new DeepSeekEnhancer();
  enhancer.run().catch(console.error);
}

module.exports = DeepSeekEnhancer;





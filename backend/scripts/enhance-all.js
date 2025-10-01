#!/usr/bin/env node

/**
 * DeepSeek API 综合增强脚本
 * 同时补充车型信息和图片标签
 */

const axios = require('axios');
const { sequelize } = require('../src/config/mysql');
const Model = require('../src/models/mysql/Model');
const Image = require('../src/models/mysql/Image');
const Brand = require('../src/models/mysql/Brand');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-8e14c606de1342959a484b6c860ed0a6';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

class DeepSeekEnhancer {
  constructor() {
    this.processedModels = 0;
    this.processedImages = 0;
    this.errorCount = 0;
    this.totalCost = 0; // 估算API费用
  }

  /**
   * 调用DeepSeek API
   */
  async callDeepSeekAPI(prompt, maxTokens = 500) {
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
        max_tokens: maxTokens
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // 估算费用（DeepSeek定价：输入$0.14/1M tokens，输出$0.28/1M tokens）
      const inputTokens = prompt.length / 4; // 粗略估算
      const outputTokens = response.data.choices[0].message.content.length / 4;
      this.totalCost += (inputTokens * 0.14 + outputTokens * 0.28) / 1000000;

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(`❌ API调用失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取车型信息
   */
  async getModelInfo(modelName, brandName) {
    const prompt = `请为汽车车型"${brandName} ${modelName}"提供JSON格式信息：

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
  "styleTags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}

车型分类请从以下选项中选择：轿车、SUV、MPV、WAGON、SHOOTINGBRAKE、皮卡、跑车、Hatchback、其他`;

    const content = await this.callDeepSeekAPI(prompt, 800);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('无法解析车型信息');
  }

  /**
   * 获取图片标签
   */
  async getImageTags(modelName, brandName) {
    const prompt = `请为"${brandName} ${modelName}"车型的图片生成标签数组：

["外型", "正前", "前脸", "运动", "时尚"]

请从以下角度生成3-5个标签：
1. 图片类型：外型、内饰、零部件、其他
2. 拍摄角度：正前、正侧、正后、前45、后45、俯侧、顶视
3. 具体部位：前脸、侧面、尾部、内饰、仪表盘、座椅等
4. 风格特征：运动、豪华、商务、家用、时尚、科技等`;

    const content = await this.callDeepSeekAPI(prompt, 300);
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 备用方案：提取标签
    const tags = content.match(/["'][^"']*["']/g) || [];
    return tags.map(tag => tag.replace(/["']/g, ''));
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
      
      console.log(`✅ 车型 ${modelId} 更新成功`);
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
      
      console.log(`✅ 图片 ${imageId} 标签更新: ${tags.join(', ')}`);
      return true;
    } catch (error) {
      console.error(`❌ 图片 ${imageId} 标签更新失败:`, error.message);
      return false;
    }
  }

  /**
   * 处理单个车型及其图片
   */
  async processModelWithImages(model) {
    try {
      console.log(`\n🔄 处理车型: ${model.Brand?.name} ${model.name} (ID: ${model.id})`);
      
      // 1. 获取并更新车型信息
      const modelInfo = await this.getModelInfo(model.name, model.Brand?.name || '未知品牌');
      await this.updateModel(model.id, modelInfo);
      this.processedModels++;
      
      // 2. 处理该车型的图片
      const images = await Image.findAll({
        where: { modelId: model.id },
        limit: 5 // 每个车型最多处理5张图片
      });
      
      console.log(`📷 找到 ${images.length} 张图片`);
      
      for (const image of images) {
        try {
          const tags = await this.getImageTags(model.name, model.Brand?.name || '未知品牌');
          await this.updateImageTags(image.id, tags);
          this.processedImages++;
          
          // 延迟避免API限制
          await this.delay(1000);
          
        } catch (error) {
          console.error(`图片 ${image.id} 处理失败:`, error.message);
          this.errorCount++;
        }
      }
      
      // 车型间延迟
      await this.delay(2000);
      
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
      console.log('🚀 开始DeepSeek综合信息补充...');
      console.log('💰 注意：此操作将产生API费用，请确认继续');
      
      // 获取需要处理的车型
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
            { description: '' }
          ]
        },
        limit: 10 // 限制处理数量，避免费用过高
      });
      
      console.log(`📊 找到 ${models.length} 个需要处理的车型`);
      
      if (models.length === 0) {
        console.log('✅ 所有车型信息已完整，无需处理');
        return;
      }
      
      // 逐个处理车型
      for (const model of models) {
        await this.processModelWithImages(model);
      }
      
      console.log('\n🎉 DeepSeek综合信息补充完成！');
      console.log(`📊 处理统计:`);
      console.log(`   - 成功处理车型: ${this.processedModels} 个`);
      console.log(`   - 成功处理图片: ${this.processedImages} 张`);
      console.log(`   - 处理失败: ${this.errorCount} 个`);
      console.log(`💰 估算API费用: $${this.totalCost.toFixed(4)}`);
      
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





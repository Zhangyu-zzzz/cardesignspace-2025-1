#!/usr/bin/env node

/**
 * 简化版车型信息补充脚本
 * 使用DeepSeek API补充车型信息
 */

const axios = require('axios');
const { sequelize } = require('../src/config/mysql');
const { Op } = require('sequelize');
const Model = require('../src/models/mysql/Model');
const Brand = require('../src/models/mysql/Brand');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-8e14c606de1342959a484b6c860ed0a6';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

class SimpleModelEnhancer {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
  }

  /**
   * 调用DeepSeek API获取车型信息
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
        max_tokens: 800
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices[0].message.content;
      console.log(`📝 API响应: ${content.substring(0, 200)}...`);
      
      // 解析JSON响应
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        console.log(`✅ 解析成功: ${data.type} - ${data.styleTags?.length || 0}个标签`);
        return data;
      } else {
        throw new Error('无法解析JSON响应');
      }
    } catch (error) {
      console.error(`❌ API调用失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新车型信息
   */
  async updateModel(modelId, enhancedData) {
    try {
      const updateData = {
        type: enhancedData.type || '其他',
        specs: enhancedData.specs || {},
        description: enhancedData.description || '',
        styleTags: enhancedData.styleTags || []
      };

      await Model.update(updateData, {
        where: { id: modelId }
      });
      
      console.log(`✅ 车型 ${modelId} 更新成功`);
      console.log(`   - 类型: ${updateData.type}`);
      console.log(`   - 标签: ${updateData.styleTags.join(', ')}`);
      return true;
    } catch (error) {
      console.error(`❌ 车型 ${modelId} 更新失败:`, error.message);
      return false;
    }
  }

  /**
   * 处理单个车型
   */
  async processModel(model) {
    try {
      console.log(`\n🔄 处理车型: ${model.name} (ID: ${model.id})`);
      
      // 获取品牌信息
      const brand = await Brand.findByPk(model.brandId);
      const brandName = brand ? brand.name : '未知品牌';
      
      console.log(`   品牌: ${brandName}`);
      
      // 获取车型详细信息
      const enhancedData = await this.getModelInfo(model.name, brandName);
      
      // 更新车型信息
      const success = await this.updateModel(model.id, enhancedData);
      
      if (success) {
        this.processedCount++;
      } else {
        this.errorCount++;
      }
      
      // 延迟避免API限制
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
      console.log('🚀 开始DeepSeek车型信息补充...');
      
      // 获取需要处理的车型（简化查询）
      const models = await Model.findAll({
        where: {
          [Op.or]: [
            { type: '其他' },
            { type: null },
            { description: null },
            { description: '' },
            { styleTags: null },
            { styleTags: [] }
          ]
        },
        limit: 5 // 限制处理数量，避免API费用过高
      });
      
      console.log(`📊 找到 ${models.length} 个需要处理的车型`);
      
      if (models.length === 0) {
        console.log('✅ 所有车型信息已完整，无需处理');
        return;
      }
      
      // 逐个处理车型
      for (const model of models) {
        await this.processModel(model);
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
  const enhancer = new SimpleModelEnhancer();
  enhancer.run().catch(console.error);
}

module.exports = SimpleModelEnhancer;





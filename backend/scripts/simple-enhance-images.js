#!/usr/bin/env node

/**
 * 简化版图片标签补充脚本
 * 使用DeepSeek API补充图片标签
 */

const axios = require('axios');
const { sequelize } = require('../src/config/mysql');
const { Op } = require('sequelize');
const Image = require('../src/models/mysql/Image');
const Model = require('../src/models/mysql/Model');
const Brand = require('../src/models/mysql/Brand');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-8e14c606de1342959a484b6c860ed0a6';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

class SimpleImageEnhancer {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
  }

  /**
   * 调用DeepSeek API获取图片标签
   */
  async getImageTags(modelName, brandName) {
    const prompt = `请为"${brandName} ${modelName}"车型的图片生成标签数组：

["外型", "正前", "前脸", "运动", "时尚"]

请从以下角度生成3-5个标签：
1. 图片类型：外型、内饰、零部件、其他
2. 拍摄角度：正前、正侧、正后、前45、后45、俯侧、顶视
3. 具体部位：前脸、侧面、尾部、内饰、仪表盘、座椅等
4. 风格特征：运动、豪华、商务、家用、时尚、科技等

请直接返回JSON数组格式，不要其他文字。`;

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
        max_tokens: 300
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices[0].message.content;
      console.log(`📝 标签响应: ${content.substring(0, 100)}...`);
      
      // 解析JSON数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tags = JSON.parse(jsonMatch[0]);
        console.log(`✅ 解析成功: ${tags.length}个标签`);
        return tags;
      } else {
        // 如果没有找到JSON数组，尝试提取标签
        const tags = content.match(/["'][^"']*["']/g) || [];
        const cleanTags = tags.map(tag => tag.replace(/["']/g, ''));
        console.log(`✅ 提取标签: ${cleanTags.length}个`);
        return cleanTags;
      }
    } catch (error) {
      console.error(`❌ 标签API调用失败: ${error.message}`);
      return ['外型', '其他']; // 默认标签
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
   * 处理单张图片
   */
  async processImage(image) {
    try {
      console.log(`\n🔄 处理图片: ${image.filename} (ID: ${image.id})`);
      
      // 获取车型信息
      const model = await Model.findByPk(image.modelId);
      const brand = model ? await Brand.findByPk(model.brandId) : null;
      
      const modelName = model ? model.name : '未知车型';
      const brandName = brand ? brand.name : '未知品牌';
      
      console.log(`   车型: ${brandName} ${modelName}`);
      
      // 获取图片标签
      const tags = await this.getImageTags(modelName, brandName);
      
      // 更新图片标签
      const success = await this.updateImageTags(image.id, tags);
      
      if (success) {
        this.processedCount++;
      } else {
        this.errorCount++;
      }
      
      // 延迟避免API限制
      await this.delay(1500);
      
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
      console.log('🚀 开始DeepSeek图片标签补充...');
      
      // 获取需要处理的图片（简化查询）
      const images = await Image.findAll({
        where: {
          [Op.or]: [
            { tags: null },
            { tags: [] },
            { tags: '' },
            { tags: '[]' },
            { tags: '""' }
          ]
        },
        limit: 5 // 限制处理数量，避免API费用过高
      });
      
      console.log(`📊 找到 ${images.length} 张需要处理的图片`);
      
      if (images.length === 0) {
        console.log('✅ 所有图片标签已完整，无需处理');
        return;
      }
      
      // 逐个处理图片
      for (const image of images) {
        await this.processImage(image);
      }
      
      console.log('\n🎉 DeepSeek图片标签补充完成！');
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
  const enhancer = new SimpleImageEnhancer();
  enhancer.run().catch(console.error);
}

module.exports = SimpleImageEnhancer;

#!/usr/bin/env node

/**
 * 演示智能图片标签生成
 * 重新处理一些图片，展示不同的标签生成逻辑
 */

const axios = require('axios');
const { sequelize } = require('../src/config/mysql');
const Image = require('../src/models/mysql/Image');
const Model = require('../src/models/mysql/Model');
const Brand = require('../src/models/mysql/Brand');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-8e14c606de1342959a484b6c860ed0a6';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

class SmartTagDemo {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
  }

  /**
   * 调用DeepSeek API分析图片内容
   */
  async analyzeImageContent(imageUrl, modelName, brandName, filename) {
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

请基于图片内容进行准确分析，生成3-5个最相关的标签。

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
      console.log(`📝 分析响应: ${content.substring(0, 200)}...`);
      
      // 解析JSON数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tags = JSON.parse(jsonMatch[0]);
        console.log(`✅ 解析成功: ${tags.length}个标签 - ${tags.join(', ')}`);
        return tags;
      } else {
        // 如果没有找到JSON数组，尝试提取标签
        const tags = content.match(/["'][^"']*["']/g) || [];
        const cleanTags = tags.map(tag => tag.replace(/["']/g, ''));
        console.log(`✅ 提取标签: ${cleanTags.length}个 - ${cleanTags.join(', ')}`);
        return cleanTags;
      }
    } catch (error) {
      console.error(`❌ 图片分析API调用失败: ${error.message}`);
      // 基于文件名和车型信息生成默认标签
      return this.generateDefaultTags(filename, modelName, brandName);
    }
  }

  /**
   * 基于文件名和车型信息生成默认标签
   */
  generateDefaultTags(filename, modelName, brandName) {
    const tags = ['外型']; // 默认图片类型
    
    // 基于文件名推测角度
    if (filename.includes('front') || filename.includes('前')) {
      tags.push('正前');
    } else if (filename.includes('side') || filename.includes('侧')) {
      tags.push('正侧');
    } else if (filename.includes('rear') || filename.includes('后')) {
      tags.push('正后');
    } else if (filename.includes('45')) {
      tags.push('前45');
    } else {
      tags.push('正前'); // 默认角度
    }
    
    // 基于车型信息推测风格
    if (modelName.includes('S9') || modelName.includes('跑车')) {
      tags.push('运动');
    } else if (modelName.includes('LS') || modelName.includes('豪华')) {
      tags.push('豪华');
    } else {
      tags.push('时尚');
    }
    
    console.log(`⚠️ 使用默认标签: ${tags.join(', ')}`);
    return tags;
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
      console.log(`   当前标签: ${JSON.stringify(image.tags)}`);
      
      // 分析图片内容并生成标签
      const tags = await this.analyzeImageContent(
        image.url, 
        modelName, 
        brandName, 
        image.filename
      );
      
      // 更新图片标签
      const success = await this.updateImageTags(image.id, tags);
      
      if (success) {
        this.processedCount++;
      } else {
        this.errorCount++;
      }
      
      // 延迟避免API限制
      await this.delay(2000);
      
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
      console.log('🚀 开始演示智能图片标签生成...');
      console.log('💡 此脚本将重新处理一些图片，展示不同的标签生成逻辑');
      
      // 获取一些图片进行演示
      const images = await Image.findAll({
        limit: 5,
        attributes: ['id', 'filename', 'modelId', 'url', 'tags']
      });
      
      console.log(`📊 找到 ${images.length} 张图片进行演示`);
      
      if (images.length === 0) {
        console.log('✅ 没有找到图片');
        return;
      }
      
      // 处理前3张图片
      const demoImages = images.slice(0, 3);
      console.log(`🔧 演示处理前 ${demoImages.length} 张图片`);
      
      // 逐个处理图片
      for (const image of demoImages) {
        await this.processImage(image);
      }
      
      console.log('\n🎉 智能图片标签演示完成！');
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
  const demo = new SmartTagDemo();
  demo.run().catch(console.error);
}

module.exports = SmartTagDemo;





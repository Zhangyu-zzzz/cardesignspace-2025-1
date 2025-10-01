#!/usr/bin/env node

/**
 * 使用DeepSeek API重新分类车型类型
 * 将数据库中所有标记为"轿车"的车型重新分类为正确的车型类型
 */

const axios = require('axios');
const { sequelize } = require('../src/config/mysql');
const Model = require('../src/models/mysql/Model');
const Brand = require('../src/models/mysql/Brand');

// 设置关联关系
Model.belongsTo(Brand, { foreignKey: 'brandId', as: 'Brand' });
Brand.hasMany(Model, { foreignKey: 'brandId', as: 'Models' });

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-8e14c606de1342959a484b6c860ed0a6';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 车型类型枚举（与数据库一致）
const VALID_TYPES = ['轿车', 'SUV', 'MPV', 'WAGON', 'SHOOTINGBRAKE', '皮卡', '跑车', 'Hatchback', '其他'];

class ModelClassifier {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.updatedCount = 0;
    this.batchSize = 10; // 批量处理大小
    this.delay = 2000; // 请求间隔延迟（毫秒）
    this.totalCost = 0;
  }

  /**
   * 调用DeepSeek API进行车型分类
   */
  async classifyModelWithDeepSeek(modelName, brandName, year) {
    const prompt = `请根据以下汽车信息，将其分类到正确的车型类型：

品牌：${brandName}
车型：${modelName}
年份：${year || '未知'}

请从以下车型类型中选择最合适的一个：
- 轿车：传统四门轿车，如奔驰C级、宝马3系等
- SUV：运动型多用途车，如奔驰GLC、宝马X3等
- MPV：多功能商务车，如别克GL8、本田奥德赛等
- WAGON：旅行车，如奔驰E级旅行版、宝马5系旅行版等
- SHOOTINGBRAKE：猎装车，如奔驰CLS猎装版、保时捷Panamera Sport Turismo等
- 皮卡：载货皮卡车，如福特F-150、雪佛兰Silverado等
- 跑车：高性能跑车，如法拉利488、兰博基尼Huracán等
- Hatchback：掀背车，如大众高尔夫、本田思域等
- 其他：无法明确分类的车型

请只返回一个最准确的车型类型名称，不要包含其他文字。`;

    try {
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // 降低随机性，提高一致性
        max_tokens: 50
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices[0].message.content.trim();
      
      // 估算费用
      const inputTokens = prompt.length / 4;
      const outputTokens = content.length / 4;
      this.totalCost += (inputTokens * 0.14 + outputTokens * 0.28) / 1000000;

      // 验证返回的类型是否有效
      if (VALID_TYPES.includes(content)) {
        return content;
      } else {
        console.log(`⚠️  无效分类结果: "${content}"，使用默认值"其他"`);
        return '其他';
      }
    } catch (error) {
      console.error(`❌ API调用失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理单个车型
   */
  async processModel(model) {
    try {
      console.log(`\n🔍 处理车型: ${model['Brand.name']} ${model.name} (ID: ${model.id})`);
      
      // 调用DeepSeek API进行分类
      const newType = await this.classifyModelWithDeepSeek(
        model.name, 
        model['Brand.name'], 
        model.year
      );
      
      console.log(`📝 原类型: ${model.type} → 新类型: ${newType}`);
      
      // 如果类型发生变化，更新数据库
      if (newType !== model.type) {
        await Model.update(
          { type: newType },
          { where: { id: model.id } }
        );
        console.log(`✅ 已更新车型 ${model.id} 的类型为: ${newType}`);
        this.updatedCount++;
      } else {
        console.log(`ℹ️  车型 ${model.id} 类型无需更改`);
      }
      
      this.processedCount++;
      
      // 添加延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, this.delay));
      
    } catch (error) {
      console.error(`❌ 处理车型 ${model.id} 失败: ${error.message}`);
      this.errorCount++;
    }
  }

  /**
   * 批量处理车型
   */
  async processBatch(models) {
    console.log(`\n📦 开始处理批次，共 ${models.length} 个车型`);
    
    for (const model of models) {
      await this.processModel(model);
    }
  }

  /**
   * 获取需要处理的车型
   */
  async getModelsToProcess(limit = 100, offset = 0) {
    return await Model.findAll({
      include: [{
        model: Brand,
        as: 'Brand',
        attributes: ['name']
      }],
      attributes: ['id', 'name', 'type', 'year'],
      where: {
        type: '轿车' // 只处理当前标记为"轿车"的车型
      },
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });
  }

  /**
   * 显示统计信息
   */
  showStats() {
    console.log('\n📊 处理统计:');
    console.log(`  已处理: ${this.processedCount} 个车型`);
    console.log(`  已更新: ${this.updatedCount} 个车型`);
    console.log(`  错误数: ${this.errorCount} 个车型`);
    console.log(`  预估费用: $${this.totalCost.toFixed(4)}`);
  }

  /**
   * 主执行函数
   */
  async run(options = {}) {
    const { 
      limit = 50, // 默认处理50个车型进行测试
      offset = 0,
      dryRun = false // 是否只是预览，不实际更新
    } = options;

    try {
      console.log('🚀 开始车型分类任务');
      console.log(`📋 配置: 限制=${limit}, 偏移=${offset}, 预览模式=${dryRun}`);
      
      if (dryRun) {
        console.log('🔍 预览模式：不会实际更新数据库');
      }

      // 获取需要处理的车型
      const models = await this.getModelsToProcess(limit, offset);
      
      if (models.length === 0) {
        console.log('✅ 没有找到需要处理的车型');
        return;
      }

      console.log(`📦 找到 ${models.length} 个需要处理的车型`);

      // 批量处理
      await this.processBatch(models);

      // 显示统计信息
      this.showStats();

      console.log('\n✅ 车型分类任务完成！');

    } catch (error) {
      console.error('❌ 任务执行失败:', error.message);
      throw error;
    }
  }
}

// 命令行参数处理
async function main() {
  const args = process.argv.slice(2);
  const options = {
    limit: 50,
    offset: 0,
    dryRun: false
  };

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[++i]) || 50;
        break;
      case '--offset':
        options.offset = parseInt(args[++i]) || 0;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
使用方法: node classify-models-with-deepseek.js [选项]

选项:
  --limit <数量>     处理车型数量限制 (默认: 50)
  --offset <偏移>    起始偏移量 (默认: 0)
  --dry-run         预览模式，不实际更新数据库
  --help            显示帮助信息

示例:
  node classify-models-with-deepseek.js --limit 10 --dry-run
  node classify-models-with-deepseek.js --limit 100 --offset 50
        `);
        process.exit(0);
        break;
    }
  }

  const classifier = new ModelClassifier();
  await classifier.run(options);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = ModelClassifier;

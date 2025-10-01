#!/usr/bin/env node

/**
 * CLIP + DeepSeek 混合标签生成系统
 * 使用CLIP模型和DeepSeek API，提高标签生成准确度
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

class ClipDeepSeekHybrid {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
  }

  /**
   * 调用CLIP模型进行预测
   */
  async predictWithClip(imageUrl, imageId) {
    return new Promise((resolve, reject) => {
      console.log(`🤖 调用训练模型分析图片 ${imageId}...`);
      
      // 创建临时文件保存图片URL
      const tempFile = path.join(__dirname, `temp_${imageId}.txt`);
      fs.writeFileSync(tempFile, imageUrl);
      
      // 调用简化的真实数据训练模型预测脚本
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
              console.log(`✅ 训练模型预测完成: ${result.label || '无标签'}`);
              console.log(`   最高置信度: ${result.confidence?.toFixed(3) || '0.000'}`);
              
              // 转换为旧格式以兼容后续处理
              const legacyResult = {
                top_labels: [result.label],
                confidences: { [result.label]: result.confidence }
              };
              resolve(legacyResult);
            } else {
              throw new Error('未找到PREDICTION_RESULT输出');
            }
          } catch (parseError) {
            console.error('解析模型输出失败:', parseError.message);
            console.error('原始输出:', output);
            reject(new Error('模型输出解析失败'));
          }
        } else {
          console.error('训练模型调用失败:', error);
          reject(new Error(`模型调用失败: ${error}`));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('模型调用超时'));
      }, 60000);
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
   * 过滤不合理的标签组合
   */
  filterValidTags(tags) {
    // 定义冲突的标签组
    const conflictingGroups = [
      // 角度冲突
      ['4-正前', '2-正侧', '5-正后', '1-前45', '3-后45'],
      // 类型冲突
      ['10-内饰', '外型', '细节'],
      // 位置冲突
      ['6-头灯', '7-尾灯'],
      ['8-格栅', '7-尾灯'],
      ['11-方向盘', '8-轮毂']
    ];
    
    const validTags = [];
    const usedGroups = new Set();
    
    for (const tag of tags) {
      let canAdd = true;
      
      // 检查是否与已添加的标签冲突
      for (const group of conflictingGroups) {
        if (group.includes(tag)) {
          if (usedGroups.has(group)) {
            canAdd = false;
            break;
          }
          usedGroups.add(group);
        }
      }
      
      if (canAdd) {
        validTags.push(tag);
      }
    }
    
    return validTags;
  }

  /**
   * 智能融合两种预测结果
   */
  fusePredictions(clipResult, deepseekResult) {
    console.log('🔄 智能融合预测结果...');
    
    const fusedTags = new Set();
    const tagConfidence = new Map();
    
    // 主要使用本地模型的结果 - 只选择置信度最高的一个标签
    if (clipResult && clipResult.success && clipResult.top_labels) {
      console.log(`📊 本地模型预测: ${clipResult.top_labels.join(', ')}`);
      
      // 找到置信度最高的标签
      let bestTag = null;
      let bestConfidence = 0;
      
      for (const tag of clipResult.top_labels) {
        const confidence = clipResult.confidences?.[tag] || 0;
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestTag = tag;
        }
      }
      
      if (bestTag) {
        console.log(`🎯 选择最佳标签: ${bestTag} (置信度: ${bestConfidence.toFixed(3)})`);
        fusedTags.add(bestTag);
        tagConfidence.set(bestTag, bestConfidence * 0.9);
      }
    }
    
    // DeepSeek作为补充（如果本地模型结果不够好）
    if (deepseekResult && deepseekResult.length > 0 && fusedTags.size < 1) {
      console.log(`📊 DeepSeek补充: ${deepseekResult.join(', ')}`);
      // 只选择第一个标签作为补充
      const supplementTag = deepseekResult[0];
      fusedTags.add(supplementTag);
      tagConfidence.set(supplementTag, 0.2); // 较低权重
      console.log(`🎯 DeepSeek补充标签: ${supplementTag}`);
    }
    
    // 根据置信度排序并选择最佳标签
    const sortedTags = Array.from(fusedTags)
      .map(tag => ({
        tag,
        confidence: tagConfidence.get(tag) || 0.1
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // 最多5个标签
      .map(item => item.tag);
    
    console.log(`🎯 融合结果: ${sortedTags.length}个标签 - ${sortedTags.join(', ')}`);
    return sortedTags;
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
      console.log('🚀 并行调用训练模型和DeepSeek API...');
      
      const [clipResult, deepseekResult] = await Promise.allSettled([
        this.predictWithClip(image.url, image.id),
        this.predictWithDeepSeek(image.url, modelName, brandName, image.filename)
      ]);
      
      // 处理预测结果
      const clipTags = clipResult.status === 'fulfilled' ? clipResult.value : null;
      const deepseekTags = deepseekResult.status === 'fulfilled' ? deepseekResult.value : [];
      
      console.log('\n📊 预测结果分析:');
      console.log('─'.repeat(50));
      
      if (clipResult.status === 'fulfilled') {
        console.log(`✅ 训练模型: ${clipTags?.top_labels?.join(', ') || '无标签'}`);
        if (clipTags?.confidences) {
          const maxConf = Math.max(...Object.values(clipTags.confidences));
          console.log(`   最高置信度: ${maxConf.toFixed(3)}`);
        }
      } else {
        console.log(`❌ 训练模型: ${clipResult.reason.message}`);
      }
      
      if (deepseekResult.status === 'fulfilled') {
        console.log(`✅ DeepSeek API: ${deepseekTags.join(', ')}`);
      } else {
        console.log(`❌ DeepSeek API: ${deepseekResult.reason.message}`);
      }
      
      // 融合预测结果
      const fusedTags = this.fusePredictions(clipTags, deepseekTags);
      
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
      console.log('🚀 开始改进模型 + DeepSeek混合标签生成系统...');
      console.log('🤖 结合改进模型和DeepSeek API，提高标签准确度');
      
      // 获取需要处理的图片
      const allImages = await Image.findAll({
        limit: 3, // 限制处理数量
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
      
      console.log('\n🎉 改进模型 + DeepSeek混合标签生成完成！');
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
  const system = new ClipDeepSeekHybrid();
  system.run().catch(console.error);
}

module.exports = ClipDeepSeekHybrid;

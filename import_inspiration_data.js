const fs = require('fs').promises
const path = require('path')
const mysql = require('mysql2/promise')

// 数据库配置
const dbConfig = {
  host: '49.235.98.5',
  port: 3306,
  user: 'Jason',
  password: 'Jason123456!',
  database: 'cardesignspace',
  charset: 'utf8mb4'
}

async function importInspirationData() {
  let connection
  
  try {
    console.log('🔗 连接到数据库...')
    connection = await mysql.createConnection(dbConfig)
    
    console.log('📖 读取灵感图片数据...')
    const dataPath = '/Users/zobot/Desktop/unsplash-crawler/灵感图集/merged_data/merged_summary.json'
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
    
    console.log(`📊 发现 ${data.images.length} 张图片`)
    
    // 开始导入
    let importedImages = 0
    let importedTags = 0
    let importedRelations = 0
    
    for (const imageData of data.images) {
      try {
        // 1. 插入图片数据
        const [imageResult] = await connection.execute(`
          INSERT INTO inspiration_images (
            filename, main_img_url, all_img_urls, source_link, likes, 
            publication_id, timestamp, source_crawler, local_path, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          imageData.filename,
          imageData.main_img_url,
          JSON.stringify(imageData.all_img_urls || []),
          imageData.source_link,
          imageData.likes || 0,
          imageData.publication_id,
          imageData.timestamp,
          imageData.source_crawler,
          imageData.local_path,
          'active'
        ])
        
        const imageId = imageResult.insertId
        importedImages++
        
        // 2. 处理标签
        if (imageData.tags && imageData.tags.length > 0) {
          for (const tagName of imageData.tags) {
            // 清理标签名称（移除#号）
            const cleanTagName = tagName.replace(/^#/, '')
            
            // 检查标签是否存在，不存在则创建
            let [existingTags] = await connection.execute(
              'SELECT id FROM inspiration_tags WHERE name = ?',
              [cleanTagName]
            )
            
            let tagId
            if (existingTags.length === 0) {
              // 创建新标签
              const [tagResult] = await connection.execute(`
                INSERT INTO inspiration_tags (name, usage_count, status) 
                VALUES (?, 1, 'active')
              `, [cleanTagName])
              tagId = tagResult.insertId
              importedTags++
            } else {
              // 更新现有标签的使用次数
              tagId = existingTags[0].id
              await connection.execute(`
                UPDATE inspiration_tags 
                SET usage_count = usage_count + 1 
                WHERE id = ?
              `, [tagId])
            }
            
            // 3. 创建图片标签关联
            await connection.execute(`
              INSERT INTO inspiration_image_tags (image_id, tag_id) 
              VALUES (?, ?)
            `, [imageId, tagId])
            importedRelations++
          }
        }
        
        // 显示进度
        if (importedImages % 100 === 0) {
          console.log(`✅ 已导入 ${importedImages} 张图片...`)
        }
        
      } catch (error) {
        console.error(`❌ 导入图片 ${imageData.filename} 失败:`, error.message)
        continue
      }
    }
    
    console.log('\n🎉 数据导入完成！')
    console.log(`📊 统计信息:`)
    console.log(`   - 导入图片: ${importedImages} 张`)
    console.log(`   - 新增标签: ${importedTags} 个`)
    console.log(`   - 创建关联: ${importedRelations} 条`)
    
  } catch (error) {
    console.error('❌ 导入失败:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 数据库连接已关闭')
    }
  }
}

// 运行导入
importInspirationData()

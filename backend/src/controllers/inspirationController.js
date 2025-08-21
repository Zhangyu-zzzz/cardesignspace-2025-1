const fs = require('fs').promises
const path = require('path')

class InspirationController {
  // 获取灵感图片列表
  async getImages(req, res) {
    try {
      const { page = 1, limit = 20, search, tags } = req.query
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const offset = (pageNum - 1) * limitNum

      // 从数据库查询图片数据
      const db = require('../config/mysql')
      const connection = await db.getConnection()
      
      try {
        let query = `
          SELECT DISTINCT 
            i.id,
            i.filename,
            i.main_img_url,
            i.all_img_urls,
            i.source_link,
            i.likes,
            i.publication_id,
            i.timestamp,
            i.source_crawler,
            i.local_path,
            i.status,
            i.created_at,
            i.updated_at
          FROM inspiration_images i
        `
        
        const whereConditions = ['i.status = "active"']
        const queryParams = []

        // 搜索过滤
        if (search) {
          whereConditions.push('(i.filename LIKE ? OR EXISTS (SELECT 1 FROM inspiration_image_tags iit JOIN inspiration_tags t ON iit.tag_id = t.id WHERE iit.image_id = i.id AND t.name LIKE ?))')
          queryParams.push(`%${search}%`, `%${search}%`)
        }

        // 标签过滤
        if (tags) {
          const tagArray = Array.isArray(tags) ? tags : [tags]
          const tagPlaceholders = tagArray.map(() => '?').join(',')
          whereConditions.push(`EXISTS (SELECT 1 FROM inspiration_image_tags iit JOIN inspiration_tags t ON iit.tag_id = t.id WHERE iit.image_id = i.id AND t.name IN (${tagPlaceholders}))`)
          queryParams.push(...tagArray)
        }

        query += ` WHERE ${whereConditions.join(' AND ')}`
        query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`
        queryParams.push(parseInt(limitNum), parseInt(offset))

        const [images] = await connection.query(query, queryParams)

        // 获取总数
        let countQuery = `
          SELECT COUNT(DISTINCT i.id) as total
          FROM inspiration_images i
        `
        const countParams = []
        if (whereConditions.length > 1) { // 除了status条件外还有其他条件
          countQuery += ` WHERE ${whereConditions.join(' AND ')}`
          // 复制参数，但不包括LIMIT和OFFSET
          countParams.push(...queryParams.slice(0, -2))
        }
        const [countResult] = await connection.query(countQuery, countParams)
        const total = countResult[0].total

        // 为每个图片获取标签
        for (let image of images) {
          const [tags] = await connection.query(`
            SELECT t.name 
            FROM inspiration_tags t 
            JOIN inspiration_image_tags iit ON t.id = iit.tag_id 
            WHERE iit.image_id = ?
          `, [image.id])
          image.tags = tags.map(tag => tag.name)
        }

        res.json({
          status: 'success',
          data: {
            images: images,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              pages: Math.ceil(total / limitNum)
            }
          }
        })
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error('获取灵感图片失败:', error)
      res.status(500).json({
        status: 'error',
        message: '获取灵感图片失败'
      })
    }
  }

  // 获取图片统计信息
  async getStats(req, res) {
    try {
      const db = require('../config/mysql')
      const connection = await db.getConnection()
      
      try {
        // 获取图片总数
        const [imageCount] = await connection.query('SELECT COUNT(*) as total FROM inspiration_images WHERE status = "active"')
        
        // 获取标签总数
        const [tagCount] = await connection.query('SELECT COUNT(*) as total FROM inspiration_tags WHERE status = "active"')
        
        // 获取来源爬虫统计
        const [crawlerStats] = await connection.query(`
          SELECT source_crawler, COUNT(*) as count 
          FROM inspiration_images 
          WHERE status = "active" 
          GROUP BY source_crawler
        `)

        res.json({
          status: 'success',
          data: {
            total_images: imageCount[0].total,
            total_unique_tags: tagCount[0].total,
            source_crawlers: crawlerStats.map(stat => stat.source_crawler),
            crawler_statistics: crawlerStats
          }
        })
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error('获取统计信息失败:', error)
      res.status(500).json({
        status: 'error',
        message: '获取统计信息失败'
      })
    }
  }

  // 获取热门标签
  async getPopularTags(req, res) {
    try {
      const { limit = 20 } = req.query
      const limitNum = parseInt(limit)

      const db = require('../config/mysql')
      const connection = await db.getConnection()
      
      try {
        // 按使用次数排序获取热门标签
        const [tags] = await connection.query(`
          SELECT t.name, t.usage_count
          FROM inspiration_tags t
          WHERE t.status = 'active'
          ORDER BY t.usage_count DESC
          LIMIT ?
        `, [limitNum])

        res.json({
          status: 'success',
          data: {
            tags: tags.map(tag => tag.name)
          }
        })
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error('获取热门标签失败:', error)
      res.status(500).json({
        status: 'error',
        message: '获取热门标签失败'
      })
    }
  }

  // 获取单张图片详情
  async getImageDetail(req, res) {
    try {
      const { filename } = req.params

      const dataPath = path.join(__dirname, '../../../灵感图集/merged_data/merged_summary.json')
      const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
      
      const image = data.images.find(img => img.filename === filename)
      
      if (!image) {
        return res.status(404).json({
          status: 'error',
          message: '图片不存在'
        })
      }

      res.json({
        status: 'success',
        data: {
          image
        }
      })
    } catch (error) {
      console.error('获取图片详情失败:', error)
      res.status(500).json({
        status: 'error',
        message: '获取图片详情失败'
      })
    }
  }

  // 获取图片文件
  async getImageFile(req, res) {
    try {
      const { filename } = req.params
      
      const imagePath = path.join(__dirname, '../../../灵感图集/merged_data/images', filename)
      
      // 检查文件是否存在
      try {
        await fs.access(imagePath)
      } catch (error) {
        return res.status(404).json({
          status: 'error',
          message: '图片文件不存在'
        })
      }

      res.sendFile(imagePath)
    } catch (error) {
      console.error('获取图片文件失败:', error)
      res.status(500).json({
        status: 'error',
        message: '获取图片文件失败'
      })
    }
  }

  // 搜索图片
  async searchImages(req, res) {
    try {
      const { q, tags, page = 1, limit = 20 } = req.query
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const offset = (pageNum - 1) * limitNum

      const dataPath = path.join(__dirname, '../../../灵感图集/merged_data/merged_summary.json')
      const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
      
      let images = data.images || []

      // 关键词搜索
      if (q) {
        const queryLower = q.toLowerCase()
        images = images.filter(image => 
          image.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
          image.filename.toLowerCase().includes(queryLower) ||
          (image.source_link && image.source_link.toLowerCase().includes(queryLower))
        )
      }

      // 标签搜索
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags]
        images = images.filter(image =>
          tagArray.some(selectedTag =>
            image.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
          )
        )
      }

      // 按点赞数排序
      images.sort((a, b) => (b.likes || 0) - (a.likes || 0))

      // 分页
      const total = images.length
      const paginatedImages = images.slice(offset, offset + limitNum)

      res.json({
        status: 'success',
        data: {
          images: paginatedImages,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      })
    } catch (error) {
      console.error('搜索图片失败:', error)
      res.status(500).json({
        status: 'error',
        message: '搜索图片失败'
      })
    }
  }

  // 收藏/取消收藏图片
  async toggleFavorite(req, res) {
    try {
      const { imageId, imageUrl, filename, tags, likes, source_link, timestamp } = req.body
      const userId = req.user.id // 需要认证中间件

      const db = require('../config/mysql')
      const connection = await db.getConnection()
      
      try {
        // 检查是否已经收藏
        const [existingFavorite] = await connection.query(
          'SELECT id FROM inspiration_favorites WHERE user_id = ? AND image_id = ?',
          [userId, parseInt(imageId) || imageId]
        )

        let favorited = false

        if (existingFavorite.length > 0) {
          // 已收藏，取消收藏
          await connection.query(
            'DELETE FROM inspiration_favorites WHERE user_id = ? AND image_id = ?',
            [userId, parseInt(imageId) || imageId]
          )
          favorited = false
        } else {
          // 未收藏，添加收藏
          await connection.query(
            `INSERT INTO inspiration_favorites 
             (user_id, image_id, image_url, filename, tags, likes, source_link, timestamp, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [userId, parseInt(imageId) || imageId, imageUrl, filename, JSON.stringify(tags || []), likes || 0, source_link, timestamp]
          )
          favorited = true
        }

        res.json({
          success: true,
          favorited: favorited,
          message: favorited ? '收藏成功' : '取消收藏成功'
        })

      } finally {
        connection.release()
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      res.status(500).json({
        success: false,
        message: '收藏操作失败'
      })
    }
  }

  // 获取用户收藏的图片
  async getFavorites(req, res) {
    try {
      const { page = 1, limit = 12 } = req.query
      const userId = req.user.id
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const offset = (pageNum - 1) * limitNum

      const db = require('../config/mysql')
      const connection = await db.getConnection()
      
      try {
        // 获取收藏的图片
        const [favorites] = await connection.query(
          `SELECT 
            id, image_id, image_url, filename, tags, likes, source_link, timestamp, created_at
           FROM inspiration_favorites 
           WHERE user_id = ? 
           ORDER BY created_at DESC 
           LIMIT ${limitNum} OFFSET ${offset}`,
          [userId]
        )

        // 获取总数
        const [totalResult] = await connection.query(
          'SELECT COUNT(*) as total FROM inspiration_favorites WHERE user_id = ?',
          [userId]
        )
        
        const total = totalResult[0].total
        const totalPages = Math.ceil(total / limitNum)

        // 处理标签数据
        const processedFavorites = favorites.map(favorite => {
          let tags = [];
          if (favorite.tags) {
            if (Array.isArray(favorite.tags)) {
              // 如果已经是数组，直接使用
              tags = favorite.tags;
            } else if (typeof favorite.tags === 'string') {
              try {
                // 尝试解析为JSON
                tags = JSON.parse(favorite.tags);
              } catch (e) {
                // 如果JSON解析失败，按逗号分割字符串
                tags = favorite.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
              }
            } else {
              // 其他类型，转换为字符串数组
              tags = [String(favorite.tags)];
            }
          }
          return {
            id: favorite.id,
            imageId: favorite.image_id,
            imageUrl: favorite.image_url,
            filename: favorite.filename,
            tags: tags,
            likes: favorite.likes,
            sourceLink: favorite.source_link,
            timestamp: favorite.timestamp,
            createdAt: favorite.created_at
          };
        })

        res.json({
          success: true,
          data: {
            images: processedFavorites,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: total,
              pages: totalPages
            },
            hasMore: pageNum < totalPages
          }
        })

      } finally {
        connection.release()
      }
    } catch (error) {
      console.error('获取收藏图片失败:', error)
      res.status(500).json({
        success: false,
        message: '获取收藏图片失败'
      })
    }
  }

  // 删除收藏的图片
  async removeFavorite(req, res) {
    try {
      const { imageId } = req.params
      const userId = req.user.id

      const db = require('../config/mysql')
      const connection = await db.getConnection()
      
      try {
        const [result] = await connection.query(
          'DELETE FROM inspiration_favorites WHERE user_id = ? AND id = ?',
          [userId, parseInt(imageId)]
        )

        if (result.affectedRows > 0) {
          res.json({
            success: true,
            message: '取消收藏成功'
          })
        } else {
          res.status(404).json({
            success: false,
            message: '收藏记录不存在'
          })
        }

      } finally {
        connection.release()
      }
    } catch (error) {
      console.error('删除收藏失败:', error)
      res.status(500).json({
        success: false,
        message: '删除收藏失败'
      })
    }
  }
}

module.exports = new InspirationController()

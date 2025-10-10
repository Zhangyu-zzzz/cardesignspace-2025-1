const Image = require('../models/mysql/Image');
const logger = require('../config/logger');

// 更新图片标签
exports.updateImageTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    // 验证输入
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        status: 'error',
        message: '标签必须是数组格式'
      });
    }

    // 验证标签内容
    const validTags = tags.filter(tag => 
      typeof tag === 'string' && 
      tag.trim().length > 0 && 
      tag.trim().length <= 50
    );

    if (validTags.length !== tags.length) {
      return res.status(400).json({
        status: 'error',
        message: '标签格式不正确，每个标签应为1-50个字符的字符串'
      });
    }

    // 查找图片
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    // 更新标签
    const newTags = validTags.map(tag => tag.trim());
    console.log('准备更新标签:', {
      imageId: id,
      oldTags: image.tags,
      newTags: newTags
    });
    
    await image.update({
      tags: newTags
    });

    // 重新获取更新后的图片数据
    await image.reload();
    
    console.log('标签更新完成:', {
      imageId: id,
      updatedTags: image.tags
    });

    logger.info(`图片标签已更新: 图片ID=${id}, 标签数量=${validTags.length}`);

    res.json({
      status: 'success',
      message: '标签更新成功',
      data: {
        id: image.id,
        tags: image.tags
      }
    });

  } catch (error) {
    logger.error('更新图片标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新图片标签失败',
      details: error.message
    });
  }
};

// 获取图片标签
exports.getImageTags = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findByPk(id, {
      attributes: ['id', 'tags']
    });

    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    res.json({
      status: 'success',
      data: {
        id: image.id,
        tags: image.tags || []
      }
    });

  } catch (error) {
    logger.error('获取图片标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取图片标签失败',
      details: error.message
    });
  }
};
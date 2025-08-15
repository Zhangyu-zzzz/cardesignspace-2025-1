const { ArticleImage } = require('../src/models/mysql');

async function createArticleImagesTable() {
  try {
    console.log('开始创建 article_images 表...');
    
    // 创建表（如果不存在）
    await ArticleImage.sync({ force: false });
    
    console.log('✅ article_images 表创建成功！');
    console.log('\n表结构说明：');
    console.log('- id: 主键');
    console.log('- articleId: 关联的文章ID（可为空）');
    console.log('- userId: 上传用户ID');
    console.log('- url: 图片URL地址');
    console.log('- filename: 原始文件名');
    console.log('- cosKey: 腾讯云COS存储键');
    console.log('- fileSize: 文件大小');
    console.log('- fileType: 文件MIME类型');
    console.log('- imageType: 图片类型（cover/content/thumbnail）');
    console.log('- alt: 图片alt描述');
    console.log('- caption: 图片说明文字');
    console.log('- sortOrder: 排序顺序');
    console.log('- status: 状态（active/deleted）');
    console.log('- uploadedAt: 上传时间');
    console.log('- createdAt/updatedAt: 创建/更新时间');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建 article_images 表失败:', error);
    process.exit(1);
  }
}

createArticleImagesTable(); 
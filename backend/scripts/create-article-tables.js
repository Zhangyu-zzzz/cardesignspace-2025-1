const { sequelize } = require('../src/config/mysql');
const { Article, ArticleComment, ArticleLike } = require('../src/models/mysql');

async function createArticleTables() {
  try {
    console.log('开始创建文章相关表...');
    
    // 检查连接
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 创建文章表
    console.log('创建文章表...');
    await Article.sync({ force: false });
    console.log('✓ 文章表创建成功');
    
    // 创建文章评论表
    console.log('创建文章评论表...');
    await ArticleComment.sync({ force: false });
    console.log('✓ 文章评论表创建成功');
    
    // 创建文章点赞表
    console.log('创建文章点赞表...');
    await ArticleLike.sync({ force: false });
    console.log('✓ 文章点赞表创建成功');
    
    console.log('\n所有文章相关表创建完成！');
    
    // 插入一些示例数据
    console.log('\n插入示例数据...');
    
    // 查找管理员用户
    const { User } = require('../src/models/mysql');
    let adminUser = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminUser) {
      // 如果没有管理员，查找第一个用户
      adminUser = await User.findOne();
      if (!adminUser) {
        console.log('没有找到用户，跳过示例数据插入');
        return;
      }
    }
    
    // 插入示例文章
    const sampleArticles = [
      {
        title: '2024年最受期待的新能源汽车',
        subtitle: '盘点今年即将上市的热门电动车型',
        content: `
          <h2>引言</h2>
          <p>2024年是新能源汽车发展的关键一年，众多车企都推出了令人瞩目的新车型。本文将为您盘点今年最值得期待的几款电动汽车。</p>
          
          <h2>特斯拉 Model Y 2024款</h2>
          <p>特斯拉继续在电动车领域领跑，新款Model Y在续航里程和智能驾驶方面都有显著提升。</p>
          
          <h2>比亚迪海豹</h2>
          <p>作为国产新能源汽车的代表，比亚迪海豹凭借其出色的性价比和技术实力，成为市场热门选择。</p>
          
          <h2>结语</h2>
          <p>新能源汽车的发展正在加速，消费者的选择也越来越多样化。</p>
        `,
        summary: '盘点2024年最受期待的新能源汽车，包括特斯拉、比亚迪等品牌的最新车型。',
        authorId: adminUser.id,
        category: '新车发布',
        tags: ['新能源', '电动汽车', '2024新车', '特斯拉', '比亚迪'],
        coverImage: 'https://example.com/cover1.jpg',
        status: 'published',
        featured: true,
        publishedAt: new Date(),
        readingTime: 5,
        viewCount: 156,
        likeCount: 23,
        commentCount: 8
      },
      {
        title: '如何选择适合自己的汽车保险',
        subtitle: '全面解析各类车险的保障范围和购买建议',
        content: `
          <h2>车险的重要性</h2>
          <p>汽车保险是每位车主必须考虑的重要问题，合适的保险方案能够为您的爱车和自身提供全面保障。</p>
          
          <h2>主要险种介绍</h2>
          <h3>交强险</h3>
          <p>交强险是国家强制要求购买的保险，主要保障第三方的人身伤亡和财产损失。</p>
          
          <h3>商业险</h3>
          <p>包括车损险、第三者责任险、座位险等，根据个人需求选择购买。</p>
          
          <h2>购买建议</h2>
          <p>建议新车主购买全险，老车可根据车辆价值适当调整保险方案。</p>
        `,
        summary: '详细介绍汽车保险的各种类型，帮助车主选择最适合的保险方案。',
        authorId: adminUser.id,
        category: '购车指南',
        tags: ['汽车保险', '车险', '购车指南', '保障'],
        coverImage: 'https://example.com/cover2.jpg',
        status: 'published',
        featured: false,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
        readingTime: 8,
        viewCount: 89,
        likeCount: 12,
        commentCount: 5
      },
      {
        title: '汽车改装入门指南',
        subtitle: '从轮毂到排气，打造个性化座驾',
        content: `
          <h2>改装前的准备</h2>
          <p>汽车改装需要充分的准备和了解，包括法规要求、技术知识和预算规划。</p>
          
          <h2>常见改装项目</h2>
          <h3>外观改装</h3>
          <p>包括轮毂、车身贴纸、尾翼等外观件的升级。</p>
          
          <h3>性能改装</h3>
          <p>发动机调校、排气系统、悬挂系统等性能提升项目。</h3>
          
          <h2>注意事项</h2>
          <p>改装必须符合相关法规，建议选择有资质的改装店进行改装。</p>
        `,
        summary: '汽车改装入门指南，介绍常见改装项目和注意事项。',
        authorId: adminUser.id,
        category: '改装案例',
        tags: ['汽车改装', '个性化', '轮毂', '排气', '性能'],
        coverImage: 'https://example.com/cover3.jpg',
        status: 'published',
        featured: false,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
        readingTime: 6,
        viewCount: 234,
        likeCount: 45,
        commentCount: 18
      }
    ];
    
    const createdArticles = await Article.bulkCreate(sampleArticles);
    console.log(`✓ 已创建 ${createdArticles.length} 篇示例文章`);
    
    // 为第一篇文章添加示例评论
    const firstArticle = createdArticles[0];
    const sampleComments = [
      {
        articleId: firstArticle.id,
        userId: adminUser.id,
        content: '这篇文章写得很详细，对新能源汽车的发展趋势分析得很到位！',
        likeCount: 5
      },
      {
        articleId: firstArticle.id,
        userId: adminUser.id,
        content: '期待比亚迪海豹的实际表现，国产车确实越来越有竞争力了。',
        likeCount: 3
      }
    ];
    
    await ArticleComment.bulkCreate(sampleComments);
    console.log('✓ 已创建示例评论');
    
    console.log('\n✅ 所有操作完成！');
    
  } catch (error) {
    console.error('创建表时出错:', error);
  } finally {
    await sequelize.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createArticleTables();
}

module.exports = createArticleTables; 
const { Feedback } = require('./src/models/mysql');

async function createFeedbackTable() {
  try {
    console.log('开始创建 feedbacks 表...');
    
    // 使用 Sequelize 自动创建表
    await Feedback.sync({ force: false }); // force: false 表示如果表已存在则不删除
    
    console.log('✅ feedbacks 表创建成功！');
    
    // 测试插入一条数据
    const testFeedback = await Feedback.create({
      type: 'other',
      rating: 5,
      contact: 'test@example.com',
      content: '这是一个测试反馈，验证表结构是否正确。',
      userId: null,
      userAgent: 'Test Script',
      pageUrl: 'http://localhost:8080',
      ipAddress: '127.0.0.1',
      status: 'pending'
    });
    
    console.log('✅ 测试数据插入成功！');
    console.log('   ID:', testFeedback.id);
    console.log('   评分:', testFeedback.rating);
    console.log('   内容:', testFeedback.content.substring(0, 30) + '...');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  }
}

createFeedbackTable();



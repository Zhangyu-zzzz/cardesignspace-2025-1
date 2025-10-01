const { sequelize } = require('./src/config/mysql');
const bcrypt = require('bcryptjs');
const User = require('./src/models/mysql/User');

async function createTestUser() {
  try {
    console.log('🔧 创建测试用户...');
    
    // 检查是否已存在测试用户
    const existingUser = await User.findOne({
      where: { email: 'admin@test.com' }
    });
    
    if (existingUser) {
      console.log('✅ 测试用户已存在:', existingUser.email);
      return;
    }
    
    // 创建测试用户
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUser = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      isActive: true
    });
    
    console.log('✅ 测试用户创建成功:', {
      id: testUser.id,
      username: testUser.username,
      email: testUser.email
    });
    
    console.log('\n📝 测试用户信息:');
    console.log('邮箱: admin@test.com');
    console.log('密码: password123');
    
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createTestUser();


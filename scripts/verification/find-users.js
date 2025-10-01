const { sequelize } = require('./src/config/mysql');
const User = require('./src/models/mysql/User');

async function findUsers() {
  try {
    console.log('🔍 查找现有用户...');
    
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'status'],
      limit: 10
    });
    
    console.log(`找到 ${users.length} 个用户:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, 用户名: ${user.username}, 邮箱: ${user.email}, 角色: ${user.role}, 状态: ${user.status}`);
    });
    
    if (users.length > 0) {
      console.log('\n📝 可以使用以下用户登录:');
      console.log(`用户名: ${users[0].username}`);
      console.log(`邮箱: ${users[0].email}`);
      console.log('密码: 请尝试常见密码如 password123, admin, 123456 等');
    }
    
  } catch (error) {
    console.error('❌ 查找用户失败:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

findUsers();


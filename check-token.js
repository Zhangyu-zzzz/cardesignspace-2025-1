// 简单的Token检查工具
// 使用方法: node check-token.js "your-token-here"

const jwt = require('jsonwebtoken');

const token = process.argv[2];
if (!token) {
    console.log('❌ 请提供token参数');
    console.log('使用方法: node check-token.js "your-token"');
    process.exit(1);
}

console.log('🔍 分析Token信息...');
console.log('Token长度:', token.length);
console.log('Token前缀:', token.substring(0, 20) + '...');

try {
    // 不验证签名，只解码payload
    const decoded = jwt.decode(token);
    if (decoded) {
        console.log('✅ Token格式正确');
        console.log('Payload内容:', {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            签发时间: new Date(decoded.iat * 1000).toLocaleString(),
            过期时间: new Date(decoded.exp * 1000).toLocaleString(),
            是否过期: Date.now() > decoded.exp * 1000 ? '是' : '否'
        });
    } else {
        console.log('❌ Token格式错误');
    }
} catch (error) {
    console.log('❌ Token解析失败:', error.message);
}

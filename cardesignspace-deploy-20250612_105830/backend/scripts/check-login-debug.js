const axios = require('axios');

async function debugLogin() {
  try {
    console.log('=== 登录状态调试 ===\n');
    
    // 1. 测试注册
    console.log('1. 创建测试用户...');
    const username = 'debuguser' + Date.now();
    const email = `debug${Date.now()}@example.com`;
    const password = 'password123';
    
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      username,
      email,
      password
    });
    
    console.log('注册响应:', JSON.stringify(registerResponse.data, null, 2));
    
    if (registerResponse.data.status !== 'success') {
      console.error('注册失败');
      return;
    }
    
    const token = registerResponse.data.data.token;
    console.log('获得token:', token);
    
    // 2. 测试/api/auth/me接口
    console.log('\n2. 测试 /api/auth/me 接口...');
    
    try {
      const meResponse = await axios.get('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('me接口响应:', JSON.stringify(meResponse.data, null, 2));
    } catch (error) {
      console.error('me接口错误:', error.response?.data || error.message);
    }
    
    // 3. 测试直接登录
    console.log('\n3. 测试登录接口...');
    
    try {
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        username,
        password
      });
      
      console.log('登录响应:', JSON.stringify(loginResponse.data, null, 2));
      
      if (loginResponse.data.status === 'success') {
        const loginToken = loginResponse.data.data.token;
        
        // 4. 用登录token测试me接口
        console.log('\n4. 用登录token测试me接口...');
        
        const meResponse2 = await axios.get('http://localhost:3000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${loginToken}`
          }
        });
        
        console.log('登录后me接口响应:', JSON.stringify(meResponse2.data, null, 2));
      }
      
    } catch (error) {
      console.error('登录错误:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('调试过程出错:', error.response?.data || error.message);
  }
}

debugLogin(); 
const axios = require('axios');

async function fullLoginTest() {
  try {
    console.log('=== 完整登录状态测试 ===\n');
    
    // 1. 注册用户
    console.log('1. 注册新用户...');
    const username = 'fulltest' + Date.now();
    const email = `fulltest${Date.now()}@example.com`;
    const password = 'password123';
    
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      username,
      email,
      password
    });
    
    console.log('注册原始响应:', registerResponse.data);
    
    // 兼容两种响应格式
    const registerSuccess = registerResponse.data.success === true || registerResponse.data.status === 'success';
    const registerData = registerResponse.data.data;
    
    console.log('注册处理后:', {
      success: registerSuccess,
      user: registerData?.user?.username,
      hasToken: !!registerData?.token
    });
    
    if (!registerSuccess) {
      console.error('注册失败，停止测试');
      return;
    }
    
    const token = registerData.token;
    
    // 2. 测试使用token访问me接口
    console.log('\n2. 使用注册获得的token测试me接口...');
    
    try {
      const meResponse1 = await axios.get('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('me接口原始响应1:', meResponse1.data);
      
      const meSuccess1 = meResponse1.data.success === true || meResponse1.data.status === 'success';
      
      console.log('me接口处理后1:', {
        success: meSuccess1,
        hasData: !!meResponse1.data.data,
        user: meResponse1.data.data?.username
      });
      
    } catch (error) {
      console.error('me接口调用失败 (注册token):', error.response?.data || error.message);
    }
    
    // 3. 测试登录接口
    console.log('\n3. 测试登录接口...');
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username,
      password
    });
    
    console.log('登录原始响应:', loginResponse.data);
    
    const loginSuccess = loginResponse.data.success === true || loginResponse.data.status === 'success';
    const loginData = loginResponse.data.data;
    
    console.log('登录处理后:', {
      success: loginSuccess,
      user: loginData?.user?.username,
      hasToken: !!loginData?.token
    });
    
    if (!loginSuccess) {
      console.error('登录失败，停止测试');
      return;
    }
    
    const loginToken = loginData.token;
    
    // 4. 使用登录token测试me接口
    console.log('\n4. 使用登录token测试me接口...');
    
    try {
      const meResponse2 = await axios.get('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${loginToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('me接口原始响应2:', meResponse2.data);
      
      const meSuccess2 = meResponse2.data.success === true || meResponse2.data.status === 'success';
      
      console.log('me接口处理后2:', {
        success: meSuccess2,
        hasData: !!meResponse2.data.data,
        user: meResponse2.data.data?.username
      });
      
      console.log('\n✅ 所有测试完成，后端接口工作正常！');
      
    } catch (error) {
      console.error('me接口调用失败 (登录token):', error.response?.data || error.message);
    }
    
    // 5. 模拟前端的checkAuth流程
    console.log('\n5. 模拟前端checkAuth流程...');
    
    // 模拟localStorage
    const mockLocalStorage = {
      token: loginToken,
      user: JSON.stringify(loginData.user)
    };
    
    console.log('模拟localStorage状态:');
    console.log('- token存在:', !!mockLocalStorage.token);
    console.log('- user存在:', !!mockLocalStorage.user);
    
    // 模拟前端checkAuth请求
    try {
      const checkAuthResponse = await axios.get('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${mockLocalStorage.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const isSuccess = checkAuthResponse.data.status === 'success' || checkAuthResponse.data.success === true;
      const userData = checkAuthResponse.data.data;
      
      console.log('checkAuth模拟结果:');
      console.log('- 请求成功:', true);
      console.log('- 响应成功标志:', isSuccess);
      console.log('- 用户数据存在:', !!userData);
      console.log('- 用户名:', userData?.username);
      
      if (isSuccess && userData) {
        console.log('✅ 前端checkAuth流程应该可以正常工作');
      } else {
        console.log('❌ checkAuth流程可能有问题');
      }
      
    } catch (error) {
      console.error('❌ checkAuth模拟失败:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error.response?.data || error.message);
  }
}

fullLoginTest(); 
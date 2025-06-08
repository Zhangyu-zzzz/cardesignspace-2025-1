// 登录状态调试工具
export function debugAuthState() {
  console.log('=== 前端登录状态调试 ===');
  
  // 检查localStorage
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  console.log('localStorage状态:');
  console.log('- token存在:', !!token);
  console.log('- token值:', token ? token.substring(0, 50) + '...' : 'null');
  console.log('- user存在:', !!userStr);
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('- user解析成功:', user);
    } catch (error) {
      console.error('- user解析失败:', error);
    }
  }
  
  // 检查Vuex状态
  const store = require('../store/index.js').default;
  console.log('\nVuex状态:');
  console.log('- isAuthenticated:', store.state.isAuthenticated);
  console.log('- user:', store.state.user);
  console.log('- token:', store.state.token ? store.state.token.substring(0, 50) + '...' : 'null');
  
  return {
    hasToken: !!token,
    hasUser: !!userStr,
    isAuthenticated: store.state.isAuthenticated,
    vuexUser: store.state.user
  };
}

// 测试登录状态恢复
export async function testAuthRestore() {
  console.log('\n=== 测试登录状态恢复 ===');
  
  const store = require('../store/index.js').default;
  
  try {
    console.log('调用checkAuth...');
    const result = await store.dispatch('checkAuth');
    console.log('checkAuth结果:', result);
    
    console.log('恢复后的Vuex状态:');
    console.log('- isAuthenticated:', store.state.isAuthenticated);
    console.log('- user:', store.state.user);
    
    return result;
  } catch (error) {
    console.error('checkAuth失败:', error);
    return false;
  }
} 
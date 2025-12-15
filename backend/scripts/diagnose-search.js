/**
 * 诊断智能搜索问题
 */
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const CLIP_SERVICE = process.env.CLIP_SERVICE || 'http://localhost:5001';

async function checkClipService() {
  console.log('\n🔍 检查CLIP服务...');
  try {
    // 检查根路由
    const rootResponse = await axios.get(`${CLIP_SERVICE}/`);
    console.log('✅ CLIP服务根路由:', rootResponse.data);
    
    // 检查健康状态
    const healthResponse = await axios.get(`${CLIP_SERVICE}/health`);
    console.log('✅ CLIP服务健康检查:', healthResponse.data);
    
    // 测试文本向量化
    const vectorResponse = await axios.post(`${CLIP_SERVICE}/encode-text`, {
      text: '红色的宝马'
    }, { timeout: 30000 });
    
    if (vectorResponse.data.status === 'success') {
      console.log('✅ 文本向量化成功:', {
        text: vectorResponse.data.text,
        dimension: vectorResponse.data.dimension,
        vectorLength: vectorResponse.data.vector.length
      });
      return true;
    } else {
      console.error('❌ 文本向量化失败:', vectorResponse.data);
      return false;
    }
  } catch (error) {
    console.error('❌ CLIP服务检查失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   服务未启动，请运行: cd backend/services && python3 clip_vectorize_service.py');
    }
    return false;
  }
}

async function checkBackendAPI() {
  console.log('\n🔍 检查后端API...');
  try {
    const response = await axios.get(`${API_BASE}/api/smart-search`, {
      params: {
        q: '测试',
        page: 1,
        limit: 5
      },
      timeout: 30000
    });
    
    console.log('✅ 后端API响应:', {
      status: response.data.status,
      hasData: !!response.data.data,
      imagesCount: response.data.data?.images?.length || 0,
      searchInfo: response.data.data?.searchInfo
    });
    
    if (response.data.status === 'success') {
      return true;
    } else {
      console.error('❌ API返回错误:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 后端API检查失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('   后端服务未启动，请运行: cd backend && npm run dev');
    }
    return false;
  }
}

async function testSearch(query) {
  console.log(`\n🔍 测试搜索: "${query}"`);
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE}/api/smart-search`, {
      params: {
        q: query,
        page: 1,
        limit: 10
      },
      timeout: 60000 // 60秒超时
    });
    const duration = Date.now() - startTime;
    
    if (response.data.status === 'success') {
      const data = response.data.data;
      console.log(`✅ 搜索成功 (耗时: ${duration}ms):`);
      console.log(`   - MySQL结果: ${data.searchInfo?.mysqlResultsCount || 0}`);
      console.log(`   - 向量结果: ${data.searchInfo?.vectorResultsCount || 0}`);
      console.log(`   - 合并结果: ${data.images?.length || 0}`);
      console.log(`   - 总数: ${data.pagination?.total || 0}`);
      
      if (data.searchInfo?.brandInfo) {
        console.log(`   - 识别品牌: ${data.searchInfo.brandInfo.name}`);
      }
      
      if (data.images && data.images.length > 0) {
        console.log('\n   前3个结果:');
        data.images.slice(0, 3).forEach((img, idx) => {
          console.log(`   ${idx + 1}. ID: ${img.id}, 来源: ${img.fromVectorSearch ? '向量' : 'MySQL'}, 车型: ${img.model?.name || '未知'}`);
        });
      } else {
        console.log('   ⚠️  没有找到结果');
      }
      
      return true;
    } else {
      console.error('❌ 搜索失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 搜索请求失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function main() {
  console.log('🚀 开始诊断智能搜索问题...\n');
  console.log('配置:');
  console.log(`  - 后端API: ${API_BASE}`);
  console.log(`  - CLIP服务: ${CLIP_SERVICE}\n`);
  
  // 1. 检查CLIP服务
  const clipOk = await checkClipService();
  
  // 2. 检查后端API
  const apiOk = await checkBackendAPI();
  
  // 3. 测试搜索
  if (clipOk && apiOk) {
    console.log('\n📝 测试不同的搜索查询...\n');
    
    const testQueries = [
      '红色的',
      '宝马',
      '红色的宝马',
      '运动风格'
    ];
    
    for (const query of testQueries) {
      await testSearch(query);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }
  } else {
    console.log('\n⚠️  跳过搜索测试（服务未就绪）');
    console.log('\n请确保：');
    if (!clipOk) {
      console.log('  1. CLIP服务已启动: cd backend/services && python3 clip_vectorize_service.py');
    }
    if (!apiOk) {
      console.log('  2. 后端服务已启动: cd backend && npm run dev');
    }
  }
  
  console.log('\n✅ 诊断完成\n');
}

main().catch(console.error);






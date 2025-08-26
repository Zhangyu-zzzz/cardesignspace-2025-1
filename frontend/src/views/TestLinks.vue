<template>
  <div class="test-links-page">
    <div class="container">
      <h1>右键新标签打开功能测试</h1>
      
      <div class="test-section">
        <h2>测试说明</h2>
        <p>以下链接都支持右键"在新标签中打开"功能：</p>
        <ul>
          <li>右键点击链接 → 在新标签中打开</li>
          <li>Ctrl+点击（Windows）或 Cmd+点击（Mac）→ 在新标签中打开</li>
          <li>中键点击 → 在新标签中打开</li>
        </ul>
      </div>

      <div class="test-section">
        <h2>方法1：使用Vue指令 (v-link)</h2>
        <div class="test-links">
          <div v-link="'/'" class="test-link">首页</div>
          <div v-link="'/brands'" class="test-link">品牌列表</div>
          <div v-link="'/models'" class="test-link">车型列表</div>
          <div v-link="'/articles'" class="test-link">文章列表</div>
          <div v-link="'/search'" class="test-link">搜索页面</div>
        </div>
      </div>

      <div class="test-section">
        <h2>方法2：使用Mixin方法</h2>
        <div class="test-links">
          <div @click="$handleLinkClick($event, '/')" class="test-link">首页</div>
          <div @click="$handleLinkClick($event, '/brands')" class="test-link">品牌列表</div>
          <div @click="$handleLinkClick($event, '/models')" class="test-link">车型列表</div>
          <div @click="$handleLinkClick($event, '/articles')" class="test-link">文章列表</div>
          <div @click="$handleLinkClick($event, '/search')" class="test-link">搜索页面</div>
        </div>
      </div>

      <div class="test-section">
        <h2>方法3：带查询参数的链接</h2>
        <div class="test-links">
          <div v-link="{ path: '/search', query: { keyword: '宝马' } }" class="test-link">
            搜索"宝马"
          </div>
          <div v-link="{ path: '/articles', query: { category: '新车发布' } }" class="test-link">
            新车发布文章
          </div>
          <div v-link="{ path: '/profile', query: { tab: 'favorites' } }" class="test-link">
            我的收藏
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>方法4：强制新标签打开</h2>
        <div class="test-links">
          <div @click="$linkToNewTab('/')" class="test-link">首页（新标签）</div>
          <div @click="$linkToNewTab('/brands')" class="test-link">品牌列表（新标签）</div>
          <div @click="$linkToNewTab('/models')" class="test-link">车型列表（新标签）</div>
        </div>
      </div>

      <div class="test-section">
        <h2>方法5：自定义右键菜单测试</h2>
        <p>右键点击以下链接，会显示包含多个选项的菜单：</p>
        <div class="test-links">
          <div 
            @click="$handleLinkClick($event, '/')" 
            @contextmenu="$handleLinkContextMenu($event, '/', { text: '首页' })" 
            class="test-link"
          >
            首页（右键菜单）
          </div>
          <div 
            @click="$handleLinkClick($event, '/brands')" 
            @contextmenu="$handleLinkContextMenu($event, '/brands', { text: '品牌列表' })" 
            class="test-link"
          >
            品牌列表（右键菜单）
          </div>
          <div 
            @click="$handleLinkClick($event, '/models')" 
            @contextmenu="$handleLinkContextMenu($event, '/models', { text: '车型列表' })" 
            class="test-link"
          >
            车型列表（右键菜单）
          </div>
          <div 
            @click="$handleLinkClick($event, '/search')" 
            @contextmenu="$handleLinkContextMenu($event, '/search', { 
              text: '搜索页面',
              query: { keyword: '宝马' }
            })" 
            class="test-link"
          >
            搜索宝马（右键菜单）
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>方法6：自定义菜单项</h2>
        <p>右键点击以下链接，会显示自定义的菜单项：</p>
        <div class="test-links">
          <div 
            @click="$handleLinkClick($event, '/articles')" 
            @contextmenu="$handleLinkContextMenu($event, '/articles', { 
              text: '文章列表',
              menuItems: [
                {
                  id: 'new-tab',
                  label: '在新标签页中打开',
                  icon: 'el-icon-folder-opened',
                  action: 'new-tab'
                },
                {
                  id: 'copy-link',
                  label: '复制链接',
                  icon: 'el-icon-document-copy',
                  action: 'copy-link'
                },
                {
                  id: 'custom',
                  label: '自定义操作',
                  icon: 'el-icon-star-on',
                  handler: (path, text) => {
                    this.$message.success(`自定义操作：${text}`);
                  }
                }
              ]
            })" 
            class="test-link"
          >
            文章列表（自定义菜单）
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>对比：传统router-link（不支持右键新标签）</h2>
        <div class="test-links">
          <router-link to="/" class="test-link traditional">首页（传统方式）</router-link>
          <router-link to="/brands" class="test-link traditional">品牌列表（传统方式）</router-link>
          <router-link to="/models" class="test-link traditional">车型列表（传统方式）</router-link>
        </div>
        <p class="note">注意：传统router-link不支持右键新标签打开功能</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TestLinks',
  data() {
    return {
      // 测试数据
    }
  },
  methods: {
    // 测试方法
  }
}
</script>

<style scoped>
.test-links-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.container {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
}

.test-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  background: #f8f9fa;
}

.test-section h2 {
  color: #e03426;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.test-section p {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.6;
}

.test-section ul {
  margin-bottom: 20px;
  padding-left: 20px;
}

.test-section li {
  margin-bottom: 5px;
  color: #555;
}

.test-links {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
}

.test-link {
  display: inline-block;
  padding: 12px 20px;
  background: #e03426;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  border: none;
  font-size: 14px;
}

.test-link:hover {
  background: #f04838;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(224, 52, 38, 0.3);
}

.test-link:active {
  transform: translateY(0);
}

.test-link.traditional {
  background: #6c757d;
}

.test-link.traditional:hover {
  background: #5a6268;
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

.note {
  margin-top: 15px;
  padding: 10px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
  font-size: 14px;
}

@media (max-width: 768px) {
  .test-links {
    flex-direction: column;
  }
  
  .test-link {
    text-align: center;
  }
}
</style>

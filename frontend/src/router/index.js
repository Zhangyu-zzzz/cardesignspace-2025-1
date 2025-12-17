import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import store from '../store'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/brands',
    name: 'Brands',
    component: () => import('../views/Brands.vue')
  },
  {
    path: '/brand/:id',
    name: 'BrandDetail',
    component: () => import('../views/BrandDetail.vue')
  },
  {
    path: '/model/:id',
    name: 'ModelDetail',
    component: () => import('../views/ModelDetail.vue')
  },
  {
    path: '/series',
    name: 'Series',
    component: () => import('../views/Series.vue')
  },
  {
    path: '/models',
    name: 'Models',
    component: () => import('../views/Models.vue')
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue')
  },
  {
    path: '/upload',
    name: 'ImageUpload',
    component: () => import('../views/ImageUpload.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/forum',
    name: 'Forum',
    component: () => import('../views/Forum.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/uploads',
    name: 'ProfileUploads',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/favorites',
    name: 'ProfileFavorites',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:userId',
    name: 'UserProfile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/articles',
    name: 'Articles',
    component: () => import('../views/Articles.vue')
  },
  {
    path: '/inspiration',
    name: 'Inspiration',
    component: () => import('../views/Inspiration.vue')
  },
  {
    path: '/draw-car',
    name: 'DrawCar',
    component: () => import('../views/DrawCar.vue'),
    meta: { requiresAuth: true } // ⭐ 要求登录才能访问
  },
  {
    path: '/articles/edit/:id?',
    name: 'ArticleEditor',
    component: () => import('../views/ArticleEditor.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/articles/:id',
    name: 'ArticleDetail',
    component: () => import('../views/ArticleDetail.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue')
  },
  {
    path: '/image-tagging',
    name: 'ImageTagging',
    component: () => import('../views/ImageTagging.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/image-gallery',
    name: 'ImageGallery',
    component: () => import('../views/ImageGallery.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/smart-search',
    name: 'SmartSearch',
    component: () => import('../views/SmartSearch.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/test-links',
    name: 'TestLinks',
    component: () => import('../views/TestLinks.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/image-viewer',
    name: 'ImageViewer',
    component: () => import('../views/ImageViewer.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/test-image-context-menu',
    name: 'TestImageContextMenu',
    component: () => import('../views/TestImageContextMenu.vue'),
    meta: { requiresAuth: false }
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  // ⭐ 配置页面切换时的滚动行为
  scrollBehavior(to, from, savedPosition) {
    // 如果有保存的滚动位置（浏览器后退/前进按钮），则恢复到该位置
    if (savedPosition) {
      return savedPosition
    }
    // 如果是锚点跳转，滚动到锚点位置
    if (to.hash) {
      return {
        selector: to.hash,
        behavior: 'smooth'
      }
    }
    // 其他情况，始终滚动到页面顶部
    return { x: 0, y: 0 }
  }
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  console.log(`路由导航: ${from.path} -> ${to.path}`)
  
  // 检查路由是否需要认证
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = store.state.isAuthenticated
  const hasToken = !!localStorage.getItem('token')
  
  console.log('路由守卫检查:', {
    requiresAuth,
    isAuthenticated,
    hasToken,
    user: store.state.user
  })
  
  // 如果需要认证但用户未登录
  if (requiresAuth && !isAuthenticated && !hasToken) {
    console.log('需要认证但用户未登录，跳转到登录页')
    next('/login')
  } else if (requiresAuth && hasToken && !isAuthenticated) {
    // 有token但Vuex状态未恢复，等待状态恢复后再导航
    console.log('有token但状态未恢复，等待状态恢复')
    store.dispatch('checkAuth').then((authenticated) => {
      if (authenticated) {
        next()
      } else {
        next('/login')
      }
    })
  } else {
    next()
  }
})

export default router 
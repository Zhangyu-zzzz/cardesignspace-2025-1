<template>
  <div class="about-page">
    <!-- 页面头部 -->
    <div class="about-header">
      <div class="header-content">
        <h1 class="main-title">Create. Design. Share.</h1>
        <p class="main-subtitle">
          CarDesignSpace 是全球汽车设计爱好者的灵感库与创意社区，
        </p>
        <p class="main-subtitle">
          我们因热爱而汇聚于此。
        </p>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="about-content">
      <div class="content-container">
        <!-- 三个核心功能区域 -->
        <div class="features-section">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="el-icon-plus"></i>
            </div>
            <div class="feature-content">
              <h3 class="feature-title">CREATE · 创造发现</h3>
              <p class="feature-description">
                我们持续聚合全球杰出汽车设计，从经典杰作到前沿概念，为你构建一座探索设计演进的在线博物馆。
              </p>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <i class="el-icon-collection"></i>
            </div>
            <div class="feature-content">
              <h3 class="feature-title">DESIGN · 设计收藏</h3>
              <p class="feature-description">
                以设计视角重构分类体系，通过精准的品牌、车型、年代与风格标签，助你高效构建个人灵感库。
              </p>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <i class="el-icon-share"></i>
            </div>
            <div class="feature-content">
              <h3 class="feature-title">SHARE · 分享启迪</h3>
              <p class="feature-description">
                这是一个自由共创的社区。我们鼓励分享、对话与碰撞，让每一个灵感点亮更多创意可能。
              </p>
            </div>
          </div>
        </div>

        <!-- 加入我们区域 -->
        <!-- <div class="join-section">
          <div class="join-content">
            <h2 class="join-title">加入我们，共同驶向汽车设计的未来。</h2>
            <div class="join-decoration">
              <div class="decoration-line"></div>
              <div class="decoration-dot"></div>
              <div class="decoration-line"></div>
            </div>
          </div>
        </div> -->

        <!-- 关注我们区域 -->
        <div class="follow-section">
          <div class="follow-header">
            <h3 class="follow-title">▌ 更多精彩内容，敬请关注</h3>
            <p class="follow-subtitle">微信公众号 | 微信小程序</p>
          </div>
          
          <div class="platform-info">
            <div class="platform-card">
              <div class="platform-icon">
                <i class="el-icon-mobile-phone"></i>
              </div>
              <div class="platform-content">
                <h4 class="platform-name">CarDesignSpace</h4>
                <p class="platform-desc">持续更新，持续进化。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'About',
  data() {
    return {
      
    }
  },
  mounted() {
    // 设置页面标题
    document.title = '关于我们 - CarDesignSpace'
  }
}
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

/* 页面头部样式 */
.about-header {
  background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
  color: white;
  padding: 80px 0 60px 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.about-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.header-content {
  position: relative;
  z-index: 2;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.main-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 20px 0;
  color: #e03426;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(224, 52, 38, 0.3);
}

.main-subtitle {
  font-size: 20px;
  line-height: 1.6;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
  max-width: 600px;
  margin: 0 auto;
}

/* 主要内容区域 */
.about-content {
  padding: 60px 0;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 功能特性区域 */
.features-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
  margin-bottom: 80px;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #e03426, #ff6b6b, #e03426);
  border-radius: 4px 4px 0 0;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #e03426, #c12e21);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 25px;
  box-shadow: 0 8px 24px rgba(224, 52, 38, 0.3);
  transition: all 0.3s ease;
}

.feature-card:hover .feature-icon {
  transform: scale(1.1);
  box-shadow: 0 12px 32px rgba(224, 52, 38, 0.4);
}

.feature-icon i {
  color: white;
  font-size: 32px;
  font-weight: bold;
}

.feature-title {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0 0 15px 0;
  letter-spacing: 1px;
}

.feature-description {
  font-size: 16px;
  line-height: 1.7;
  color: #666;
  margin: 0;
  text-align: justify;
}

/* 加入我们区域 */
.join-section {
  text-align: center;
  margin-bottom: 80px;
  padding: 60px 0;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.join-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
}

.join-title {
  font-size: 32px;
  font-weight: 600;
  color: #333;
  margin: 0 0 30px 0;
  line-height: 1.4;
}

.join-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.decoration-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #e03426, transparent);
  border-radius: 1px;
}

.decoration-dot {
  width: 12px;
  height: 12px;
  background: #e03426;
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(224, 52, 38, 0.5);
}

/* 关注我们区域 */
.follow-section {
  background: white;
  border-radius: 20px;
  padding: 50px 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.follow-header {
  text-align: center;
  margin-bottom: 40px;
}

.follow-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.follow-subtitle {
  font-size: 18px;
  color: #666;
  margin: 0;
  font-weight: 500;
}

.platform-info {
  display: flex;
  justify-content: center;
}

.platform-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 30px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.platform-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.platform-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #e03426, #c12e21);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(224, 52, 38, 0.3);
}

.platform-icon i {
  color: white;
  font-size: 24px;
  font-weight: bold;
}

.platform-content {
  text-align: left;
}

.platform-name {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 5px 0;
}

.platform-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .about-header {
    padding: 60px 0 40px 0;
  }

  .main-title {
    font-size: 36px;
    color: #e03426;
  }

  .main-subtitle {
    font-size: 18px;
  }

  .about-content {
    padding: 40px 0;
  }

  .content-container {
    padding: 0 15px;
  }

  .features-section {
    grid-template-columns: 1fr;
    gap: 30px;
    margin-bottom: 60px;
  }

  .feature-card {
    padding: 30px 20px;
  }

  .feature-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 20px;
  }

  .feature-icon i {
    font-size: 24px;
  }

  .feature-title {
    font-size: 20px;
  }

  .feature-description {
    font-size: 15px;
  }

  .join-section {
    margin-bottom: 60px;
    padding: 40px 0;
  }

  .join-title {
    font-size: 24px;
  }

  .follow-section {
    padding: 30px 20px;
  }

  .follow-title {
    font-size: 22px;
  }

  .follow-subtitle {
    font-size: 16px;
  }

  .platform-card {
    padding: 20px;
    flex-direction: column;
    text-align: center;
  }

  .platform-content {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .about-header {
    padding: 40px 0 30px 0;
  }

  .main-title {
    font-size: 28px;
    color: #e03426;
  }

  .main-subtitle {
    font-size: 16px;
  }

  .about-content {
    padding: 30px 0;
  }

  .content-container {
    padding: 0 10px;
  }

  .features-section {
    gap: 20px;
    margin-bottom: 40px;
  }

  .feature-card {
    padding: 25px 15px;
  }

  .feature-icon {
    width: 50px;
    height: 50px;
    margin-bottom: 15px;
  }

  .feature-icon i {
    font-size: 20px;
  }

  .feature-title {
    font-size: 18px;
  }

  .feature-description {
    font-size: 14px;
  }

  .join-section {
    margin-bottom: 40px;
    padding: 30px 0;
  }

  .join-title {
    font-size: 20px;
  }

  .follow-section {
    padding: 25px 15px;
  }

  .follow-title {
    font-size: 18px;
  }

  .follow-subtitle {
    font-size: 14px;
  }

  .platform-card {
    padding: 15px;
  }

  .platform-icon {
    width: 50px;
    height: 50px;
  }

  .platform-icon i {
    font-size: 20px;
  }

  .platform-name {
    font-size: 16px;
  }

  .platform-desc {
    font-size: 12px;
  }
}
</style>

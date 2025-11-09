<template>
  <div class="draw-car-container">
    <!-- 欢迎界面 -->
    <div v-if="currentScreen === 'welcome'" class="screen active">
      <div class="welcome-container">
        <h1 class="title">🚗 画了个车 🚗</h1>
        <p class="subtitle">用你的想象力创造独一无二的载具</p>
        <div class="intro">
          <p>✨ 画出你心中的车</p>
          <!-- <p>🎨 AI让它活起来</p> -->
          <p>🌏 与全球玩家分享</p>
        </div>
        <button @click="goToScreen('draw')" class="btn-primary">开始创作</button>
        <button @click="goToScreen('garage')" class="btn-secondary">参观车库</button>
        <button @click="goToScreen('rank')" class="btn-secondary">查看排行榜</button>
      </div>
    </div>

    <!-- 绘画界面 - 全新设计 -->
    <div v-if="currentScreen === 'draw'" class="screen active">
      <div class="draw-container-new">
        <!-- 顶部标题栏 -->
        <div class="draw-header-new">
          <div class="header-left">
            <button @click="goToScreen('welcome')" class="btn-back-new">
              <span class="icon">←</span>
              <span>返回</span>
            </button>
          </div>
          <div class="header-center">
            <h2 class="draw-title">🎨 创作你的载具</h2>
            <p class="draw-subtitle">随心所欲地画，让想象力驰骋</p>
          </div>
          <div class="header-right">
            <button @click="submitDrawing" class="btn-submit-new">
              <span class="icon">✨</span>
              <span>完成创作</span>
            </button>
          </div>
        </div>

        <!-- 工具栏 -->
        <div class="draw-toolbar">
          <!-- 颜色选择区 -->
          <div class="toolbar-section color-section">
            <div class="section-header">
              <span class="section-icon">🎨</span>
              <span class="section-label">颜色</span>
            </div>
            <div class="color-palette-new">
              <div 
                v-for="color in colors" 
                :key="color"
                class="color-item" 
                :class="{ active: currentColor === color }"
                :style="{ background: color }"
                @click="selectColor(color)"
                :title="getColorName(color)"
              >
                <span v-if="currentColor === color" class="check-mark">✓</span>
              </div>
            </div>
          </div>

          <!-- 画笔设置区 -->
          <div class="toolbar-section brush-section">
            <div class="section-header">
              <span class="section-icon">✏️</span>
              <span class="section-label">画笔</span>
            </div>
            <div class="brush-controls">
              <div class="brush-size-control">
                <label class="control-label">粗细</label>
                <div class="size-slider-wrapper">
                  <input 
                    type="range" 
                    v-model="brushSize" 
                    min="2" 
                    max="30"
                    class="size-slider"
                  >
                  <div class="size-preview" :style="{ 
                    width: brushSize + 'px', 
                    height: brushSize + 'px',
                    background: currentColor 
                  }"></div>
                  <span class="size-value">{{ brushSize }}px</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮区 -->
          <div class="toolbar-section actions-section">
            <div class="section-header">
              <span class="section-icon">🛠️</span>
              <span class="section-label">操作</span>
            </div>
            <div class="action-btns">
              <button @click="undo" class="tool-btn undo-btn" :disabled="drawingHistory.length === 0">
                <span class="btn-icon">↶</span>
                <span class="btn-label">撤销</span>
              </button>
              <button @click="resetCanvasTransform" class="tool-btn reset-btn" v-if="scale !== 1 || translateX !== 0 || translateY !== 0">
                <span class="btn-icon">🔍</span>
                <span class="btn-label">重置视图</span>
              </button>
              <button @click="clearCanvas" class="tool-btn clear-btn">
                <span class="btn-icon">🗑️</span>
                <span class="btn-label">清空</span>
              </button>
            </div>
          </div>

          <!-- 统计信息区 -->
          <div class="toolbar-section stats-section">
            <div class="section-header">
              <span class="section-icon">📊</span>
              <span class="section-label">信息</span>
            </div>
            <div class="canvas-stats">
              <div class="stat-item">
                <span class="stat-label">笔画数</span>
                <span class="stat-value">{{ drawingHistory.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">画布</span>
                <span class="stat-value">{{ canvasWidth }}×{{ canvasHeight }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 画布区域 -->
        <div class="draw-canvas-area">
          <div class="canvas-wrapper">
            <div class="canvas-frame">
              <canvas ref="drawCanvas"></canvas>
            </div>
            <div class="canvas-hint">
              <p class="hint-desktop">💡 提示：在画布上自由绘画，创作属于你的独特载具</p>
              <p class="hint-mobile">💡 单指绘画 | 双指缩放平移 | 画出精彩细节</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 车库界面 -->
    <div v-if="currentScreen === 'garage'" class="screen active">
      <div class="garage-container">
        <div class="garage-header">
          <div class="garage-header-top">
            <h2 class="garage-title">🏁 全球载具</h2>
            <button @click="goToScreen('welcome')" class="btn-back">← 返回</button>
          </div>
          <div class="garage-header-bottom">
            <p class="vehicle-count">载具数量: <span>{{ vehicles.length }}</span></p>
            <label class="display-limit-label">
              显示:
              <select v-model="displayLimit" class="display-limit-select" @change="handleDisplayLimitChange">
                <option value="10">10辆</option>
                <option value="20">20辆</option>
                <option value="30">30辆</option>
                <option value="50">50辆</option>
                <option value="100">100辆</option>
                <option value="200">200辆</option>
                <option value="999">全部</option>
              </select>
            </label>
          </div>
        </div>
        
        <div class="canvas-garage-container">
          <canvas ref="garageCanvas"></canvas>
        </div>
        
        <div class="garage-controls">
          <p class="control-hint">🖱️ 点击任意载具查看详情和投票</p>
        </div>
      </div>
    </div>

    <!-- 排行榜界面 -->
    <div v-if="currentScreen === 'rank'" class="screen active">
      <div class="rank-container">
        <div class="rank-header">
          <h2>🏆 排行榜</h2>
          <p class="hint">按得分（点赞-踩）从高到低排序</p>
        </div>
        <div class="rank-actions">
          <div class="rank-nav-group">
            <button @click="goToScreen('welcome')" class="rank-btn rank-btn-back">
              <span>←</span> 返回首页
            </button>
            <button @click="goToScreen('garage')" class="rank-btn rank-btn-secondary">
              🚗 返回车库
            </button>
          </div>
          <div class="rank-sort-group">
            <button 
              @click="sortRank('score')" 
              class="rank-sort-btn"
              :class="{ 'active': currentSortType === 'score' }"
            >
              ⭐ 按得分
            </button>
            <button 
              @click="sortRank('hot')" 
              class="rank-sort-btn"
              :class="{ 'active': currentSortType === 'hot' }"
            >
              🔥 按热度
            </button>
            <button 
              @click="sortRank('date')" 
              class="rank-sort-btn"
              :class="{ 'active': currentSortType === 'date' }"
            >
              📅 按日期
            </button>
            <button 
              @click="sortRank('random')" 
              class="rank-sort-btn"
              :class="{ 'active': currentSortType === 'random' }"
            >
              🎲 随机
            </button>
          </div>
        </div>
        <div class="rank-grid">
          <div 
            v-for="(vehicle, index) in rankedVehicles" 
            :key="vehicle.id"
            class="rank-item"
            @click="selectVehicleInRank(vehicle)"
          >
            <div class="rank-number">{{ index + 1 }}</div>
            <canvas :ref="`rankCanvas${vehicle.id}`" class="rank-preview"></canvas>
            <div class="rank-info">
              <p class="rank-name">{{ vehicle.name || '未命名载具' }}</p>
              <p class="rank-score">得分: {{ vehicle.score }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 载具命名弹窗 -->
    <el-dialog
      title="🚗 为你的载具取个名字"
      :visible.sync="showNameModal"
      width="400px"
      center
    >
      <p class="modal-hint">给它起个独特的名字吧！</p>
      <el-input
        v-model="vehicleName"
        placeholder="例如：闪电麦昆、香蕉飞船..."
        maxlength="20"
        show-word-limit
        @input="checkNameAvailability"
      ></el-input>
      <div v-if="vehicleName && nameCheckMessage" class="name-check-message" :class="nameCheckStatus">
        <i :class="nameCheckStatus === 'available' ? 'el-icon-success' : 'el-icon-warning'"></i>
        {{ nameCheckMessage }}
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="skipName">跳过</el-button>
        <el-button type="primary" @click="confirmName" :disabled="!isNameAvailable">确定</el-button>
      </span>
    </el-dialog>

    <!-- 载具信息弹窗 - 全局可用 -->
    <div v-if="selectedVehicle" class="vehicle-modal" @click.self="closeModal">
      <div class="modal-content">
        <button @click="closeModal" class="modal-close">✕</button>
        
        <div class="modal-header">
          <h3 class="modal-title">🚗 {{ selectedVehicle.name || '未命名载具' }}</h3>
        </div>
        
        <div class="modal-body">
          <div class="modal-vehicle-preview">
            <canvas ref="previewCanvas"></canvas>
          </div>
          
          <div class="modal-info-section">
            <div class="info-row">
              <span class="info-label">📅 创建时间</span>
              <span class="info-value">{{ formatTime(selectedVehicle.createdAt) }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">⭐ 总评分</span>
              <span class="info-value score-value" :class="{ 
                'positive': selectedVehicle.score > 0,
                'negative': selectedVehicle.score < 0
              }">
                {{ selectedVehicle.score > 0 ? '+' : '' }}{{ selectedVehicle.score }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            @click="voteVehicle('like')" 
            class="vote-btn like-btn"
            :class="{ 'active': selectedVehicle.userVoteStatus === 'like' }"
          >
            <span class="vote-icon">👍</span>
            <span class="vote-count">{{ selectedVehicle.likes || 0 }}</span>
          </button>
          <button 
            @click="voteVehicle('dislike')" 
            class="vote-btn dislike-btn"
            :class="{ 'active': selectedVehicle.userVoteStatus === 'dislike' }"
          >
            <span class="vote-icon">👎</span>
            <span class="vote-count">{{ selectedVehicle.dislikes || 0 }}</span>
          </button>
          <button @click="reportVehicle" class="report-btn">
            🚩
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getVehicles, saveVehicle, voteVehicle as apiVoteVehicle } from '@/api/drawCar'

export default {
  name: 'DrawCar',
  data() {
    return {
      currentScreen: 'welcome',
      colors: ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'],
      currentColor: '#000000',
      brushSize: 5,
      isDrawing: false,
      drawingHistory: [],
      currentStroke: [], // ⭐ 新增：当前笔画数据
      vehicles: [],
      displayLimit: 20,
      selectedVehicle: null,
      hoveredVehicle: null, // ⭐ 新增：悬停的载具
      showNameModal: false,
      vehicleName: '',
      currentDrawingData: null,
      rankedVehicles: [],
      currentSortType: 'score', // ⭐ 当前排序类型
      drawCanvas: null,
      drawCtx: null,
      garageCanvas: null,
      garageCtx: null,
      garageAnimationId: null,
      vehicleSprites: [],
      debugShowBounds: false, // ⭐ 新增：调试模式显示碰撞边界
      canvasWidth: 850, // ⭐ 画布宽度
      canvasHeight: 550, // ⭐ 画布高度（稍微减小，确保完整显示）
      nameCheckMessage: '', // ⭐ 名称检测提示信息
      nameCheckStatus: '', // ⭐ 名称检测状态：'available' 或 'taken'
      deviceId: null, // ⭐ 设备唯一标识（用于匿名用户投票）
      // ⭐ 双指缩放和平移相关
      scale: 1, // 当前缩放比例
      translateX: 0, // X轴平移
      translateY: 0, // Y轴平移
      lastTouchDistance: 0, // 上次两指距离
      lastTouchMidpoint: null, // 上次触摸中点
      isPinching: false, // 是否正在缩放
      isPanning: false // 是否正在平移（单指）
    }
  },
  computed: {
    // ⭐ 计算名称是否可用
    isNameAvailable() {
      if (!this.vehicleName || this.vehicleName.trim() === '') {
        return true // 空名称允许（会使用"未命名载具"）
      }
      return this.nameCheckStatus === 'available'
    }
  },
  mounted() {
    // ⭐ 初始化设备ID（用于匿名用户投票）
    this.initDeviceId()
    
    this.initializeDrawCanvas()
    this.loadVehicles()
    
    // ⭐ 添加键盘快捷键：按 'D' 键切换调试边界显示
    window.addEventListener('keydown', this.handleDebugToggle)
  },
  beforeDestroy() {
    if (this.garageAnimationId) {
      cancelAnimationFrame(this.garageAnimationId)
    }
    // ⭐ 清理事件监听器
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('keydown', this.handleDebugToggle)
  },
  methods: {
    // ⭐ 初始化设备ID（用于匿名用户投票）
    initDeviceId() {
      const STORAGE_KEY = 'drawCar_deviceId'
      let deviceId = localStorage.getItem(STORAGE_KEY)
      
      if (!deviceId) {
        // 生成唯一设备ID：时间戳 + 随机数 + 用户代理信息
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 15)
        const userAgent = navigator.userAgent.substring(0, 20)
        deviceId = `device_${timestamp}_${random}_${btoa(userAgent).substring(0, 10)}`
        
        // 存储到localStorage
        localStorage.setItem(STORAGE_KEY, deviceId)
        console.log('✅ 生成新的设备ID:', deviceId)
      } else {
        console.log('✅ 使用已存在的设备ID:', deviceId)
      }
      
      this.deviceId = deviceId
    },
    
    goToScreen(screen) {
      // ⭐ 切换屏幕时关闭弹窗
      this.selectedVehicle = null
      
      this.currentScreen = screen
      this.$nextTick(() => {
        if (screen === 'draw') {
          this.initializeDrawCanvas()
        } else if (screen === 'garage') {
          this.initializeGarageCanvas()
        } else if (screen === 'rank') {
          this.updateRankList()
        }
      })
    },
    
    initializeDrawCanvas() {
      const canvas = this.$refs.drawCanvas
      if (!canvas) return
      
      canvas.width = this.canvasWidth
      canvas.height = this.canvasHeight
      this.drawCanvas = canvas
      this.drawCtx = canvas.getContext('2d')
      
      // 绑定鼠标绘画事件
      canvas.addEventListener('mousedown', this.startDrawing)
      canvas.addEventListener('mousemove', this.draw)
      canvas.addEventListener('mouseup', this.stopDrawing)
      canvas.addEventListener('mouseleave', this.stopDrawing)
      
      // ⭐ 绑定触摸事件（移动设备支持 + 双指缩放）
      canvas.addEventListener('touchstart', this.handleCanvasTouchStart, { passive: false })
      canvas.addEventListener('touchmove', this.handleCanvasTouchMove, { passive: false })
      canvas.addEventListener('touchend', this.handleCanvasTouchEnd, { passive: false })
      canvas.addEventListener('touchcancel', this.handleCanvasTouchEnd, { passive: false })
      
      // ⭐ 清空画布（透明背景）
      this.drawCtx.clearRect(0, 0, canvas.width, canvas.height)
    },
    
    selectColor(color) {
      this.currentColor = color
    },
    
    // ⭐ 获取颜色名称
    getColorName(color) {
      const colorNames = {
        '#000000': '黑色',
        '#FF0000': '红色',
        '#00FF00': '绿色',
        '#0000FF': '蓝色',
        '#FFFF00': '黄色',
        '#FF00FF': '紫色',
        '#00FFFF': '青色',
        '#FFA500': '橙色'
      }
      return colorNames[color] || '自定义颜色'
    },
    
    startDrawing(e) {
      this.isDrawing = true
      const rect = this.drawCanvas.getBoundingClientRect()
      
      // ⭐ 计算缩放比例（canvas实际尺寸 vs 显示尺寸）
      const scaleX = this.drawCanvas.width / rect.width
      const scaleY = this.drawCanvas.height / rect.height
      
      // ⭐ 应用缩放比例和视口变换计算正确的canvas坐标
      const x = ((e.clientX - rect.left) * scaleX - this.translateX) / this.scale
      const y = ((e.clientY - rect.top) * scaleY - this.translateY) / this.scale
      
      // ⭐ 开始新的笔画
      this.currentStroke = [{
        x: x,
        y: y,
        color: this.currentColor,
        size: this.brushSize
      }]
      
      // ⭐ 设置绘图样式
      this.drawCtx.strokeStyle = this.currentColor
      this.drawCtx.lineWidth = this.brushSize
      this.drawCtx.lineCap = 'round'
      this.drawCtx.lineJoin = 'round'
      
      // ⭐ 开始新路径并移动到起始点
      this.drawCtx.beginPath()
      this.drawCtx.moveTo(x, y)
    },
    
    draw(e) {
      if (!this.isDrawing) return
      
      const rect = this.drawCanvas.getBoundingClientRect()
      
      // ⭐ 计算缩放比例（canvas实际尺寸 vs 显示尺寸）
      const scaleX = this.drawCanvas.width / rect.width
      const scaleY = this.drawCanvas.height / rect.height
      
      // ⭐ 应用缩放比例和视口变换计算正确的canvas坐标
      const x = ((e.clientX - rect.left) * scaleX - this.translateX) / this.scale
      const y = ((e.clientY - rect.top) * scaleY - this.translateY) / this.scale
      
      // ⭐ 保存笔画点
      this.currentStroke.push({
        x: x,
        y: y,
        color: this.currentColor,
        size: this.brushSize
      })
      
      this.drawCtx.strokeStyle = this.currentColor
      this.drawCtx.lineWidth = this.brushSize
      this.drawCtx.lineCap = 'round'
      this.drawCtx.lineJoin = 'round'
      this.drawCtx.lineTo(x, y)
      this.drawCtx.stroke()
    },
    
    stopDrawing() {
      if (this.isDrawing && this.currentStroke.length > 0) {
        // ⭐ 如果只有一个点（点击但未移动），绘制一个圆点
        if (this.currentStroke.length === 1) {
          const point = this.currentStroke[0]
          this.drawCtx.beginPath()
          this.drawCtx.arc(point.x, point.y, point.size / 2, 0, Math.PI * 2)
          this.drawCtx.fillStyle = point.color
          this.drawCtx.fill()
        }
        
        // ⭐ 保存完整的笔画到历史记录
        this.drawingHistory.push([...this.currentStroke])
        this.currentStroke = []
      }
      this.isDrawing = false
    },
    
    // ⭐ 画布触摸事件处理（支持单指绘画 + 双指缩放平移）
    handleCanvasTouchStart(e) {
      e.preventDefault()
      
      if (e.touches.length === 1) {
        // 单指：开始绘画
        if (!this.isPinching) {
          const touch = e.touches[0]
          this.startDrawing({
            clientX: touch.clientX,
            clientY: touch.clientY
          })
        }
      } else if (e.touches.length === 2) {
        // 双指：准备缩放
        this.isPinching = true
        this.isDrawing = false // 停止绘画
        
        // 计算两指距离
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        this.lastTouchDistance = this.getTouchDistance(touch1, touch2)
        this.lastTouchMidpoint = this.getTouchMidpoint(touch1, touch2)
      }
    },
    
    handleCanvasTouchMove(e) {
      e.preventDefault()
      
      if (e.touches.length === 1 && !this.isPinching) {
        // 单指：绘画
        const touch = e.touches[0]
        this.draw({
          clientX: touch.clientX,
          clientY: touch.clientY
        })
      } else if (e.touches.length === 2) {
        // 双指：缩放和平移
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        
        // 计算新的两指距离和中点
        const newDistance = this.getTouchDistance(touch1, touch2)
        const newMidpoint = this.getTouchMidpoint(touch1, touch2)
        
        // 缩放
        if (this.lastTouchDistance > 0) {
          const scaleDelta = newDistance / this.lastTouchDistance
          const newScale = Math.max(0.5, Math.min(5, this.scale * scaleDelta)) // 限制在0.5x-5x
          
          // 以触摸中点为中心缩放
          const rect = this.drawCanvas.getBoundingClientRect()
          const scaleX = this.drawCanvas.width / rect.width
          const scaleY = this.drawCanvas.height / rect.height
          
          const canvasX = (newMidpoint.x - rect.left) * scaleX
          const canvasY = (newMidpoint.y - rect.top) * scaleY
          
          // 调整平移以保持缩放中心不变
          this.translateX = canvasX - (canvasX - this.translateX) * (newScale / this.scale)
          this.translateY = canvasY - (canvasY - this.translateY) * (newScale / this.scale)
          
          this.scale = newScale
        }
        
        // 平移
        if (this.lastTouchMidpoint) {
          const rect = this.drawCanvas.getBoundingClientRect()
          const scaleX = this.drawCanvas.width / rect.width
          const scaleY = this.drawCanvas.height / rect.height
          
          const dx = (newMidpoint.x - this.lastTouchMidpoint.x) * scaleX
          const dy = (newMidpoint.y - this.lastTouchMidpoint.y) * scaleY
          
          this.translateX += dx
          this.translateY += dy
        }
        
        this.lastTouchDistance = newDistance
        this.lastTouchMidpoint = newMidpoint
        
        // 应用变换
        this.applyCanvasTransform()
      }
    },
    
    handleCanvasTouchEnd(e) {
      if (e.touches.length === 0) {
        // 所有手指离开
        this.isPinching = false
        this.lastTouchDistance = 0
        this.lastTouchMidpoint = null
        this.stopDrawing()
      } else if (e.touches.length === 1) {
        // 还有一个手指
        this.isPinching = false
        this.lastTouchDistance = 0
        this.lastTouchMidpoint = null
      }
    },
    
    // ⭐ 辅助方法：计算两个触摸点之间的距离
    getTouchDistance(touch1, touch2) {
      const dx = touch2.clientX - touch1.clientX
      const dy = touch2.clientY - touch1.clientY
      return Math.sqrt(dx * dx + dy * dy)
    },
    
    // ⭐ 辅助方法：计算两个触摸点的中点
    getTouchMidpoint(touch1, touch2) {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      }
    },
    
    // ⭐ 应用画布变换
    applyCanvasTransform() {
      if (!this.drawCanvas) return
      
      this.drawCanvas.style.transform = `translate(${this.translateX / this.scale}px, ${this.translateY / this.scale}px) scale(${this.scale})`
      this.drawCanvas.style.transformOrigin = '0 0'
    },
    
    // ⭐ 重置缩放和平移
    resetCanvasTransform() {
      this.scale = 1
      this.translateX = 0
      this.translateY = 0
      this.applyCanvasTransform()
      this.$message.success('已重置视图')
    },
    
    undo() {
      if (this.drawingHistory.length > 0) {
        this.drawingHistory.pop()
        this.redrawCanvas()
      }
    },
    
    // ⭐ 重绘整个画布（用于撤销）
    redrawCanvas() {
      // 清空画布（透明背景）
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height)
      
      // 重绘所有笔画
      this.drawingHistory.forEach(stroke => {
        if (stroke.length === 0) return
        
        const firstPoint = stroke[0]
        
        if (stroke.length === 1) {
          // ⭐ 只有一个点时，绘制圆点
          this.drawCtx.beginPath()
          this.drawCtx.arc(firstPoint.x, firstPoint.y, firstPoint.size / 2, 0, Math.PI * 2)
          this.drawCtx.fillStyle = firstPoint.color
          this.drawCtx.fill()
        } else {
          // ⭐ 多个点时，只绘制线条（lineCap: 'round' 会自动处理端点）
          this.drawCtx.beginPath()
          this.drawCtx.moveTo(firstPoint.x, firstPoint.y)
          
          for (let i = 1; i < stroke.length; i++) {
            this.drawCtx.lineTo(stroke[i].x, stroke[i].y)
          }
          
          this.drawCtx.strokeStyle = firstPoint.color
          this.drawCtx.lineWidth = firstPoint.size
          this.drawCtx.lineCap = 'round'
          this.drawCtx.lineJoin = 'round'
          this.drawCtx.stroke()
        }
      })
    },
    
    clearCanvas() {
      // ⭐ 使用透明背景，而不是白色
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height)
      this.drawingHistory = []
      this.currentStroke = []
    },
    
    submitDrawing() {
      // 获取画布数据
      const imageData = this.drawCanvas.toDataURL('image/png')
      this.currentDrawingData = imageData
      
      // 重置名称检测状态
      this.nameCheckMessage = ''
      this.nameCheckStatus = ''
      
      // 显示命名弹窗
      this.showNameModal = true
    },
    
    // ⭐ 检测名称可用性
    checkNameAvailability() {
      const name = this.vehicleName.trim()
      
      // 空名称不检测
      if (!name) {
        this.nameCheckMessage = ''
        this.nameCheckStatus = ''
        return
      }
      
      // 检查是否与现有载具名称重复（不区分大小写）
      const nameLower = name.toLowerCase()
      const isDuplicate = this.vehicles.some(v => 
        v.name && v.name.toLowerCase() === nameLower
      )
      
      if (isDuplicate) {
        this.nameCheckMessage = '⚠️ 该名称已被使用，请换一个独特的名字'
        this.nameCheckStatus = 'taken'
      } else {
        this.nameCheckMessage = '✓ 名称可用'
        this.nameCheckStatus = 'available'
      }
    },
    
    async confirmName() {
      try {
        const finalName = this.vehicleName.trim() || '未命名载具'
        
        // ⭐ 最后一次验证：确保名称唯一
        if (finalName !== '未命名载具') {
          const nameLower = finalName.toLowerCase()
          const isDuplicate = this.vehicles.some(v => 
            v.name && v.name.toLowerCase() === nameLower
          )
          
          if (isDuplicate) {
            this.$message.error('该名称已被使用，请换一个独特的名字')
            return
          }
        }
        
        const vehicleData = {
          name: finalName,
          imageData: this.currentDrawingData,
          createdAt: new Date().toISOString()
        }
        
        await saveVehicle(vehicleData)
        
        this.$message.success('载具创建成功！')
        this.showNameModal = false
        this.vehicleName = ''
        this.nameCheckMessage = ''
        this.nameCheckStatus = ''
        this.clearCanvas()
        
        // 重新加载载具列表
        await this.loadVehicles()
        
        // 跳转到车库查看
        this.goToScreen('garage')
      } catch (error) {
        console.error('保存载具失败:', error)
        
        // ⭐ 处理后端返回的名称重复错误
        if (error.response && error.response.data) {
          const errorData = error.response.data
          if (errorData.code === 'NAME_TAKEN') {
            this.$message.error(errorData.message || '该名称已被使用，请换一个独特的名字')
            // 更新前端状态显示错误
            this.nameCheckMessage = '⚠️ ' + (errorData.message || '该名称已被使用')
            this.nameCheckStatus = 'taken'
            return
          }
        }
        
        this.$message.error('保存失败，请稍后重试')
      }
    },
    
    skipName() {
      this.vehicleName = '未命名载具'
      this.confirmName()
    },
    
    async loadVehicles() {
      try {
        // ⭐ 发送deviceId用于查询投票状态
        const response = await getVehicles({ deviceId: this.deviceId })
        // ⭐ 响应拦截器已经返回了response.data，所以直接使用response.data
        this.vehicles = response.data || []
        console.log('✅ 载具数据已加载:', this.vehicles.length, '个载具')
      } catch (error) {
        console.error('加载载具失败:', error)
      }
    },
    
    initializeGarageCanvas() {
      const canvas = this.$refs.garageCanvas
      if (!canvas) return
      
      // ⭐ 使用容器的实际尺寸，而不是window尺寸
      const container = canvas.parentElement
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      
      this.garageCanvas = canvas
      this.garageCtx = canvas.getContext('2d')
      
      console.log('车库Canvas尺寸:', canvas.width, 'x', canvas.height)
      
      // 初始化载具精灵
      this.initializeVehicleSprites()
      
      // 开始动画
      this.animateGarage()
      
      // 绑定点击事件
      canvas.addEventListener('click', this.handleCanvasClick)
      
      // ⭐ 绑定鼠标移动事件（用于悬停效果）
      canvas.addEventListener('mousemove', this.handleCanvasMouseMove)
      
      // ⭐ 监听窗口大小变化
      window.addEventListener('resize', this.handleResize)
    },
    
    handleResize() {
      const canvas = this.$refs.garageCanvas
      if (!canvas) return
      
      const container = canvas.parentElement
      const oldWidth = canvas.width
      const oldHeight = canvas.height
      
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      
      // 调整载具位置，避免飞出边界
      const scaleX = canvas.width / oldWidth
      const scaleY = canvas.height / oldHeight
      
      this.vehicleSprites.forEach(sprite => {
        sprite.x *= scaleX
        sprite.y *= scaleY
        
        // 确保在边界内
        const margin = sprite.size / 2
        sprite.x = Math.max(margin, Math.min(canvas.width - margin, sprite.x))
        sprite.y = Math.max(margin, Math.min(canvas.height - margin, sprite.y))
      })
    },
    
    initializeVehicleSprites() {
      const displayedVehicles = this.vehicles.slice(0, this.displayLimit)
      
      // ⭐ 根据载具数量和画布面积动态计算载具大小
      const canvasArea = this.garageCanvas.width * this.garageCanvas.height
      const vehicleCount = displayedVehicles.length
      
      // 计算每个载具应占用的平均面积（考虑一定的空隙）
      const avgAreaPerVehicle = canvasArea / (vehicleCount * 1.5) // 1.5是密度系数
      
      // 根据面积计算基础尺寸（正方形假设）
      const baseSize = Math.sqrt(avgAreaPerVehicle)
      
      // ⭐ 设置尺寸范围：最小60px，最大200px，基于计算值动态调整
      const minSize = 60
      const maxSize = 200
      const clampedBaseSize = Math.max(minSize, Math.min(maxSize, baseSize))
      
      // 添加一定的随机变化（±20%）使车库更自然
      const sizeVariation = clampedBaseSize * 0.2
      
      console.log(`🚗 车库载具动态大小:`, {
        vehicleCount,
        canvasArea: `${this.garageCanvas.width}x${this.garageCanvas.height}`,
        calculatedBaseSize: Math.round(baseSize),
        clampedBaseSize: Math.round(clampedBaseSize),
        sizeRange: `${Math.round(clampedBaseSize - sizeVariation)}~${Math.round(clampedBaseSize + sizeVariation)}px`
      })
      
      this.vehicleSprites = displayedVehicles.map(vehicle => {
        const img = new Image()
        
        // ⭐ 动态尺寸：基于计算的基础尺寸 ± 随机变化
        const size = clampedBaseSize - sizeVariation / 2 + Math.random() * sizeVariation
        const safeMargin = size + 20
        
        // ⭐ 确保有足够的空间放置载具
        const maxX = Math.max(safeMargin * 2, this.garageCanvas.width - safeMargin)
        const maxY = Math.max(safeMargin * 2, this.garageCanvas.height - safeMargin)
        
        // ⭐ 根据载具数量动态调整速度（数量越多，速度越慢）
        const baseSpeed = 3
        const speedFactor = Math.max(0.5, 1 - (vehicleCount / 100)) // 100个载具时速度减半
        const adjustedSpeed = baseSpeed * speedFactor
        
        const sprite = {
          ...vehicle,
          img,
          x: safeMargin + Math.random() * (maxX - safeMargin * 2),
          y: safeMargin + Math.random() * (maxY - safeMargin * 2),
          vx: (Math.random() - 0.5) * adjustedSpeed,
          vy: (Math.random() - 0.5) * adjustedSpeed,
          size: size,
          rotation: 0,
          rotationSpeed: 0,
          mass: size / 100,
          radius: 0,
          normRadius: 0.35,
          collisionCooldown: 0,
          // ⭐ 新增：图片加载状态
          imgLoaded: false,
          imgError: false,
          // ⭐ 新增：精确的矩形边界（基于像素检测）
          boundingBox: {
            width: size * 0.7,  // 初始估计
            height: size * 0.5  // 初始估计
          }
        }
        
        // ⭐ 计算初始碰撞半径（向后兼容）
        sprite.radius = Math.max(12, sprite.size * 0.35 + 2)
        
        // ⭐ 设置图片加载事件处理
        img.onload = () => {
          sprite.imgLoaded = true
          sprite.imgError = false
          // ⭐ 图片加载完成后，异步细化边界
          this.refineBoundingBoxFromImage(sprite)
        }
        
        img.onerror = () => {
          sprite.imgLoaded = false
          sprite.imgError = true
          console.error(`载具图片加载失败: ${vehicle.name || vehicle.id}`)
        }
        
        // ⭐ 最后设置 src，触发加载
        img.src = vehicle.imageData
        
        return sprite
      })
    },
    
    animateGarage() {
      if (!this.garageCtx) return
      
      // 清空画布（改用浅蓝色背景）
      this.garageCtx.fillStyle = '#E8F4F8'
      this.garageCtx.fillRect(0, 0, this.garageCanvas.width, this.garageCanvas.height)
      
      // ⭐ 更新所有载具位置
      this.vehicleSprites.forEach(sprite => {
        // 更新位置
        sprite.x += sprite.vx
        sprite.y += sprite.vy
        
        // ⭐ 使用精确的矩形边界检测（像素级精准）
        const halfWidth = sprite.boundingBox.width / 2
        const halfHeight = sprite.boundingBox.height / 2
        const safeMargin = 2  // 极小的边距，贴合边界
        
        // 左右边界（使用矩形宽度）
        if (sprite.x - halfWidth < safeMargin) {
          sprite.x = safeMargin + halfWidth
          sprite.vx = Math.abs(sprite.vx) * 0.9
        } else if (sprite.x + halfWidth > this.garageCanvas.width - safeMargin) {
          sprite.x = this.garageCanvas.width - safeMargin - halfWidth
          sprite.vx = -Math.abs(sprite.vx) * 0.9
        }
        
        // 上下边界（使用矩形高度）
        if (sprite.y - halfHeight < safeMargin) {
          sprite.y = safeMargin + halfHeight
          sprite.vy = Math.abs(sprite.vy) * 0.9
        } else if (sprite.y + halfHeight > this.garageCanvas.height - safeMargin) {
          sprite.y = this.garageCanvas.height - safeMargin - halfHeight
          sprite.vy = -Math.abs(sprite.vy) * 0.9
        }
        
        // ⭐ 减少碰撞冷却
        if (sprite.collisionCooldown > 0) {
          sprite.collisionCooldown--
        }
      })
      
      // ⭐ 🎢 碰碰车效果：处理载具之间的碰撞
      this.handleCollisions()
      
      // ⭐ 绘制每个载具
      this.vehicleSprites.forEach(sprite => {
        this.garageCtx.save()
        this.garageCtx.translate(sprite.x, sprite.y)
        
        // ⭐ 悬停/选中的蓝色光晕效果（增强版）
        if (sprite === this.hoveredVehicle || sprite === this.selectedVehicle) {
          this.garageCtx.shadowColor = 'rgba(102, 126, 234, 0.9)'
          this.garageCtx.shadowBlur = 30  // 增强光晕
          this.garageCtx.shadowOffsetX = 0
          this.garageCtx.shadowOffsetY = 0
          
          // ⭐ 悬停时轻微放大效果
          if (sprite === this.hoveredVehicle) {
            this.garageCtx.scale(1.08, 1.08)  // 放大8%
          }
        }
        
        // ⭐ 碰撞时的红色闪烁效果
        if (sprite.collisionCooldown > 0) {
          this.garageCtx.shadowColor = 'rgba(255, 100, 100, 0.6)'
          this.garageCtx.shadowBlur = 20
        }
        
        // ⭐ 绘制载具（保持原始宽高比，不旋转）
        // ⭐ 修复：只有当图片真正加载完成时才绘制
        if (sprite.imgLoaded && sprite.img.complete && sprite.img.naturalWidth > 0 && sprite.img.naturalHeight > 0) {
          const aspectRatio = sprite.img.naturalWidth / sprite.img.naturalHeight
          let drawWidth, drawHeight
          
          if (aspectRatio > 1) {
            // 宽度大于高度（横向）
            drawWidth = sprite.size
            drawHeight = sprite.size / aspectRatio
          } else {
            // 高度大于宽度（纵向）
            drawHeight = sprite.size
            drawWidth = sprite.size * aspectRatio
          }
          
          this.garageCtx.drawImage(sprite.img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
        } else if (!sprite.imgError) {
          // ⭐ 图片正在加载中，显示占位符（灰色矩形）
          this.garageCtx.fillStyle = 'rgba(200, 200, 200, 0.5)'
          this.garageCtx.fillRect(-sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size)
          
          // ⭐ 显示加载提示文字
          this.garageCtx.fillStyle = 'rgba(100, 100, 100, 0.7)'
          this.garageCtx.font = '12px Arial'
          this.garageCtx.textAlign = 'center'
          this.garageCtx.textBaseline = 'middle'
          this.garageCtx.fillText('加载中...', 0, 0)
        } else {
          // ⭐ 图片加载失败，显示错误占位符
          this.garageCtx.fillStyle = 'rgba(255, 100, 100, 0.3)'
          this.garageCtx.fillRect(-sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size)
          
          this.garageCtx.strokeStyle = 'rgba(255, 100, 100, 0.6)'
          this.garageCtx.lineWidth = 2
          this.garageCtx.strokeRect(-sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size)
        }
        this.garageCtx.restore()
        
        // ⭐ 调试：绘制精确的矩形边界（主题色）
        if (this.debugShowBounds && sprite.boundingBox) {
          this.garageCtx.save()
          this.garageCtx.shadowBlur = 0 // 清除阴影
          this.garageCtx.strokeStyle = 'rgba(102, 126, 234, 0.9)' // 主题色 #667eea
          this.garageCtx.lineWidth = 2
          const halfWidth = sprite.boundingBox.width / 2
          const halfHeight = sprite.boundingBox.height / 2
          this.garageCtx.strokeRect(
            sprite.x - halfWidth,
            sprite.y - halfHeight,
            sprite.boundingBox.width,
            sprite.boundingBox.height
          )
          // 绘制中心点
          this.garageCtx.fillStyle = 'rgba(255, 100, 100, 0.8)'
          this.garageCtx.beginPath()
          this.garageCtx.arc(sprite.x, sprite.y, 3, 0, Math.PI * 2)
          this.garageCtx.fill()
          this.garageCtx.restore()
        }
      })
      
      this.garageAnimationId = requestAnimationFrame(this.animateGarage)
    },
    
    handleCanvasClick(e) {
      const rect = this.garageCanvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // ⭐ 使用精确的矩形碰撞检测
      let clicked = false
      for (const sprite of this.vehicleSprites) {
        const halfWidth = sprite.boundingBox.width / 2 + 15  // 增加到 +15px 提高点击容错
        const halfHeight = sprite.boundingBox.height / 2 + 15
        
        // 检查点击是否在矩形内
        if (Math.abs(x - sprite.x) <= halfWidth && Math.abs(y - sprite.y) <= halfHeight) {
          this.selectVehicle(sprite)
          clicked = true
          break
        }
      }
      
      // ⭐ 💥 优化冲击波触发逻辑：
      // 1. 如果点击到载具，不触发冲击波
      // 2. 如果鼠标正悬停在载具上，也不触发冲击波（防止误触）
      // 3. 只有明确点击空白区域时才触发
      if (!clicked && !this.hoveredVehicle) {
        this.applyRadialImpulse(x, y, { radius: 220, strength: 5 })
      }
    },
    
    // ⭐ 处理鼠标移动（悬停效果）
    handleCanvasMouseMove(e) {
      const rect = this.garageCanvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // ⭐ 使用精确的矩形检测（与点击检测保持一致的容错范围）
      let foundHover = false
      for (const sprite of this.vehicleSprites) {
        const halfWidth = sprite.boundingBox.width / 2 + 15  // 与点击检测保持一致
        const halfHeight = sprite.boundingBox.height / 2 + 15
        
        // 检查鼠标是否在矩形内
        if (Math.abs(x - sprite.x) <= halfWidth && Math.abs(y - sprite.y) <= halfHeight) {
          this.hoveredVehicle = sprite
          this.garageCanvas.style.cursor = 'pointer'
          foundHover = true
          break
        }
      }
      
      if (!foundHover) {
        this.hoveredVehicle = null
        this.garageCanvas.style.cursor = 'default'
      }
    },
    
    selectVehicle(vehicle) {
      console.log('选中载具:', vehicle.name)
      this.selectedVehicle = vehicle
      
      // ⭐ 在预览画布中绘制载具
      this.$nextTick(() => {
        const canvas = this.$refs.previewCanvas
        if (canvas) {
          const ctx = canvas.getContext('2d')
          canvas.width = 240  // 缩小尺寸
          canvas.height = 240
          
          // 清空画布
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // 绘制载具图片
          const img = new Image()
          img.src = vehicle.imageData
          img.onload = () => {
            // 居中绘制，保持比例
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9
            const x = (canvas.width - img.width * scale) / 2
            const y = (canvas.height - img.height * scale) / 2
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
          }
          img.onerror = () => {
            console.error('载具图片加载失败')
          }
        }
      })
    },
    
    selectVehicleInRank(vehicle) {
      // ⭐ 从vehicles数组中找到对应的载具，确保引用一致
      const originalVehicle = this.vehicles.find(v => v.id === vehicle.id)
      if (originalVehicle) {
        this.selectVehicle(originalVehicle)
      } else {
        this.selectVehicle(vehicle)
      }
    },
    
    closeModal() {
      this.selectedVehicle = null
    },
    
    async voteVehicle(type) {
      if (!this.selectedVehicle) return
      
      try {
        const vehicleId = this.selectedVehicle.id
        // ⭐ 发送设备ID用于匿名用户识别
        const response = await apiVoteVehicle(vehicleId, type, this.deviceId)
        
        // ⭐ 调试：打印完整的响应数据
        console.log('🔍 投票API响应:', response)
        console.log('🔍 response.data:', response.data)
        
        // ⭐ 关键修复：响应拦截器已经返回了response.data，所以这里直接用response
        if (response && response.data) {
          const updatedVehicle = response.data
          
          // 1. 实时更新vehicles数组中的数据（使用$set确保响应式）
          const vehicleIndex = this.vehicles.findIndex(v => v.id === vehicleId)
          if (vehicleIndex !== -1) {
            // ⭐ 使用$set确保Vue能检测到变化
            const vehicle = this.vehicles[vehicleIndex]
            this.$set(vehicle, 'likes', updatedVehicle.likes)
            this.$set(vehicle, 'dislikes', updatedVehicle.dislikes)
            this.$set(vehicle, 'score', updatedVehicle.score)
            this.$set(vehicle, 'userVoteStatus', updatedVehicle.userVoteStatus)
            
            // 2. 立即更新selectedVehicle（如果是同一个载具）
            if (this.selectedVehicle.id === vehicleId) {
              this.$set(this.selectedVehicle, 'likes', updatedVehicle.likes)
              this.$set(this.selectedVehicle, 'dislikes', updatedVehicle.dislikes)
              this.$set(this.selectedVehicle, 'score', updatedVehicle.score)
              this.$set(this.selectedVehicle, 'userVoteStatus', updatedVehicle.userVoteStatus)
            }
          }
          
          // 3. 更新车库中的vehicleSprites数据（如果在车库页面）
          if (this.currentScreen === 'garage') {
            // ⭐ 找到对应的sprite并更新其数据属性，保留物理属性（位置、速度等）
            const sprite = this.vehicleSprites.find(s => s.id === vehicleId)
            if (sprite) {
              this.$set(sprite, 'likes', updatedVehicle.likes)
              this.$set(sprite, 'dislikes', updatedVehicle.dislikes)
              this.$set(sprite, 'score', updatedVehicle.score)
              this.$set(sprite, 'userVoteStatus', updatedVehicle.userVoteStatus)
            }
          }
          
          // 4. 实时更新排行榜数据（必须在$nextTick之后调用）
          this.$nextTick(() => {
            this.updateRankList()
            
            // 5. 重新渲染排行榜canvas（如果在排行榜页面）
            if (this.currentScreen === 'rank') {
              this.renderRankPreviews()
            }
          })
          
          console.log('✅ 投票数据已实时更新:', {
            vehicleId,
            likes: updatedVehicle.likes,
            dislikes: updatedVehicle.dislikes,
            score: updatedVehicle.score,
            userVoteStatus: updatedVehicle.userVoteStatus
          })
        }
        
        this.$message.success(response.message || (type === 'like' ? '点赞成功！' : '已记录'))
      } catch (error) {
        console.error('投票失败:', error)
        this.$message.error('投票失败，请稍后重试')
      }
    },
    
    reportVehicle() {
      this.$message.warning('举报功能待实现')
    },
    
    updateRankList() {
      this.rankedVehicles = [...this.vehicles].sort((a, b) => b.score - a.score)
      
      // ⭐ 渲染排行榜中的载具图片
      this.$nextTick(() => {
        this.renderRankPreviews()
      })
    },
    
    // ⭐ 渲染排行榜预览图
    renderRankPreviews() {
      this.rankedVehicles.forEach(vehicle => {
        const canvasRef = `rankCanvas${vehicle.id}`
        const canvas = this.$refs[canvasRef]
        
        if (canvas) {
          // 动态ref返回的可能是数组
          const canvasElement = Array.isArray(canvas) ? canvas[0] : canvas
          
          if (canvasElement) {
            const ctx = canvasElement.getContext('2d')
            canvasElement.width = 200
            canvasElement.height = 150
            
            // 清空画布
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
            
            // 绘制载具图片
            const img = new Image()
            img.src = vehicle.imageData
            img.onload = () => {
              // 居中绘制，保持比例
              const scale = Math.min(canvasElement.width / img.width, canvasElement.height / img.height) * 0.85
              const x = (canvasElement.width - img.width * scale) / 2
              const y = (canvasElement.height - img.height * scale) / 2
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
            }
          }
        }
      })
    },
    
    sortRank(type) {
      // ⭐ 更新当前排序类型
      this.currentSortType = type
      
      if (type === 'hot') {
        this.rankedVehicles = [...this.vehicles].sort((a, b) => (b.likes + b.dislikes) - (a.likes + a.dislikes))
      } else if (type === 'score') {
        this.rankedVehicles = [...this.vehicles].sort((a, b) => b.score - a.score)
      } else if (type === 'date') {
        this.rankedVehicles = [...this.vehicles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      } else if (type === 'random') {
        this.rankedVehicles = [...this.vehicles].sort(() => Math.random() - 0.5)
      }
      
      // ⭐ 排序后重新渲染图片
      this.$nextTick(() => {
        this.renderRankPreviews()
      })
    },
    
    formatTime(dateString) {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    },
    
    // ⭐ 键盘快捷键：按 'D' 键切换调试边界显示
    handleDebugToggle(e) {
      if (e.key === 'd' || e.key === 'D') {
        this.debugShowBounds = !this.debugShowBounds
        console.log(`调试边界显示: ${this.debugShowBounds ? '已启用' : '已禁用'}`)
        if (this.debugShowBounds) {
          this.$message.info('调试模式已启用 - 可以看到精确的矩形边界')
        }
      }
    },
    
    // ⭐ 处理显示数量变化
    handleDisplayLimitChange() {
      console.log(`🔄 显示数量变更为: ${this.displayLimit}`)
      // 重新初始化车库载具
      if (this.garageCanvas && this.garageCtx) {
        this.initializeVehicleSprites()
        this.$message.success(`已调整为显示 ${Math.min(this.displayLimit, this.vehicles.length)} 辆载具`)
      }
    },
    
    // ⭐ 🎢 碰碰车核心：处理载具之间的碰撞（使用精确矩形碰撞检测）
    handleCollisions() {
      // 遍历所有载具对
      for (let i = 0; i < this.vehicleSprites.length; i++) {
        for (let j = i + 1; j < this.vehicleSprites.length; j++) {
          const v1 = this.vehicleSprites[i]
          const v2 = this.vehicleSprites[j]
          
          // 跳过冷却中的载具（避免重复碰撞）
          if (v1.collisionCooldown > 0 || v2.collisionCooldown > 0) {
            continue
          }
          
          // ⭐ 矩形碰撞检测（AABB - Axis-Aligned Bounding Box）
          const halfWidth1 = v1.boundingBox.width / 2
          const halfHeight1 = v1.boundingBox.height / 2
          const halfWidth2 = v2.boundingBox.width / 2
          const halfHeight2 = v2.boundingBox.height / 2
          
          const dx = v2.x - v1.x
          const dy = v2.y - v1.y
          
          // 计算重叠距离
          const overlapX = halfWidth1 + halfWidth2 - Math.abs(dx)
          const overlapY = halfHeight1 + halfHeight2 - Math.abs(dy)
          
          // 如果两个方向都有重叠，则发生碰撞
          if (overlapX > 0 && overlapY > 0) {
            // 🎯 矩形碰撞响应
            this.resolveRectCollision(v1, v2, dx, dy, overlapX, overlapY)
          }
        }
      }
    },
    
    // ⭐ 🎯 矩形碰撞响应（基于AABB）
    resolveRectCollision(v1, v2, dx, dy, overlapX, overlapY) {
      // 确定碰撞发生在哪个轴（选择重叠较小的轴作为碰撞法向）
      let nx = 0, ny = 0, overlap = 0
      
      if (overlapX < overlapY) {
        // X轴碰撞（左右碰撞）
        nx = dx > 0 ? 1 : -1
        ny = 0
        overlap = overlapX
      } else {
        // Y轴碰撞（上下碰撞）
        nx = 0
        ny = dy > 0 ? 1 : -1
        overlap = overlapY
      }
      
      // 计算相对速度在碰撞法向上的分量
      const dvx = v2.vx - v1.vx
      const dvy = v2.vy - v1.vy
      const dvn = dvx * nx + dvy * ny
      
      // 如果载具正在远离，不处理碰撞
      if (dvn > 0) return
      
      // 计算碰撞冲量（考虑质量）
      const restitution = 0.85 // 恢复系数（0.85表示有少量能量损失）
      const impulse = (2 * dvn) / (v1.mass + v2.mass)
      
      // 应用冲量到两个载具
      v1.vx += impulse * v2.mass * nx * restitution
      v1.vy += impulse * v2.mass * ny * restitution
      v2.vx -= impulse * v1.mass * nx * restitution
      v2.vy -= impulse * v1.mass * ny * restitution
      
      // 分离重叠的载具（避免卡在一起）
      const separation = overlap / 2 + 1  // +1 确保完全分离
      v1.x -= separation * nx
      v1.y -= separation * ny
      v2.x += separation * nx
      v2.y += separation * ny
      
      // 设置碰撞冷却（10帧）
      v1.collisionCooldown = 10
      v2.collisionCooldown = 10
    },
    
    // ⭐ 🎯 真实物理碰撞响应（圆形 - 保留用于向后兼容）
    resolveCollision(v1, v2, dx, dy, distance) {
      // 归一化碰撞方向向量
      const nx = dx / distance
      const ny = dy / distance
      
      // 计算相对速度在碰撞方向上的分量
      const dvx = v2.vx - v1.vx
      const dvy = v2.vy - v1.vy
      const dvn = dvx * nx + dvy * ny
      
      // 如果载具正在远离，不处理碰撞
      if (dvn > 0) return
      
      // 计算碰撞冲量（考虑质量）
      const restitution = 0.85 // 恢复系数（0.85表示有少量能量损失）
      const impulse = (2 * dvn) / (v1.mass + v2.mass)
      
      // 应用冲量到两个载具
      v1.vx += impulse * v2.mass * nx * restitution
      v1.vy += impulse * v2.mass * ny * restitution
      v2.vx -= impulse * v1.mass * nx * restitution
      v2.vy -= impulse * v1.mass * ny * restitution
      
      // 分离重叠的载具（避免卡在一起）
      const overlap = (v1.radius + v2.radius - distance) / 2
      v1.x -= overlap * nx
      v1.y -= overlap * ny
      v2.x += overlap * nx
      v2.y += overlap * ny
      
      // 设置碰撞冷却（10帧）
      v1.collisionCooldown = 10
      v2.collisionCooldown = 10
    },
    
    // ⭐ 💥 在 (x,y) 位置对周围载具施加径向冲击
    applyRadialImpulse(x, y, options = {}) {
      const radius = options.radius || 200
      const strength = options.strength || 5 // 基础强度
      const minKick = 0.8 // 最小踢力
      
      this.vehicleSprites.forEach(v => {
        const dx = (v.x + v.size / 2) - x
        const dy = (v.y + v.size / 2) - y
        const dist = Math.hypot(dx, dy)
        
        if (dist > 0 && dist <= radius) {
          const nx = dx / dist
          const ny = dy / dist
          const falloff = 1 - dist / radius // 越近力越大
          // 将冲击强度整体降低为70%
          const impulse = Math.max(minKick * falloff, (strength * 0.7) * falloff)
          v.vx += nx * impulse
          v.vy += ny * impulse
          // 短暂冷却，避免立刻再次碰撞聚在一起
          v.collisionCooldown = Math.max(v.collisionCooldown, 6)
        }
      })
    },
    
    // ⭐ 从笔画数据绘制载具（不变形）
    drawVehicleFromStrokes(sprite, offsetX, offsetY) {
      const strokes = sprite.drawingData.strokes
      const originalWidth = sprite.drawingData.width || 600
      const originalHeight = sprite.drawingData.height || 400
      
      // 计算缩放比例
      const targetSize = sprite.size
      const scaleX = targetSize / originalWidth
      const scaleY = targetSize / originalHeight
      const finalScale = Math.min(scaleX, scaleY) * 0.9
      
      this.garageCtx.save()
      this.garageCtx.scale(finalScale, finalScale)
      this.garageCtx.translate(-originalWidth / 2 + offsetX / finalScale, -originalHeight / 2 + offsetY / finalScale)
      
      // 绘制所有笔画
      strokes.forEach(stroke => {
        if (stroke.length === 0) return
        
        // 绘制第一个点
        if (stroke.length > 0) {
          const pointSize = (stroke[0].size || 5) * 0.8
          this.garageCtx.beginPath()
          this.garageCtx.arc(stroke[0].x, stroke[0].y, pointSize / 2, 0, Math.PI * 2)
          this.garageCtx.fillStyle = stroke[0].color || '#000000'
          this.garageCtx.fill()
        }
        
        // 绘制线条
        if (stroke.length > 1) {
          this.garageCtx.beginPath()
          this.garageCtx.moveTo(stroke[0].x, stroke[0].y)
          
          for (let i = 1; i < stroke.length; i++) {
            this.garageCtx.lineTo(stroke[i].x, stroke[i].y)
          }
          
          this.garageCtx.strokeStyle = stroke[0].color || '#000000'
          this.garageCtx.lineWidth = Math.max(0.7, (stroke[0].size || 5) * 0.8)
          this.garageCtx.lineCap = 'round'
          this.garageCtx.lineJoin = 'round'
          this.garageCtx.stroke()
        }
      })
      
      this.garageCtx.restore()
    },
    
    // ⭐ 使用 imageData 进行像素级边界细化，得到精确的矩形边界
    refineBoundingBoxFromImage(vehicle) {
      try {
        const dataUrl = vehicle?.imageData
        if (!dataUrl) return
        
        const img = new Image()
        img.onload = () => {
          const off = document.createElement('canvas')
          off.width = img.width
          off.height = img.height
          const octx = off.getContext('2d')
          octx.drawImage(img, 0, 0)
          
          const { width, height } = off
          const imgData = octx.getImageData(0, 0, width, height).data
          
          let minX = width, minY = height, maxX = -1, maxY = -1
          
          // ⭐ 逐像素扫描，找到实际绘制内容的边界
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4
              const r = imgData[idx]
              const g = imgData[idx + 1]
              const b = imgData[idx + 2]
              const a = imgData[idx + 3]
              
              // 认为非背景：alpha>10 或 与纯白差异较大
              const notWhite = (Math.abs(r - 255) + Math.abs(g - 255) + Math.abs(b - 255)) > 30
              if (a > 10 && notWhite) {
                if (x < minX) minX = x
                if (y < minY) minY = y
                if (x > maxX) maxX = x
                if (y > maxY) maxY = y
              }
            }
          }
          
          if (maxX >= minX && maxY >= minY) {
            // ⭐ 计算实际内容的宽高（像素级精确）
            const contentWidth = Math.max(1, maxX - minX + 1)
            const contentHeight = Math.max(1, maxY - minY + 1)
            
            // ⭐ 使用与绘制时相同的宽高比计算逻辑
            const aspectRatio = width / height
            let drawWidth, drawHeight
            
            if (aspectRatio > 1) {
              // 宽度大于高度（横向）
              drawWidth = vehicle.size
              drawHeight = vehicle.size / aspectRatio
            } else {
              // 高度大于宽度（纵向）
              drawHeight = vehicle.size
              drawWidth = vehicle.size * aspectRatio
            }
            
            // ⭐ 计算内容在整个图像中的占比
            const contentRatioW = contentWidth / width
            const contentRatioH = contentHeight / height
            
            // ⭐ 更新精确的矩形边界（基于实际绘制尺寸）
            vehicle.boundingBox = {
              width: drawWidth * contentRatioW * 0.95,   // 略微缩小5%，避免误判
              height: drawHeight * contentRatioH * 0.95
            }
            
            // ⭐ 同时更新半径（向后兼容，用于径向冲击等效果）
            const halfDiag = 0.5 * Math.hypot(vehicle.boundingBox.width, vehicle.boundingBox.height)
            vehicle.radius = Math.max(10, halfDiag)
            
            console.log(`载具 ${vehicle.name} 的精确边界: ${Math.round(vehicle.boundingBox.width)}x${Math.round(vehicle.boundingBox.height)}px (原始: ${width}x${height}, 宽高比: ${aspectRatio.toFixed(2)})`)
          }
        }
        img.src = dataUrl
      } catch (error) {
        // 忽略错误，保持初始边界
        console.warn('Failed to refine bounding box from image:', error)
      }
    }
  }
}
</script>

<style scoped>
.draw-car-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: #ffffff;
  overflow-y: auto;
}

/* 屏幕切换 */
.screen {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 欢迎界面 */
.welcome-container {
  text-align: center;
  background: #ffffff;
  padding: 60px 80px;
  border-radius: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #e9ecef;
}

.title {
  font-size: 4em;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.5em;
  color: #666;
  margin-bottom: 40px;
}

.intro {
  margin: 30px 0;
  font-size: 1.2em;
  color: #555;
  line-height: 2;
}

.intro p {
  margin: 10px 0;
}

/* 按钮样式 */
.btn-primary, .btn-secondary, .btn-tool, .btn-back {
  padding: 15px 40px;
  font-size: 1.2em;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  margin: 10px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

/* ====================================== */
/* 绘画界面 - 全新设计 */
/* ====================================== */

.draw-container-new {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
  padding-top: 60px; /* ⭐ 为顶部导航栏留出空间 */
  box-sizing: border-box;
}

/* 顶部标题栏 */
.draw-header-new {
  background: rgba(255, 255, 255, 0.98);
  padding: 12px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
  z-index: 10;
}

.header-left, .header-right {
  flex: 0 0 200px;
}

.header-center {
  flex: 1;
  text-align: center;
}

.draw-title {
  font-size: 1.5em;
  color: #667eea;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.draw-subtitle {
  font-size: 0.85em;
  color: #888;
  margin: 2px 0 0 0;
}

.btn-back-new,
.btn-submit-new {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.btn-back-new {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-back-new:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-submit-new {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-submit-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

/* 工具栏 */
.draw-toolbar {
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 30px;
  display: flex;
  gap: 20px;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
  overflow-x: auto;
  z-index: 9;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 2px solid #e9ecef;
  transition: all 0.3s ease;
}

.toolbar-section:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #495057;
  white-space: nowrap;
}

.section-icon {
  font-size: 1.1em;
}

.section-label {
  font-size: 0.9em;
}

/* 颜色选择区 */
.color-section {
  flex-shrink: 0;
}

.color-palette-new {
  display: flex;
  gap: 6px;
}

.color-item {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.25s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

.color-item:hover {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.color-item.active {
  border-color: #fff;
  box-shadow: 0 0 0 3px #667eea, 0 4px 12px rgba(102, 126, 234, 0.4);
  transform: scale(1.15);
}

.check-mark {
  color: white;
  font-size: 1.2em;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 画笔设置区 */
.brush-section {
  flex: 0 0 auto;
}

.brush-controls {
  display: flex;
  gap: 15px;
}

.brush-size-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-size: 0.9em;
  color: #6c757d;
  white-space: nowrap;
}

.size-slider-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.size-slider {
  width: 120px;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #667eea, #764ba2);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 2px solid #667eea;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.size-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
}

.size-preview {
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.size-value {
  font-size: 0.9em;
  font-weight: 600;
  color: #667eea;
  min-width: 45px;
  text-align: right;
}

/* 操作按钮区 */
.actions-section {
  flex-shrink: 0;
}

.action-btns {
  display: flex;
  gap: 10px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  background: white;
  color: #495057;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.tool-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(102, 126, 234, 0.3);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1.1em;
}

.btn-label {
  font-size: 0.95em;
}

/* 统计信息区 */
.stats-section {
  flex: 1;
  justify-content: flex-start;
  min-width: 180px;
}

.canvas-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.8em;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.1em;
  font-weight: 700;
  color: #667eea;
}

/* 画布区域 */
.draw-canvas-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px 20px;
  overflow: auto; /* ⭐ 改为auto，允许滚动 */
  min-height: 0;
}

.canvas-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  max-width: 100%;
  max-height: 100%;
}

.canvas-frame {
  background: white;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  max-width: 95%; /* ⭐ 限制最大宽度 */
}

.canvas-frame:hover {
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.canvas-frame canvas {
  display: block;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: crosshair;
  background: #fafafa;
  background-image: 
    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  transition: border-color 0.3s ease;
  max-width: 100%; /* ⭐ 确保不超出容器 */
  max-height: calc(100vh - 280px); /* ⭐ 限制最大高度 */
}

.canvas-frame canvas:hover {
  border-color: #667eea;
}

.canvas-hint {
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 16px;
  border-radius: 16px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
}

.canvas-hint p {
  margin: 0;
  color: #6c757d;
  font-size: 0.9em;
  font-weight: 500;
}

.canvas-hint .hint-mobile {
  display: none;
}

.canvas-hint .hint-desktop {
  display: block;
}

/* 车库界面 */
.garage-container {
  width: 100%;
  height: calc(100vh - 60px); /* ⭐ 减去顶部导航栏高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* ⭐ 防止内容溢出 */
}

.garage-header {
  background: rgba(255, 255, 255, 0.98);
  padding: 15px 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  flex-shrink: 0; /* ⭐ 防止header被压缩 */
  z-index: 10; /* ⭐ 确保在canvas之上 */
}

.garage-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.garage-title {
  font-size: 1.8em;
  color: #667eea;
  margin: 0;
  font-weight: 600;
}

.garage-header-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.vehicle-count {
  color: #666;
  font-size: 1em;
  margin: 0;
}

.vehicle-count span {
  font-weight: 600;
  color: #667eea;
}

.display-limit-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 0.95em;
}

.display-limit-select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 0.95em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.display-limit-select:hover {
  border-color: #667eea;
}

.display-limit-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.canvas-garage-container {
  flex: 1;
  position: relative;
  overflow: hidden; /* ⭐ 防止canvas溢出 */
  min-height: 0; /* ⭐ 关键：允许flex子元素缩小 */
}

.canvas-garage-container canvas {
  width: 100%;
  height: 100%;
  display: block; /* ⭐ 移除canvas默认的inline间隙 */
}

.garage-controls {
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  text-align: center;
}

.control-hint {
  color: #888;
  font-size: 1.1em;
}

/* 载具信息弹窗 - 简洁版 */
.vehicle-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 0;
  max-width: 380px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.modal-close:hover {
  background: #f5f5f5;
  color: #333;
  transform: scale(1.1);
}

.modal-header {
  background: #667eea;
  padding: 16px 20px;
  text-align: center;
}

.modal-title {
  color: white;
  font-size: 1.2em;
  margin: 0;
  font-weight: 600;
}

.modal-body {
  padding: 20px;
}

.modal-vehicle-preview {
  text-align: center;
  margin-bottom: 16px;
}

.modal-vehicle-preview canvas {
  width: 240px;
  height: 240px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: #f8f9fa;
}

.modal-info-section {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid #e9ecef;
}

.info-label {
  font-size: 0.9em;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 0.95em;
  color: #333;
  font-weight: 600;
}

.score-value.positive {
  color: #52c41a;
}

.score-value.negative {
  color: #ff4d4f;
}

.modal-footer {
  background: white;
  padding: 16px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.vote-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 10px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1em;
  font-weight: 600;
  color: #666;
}

.vote-btn:hover {
  border-color: #667eea;
  background: #f8f9fa;
  transform: translateY(-2px);
}

.vote-btn:active {
  transform: translateY(0);
}

/* ⭐ 已投票按钮的高亮样式 */
.vote-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.vote-btn.active .vote-icon {
  animation: pulse 0.5s ease;
}

.vote-btn.active .vote-count {
  color: white;
}

.vote-btn.like-btn.active {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  border-color: #4CAF50;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.vote-btn.dislike-btn.active {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  border-color: #f44336;
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.vote-icon {
  font-size: 1.5em;
}

.vote-count {
  font-size: 0.9em;
  color: #333;
  font-weight: 600;
}

.report-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  background: white;
  color: #999;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.2em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-btn:hover {
  border-color: #ff9800;
  color: #ff9800;
  background: #fff7e6;
  transform: translateY(-2px);
}

/* 排行榜界面 */
.rank-container {
  width: 100%;
  max-width: 1400px;
  background: #ffffff;
  border-radius: 20px;
  padding: 40px;
  margin: 20px;
  min-height: 80vh;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.rank-header {
  text-align: center;
  margin-bottom: 30px;
}

.rank-header h2 {
  font-size: 2.5em;
  color: #667eea;
  margin-bottom: 10px;
}

.rank-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
}

/* 排行榜导航按钮组 */
.rank-nav-group {
  display: flex;
  gap: 10px;
}

/* 排行榜按钮样式 */
.rank-btn {
  padding: 8px 16px;
  font-size: 0.9em;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.rank-btn-back {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.rank-btn-back:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.rank-btn-secondary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.rank-btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5);
}

/* 排序按钮组 */
.rank-sort-group {
  display: flex;
  gap: 8px;
  background: #f8f9fa;
  padding: 4px;
  border-radius: 10px;
}

.rank-sort-btn {
  padding: 6px 14px;
  font-size: 0.85em;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  background: transparent;
  color: #666;
}

.rank-sort-btn:hover {
  background: white;
  color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rank-sort-btn.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
  font-weight: 600;
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.rank-item {
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.rank-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.rank-number {
  position: absolute;
  top: 10px;
  left: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 1.2em;
}

.rank-preview {
  width: 100%;
  height: 150px;
  border-radius: 10px;
  margin-bottom: 15px;
}

.rank-info {
  text-align: center;
}

.rank-name {
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.rank-score {
  color: #888;
  font-size: 0.9em;
}

.modal-hint {
  color: #888;
  text-align: center;
  margin-bottom: 20px;
}

/* ⭐ 名称检测提示样式 */
.name-check-message {
  margin-top: 12px;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.name-check-message.available {
  background-color: #f0f9ff;
  color: #0c63e4;
  border: 1px solid #b3d9ff;
}

.name-check-message.available i {
  color: #28a745;
  font-size: 16px;
}

.name-check-message.taken {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffd700;
}

.name-check-message.taken i {
  color: #ff9800;
  font-size: 16px;
}

/* ========================================= */
/* 移动端响应式设计 */
/* ========================================= */

/* 平板及以下设备 (≤768px) */
@media (max-width: 768px) {
  /* 绘画界面标题栏 */
  .draw-header-new {
    padding: 8px 12px;
    flex-wrap: wrap;
  }
  
  .header-left, .header-right {
    flex: 0 0 auto;
  }
  
  .header-center {
    flex: 1;
    min-width: 0;
  }
  
  .draw-title {
    font-size: 1.1em;
  }
  
  .draw-subtitle {
    font-size: 0.75em;
    display: none; /* 在小屏幕上隐藏副标题 */
  }
  
  .btn-back-new,
  .btn-submit-new {
    padding: 6px 12px;
    font-size: 0.85em;
    gap: 4px;
  }
  
  .btn-back-new .icon,
  .btn-submit-new .icon {
    font-size: 1em;
  }
  
  /* 工具栏 */
  .draw-toolbar {
    padding: 8px 12px;
    gap: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .toolbar-section {
    padding: 6px 10px;
    gap: 8px;
    flex-shrink: 0;
  }
  
  .section-header {
    gap: 4px;
  }
  
  .section-icon {
    font-size: 1em;
  }
  
  .section-label {
    font-size: 0.8em;
  }
  
  /* 颜色选择 */
  .color-item {
    width: 28px;
    height: 28px;
  }
  
  /* 画笔控制 */
  .brush-size-control {
    gap: 6px;
  }
  
  .control-label {
    font-size: 0.8em;
  }
  
  .size-slider-wrapper {
    gap: 6px;
  }
  
  .size-slider {
    width: 60px;
  }
  
  .size-preview {
    min-width: 16px;
    min-height: 16px;
  }
  
  .size-value {
    font-size: 0.75em;
  }
  
  /* 操作按钮 */
  .tool-btn {
    padding: 6px 10px;
    font-size: 0.8em;
    gap: 4px;
  }
  
  .btn-icon {
    font-size: 1em;
  }
  
  .btn-label {
    font-size: 0.8em;
  }
  
  /* 统计信息 */
  .canvas-stats {
    gap: 8px;
  }
  
  .stat-item {
    gap: 4px;
  }
  
  .stat-label,
  .stat-value {
    font-size: 0.75em;
  }
  
  /* 画布区域 */
  .draw-canvas-area {
    padding: 12px;
  }
  
  .canvas-hint p {
    font-size: 0.8em;
  }
  
  .canvas-hint .hint-desktop {
    display: none;
  }
  
  .canvas-hint .hint-mobile {
    display: block;
  }
  
  /* 欢迎界面 */
  .welcome-container {
    padding: 40px 30px;
    margin: 20px;
  }
  
  .title {
    font-size: 2.5em;
  }
  
  .subtitle {
    font-size: 1.2em;
  }
  
  .intro {
    font-size: 1em;
  }
  
  .btn-primary, .btn-secondary {
    padding: 12px 30px;
    font-size: 1em;
  }
}

/* 手机设备 (≤480px) */
@media (max-width: 480px) {
  /* 容器调整 */
  .draw-container-new {
    padding-top: 60px; /* 确保不被顶部导航遮挡 */
  }
  
  /* 标题栏 - 紧凑设计 */
  .draw-header-new {
    padding: 6px 8px;
    min-height: 50px;
  }
  
  .header-left {
    order: 1;
  }
  
  .header-center {
    order: 3;
    flex: 1 1 100%;
    text-align: center;
    margin-top: 4px;
  }
  
  .header-right {
    order: 2;
  }
  
  .draw-title {
    font-size: 0.95em;
    margin: 0;
  }
  
  .draw-subtitle {
    display: none;
  }
  
  .btn-back-new,
  .btn-submit-new {
    padding: 5px 10px;
    font-size: 0.75em;
    min-width: auto;
  }
  
  .btn-back-new span:last-child,
  .btn-submit-new span:last-child {
    display: none; /* 只显示图标 */
  }
  
  /* ⭐ 工具栏 - 改为两行紧凑网格布局，无需滚动 */
  .draw-toolbar {
    padding: 8px 8px;
    gap: 6px;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    overflow-x: visible; /* 移除横向滚动 */
    -webkit-overflow-scrolling: auto;
  }
  
  /* ⭐ 第一行：颜色选择（占满一行） */
  .toolbar-section.color-section {
    padding: 6px 8px;
    gap: 6px;
    flex-shrink: 1;
    grid-column: 1;
    grid-row: 1;
    border-radius: 8px;
  }
  
  /* ⭐ 第二行：画笔和操作按钮（并排） */
  .toolbar-section.brush-section,
  .toolbar-section.actions-section {
    padding: 6px 8px;
    gap: 6px;
    flex-shrink: 1;
    border-radius: 8px;
  }
  
  .toolbar-section.brush-section {
    grid-column: 1;
    grid-row: 2;
  }
  
  .toolbar-section.actions-section {
    grid-column: 1;
    grid-row: 3;
  }
  
  /* ⭐ 统计信息 - 完全隐藏 */
  .toolbar-section.stats-section {
    display: none;
  }
  
  /* ⭐ 改进布局：横向排列子元素 */
  .toolbar-section {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  .section-header {
    flex-shrink: 0;
    margin-right: 6px;
  }
  
  .section-label {
    display: none; /* 只显示图标 */
  }
  
  .section-icon {
    font-size: 1.1em;
  }
  
  /* 颜色选择 - 紧凑排列 */
  .color-palette-new {
    display: flex;
    gap: 3px;
    flex-wrap: nowrap;
    flex: 1;
    justify-content: space-between;
  }
  
  .color-item {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }
  
  .check-mark {
    font-size: 12px;
  }
  
  /* 画笔控制 - 紧凑横向布局 */
  .brush-controls {
    flex: 1;
    display: flex;
    align-items: center;
  }
  
  .brush-size-control {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .control-label {
    display: none;
  }
  
  .size-slider-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .size-slider {
    flex: 1;
    min-width: 80px;
  }
  
  .size-preview {
    flex-shrink: 0;
  }
  
  .size-value {
    display: none;
  }
  
  /* 操作按钮 - 横向紧凑排列 */
  .action-btns {
    flex: 1;
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  
  .tool-btn {
    padding: 6px 12px;
    font-size: 0.8em;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .btn-icon {
    font-size: 1.1em;
  }
  
  .btn-label {
    font-size: 0.8em;
  }
  
  /* 画布区域 */
  .draw-canvas-area {
    padding: 8px;
    flex: 1;
  }
  
  .canvas-frame {
    border-radius: 8px;
  }
  
  .canvas-hint {
    padding: 4px 12px;
  }
  
  .canvas-hint p {
    font-size: 0.7em;
  }
  
  /* 欢迎界面 */
  .welcome-container {
    padding: 30px 20px;
    margin: 15px;
    border-radius: 20px;
  }
  
  .title {
    font-size: 2em;
    margin-bottom: 15px;
  }
  
  .subtitle {
    font-size: 1em;
    margin-bottom: 25px;
  }
  
  .intro {
    font-size: 0.9em;
    margin: 20px 0;
  }
  
  .intro p {
    margin: 8px 0;
  }
  
  .btn-primary, .btn-secondary {
    padding: 10px 25px;
    font-size: 0.9em;
    margin: 8px;
  }
  
  /* 车库界面 */
  .garage-header {
    padding: 10px 15px;
  }
  
  .garage-title {
    font-size: 1.4em;
  }
  
  .btn-back {
    padding: 8px 16px;
    font-size: 0.9em;
  }
  
  .garage-header-bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .vehicle-count {
    font-size: 0.9em;
  }
  
  .display-limit-label {
    font-size: 0.85em;
  }
  
  .display-limit-select {
    padding: 4px 8px;
    font-size: 0.85em;
  }
  
  /* 排行榜 */
  .rank-container {
    padding: 20px 15px;
    margin: 10px;
  }
  
  .rank-header h2 {
    font-size: 1.8em;
  }
  
  .rank-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .rank-nav-group {
    width: 100%;
    justify-content: center;
  }
  
  .rank-btn {
    font-size: 0.85em;
    padding: 7px 14px;
  }
  
  .rank-sort-group {
    width: 100%;
    justify-content: space-between;
    padding: 3px;
  }
  
  .rank-sort-btn {
    font-size: 0.75em;
    padding: 5px 10px;
  }
  
  .rank-item {
    padding: 12px;
    gap: 12px;
  }
  
  .rank-number {
    width: 30px;
    height: 30px;
    font-size: 1em;
  }
  
  .rank-preview {
    width: 60px;
    height: 60px;
  }
  
  .rank-name {
    font-size: 0.9em;
  }
  
  .rank-score {
    font-size: 0.8em;
  }
  
  /* 载具弹窗 */
  .vehicle-modal {
    padding: 10px;
  }
  
  .modal-content {
    max-width: 95%;
    padding: 20px 15px;
  }
  
  .modal-title {
    font-size: 1.3em;
  }
  
  .modal-vehicle-preview canvas {
    width: 180px;
    height: 180px;
  }
  
  .info-label,
  .info-value {
    font-size: 0.85em;
  }
  
  .vote-btn {
    padding: 10px 20px;
  }
  
  .vote-icon {
    font-size: 1.2em;
  }
}

/* 超小屏幕设备 (≤360px) */
@media (max-width: 360px) {
  .draw-header-new {
    padding: 4px 6px;
  }
  
  .draw-title {
    font-size: 0.85em;
  }
  
  .btn-back-new,
  .btn-submit-new {
    padding: 4px 8px;
    font-size: 0.7em;
  }
  
  /* ⭐ 工具栏进一步压缩 */
  .draw-toolbar {
    padding: 6px 6px;
    gap: 4px;
  }
  
  .toolbar-section {
    padding: 4px 6px;
  }
  
  /* 颜色选择器缩小 */
  .color-item {
    width: 26px;
    height: 26px;
  }
  
  .check-mark {
    font-size: 11px;
  }
  
  /* 画笔滑块缩小 */
  .size-slider {
    min-width: 60px;
  }
  
  /* 操作按钮缩小 */
  .tool-btn {
    padding: 5px 10px;
    font-size: 0.75em;
  }
  
  .btn-icon {
    font-size: 1em;
  }
  
  .btn-label {
    font-size: 0.75em;
  }
  
  .welcome-container {
    padding: 20px 15px;
  }
  
  .title {
    font-size: 1.8em;
  }
  
  .btn-primary, .btn-secondary {
    padding: 8px 20px;
    font-size: 0.85em;
  }
}
</style>


<template>
  <div class="emoji-picker">
    <el-popover
      placement="top-start"
      width="320"
      trigger="click"
      v-model="visible"
      popper-class="emoji-popover"
    >
      <div class="emoji-container">
        <div class="emoji-tabs">
          <div 
            v-for="(category, index) in emojiCategories" 
            :key="index"
            class="emoji-tab"
            :class="{ active: activeTab === index }"
            @click="activeTab = index"
          >
            <span class="tab-icon">{{ category.icon }}</span>
            <span class="tab-name">{{ category.name }}</span>
          </div>
        </div>
        <div class="emoji-content">
          <div class="emoji-grid">
            <span 
              v-for="emoji in emojiCategories[activeTab].emojis" 
              :key="emoji"
              class="emoji-item"
              @click="selectEmoji(emoji)"
              :title="getEmojiName(emoji)"
            >
              {{ emoji }}
            </span>
          </div>
        </div>
      </div>
      <el-button 
        slot="reference" 
        type="text" 
        class="emoji-button"
        :class="{ active: visible }"
      >
        <i class="el-icon-sunny"></i>
        <span>表情</span>
      </el-button>
    </el-popover>
  </div>
</template>

<script>
export default {
  name: 'EmojiPicker',
  data() {
    return {
      visible: false,
      activeTab: 0,
      emojiCategories: [
        {
          name: '笑脸',
          icon: '😀',
          emojis: [
            '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
            '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗',
            '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
            '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝'
          ]
        },
        {
          name: '手势',
          icon: '👍',
          emojis: [
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
            '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
            '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '🦻'
          ]
        },
        {
          name: '动物',
          icon: '🐶',
          emojis: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
            '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦢', '🦅', '🦉'
          ]
        },
        {
          name: '食物',
          icon: '🍎',
          emojis: [
            '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
            '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥒',
            '🥬', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠'
          ]
        },
        {
          name: '活动',
          icon: '⚽',
          emojis: [
            '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
            '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
            '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️'
          ]
        },
        {
          name: '符号',
          icon: '❤️',
          emojis: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
            '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
            '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'
          ]
        }
      ]
    }
  },
  methods: {
    selectEmoji(emoji) {
      this.$emit('emoji-selected', emoji)
      this.visible = false
    },
    getEmojiName(emoji) {
      const emojiNames = {
        '😀': '大笑',
        '😁': '露齿笑',
        '😂': '笑哭',
        '🤣': '满地打滚',
        '😃': '开心',
        '😄': '高兴',
        '😅': '苦笑',
        '😆': '眯眼笑',
        '😉': '眨眼',
        '😊': '微笑',
        '😋': '舔嘴',
        '😎': '酷',
        '😍': '花痴',
        '😘': '飞吻',
        '🥰': '爱心眼',
        '👍': '赞',
        '👎': '踩',
        '👌': 'OK',
        '✌️': '胜利',
        '🤞': '祈祷',
        '👏': '鼓掌',
        '🙏': '祈祷',
        '💪': '肌肉',
        '❤️': '红心',
        '💔': '心碎',
        '💕': '两心',
        '💖': '闪心',
        '💗': '爱心',
        '💘': '丘比特',
        '🐶': '小狗',
        '🐱': '小猫',
        '🍎': '苹果',
        '🍊': '橙子',
        '⚽': '足球',
        '🏀': '篮球'
      }
      return emojiNames[emoji] || emoji
    }
  }
}
</script>

<style scoped>
.emoji-picker {
  display: inline-block;
}

.emoji-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
  color: #606266;
}

.emoji-button:hover {
  background-color: #f5f7fa;
  color: #409EFF;
}

.emoji-button.active {
  background-color: #ecf5ff;
  color: #409EFF;
}

.emoji-button i {
  font-size: 16px;
}

.emoji-button span {
  font-size: 14px;
  font-weight: 500;
}

.emoji-container {
  width: 100%;
}

.emoji-tabs {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 12px;
}

.emoji-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: all 0.3s ease;
}

.emoji-tab:hover {
  background-color: #f5f7fa;
}

.emoji-tab.active {
  background-color: #ecf5ff;
  color: #409EFF;
}

.tab-icon {
  font-size: 16px;
  margin-bottom: 2px;
}

.tab-name {
  font-size: 10px;
  font-weight: 500;
}

.emoji-content {
  max-height: 200px;
  overflow-y: auto;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 4px;
}

.emoji-item {
  font-size: 20px;
  padding: 6px;
  text-align: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
}

.emoji-item:hover {
  background-color: #f5f7fa;
  transform: scale(1.2);
}

/* 自定义滚动条 */
.emoji-content::-webkit-scrollbar {
  width: 6px;
}

.emoji-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.emoji-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.emoji-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

<style>
/* 弹出框样式 */
.emoji-popover {
  padding: 12px !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid #e4e7ed !important;
}

.emoji-popover .el-popover__title {
  display: none;
}
</style> 
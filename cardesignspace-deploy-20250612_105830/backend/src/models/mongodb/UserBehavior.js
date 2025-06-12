const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  behaviors: [{
    type: {
      type: String,
      enum: ['view', 'search', 'favorite', 'download', 'share'],
      required: true
    },
    image_id: String,  // 当行为涉及图片时
    album_id: String,  // 当行为涉及相册时
    keyword: String,   // 当行为是搜索时
    resolution: String, // 当行为是下载时
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  device_info: {
    type: String,  // desktop, mobile, tablet
    browser: String,
    os: String,
    ip: String
  },
  last_active: {
    type: Date,
    default: Date.now
  }
});

// 索引设置
userBehaviorSchema.index({ user_id: 1 });
userBehaviorSchema.index({ 'behaviors.timestamp': -1 });
userBehaviorSchema.index({ last_active: -1 });

const UserBehavior = mongoose.model('UserBehavior', userBehaviorSchema);

module.exports = UserBehavior; 
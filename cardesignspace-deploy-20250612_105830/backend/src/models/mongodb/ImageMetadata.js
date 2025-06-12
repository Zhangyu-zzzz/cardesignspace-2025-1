const mongoose = require('mongoose');

const imageMetadataSchema = new mongoose.Schema({
  image_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  model_id: {
    type: String,
    required: true,
    index: true
  },
  exif_data: {
    camera: String,
    lens: String,
    focal_length: Number,
    aperture: String,
    iso: Number,
    shutter_speed: String,
    taken_at: Date,
    location: {
      lat: Number,
      lng: Number,
      address: String
    }
  },
  colors: [{
    color: String,  // 16进制颜色值
    percentage: Number  // 占比百分比
  }],
  ai_tags: [String],  // AI自动识别的标签
  image_quality_score: Number,  // 图片质量评分 0-10
  featured_score: Number,  // 推荐指数 0-10
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// 索引设置
imageMetadataSchema.index({ image_id: 1 });
imageMetadataSchema.index({ model_id: 1 });
imageMetadataSchema.index({ featured_score: -1 });
imageMetadataSchema.index({ ai_tags: 1 });
imageMetadataSchema.index({ 'colors.color': 1 });

const ImageMetadata = mongoose.model('ImageMetadata', imageMetadataSchema);

module.exports = ImageMetadata; 
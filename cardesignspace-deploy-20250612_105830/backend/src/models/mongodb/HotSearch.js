const mongoose = require('mongoose');

const hotSearchSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  count: {
    type: Number,
    default: 1
  },
  first_search_time: {
    type: Date,
    default: Date.now
  },
  last_search_time: {
    type: Date,
    default: Date.now
  }
});

// 索引设置
hotSearchSchema.index({ count: -1 });
hotSearchSchema.index({ last_search_time: -1 });

const HotSearch = mongoose.model('HotSearch', hotSearchSchema);

module.exports = HotSearch; 
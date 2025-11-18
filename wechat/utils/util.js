// utils/util.js

// 格式化日期
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
};

// 格式化相对时间
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
};

// 获取优化后的图片URL
export const getOptimizedImageUrl = (image, width, height, quality = 'high') => {
  if (!image || !image.url) return '';
  
  const url = image.url;
  
  // 如果是COS URL，可以添加图片处理参数
  if (url.includes('myqcloud.com')) {
    const params = [];
    if (width) params.push(`w/${width}`);
    if (height) params.push(`h/${height}`);
    if (quality) params.push(`q/${quality === 'high' ? 90 : quality === 'medium' ? 75 : 60}`);
    
    if (params.length > 0) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}imageMogr2/${params.join('/')}`;
    }
  }
  
  return url;
};

// 防抖函数
export const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// 节流函数
export const throttle = (func, wait) => {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      func.apply(this, args);
    }
  };
};

// 显示加载提示
export const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title: title,
    mask: true
  });
};

// 隐藏加载提示
export const hideLoading = () => {
  wx.hideLoading();
};

// 显示成功提示
export const showSuccess = (title = '操作成功') => {
  wx.showToast({
    title: title,
    icon: 'success',
    duration: 2000
  });
};

// 显示错误提示
export const showError = (title = '操作失败') => {
  wx.showToast({
    title: title,
    icon: 'none',
    duration: 2000
  });
};

// 确认对话框
export const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

// 预览图片
export const previewImage = (urls, current = 0) => {
  wx.previewImage({
    urls: urls,
    current: typeof current === 'number' ? urls[current] : current
  });
};

// 复制到剪贴板
export const copyToClipboard = (data) => {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: data,
      success: () => {
        showSuccess('已复制到剪贴板');
        resolve();
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// 获取图片信息
export const getImageInfo = (src) => {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: src,
      success: resolve,
      fail: reject
    });
  });
};

// 格式化文件大小
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// 生成唯一ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};


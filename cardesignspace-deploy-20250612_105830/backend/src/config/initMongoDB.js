const mongoose = require('mongoose');
const ImageMetadata = require('../models/mongodb/ImageMetadata');
const UserBehavior = require('../models/mongodb/UserBehavior');
const HotSearch = require('../models/mongodb/HotSearch');
const logger = require('../../utils/logger');

// 初始化MongoDB数据库
const initializeMongoDB = async () => {
  try {
    // 检查连接状态
    if (mongoose.connection.readyState !== 1) {
      logger.error('MongoDB is not connected. Please connect first.');
      return;
    }
    
    // 清空测试数据（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      await Promise.all([
        ImageMetadata.deleteMany({}),
        UserBehavior.deleteMany({}),
        HotSearch.deleteMany({})
      ]);
      
      logger.info('MongoDB collections cleared successfully');
      
      // 添加测试数据
      await seedMongoDBData();
      logger.info('MongoDB development data seeded successfully');
    }
  } catch (error) {
    logger.error('Error initializing MongoDB:', error);
  }
};

// 添加MongoDB测试数据
const seedMongoDBData = async () => {
  // 添加图片元数据
  await ImageMetadata.insertMany([
    {
      image_id: '1', // 对应MySQL中的images表的第一条记录
      model_id: '1', // 对应MySQL中的models表的第一条记录
      exif_data: {
        camera: 'Canon EOS R5',
        lens: 'RF 24-70mm f/2.8L IS USM',
        focal_length: 35,
        aperture: 'f/4.0',
        iso: 200,
        shutter_speed: '1/250',
        taken_at: new Date('2023-03-20T10:30:00Z')
      },
      colors: [
        { color: '#1D2733', percentage: 35 },
        { color: '#F0F0F0', percentage: 25 },
        { color: '#708090', percentage: 20 },
        { color: '#000000', percentage: 15 },
        { color: '#B22222', percentage: 5 }
      ],
      ai_tags: ['汽车', '轿车', '比亚迪', '电动车', '前脸', '白色'],
      image_quality_score: 9.2,
      featured_score: 8.5
    },
    {
      image_id: '2', // 对应MySQL中的images表的第二条记录
      model_id: '1',
      exif_data: {
        camera: 'Sony A7R IV',
        lens: 'Sony FE 24-105mm F4 G OSS',
        focal_length: 50,
        aperture: 'f/5.6',
        iso: 100,
        shutter_speed: '1/200',
        taken_at: new Date('2023-03-20T11:15:00Z')
      },
      colors: [
        { color: '#FFFFFF', percentage: 40 },
        { color: '#1D2733', percentage: 30 },
        { color: '#708090', percentage: 20 },
        { color: '#C0C0C0', percentage: 10 }
      ],
      ai_tags: ['汽车', '轿车', '比亚迪', '电动车', '侧面', '白色', '阳光'],
      image_quality_score: 9.0,
      featured_score: 8.2
    },
    {
      image_id: '3', // 对应MySQL中的images表的第三条记录
      model_id: '1',
      exif_data: {
        camera: 'Nikon Z7 II',
        lens: 'NIKKOR Z 24-70mm f/2.8 S',
        focal_length: 35,
        aperture: 'f/4.0',
        iso: 400,
        shutter_speed: '1/60',
        taken_at: new Date('2023-03-20T14:20:00Z')
      },
      colors: [
        { color: '#1D2733', percentage: 30 },
        { color: '#C0C0C0', percentage: 25 },
        { color: '#8B4513', percentage: 20 },
        { color: '#000000', percentage: 15 },
        { color: '#4682B4', percentage: 10 }
      ],
      ai_tags: ['汽车', '轿车', '比亚迪', '电动车', '内饰', '方向盘', '中控台', '豪华'],
      image_quality_score: 9.5,
      featured_score: 9.0
    },
    {
      image_id: '4', // 对应MySQL中的images表的第四条记录
      model_id: '3',
      exif_data: {
        camera: 'Canon EOS R3',
        lens: 'RF 15-35mm f/2.8L IS USM',
        focal_length: 24,
        aperture: 'f/8.0',
        iso: 100,
        shutter_speed: '1/125',
        taken_at: new Date('2023-04-05T09:45:00Z'),
        location: {
          lat: 31.2304,
          lng: 121.4737,
          address: '上海国际车展'
        }
      },
      colors: [
        { color: '#006400', percentage: 40 },
        { color: '#000000', percentage: 25 },
        { color: '#C0C0C0', percentage: 20 },
        { color: '#FFFFFF', percentage: 15 }
      ],
      ai_tags: ['汽车', 'SUV', '长城', '坦克', '越野车', '前脸', '绿色', '硬派'],
      image_quality_score: 9.3,
      featured_score: 8.8
    }
  ]);
  
  // 添加用户行为数据
  await UserBehavior.insertMany([
    {
      user_id: '1', // 对应MySQL中的users表的admin用户
      behaviors: [
        {
          type: 'view',
          image_id: '1',
          timestamp: new Date('2023-06-10T08:30:00Z')
        },
        {
          type: 'favorite',
          image_id: '3',
          timestamp: new Date('2023-06-10T08:35:00Z')
        },
        {
          type: 'download',
          image_id: '3',
          resolution: 'hd',
          timestamp: new Date('2023-06-10T08:36:00Z')
        },
        {
          type: 'view',
          image_id: '4',
          timestamp: new Date('2023-06-10T08:40:00Z')
        },
        {
          type: 'search',
          keyword: '比亚迪汉',
          timestamp: new Date('2023-06-10T08:45:00Z')
        }
      ],
      device_info: {
        type: 'desktop',
        browser: 'Chrome',
        os: 'Windows'
      },
      last_active: new Date('2023-06-10T08:45:00Z')
    },
    {
      user_id: '2', // 对应MySQL中的users表的test_user用户
      behaviors: [
        {
          type: 'view',
          image_id: '1',
          timestamp: new Date('2023-06-11T14:20:00Z')
        },
        {
          type: 'view',
          image_id: '2',
          timestamp: new Date('2023-06-11T14:25:00Z')
        },
        {
          type: 'search',
          keyword: '长城坦克',
          timestamp: new Date('2023-06-11T14:30:00Z')
        },
        {
          type: 'view',
          image_id: '4',
          timestamp: new Date('2023-06-11T14:35:00Z')
        }
      ],
      device_info: {
        type: 'mobile',
        browser: 'Safari',
        os: 'iOS'
      },
      last_active: new Date('2023-06-11T14:35:00Z')
    }
  ]);
  
  // 添加热搜数据
  await HotSearch.insertMany([
    {
      keyword: '比亚迪汉',
      count: 156,
      first_search_time: new Date('2023-01-15T00:00:00Z'),
      last_search_time: new Date('2023-06-11T18:30:00Z')
    },
    {
      keyword: '坦克500',
      count: 142,
      first_search_time: new Date('2023-03-20T00:00:00Z'),
      last_search_time: new Date('2023-06-11T17:45:00Z')
    },
    {
      keyword: '电动车',
      count: 289,
      first_search_time: new Date('2023-01-01T00:00:00Z'),
      last_search_time: new Date('2023-06-11T19:20:00Z')
    },
    {
      keyword: '内饰',
      count: 210,
      first_search_time: new Date('2023-02-10T00:00:00Z'),
      last_search_time: new Date('2023-06-11T16:10:00Z')
    },
    {
      keyword: '比亚迪',
      count: 325,
      first_search_time: new Date('2023-01-05T00:00:00Z'),
      last_search_time: new Date('2023-06-11T20:05:00Z')
    }
  ]);
};

// 导出初始化函数
module.exports = {
  initializeMongoDB
}; 
const { sequelize } = require('./mysql');
const Brand = require('../models/mysql/Brand');
const Series = require('../models/mysql/Series');
const Model = require('../models/mysql/Model');
const Image = require('../models/mysql/Image');
const Album = require('../models/mysql/Album');
const AlbumImage = require('../models/mysql/AlbumImage');
const User = require('../models/mysql/User');
const UserFavorite = require('../models/mysql/UserFavorite');
const UserDownload = require('../models/mysql/UserDownload');
const Tag = require('../models/mysql/Tag');
const ImageTag = require('../models/mysql/ImageTag');
const logger = require('../../utils/logger');

// 定义模型之间的关系
const setupAssociations = () => {
  // 品牌和车系 (一对多)
  Brand.hasMany(Series, { foreignKey: 'brand_id' });
  Series.belongsTo(Brand, { foreignKey: 'brand_id' });
  
  // 车系和车型 (一对多)
  Series.hasMany(Model, { foreignKey: 'series_id' });
  Model.belongsTo(Series, { foreignKey: 'series_id' });
  
  // 车型和图片 (一对多)
  Model.hasMany(Image, { foreignKey: 'model_id' });
  Image.belongsTo(Model, { foreignKey: 'model_id' });
  
  // 图片和专辑 (多对多)
  Image.belongsToMany(Album, { through: AlbumImage, foreignKey: 'image_id' });
  Album.belongsToMany(Image, { through: AlbumImage, foreignKey: 'album_id' });
  
  // 用户收藏图片 (多对多)
  User.belongsToMany(Image, { through: UserFavorite, foreignKey: 'user_id' });
  Image.belongsToMany(User, { through: UserFavorite, foreignKey: 'image_id' });
  
  // 用户下载图片 (多对多)
  User.belongsToMany(Image, { through: UserDownload, foreignKey: 'user_id' });
  Image.belongsToMany(User, { through: UserDownload, foreignKey: 'image_id' });
  
  // 图片和标签 (多对多)
  Image.belongsToMany(Tag, { through: ImageTag, foreignKey: 'image_id' });
  Tag.belongsToMany(Image, { through: ImageTag, foreignKey: 'tag_id' });
};

// 初始化数据库
const initializeDatabase = async () => {
  try {
    // 设置模型关系
    setupAssociations();
    
    // 同步数据库模型 (force: true 会删除现有表并重新创建)
    // 警告：在生产环境中不要使用 force: true
    await sequelize.sync({ force: process.env.NODE_ENV === 'development' });
    
    logger.info('MySQL database synchronized successfully');
    
    // 如果是开发环境，可以添加一些测试数据
    if (process.env.NODE_ENV === 'development') {
      await seedDevelopmentData();
      logger.info('Development data seeded successfully');
    }
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
};

// 添加开发测试数据
const seedDevelopmentData = async () => {
  // 添加品牌
  const brands = await Brand.bulkCreate([
    {
      name: '比亚迪',
      alias: 'BYD',
      country: '中国',
      logo_url: '/uploads/brands/byd-logo.png',
      description: '比亚迪股份有限公司成立于1995年，是一家主要从事新能源汽车、电池等业务的中国企业。',
      founded_year: 1995,
      sort_order: 100
    },
    {
      name: '长城',
      alias: 'Great Wall',
      country: '中国',
      logo_url: '/uploads/brands/great-wall-logo.png',
      description: '长城汽车股份有限公司成立于1984年，是中国最大的SUV和皮卡制造商。',
      founded_year: 1984,
      sort_order: 90
    },
    {
      name: '吉利',
      alias: 'Geely',
      country: '中国',
      logo_url: '/uploads/brands/geely-logo.png',
      description: '浙江吉利控股集团成立于1986年，是中国领先的汽车制造商之一。',
      founded_year: 1986,
      sort_order: 85
    }
  ]);
  
  // 添加车系
  const series = await Series.bulkCreate([
    {
      brand_id: brands[0].brand_id,
      name: '汉',
      alias: 'Han',
      category: 'sedan',
      description: '比亚迪汉系列是比亚迪的旗舰轿车系列，包括纯电动和插电混动版本。',
      sort_order: 100
    },
    {
      brand_id: brands[0].brand_id,
      name: '唐',
      alias: 'Tang',
      category: 'suv',
      description: '比亚迪唐是一款中型SUV，提供插电混动和纯电动版本。',
      sort_order: 90
    },
    {
      brand_id: brands[1].brand_id,
      name: '坦克',
      alias: 'Tank',
      category: 'suv',
      description: '长城坦克系列是长城汽车的高端越野SUV产品线。',
      sort_order: 95
    }
  ]);
  
  // 添加车型
  const models = await Model.bulkCreate([
    {
      series_id: series[0].series_id,
      name: '汉EV',
      alias: 'Han EV',
      year: 2023,
      body_structure: '轿车',
      engine_type: '纯电动',
      release_date: '2023-01-15',
      price_range: '20.98-30.98万',
      cover_image: '/uploads/models/han-ev-2023.jpg'
    },
    {
      series_id: series[0].series_id,
      name: '汉DM-i',
      alias: 'Han DM-i',
      year: 2023,
      body_structure: '轿车',
      engine_type: '插电混动',
      release_date: '2023-02-20',
      price_range: '21.98-32.98万',
      cover_image: '/uploads/models/han-dm-i-2023.jpg'
    },
    {
      series_id: series[2].series_id,
      name: '坦克500',
      alias: 'Tank 500',
      year: 2023,
      body_structure: 'SUV',
      engine_type: '燃油/混动',
      release_date: '2023-03-10',
      price_range: '33.58-39.58万',
      cover_image: '/uploads/models/tank-500-2023.jpg'
    }
  ]);
  
  // 添加图片
  const images = await Image.bulkCreate([
    {
      model_id: models[0].model_id,
      title: '比亚迪汉EV 2023款 正前方视角',
      description: '比亚迪汉EV 2023款的前脸设计展示了品牌最新的"Dragon Face"设计语言。',
      category: '外观',
      url: '/uploads/images/han-ev-2023-front.jpg',
      medium_url: '/uploads/images/medium/han-ev-2023-front.jpg',
      thumb_url: '/uploads/images/thumb/han-ev-2023-front.jpg',
      hd_url: '/uploads/images/hd/han-ev-2023-front.jpg',
      width: 1920,
      height: 1080,
      size: 2450000,
      sort_order: 100
    },
    {
      model_id: models[0].model_id,
      title: '比亚迪汉EV 2023款 侧面视角',
      description: '流线型的车身设计展现了汉EV优雅的轿跑风格。',
      category: '外观',
      url: '/uploads/images/han-ev-2023-side.jpg',
      medium_url: '/uploads/images/medium/han-ev-2023-side.jpg',
      thumb_url: '/uploads/images/thumb/han-ev-2023-side.jpg',
      hd_url: '/uploads/images/hd/han-ev-2023-side.jpg',
      width: 1920,
      height: 1080,
      size: 2350000,
      sort_order: 90
    },
    {
      model_id: models[0].model_id,
      title: '比亚迪汉EV 2023款 内饰',
      description: '豪华的座舱内饰，采用高品质材料和先进技术。',
      category: '内饰',
      url: '/uploads/images/han-ev-2023-interior.jpg',
      medium_url: '/uploads/images/medium/han-ev-2023-interior.jpg',
      thumb_url: '/uploads/images/thumb/han-ev-2023-interior.jpg',
      hd_url: '/uploads/images/hd/han-ev-2023-interior.jpg',
      width: 1920,
      height: 1080,
      size: 2550000,
      sort_order: 80
    },
    {
      model_id: models[2].model_id,
      title: '长城坦克500 2023款 正前方视角',
      description: '长城坦克500展现了硬朗有力的设计风格，彰显越野实力。',
      category: '外观',
      url: '/uploads/images/tank-500-2023-front.jpg',
      medium_url: '/uploads/images/medium/tank-500-2023-front.jpg',
      thumb_url: '/uploads/images/thumb/tank-500-2023-front.jpg',
      hd_url: '/uploads/images/hd/tank-500-2023-front.jpg',
      width: 1920,
      height: 1080,
      size: 2650000,
      sort_order: 100
    }
  ]);
  
  // 添加相册
  const albums = await Album.bulkCreate([
    {
      title: '2023年上海车展新车',
      description: '2023年上海国际车展上发布的最新国产车型。',
      cover_image: '/uploads/albums/shanghai-auto-show-2023.jpg',
      status: 1,
      sort_order: 100
    },
    {
      title: '新能源之美',
      description: '精选国产新能源汽车的设计之美。',
      cover_image: '/uploads/albums/new-energy-beauty.jpg',
      status: 1,
      sort_order: 90
    }
  ]);
  
  // 添加相册图片关联
  await AlbumImage.bulkCreate([
    { album_id: albums[0].album_id, image_id: images[0].image_id, sort_order: 1 },
    { album_id: albums[0].album_id, image_id: images[3].image_id, sort_order: 2 },
    { album_id: albums[1].album_id, image_id: images[0].image_id, sort_order: 1 },
    { album_id: albums[1].album_id, image_id: images[1].image_id, sort_order: 2 },
    { album_id: albums[1].album_id, image_id: images[2].image_id, sort_order: 3 }
  ]);
  
  // 添加标签
  const tags = await Tag.bulkCreate([
    { name: '电动车', status: 1 },
    { name: '混动', status: 1 },
    { name: 'SUV', status: 1 },
    { name: '轿车', status: 1 },
    { name: '前脸', status: 1 },
    { name: '侧面', status: 1 },
    { name: '内饰', status: 1 }
  ]);
  
  // 添加图片标签关联
  await ImageTag.bulkCreate([
    { image_id: images[0].image_id, tag_id: tags[0].tag_id },
    { image_id: images[0].image_id, tag_id: tags[3].tag_id },
    { image_id: images[0].image_id, tag_id: tags[4].tag_id },
    { image_id: images[1].image_id, tag_id: tags[0].tag_id },
    { image_id: images[1].image_id, tag_id: tags[3].tag_id },
    { image_id: images[1].image_id, tag_id: tags[5].tag_id },
    { image_id: images[2].image_id, tag_id: tags[0].tag_id },
    { image_id: images[2].image_id, tag_id: tags[3].tag_id },
    { image_id: images[2].image_id, tag_id: tags[6].tag_id },
    { image_id: images[3].image_id, tag_id: tags[2].tag_id },
    { image_id: images[3].image_id, tag_id: tags[4].tag_id }
  ]);
  
  // 添加用户
  await User.bulkCreate([
    {
      username: 'admin',
      email: 'admin@example.com',
      password: '$2a$12$q5H9s1qChEVhmWv.M3iY0eMDZk2QTUhFmngDDo2hGKSYw34Lgr1jS', // "password"
      full_name: '系统管理员',
      role: 'admin',
      membership_level: 2,
      status: 1
    },
    {
      username: 'test_user',
      email: 'user@example.com',
      password: '$2a$12$q5H9s1qChEVhmWv.M3iY0eMDZk2QTUhFmngDDo2hGKSYw34Lgr1jS', // "password"
      full_name: '测试用户',
      role: 'user',
      membership_level: 0,
      status: 1
    }
  ]);
};

// 导出初始化函数
module.exports = {
  initializeDatabase
}; 
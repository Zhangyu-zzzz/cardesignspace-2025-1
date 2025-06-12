const Brand = require('./Brand');
const Model = require('./Model');
const Image = require('./Image');
const Series = require('./Series');
const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const PostLike = require('./PostLike');
const Notification = require('./Notification');
const PostFavorite = require('./PostFavorite');

// 设置模型之间的关联关系，避免循环引用问题

// 品牌和车型的关联
Brand.hasMany(Model, { foreignKey: 'brandId', as: 'Models' });
Model.belongsTo(Brand, { foreignKey: 'brandId' });

// 车型和图片的关联
Model.hasMany(Image, { foreignKey: 'modelId', as: 'Images' });
Image.belongsTo(Model, { foreignKey: 'modelId' });

// 用户和图片的关联
User.hasMany(Image, { foreignKey: 'userId', as: 'Images' });
Image.belongsTo(User, { foreignKey: 'userId' });

// 品牌和车系的关联（如果需要）
Brand.hasMany(Series, { foreignKey: 'brandId', as: 'Series' });
Series.belongsTo(Brand, { foreignKey: 'brandId' });

// === 论坛模型关联 ===

// 用户和帖子的关联
User.hasMany(Post, { foreignKey: 'userId', as: 'Posts' });
Post.belongsTo(User, { foreignKey: 'userId' });

// 帖子和评论的关联
Post.hasMany(Comment, { foreignKey: 'postId', as: 'Comments' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

// 用户和评论的关联
User.hasMany(Comment, { foreignKey: 'userId', as: 'Comments' });
Comment.belongsTo(User, { foreignKey: 'userId' });

// 评论的自关联（回复功能）
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'Replies' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'Parent' });

// 用户和点赞的关联
User.hasMany(PostLike, { foreignKey: 'userId', as: 'PostLikes' });
PostLike.belongsTo(User, { foreignKey: 'userId' });
PostLike.belongsTo(User, { foreignKey: 'userId', as: 'Liker' });

// 帖子和点赞的关联
Post.hasMany(PostLike, { foreignKey: 'postId', as: 'PostLikes' });
PostLike.belongsTo(Post, { foreignKey: 'postId' });

// === 通知模型关联 ===

// 用户和通知的关联（接收者）
User.hasMany(Notification, { foreignKey: 'receiverId', as: 'ReceivedNotifications' });
Notification.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// 用户和通知的关联（发送者）
User.hasMany(Notification, { foreignKey: 'senderId', as: 'SentNotifications' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

// 帖子和通知的关联
Post.hasMany(Notification, { foreignKey: 'postId', as: 'Notifications' });
Notification.belongsTo(Post, { foreignKey: 'postId', as: 'Post' });

// 评论和通知的关联
Comment.hasMany(Notification, { foreignKey: 'commentId', as: 'Notifications' });
Notification.belongsTo(Comment, { foreignKey: 'commentId', as: 'Comment' });

// 用户与收藏的关系
User.hasMany(PostFavorite, { foreignKey: 'userId' });
PostFavorite.belongsTo(User, { foreignKey: 'userId' });

// 帖子与收藏的关系
Post.hasMany(PostFavorite, { foreignKey: 'postId', as: 'PostFavorites' });
PostFavorite.belongsTo(Post, { foreignKey: 'postId' });

module.exports = {
  Brand,
  Model,
  Image,
  Series,
  User,
  Post,
  Comment,
  PostLike,
  Notification,
  PostFavorite
}; 
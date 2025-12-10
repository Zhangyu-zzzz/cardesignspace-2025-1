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
const Article = require('./Article');
const ArticleComment = require('./ArticleComment');
const ArticleLike = require('./ArticleLike');
const ArticleImage = require('./ArticleImage');
const ImageAsset = require('./ImageAsset');
const ImageCuration = require('./ImageCuration');
const ImageAnalysis = require('./ImageAnalysis');
const ImageStat = require('./ImageStat');
const Tag = require('./Tag');
const ImageTag = require('./ImageTag');
const Feedback = require('./Feedback');
const Vehicle = require('./Vehicle');
const VehicleVote = require('./VehicleVote');
const MonitoredPage = require('./MonitoredPage');
const CrawlHistory = require('./CrawlHistory');
const SearchStat = require('./SearchStat');
const SearchHistory = require('./SearchHistory');

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

// 图片与图片资产的关联（1:N）
Image.hasMany(ImageAsset, { foreignKey: 'imageId', as: 'Assets' });
ImageAsset.belongsTo(Image, { foreignKey: 'imageId', as: 'Image' });

// 图片与精选信息（1:1）
Image.hasOne(ImageCuration, { foreignKey: 'imageId', as: 'Curation' });
ImageCuration.belongsTo(Image, { foreignKey: 'imageId', as: 'Image' });

// 图片与分析信息（1:1）
Image.hasOne(ImageAnalysis, { foreignKey: 'imageId', as: 'Analysis' });
ImageAnalysis.belongsTo(Image, { foreignKey: 'imageId', as: 'Image' });

// 图片与统计（1:N）
Image.hasMany(ImageStat, { foreignKey: 'imageId', as: 'Stats' });
ImageStat.belongsTo(Image, { foreignKey: 'imageId', as: 'Image' });

// 图片与标签的关联（N:N）
Image.belongsToMany(Tag, {
  through: ImageTag,
  foreignKey: 'imageId',
  otherKey: 'tagId',
  as: 'Tags'
});
Tag.belongsToMany(Image, {
  through: ImageTag,
  foreignKey: 'tagId',
  otherKey: 'imageId',
  as: 'Images'
});

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

// === 文章模型关联 ===

// 用户和文章的关联
User.hasMany(Article, { foreignKey: 'authorId', as: 'Articles' });
Article.belongsTo(User, { foreignKey: 'authorId', as: 'Author' });

// 文章和评论的关联
Article.hasMany(ArticleComment, { foreignKey: 'articleId', as: 'Comments' });
ArticleComment.belongsTo(Article, { foreignKey: 'articleId' });

// 用户和文章评论的关联
User.hasMany(ArticleComment, { foreignKey: 'userId', as: 'ArticleComments' });
ArticleComment.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// 评论的自关联（回复功能）
ArticleComment.hasMany(ArticleComment, { foreignKey: 'parentId', as: 'Replies' });
ArticleComment.belongsTo(ArticleComment, { foreignKey: 'parentId', as: 'Parent' });

// 文章和点赞的关联
Article.hasMany(ArticleLike, { foreignKey: 'articleId', as: 'Likes' });
ArticleLike.belongsTo(Article, { foreignKey: 'articleId' });

// 用户和文章点赞的关联
User.hasMany(ArticleLike, { foreignKey: 'userId', as: 'ArticleLikes' });
ArticleLike.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// 文章图片关联
Article.hasMany(ArticleImage, { foreignKey: 'articleId', as: 'Images' });
ArticleImage.belongsTo(Article, { foreignKey: 'articleId' });

User.hasMany(ArticleImage, { foreignKey: 'userId', as: 'ArticleImages' });
ArticleImage.belongsTo(User, { foreignKey: 'userId', as: 'Uploader' });

// === 反馈模型关联 ===

// 用户和反馈的关联
User.hasMany(Feedback, { foreignKey: 'userId', as: 'Feedbacks' });
Feedback.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// 回复人和反馈的关联
User.hasMany(Feedback, { foreignKey: 'repliedBy', as: 'RepliedFeedbacks' });
Feedback.belongsTo(User, { foreignKey: 'repliedBy', as: 'RepliedBy' });

// === 载具模型关联 ===

// 用户和载具的关联
User.hasMany(Vehicle, { foreignKey: 'userId', as: 'Vehicles' });
Vehicle.belongsTo(User, { foreignKey: 'userId', as: 'Creator' });

// 载具和投票记录的关联
Vehicle.hasMany(VehicleVote, { foreignKey: 'vehicleId', as: 'Votes' });
VehicleVote.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

// 用户和投票记录的关联
User.hasMany(VehicleVote, { foreignKey: 'userId', as: 'VehicleVotes' });
VehicleVote.belongsTo(User, { foreignKey: 'userId', as: 'Voter' });

// === 爬虫模型关联 ===

// 监控页面和抓取历史的关联
MonitoredPage.hasMany(CrawlHistory, { foreignKey: 'pageId', as: 'CrawlHistories' });
CrawlHistory.belongsTo(MonitoredPage, { foreignKey: 'pageId', as: 'MonitoredPage' });

module.exports = {
  Brand,
  Model,
  Image,
  ImageAsset,
  ImageAnalysis,
  ImageStat,
  Series,
  User,
  Post,
  Comment,
  PostLike,
  Notification,
  PostFavorite,
  Article,
  ArticleComment,
  ArticleLike,
  ArticleImage,
  ImageCuration,
  Tag,
  ImageTag,
  Feedback,
  Vehicle,
  VehicleVote,
  MonitoredPage,
  CrawlHistory,
  SearchStat,
  SearchHistory
}; 
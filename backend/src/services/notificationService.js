const { Notification, User, Post, Comment } = require('../models/mysql');
const { Op } = require('sequelize');

class NotificationService {
  
  /**
   * 创建通知
   * @param {Object} params - 通知参数
   * @param {number} params.receiverId - 接收者ID
   * @param {number} params.senderId - 发送者ID
   * @param {string} params.type - 通知类型
   * @param {string} params.title - 通知标题
   * @param {string} params.content - 通知内容
   * @param {number} params.postId - 相关帖子ID
   * @param {number} params.commentId - 相关评论ID
   * @param {Object} params.metadata - 额外数据
   */
  async createNotification({
    receiverId,
    senderId,
    type,
    title,
    content,
    postId = null,
    commentId = null,
    metadata = {}
  }) {
    try {
      // 防止给自己发送通知
      if (receiverId === senderId) {
        return null;
      }

      // 检查是否已存在相同的通知（防止重复通知）
      const existingNotification = await Notification.findOne({
        where: {
          receiverId,
          senderId,
          type,
          postId,
          commentId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // 5分钟内的重复通知
          }
        }
      });

      if (existingNotification) {
        return existingNotification;
      }

      const notification = await Notification.create({
        receiverId,
        senderId,
        type,
        title,
        content,
        postId,
        commentId,
        metadata
      });

      return notification;
    } catch (error) {
      console.error('创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的通知列表
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        isRead = null,
        type = null
      } = options;

      const where = { receiverId: userId };
      
      if (isRead !== null) {
        where.isRead = isRead;
      }
      
      if (type) {
        where.type = type;
      }

      const notifications = await Notification.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['id', 'username', 'avatar']
          },
          {
            model: Post,
            as: 'Post',
            attributes: ['id', 'content'],
            required: false
          },
          {
            model: Comment,
            as: 'Comment',
            attributes: ['id', 'content'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      return {
        notifications: notifications.rows,
        total: notifications.count,
        page: parseInt(page),
        totalPages: Math.ceil(notifications.count / parseInt(limit))
      };
    } catch (error) {
      console.error('获取通知列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取未读通知数量
   * @param {number} userId - 用户ID
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.count({
        where: {
          receiverId: userId,
          isRead: false
        }
      });
      return count;
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用户ID
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await Notification.update(
        { isRead: true },
        {
          where: {
            id: notificationId,
            receiverId: userId
          }
        }
      );
      return result[0] > 0;
    } catch (error) {
      console.error('标记通知已读失败:', error);
      throw error;
    }
  }

  /**
   * 标记所有通知为已读
   * @param {number} userId - 用户ID
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.update(
        { isRead: true },
        {
          where: {
            receiverId: userId,
            isRead: false
          }
        }
      );
      return result[0];
    } catch (error) {
      console.error('标记所有通知已读失败:', error);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用户ID
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.destroy({
        where: {
          id: notificationId,
          receiverId: userId
        }
      });
      return result > 0;
    } catch (error) {
      console.error('删除通知失败:', error);
      throw error;
    }
  }

  /**
   * 创建点赞通知
   * @param {number} postId - 帖子ID
   * @param {number} likerId - 点赞者ID
   */
  async createLikeNotification(postId, likerId) {
    try {
      const post = await Post.findByPk(postId, {
        include: [{
          model: User,
          attributes: ['id', 'username']
        }]
      });

      if (!post) return null;

      const liker = await User.findByPk(likerId, {
        attributes: ['username']
      });

      if (!liker) return null;

      return await this.createNotification({
        receiverId: post.userId,
        senderId: likerId,
        type: 'like',
        title: '获得了新的赞',
        content: `${liker.username} 赞了你的帖子`,
        postId: postId,
        metadata: {
          postContent: post.content.substring(0, 50)
        }
      });
    } catch (error) {
      console.error('创建点赞通知失败:', error);
      throw error;
    }
  }

  /**
   * 创建评论通知
   * @param {number} postId - 帖子ID
   * @param {number} commenterId - 评论者ID
   * @param {string} commentContent - 评论内容
   */
  async createCommentNotification(postId, commenterId, commentContent) {
    try {
      const post = await Post.findByPk(postId, {
        include: [{
          model: User,
          attributes: ['id', 'username']
        }]
      });

      if (!post) return null;

      const commenter = await User.findByPk(commenterId, {
        attributes: ['username']
      });

      if (!commenter) return null;

      return await this.createNotification({
        receiverId: post.userId,
        senderId: commenterId,
        type: 'comment',
        title: '收到了新评论',
        content: `${commenter.username} 评论了你的帖子: ${commentContent.substring(0, 30)}`,
        postId: postId,
        metadata: {
          postContent: post.content.substring(0, 50),
          commentContent: commentContent.substring(0, 100)
        }
      });
    } catch (error) {
      console.error('创建评论通知失败:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService(); 
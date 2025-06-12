const UserActivity = require('../models/mysql/UserActivity');

class ActivityService {
  /**
   * 记录用户活动
   * @param {Object} activityData - 活动数据
   * @param {number} activityData.userId - 用户ID
   * @param {string} activityData.type - 活动类型
   * @param {string} activityData.title - 活动标题
   * @param {string} activityData.description - 活动描述
   * @param {number} activityData.relatedId - 关联ID
   * @param {string} activityData.relatedType - 关联类型
   * @param {number} activityData.points - 积分变化
   * @param {Object} activityData.metadata - 额外元数据
   */
  async recordActivity({
    userId,
    type,
    title,
    description,
    relatedId = null,
    relatedType = null,
    points = 0,
    metadata = null
  }) {
    try {
      const activity = await UserActivity.create({
        userId,
        type,
        title,
        description,
        relatedId,
        relatedType,
        points,
        metadata
      });
      
      console.log(`记录用户活动: ${userId} - ${type} - ${title}`);
      return activity;
    } catch (error) {
      console.error('记录用户活动失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户最近活动
   * @param {number} userId - 用户ID
   * @param {number} limit - 限制数量
   * @returns {Array} 活动列表
   */
  async getUserRecentActivities(userId, limit = 10) {
    try {
      const activities = await UserActivity.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        raw: true
      });

      return activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        points: activity.points,
        createdAt: activity.createdAt,
        metadata: activity.metadata
      }));
    } catch (error) {
      console.error('获取用户活动失败:', error);
      throw error;
    }
  }

  /**
   * 记录注册活动
   */
  async recordRegisterActivity(userId, username) {
    return this.recordActivity({
      userId,
      type: 'register',
      title: '欢迎加入',
      description: `用户 ${username} 成功注册汽车图库账户`,
      points: 100
    });
  }

  /**
   * 记录登录活动
   */
  async recordLoginActivity(userId, username, metadata = null) {
    return this.recordActivity({
      userId,
      type: 'login',
      title: '用户登录',
      description: `用户 ${username} 登录系统`,
      points: 1,
      metadata
    });
  }

  /**
   * 记录登出活动
   */
  async recordLogoutActivity(userId, username) {
    return this.recordActivity({
      userId,
      type: 'logout',
      title: '用户登出',
      description: `用户 ${username} 登出系统`,
      points: 0
    });
  }

  /**
   * 记录上传活动
   */
  async recordUploadActivity(userId, imageId, imageTitle) {
    return this.recordActivity({
      userId,
      type: 'upload',
      title: '上传了新图片',
      description: imageTitle || '无标题图片',
      relatedId: imageId,
      relatedType: 'image',
      points: 10
    });
  }

  /**
   * 记录下载活动
   */
  async recordDownloadActivity(userId, imageId, imageTitle) {
    return this.recordActivity({
      userId,
      type: 'download',
      title: '下载了图片',
      description: imageTitle || '无标题图片',
      relatedId: imageId,
      relatedType: 'image',
      points: 0
    });
  }

  /**
   * 记录去除背景活动
   */
  async recordRemoveBgActivity(userId, imageId, imageTitle) {
    return this.recordActivity({
      userId,
      type: 'remove_bg',
      title: '图片去除背景',
      description: `对图片 "${imageTitle || '无标题'}" 进行背景去除处理`,
      relatedId: imageId,
      relatedType: 'image',
      points: 5
    });
  }

  /**
   * 记录裁剪透明活动
   */
  async recordCropTransparentActivity(userId, imageId, imageTitle) {
    return this.recordActivity({
      userId,
      type: 'crop_tranparent',
      title: '图片裁剪透明',
      description: `对图片 "${imageTitle || '无标题'}" 进行透明区域裁剪`,
      relatedId: imageId,
      relatedType: 'image',
      points: 5
    });
  }

  /**
   * 记录密码修改活动
   */
  async recordPasswordChangeActivity(userId, username) {
    return this.recordActivity({
      userId,
      type: 'password_change',
      title: '修改了密码',
      description: `用户 ${username} 成功修改密码`,
      points: 0
    });
  }

  /**
   * 记录资料更新活动
   */
  async recordProfileUpdateActivity(userId, username, changes = []) {
    const changesText = changes.length > 0 ? `（更新：${changes.join('、')}）` : '';
    return this.recordActivity({
      userId,
      type: 'profile_update',
      title: '更新了个人资料',
      description: `用户 ${username} 更新个人资料${changesText}`,
      points: 0,
      metadata: { changes }
    });
  }

  /**
   * 记录删除活动
   */
  async recordDeleteActivity(userId, imageTitle) {
    return this.recordActivity({
      userId,
      type: 'delete',
      title: '删除了图片',
      description: imageTitle || '无标题图片',
      points: -10
    });
  }

  /**
   * 记录成就解锁活动
   */
  async recordAchievementActivity(userId, achievementName, achievementDescription) {
    return this.recordActivity({
      userId,
      type: 'achievement',
      title: '解锁新成就',
      description: `获得成就：${achievementName} - ${achievementDescription}`,
      points: 0
    });
  }

  /**
   * 记录积分变化活动
   */
  async recordPointsActivity(userId, points, reason) {
    return this.recordActivity({
      userId,
      type: 'points',
      title: points > 0 ? '获得积分' : '扣除积分',
      description: reason,
      points
    });
  }

  /**
   * 记录其他活动
   */
  async recordOtherActivity(userId, title, description, points = 0, metadata = null) {
    return this.recordActivity({
      userId,
      type: 'other',
      title,
      description,
      points,
      metadata
    });
  }
}

module.exports = new ActivityService(); 
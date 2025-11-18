// pages/forum/forum.js
import { forumAPI } from '../../utils/api';

Page({
  data: {
    posts: [],
    loading: true
  },

  onLoad() {
    this.loadPosts();
  },

  async loadPosts() {
    this.setData({ loading: true });
    
    try {
      const res = await forumAPI.getPosts();
      const posts = res.data || res || [];
      this.setData({ posts: posts });
    } catch (error) {
      console.error('加载帖子失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  viewPost(e) {
    const postId = e.currentTarget.dataset.id;
    // 可以跳转到帖子详情页
  }
});


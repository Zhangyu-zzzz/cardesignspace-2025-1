#!/usr/bin/env python3
"""
CLIP图片向量化独立脚本
用于将图片URL或本地图片编码为向量，供Node.js调用

用法:
  python3 clip_image_encoder_standalone.py <image_url_or_path>
  
输出: JSON格式的向量数据
  {"status": "success", "vector": [...], "dimension": 512}
  或 {"status": "error", "error": "错误信息"}
"""

import sys
import json
import logging
from PIL import Image
import requests
from io import BytesIO
import os

# 配置日志（输出到stderr，避免污染stdout的JSON结果）
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# 导入CLIP编码器
try:
    # 确保能找到clip_utils模块
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(current_dir, 'clip_utils'))
    from clip_encoder import get_clip_encoder
except Exception as e:
    logger.error(f"导入CLIP编码器失败: {e}")
    print(json.dumps({"status": "error", "error": f"导入CLIP编码器失败: {str(e)}"}), file=sys.stdout)
    sys.exit(1)


def load_image_from_url(url, timeout=10):
    """从URL加载图片"""
    try:
        logger.info(f"从URL加载图片: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        
        image = Image.open(BytesIO(response.content))
        # 转换为RGB模式（CLIP要求）
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        logger.info(f"图片加载成功: {image.size}, 模式: {image.mode}")
        return image
    except Exception as e:
        logger.error(f"从URL加载图片失败: {e}")
        raise


def load_image_from_path(path):
    """从本地路径加载图片"""
    try:
        logger.info(f"从本地加载图片: {path}")
        if not os.path.exists(path):
            raise FileNotFoundError(f"图片文件不存在: {path}")
        
        image = Image.open(path)
        # 转换为RGB模式（CLIP要求）
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        logger.info(f"图片加载成功: {image.size}, 模式: {image.mode}")
        return image
    except Exception as e:
        logger.error(f"从本地加载图片失败: {e}")
        raise


def encode_image(image_source):
    """
    编码图片为向量
    
    Args:
        image_source: 图片URL或本地路径
        
    Returns:
        dict: {"status": "success", "vector": [...], "dimension": 512}
              或 {"status": "error", "error": "错误信息"}
    """
    try:
        # 判断是URL还是本地路径
        if image_source.startswith('http://') or image_source.startswith('https://'):
            image = load_image_from_url(image_source)
        else:
            image = load_image_from_path(image_source)
        
        # 初始化CLIP编码器
        logger.info("初始化CLIP编码器...")
        encoder = get_clip_encoder()
        
        # 编码图片
        logger.info("开始编码图片...")
        vector = encoder.encode_image(image)
        
        if vector is None:
            raise Exception("CLIP编码返回None")
        
        # 转换为Python列表
        vector_list = vector.tolist()
        
        logger.info(f"图片编码成功: 维度={len(vector_list)}")
        
        return {
            "status": "success",
            "vector": vector_list,
            "dimension": len(vector_list)
        }
        
    except Exception as e:
        logger.error(f"图片编码失败: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "status": "error",
            "error": str(e)
        }


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "error": "用法: python3 clip_image_encoder_standalone.py <image_url_or_path>"
        }), file=sys.stdout)
        sys.exit(1)
    
    image_source = sys.argv[1]
    
    if not image_source or not image_source.strip():
        print(json.dumps({
            "status": "error",
            "error": "图片URL或路径不能为空"
        }), file=sys.stdout)
        sys.exit(1)
    
    # 编码图片
    result = encode_image(image_source.strip())
    
    # 输出JSON结果到stdout（Node.js会读取这个）
    print(json.dumps(result), file=sys.stdout)
    
    # 根据结果设置退出码
    sys.exit(0 if result["status"] == "success" else 1)


if __name__ == "__main__":
    main()








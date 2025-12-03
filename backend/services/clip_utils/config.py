"""
配置文件
包含数据库、COS、Qdrant等连接配置
"""
import os
from dotenv import load_dotenv

load_dotenv()

# 注意：此配置文件仅用于CLIP向量化服务
# MySQL和COS配置已移除，因为当前项目不需要

# Qdrant向量数据库配置
QDRANT_CONFIG = {
    'host': os.getenv('QDRANT_HOST', 'localhost'),
    'port': int(os.getenv('QDRANT_PORT', 6333)),
    'api_key': os.getenv('QDRANT_API_KEY', None),
    'collection_name': os.getenv('QDRANT_COLLECTION_NAME', 'car_images')
}

# CLIP模型配置
def _get_device():
    """智能检测设备"""
    device = os.getenv('DEVICE', '').lower()
    if device in ['cuda', 'gpu']:
        try:
            import torch
            if torch.cuda.is_available():
                return 'cuda'
        except:
            pass
    return 'cpu'

CLIP_CONFIG = {
    'model_name': os.getenv('CLIP_MODEL', 'openai/clip-vit-base-patch32'),
    'device': _get_device(),
    'batch_size': int(os.getenv('BATCH_SIZE', 32))
}

# 向量维度（CLIP ViT-B/32 是 512 维）
VECTOR_DIMENSION = 512

# 图片处理配置
IMAGE_CONFIG = {
    'max_size': (224, 224),  # CLIP输入尺寸
    'supported_formats': ['.jpg', '.jpeg', '.png', '.webp']
}


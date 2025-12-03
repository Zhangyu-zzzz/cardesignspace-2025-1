"""
CLIP模型封装模块
用于图片和文本的向量化
使用transformers库加载CLIP模型
"""
import torch
from PIL import Image
import numpy as np
from typing import List, Union
from config import CLIP_CONFIG, IMAGE_CONFIG
import logging
import time
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CLIPEncoder:
    """CLIP编码器封装类"""
    
    def __init__(self):
        self.config = CLIP_CONFIG
        self.image_config = IMAGE_CONFIG
        self.device = self.config['device']
        self.model = None
        self.processor = None
        self._load_model()
    
    def _load_model(self):
        """加载CLIP模型（使用transformers库）"""
        try:
            import os
            from transformers import CLIPProcessor, CLIPModel
            
            model_name = self.config['model_name']
            # 支持多种CLIP模型名称
            if model_name == 'ViT-B/32' or model_name == 'ViT-B/16':
                # 将简写转换为transformers格式
                model_name = f'openai/clip-vit-base-patch32' if '32' in model_name else f'openai/clip-vit-base-patch16'
            
            logger.info(f"准备加载CLIP模型: {model_name}")
            logger.info(f"设备: {self.device}")
            
            # 检查本地是否有模型文件（优先使用本地）
            local_model_path = None
            if 'clip-vit-base-patch32' in model_name:
                # 检查多个可能的模型路径
                current_dir = os.path.dirname(os.path.abspath(__file__))
                service_dir = os.path.dirname(current_dir)  # backend/services
                project_root = os.path.dirname(os.path.dirname(service_dir))  # 项目根目录
                
                possible_paths = [
                    os.path.join(current_dir, 'clip-vit-base-patch32'),  # clip_utils/clip-vit-base-patch32
                    os.path.join(service_dir, 'clip-vit-base-patch32'),  # services/clip-vit-base-patch32
                    os.path.join(project_root, 'clip-vit-base-patch32'),  # 项目根目录
                    './clip-vit-base-patch32',  # 当前工作目录
                    os.path.expanduser('~/clip-vit-base-patch32'),  # 用户目录
                    # 也检查外部参考项目路径（如果设置了环境变量）
                ]
                
                # 如果设置了外部参考项目路径，也检查那里
                ref_project = os.getenv('CLIP_REFERENCE_PROJECT')
                if ref_project:
                    possible_paths.append(os.path.join(ref_project, 'clip-vit-base-patch32'))
                
                logger.info("检查本地模型路径...")
                for path in possible_paths:
                    abs_path = os.path.abspath(path)
                    model_file = os.path.join(path, 'pytorch_model.bin')
                    if os.path.exists(path) and os.path.exists(model_file):
                        local_model_path = abs_path
                        logger.info(f"✅ 发现本地模型: {local_model_path}")
                        logger.info(f"   模型文件大小: {os.path.getsize(model_file) / 1024 / 1024:.1f} MB")
                        break
            
            if local_model_path:
                logger.info(f"从本地加载CLIP模型（不联网）...")
                logger.info(f"路径: {local_model_path}")
                
                # 先加载处理器（通常很快）
                logger.info("步骤1/3: 加载处理器（tokenizer）...")
                try:
                    self.processor = CLIPProcessor.from_pretrained(
                        local_model_path,
                        local_files_only=True
                    )
                    logger.info("✅ 处理器加载完成")
                except Exception as e:
                    logger.error(f"处理器加载失败: {e}")
                    raise
                
                # 加载模型权重（这一步可能较慢，特别是CPU）
                logger.info("步骤2/3: 加载模型权重（577MB，可能需要1-2分钟）...")
                try:
                    # 不使用 device_map，直接用 .to() 方法指定设备
                    self.model = CLIPModel.from_pretrained(
                        local_model_path,
                        local_files_only=True,
                        torch_dtype=torch.float32  # 明确指定数据类型
                    )
                    self.model = self.model.to(self.device)  # 明确移动到指定设备
                    logger.info(f"✅ 模型权重加载完成（已在 {self.device} 上）")
                except Exception as e:
                    logger.error(f"模型权重加载失败: {e}")
                    raise
            else:
                logger.warning("未找到本地模型，将从网络下载（可能需要较长时间）...")
                logger.info(f"从网络加载CLIP模型: {model_name}")
                # 不使用 device_map，直接用 .to() 方法指定设备
                self.model = CLIPModel.from_pretrained(model_name)
                self.model = self.model.to(self.device)  # 明确移动到指定设备
                self.processor = CLIPProcessor.from_pretrained(model_name)
            
            logger.info("设置模型为评估模式...")
            self.model.eval()
            logger.info(f"✅ CLIP模型加载成功！设备: {self.device}")
        except Exception as e:
            logger.error(f"加载CLIP模型失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    def encode_image(self, image: Image.Image) -> np.ndarray:
        """将单张图片编码为向量"""
        try:
            inputs = self.processor(images=image, return_tensors="pt").to(self.device)
            with torch.no_grad():
                image_features = self.model.get_image_features(**inputs)
                # 归一化
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                return image_features.cpu().numpy()[0]
        except Exception as e:
            logger.error(f"图片编码失败: {e}")
            return None
    
    def encode_images_batch(self, images: List[Image.Image]) -> np.ndarray:
        """批量编码图片"""
        try:
            inputs = self.processor(images=images, return_tensors="pt", padding=True).to(self.device)
            with torch.no_grad():
                image_features = self.model.get_image_features(**inputs)
                # 归一化
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                return image_features.cpu().numpy()
        except Exception as e:
            logger.error(f"批量图片编码失败: {e}")
            return None
    
    def encode_text(self, text: str) -> np.ndarray:
        """将文本编码为向量"""
        try:
            inputs = self.processor(text=text, return_tensors="pt", padding=True).to(self.device)
            with torch.no_grad():
                text_features = self.model.get_text_features(**inputs)
                # 归一化
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                return text_features.cpu().numpy()[0]
        except Exception as e:
            logger.error(f"文本编码失败: {e}")
            return None
    
    def encode_texts_batch(self, texts: List[str]) -> np.ndarray:
        """批量编码文本"""
        try:
            inputs = self.processor(text=texts, return_tensors="pt", padding=True).to(self.device)
            with torch.no_grad():
                text_features = self.model.get_text_features(**inputs)
                # 归一化
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                return text_features.cpu().numpy()
        except Exception as e:
            logger.error(f"批量文本编码失败: {e}")
            return None


# 全局CLIP编码器实例（延迟初始化）
_clip_encoder_instance = None

def get_clip_encoder():
    """获取CLIP编码器实例（单例模式）"""
    global _clip_encoder_instance
    if _clip_encoder_instance is None:
        _clip_encoder_instance = CLIPEncoder()
    return _clip_encoder_instance

# 为了向后兼容
clip_encoder = None

def _init_clip_encoder():
    """初始化全局CLIP编码器"""
    global clip_encoder
    if clip_encoder is None:
        clip_encoder = get_clip_encoder()
    return clip_encoder


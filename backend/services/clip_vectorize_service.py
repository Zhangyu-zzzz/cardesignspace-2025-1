#!/usr/bin/env python3
"""
CLIP文本向量化HTTP服务
提供RESTful API将文本转换为向量
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import logging

# 配置日志（必须在logger使用之前）
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 获取当前文件所在目录
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIP_UTILS_DIR = os.path.join(CURRENT_DIR, 'clip_utils')

# 优先使用本地clip_utils目录，否则尝试外部参考项目路径
if os.path.exists(CLIP_UTILS_DIR):
    sys.path.insert(0, CLIP_UTILS_DIR)
    logger.info(f"✅ 使用本地CLIP工具目录: {CLIP_UTILS_DIR}")
    USE_LOCAL_MODULES = True
else:
    # 回退到外部参考项目路径
    REFERENCE_PROJECT = os.getenv('CLIP_REFERENCE_PROJECT', '/Users/zobot/Desktop/unsplash-crawler/daydayup-1')
    if os.path.exists(REFERENCE_PROJECT):
        sys.path.insert(0, REFERENCE_PROJECT)
        logger.info(f"✅ 使用外部参考项目路径: {REFERENCE_PROJECT}")
        USE_LOCAL_MODULES = False
    else:
        logger.warning(f"⚠️  本地CLIP工具目录不存在: {CLIP_UTILS_DIR}")
        logger.warning(f"⚠️  外部参考项目路径也不存在: {REFERENCE_PROJECT}")
        logger.warning("请确保clip_utils目录存在或设置CLIP_REFERENCE_PROJECT环境变量")
        USE_LOCAL_MODULES = False

try:
    from clip_encoder import get_clip_encoder
    from config import VECTOR_DIMENSION
    logger.info(f"✅ 成功导入CLIP模块，向量维度: {VECTOR_DIMENSION}")
except ImportError as e:
    logger.error(f"❌ 无法导入CLIP模块: {e}")
    logger.error("请确保clip_encoder.py和config.py在clip_utils目录中")
    VECTOR_DIMENSION = 512

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 日志已在文件开头配置，这里不需要重复配置

# 全局CLIP编码器实例
clip_encoder = None

def init_clip_encoder():
    """初始化CLIP编码器"""
    global clip_encoder
    if clip_encoder is None:
        try:
            logger.info("正在初始化CLIP编码器...")
            clip_encoder = get_clip_encoder()
            logger.info("✅ CLIP编码器初始化成功")
        except Exception as e:
            logger.error(f"❌ CLIP编码器初始化失败: {e}")
            raise
    return clip_encoder

@app.route('/', methods=['GET'])
def index():
    """服务首页"""
    # 尝试初始化CLIP编码器（如果尚未初始化）
    try:
        if clip_encoder is None:
            init_clip_encoder()
    except Exception as e:
        logger.warning(f"CLIP编码器初始化失败: {e}")
    
    return jsonify({
        'service': 'CLIP向量化服务',
        'status': 'running',
        'version': '1.0.0',
        'endpoints': {
            'health': '/health',
            'encode_text': '/encode-text (POST)',
            'encode_texts': '/encode-texts (POST)'
        },
        'clip_loaded': clip_encoder is not None,
        'note': 'CLIP模型采用延迟加载，首次调用/encode-text时会自动加载模型（需要1-2分钟）'
    })

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'service': 'clip-vectorize',
        'clip_loaded': clip_encoder is not None
    })

@app.route('/encode-text', methods=['POST'])
def encode_text():
    """将文本编码为向量"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                'error': 'Missing "text" field in request body'
            }), 400
        
        text = data['text']
        if not text or not text.strip():
            return jsonify({
                'error': 'Text cannot be empty'
            }), 400
        
        # 初始化编码器（如果尚未初始化）
        encoder = init_clip_encoder()
        
        # 编码文本
        vector = encoder.encode_text(text)
        
        if vector is None:
            return jsonify({
                'error': 'Failed to encode text'
            }), 500
        
        return jsonify({
            'status': 'success',
            'text': text,
            'vector': vector.tolist(),
            'dimension': len(vector)
        })
    except Exception as e:
        logger.error(f"编码文本失败: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/encode-texts', methods=['POST'])
def encode_texts():
    """批量将文本编码为向量"""
    try:
        data = request.get_json()
        if not data or 'texts' not in data:
            return jsonify({
                'error': 'Missing "texts" field in request body'
            }), 400
        
        texts = data['texts']
        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({
                'error': 'Texts must be a non-empty list'
            }), 400
        
        # 初始化编码器（如果尚未初始化）
        encoder = init_clip_encoder()
        
        # 批量编码文本
        vectors = encoder.encode_texts_batch(texts)
        
        if vectors is None or len(vectors) == 0:
            return jsonify({
                'error': 'Failed to encode texts'
            }), 500
        
        return jsonify({
            'status': 'success',
            'texts': texts,
            'vectors': [v.tolist() for v in vectors],
            'count': len(vectors),
            'dimension': len(vectors[0]) if len(vectors) > 0 else 0
        })
    except Exception as e:
        logger.error(f"批量编码文本失败: {e}")
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # 从环境变量读取配置
    port = int(os.getenv('CLIP_SERVICE_PORT', 5001))
    host = os.getenv('CLIP_SERVICE_HOST', '0.0.0.0')
    
    logger.info(f"启动CLIP向量化服务，监听 {host}:{port}")
    logger.info(f"向量维度: {VECTOR_DIMENSION}")
    logger.info("提示: CLIP模型采用延迟加载，首次调用/encode-text时会自动加载（需要1-2分钟）")
    
    # 可选：启动时预加载模型（取消注释下面的代码）
    # logger.info("正在预加载CLIP模型...")
    # try:
    #     init_clip_encoder()
    #     logger.info("✅ CLIP模型预加载成功")
    # except Exception as e:
    #     logger.warning(f"CLIP模型预加载失败，将使用延迟加载: {e}")
    
    app.run(host=host, port=port, debug=False)


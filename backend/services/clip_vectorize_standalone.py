#!/usr/bin/env python3
"""
CLIP文本向量化独立脚本
用于从Node.js调用，将文本转换为向量
"""
import sys
import os
import json

# 获取脚本所在目录
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIP_UTILS_DIR = os.path.join(CURRENT_DIR, 'clip_utils')

# 添加clip_utils到路径
if os.path.exists(CLIP_UTILS_DIR):
    sys.path.insert(0, CLIP_UTILS_DIR)
else:
    # 回退到外部参考项目路径
    REFERENCE_PROJECT = os.getenv('CLIP_REFERENCE_PROJECT', '/Users/zobot/Desktop/unsplash-crawler/daydayup-1')
    if os.path.exists(REFERENCE_PROJECT):
        sys.path.insert(0, REFERENCE_PROJECT)
    else:
        print(json.dumps({'error': f'CLIP工具目录不存在: {CLIP_UTILS_DIR}'}), file=sys.stderr)
        sys.exit(1)

try:
    from clip_encoder import get_clip_encoder
except ImportError as e:
    print(json.dumps({'error': f'无法导入CLIP模块: {str(e)}'}), file=sys.stderr)
    sys.exit(1)

def main():
    """主函数"""
    try:
        # 从命令行参数获取文本
        if len(sys.argv) < 2:
            print(json.dumps({'error': '缺少文本参数'}))
            sys.exit(1)
        
        text = sys.argv[1]
        
        if not text or not text.strip():
            print(json.dumps({'error': '文本不能为空'}))
            sys.exit(1)
        
        # 初始化编码器（延迟加载）
        encoder = get_clip_encoder()
        
        # 编码文本
        vector = encoder.encode_text(text)
        
        if vector is None:
            print(json.dumps({'error': '向量化失败'}))
            sys.exit(1)
        
        # 返回JSON格式的向量
        result = {
            'status': 'success',
            'vector': vector.tolist(),
            'dimension': len(vector)
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()


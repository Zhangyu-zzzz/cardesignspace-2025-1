#!/usr/bin/env python3
"""
生成微信小程序 TabBar 占位图标
需要安装 Pillow: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

# 图标尺寸
SIZE = 81

# 颜色配置
COLOR_UNSELECTED = (153, 153, 153)  # #999999
COLOR_SELECTED = (224, 52, 38)      # #e03426
COLOR_BG = (255, 255, 255)          # 白色背景

# 图标配置
ICONS = [
    {
        'name': 'home',
        'text': '首页',
        'symbol': '🏠'
    },
    {
        'name': 'brand',
        'text': '品牌',
        'symbol': '🚗'
    },
    {
        'name': 'image',
        'text': '图片',
        'symbol': '🖼️'
    },
    {
        'name': 'profile',
        'text': '我的',
        'symbol': '👤'
    }
]

def create_icon(name, text, symbol, color, is_selected=False):
    """创建图标"""
    # 创建图片
    img = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制圆形背景
    margin = 10
    draw.ellipse(
        [margin, margin, SIZE - margin, SIZE - margin],
        fill=color + (200,) if is_selected else COLOR_UNSELECTED + (100,)
    )
    
    # 绘制文字（使用符号）
    try:
        # 尝试使用系统字体
        font_size = 40
        font = ImageFont.truetype("/System/Library/Fonts/AppleColorEmoji.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    # 计算文字位置（居中）
    bbox = draw.textbbox((0, 0), symbol, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((SIZE - text_width) // 2, (SIZE - text_height) // 2 - 5)
    
    # 绘制符号
    draw.text(position, symbol, fill=color, font=font)
    
    # 保存图片
    filename = f"{name}{'-active' if is_selected else ''}.png"
    img.save(filename, 'PNG')
    print(f"已创建: {filename}")

def main():
    """主函数"""
    # 获取脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # 生成所有图标
    for icon in ICONS:
        # 未选中状态
        create_icon(icon['name'], icon['text'], icon['symbol'], COLOR_UNSELECTED, False)
        # 选中状态
        create_icon(icon['name'], icon['text'], icon['symbol'], COLOR_SELECTED, True)
    
    print("\n所有图标已生成完成！")
    print(f"图标文件保存在: {script_dir}")
    print("如果 emoji 显示不正常，请手动替换为合适的图标。")

if __name__ == '__main__':
    main()


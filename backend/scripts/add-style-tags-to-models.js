const { sequelize } = require('../src/config/mysql');

async function addStyleTagsToModels() {
  try {
    console.log('开始为 models 表添加风格标签字段...');
    
    // 添加风格标签字段
    await sequelize.query(`
      ALTER TABLE models
      ADD COLUMN styleTags JSON DEFAULT ('[]') COMMENT '风格标签数组，支持三层标签体系'
    `);
    
    console.log('✅ models 表 styleTags 字段添加成功！');
    console.log('\n字段说明：');
    console.log('- styleTags: JSON类型，存储风格标签数组，默认为空数组');
    console.log('- 支持三层标签体系：外型风格、内饰风格等');
    console.log('- 格式示例: ["外型风格.现代量产风格.2010s Kinetic / Fluidic", "内饰风格.科技感风格.High-Tech HMI"]');
    
    console.log('\n🎨 CarDesignSpace 三层标签体系:');
    console.log('1. 外型风格（Exterior Style）');
    console.log('   1.1 古典/复古风格（Classic / Vintage）');
    console.log('      - 1900s Horseless Carriage（马车式）');
    console.log('      - 1920s Art Deco（装饰艺术）');
    console.log('      - 1930s Streamline Moderne（流线型现代主义）');
    console.log('      - 1950s Chrome Era（镀铬装饰）');
    console.log('      - 1960s Muscle Car（美式肌肉车）');
    console.log('      - 1970s Boxy Functionalism（方盒子功能主义）');
    console.log('      - 1980s Wedge Shape（楔形风格）');
    console.log('   1.2 现代量产风格（Modern Mainstream）');
    console.log('      - 1990s Rounded Organic（圆润有机）');
    console.log('      - 2000s Edge Design（锐利边缘）');
    console.log('      - 2010s Kinetic / Fluidic（动感流线）');
    console.log('      - 2020s Minimalist EV（极简新能源）');
    console.log('   1.3 未来概念风格（Concept / Futuristic）');
    console.log('      - Cyberpunk（赛博朋克）');
    console.log('      - Bio-inspired / Organic（仿生/有机设计）');
    console.log('      - Aerodynamic Hypercar（空气动力学超级跑车）');
    console.log('      - Off-road Rugged（硬派越野）');
    console.log('      - Autonomous Pod（无人驾驶舱式）');
    console.log('2. 内饰风格（Interior Style）');
    console.log('   2.1 经典复古风格（Classic Luxury）');
    console.log('      - Wood & Chrome Luxury（木饰+镀铬豪华）');
    console.log('      - Analog Dials（机械仪表盘）');
    console.log('      - Handcrafted Leather（手工皮革工艺）');
    console.log('   2.2 功能主义风格（Functionalist）');
    console.log('      - Minimalist Dashboard（极简中控台）');
    console.log('      - Driver-Centric Cockpit（驾驶员导向驾驶舱）');
    console.log('      - Utility & Rugged（工具型/越野风格）');
    console.log('   2.3 科技感风格（Tech-oriented）');
    console.log('      - Digital Era（早期数字化内饰，90s-2000s）');
    console.log('      - High-Tech HMI（大屏交互人机界面）');
    console.log('      - Ambient Lighting（氛围灯潮流）');
    console.log('      - Autonomous Lounge（自动驾驶休闲舱）');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加 styleTags 字段失败:', error);
    process.exit(1);
  }
}

addStyleTagsToModels();


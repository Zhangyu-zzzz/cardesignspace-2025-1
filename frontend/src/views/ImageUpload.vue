<template>
  <div class="comprehensive-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>汽车数据管理系统</h1>
      <p>品牌管理 → 车型管理 → 图片管理的完整流程</p>
    </div>

    <!-- 管理功能选项卡 -->
    <el-tabs v-model="activeTab" class="management-tabs">
      
      <!-- 品牌管理 -->
      <el-tab-pane label="品牌管理" name="brands">
        <div class="brand-management">
          <!-- 品牌操作区 -->
          <div class="action-bar">
            <el-button type="primary" @click="showBrandDialog(null)" class="red-primary-btn">
              <i class="el-icon-plus"></i> 新增品牌
            </el-button>
            <el-button @click="loadBrands">
              <i class="el-icon-refresh"></i> 刷新
            </el-button>
          </div>

          <!-- 品牌列表 -->
          <div class="brands-grid" v-loading="brandsLoading">
            <div v-for="brand in brands" :key="brand.id" class="brand-card">
              <div class="brand-info">
                <h3>{{ brand.name }}</h3>
                <p class="country">{{ brand.country || '未知' }}</p>
                <p class="founded">成立年份: {{ brand.founded_year || '未知' }}</p>
                <p class="description">{{ brand.description || '暂无描述' }}</p>
                <div class="model-count">
                  车型数量: {{ (brand.Models || []).length }}
                </div>
              </div>
              <div class="brand-actions">
                <el-button size="small" @click="showBrandDialog(brand)">编辑</el-button>
                <el-button size="small" @click="manageBrandModels(brand)">管理车型</el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteBrand(brand)"
                  :disabled="(brand.Models || []).length > 0"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 车型管理 -->
      <el-tab-pane label="车型管理" name="models">
        <div class="model-management">
          <!-- 品牌选择 -->
          <div class="brand-selector">
            <el-select 
              v-model="selectedBrandId" 
              placeholder="请先选择品牌"
              @change="loadModelsByBrand"
              style="width: 300px"
            >
              <el-option
                v-for="brand in brands"
                :key="brand.id"
                :label="brand.name"
                :value="brand.id"
              />
            </el-select>
            <el-button 
              type="primary" 
              @click="showModelDialog(null)"
              :disabled="!selectedBrandId"
              class="red-primary-btn"
            >
              <i class="el-icon-plus"></i> 新增车型
            </el-button>
          </div>

          <!-- 车型列表 -->
          <div class="models-grid" v-loading="modelsLoading" v-if="selectedBrandId">
            <div v-for="model in models" :key="model.id" class="model-card">
              <div class="model-info">
                <h3>{{ model.name }}</h3>
                <div class="model-details">
                  <span class="type">{{ model.type || '其他' }}</span>
                  <span class="year">{{ model.year || '未知年份' }}</span>
                  <span class="price">{{ formatPrice(model.price) }}</span>
                </div>
                <p class="description">{{ model.description || '暂无描述' }}</p>
                <div class="status">
                  状态: <span :class="model.isActive ? 'active' : 'inactive'">
                    {{ model.isActive ? '启用' : '禁用' }}
                  </span>
                </div>
              </div>
              <div class="model-actions">
                <el-button size="small" @click="showModelDialog(model)">编辑</el-button>
                <el-button size="small" @click="manageModelImages(model)">管理图片</el-button>
                <el-button size="small" type="danger" @click="deleteModel(model)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 图片管理 -->
      <el-tab-pane label="图片管理" name="images">
        <div class="image-management">
          <!-- 车型选择和上传 -->
          <div class="image-controls">
            <div class="model-selector">
              <el-cascader
                v-model="selectedModelPath"
                :options="brandModelOptions"
                :props="cascaderProps"
                placeholder="选择品牌和车型"
                @change="handleModelSelect"
                style="width: 300px"
              />
            </div>
            
            <div v-if="selectedModelId" class="upload-buttons">
              <el-button type="primary" @click="showUploadDialog('single')" class="red-primary-btn">
                <i class="el-icon-upload"></i> 单图上传
              </el-button>
              <el-button type="success" @click="showUploadDialog('multiple')">
                <i class="el-icon-upload2"></i> 批量上传
              </el-button>
              <el-button type="warning" @click="showUploadDialog('folder')">
                <i class="el-icon-folder-opened"></i> 文件夹上传
              </el-button>
            </div>
          </div>

          <!-- 搜索和筛选 -->
          <div class="search-filters" v-if="selectedModelId">
            <el-form :model="searchForm" :inline="true">
              <el-form-item label="分类筛选">
                <el-select v-model="searchForm.category" placeholder="全部分类" clearable>
                  <el-option label="外观图" value="exterior" />
                  <el-option label="内饰图" value="interior" />
                  <el-option label="细节图" value="details" />
                  <el-option label="其他" value="general" />
                </el-select>
              </el-form-item>
              <el-form-item label="搜索">
                <el-input 
                  v-model="searchForm.search" 
                  placeholder="搜索标题或文件名"
                  style="width: 200px"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadImages" class="red-primary-btn">搜索</el-button>
                <el-button @click="resetImageSearch">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 图片列表 -->
          <div class="images-grid" v-loading="imagesLoading" v-if="selectedModelId">
            <div v-for="image in imagesList" :key="image.id" class="image-card">
              <div class="image-preview">
                <img :src="image.url" :alt="image.title" @error="handleImageError" />
                <div class="image-overlay">
                  <el-button type="primary" size="small" @click="viewImage(image)" class="red-primary-btn">查看</el-button>
                  <el-button type="success" size="small" @click="showEditImageDialog(image)">编辑</el-button>
                  <el-button type="danger" size="small" @click="deleteImage(image)">删除</el-button>
                </div>
              </div>
              <div class="image-info">
                <h4>{{ image.title || '无标题' }}</h4>
                <div class="image-meta">
                  <span class="category">{{ getCategoryName(image.category) }}</span>
                  <span class="date">{{ formatDate(image.uploadDate) }}</span>
                  <span v-if="image.isFeatured" class="featured">特色</span>
                </div>
                <!-- 新增用户信息 -->
                <div class="user-info" v-if="image.User">
                  <el-avatar :size="20" :src="image.User.avatar" icon="el-icon-user-solid"></el-avatar>
                  <span class="username">{{ image.User.username }}</span>
                  <span class="upload-time">{{ formatDate(image.uploadDate) }}</span>
                </div>
                <div class="user-info" v-else>
                  <el-avatar :size="20" icon="el-icon-user-solid"></el-avatar>
                  <span class="username">匿名用户</span>
                  <span class="upload-time">{{ formatDate(image.uploadDate) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div class="pagination-container" v-if="selectedModelId">
            <el-pagination
              :current-page="pagination.page"
              :page-size="pagination.limit"
              :page-sizes="[12, 24, 36, 48]"
              :small="false"
              :disabled="imagesLoading"
              :background="true"
              layout="total, sizes, prev, pager, next, jumper"
              :total="pagination.total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 品牌编辑对话框 -->
    <el-dialog 
      :visible.sync="brandDialog.visible" 
      :title="brandDialog.isEdit ? '编辑品牌' : '新增品牌'"
      width="800px"
    >
      <el-form 
        :model="brandDialog.form" 
        :rules="brandRules" 
        ref="brandFormRef"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="品牌名称" prop="name">
              <el-input v-model="brandDialog.form.name" placeholder="请输入品牌名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="国家/地区" prop="country">
              <el-select v-model="brandDialog.form.country" placeholder="请选择国家或地区" style="width: 100%">
                <el-option label="中国" value="中国" />
                <el-option label="美国" value="美国" />
                <el-option label="德国" value="德国" />
                <el-option label="日本" value="日本" />
                <el-option label="韩国" value="韩国" />
                <el-option label="法国" value="法国" />
                <el-option label="英国" value="英国" />
                <el-option label="意大利" value="意大利" />
                <el-option label="瑞典" value="瑞典" />
                <el-option label="捷克" value="捷克" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="成立年份" prop="founded_year">
              <el-input-number 
                v-model="brandDialog.form.founded_year" 
                :min="1800" 
                :max="new Date().getFullYear()"
                placeholder="成立年份"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="热门品牌" prop="popular">
              <el-switch 
                v-model="brandDialog.form.popular"
                active-text="是"
                inactive-text="否"
              />
              <span class="form-tip">热门品牌会在首页优先显示</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="品牌Logo" prop="logo">
          <div class="logo-upload-container">
            <!-- 当前Logo显示 -->
            <div class="current-logo" v-if="brandDialog.form.logo && !logoPreview">
              <img :src="brandDialog.form.logo" alt="当前Logo" class="logo-preview-img" />
              <p>当前Logo</p>
            </div>
            
            <!-- 新Logo预览 -->
            <div class="new-logo" v-if="logoPreview">
              <img :src="logoPreview" alt="新Logo预览" class="logo-preview-img" />
              <p>{{ brandDialog.isEdit ? '新Logo预览' : 'Logo预览' }}</p>
            </div>
            
            <!-- 如果没有Logo -->
            <div class="no-logo" v-if="!brandDialog.form.logo && !logoPreview">
              <div class="logo-placeholder">
                <i class="el-icon-picture"></i>
                <p>暂无Logo</p>
              </div>
            </div>
            
            <!-- 上传控件 -->
            <el-upload
              class="logo-uploader"
              action=""
              :show-file-list="false"
              :before-upload="beforeLogoUpload"
              :auto-upload="false"
              :on-change="handleLogoChange"
              accept="image/*"
            >
              <el-button type="primary" icon="el-icon-upload" size="small">
                {{ logoPreview || brandDialog.form.logo ? '更换Logo' : '选择Logo' }}
              </el-button>
            </el-upload>
            
            <!-- 取消按钮 -->
            <div class="logo-actions" v-if="logoPreview">
              <el-button size="small" @click="cancelLogoUpload">取消选择</el-button>
            </div>
            
            <!-- 上传提示 -->
            <div class="upload-tips">
              <p>• 支持 JPG、PNG、GIF 格式</p>
              <p>• 文件大小不超过 5MB</p>
              <p>• 建议尺寸: 200x200 像素</p>
              <p v-if="logoPreview" class="save-tip">• 点击下方"{{ brandDialog.isEdit ? '更新' : '创建' }}"按钮即可保存品牌信息并上传Logo</p>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="品牌描述" prop="description">
          <el-input 
            v-model="brandDialog.form.description" 
            type="textarea"
            :rows="4"
            placeholder="请输入品牌描述，包括品牌历史、特色、定位等信息"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <!-- 只读字段显示 -->
        <el-row :gutter="20" v-if="brandDialog.isEdit">
          <el-col :span="12">
            <el-form-item label="创建时间">
              <el-input :value="formatDate(brandDialog.form.createdAt)" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="更新时间">
              <el-input :value="formatDate(brandDialog.form.updatedAt)" readonly />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer">
        <el-button @click="brandDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveBrand" :loading="brandDialog.saving">
          {{ brandDialog.isEdit ? '更新' : '创建' }}
        </el-button>
      </div>
    </el-dialog>

    <!-- 车型编辑对话框 -->
    <el-dialog 
      :visible.sync="modelDialog.visible" 
      :title="modelDialog.isEdit ? '编辑车型' : '新增车型'"
      width="900px"
    >
      <el-form 
        :model="modelDialog.form" 
        :rules="modelRules" 
        ref="modelFormRef"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车型名称" prop="name">
              <el-input v-model="modelDialog.form.name" placeholder="请输入车型名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车型类型" prop="type">
              <el-select v-model="modelDialog.form.type" placeholder="请选择车型类型" style="width: 100%">
                <el-option label="轿车" value="轿车" />
                <el-option label="SUV" value="SUV" />
                <el-option label="MPV" value="MPV" />
                <el-option label="WAGON" value="WAGON" />
                <el-option label="SHOOTINGBRAKE" value="SHOOTINGBRAKE" />
                <el-option label="皮卡" value="皮卡" />
                <el-option label="跑车" value="跑车" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="年份" prop="year">
              <el-input-number 
                v-model="modelDialog.form.year" 
                :min="1900" 
                :max="new Date().getFullYear() + 2"
                placeholder="年份"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="价格" prop="price">
              <el-input-number 
                v-model="modelDialog.form.price" 
                :min="0" 
                :precision="2"
                placeholder="价格（元）"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="isActive">
              <el-switch 
                v-model="modelDialog.form.isActive"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="缩略图" prop="thumbnail">
          <el-input 
            v-model="modelDialog.form.thumbnail" 
            placeholder="请输入缩略图URL"
          />
          <div class="thumbnail-preview" v-if="modelDialog.form.thumbnail">
            <img :src="modelDialog.form.thumbnail" alt="缩略图预览" @error="handleThumbnailError" />
          </div>
        </el-form-item>

        <el-form-item label="车型描述" prop="description">
          <el-input 
            v-model="modelDialog.form.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入车型描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <!-- 车型规格参数 -->
        <el-form-item label="规格参数" prop="specs">
          <div class="specs-editor">
            <el-button type="text" @click="addSpecItem" style="margin-bottom: 10px;">
              <i class="el-icon-plus"></i> 添加参数
            </el-button>
            <div v-for="(spec, index) in modelDialog.form.specs" :key="index" class="spec-item">
              <el-row :gutter="10">
                <el-col :span="8">
                  <el-select v-model="spec.key" placeholder="选择参数类型" filterable allow-create>
                    <el-option-group label="车身尺寸">
                      <el-option label="长度" value="dimensions.length" />
                      <el-option label="宽度" value="dimensions.width" />
                      <el-option label="高度" value="dimensions.height" />
                      <el-option label="轴距" value="dimensions.wheelbase" />
                    </el-option-group>
                    <el-option-group label="轮胎参数">
                      <el-option label="前轮胎" value="front_tire" />
                      <el-option label="后轮胎" value="rear_tire" />
                    </el-option-group>
                    <el-option-group label="其他参数">
                      <el-option label="车门数" value="doors" />
                      <el-option label="驱动方式" value="drive" />
                      <el-option label="车身结构" value="body_structure" />
                    </el-option-group>
                  </el-select>
                </el-col>
                <el-col :span="10">
                  <el-input v-model="spec.value" :placeholder="getSpecPlaceholder(spec.key)" />
                </el-col>
                <el-col :span="2">
                  <span class="spec-unit">{{ getSpecUnit(spec.key) }}</span>
                </el-col>
                <el-col :span="4">
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="removeSpecItem(index)"
                    icon="el-icon-delete"
                  />
                </el-col>
              </el-row>
              <div v-if="spec.displayKey" class="spec-display-name">
                {{ spec.displayKey }}
              </div>
            </div>
          </div>
        </el-form-item>

        <!-- 只读字段显示 -->
        <el-row :gutter="20" v-if="modelDialog.isEdit">
          <el-col :span="8">
            <el-form-item label="品牌ID">
              <el-input :value="modelDialog.form.brandId" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="创建时间">
              <el-input :value="formatDate(modelDialog.form.createdAt)" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="更新时间">
              <el-input :value="formatDate(modelDialog.form.updatedAt)" readonly />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer">
        <el-button @click="modelDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveModel" :loading="modelDialog.saving">
          {{ modelDialog.isEdit ? '更新' : '创建' }}
        </el-button>
      </div>
    </el-dialog>

    <!-- 图片上传对话框 -->
    <el-dialog 
      :visible.sync="uploadDialog.visible" 
      :title="uploadDialog.type === 'single' ? '单图上传' : '批量上传'"
      width="600px"
    >
      <el-form 
        :model="uploadDialog.form" 
        :rules="uploadRules" 
        ref="uploadFormRef"
        label-width="100px"
      >
        <el-form-item label="图片分类" prop="category">
          <el-select v-model="uploadDialog.form.category" placeholder="请选择分类">
            <el-option label="外观图" value="exterior" />
            <el-option label="内饰图" value="interior" />
            <el-option label="细节图" value="details" />
            <el-option label="其他" value="general" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="uploadDialog.type === 'single'" label="图片标题" prop="title">
          <el-input v-model="uploadDialog.form.title" placeholder="请输入图片标题（可选）" />
        </el-form-item>

        <el-form-item v-if="uploadDialog.type === 'single'" label="图片描述" prop="description">
          <el-input 
            v-model="uploadDialog.form.description" 
            type="textarea"
            :rows="2"
            placeholder="请输入图片描述（可选）"
          />
        </el-form-item>

        <el-form-item label="设为特色图">
          <el-switch v-model="uploadDialog.form.isFeatured" />
          <span class="form-tip">特色图片会在列表中优先显示</span>
        </el-form-item>

        <!-- 单图上传 -->
        <el-form-item v-if="uploadDialog.type === 'single'" label="选择图片" required>
          <el-upload
            ref="singleUploadRef"
            class="image-uploader"
            action=""
            :show-file-list="false"
            :before-upload="handleSingleUpload"
            :http-request="() => {}"
            accept="image/*"
          >
            <div class="upload-area">
              <img v-if="uploadDialog.form.imagePreview" :src="uploadDialog.form.imagePreview" class="preview-image" />
              <div v-else class="upload-placeholder">
                <i class="el-icon-plus upload-icon"></i>
                <div class="upload-text">点击选择图片</div>
              </div>
            </div>
          </el-upload>
        </el-form-item>

        <!-- 批量上传 -->
        <el-form-item v-if="uploadDialog.type === 'multiple'" label="选择图片" required>
          <!-- 使用原生文件选择，不依赖Element UI的文件管理 -->
          <div class="custom-batch-uploader">
            <input 
              ref="fileInput"
              type="file" 
              multiple 
              accept="image/*" 
              @change="handleFileInputChange"
              style="display: none;"
            />
            
            <!-- 文件选择按钮 -->
            <el-button type="primary" @click="$refs.fileInput.click()">
              <i class="el-icon-plus"></i> 选择图片文件
            </el-button>
            
            <!-- 已选择的文件列表 -->
            <div v-if="customFileList.length > 0" class="custom-file-list">
              <div class="file-list-header">
                <span>已选择 {{ customFileList.length }} 个文件:</span>
                <el-button size="mini" type="text" @click="clearAllFiles">清空</el-button>
              </div>
              
              <div class="file-items">
                <div 
                  v-for="(file, index) in customFileList" 
                  :key="index" 
                  class="file-item"
                >
                  <div class="file-preview">
                    <img :src="file.preview" alt="预览图" />
                  </div>
                  <div class="file-info">
                    <div class="file-name">{{ file.name }}</div>
                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                  </div>
                  <el-button 
                    type="danger" 
                    size="mini" 
                    icon="el-icon-delete"
                    @click="removeFile(index)"
                    circle
                  />
                </div>
              </div>
            </div>
          </div>
          
          <!-- 批量上传进度条 -->
          <div v-if="uploadDialog.uploading && uploadDialog.type === 'multiple'" class="upload-progress">
            <div class="progress-header">
              <span>批量上传进度 ({{ uploadProgress.current }}/{{ uploadProgress.total }})</span>
              <span>{{ Math.round(uploadProgress.percentage) }}%</span>
            </div>
            <el-progress 
              :percentage="uploadProgress.percentage" 
              :status="uploadProgress.status"
              :stroke-width="8"
            />
            <div class="progress-details">
              <p v-if="uploadProgress.currentFile">正在上传: {{ uploadProgress.currentFile }}</p>
              <p class="success-count" v-if="uploadProgress.successCount > 0">
                已成功: {{ uploadProgress.successCount }} 个文件
              </p>
              <p class="error-count" v-if="uploadProgress.errorCount > 0">
                上传失败: {{ uploadProgress.errorCount }} 个文件
              </p>
            </div>
          </div>
        </el-form-item>

        <!-- 文件夹上传 -->
        <el-form-item v-if="uploadDialog.type === 'folder'" label="选择文件夹" required>
          <!-- 使用原生文件夹选择 -->
          <div class="custom-folder-uploader">
            <input 
              ref="folderInput"
              type="file" 
              webkitdirectory
              directory
              multiple 
              accept="image/*" 
              @change="handleFolderInputChange"
              style="display: none;"
            />
            
            <!-- 文件夹选择按钮 -->
            <el-button type="warning" @click="$refs.folderInput.click()">
              <i class="el-icon-folder-opened"></i> 选择图片文件夹
            </el-button>
            
            <!-- 已选择的文件夹文件列表 -->
            <div v-if="folderFileList.length > 0" class="custom-file-list">
              <div class="file-list-header">
                <span>已选择 {{ folderFileList.length }} 个文件:</span>
                <el-button size="mini" type="text" @click="clearAllFolderFiles">清空</el-button>
              </div>
              
              <div class="file-items">
                <div 
                  v-for="(file, index) in folderFileList" 
                  :key="index" 
                  class="file-item"
                >
                  <div class="file-preview">
                    <img :src="file.preview" alt="预览图" />
                  </div>
                  <div class="file-info">
                    <div class="file-name">{{ file.name }}</div>
                    <div class="file-path">{{ file.path }}</div>
                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                  </div>
                  <el-button 
                    type="danger" 
                    size="mini" 
                    icon="el-icon-delete"
                    @click="removeFolderFile(index)"
                    circle
                  />
                </div>
              </div>
            </div>
          </div>
          
          <!-- 文件夹上传进度条 -->
          <div v-if="uploadDialog.uploading && uploadDialog.type === 'folder'" class="upload-progress">
            <div class="progress-header">
              <span>文件夹上传进度 ({{ uploadProgress.current }}/{{ uploadProgress.total }})</span>
              <span>{{ Math.round(uploadProgress.percentage) }}%</span>
            </div>
            <el-progress 
              :percentage="uploadProgress.percentage" 
              :status="uploadProgress.status"
              :stroke-width="8"
            />
            <div class="progress-details">
              <p v-if="uploadProgress.currentFile">正在上传: {{ uploadProgress.currentFile }}</p>
              <p class="success-count" v-if="uploadProgress.successCount > 0">
                已成功: {{ uploadProgress.successCount }} 个文件
              </p>
              <p class="error-count" v-if="uploadProgress.errorCount > 0">
                上传失败: {{ uploadProgress.errorCount }} 个文件
              </p>
            </div>
          </div>
        </el-form-item>
      </el-form>
      
      <div slot="footer">
        <el-button @click="uploadDialog.visible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleUploadClick" 
          :loading="uploadDialog.uploading"
          :disabled="!canUpload"
        >
          {{ uploadDialog.uploading ? '上传中...' : '开始上传' }}
        </el-button>
        
        <!-- 调试信息 -->
        <div style="margin-top: 10px; font-size: 12px; color: #666;" v-if="false">
          <p>调试信息:</p>
          <p>canUpload: {{ canUpload }}</p>
          <p>uploading: {{ uploadDialog.uploading }}</p>
          <p>按钮禁用: {{ !canUpload }}</p>
          <p>Element UI文件数量: {{ uploadDialog.form.fileList.length }}</p>
          <p>自定义文件数量: {{ customFileList.length }}</p>
          <p>分类: {{ uploadDialog.form.category }}</p>
        </div>
      </div>
    </el-dialog>

    <!-- 图片预览对话框 -->
    <el-dialog 
      :visible.sync="previewDialog.visible" 
      title="图片预览" 
      width="80%"
      center
    >
      <div v-if="previewDialog.image" class="image-preview-dialog">
        <div class="preview-image-container">
          <img :src="previewDialog.image.url" :alt="previewDialog.image.title" />
        </div>
        <div class="preview-info">
          <h3>{{ previewDialog.image.title || '无标题' }}</h3>
          <p><strong>分类:</strong> {{ getCategoryName(previewDialog.image.category) }}</p>
          <p><strong>文件名:</strong> {{ previewDialog.image.filename }}</p>
          <p><strong>文件大小:</strong> {{ formatFileSize(previewDialog.image.fileSize) }}</p>
          <p><strong>上传时间:</strong> {{ formatDate(previewDialog.image.uploadDate) }}</p>
          <p v-if="previewDialog.image.description"><strong>描述:</strong> {{ previewDialog.image.description }}</p>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑图片信息对话框 -->
    <el-dialog 
      :visible.sync="editImageDialog.visible" 
      title="编辑图片信息" 
      width="800px"
    >
      <el-form 
        :model="editImageDialog.form" 
        :rules="editImageRules" 
        ref="editImageFormRef"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="图片标题" prop="title">
              <el-input 
                v-model="editImageDialog.form.title" 
                placeholder="请输入图片标题"
                maxlength="255"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="图片分类" prop="category">
              <el-select v-model="editImageDialog.form.category" placeholder="请选择图片分类" style="width: 100%">
                <el-option label="外观图" value="exterior" />
                <el-option label="内饰图" value="interior" />
                <el-option label="细节图" value="details" />
                <el-option label="其他" value="general" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="图片描述" prop="description">
          <el-input 
            v-model="editImageDialog.form.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入图片描述"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="图片URL" prop="url">
              <el-input 
                v-model="editImageDialog.form.url" 
                placeholder="图片访问链接"
                readonly
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="文件名" prop="filename">
              <el-input 
                v-model="editImageDialog.form.filename" 
                placeholder="文件名"
                readonly
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="文件大小" prop="fileSize">
              <el-input 
                :value="formatFileSize(editImageDialog.form.fileSize)" 
                readonly
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="文件类型" prop="fileType">
              <el-input 
                v-model="editImageDialog.form.fileType" 
                readonly
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="设为特色图">
              <el-switch 
                v-model="editImageDialog.form.isFeatured"
                active-text="是"
                inactive-text="否"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 只读字段显示 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="所属车型ID">
              <el-input :value="editImageDialog.form.modelId" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="上传时间">
              <el-input :value="formatDate(editImageDialog.form.uploadDate)" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="更新时间">
              <el-input :value="formatDate(editImageDialog.form.updatedAt)" readonly />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 图片预览 -->
        <el-form-item label="图片预览" v-if="editImageDialog.form.url">
          <div class="image-preview-large">
            <img :src="editImageDialog.form.url" alt="图片预览" @error="handleImageError" />
          </div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editImageDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveImageInfo" :loading="editImageDialog.saving">
          {{ editImageDialog.saving ? '保存中...' : '保存' }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios'

// 创建带有认证的axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// 添加请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default {
  name: 'ComprehensiveManagement',
  data() {
    return {
      // 响应式数据
      activeTab: 'brands',
      brands: [],
      models: [],
      selectedBrandId: '',
      selectedModelPath: [],
      selectedModelId: '',
      
      // 加载状态
      brandsLoading: false,
      modelsLoading: false,
      imagesLoading: false,
      
      // 搜索表单
      searchForm: {
        category: '',
        search: ''
      },
      
      // 分页
      pagination: {
        page: 1,
        limit: 12,
        total: 0
      },
      
      // 图片列表
      imagesList: [],
      
      // 对话框状态
      brandDialog: {
        visible: false,
        isEdit: false,
        saving: false,
        form: {
          name: '',
          country: '',
          logo: '',
          founded_year: null,
          description: '',
          popular: false,
          createdAt: null,
          updatedAt: null
        }
      },
      
      modelDialog: {
        visible: false,
        isEdit: false,
        saving: false,
        form: {
          name: '',
          type: '其他',
          year: null,
          price: null,
          description: '',
          isActive: true,
          thumbnail: '',
          specs: []
        }
      },
      
      uploadDialog: {
        visible: false,
        type: 'single', // 'single' | 'multiple'
        uploading: false,
        form: {
          category: 'general',
          title: '',
          description: '',
          isFeatured: false,
          imageFile: null,
          imagePreview: '',
          fileList: []
        }
      },
      
      previewDialog: {
        visible: false,
        image: null
      },
      
      editImageDialog: {
        visible: false,
        saving: false,
        form: {
          id: null,
          title: '',
          description: '',
          category: 'general',
          isFeatured: false,
          url: '',
          filename: '',
          fileSize: null,
          fileType: '',
          modelId: null,
          uploadDate: null,
          createdAt: null,
          updatedAt: null
        }
      },
      
      // 表单验证规则
      brandRules: {
        name: [{ required: true, message: '请输入品牌名称', trigger: 'blur' }]
      },
      
      modelRules: {
        name: [{ required: true, message: '请输入车型名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择车型类型', trigger: 'change' }]
      },
      
      uploadRules: {
        category: [{ required: true, message: '请选择图片分类', trigger: 'change' }]
      },
      
      editImageRules: {
        title: [{ required: true, message: '请输入图片标题', trigger: 'blur' }],
        description: [{ required: true, message: '请输入图片描述', trigger: 'blur' }],
        category: [{ required: true, message: '请选择图片分类', trigger: 'change' }]
      },
      
      // 级联选择器配置
      cascaderProps: {
        value: 'id',
        label: 'name',
        children: 'models',
        emitPath: false
      },
      
      // Logo上传相关
      logoPreview: null,
      logoUploading: false,
      selectedLogoFile: null,
      
      // 上传进度跟踪
      uploadProgress: {
        current: 0,
        total: 0,
        percentage: 0,
        status: '',
        currentFile: '',
        successCount: 0,
        errorCount: 0
      },
      
      // 自定义文件列表（绕过Element UI的文件管理）
      customFileList: [],
      
      // 文件夹上传相关
      folderFileList: []
    }
  },
  
  computed: {
    brandModelOptions() {
      return this.brands.map(brand => ({
        id: brand.id,
        name: brand.name,
        models: (brand.Models || []).map(model => ({
          id: model.id,
          name: model.name
        }))
      }))
    },
    
    canUpload() {
      console.log('=== canUpload 计算调试 ===');
      console.log('上传类型:', this.uploadDialog.type);
      console.log('Element UI文件列表:', this.uploadDialog.form.fileList);
      console.log('自定义文件列表:', this.customFileList);
      console.log('自定义文件列表长度:', this.customFileList.length);
      console.log('文件夹文件列表:', this.folderFileList);
      console.log('文件夹文件列表长度:', this.folderFileList.length);
      console.log('分类:', this.uploadDialog.form.category);
      console.log('单文件:', this.uploadDialog.form.imageFile);
      
      if (this.uploadDialog.type === 'single') {
        const hasFile = !!this.uploadDialog.form.imageFile;
        const hasCategory = !!this.uploadDialog.form.category;
        console.log('单文件上传 - 有文件:', hasFile, '有分类:', hasCategory);
        const result = hasFile && hasCategory;
        console.log('单文件上传结果:', result);
        return result;
      } else if (this.uploadDialog.type === 'multiple') {
        // 使用自定义文件列表
        const hasFiles = this.customFileList.length > 0;
        const hasCategory = !!this.uploadDialog.form.category;
        console.log('批量上传 - 有文件:', hasFiles, '有分类:', hasCategory);
        const result = hasFiles && hasCategory;
        console.log('批量上传结果:', result);
        return result;
      } else if (this.uploadDialog.type === 'folder') {
        // 使用文件夹文件列表
        const hasFiles = this.folderFileList.length > 0;
        const hasCategory = !!this.uploadDialog.form.category;
        console.log('文件夹上传 - 有文件:', hasFiles, '有分类:', hasCategory);
        const result = hasFiles && hasCategory;
        console.log('文件夹上传结果:', result);
        return result;
      }
    }
  },
  
  mounted() {
    this.loadBrands()
  },
  
  methods: {
    // ==================== 品牌管理方法 ====================
    async loadBrands() {
      this.brandsLoading = true
      try {
        const response = await apiClient.get('/upload/brands')
        if (response.data.status === 'success') {
          this.brands = response.data.data
        }
      } catch (error) {
        console.error('加载品牌列表失败:', error)
        this.$message.error('加载品牌列表失败')
      } finally {
        this.brandsLoading = false
      }
    },
    
    showBrandDialog(brand) {
      this.brandDialog.isEdit = !!brand
      this.brandDialog.form = brand ? {
        ...brand
      } : {
        name: '',
        country: '中国',
        logo: '',
        founded_year: null,
        description: '',
        popular: false,
        createdAt: null,
        updatedAt: null
      }
      
      // 清理logo上传状态
      this.cancelLogoUpload()
      
      this.brandDialog.visible = true
    },
    
    async saveBrand() {
      if (!this.$refs.brandFormRef) return
      
      try {
        await this.$refs.brandFormRef.validate()
        this.brandDialog.saving = true
        
        if (this.brandDialog.isEdit) {
          // 编辑品牌 - 只更新基本信息
          const url = `/upload/brands/${this.brandDialog.form.id}`
          const response = await apiClient.put(url, this.brandDialog.form)
          
          if (response.data.status === 'success') {
            // 如果有新的logo需要上传
            if (this.selectedLogoFile) {
              await this.uploadLogoForBrand(this.brandDialog.form.id)
            }
            
            this.$message.success(response.data.message)
            this.brandDialog.visible = false
            this.loadBrands()
          } else {
            this.$message.error(response.data.message)
          }
        } else {
          // 新建品牌 - 先创建品牌，如果有logo则立即上传
          const response = await apiClient.post('/upload/brands', this.brandDialog.form)
          
          if (response.data.status === 'success') {
            const newBrand = response.data.data
            
            // 如果用户选择了logo文件，立即上传
            if (this.selectedLogoFile) {
              try {
                await this.uploadLogoForBrand(newBrand.id)
                this.$message.success('品牌创建成功，Logo上传成功！')
              } catch (logoError) {
                this.$message.warning('品牌创建成功，但Logo上传失败，您可以稍后重新上传')
                console.error('Logo上传失败:', logoError)
              }
            } else {
              this.$message.success('品牌创建成功！')
            }
            
            this.brandDialog.visible = false
            this.loadBrands()
          } else {
            this.$message.error(response.data.message)
          }
        }
      } catch (error) {
        console.error('保存品牌失败:', error)
        this.$message.error('保存品牌失败')
      } finally {
        this.brandDialog.saving = false
      }
    },
    
    // 提取logo上传逻辑为独立方法
    async uploadLogoForBrand(brandId) {
      if (!this.selectedLogoFile) return
      
      const formData = new FormData()
      formData.append('logo', this.selectedLogoFile)
      
      const response = await apiClient.post(
        `/upload/brands/${brandId}/logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      if (response.data.status === 'success') {
        // 更新品牌信息
        this.brandDialog.form.logo = response.data.data.logo
        // 清理上传状态
        this.cancelLogoUpload()
        return response.data
      } else {
        throw new Error(response.data.message || 'Logo上传失败')
      }
    },
    
    async deleteBrand(brand) {
      try {
        await this.$confirm(
          `确定要删除品牌 "${brand.name}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const response = await apiClient.delete(`/upload/brands/${brand.id}`)
        if (response.data.status === 'success') {
          this.$message.success('品牌删除成功')
          this.loadBrands()
        } else {
          this.$message.error(response.data.message)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除品牌失败:', error)
          this.$message.error('删除品牌失败')
        }
      }
    },
    
    manageBrandModels(brand) {
      this.selectedBrandId = brand.id
      this.activeTab = 'models'
      this.loadModelsByBrand()
    },
    
    // ==================== 车型管理方法 ====================
    async loadModelsByBrand() {
      if (!this.selectedBrandId) {
        this.models = []
        return
      }
      
      this.modelsLoading = true
      try {
        const response = await apiClient.get(`/upload/brands/${this.selectedBrandId}/models`)
        if (response.data.status === 'success') {
          this.models = response.data.data
        }
      } catch (error) {
        console.error('加载车型列表失败:', error)
        this.$message.error('加载车型列表失败')
      } finally {
        this.modelsLoading = false
      }
    },
    
    showModelDialog(model) {
      this.modelDialog.isEdit = !!model
      this.modelDialog.form = model ? {
        ...model,
        specs: this.convertSpecsToArray(model.specs)
      } : {
        name: '',
        type: '其他',
        year: null,
        price: null,
        description: '',
        isActive: true,
        thumbnail: '',
        specs: []
      }
      this.modelDialog.visible = true
    },
    
    async saveModel() {
      if (!this.$refs.modelFormRef) return
      
      try {
        await this.$refs.modelFormRef.validate()
        this.modelDialog.saving = true
        
        const modelData = {
          ...this.modelDialog.form,
          brandId: this.selectedBrandId,
          specs: this.convertArrayToSpecs(this.modelDialog.form.specs)
        }
        
        const url = this.modelDialog.isEdit 
          ? `/upload/models/${this.modelDialog.form.id}`
          : `/upload/models`
        
        const method = this.modelDialog.isEdit ? 'put' : 'post'
        
        const response = await apiClient[method](url, modelData)
        
        if (response.data.status === 'success') {
          this.$message.success(response.data.message)
          this.modelDialog.visible = false
          this.loadModelsByBrand()
        } else {
          this.$message.error(response.data.message)
        }
      } catch (error) {
        console.error('保存车型失败:', error)
        this.$message.error('保存车型失败')
      } finally {
        this.modelDialog.saving = false
      }
    },
    
    async deleteModel(model) {
      try {
        await this.$confirm(
          `确定要删除车型 "${model.name}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const response = await apiClient.delete(`/upload/models/${model.id}`)
        if (response.data.status === 'success') {
          this.$message.success('车型删除成功')
          this.loadModelsByBrand()
        } else {
          this.$message.error(response.data.message)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除车型失败:', error)
          this.$message.error('删除车型失败')
        }
      }
    },
    
    manageModelImages(model) {
      this.selectedModelId = model.id
      this.selectedModelPath = [model.brandId, model.id]
      this.activeTab = 'images'
      this.loadImages()
    },
    
    // ==================== 图片管理方法 ====================
    handleModelSelect(value) {
      this.selectedModelId = value
      this.pagination.page = 1
      this.loadImages()
    },
    
    showUploadDialog(type) {
      this.uploadDialog.type = type
      this.uploadDialog.visible = true
      this.resetUploadForm()
    },
    
    handleSingleUpload(file) {
      // 验证文件
      if (!file.type.startsWith('image/')) {
        this.$message.error('只能上传图片文件')
        return false
      }
      
      if (file.size > 10 * 1024 * 1024) {
        this.$message.error('文件大小不能超过 10MB')
        return false
      }
      
      // 设置文件和预览
      this.uploadDialog.form.imageFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.uploadDialog.form.imagePreview = e.target.result
      }
      reader.readAsDataURL(file)
      
      return false // 阻止自动上传
    },
    
    handleBatchUpload(file) {
      // 验证文件
      if (!file.type.startsWith('image/')) {
        this.$message.error(`文件 ${file.name} 不是图片格式`)
        return false
      }
      
      if (file.size > 10 * 1024 * 1024) {
        this.$message.error(`文件 ${file.name} 大小超过 10MB`)
        return false
      }
      
      return false // 阻止自动上传
    },
    
    handleBatchFileChange(file, fileList) {
      console.log('=== 批量上传文件变化调试 ===');
      console.log('文件对象:', file);
      console.log('当前文件列表:', fileList);
      console.log('file.raw存在:', !!file.raw);
      if (file.raw) {
        console.log('文件类型:', file.raw.type);
        console.log('文件大小:', file.raw.size);
        console.log('文件名:', file.raw.name);
      }
      
      // 验证文件
      if (file.raw && !file.raw.type.startsWith('image/')) {
        this.$message.error(`文件 ${file.name} 不是图片格式`)
        // 从文件列表中移除这个文件
        const filteredList = fileList.filter(f => f.uid !== file.uid)
        this.$set(this.uploadDialog.form, 'fileList', filteredList)
        console.log('移除非图片文件后的列表:', this.uploadDialog.form.fileList);
        return
      }
      
      if (file.raw && file.raw.size > 10 * 1024 * 1024) {
        this.$message.error(`文件 ${file.name} 大小超过 10MB`)
        // 从文件列表中移除这个文件
        const filteredList = fileList.filter(f => f.uid !== file.uid)
        this.$set(this.uploadDialog.form, 'fileList', filteredList)
        console.log('移除过大文件后的列表:', this.uploadDialog.form.fileList);
        return
      }
      
      // 只保留通过验证的文件
      const validFiles = fileList.filter(f => {
        if (!f.raw) return true // 保留已经存在的文件
        return f.raw.type.startsWith('image/') && f.raw.size <= 10 * 1024 * 1024
      })
      
      // 使用Vue.set确保响应式更新
      this.$set(this.uploadDialog.form, 'fileList', validFiles)
      
      console.log('最终更新的文件列表:', this.uploadDialog.form.fileList);
      console.log('文件列表长度:', this.uploadDialog.form.fileList.length);
      console.log('当前category:', this.uploadDialog.form.category);
      console.log('选中的车型ID:', this.selectedModelId);
      
      // 强制触发canUpload重新计算
      this.$nextTick(() => {
        console.log('nextTick后的canUpload计算结果:', this.canUpload);
      })
    },
    
    handleRemoveFile(file) {
      console.log('移除文件:', file.name);
      const index = this.uploadDialog.form.fileList.findIndex(f => f.uid === file.uid)
      if (index > -1) {
        // 使用splice确保响应式更新
        this.uploadDialog.form.fileList.splice(index, 1)
        console.log('移除后文件列表长度:', this.uploadDialog.form.fileList.length);
      }
    },
    
    async submitUpload() {
      if (!this.$refs.uploadFormRef) return
      
      try {
        await this.$refs.uploadFormRef.validate()
        
        if (!this.canUpload) {
          this.$message.error('请选择要上传的图片')
          return
        }
        
        // 检查是否选择了车型
        if (!this.selectedModelId) {
          this.$message.error('请先选择车型')
          return
        }
        
        // 检查用户认证
        const token = localStorage.getItem('token')
        if (!token) {
          this.$message.error('请先登录后再上传图片')
          return
        }
        
        this.uploadDialog.uploading = true
        
        if (this.uploadDialog.type === 'single') {
          await this.uploadSingleFile()
        } else if (this.uploadDialog.type === 'multiple') {
          await this.uploadMultipleFiles()
        } else if (this.uploadDialog.type === 'folder') {
          await this.uploadFolderFiles()
        }
        
      } catch (error) {
        console.error('上传失败详细错误:', error)
        if (error.response) {
          console.error('错误响应状态:', error.response.status)
          console.error('错误响应数据:', error.response.data)
          console.error('错误响应头:', error.response.headers)
        }
        const errorMessage = (error.response && error.response.data && error.response.data.message) || '上传失败'
        this.$message.error(errorMessage)
      } finally {
        this.uploadDialog.uploading = false
      }
    },
    
    // 单文件上传
    async uploadSingleFile() {
      console.log('=== 单文件上传 ===');
      console.log('文件:', this.uploadDialog.form.imageFile);
      console.log('标题:', this.uploadDialog.form.title);
      console.log('描述:', this.uploadDialog.form.description);
      
      const formData = new FormData()
      formData.append('image', this.uploadDialog.form.imageFile)
      formData.append('title', this.uploadDialog.form.title)
      formData.append('description', this.uploadDialog.form.description)
      formData.append('modelId', this.selectedModelId)
      formData.append('category', this.uploadDialog.form.category)
      formData.append('isFeatured', this.uploadDialog.form.isFeatured)
      
      const response = await apiClient.post('/upload/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (response.data.status === 'success') {
        this.$message.success('图片上传成功')
        this.uploadDialog.visible = false
        this.resetUploadForm()
        this.loadImages()
      } else {
        this.$message.error(response.data.message || '上传失败')
      }
    },
    
    // 批量文件上传（带进度）
    async uploadMultipleFiles() {
      console.log('=== 批量文件上传 ===');
      
      const files = this.customFileList; // 使用自定义文件列表
      console.log('有效文件数量:', files.length);
      
      // 初始化进度
      this.uploadProgress = {
        current: 0,
        total: files.length,
        percentage: 0,
        status: 'active',
        currentFile: '',
        successCount: 0,
        errorCount: 0
      }
      
      const results = []
      
      // 逐个上传文件
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i]
        this.uploadProgress.current = i + 1
        this.uploadProgress.currentFile = fileItem.name
        this.uploadProgress.percentage = ((i + 1) / files.length) * 100
        
        console.log(`上传文件 ${i + 1}/${files.length}: ${fileItem.name}`);
        
        try {
          const formData = new FormData()
          formData.append('image', fileItem.file) // 使用file属性
          formData.append('title', `${fileItem.name}`)
          formData.append('description', '')
          formData.append('modelId', this.selectedModelId)
          formData.append('category', this.uploadDialog.form.category)
          formData.append('isFeatured', i === 0 && this.uploadDialog.form.isFeatured) // 第一张设为特色
          
          const response = await apiClient.post('/upload/single', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          
          if (response.data.status === 'success') {
            this.uploadProgress.successCount++
            results.push({ success: true, filename: fileItem.name })
            console.log(`文件 ${fileItem.name} 上传成功`);
          } else {
            this.uploadProgress.errorCount++
            results.push({ success: false, filename: fileItem.name, error: response.data.message })
            console.log(`文件 ${fileItem.name} 上传失败:`, response.data.message);
          }
        } catch (error) {
          this.uploadProgress.errorCount++
          results.push({ success: false, filename: fileItem.name, error: error.message })
          console.log(`文件 ${fileItem.name} 上传异常:`, error);
        }
      }
      
      // 上传完成
      this.uploadProgress.status = this.uploadProgress.errorCount > 0 ? 'exception' : 'success'
      this.uploadProgress.currentFile = ''
      
      // 显示结果
      const successCount = this.uploadProgress.successCount
      const errorCount = this.uploadProgress.errorCount
      
      if (errorCount === 0) {
        this.$message.success(`批量上传完成！成功上传 ${successCount} 个文件`)
      } else if (successCount === 0) {
        this.$message.error(`批量上传失败！${errorCount} 个文件上传失败`)
      } else {
        this.$message.warning(`批量上传部分成功！成功 ${successCount} 个，失败 ${errorCount} 个`)
      }
      
      // 延迟关闭对话框，让用户看到最终结果
      setTimeout(() => {
        this.uploadDialog.visible = false
        this.resetUploadForm()
        this.loadImages()
      }, 2000)
    },
    
    // 文件夹上传（带进度）
    async uploadFolderFiles() {
      console.log('=== 文件夹上传 ===');
      
      const files = this.folderFileList; // 使用文件夹文件列表
      console.log('有效文件数量:', files.length);
      
      // 初始化进度
      this.uploadProgress = {
        current: 0,
        total: files.length,
        percentage: 0,
        status: 'active',
        currentFile: '',
        successCount: 0,
        errorCount: 0
      }
      
      const results = []
      
      // 逐个上传文件
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i]
        this.uploadProgress.current = i + 1
        this.uploadProgress.currentFile = fileItem.name
        this.uploadProgress.percentage = ((i + 1) / files.length) * 100
        
        console.log(`上传文件 ${i + 1}/${files.length}: ${fileItem.name}`);
        
        try {
          const formData = new FormData()
          formData.append('image', fileItem.file) // 使用file属性
          formData.append('title', `${fileItem.name}`)
          formData.append('description', '')
          formData.append('modelId', this.selectedModelId)
          formData.append('category', this.uploadDialog.form.category)
          formData.append('isFeatured', i === 0 && this.uploadDialog.form.isFeatured) // 第一张设为特色
          formData.append('path', fileItem.path) // 添加文件路径
          
          const response = await apiClient.post('/upload/single', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          
          if (response.data.status === 'success') {
            this.uploadProgress.successCount++
            results.push({ success: true, filename: fileItem.name })
            console.log(`文件 ${fileItem.name} 上传成功`);
          } else {
            this.uploadProgress.errorCount++
            results.push({ success: false, filename: fileItem.name, error: response.data.message })
            console.log(`文件 ${fileItem.name} 上传失败:`, response.data.message);
          }
        } catch (error) {
          this.uploadProgress.errorCount++
          results.push({ success: false, filename: fileItem.name, error: error.message })
          console.log(`文件 ${fileItem.name} 上传异常:`, error);
        }
      }
      
      // 上传完成
      this.uploadProgress.status = this.uploadProgress.errorCount > 0 ? 'exception' : 'success'
      this.uploadProgress.currentFile = ''
      
      // 显示结果
      const successCount = this.uploadProgress.successCount
      const errorCount = this.uploadProgress.errorCount
      
      if (errorCount === 0) {
        this.$message.success(`文件夹上传完成！成功上传 ${successCount} 个文件`)
      } else if (successCount === 0) {
        this.$message.error(`文件夹上传失败！${errorCount} 个文件上传失败`)
      } else {
        this.$message.warning(`文件夹上传部分成功！成功 ${successCount} 个，失败 ${errorCount} 个`)
      }
      
      // 延迟关闭对话框，让用户看到最终结果
      setTimeout(() => {
        this.uploadDialog.visible = false
        this.resetUploadForm()
        this.loadImages()
      }, 2000)
    },
    
    async loadImages() {
      if (!this.selectedModelId) return
      
      this.imagesLoading = true
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          modelId: this.selectedModelId,
          ...this.searchForm
        }
        
        const response = await apiClient.get('/upload/images', { params })
        if (response.data.status === 'success') {
          this.imagesList = response.data.data.images
          this.pagination.total = response.data.data.pagination.total
        }
      } catch (error) {
        console.error('加载图片列表失败:', error)
        this.$message.error('加载图片列表失败')
      } finally {
        this.imagesLoading = false
      }
    },
    
    async deleteImage(image) {
      try {
        await this.$confirm(
          `确定要删除图片 "${image.title || image.filename}" 吗？删除后将扣除10积分，此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const response = await apiClient.delete(`/upload/image/${image.id}`)
        if (response.data.status === 'success') {
          const pointsDeducted = (response.data.data && response.data.data.pointsDeducted) || 0;
          const message = pointsDeducted > 0 
            ? `图片删除成功，扣除${pointsDeducted}积分` 
            : '图片删除成功';
          this.$message.success(message);
          this.loadImages()
        } else {
          this.$message.error(response.data.message || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除图片失败:', error)
          this.$message.error('删除图片失败')
        }
      }
    },
    
    viewImage(image) {
      this.previewDialog.image = image
      this.previewDialog.visible = true
    },
    
    showEditImageDialog(image) {
      this.editImageDialog.form = {
        id: image.id,
        title: image.title,
        description: image.description,
        category: image.category,
        isFeatured: image.isFeatured,
        url: image.url,
        filename: image.filename,
        fileSize: image.fileSize,
        fileType: image.fileType,
        modelId: image.modelId,
        uploadDate: image.uploadDate,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt
      }
      this.editImageDialog.visible = true
    },
    
    // ==================== 工具方法 ====================
    resetUploadForm() {
      this.uploadDialog.form = {
        category: 'general',
        title: '',
        description: '',
        isFeatured: false,
        imageFile: null,
        imagePreview: '',
        fileList: []
      }
      
      // 清理自定义文件列表
      this.customFileList.forEach(item => {
        URL.revokeObjectURL(item.preview);
      });
      this.customFileList = [];
      
      // 清理文件夹文件列表
      this.folderFileList.forEach(item => {
        URL.revokeObjectURL(item.preview);
      });
      this.folderFileList = [];
      
      // 清理文件input
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
      
      // 清理文件夹input
      if (this.$refs.folderInput) {
        this.$refs.folderInput.value = '';
      }
      
      // 重置进度信息
      this.uploadProgress = {
        current: 0,
        total: 0,
        percentage: 0,
        status: '',
        currentFile: '',
        successCount: 0,
        errorCount: 0
      }
      
      if (this.$refs.uploadFormRef) {
        this.$refs.uploadFormRef.resetFields()
      }
    },
    
    resetImageSearch() {
      this.searchForm.category = ''
      this.searchForm.search = ''
      this.pagination.page = 1
      this.loadImages()
    },
    
    handleSizeChange(val) {
      this.pagination.limit = val
      this.pagination.page = 1
      this.loadImages()
    },
    
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadImages()
    },
    
    handleImageError(event) {
      event.target.src = '/placeholder-image.png'
    },
    
    getCategoryName(category) {
      const categoryMap = {
        exterior: '外观图',
        interior: '内饰图',
        details: '细节图',
        general: '其他'
      }
      return categoryMap[category] || '其他'
    },
    
    formatDate(dateString) {
      if (!dateString) return '未知'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    
    formatFileSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    formatPrice(price) {
      if (!price) return '未定价'
      return '¥' + price.toLocaleString()
    },
    
    async saveImageInfo() {
      if (!this.$refs.editImageFormRef) return
      
      try {
        await this.$refs.editImageFormRef.validate()
        this.editImageDialog.saving = true
        
        const url = `/upload/image/${this.editImageDialog.form.id}`
        
        const response = await apiClient.put(url, this.editImageDialog.form)
        
        if (response.data.status === 'success') {
          this.$message.success(response.data.message)
          this.editImageDialog.visible = false
          this.loadImages()
        } else {
          this.$message.error(response.data.message)
        }
      } catch (error) {
        console.error('保存图片信息失败:', error)
        this.$message.error('保存图片信息失败')
      } finally {
        this.editImageDialog.saving = false
      }
    },
    
    handleLogoChange(file) {
      console.log('选择Logo文件:', file);
      
      if (!file || !file.raw) {
        this.$message.error('请选择有效的文件')
        return false
      }
      
      // 验证文件
      if (!file.raw.type.startsWith('image/')) {
        this.$message.error('只能上传图片文件')
        return false
      }
      
      if (file.raw.size > 5 * 1024 * 1024) {
        this.$message.error('文件大小不能超过 5MB')
        return false
      }
      
      // 保存文件引用
      this.selectedLogoFile = file.raw
      
      // 设置预览
      const reader = new FileReader()
      reader.onload = (e) => {
        this.logoPreview = e.target.result
      }
      reader.readAsDataURL(file.raw)
      
      return false // 阻止自动上传
    },
    
    beforeLogoUpload(file) {
      console.log('beforeLogoUpload:', file);
      return false // 阻止自动上传，使用手动处理
    },
    
    cancelLogoUpload() {
      this.logoPreview = null
      this.selectedLogoFile = null
      this.logoUploading = false
    },
    
    addSpecItem() {
      // 确保specs是数组
      if (!Array.isArray(this.modelDialog.form.specs)) {
        this.modelDialog.form.specs = []
      }
      this.modelDialog.form.specs.push({ key: '', value: '' })
    },
    
    removeSpecItem(index) {
      // 确保specs是数组
      if (!Array.isArray(this.modelDialog.form.specs)) {
        this.modelDialog.form.specs = []
        return
      }
      this.modelDialog.form.specs.splice(index, 1)
    },
    
    convertSpecsToArray(specs) {
      if (!specs || typeof specs !== 'object') return []
      
      const result = []
      
      // 处理普通属性
      Object.entries(specs).forEach(([key, value]) => {
        if (key === 'dimensions' && typeof value === 'object' && value !== null) {
          // 将 dimensions 对象的属性展开为单独的键值对
          Object.entries(value).forEach(([dimKey, dimValue]) => {
            result.push({ 
              key: `dimensions.${dimKey}`, 
              value: dimValue,
              displayKey: `车身尺寸 - ${this.getDimensionLabel(dimKey)}`
            })
          })
        } else {
          result.push({ 
            key, 
            value,
            displayKey: this.getSpecDisplayKey(key)
          })
        }
      })
      
      return result
    },
    
    convertArrayToSpecs(specsArray) {
      if (!Array.isArray(specsArray)) return {}
      
      const result = {}
      const dimensions = {}
      
      specsArray.forEach(item => {
        if (item.key && item.value !== undefined && item.value !== '') {
          if (item.key.startsWith('dimensions.')) {
            // 处理 dimensions 嵌套属性
            const dimKey = item.key.replace('dimensions.', '')
            dimensions[dimKey] = item.value
          } else {
            // 处理普通属性
            result[item.key] = item.value
          }
        }
      })
      
      // 如果有 dimensions 属性，添加到结果中
      if (Object.keys(dimensions).length > 0) {
        result.dimensions = dimensions
      }
      
      return result
    },
    
    // 获取尺寸参数的中文标签
    getDimensionLabel(key) {
      const labels = {
        'length': '长度',
        'width': '宽度', 
        'height': '高度',
        'wheelbase': '轴距'
      }
      return labels[key] || key
    },
    
    // 获取规格参数的显示键名
    getSpecDisplayKey(key) {
      const displayKeys = {
        'doors': '车门数',
        'drive': '驱动方式',
        'front_tire': '前轮胎',
        'rear_tire': '后轮胎',
        'body_structure': '车身结构'
      }
      return displayKeys[key] || key
    },
    
    handleUploadClick() {
      console.log('=== 上传按钮被点击 ===');
      console.log('canUpload状态:', this.canUpload);
      console.log('uploading状态:', this.uploadDialog.uploading);
      console.log('按钮是否被禁用:', !this.canUpload);
      this.submitUpload()
    },
    
    // 处理原生文件输入变化
    handleFileInputChange(event) {
      console.log('=== 文件输入变化 ===');
      const files = event.target.files;
      console.log('选择的文件数量:', files.length);
      
      const validFiles = [];
      
      Array.from(files).forEach((file, index) => {
        console.log(`文件 ${index + 1}:`, file.name, file.type, file.size);
        
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          this.$message.error(`文件 ${file.name} 不是图片格式`);
          return;
        }
        
        // 验证文件大小
        if (file.size > 10 * 1024 * 1024) {
          this.$message.error(`文件 ${file.name} 大小超过 10MB`);
          return;
        }
        
        // 创建预览URL
        const preview = URL.createObjectURL(file);
        validFiles.push({
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: preview
        });
      });
      
      this.customFileList = validFiles;
      console.log('处理后的有效文件数量:', this.customFileList.length);
      console.log('canUpload状态:', this.canUpload);
    },
    
    // 清空所有文件
    clearAllFiles() {
      console.log('清空所有文件');
      // 释放预览URL避免内存泄漏
      this.customFileList.forEach(item => {
        URL.revokeObjectURL(item.preview);
      });
      this.customFileList = [];
      this.$refs.fileInput.value = '';
      console.log('清空后canUpload状态:', this.canUpload);
    },
    
    // 移除单个文件
    removeFile(index) {
      console.log('移除文件索引:', index);
      const fileItem = this.customFileList[index];
      if (fileItem) {
        URL.revokeObjectURL(fileItem.preview);
        this.customFileList.splice(index, 1);
        console.log('移除后文件数量:', this.customFileList.length);
        console.log('移除后canUpload状态:', this.canUpload);
      }
      
      // 如果没有文件了，清空input
      if (this.customFileList.length === 0) {
        this.$refs.fileInput.value = '';
      }
    },
    
    // 处理文件夹上传
    handleFolderInputChange(event) {
      console.log('=== 文件夹输入变化 ===');
      const files = event.target.files;
      console.log('选择的文件数量:', files.length);
      
      const validFiles = [];
      
      Array.from(files).forEach((file, index) => {
        console.log(`文件 ${index + 1}:`, file.name, file.type, file.size);
        
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          this.$message.error(`文件 ${file.name} 不是图片格式`);
          return;
        }
        
        // 验证文件大小
        if (file.size > 10 * 1024 * 1024) {
          this.$message.error(`文件 ${file.name} 大小超过 10MB`);
          return;
        }
        
        // 创建预览URL
        const preview = URL.createObjectURL(file);
        validFiles.push({
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          path: file.webkitRelativePath || file.name,
          preview: preview
        });
      });
      
      this.folderFileList = validFiles;
      console.log('处理后的有效文件数量:', this.folderFileList.length);
      console.log('canUpload状态:', this.canUpload);
    },
    
    // 清空所有文件夹文件
    clearAllFolderFiles() {
      console.log('清空所有文件夹文件');
      // 释放预览URL避免内存泄漏
      this.folderFileList.forEach(item => {
        URL.revokeObjectURL(item.preview);
      });
      this.folderFileList = [];
      this.$refs.folderInput.value = '';
      console.log('清空后canUpload状态:', this.canUpload);
    },
    
    // 移除单个文件夹文件
    removeFolderFile(index) {
      console.log('移除文件夹文件索引:', index);
      const fileItem = this.folderFileList[index];
      if (fileItem) {
        URL.revokeObjectURL(fileItem.preview);
        this.folderFileList.splice(index, 1);
        console.log('移除后文件夹文件数量:', this.folderFileList.length);
        console.log('移除后canUpload状态:', this.canUpload);
      }
      
      // 如果没有文件夹文件了，清空input
      if (this.folderFileList.length === 0) {
        this.$refs.folderInput.value = '';
      }
    },
    
    getSpecPlaceholder(key) {
      const placeholders = {
        'dimensions.length': '请输入长度',
        'dimensions.width': '请输入宽度',
        'dimensions.height': '请输入高度',
        'dimensions.wheelbase': '请输入轴距',
        'front_tire': '请输入前轮胎规格',
        'rear_tire': '请输入后轮胎规格',
        'doors': '请输入车门数',
        'drive': '请输入驱动方式',
        'body_structure': '请输入车身结构'
      }
      return placeholders[key] || '请输入'
    },
    
    getSpecUnit(key) {
      const units = {
        'dimensions.length': 'cm',
        'dimensions.width': 'cm',
        'dimensions.height': 'cm',
        'dimensions.wheelbase': 'cm',
        'front_tire': 'mm',
        'rear_tire': 'mm',
        'doors': '',
        'drive': '',
        'body_structure': ''
      }
      return units[key] || ''
    }
  },
  created() {
    // 创建专门的axios实例用于文件上传
    this.uploadClient = axios.create({
      baseURL: process.env.VUE_APP_API_BASE_URL ? `${process.env.VUE_APP_API_BASE_URL}/api` : (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'),
      timeout: 120000, // 2分钟超时
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}
</script>

<style scoped>
.comprehensive-management {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  background: white;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.page-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.management-tabs {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

/* 品牌管理样式 */
.brand-management {
  min-height: 400px;
}

.action-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.brands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.brand-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.3s;
}

.brand-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.brand-info h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.brand-info .country {
  color: #666;
  margin: 5px 0;
}

.brand-info .founded {
  color: #888;
  margin: 5px 0;
  font-size: 14px;
}

.brand-info .description {
  color: #666;
  margin: 10px 0;
  font-size: 14px;
  line-height: 1.4;
}

.brand-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.model-count {
  background: #fce4e4;
  color: #e03426;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
  margin-top: 10px;
}

/* 车型管理样式 */
.model-management {
  min-height: 400px;
}

.brand-selector {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  align-items: center;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.model-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.3s;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.model-info h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.model-details {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.model-details .type,
.model-details .year {
  background: #e8f5e8;
  color: #2e7d32;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.model-details .price {
  background: #fff3e0;
  color: #f57c00;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.model-info .description {
  color: #666;
  margin: 10px 0;
  font-size: 14px;
  line-height: 1.4;
}

.status .active {
  color: #4caf50;
  font-weight: bold;
}

.status .inactive {
  color: #f44336;
  font-weight: bold;
}

.model-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

/* 图片管理样式 */
.image-management {
  min-height: 400px;
}

.model-selector {
  margin-bottom: 20px;
}

.upload-actions {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.search-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

.image-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s;
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
}

.image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image-container:hover img {
  transform: scale(1.05);
}

.featured-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ff4444;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.image-info {
  padding: 15px;
}

.image-info h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.image-info .category {
  background: #fce4e4;
  color: #e03426;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.image-meta .date {
  color: #999;
  font-size: 12px;
}

.image-meta .featured {
  background: #ffeb3b;
  color: #f57c00;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.image-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.image-actions .el-button {
  flex: 1;
  font-size: 12px;
  padding: 8px 12px;
}

/* 分页样式 */
.pagination-wrapper {
  text-align: center;
  margin-top: 20px;
}

/* 上传相关样式 */
.image-uploader {
  width: 100%;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #e03426;
}

.upload-placeholder {
  text-align: center;
  color: #999;
}

.upload-icon {
  font-size: 28px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text {
  color: #606266;
  font-size: 14px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.batch-uploader {
  width: 100%;
}

.file-list {
  margin-top: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.file-icon {
  margin-right: 8px;
  color: #e03426;
}

.file-name {
  flex: 1;
  color: #606266;
  font-size: 14px;
}

.file-size {
  color: #909399;
  font-size: 12px;
  margin-right: 8px;
}

.remove-file {
  color: #f56c6c;
  cursor: pointer;
}

/* 表单提示文字 */
.form-tip {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}

/* 对话框内的表单样式 */
.el-dialog .el-form {
  padding: 0 20px;
}

/* 预览和编辑相关样式 */
.logo-upload-container {
  margin-bottom: 20px;
}

.current-logo,
.new-logo,
.no-logo {
  margin-bottom: 15px;
  padding: 15px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  text-align: center;
  background: #fafafa;
}

.current-logo {
  border-color: #67c23a;
  background: #f0f9ff;
}

.new-logo {
  border-color: #e03426;
  background: #ecf5ff;
}

.logo-preview-img {
  max-width: 120px;
  max-height: 120px;
  margin-bottom: 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: #909399;
}

.logo-placeholder i {
  font-size: 32px;
  margin-bottom: 8px;
}

.logo-uploader {
  margin: 15px 0;
  text-align: center;
}

.logo-actions {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.logo-actions .el-button {
  padding: 8px 16px;
}

.upload-tips {
  color: #909399;
  font-size: 12px;
  margin-top: 10px;
  text-align: left;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
}

.upload-tips p {
  margin: 2px 0;
}

.upload-tips .save-tip {
  color: #e03426;
  font-weight: 500;
  background: #ecf5ff;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .brands-grid,
  .models-grid,
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .image-preview {
    height: 200px;
  }
  
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .brand-selector {
    flex-direction: column;
    align-items: stretch;
  }
  
  .upload-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  
  .image-preview {
    height: 180px;
  }
  
  .image-overlay .el-button {
    font-size: 11px;
    padding: 4px 8px;
  }
}

/* 加载状态 */
.el-loading-mask {
  border-radius: 8px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 20px;
  display: block;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: #606266;
}

.empty-state p {
  font-size: 14px;
  line-height: 1.6;
}

/* 用户信息样式 */
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
  color: #666;
}

.user-info .username {
  font-weight: 500;
  color: #333;
}

.user-info .upload-time {
  margin-left: auto;
  color: #999;
  font-size: 12px;
}

.image-actions {
  display: flex;
  gap: 8px;
}

/* 图片预览容器样式 */
.image-preview {
  position: relative;
  width: 100%;
  height: 240px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-preview:hover img {
  transform: scale(1.05);
}

/* 图片悬停覆盖层 */
.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.image-overlay .el-button {
  font-size: 12px;
  padding: 6px 12px;
}

/* 上传进度条样式 */
.upload-progress {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.progress-details {
  margin-top: 12px;
}

.progress-details p {
  margin: 4px 0;
  font-size: 13px;
}

.progress-details .success-count {
  color: #67c23a;
}

.progress-details .error-count {
  color: #f56c6c;
}

.custom-batch-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.custom-file-list {
  width: 100%;
  margin-top: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 10px;
  background: #fafafa;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 500;
  color: #333;
}

.file-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.file-preview {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

/* 图片预览对话框样式 */
.image-preview-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-height: 80vh;
  overflow: hidden;
}

.preview-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-height: 60vh;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #f5f5f5;
  margin-bottom: 20px;
}

.preview-image-container img {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 8px;
}

.preview-info {
  width: 100%;
  max-width: 600px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-top: 10px;
}

.preview-info h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.preview-info p {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.preview-info strong {
  color: #333;
  font-weight: 600;
}

/* 编辑图片对话框中的大图预览 */
.image-preview-large {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-height: 400px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #f5f5f5;
  padding: 10px;
}

.image-preview-large img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 4px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .image-preview-dialog {
    max-height: 85vh;
  }
  
  .preview-image-container {
    max-height: 50vh;
  }
  
  .preview-image-container img {
    max-height: 50vh;
  }
  
  .preview-info {
    padding: 15px;
  }
  
  .image-preview-large {
    max-height: 300px;
  }
  
  .image-preview-large img {
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .preview-image-container {
    max-height: 40vh;
  }
  
  .preview-image-container img {
    max-height: 40vh;
  }
  
  .image-preview-large {
    max-height: 250px;
  }
  
  .image-preview-large img {
    max-height: 250px;
  }
}

/* 规格参数编辑器样式 */
.specs-editor {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  background: #fafafa;
}

.spec-item {
  margin-bottom: 15px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.spec-item:hover {
  border-color: #e03426;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.spec-unit {
  font-size: 14px;
  color: #909399;
  line-height: 32px;
  text-align: center;
  font-weight: 500;
}

.spec-display-name {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  padding: 4px 8px;
  background: #f0f9ff;
  border-radius: 4px;
  border-left: 3px solid #e03426;
}

.specs-editor .el-button--text {
  color: #e03426;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
}

.specs-editor .el-button--text:hover {
  background: #e03426;
  color: white;
  border-color: #e03426;
}

/* 图片上传页面主题色 */
.red-primary-btn {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

.red-primary-btn:hover:not(.is-disabled) {
  background-color: #b8251a !important;
  border-color: #b8251a !important;
}

/* 覆盖所有primary按钮为主题色 */
.comprehensive-management >>> .el-button--primary {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

.comprehensive-management >>> .el-button--primary:hover:not(.is-disabled) {
  background-color: #b8251a !important;
  border-color: #b8251a !important;
}

/* 分页组件主题色 */
.comprehensive-management >>> .el-pagination .el-pagination__item.active {
  background-color: #e03426 !important;
  color: #fff !important;
}

.comprehensive-management >>> .el-pagination .el-pagination__item:hover {
  color: #e03426 !important;
}

.comprehensive-management >>> .el-pagination .btn-next:hover,
.comprehensive-management >>> .el-pagination .btn-prev:hover {
  color: #e03426 !important;
}

/* Tab标签页主题色 */
.management-tabs >>> .el-tabs__active-bar {
  background-color: #e03426 !important;
}

.management-tabs >>> .el-tabs__item.is-active {
  color: #e03426 !important;
}

.management-tabs >>> .el-tabs__item:hover {
  color: #e03426 !important;
}

/* 下拉选择器主题色 */
.comprehensive-management >>> .el-select .el-input.is-focus .el-input__inner {
  border-color: #e03426 !important;
}

.comprehensive-management >>> .el-select-dropdown__item.selected {
  color: #e03426 !important;
  font-weight: bold !important;
}

/* 级联选择器主题色 */
.comprehensive-management >>> .el-cascader .el-input.is-focus .el-input__inner {
  border-color: #e03426 !important;
}

/* 表单输入框主题色 */
.comprehensive-management >>> .el-input__inner:focus {
  border-color: #e03426 !important;
  outline: 0 !important;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.2) !important;
}

/* 文本域主题色 */
.comprehensive-management >>> .el-textarea__inner:focus {
  border-color: #e03426 !important;
  outline: 0 !important;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.2) !important;
}

/* 开关组件主题色 */
.comprehensive-management >>> .el-switch.is-checked .el-switch__core {
  border-color: #e03426 !important;
  background-color: #e03426 !important;
}

/* 链接文字主题色 */
.comprehensive-management >>> .el-link--primary {
  color: #e03426 !important;
}

.comprehensive-management >>> .el-link--primary:hover {
  color: #b8251a !important;
}
</style> 
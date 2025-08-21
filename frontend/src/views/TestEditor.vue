<template>
  <div class="test-editor">
    <h1>编辑器测试页面</h1>
    <div class="editor-container">
      <quill-editor
        v-model="content"
        :options="editorOptions"
        @change="onChange"
      />
    </div>
    <div class="content-preview">
      <h3>内容预览：</h3>
      <div v-html="content"></div>
    </div>
  </div>
</template>

<script>
import { quillEditor } from 'vue-quill-editor'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'

export default {
  name: 'TestEditor',
  components: {
    quillEditor
  },
  data() {
    return {
      content: '<h2>欢迎使用编辑器！</h2><p>这是一个测试页面。</p>',
      editorOptions: {
        theme: 'snow',
        placeholder: '开始写作...',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
          ]
        }
      }
    }
  },
  methods: {
    onChange() {
      console.log('内容变化:', this.content)
    }
  }
}
</script>

<style scoped>
.test-editor {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.editor-container {
  margin: 20px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.content-preview {
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>


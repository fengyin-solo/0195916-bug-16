<template>
  <div class="image-element" @drop="handleDrop" @dragover.prevent>
    <img v-if="element.imageData" :src="element.imageData" :alt="element.imageName || '图片'" />
    <div v-else class="placeholder" @click="triggerUpload">
      <el-icon v-if="!uploading" :size="24"><Picture /></el-icon>
      <span>{{ uploading ? '图片读取中…' : '点击添加' }}</span>
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" @click="handleInputClick" style="display: none" />
    </div>
    <div v-if="uploading && element.imageData" class="loading-mask">图片读取中…</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvas'
import { readImageToElement } from '@/utils/imageLoader'

const props = defineProps({ element: { type: Object, required: true } })
const store = useCanvasStore()
const fileInput = ref(null)

// 读取状态只跟这一个元件 id 绑定，切换画布选中项不会改变它
const uploading = computed(() => store.isImageUploading(props.element.id))

const triggerUpload = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

// el-upload 内部会在点击时清空 value，原生 input 需要自己清空，
// 否则再次选择同一个文件不会触发 change
const handleInputClick = (e) => {
  e.target.value = ''
}

const handleFileChange = (e) => {
  const file = e.target.files[0]
  // 取消选择（files 为空）时直接返回，不算失败
  if (!file) return
  // 注意：这里在发起读取时就快照元件 id，回调只写回这一个元件
  readImageToElement(file, props.element.id, {
    onStart: (id) => store.setImageUploading(id, true),
    onLoad: (id, updates) => {
      // 若读取期间元件已被删除，放弃写入，不报错
      if (store.hasElement(id)) store.updateElement(id, updates)
    },
    onFinish: (id) => store.setImageUploading(id, false)
  })
  e.target.value = ''
}

const handleDrop = (e) => {
  e.preventDefault()
  e.stopPropagation()
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  readImageToElement(file, props.element.id, {
    onStart: (id) => store.setImageUploading(id, true),
    onLoad: (id, updates) => {
      if (store.hasElement(id)) store.updateElement(id, updates)
    },
    onFinish: (id) => store.setImageUploading(id, false)
  })
}
</script>

<style scoped>
.image-element { width: 100%; height: 100%; overflow: hidden; background: #f5f7fa; border-radius: 2px; position: relative; }
.image-element img { width: 100%; height: 100%; object-fit: contain; }
.placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: #909399;
  gap: 4px; font-size: 11px; cursor: pointer; border: 1px dashed #dcdfe6;
}
.placeholder:hover { border-color: #409eff; color: #409eff; }
.loading-mask {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.7); color: #409eff; font-size: 11px;
}
</style>

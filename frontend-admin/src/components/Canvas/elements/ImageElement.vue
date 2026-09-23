<template>
  <div class="image-element" @drop="handleDrop" @dragover.prevent>
    <img v-if="element.imageData" :src="element.imageData" alt="图片" />
    <div v-else class="placeholder" @click="triggerUpload">
      <el-icon :size="24"><Picture /></el-icon>
      <span>{{ uploading ? '读取中…' : '点击添加' }}</span>
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" style="display: none" />
    </div>
    <div v-if="uploading" class="uploading-mask">
      <el-icon class="is-loading" :size="18"><Loading /></el-icon>
      <span>读取中…</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvas'

const props = defineProps({ element: { type: Object, required: true } })
const store = useCanvasStore()
const fileInput = ref(null)

// 每个元件各自的读取状态，互不受影响
const uploading = computed(() => store.isImageUploading(props.element.id))

const triggerUpload = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

const handleFileChange = (e) => {
  const file = e.target.files[0]
  // 无论是否选择了文件都重置 value，
  // 取消选择不报错；再次选择同一个文件也能重新触发
  e.target.value = ''
  if (file) {
    // 直接以当前元件 id 发起，组件随元件存活，id 不会漂移
    store.uploadImage(props.element.id, file)
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  e.stopPropagation()
  const file = e.dataTransfer.files[0]
  if (file) {
    store.uploadImage(props.element.id, file)
  }
}
</script>

<style scoped>
.image-element { position: relative; width: 100%; height: 100%; overflow: hidden; background: #f5f7fa; border-radius: 2px; }
.image-element img { width: 100%; height: 100%; object-fit: contain; }
.placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: #909399;
  gap: 4px; font-size: 11px; cursor: pointer; border: 1px dashed #dcdfe6;
}
.placeholder:hover { border-color: #409eff; color: #409eff; }
.uploading-mask {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  background: rgba(255, 255, 255, 0.7); color: #409eff; font-size: 11px;
}
</style>

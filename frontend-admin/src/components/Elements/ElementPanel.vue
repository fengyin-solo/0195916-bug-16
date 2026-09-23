<template>
  <div class="element-panel card">
    <div class="section-title">元件库</div>
    <div class="element-list">
      <div 
        v-for="item in elementTypes" 
        :key="item.type"
        class="element-item"
        draggable="true"
        @dragstart="handleDragStart($event, item)"
      >
        <el-icon :size="24"><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </div>
    </div>
    
    <div class="section-title">图层列表</div>
    <div class="layer-list">
      <div
        v-for="element in reversedElements"
        :key="element.id"
        class="layer-item"
        :class="{ active: store.selectedElementId === element.id }"
        @click="selectElement(element.id)"
      >
        <el-icon :size="16"><component :is="getElementIcon(element.type)" /></el-icon>
        <span class="layer-name">
          {{ getElementName(element) }}
          <em v-if="element.imageName" class="layer-file" :title="element.imageName">{{ element.imageName }}</em>
        </span>
        <span v-if="store.isImageUploading(element.id)" class="uploading-badge">读取中</span>
        <div class="layer-actions">
          <el-icon @click.stop="toggleVisibility(element)">
            <View v-if="element.visible" />
            <Hide v-else />
          </el-icon>
          <el-icon @click.stop="deleteElement(element.id)"><Delete /></el-icon>
        </div>
      </div>
      <el-empty v-if="store.elements.length === 0" description="暂无元件" :image-size="60" />
    </div>
    <div class="layer-hint">
      名称按“类型+创建序号”生成，图片元件会附带所上传的文件名；读取图片时显示“读取中”。
      图片只保存在各自元件上，名称不随选中项变化，因此切换选中项后名称与属性面板预览可能不同，属正常现象。
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvas'

const store = useCanvasStore()

const elementTypes = [
  { type: 'text', label: '文本', icon: 'Document', defaultProps: { content: '双击编辑', fontSize: 14, fontFamily: 'Arial', color: '#000000', bold: false, italic: false } },
  { type: 'rect', label: '矩形', icon: 'FullScreen', defaultProps: { fillColor: '#ffffff', strokeColor: '#000000', strokeWidth: 1 } },
  { type: 'circle', label: '圆形', icon: 'CircleCheck', defaultProps: { fillColor: '#ffffff', strokeColor: '#000000', strokeWidth: 1 } },
  { type: 'line', label: '线条', icon: 'Minus', defaultProps: { strokeColor: '#000000', strokeWidth: 2 } },
  { type: 'image', label: '图片', icon: 'Picture', defaultProps: { src: 'https://picsum.photos/100/100' } },
  { type: 'barcode', label: '条码', icon: 'Postcard', defaultProps: { content: '123456789', format: 'CODE128', showText: true } },
  { type: 'qrcode', label: '二维码', icon: 'Grid', defaultProps: { content: 'https://example.com', errorLevel: 'M' } },
  { type: 'table', label: '表格', icon: 'Grid', defaultProps: { rows: 3, cols: 3, borderWidth: 1, borderColor: '#000000', cellFontSize: 12, cellFontFamily: 'Arial', cellFontColor: '#000000', cellTextAlign: 'center', cells: {} } }
]

const reversedElements = computed(() => [...store.elements].reverse())

const handleDragStart = (e, item) => {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/json', JSON.stringify(item))
}

const selectElement = (id) => store.selectElement(id)
const deleteElement = (id) => store.deleteElement(id)
const toggleVisibility = (el) => store.updateElement(el.id, { visible: !el.visible })

const getElementIcon = (type) => elementTypes.find(e => e.type === type)?.icon || 'Document'
const getElementName = (el) => {
  const names = { text: '文本', rect: '矩形', circle: '圆形', line: '线条', image: '图片', barcode: '条码', qrcode: '二维码', table: '表格' }
  // 同类型多个元件用创建序号区分，避免图层名称完全相同、和具体元件对不上
  return `${names[el.type] || el.type} ${store.getElementIndex(el)}`
}
</script>

<style lang="scss" scoped>
.element-panel {
  width: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.element-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 12px;
}

.element-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
  font-size: 12px;
  color: #606266;
  user-select: none;
  
  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
  
  &:active {
    cursor: grabbing;
  }
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.layer-hint {
  padding: 8px 12px; border-top: 1px solid #ebeef5;
  font-size: 11px; line-height: 1.5; color: #909399;
  background: #fafafa;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: #f5f7fa; }
  &.active { background: #ecf5ff; color: #409eff; }

  .layer-name {
    flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    display: flex; align-items: baseline; gap: 4px;
    .layer-file {
      font-size: 11px; font-style: normal; color: #909399;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
  }
  .uploading-badge {
    flex-shrink: 0; font-size: 10px; line-height: 1; color: #b88230;
    background: #fdf6ec; border: 1px solid #f5dab1; border-radius: 8px;
    padding: 3px 6px;
  }
  .layer-actions { display: flex; gap: 8px; opacity: 0; transition: opacity 0.2s; }
  &:hover .layer-actions { opacity: 1; }
}
</style>

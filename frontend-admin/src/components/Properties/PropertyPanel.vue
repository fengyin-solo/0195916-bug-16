<template>
  <div class="property-panel card">
    <div class="section-title">属性设置</div>
    <div class="property-content" v-if="element">
      <el-form label-position="left" label-width="60px" size="small">
        <!-- 通用属性 -->
        <div class="property-group">
          <div class="group-title">位置与尺寸 <span class="hint">(单位: px, 不可超出画布)</span></div>
          <el-form-item label="X">
            <el-input-number v-model="formData.x" :min="0" :max="maxX" controls-position="right" @change="updateProp('x')" />
          </el-form-item>
          <el-form-item label="Y">
            <el-input-number v-model="formData.y" :min="0" :max="maxY" controls-position="right" @change="updateProp('y')" />
          </el-form-item>
          <el-form-item label="宽度">
            <el-input-number v-model="formData.width" :min="10" :max="maxWidth" controls-position="right" @change="updateProp('width')" />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number v-model="formData.height" :min="10" :max="maxHeight" controls-position="right" @change="updateProp('height')" />
          </el-form-item>
          <el-form-item label="旋转">
            <el-input-number v-model="formData.rotation" :min="0" :max="360" :step="15" controls-position="right" @change="updateProp('rotation')" />
            <span class="unit">°</span>
          </el-form-item>
        </div>

        <!-- 文本属性 -->
        <div v-if="element.type === 'text'" class="property-group">
          <div class="group-title">文本属性</div>
          <el-form-item label="内容">
            <el-input v-model="formData.content" @change="updateProp('content')" />
          </el-form-item>
          <el-form-item label="字体">
            <el-select v-model="formData.fontFamily" @change="updateProp('fontFamily')">
              <el-option v-for="f in fonts" :key="f" :label="f" :value="f" />
            </el-select>
          </el-form-item>
          <el-form-item label="字号">
            <el-input-number v-model="formData.fontSize" :min="8" :max="200" @change="updateProp('fontSize')" />
          </el-form-item>
          <el-form-item label="颜色">
            <el-color-picker v-model="formData.color" @change="updateProp('color')" />
          </el-form-item>
          <el-form-item label="样式">
            <el-checkbox v-model="formData.bold" @change="updateProp('bold')">粗体</el-checkbox>
            <el-checkbox v-model="formData.italic" @change="updateProp('italic')">斜体</el-checkbox>
          </el-form-item>
        </div>

        <!-- 图形属性 -->
        <div v-if="['rect', 'circle'].includes(element.type)" class="property-group">
          <div class="group-title">图形属性</div>
          <el-form-item label="填充色">
            <el-color-picker v-model="formData.fillColor" show-alpha @change="updateProp('fillColor')" />
          </el-form-item>
          <el-form-item label="边框色">
            <el-color-picker v-model="formData.strokeColor" @change="updateProp('strokeColor')" />
          </el-form-item>
          <el-form-item label="边框宽">
            <el-input-number v-model="formData.strokeWidth" :min="0" :max="20" @change="updateProp('strokeWidth')" />
          </el-form-item>
        </div>

        <!-- 线条属性 -->
        <div v-if="element.type === 'line'" class="property-group">
          <div class="group-title">线条属性</div>
          <el-form-item label="颜色">
            <el-color-picker v-model="formData.strokeColor" @change="updateProp('strokeColor')" />
          </el-form-item>
          <el-form-item label="粗细">
            <el-input-number v-model="formData.strokeWidth" :min="1" :max="50" @change="updateProp('strokeWidth')" />
          </el-form-item>
        </div>

        <!-- 图片属性 -->
        <div v-if="element.type === 'image'" class="property-group">
          <div class="group-title">图片属性</div>
          <el-form-item label="图片">
            <el-upload action="#" :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="handleImageUpload">
              <el-button type="primary" size="small" :loading="imageUploading">
                {{ imageUploading ? '读取中…' : '选择图片' }}
              </el-button>
            </el-upload>
          </el-form-item>
          <div class="image-status">
            <span v-if="imageUploading" class="status-loading">图片读取中，可继续操作其他元件，完成后只会替换本元件（{{ element.imageName || '未命名' }}）的图片。</span>
            <span v-else-if="element.imageData" class="status-ok">已绑定图片：{{ element.imageName || '未命名图片' }}</span>
            <span v-else class="status-empty">尚未选择图片，当前为空。</span>
          </div>
          <div v-if="element.imageData" class="image-preview">
            <img :src="element.imageData" :alt="element.imageName || '预览'" />
          </div>
          <div class="image-hint">
            预览始终来自此元件自身保存的图片数据；读取期间切换选中其他元件，图片也只会落到发起选择的这一个元件上。
          </div>
        </div>

        <!-- 条码属性 -->
        <div v-if="element.type === 'barcode'" class="property-group">
          <div class="group-title">条码属性</div>
          <el-form-item label="内容">
            <el-input v-model="formData.content" @change="updateProp('content')" />
          </el-form-item>
          <el-form-item label="格式">
            <el-select v-model="formData.format" @change="updateProp('format')">
              <el-option v-for="f in barcodeFormats" :key="f.value" :label="f.label" :value="f.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="文字">
            <el-checkbox v-model="formData.showText" @change="updateProp('showText')">显示</el-checkbox>
          </el-form-item>
        </div>

        <!-- 二维码属性 -->
        <div v-if="element.type === 'qrcode'" class="property-group">
          <div class="group-title">二维码属性</div>
          <el-form-item label="内容">
            <el-input v-model="formData.content" @change="updateProp('content')" />
          </el-form-item>
          <el-form-item label="容错">
            <el-select v-model="formData.errorLevel" @change="updateProp('errorLevel')">
              <el-option v-for="l in errorLevels" :key="l.value" :label="l.label" :value="l.value" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 表格属性 -->
        <div v-if="element.type === 'table'" class="property-group">
          <div class="group-title">表格属性</div>
          <el-form-item label="行数">
            <el-input-number v-model="formData.rows" :min="1" :max="20" @change="handleRowsChange" />
          </el-form-item>
          <el-form-item label="列数">
            <el-input-number v-model="formData.cols" :min="1" :max="20" @change="handleColsChange" />
          </el-form-item>
          <el-form-item label="边框色">
            <el-color-picker v-model="formData.borderColor" @change="updateProp('borderColor')" />
          </el-form-item>
          <el-form-item label="边框宽">
            <el-input-number v-model="formData.borderWidth" :min="0" :max="10" @change="updateProp('borderWidth')" />
          </el-form-item>
          <el-form-item label="字号">
            <el-input-number v-model="formData.cellFontSize" :min="6" :max="72" @change="updateProp('cellFontSize')" />
          </el-form-item>
          <el-form-item label="字体">
            <el-select v-model="formData.cellFontFamily" @change="updateProp('cellFontFamily')">
              <el-option v-for="f in fonts" :key="f" :label="f" :value="f" />
            </el-select>
          </el-form-item>
          <el-form-item label="字色">
            <el-color-picker v-model="formData.cellFontColor" @change="updateProp('cellFontColor')" />
          </el-form-item>
          <el-form-item label="对齐">
            <el-select v-model="formData.cellTextAlign" @change="updateProp('cellTextAlign')">
              <el-option label="左对齐" value="left" />
              <el-option label="居中" value="center" />
              <el-option label="右对齐" value="right" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 表格单元格编辑 -->
        <div v-if="element.type === 'table'" class="property-group">
          <div class="group-title">单元格内容 <span class="hint">(双击画布中的单元格也可编辑)</span></div>
          <div class="cell-editor-grid">
            <div v-for="r in formData.rows" :key="r" class="cell-editor-row">
              <div v-for="c in formData.cols" :key="c" class="cell-editor-item">
                <el-input
                  :model-value="getCellText(r - 1, c - 1)"
                  size="small"
                  placeholder=""
                  @update:model-value="(val) => setCellText(r - 1, c - 1, val)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="property-group">
          <div class="group-title">元件对齐 <span class="hint">(Ctrl+点击多选后可用)</span></div>
          <div class="align-buttons">
              <el-button size="small" :disabled="!canAlign" @click="alignElements('left')">
                左对齐
              </el-button>
              <el-button size="small" :disabled="!canAlign" @click="alignElements('center-h')">
                水平居中
              </el-button>
              <el-button size="small" :disabled="!canAlign" @click="alignElements('right')">
                右对齐
              </el-button>
          </div>
          <el-divider />
          <div class="action-buttons">
            <el-button size="small" @click="duplicate">复制元件</el-button>
            <el-button size="small" type="danger" @click="remove">删除元件</el-button>
          </div>
        </div>
      </el-form>
    </div>
    <el-empty v-else description="请选择元件" :image-size="80" />
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvas'
import { ElMessage } from 'element-plus'
import { pickImageFile, readImageToElement } from '@/utils/imageLoader'

const barcodeFormats = [
  { value: 'CODE128', label: 'Code 128' },
  { value: 'CODE39', label: 'Code 39' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' }
]

const errorLevels = [
  { value: 'L', label: '低 (7%)' },
  { value: 'M', label: '中 (15%)' },
  { value: 'Q', label: '较高 (25%)' },
  { value: 'H', label: '高 (30%)' }
]

const store = useCanvasStore()
const element = computed(() => store.selectedElement)
const canAlign = computed(() => store.selectedElementIds.length >= 2)
const fonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Microsoft YaHei', 'SimSun', 'SimHei']

// 计算最大值限制
const maxX = computed(() => element.value ? store.canvasPixelWidth - element.value.width : store.canvasPixelWidth)
const maxY = computed(() => element.value ? store.canvasPixelHeight - element.value.height : store.canvasPixelHeight)
const maxWidth = computed(() => element.value ? store.canvasPixelWidth - element.value.x : store.canvasPixelWidth)
const maxHeight = computed(() => element.value ? store.canvasPixelHeight - element.value.y : store.canvasPixelHeight)

const formData = reactive({
  x: 0, y: 0, width: 100, height: 40, rotation: 0,
  content: '', fontSize: 14, fontFamily: 'Arial', color: '#000000', bold: false, italic: false,
  fillColor: '#ffffff', strokeColor: '#000000', strokeWidth: 1,
  format: 'CODE128', showText: true, errorLevel: 'M',
  rows: 3, cols: 3, borderWidth: 1, borderColor: '#000000',
  cellFontSize: 12, cellFontFamily: 'Arial', cellFontColor: '#000000', cellTextAlign: 'center',
  cells: {}
})

watch(element, (el) => {
  if (el) {
    Object.keys(formData).forEach(key => {
      if (el[key] !== undefined) formData[key] = el[key]
    })
  }
}, { immediate: true, deep: true })

const updateProp = (key) => {
  if (element.value) {
    let value = formData[key]
    // 确保不超出画布
    if (key === 'x') value = Math.min(value, store.canvasPixelWidth - element.value.width)
    if (key === 'y') value = Math.min(value, store.canvasPixelHeight - element.value.height)
    if (key === 'width') value = Math.min(value, store.canvasPixelWidth - element.value.x)
    if (key === 'height') value = Math.min(value, store.canvasPixelHeight - element.value.y)
    store.updateElement(element.value.id, { [key]: value })
  }
}

// 当前选中图片元件是否正在读取（跟随当前面板展示的元件）
const imageUploading = computed(() =>
  element.value?.type === 'image' && store.isImageUploading(element.value.id)
)

const handleImageUpload = (uploadFile) => {
  // 在发起选择的这一刻同步捕获目标元件 id；之后异步读取期间，
  // 即使用户点选了画布上的其他元件，结果也只写回这个 id
  const targetId = element.value?.id
  if (!targetId) return

  const file = pickImageFile(uploadFile?.raw)
  // 用户取消选择或文件类型不合法：不做任何写入，也不报错
  if (!file) return

  // 统一走共享读取逻辑：结果只写回发起时快照的 targetId
  readImageToElement(file, targetId, {
    onStart: (id) => store.setImageUploading(id, true),
    onLoad: (id, updates) => {
      // 读取期间元件若已被删除则放弃写入；绝不使用“当前选中项”的 id
      if (store.hasElement(id)) store.updateElement(id, updates)
    },
    onFinish: (id) => store.setImageUploading(id, false)
  })
}

const getCellText = (row, col) => {
  const cells = formData.cells
  if (cells && cells[row] && cells[row][col] !== undefined) {
    return cells[row][col]
  }
  return ''
}

const setCellText = (row, col, text) => {
  const oldCells = formData.cells || {}
  const cells = {}
  for (const r in oldCells) {
    cells[r] = { ...oldCells[r] }
  }
  if (!cells[row]) cells[row] = {}
  cells[row][col] = text
  formData.cells = cells
  store.updateElement(element.value.id, { cells })
}

const rebuildCells = (newRows, newCols) => {
  const oldCells = formData.cells || {}
  const newCells = {}
  for (let r = 0; r < newRows; r++) {
    newCells[r] = {}
    for (let c = 0; c < newCols; c++) {
      if (oldCells[r] && oldCells[r][c] !== undefined) {
        newCells[r][c] = oldCells[r][c]
      }
    }
  }
  return newCells
}

const handleRowsChange = (val) => {
  const cells = rebuildCells(val, formData.cols)
  formData.cells = cells
  store.updateElement(element.value.id, { rows: val, cells })
}

const handleColsChange = (val) => {
  const cells = rebuildCells(formData.rows, val)
  formData.cells = cells
  store.updateElement(element.value.id, { cols: val, cells })
}

const alignElements = (type) => {
  store.alignElements(type)
  ElMessage.success('对齐完成')
}

const duplicate = () => {
  store.duplicateElement(element.value.id)
  ElMessage.success('已复制')
}

const remove = () => {
  store.deleteElement(element.value.id)
  ElMessage.success('已删除')
}
</script>

<style lang="scss" scoped>
.property-panel { width: 260px; display: flex; flex-direction: column; overflow: hidden; }
.property-content { flex: 1; overflow-y: auto; padding: 12px; }

.property-group {
  margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #ebeef5;
  &:last-child { border-bottom: none; }
}

.group-title {
  font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 10px;
  display: flex; align-items: center; gap: 6px;
  .hint { font-size: 11px; font-weight: normal; color: #909399; }
}

:deep(.el-form-item) {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  
  .el-form-item__label { padding-right: 8px; font-size: 12px; }
  .el-form-item__content { flex: 1; }
}

:deep(.el-input-number) { width: 100%; }
:deep(.el-select) { width: 100%; }
:deep(.el-input) { width: 100%; }

.unit { margin-left: 4px; font-size: 12px; color: #909399; }

.image-preview {
  margin-top: 8px; padding: 8px; background: #f5f7fa; border-radius: 4px;
  img { max-width: 100%; max-height: 100px; display: block; margin: 0 auto; }
}

.image-status {
  font-size: 11px; line-height: 1.5; word-break: break-all;
  .status-loading { color: #409eff; }
  .status-ok { color: #67c23a; }
  .status-empty { color: #909399; }
}

.image-hint {
  margin-top: 6px; font-size: 11px; line-height: 1.5; color: #909399;
}

.align-buttons {
  display: flex; gap: 8px; justify-content: center;
}

.action-buttons {
  display: flex; gap: 8px; justify-content: center;
}

.cell-editor-grid {
  max-height: 240px;
  overflow-y: auto;
}

.cell-editor-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.cell-editor-item {
  flex: 1;
  min-width: 0;
}

.cell-editor-item :deep(.el-input) {
  width: 100%;
}

.cell-editor-item :deep(.el-input__inner) {
  padding: 0 4px;
  text-align: center;
}
</style>

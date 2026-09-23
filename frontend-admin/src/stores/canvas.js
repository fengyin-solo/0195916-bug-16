import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const MM_TO_DOT = 8
const STORAGE_KEY = 'label-editor-canvas'

export const useCanvasStore = defineStore('canvas', () => {
  const canvasWidth = ref(80)
  const canvasHeight = ref(60)
  const scale = ref(1)
  const elements = ref([])
  const selectedElementId = ref(null)
  const selectedElementIds = ref([])
  // 正在读取图片的元件 id 集合：读取与元件一一绑定，切换选中项不影响
  const uploadingImageIds = ref([])
  let elementIdCounter = 0

  // 启动时恢复上次保存的画布（图片 dataURL 也在其中，刷新后仍留在原元件上）
  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (Array.isArray(saved.elements)) elements.value = saved.elements
      if (Number.isFinite(saved.canvasWidth)) canvasWidth.value = saved.canvasWidth
      if (Number.isFinite(saved.canvasHeight)) canvasHeight.value = saved.canvasHeight
      elementIdCounter = saved.elementIdCounter || 0
      // 恢复后选中项重置，避免选中已不存在的元件
      selectedElementId.value = null
      selectedElementIds.value = []
    } catch (err) {
      console.warn('恢复画布数据失败:', err)
    }
  }

  let saveTimer = null
  // 元件数据变化后防抖写入 localStorage；图片可能很大，不做高频写入
  watch(
    [elements, canvasWidth, canvasHeight],
    () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              elements: elements.value,
              canvasWidth: canvasWidth.value,
              canvasHeight: canvasHeight.value,
              elementIdCounter
            })
          )
        } catch (err) {
          // 大图 dataURL 可能超出存储配额，提示但不影响画布中的使用
          console.warn('保存画布数据失败:', err)
          ElMessage.warning?.('图片较大，浏览器本地空间不足，刷新后可能无法保留该图片')
        }
      }, 500)
    },
    { deep: true }
  )

  const canvasPixelWidth = computed(() => canvasWidth.value * MM_TO_DOT)
  const canvasPixelHeight = computed(() => canvasHeight.value * MM_TO_DOT)

  const selectedElement = computed(() => {
    if (!selectedElementId.value) return null
    return elements.value.find(el => el.id === selectedElementId.value)
  })

  const selectedElements = computed(() => {
    return elements.value.filter(el => selectedElementIds.value.includes(el.id))
  })

  function setCanvasSize(width, height) {
    canvasWidth.value = width
    canvasHeight.value = height
  }

  function setScale(newScale) {
    scale.value = Math.max(0.25, Math.min(4, newScale))
  }

  function addElement(element) {
    const id = `element_${++elementIdCounter}`
    const newElement = {
      id,
      ...element,
      x: element.x || 10,
      y: element.y || 10,
      width: element.width || 100,
      height: element.height || 30,
      rotation: element.rotation || 0,
      locked: false,
      visible: true
    }
    // 图片元件不预填远程图片，未选择时明确保持为空
    if (newElement.type === 'image' && newElement.src) {
      delete newElement.src
    }
    elements.value.push(newElement)
    selectElement(id)
    return id
  }

  function updateElement(id, updates) {
    const index = elements.value.findIndex(el => el.id === id)
    if (index !== -1) {
      elements.value[index] = { ...elements.value[index], ...updates }
    }
  }

  // 异步上传回调使用：确认发起选择的元件仍然存在，不存在则放弃写入
  function hasElement(id) {
    return elements.value.some(el => el.id === id)
  }

  function setImageUploading(id, uploading) {
    if (uploading) {
      if (!uploadingImageIds.value.includes(id)) uploadingImageIds.value.push(id)
    } else {
      uploadingImageIds.value = uploadingImageIds.value.filter(eid => eid !== id)
    }
  }

  function isImageUploading(id) {
    return uploadingImageIds.value.includes(id)
  }

  function deleteElement(id) {
    const index = elements.value.findIndex(el => el.id === id)
    if (index !== -1) {
      elements.value.splice(index, 1)
      setImageUploading(id, false)
      selectedElementIds.value = selectedElementIds.value.filter(eid => eid !== id)

      // 删除后选中第一个元件
      if (elements.value.length > 0) {
        const firstElement = elements.value[elements.value.length - 1]
        selectedElementId.value = firstElement.id
        selectedElementIds.value = [firstElement.id]
      } else {
        selectedElementId.value = null
        selectedElementIds.value = []
      }
    }
  }

  function selectElement(id, multiSelect = false) {
    if (multiSelect) {
      if (selectedElementIds.value.includes(id)) {
        selectedElementIds.value = selectedElementIds.value.filter(eid => eid !== id)
        if (selectedElementIds.value.length > 0) {
          selectedElementId.value = selectedElementIds.value[selectedElementIds.value.length - 1]
        } else {
          selectedElementId.value = null
        }
      } else {
        selectedElementIds.value.push(id)
        selectedElementId.value = id
      }
    } else {
      selectedElementId.value = id
      selectedElementIds.value = id ? [id] : []
    }
  }

  function clearSelection() {
    selectedElementId.value = null
    selectedElementIds.value = []
  }

  // 多选元件之间对齐
  function alignElements(alignment) {
    const selected = selectedElements.value
    if (selected.length < 2) return

    switch (alignment) {
      case 'left': {
        const minX = Math.min(...selected.map(el => el.x))
        selected.forEach(el => updateElement(el.id, { x: minX }))
        break
      }
      case 'right': {
        const maxRight = Math.max(...selected.map(el => el.x + el.width))
        selected.forEach(el => updateElement(el.id, { x: maxRight - el.width }))
        break
      }
      case 'center-h': {
        const minX = Math.min(...selected.map(el => el.x))
        const maxRight = Math.max(...selected.map(el => el.x + el.width))
        const centerX = (minX + maxRight) / 2
        selected.forEach(el => updateElement(el.id, { x: Math.round(centerX - el.width / 2) }))
        break
      }
      case 'top': {
        const minY = Math.min(...selected.map(el => el.y))
        selected.forEach(el => updateElement(el.id, { y: minY }))
        break
      }
      case 'bottom': {
        const maxBottom = Math.max(...selected.map(el => el.y + el.height))
        selected.forEach(el => updateElement(el.id, { y: maxBottom - el.height }))
        break
      }
      case 'center-v': {
        const minY = Math.min(...selected.map(el => el.y))
        const maxBottom = Math.max(...selected.map(el => el.y + el.height))
        const centerY = (minY + maxBottom) / 2
        selected.forEach(el => updateElement(el.id, { y: Math.round(centerY - el.height / 2) }))
        break
      }
    }
  }

  function duplicateElement(id) {
    const element = elements.value.find(el => el.id === id)
    if (!element) return

    const newElement = {
      ...element,
      x: Math.min(element.x + 20, canvasPixelWidth.value - element.width),
      y: Math.min(element.y + 20, canvasPixelHeight.value - element.height)
    }
    delete newElement.id
    return addElement(newElement)
  }

  function clearCanvas() {
    elements.value = []
    uploadingImageIds.value = []
    selectedElementId.value = null
    selectedElementIds.value = []
  }

  restoreState()

  return {
    canvasWidth,
    canvasHeight,
    scale,
    elements,
    selectedElementId,
    selectedElementIds,
    uploadingImageIds,
    canvasPixelWidth,
    canvasPixelHeight,
    selectedElement,
    selectedElements,
    setCanvasSize,
    setScale,
    addElement,
    updateElement,
    hasElement,
    setImageUploading,
    isImageUploading,
    deleteElement,
    selectElement,
    clearSelection,
    alignElements,
    duplicateElement,
    clearCanvas,
    MM_TO_DOT
  }
})

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const MM_TO_DOT = 8
const STORAGE_KEY = 'label-editor:canvas:v1'
let saveTimer = null

// 读取本地持久化的画布数据；损坏或不可用时安静回退到空画布
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.elements)) return null
    return data
  } catch (e) {
    console.warn('读取本地画布数据失败：', e)
    return null
  }
}

export const useCanvasStore = defineStore('canvas', () => {
  const saved = loadState()
  const canvasWidth = ref(80)
  const canvasHeight = ref(60)
  const scale = ref(1)
  const elements = ref(saved ? saved.elements.filter(el => el && typeof el.id === 'string') : [])
  // 正在读取图片的元件 id 列表（按元件隔离，多个元件可同时上传）
  const uploadingImageIds = ref([])

  let elementIdCounter = saved?.counter ?? elements.value.reduce((max, el) => {
    const m = /^element_(\d+)$/.exec(el.id || '')
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)

  const existingIds = new Set(elements.value.map(el => el.id))
  const selectedElementId = ref(saved?.selectedElementId && existingIds.has(saved.selectedElementId)
    ? saved.selectedElementId
    : null)
  const selectedElementIds = ref(Array.isArray(saved?.selectedElementIds)
    ? saved.selectedElementIds.filter(id => existingIds.has(id))
    : (selectedElementId.value ? [selectedElementId.value] : []))

  const canvasPixelWidth = computed(() => canvasWidth.value * MM_TO_DOT)
  const canvasPixelHeight = computed(() => canvasHeight.value * MM_TO_DOT)

  const selectedElement = computed(() => {
    if (!selectedElementId.value) return null
    return elements.value.find(el => el.id === selectedElementId.value)
  })

  const selectedElements = computed(() => {
    return elements.value.filter(el => selectedElementIds.value.includes(el.id))
  })

  // 持久化：图片数据挂在各自元件上，刷新后按元件 id 原样恢复，与当前选中项无关
  function scheduleSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          elements: elements.value,
          counter: elementIdCounter,
          selectedElementId: selectedElementId.value,
          selectedElementIds: selectedElementIds.value
        }))
      } catch (e) {
        // 大图 dataURL 可能撑爆 localStorage 配额，只提示不影响编辑
        console.warn('画布数据保存失败（可能是本地存储空间不足）：', e)
      }
    }, 300)
  }
  watch(elements, scheduleSave, { deep: true })
  watch([selectedElementId, selectedElementIds], scheduleSave, { deep: true })

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

  function deleteElement(id) {
    const index = elements.value.findIndex(el => el.id === id)
    if (index !== -1) {
      elements.value.splice(index, 1)
      selectedElementIds.value = selectedElementIds.value.filter(eid => eid !== id)
      uploadingImageIds.value = uploadingImageIds.value.filter(eid => eid !== id)

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

  // 同类型元件中的创建序号（从 1 开始），供图层列表区分多个同类元件
  function getElementIndex(element) {
    let index = 0
    for (const el of elements.value) {
      if (el.type === element.type) {
        index++
        if (el.id === element.id) return index
      }
    }
    return index
  }

  function isImageUploading(id) {
    return uploadingImageIds.value.includes(id)
  }

  // 统一的图片上传入口：
  // 在发起选择的当下锁定目标元件 id，读取期间选中项变化、取消选择、
  // 元件被删除或重复选择同一文件，都不会把图片写到别的元件上，也不会报错。
  function uploadImage(elementId, file) {
    const target = elements.value.find(el => el.id === elementId)
    if (!target) {
      ElMessage.warning('目标元件已不存在，图片未写入画布')
      return
    }
    if (target.type !== 'image') {
      ElMessage.warning('只有图片元件可以设置图片')
      return
    }
    if (!file || !file.type || !file.type.startsWith('image/')) {
      ElMessage.error('请选择有效的图片文件')
      return
    }

    if (!uploadingImageIds.value.includes(elementId)) {
      uploadingImageIds.value.push(elementId)
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      // 异步回调里只按锁定的 id 查找，绝不使用“当前选中项”
      const el = elements.value.find(item => item.id === elementId)
      if (el) {
        updateElement(elementId, { imageData: e.target.result, imageName: file.name })
        ElMessage.success('图片已上传')
      } else {
        // 读取过程中元件被删除：结果丢弃，不影响其他元件
        ElMessage.info('该元件已被删除，图片未写入画布')
      }
    }
    reader.onerror = () => {
      ElMessage.error('图片读取失败，请重试')
    }
    reader.onloadend = () => {
      uploadingImageIds.value = uploadingImageIds.value.filter(id => id !== elementId)
    }
    reader.readAsDataURL(file)
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
    selectedElementId.value = null
    selectedElementIds.value = []
    uploadingImageIds.value = []
  }

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
    deleteElement,
    selectElement,
    clearSelection,
    getElementIndex,
    isImageUploading,
    uploadImage,
    alignElements,
    duplicateElement,
    clearCanvas,
    MM_TO_DOT
  }
})

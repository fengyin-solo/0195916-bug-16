import { ElMessage } from 'element-plus'

/**
 * 校验用户选择的文件是否为可用图片。
 * 取消选择（没有文件）时静默返回 null，不视为失败。
 */
export function pickImageFile(file) {
  if (!file) return null
  if (file.type && !file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return null
  }
  return file
}

/**
 * 读取图片文件为 dataURL。
 *
 * 关键约定：调用方必须在发起选择时就把目标元件 id 捕获下来传入，
 * 异步读取期间即使画布选中项发生变化，结果也只会写回这一个元件，
 * 不会串到别的元件上。
 *
 * @param {File} file 图片文件
 * @param {string} targetElementId 发起选择的元件 id（读取时快照）
 * @param {object} hooks
 * @param {(id: string) => void} [hooks.onStart]   开始读取（大图读取可能较慢）
 * @param {(id: string, updates: object) => void} hooks.onLoad 读取成功
 * @param {(id: string) => void} [hooks.onFinish]  无论成功失败都会调用
 */
export function readImageToElement(file, targetElementId, hooks = {}) {
  const imageFile = pickImageFile(file)
  if (!imageFile) return

  hooks.onStart?.(targetElementId)

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      // 始终用发起时的 id，而不是当前选中项
      hooks.onLoad(targetElementId, {
        imageData: e.target.result,
        imageName: imageFile.name
      })
      ElMessage.success('图片已加载')
    } catch (err) {
      console.error('图片加载失败:', err)
      ElMessage.error('图片加载失败，请重试')
    } finally {
      hooks.onFinish?.(targetElementId)
    }
  }
  reader.onerror = () => {
    ElMessage.error('图片读取失败，请重试')
    hooks.onFinish?.(targetElementId)
  }
  reader.readAsDataURL(imageFile)
}

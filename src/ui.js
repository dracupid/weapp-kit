export function showInfo (title = '提示', content = '无内容', opts = {}) {
  const {confirmText = '好的'} = opts
  wx.showModal({
    title,
    content,
    showCancel: false,
    confirmText
  })
}

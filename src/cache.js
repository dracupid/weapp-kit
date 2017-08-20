import { getLogger } from './logger'

export class SingleCache {
  constructor (key) {
    this.key = key
    this.logger = getLogger('@cache.' + key)
  }

  get () {
    try {
      return wx.getStorageSync(this.key)
    } catch (e) {
      this.logger.warn(e)
      return null
    }
  }

  set (value, throwError = false) {
    try {
      wx.setStorageSync(this.key, value)
    } catch (e) {
      if (throwError) throw e
      else this.logger.warn(e)
    }
  }

  clear (throwError = false) {
    try {
      wx.removeStorageSync(this.key)
    } catch (e) {
      if (throwError) throw e
      else this.logger.warn(e)
    }
  }
}

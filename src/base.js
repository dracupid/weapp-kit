/**
 * Clone an object using JSON
 * @param  {Object} obj object to clone
 * @return {object}     cloned object
 */
export function plainClone (obj) {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (e) {
    return obj
  }
}

/**
 * execute a function only once
 * @param  {function} fun function
 * @return {any}   return value
 */
export function once (fun) {
  let value
  let called = false
  const ret = (...args) => {
    if (called) return value
    called = true
    value = fun(...args)
    return value
  }

  ret.__resetOnce__ = () => {
    called = false
  }

  return ret
}

/**
 * clean onced function
 * @param  {object} fun return value of onced function
 */
export function resetOnce (fun) {
  if (typeof fun.__resetOnce__ === 'function') {
    fun.__resetOnce__()
  } else {
    throw new TypeError('not a once function')
  }
}

/**
 * a function that do nothing
 */
export function noop () {}

/**
 * a function that return its first argument
 */
export function pass (res) { return res }

export function noThrow (fun) {
  return (...args) => {
    try {
      return fun(...args)
    } catch (e) {
      console.error(e)
    }
  }
}

export function paddingLeft (str = '', length, padding) {
  str += ''
  if (str.length >= length) return str
  let need = length - str.length
  while (need--) {
    str = padding + str
  }
  return str
}

const _p = (str) => paddingLeft(str, 2, '0')

const curYear = (new Date()).getFullYear()

/**
 * format DateTime
 * @param  {Date/Number} timestamp timestamp
 * @param  {Object} opts  format options
 * @return {String}         formatted DateTime
 */
export function formatDateTime (timestamp, opts = {}) {
  if (!timestamp) return
  const t = (timestamp instanceof Date) ? timestamp : new Date(parseInt(timestamp))
  const {smart = true, second = false} = opts
  let ret
  if (smart && t.getFullYear() === curYear) {
    ret = `${_p(t.getMonth() + 1)}/${_p(t.getDate())} ${_p(t.getHours())}:${_p(t.getMinutes())}`
  } else {
    ret = `${t.getFullYear()}/${_p(t.getMonth() + 1)}/${_p(t.getDate())} ${_p(t.getHours())}:${_p(t.getMinutes())}`
  }
  if (second) {
    ret += `:${_p(t.getSeconds())}`
  }
  return ret
}

/**
 * make a Promise sleeping
 * @param {number} time sleep ms
 * @param {Promise} promise
 * @returns {Promise} wrapped Promise
 */
export function sleep (time = 5000, promise = Promise.resolve()) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      promise.then(resolve, reject)
    }, time)
  })
}

function cacheReturn (value) {
  if (value.isPromise) {
    return Promise.resolve(value.value)
  } else {
    return value.value
  }
}

export function cached (fun, storagePrefix = '') {
  let cache = {}
  return function () {
    const key = JSON.stringify(arguments)
    if (!cache[key]) { // 未内存缓存
      let stored
      try {
        storagePrefix && (stored = wx.getStorageSync(storagePrefix + key))
      } catch (e) {
        console.error(e)
      }
      if (stored) { // 已本地缓存
        cache[key] = stored
        return cacheReturn(cache[key])
      } else {
        const value = fun.apply(this, arguments)
        if (value instanceof Promise) {
          value.then((value) => {
            cache[key] = {value, isPromise: true}
            storagePrefix && wx.setStorage({key: storagePrefix + key, data: cache[key]})
          }, () => {})
        } else {
          cache[key] = {value, isPromise: false}
          try {
            storagePrefix && wx.setStorage({key: storagePrefix + key, data: cache[key]})
          } catch(e) {}
        }
        return value
      }
    } else { // 已有缓存
      return cacheReturn(cache[key])
    }
  }
}

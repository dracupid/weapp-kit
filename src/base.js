/**
 * @author Zhao Jingchen
 * @link https://github.com/dracupid/weapp-kit
 */

export function plainClone (obj) {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (e) {
    return obj
  }
}

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

export function resetOnce (fun) {
  if (typeof fun.__resetOnce__ === 'function') {
    fun.__resetOnce__()
  } else {
    throw new TypeError('not a once function')
  }
}

export function noop () {}

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

export function formatDateTime (timestamp) {
  if (!timestamp) return
  const t = (timestamp instanceof Date) ? timestamp : new Date(parseInt(timestamp))
  return `${t.getFullYear()}-${_p(t.getMonth() + 1)}-${_p(t.getDate())} ${_p(t.getHours())}:${_p(t.getMinutes())}:${_p(t.getSeconds())}`
}

export function sleep (time = 5000, promise = Promise.resolve()) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      promise.then(resolve, reject)
    }, time)
  })
}

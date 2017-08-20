import { wxPromisify } from './promise'
import { getLogger } from './logger'
import { plainClone } from './base'

const wxRequest = wxPromisify(wx.request)
const reqLogger = getLogger('@req')
const resLogger = getLogger('@res')
let requestId = 0

export function responseFilter (res) {
  let {statusCode, data} = res
  if (statusCode >= 200 && statusCode < 400) {
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (e) { }
    }
    resLogger.info(plainClone(data))
    return Promise.resolve(data)
  } else {
    resLogger.error(statusCode, plainClone(data))
    return Promise.reject(data)
  }
}

export function jsonPResponseFilter (res) {
  if (typeof res.data === 'string') {
    const start = res.data.indexOf('(')
    if (start) {
      res.data = res.data.substring(start + 1, res.data.length - 1)
    }
  }
  return responseFilter(res)
}

export function request (url, data, opt = {}) {
  const id = requestId++
  const {method = 'GET', onReturn, jsonP, logTime} = opt

  reqLogger.info(id, url, plainClone(data))
  const timeStart = Date.now()
  return wxRequest({url, data, method}, onReturn)
    .then((res) => {
      resLogger[logTime ? 'log' : 'info'](id, `use ${(Date.now() - timeStart) / 1000}s`)
      return res
    })
    .catch((e) => {
      resLogger[logTime ? 'log' : 'info'](id, `use ${(Date.now() - timeStart) / 1000}s`)
      resLogger.error(e)
      throw e
    })
    .then(jsonP ? jsonPResponseFilter : responseFilter)
}

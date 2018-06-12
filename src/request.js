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
    resLogger.debug(plainClone(data))
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

/**
 * send request
 *
 * @param {string} url request url
 * @param {object} data request data
 * @param {object} [opt={}] request options
 * @property {string} [method='GET'] request method
 * @property {function} onReturn callback for use wx.request return value
 * @property {boolean} [jsonP=false] jsonP request?
 * @property {boolean} [logTime=false] log time
 * @property {number} [retry=0] retryTimes
 * @returns {Promise} promise
 */
export function request (url, data, opt = {}) {
  const id = requestId++
  const {method = 'GET', onReturn, jsonP, logTime} = opt

  reqLogger.debug(id, url, plainClone(data))
  const timeStart = Date.now()
  return wxRequest({url, data, method}, onReturn)
    .then((res) => {
      resLogger[logTime ? 'log' : 'debug'](id, `use ${(Date.now() - timeStart) / 1000}s`)
      return res
    })
    .catch((e) => {
      resLogger[logTime ? 'log' : 'debug'](id, `use ${(Date.now() - timeStart) / 1000}s`)
      resLogger.error(e)
      throw e
    })
    .then(jsonP ? jsonPResponseFilter : responseFilter)
    .catch((e) => {
      if (opt.retry > 0) {
        opt.retry -= 1
        resLogger.warn(`retry request (${opt.retry} remains)`, e)
        return request(url, data, opt)
      } else {
        throw e
      }
    })
}

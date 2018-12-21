import { WxAPIError } from './error'

/**
 * promisify a wx API
 * @param fun wx API function
 * @param [thisArg=wx] this
 * @returns {Function} (arg, onReturn)
 */
export function wxPromisify (fun, thisArg = wx) {
  return function (arg = {}, onReturn) {
    let _arg = Object.assign({}, arg)
    return new Promise(function (resolve, reject) {
      _arg.success = resolve
      _arg.fail = (e) => {
        return reject(new WxAPIError(e.errMsg, e))
      }
      // _arg.complete = console.log
      try {
        let ret = fun.call(thisArg, _arg)
        if (typeof onReturn === 'function') { // onReturn 接受返回值
          onReturn(ret)
        }
      } catch (e) {
        reject(new WxAPIError(e.errMsg, e))
      }
    })
  }
}

/**
 * call a wx API in a Promise way
 * @param fun wx API function
 * @param arg argument
 * @param [thisArg=wx] this
 * @param onReturn get wx.*'s return value
 * @returns {Promise}
 */
export function callAsPromise (fun, arg = {}, thisArg = wx, onReturn) {
  return wxPromisify(fun, thisArg)(arg, onReturn)
}

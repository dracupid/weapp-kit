/**
 * @author Zhao Jingchen
 * @license MIT
 * @link https://github.com/dracupid/weapp-kit
 */

/**
 * Clone an object using JSON
 * @param  {Object} obj object to clone
 * @return {object}     cloned object
 */
function plainClone (obj) {
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
function once (fun) {
  let value;
  let called = false;
  const ret = (...args) => {
    if (called) return value
    called = true;
    value = fun(...args);
    return value
  };

  ret.__resetOnce__ = () => {
    called = false;
  };

  return ret
}

/**
 * clean onced function
 * @param  {object} fun return value of onced function
 */
function resetOnce (fun) {
  if (typeof fun.__resetOnce__ === 'function') {
    fun.__resetOnce__();
  } else {
    throw new TypeError('not a once function')
  }
}

/**
 * a function that do nothing
 */
function noop () {}

/**
 * a function that return its first argument
 */
function pass (res) { return res }

function noThrow (fun) {
  return (...args) => {
    try {
      return fun(...args)
    } catch (e) {
      console.error(e);
    }
  }
}

function paddingLeft (str = '', length, padding) {
  str += '';
  if (str.length >= length) return str
  let need = length - str.length;
  while (need--) {
    str = padding + str;
  }
  return str
}

const _p = (str) => paddingLeft(str, 2, '0');

const curYear = (new Date()).getFullYear();

/**
 * format DateTime
 * @param  {Date/Number} timestamp timestamp
 * @param  {Object} opts  format options
 * @return {String}         formatted DateTime
 */
function formatDateTime (timestamp, opts = {}) {
  if (!timestamp) return
  const t = (timestamp instanceof Date) ? timestamp : new Date(parseInt(timestamp));
  const { smart = true, second = false } = opts;
  let ret;
  if (smart && t.getFullYear() === curYear) {
    ret = `${_p(t.getMonth() + 1)}/${_p(t.getDate())} ${_p(t.getHours())}:${_p(t.getMinutes())}`;
  } else {
    ret = `${t.getFullYear()}/${_p(t.getMonth() + 1)}/${_p(t.getDate())} ${_p(t.getHours())}:${_p(t.getMinutes())}`;
  }
  if (second) {
    ret += `:${_p(t.getSeconds())}`;
  }
  return ret
}

/**
 * make a Promise sleeping
 * @param {number} time sleep ms
 * @param {Promise} promise
 * @returns {Promise} wrapped Promise
 */
function sleep (time = 5000, promise = Promise.resolve()) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      promise.then(resolve, reject);
    }, time);
  })
}

function cacheReturn (value) {
  if (value.isPromise) {
    return Promise.resolve(value.value)
  } else {
    return value.value
  }
}

function cached (fun, opts = {}) {
  let { storagePrefix, limit } = opts;
  storagePrefix = storagePrefix || '';
  limit = typeof limit === 'undefined' ? -1 : limit;

  let cache = {};
  return function (...args) {
    if (limit >= 0) args = args.slice(0, limit);
    const key = JSON.stringify(args);
    if (!cache[key]) { // 未内存缓存
      let stored;
      try {
        storagePrefix && (stored = wx.getStorageSync(storagePrefix + key));
      } catch (e) {
        console.error(e);
      }
      if (stored) { // 已本地缓存
        cache[key] = stored;
        return cacheReturn(cache[key])
      } else {
        const value = fun.apply(this, arguments);
        if (value instanceof Promise) {
          cache[key] = { value, isPromise: false }; // 先内存缓存
          value.then((value) => {
            cache[key] = { value, isPromise: true };
            storagePrefix && wx.setStorage({ key: storagePrefix + key, data: cache[key] });
          }, () => {});
        } else {
          cache[key] = { value, isPromise: false };
          try {
            storagePrefix && wx.setStorage({ key: storagePrefix + key, data: cache[key] });
          } catch (e) {}
        }
        return value
      }
    } else { // 已有缓存
      return cacheReturn(cache[key])
    }
  }
}

let loggers = {};

class Logger {
  constructor (tag) {
    this.prefix = `{${tag}}`

    ;['debug', 'info', 'log', 'warn', 'error'].forEach((name) => {
      this[name] = (...args) => {
        args.unshift(this.prefix);
        console[name](...args);
      };
    });
  }
}

function getLogger (tag) {
  loggers[tag] || (loggers[tag] = new Logger(tag));
  return loggers[tag]
}

class SingleCache {
  constructor (key) {
    this.key = key;
    this.logger = getLogger('@cache.' + key);
  }

  get () {
    try {
      return wx.getStorageSync(this.key)
    } catch (e) {
      this.logger.warn(e);
      return null
    }
  }

  set (value, throwError = false) {
    try {
      wx.setStorageSync(this.key, value);
    } catch (e) {
      if (throwError) throw e
      else this.logger.warn(e);
    }
  }

  clear (throwError = false) {
    try {
      wx.removeStorageSync(this.key);
    } catch (e) {
      if (throwError) throw e
      else this.logger.warn(e);
    }
  }
}

const DEFAULT_AVATAR = 'http://mmbiz.qpic.cn/mmbiz_png/icTdbqWNOwNRuibColx4vicJV13QyHLiaDED6ZMG567CM9dxy4py7GNAzqPEVlrlic83SaSomVlh8nBdgako8nHAMRQ/0?wx_fmt=png/0';

function createQuery (selectQuery) {
  return {
    getElementSize (query) {
      return new Promise((resolve) => {
        selectQuery.select(query).fields({ size: true }, (res) => {
          resolve(res);
        }).exec();
      })
    }
  }
}

const logger = getLogger('@emitter');

class Emitter {
  constructor () {
    this.listeners = {};
  }

  /**
   * emit event
   * @param event event name
   * @param arg callback argument
   * @returns this
   */
  emit (event, arg) {
    (this.listeners[event] || [])
      .forEach((cb) => {
        cb(arg);
      });
    return this
  }

  /**
   * add event listener
   * @param event event name, or event names split by comma
   * @param cb callback
   * @returns this
   */
  on (event, cb) {
    if (!cb) {
      logger.error('cb cannot be empty');
      return this
    }
    event.split(',').forEach((e) => {
      if (this.listeners[e]) {
        this.listeners[e].push(cb);
      } else {
        this.listeners[e] = [cb];
      }
    });
    return this
  }
}

const globalEmitter = new Emitter();

const emit = globalEmitter.emit.bind(globalEmitter);
const on = globalEmitter.on.bind(globalEmitter);

let locks = {};
let lockWaiters = {};

/**
 * Lock Object
 */
class Lock {
  /**
   * @param [max=1] max lock holder number
   * @param [name] custom lock name. Same name means same lock
   */
  constructor (max = 1, name) {
    this.max = max;
    this.name = name || Symbol('weapp-kit-lock');
  }

  static from (lock) {
    return (lock instanceof Lock) ? lock : new Lock(1, lock)
  }
}

/**
 * require a lock
 * @param lock Lock object or a name
 * @returns {boolean} if the lock is given
 */
function requireLock (lock) {
  lock = Lock.from(lock);

  locks[lock.name] || (locks[lock.name] = 0);
  if (locks[lock.name] >= lock.max) {
    return false
  } else {
    locks[lock.name] += 1;
    return true
  }
}

/**
 * require and wait for a lock
 * @param lock Lock object or a name
 * @returns Promise
 */
function waitLock (lock) {
  lock = Lock.from(lock);

  if (requireLock(lock)) {
    return Promise.resolve()
  } else {
    return new Promise((resolve) => {
      lockWaiters[lock.name] = lockWaiters[lock.name] || [];
      lockWaiters[lock.name].push(resolve);
    })
  }
}

/**
 * release a lock
 * @param lock Lock object or a name
 */
function releaseLock (lock) {
  lock = Lock.from(lock);

  if (locks[lock.name] === 0) return

  locks[lock.name] -= 1;
  if (locks[lock.name] < lock.max && lockWaiters[lock.name] && lockWaiters[lock.name].length > 0) {
    locks[lock.name] += 1;
    lockWaiters[lock.name].shift()();
  }
}

const MODE = {
  refresh: 'refresh',
  cached: 'cached',
  storage: 'storage',
  append: 'append',
  prepend: 'prepend',
  remove: 'remove'
};

class DataLoader {
  /**
   * 初始化
   * @param {function} dataLoader 数据加载函数。返回数据
   * @param {object} opt 选项
   * @option {string=''} storageKey 缓存Key。若为空，不使用缓存
   * @option {boolean=true} useLock  请求是否加锁
   */
  constructor (dataLoader, opt = {}) {
    this.opt = Object.assign({
      storageKey: '',
      useLock: true
    }, opt);

    this.dataLoader = dataLoader;

    if (this.opt.useLock) {
      this.lock = new Lock();
    }

    if (this.opt.storageKey) {
      this.storage = new SingleCache(this.opt.storageKey);
    }

    this.logger = getLogger('@DataLoader');
    this.emitter = new Emitter();
    this.reset();
  }

  // @overwrite
  reset () {
    this.data = null;
  }

  beforeLoad (fun) {
    this.emitter.on('beforeLoad', noThrow(fun));
    return this
  }

  onData (fun) {
    this.emitter.on('data', noThrow(fun));
    return this
  }

  onNewData (fun) {
    this.emitter.on('newData', noThrow(fun));
    return this
  }

  onError (fun) {
    this.emitter.on('error', noThrow(fun));
    return this
  }

  // @overwrite
  _isValidData (data) {
    return data !== undefined && data !== null
  }

  _save (data) {
    if (!this.storage) return
    this.storage.set(data);
  }

  _restore () {
    if (!this.storage) return undefined
    const data = this.storage.get();
    if (this._isValidData(data)) {
      this.emitter.emit('data', { data, mode: MODE.storage });
    }
  }

  // @overwrite
  _doLoadData () {
    this.emitter.emit('beforeLoad');
    return this.dataLoader()
      .then((data = []) => {
        this.emitter.emit('newData', { data });
        this._save(data);
        this.data = data;
        this.emitter.emit('data', { data, mode: MODE.refresh });
      })
  }

  _loadData (...args) {
    if (!this.lock || requireLock(this.lock)) {
      return this._doLoadData(...args)
        .then(() => {
          this.lock && releaseLock(this.lock);
        }).catch((e) => {
          this.lock && releaseLock(this.lock);
          this.emitter.emit('error', e);
        })
    } else {
      this.logger.warn('Repeat loading.');
      return Promise.resolve()
    }
  }

  load () {
    this._restore();

    if (this._isValidData(this.data)) {
      this.emitter.emit('data', { data: this.data, mode: MODE.cached });
      return Promise.resolve()
    } else {
      return this._loadData()
    }
  }
}

class ListLoader extends DataLoader {
  /**
   * @param {function} listLoader 列表加载器。传入参数(lastItem, curLength)，返回Object {data, ended}
   * @param {object} opt
   * @option {number=-1} storageLimit 列表存储长度限制。<0 为不限制
   * @option {function} listCleaner 列表数据清理函数
   */
  constructor (listLoader, opt) {
    super(listLoader, opt);

    this.opt = Object.assign(this.opt, {
      storageLimit: -1,
      listCleaner: null,
      infinite: false
    }, opt);

    this.logger = getLogger('@ListLoader');
    this.ended = false;
  }

  reset () {
    this.data = [];
  }

  _isValidData (data) {
    return Array.isArray(data) && data.length > 0
  }

  _doLoadData (mode = MODE.append) {
    if (mode === MODE.refresh) {
      this.ended = false;
      this.data = [];
    } else if (mode === MODE.prepend) {
      this.ended = false;
    }

    if (this.ended) {
      this.logger.info('load ended.');
      return Promise.resolve()
    }

    this.emitter.emit('beforeLoad');
    return this.dataLoader(this.data[this.data.length - 1], this.data.length)
      .then(({ data = [], ended = false, args = {} }) => {
        this.ended = data.length === 0 ? true : ended;
        if (this.opt.infinite) this.ended = false;
        if (typeof this.opt.listCleaner === 'function') {
          data = this.opt.listCleaner(data);
        }
        this.emitter.emit('newData', { data, ended });
        switch (mode) {
          case MODE.refresh:
            this.data = data;
            break
          case MODE.prepend:
            this.data = data.concat(this.data);
            break
          default:
            this.data = this.data.concat(data);
        }
        this._save(this.opt.storageLimit < 0
          ? this.data
          : this.data.slice(0, this.opt.storageLimit));
        this.emitter.emit('data', { data: this.data, mode, ended: this.ended, args });
      })
  }

  loadMore () {
    return this._loadData(MODE.append)
  }

  prepend () {
    return this._loadData(MODE.prepend)
  }

  refresh () {
    return this._loadData(MODE.refresh)
  }

  remove (index) {
    this.data.splice(index, 1);
    this.emitter.emit('data', { data: this.data, mode: MODE.remove, ended: this.ended });
  }
}

class ExtendableError extends Error {
  constructor (message) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

class WxAPIError extends ExtendableError {
  constructor (msg, source) {
    let idx;
    const rawErrMsg = msg;
    // eslint-disable-next-line no-cond-assign
    if ((idx = msg.indexOf(':fail')) > 0) {
      msg = msg.slice(idx + 5);
    // eslint-disable-next-line no-cond-assign
    } else if ((idx = msg.indexOf(':cancel')) > 0) {
      msg = msg.slice(idx + 7);
    }
    msg = msg.trim();
    super(msg);
    this.source = source;
    this.rawErrMsg = rawErrMsg;
  }
}

/**
 * promisify a wx API
 * @param fun wx API function
 * @param [thisArg=wx] this
 * @returns {Function} (arg, onReturn)
 */
function wxPromisify (fun, thisArg = wx) {
  return function (arg = {}, onReturn) {
    let _arg = Object.assign({}, arg);
    return new Promise(function (resolve, reject) {
      _arg.success = resolve;
      _arg.fail = (e) => {
        return reject(new WxAPIError(e.errMsg, e))
      };
      // _arg.complete = console.log
      try {
        let ret = fun.call(thisArg, _arg);
        if (typeof onReturn === 'function') { // onReturn 接受返回值
          onReturn(ret);
        }
      } catch (e) {
        reject(new WxAPIError(e.errMsg, e));
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
function callAsPromise (fun, arg = {}, thisArg = wx, onReturn) {
  return wxPromisify(fun, thisArg)(arg, onReturn)
}

const wxRequest = wxPromisify(wx.request);
const reqLogger = getLogger('@req');
const resLogger = getLogger('@res');
let requestId = 0;

function responseFilter (res) {
  let { statusCode, data } = res;
  if (statusCode >= 200 && statusCode < 400) {
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { }
    }
    resLogger.debug(plainClone(data));
    return Promise.resolve(data)
  } else {
    resLogger.error(statusCode, plainClone(data));
    return Promise.reject(data)
  }
}

function jsonPResponseFilter (res) {
  if (typeof res.data === 'string') {
    const start = res.data.indexOf('(');
    if (start) {
      res.data = res.data.substring(start + 1, res.data.length - 1);
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
function request (url, data, opt = {}) {
  const id = requestId++;
  const { method = 'GET', onReturn, jsonP, logTime } = opt;

  reqLogger.debug(id, url, plainClone(data));
  const timeStart = Date.now();
  return wxRequest({ url, data, method }, onReturn)
    .then((res) => {
      resLogger[logTime ? 'log' : 'debug'](id, `use ${(Date.now() - timeStart) / 1000}s`);
      return res
    })
    .catch((e) => {
      resLogger[logTime ? 'log' : 'debug'](id, `use ${(Date.now() - timeStart) / 1000}s`);
      resLogger.error(e);
      throw e
    })
    .then(jsonP ? jsonPResponseFilter : responseFilter)
    .catch((e) => {
      if (opt.retry > 0) {
        opt.retry -= 1;
        resLogger.warn(`retry request (${opt.retry} remains)`, e);
        return request(url, data, opt)
      } else {
        throw e
      }
    })
}

function showInfo (title = '提示', content = '无内容', opts = {}) {
  const { confirmText = '好的' } = opts;
  wx.showModal({
    title,
    content,
    showCancel: false,
    confirmText
  });
}

export { plainClone, once, resetOnce, noop, pass, noThrow, paddingLeft, formatDateTime, sleep, cached, SingleCache, DEFAULT_AVATAR, createQuery, Emitter, emit, on, DataLoader, ListLoader, Lock, requireLock, waitLock, releaseLock, getLogger, wxPromisify, callAsPromise, responseFilter, jsonPResponseFilter, request, showInfo };

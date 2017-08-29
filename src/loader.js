import * as lock from './lock'
import { getLogger } from './logger'
import { Emitter } from './emitter'
import { noThrow } from './base'
import { SingleCache } from './cache'

const MODE = {
  refresh: 'refresh',
  cached: 'cached',
  storage: 'storage',
  append: 'append',
  prepend: 'prepend',
  remove: 'remove'
}

export class DataLoader {
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
    }, opt)

    this.dataLoader = dataLoader

    if (this.opt.useLock) {
      this.lock = new lock.Lock()
    }

    if (this.opt.storageKey) {
      this.storage = new SingleCache(this.opt.storageKey)
    }

    this.logger = getLogger('@DataLoader')
    this.emitter = new Emitter()
    this.reset()
  }

  // @overwrite
  reset () {
    this.data = null
  }

  beforeLoad (fun) {
    this.emitter.on('beforeLoad', noThrow(fun))
    return this
  }

  onData (fun) {
    this.emitter.on('data', noThrow(fun))
    return this
  }

  onNewData (fun) {
    this.emitter.on('newData', noThrow(fun))
    return this
  }

  onError (fun) {
    this.emitter.on('error', noThrow(fun))
    return this
  }

  // @overwrite
  _isValidData (data) {
    return data !== undefined && data !== null
  }

  _save (data) {
    if (!this.storage) return
    this.storage.set(data)
  }

  _restore () {
    if (!this.storage) return undefined
    const data = this.storage.get()
    if (this._isValidData(data)) {
      this.emitter.emit('data', {data, mode: MODE.storage})
    }
  }

  // @overwrite
  _doLoadData () {
    return this.dataLoader()
      .then((data = []) => {
        this.emitter.emit('newData', {data})
        this._save(data)
        this.data = data
        this.emitter.emit('data', {data, mode: MODE.refresh})
      })
  }

  _loadData (...args) {
    if (!this.lock || lock.requireLock(this.lock)) {
      this.emitter.emit('beforeLoad')
      return this._doLoadData(...args)
        .then(() => {
          this.lock && lock.releaseLock(this.lock)
        }).catch((e) => {
          this.lock && lock.releaseLock(this.lock)
          this.emitter.emit('error', e)
        })
    } else {
      this.logger.warn('Repeat loading.')
      return Promise.resolve()
    }
  }

  load () {
    this._restore()

    if (this._isValidData(this.data)) {
      this.emitter.emit('data', {data: this.data, mode: MODE.cached})
      return Promise.resolve()
    } else {
      return this._loadData()
    }
  }
}

export class ListLoader extends DataLoader {
  /**
   * @param {function} listLoader 列表加载器。传入参数(lastItem, curLength)，返回Object {data, ended}
   * @param {object} opt
   * @option {number=-1} storageLimit 列表存储长度限制。<0 为不限制
   * @option {function} listCleaner 列表数据清理函数
   */
  constructor (listLoader, opt) {
    super(listLoader, opt)

    this.opt = Object.assign(this.opt, {
      storageLimit: -1,
      listCleaner: null
    }, opt)

    this.logger = getLogger('@ListLoader')
    this.ended = false
  }

  reset () {
    this.data = []
  }

  _isValidData (data) {
    return Array.isArray(data) && data.length > 0
  }

  _doLoadData (mode = MODE.append) {
    if (this.ended) {
      this.logger.info('load ended.')
      return Promise.resolve()
    }
    return this.dataLoader(this.data[this.data.length - 1], this.data.length)
      .then(({data = [], ended = false}) => {
        if (typeof this.opt.listCleaner === 'function') {
          data = this.opt.listCleaner(data)
        }
        this.ended = data.length === 0 ? true : ended
        this.emitter.emit('newData', {data, ended})
        switch (mode) {
          case MODE.refresh:
            this.data = data
            break
          case MODE.prepend:
            this.data = data.concat(this.data)
            break
          default:
            this.data = this.data.concat(data)
        }
        this._save(this.opt.storageLimit < 0
          ? this.data
          : this.data.slice(0, this.opt.storageLimit))
        this.emitter.emit('data', {data: this.data, mode, ended: this.ended})
      })
  }

  loadMore () {
    return this._loadData(MODE.append)
  }

  prepend () {
    this.ended = false
    return this._loadData(MODE.prepend)
  }

  refresh () {
    this.ended = false
    return this._loadData(MODE.refresh)
  }

  remove (index) {
    this.data.splice(index, 1)
    this.emitter.emit('data', {data: this.data, mode: MODE.remove, ended: this.ended})
  }
}

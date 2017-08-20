import * as lock from './lock'
import { getLogger } from './logger'
import { Emitter } from './emitter'
import { noThrow } from './base'
import { SingleCache } from './cache'

const MODE = {
  append: 'append',
  prepend: 'prepend',
  refresh: 'refresh',
  cached: 'cached',
  storage: 'storage'
}

export class ListLoader {
  constructor (listLoader, opt) {
    this.opt = Object.assign({
      storageKey: '', // string
      storageLimit: -1, // number
      useLock: true, // bool
      listCleaner: null // function,
    }, opt)

    this.loadListData = listLoader
    this.listCache = []
    this.logger = getLogger('@ListLoader')
    this.emitter = new Emitter()

    if (this.opt.useLock) {
      this.lock = new lock.Lock()
    }

    if (this.opt.storageKey) {
      this.storage = new SingleCache(this.opt.storageKey)
    }
  }

  beforeLoad (fun) {
    this.emitter.on('beforeLoad', noThrow(fun))
  }

  onData (fun) {
    this.emitter.on('data', noThrow(fun))
  }

  onNewData (fun) {
    this.emitter.on('newData', noThrow(fun))
  }

  onError (fun) {
    this.emitter.on('error', noThrow(fun))
  }

  _save () {
    if (!this.storage) return
    this.storage.set(
      this.opt.storageLimit < 0
        ? this.listCache
        : this.listCache.slice(0, this.opt.storageLimit)
    )
  }

  _restore () {
    if (!this.storage) return null
    const data = this.storage.get()
    if (data && data.length !== 0) {
      this.emitter.emit('data', {data, mode: MODE.storage})
    }
  }

  _loadList (mode = MODE.append) {
    if (!this.lock || lock.requireLock(this.lock)) {
      this.emitter.emit('beforeLoad')
      return this.loadListData(this.listCache[this.listCache.length - 1], this.listCache.length)
        .then(this.opt.listCleaner)
        .then((data = []) => {
          this.emitter.emit('newData', {data})
          switch (mode) {
            case MODE.refresh:
              this.listCache = data
              break
            case MODE.prepend:
              this.listCache = data.concat(this.listCache)
              break
            default:
              this.listCache = this.listCache.concat(data)
          }
          this._save()
          this.emitter.emit('data', {data: this.listCache, mode})
          this.lock && lock.releaseLock(this.lock)
        }).catch((e) => {
          this.lock && lock.releaseLock(this.lock)
          this.emitter.emit('error', e)
        })
    } else {
      this.logger.warn('Repeat loading list.')
      return Promise.resolve()
    }
  }

  load () {
    this._restore()

    if (this.listCache.length !== 0) {
      this.emitter.emit('data', {data: this.listCache, mode: MODE.cached})
      return Promise.resolve()
    } else {
      return this._loadList(MODE.refresh)
    }
  }

  loadMore () {
    return this._loadList(MODE.append)
  }

  prepend () {
    return this._loadList(MODE.prepend)
  }

  refresh () {
    return this._loadList(MODE.refresh)
  }

  clean () {
    this.listCache = []
  }
}

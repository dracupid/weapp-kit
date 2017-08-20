import { getLogger } from './logger'

const logger = getLogger('@emitter')

export class Emitter {
  constructor () {
    this.listeners = {}
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
        cb(arg)
      })
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
      logger.error('cb cannot be empty')
      return this
    }
    event.split(',').forEach((e) => {
      if (this.listeners[e]) {
        this.listeners[e].push(cb)
      } else {
        this.listeners[e] = [cb]
      }
    })
    return this
  }
}

const globalEmitter = new Emitter()

export const emit = globalEmitter.emit.bind(globalEmitter)
export const on = globalEmitter.on.bind(globalEmitter)

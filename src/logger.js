let loggers = {}

class Logger {
  constructor (tag) {
    this.prefix = `【${tag}】`

    ;['debug', 'info', 'log', 'warn', 'error'].forEach((name) => {
      this[name] = (...args) => {
        args.unshift(this.prefix)
        console[name](...args)
      }
    })
  }
}

export function getLogger (tag) {
  loggers[tag] || (loggers[tag] = new Logger(tag))
  return loggers[tag]
}

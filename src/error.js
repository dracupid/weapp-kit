class ExtendableError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(message)).stack
    }
  }
}

class WxAPIError extends ExtendableError {
  constructor (msg, source) {
    let idx
    const rawErrMsg = msg
    // eslint-disable-next-line no-cond-assign
    if ((idx = msg.indexOf(':fail')) > 0) {
      msg = msg.slice(idx + 5)
    // eslint-disable-next-line no-cond-assign
    } else if ((idx = msg.indexOf(':cancel')) > 0) {
      msg = msg.slice(idx + 7)
    }
    msg = msg.trim()
    super(msg)
    this.source = source
    this.rawErrMsg = rawErrMsg
  }
}

export { WxAPIError }

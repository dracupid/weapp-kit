let locks = {}
let lockWaiters = {}

/**
 * Lock Object
 */
export class Lock {
  /**
   * @param [max=1] max lock holder number
   * @param [name] custom lock name. Same name means same lock
   */
  constructor (max = 1, name) {
    this.max = max
    this.name = name || Symbol('weapp-kit-lock')
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
export function requireLock (lock) {
  lock = Lock.from(lock)

  locks[lock.name] || (locks[lock.name] = 0)
  if (locks[lock.name] >= lock.max) {
    return false
  } else {
    locks[lock.name] += 1
    return true
  }
}

/**
 * require and wait for a lock
 * @param lock Lock object or a name
 * @returns Promise
 */
export function waitLock (lock) {
  lock = Lock.from(lock)

  if (requireLock(lock)) {
    return Promise.resolve()
  } else {
    return new Promise((resolve) => {
      lockWaiters[lock.name] = lockWaiters[lock.name] || []
      lockWaiters[lock.name].push(resolve)
    })
  }
}

/**
 * release a lock
 * @param lock Lock object or a name
 */
export function releaseLock (lock) {
  lock = Lock.from(lock)

  if (locks[lock.name] === 0) return

  locks[lock.name] -= 1
  if (locks[lock.name] < lock.max && lockWaiters[lock.name] && lockWaiters[lock.name].length > 0) {
    locks[lock.name] += 1
    lockWaiters[lock.name].shift()()
  }
}

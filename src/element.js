export function createQuery (selectQuery) {
  return {
    getElementSize (query) {
      return new Promise((resolve) => {
        selectQuery.select(query).fields({size: true}, (res) => {
          resolve(res)
        }).exec()
      })
    }
  }
}

export class SocketPoolController {
  #pool = []

  broadcast(stringPacket) {
    this.#pool.forEach((socket) => {
      socket.send(stringPacket, true, true)
    })
  }

  has(id) {
    if (this.#pool[id] === undefined) return false
    return true
  }

  swapKey(oldName, newName) {
    if (this.has(id)) {
      this.#pool[newName] = this.#pool[oldName]
      this.#pool[oldName] = undefined
    } else
      throw new SocketPullException('No such socket id in pool', {
        id: oldName,
      })
  }

  addProperty(id, prop) {
    if (this.has(id)) {
      this.#pool[id][prop.name] = prop.value
      return true
    } else return false
  }

  get(id) {
    return this.#pool[id]
  }

  set(id, socket) {
    this.#pool[id] = socket
  }

  delete(id) {
    if (this.has(id)) {
      this.#pool[id] = undefined
      return true
    } else return undefined
  }
}

function SocketPullException(message, data) {
  this.message = message
  this.data = data
}

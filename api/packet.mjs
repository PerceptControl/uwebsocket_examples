export class Packet {
  #data = {}

  toString() {
    return JSON.stringify(this.#data)
  }

  set(propertyName, propertyValue) {
    this.#data[propertyName] = propertyValue
  }

  set message(message) {
    this.#data.message = message
  }
}

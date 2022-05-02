export class Packet {
  #data = {}

  //Создаем сообщение формата 'code:data' из объекта
  toString() {
    return JSON.stringify(this.#data)
  }

  set(property) {
    this.#data[property.name] = property.value
  }

  set message(message) {
    this.#data.message = message
  }
}

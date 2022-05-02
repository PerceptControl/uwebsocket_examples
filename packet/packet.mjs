export class Packet {
  #data = {}

  //Создаем сообщение формата 'code:data' из объекта
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

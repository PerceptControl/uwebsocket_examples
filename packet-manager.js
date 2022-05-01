module.exports = class PacketManager {
  #data
  #code
  constructor() {}

  get(nameOfProperty) {
    if (this.#data[nameOfProperty]) return this.#data[nameOfProperty]
  }

  static newPacket(code) {
    return new Packet(code)
  }

  get code() {
    return this.#code
  }

  //Задаем текущий обрабатываемый пакет данных из сокета
  set packet(packet) {
    this.#data = packet.data
    this.#code = packet.code
  }
}

class Packet {
  #data = {}
  #code
  constructor(code) {
    this.#code = code
  }

  //Создаем сообщение формата 'code:data' из объекта
  toString() {
    return JSON.stringify({ code: this.#code, data: this.#data })
  }

  set message(message) {
    this.#data.message = message
  }

  set author(author) {
    this.#data.author = author
  }

  set id(id) {
    this.#data.id = id
  }
}

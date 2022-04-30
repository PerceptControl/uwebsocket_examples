module.exports = class PacketManager {
  #data
  #code
  constructor() {}

  get(nameOfProperty) {
    if (this.#data[nameOfProperty]) return this.#data[nameOfProperty]
  }

  //Создаем сообщение формата 'code:data' из объекта
  static newPacket(code, data) {
    return JSON.stringify({ code: code, data: data })
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

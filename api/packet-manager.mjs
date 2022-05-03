export class PacketManager {
  #data
  #code

  //Задаем обрабатываемый пакет данных из сокета
  constructor(packet) {
    this.#data = packet
    this.#code = packet.code
  }

  get(nameOfProperty) {
    if (this.#data[nameOfProperty]) return this.#data[nameOfProperty]
  }

  get code() {
    return this.#code
  }
}

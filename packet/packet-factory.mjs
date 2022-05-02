import { Packet } from './packet.mjs'

export class PacketFactory {
  static create(code) {
    let newPacket = new Packet(code)
    newPacket.set({ name: 'code', value: code })
    return newPacket
  }

  static createWithAuthor(code, author) {
    let newPacket = this.create(code)
    newPacket.set({ name: 'author', value: author })
    return newPacket
  }

  static createWithId(code, id) {
    let newPacket = this.create(code)
    newPacket.set({ name: 'id', value: id })
    return newPacket
  }
}

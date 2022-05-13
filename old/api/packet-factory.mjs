import { Packet } from './packet.mjs'

export class PacketFactory {
  static create(code) {
    let newPacket = new Packet(code)
    newPacket.set('code', code)
    return newPacket
  }

  static createWithAuthor(code, author) {
    let newPacket = this.create(code)
    newPacket.set('author', author)
    return newPacket
  }

  static createWithId(code, id) {
    let newPacket = this.create(code)
    newPacket.set('id', id)
    return newPacket
  }
}

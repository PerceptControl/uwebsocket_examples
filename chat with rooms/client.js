/**
 * @Usage command: data
 * Command list:
 * - join: room
 * - leave: room
 * - register: name
 * - send: message(send to all rooms which use user)
 */

class Packet {
  #data = {}

  toString() {
    return JSON.stringify(this.#data)
  }

  set(propertyName, propertyValue) {
    this.#data[propertyName] = propertyValue
  }
}

class PacketFactory {
  static create(actionCode) {
    let newPacket = new Packet()
    newPacket.set('code', actionCode)
    return newPacket
  }
}

class PacketManager {
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

  get data() {
    return this.#data
  }
}

class InputController {
  #input
  constructor(inputObject) {
    this.#input = inputObject
  }

  alert(message) {
    ChatController.print(message)
  }

  clear() {
    this.#input.value = ''
  }

  get command() {
    return this.#input.value.split(':')[0].trim()
  }

  get data() {
    switch (this.#length) {
      case 2:
        return this.#input.value.split(':')[1].trim()

      case 3: {
        let inputs = this.#input.value.split(':')
        return {
          subcommand: inputs[1].trim(),
          message: inputs[2].trim(),
        }
      }
    }
  }

  get #length() {
    return this.#input.value.split(':').length
  }
}

class ChatController {
  static print(data) {
    let chat = document.getElementById('messages')
    let li = document.createElement('li')
    let text = document.createTextNode(data)
    li.appendChild(text)
    chat.appendChild(li)
  }

  static systemPrint(message) {
    var str = `system: ${message}`
    this.print(str)
  }
}

async function socketDataToObject(data) {
  //Объект Blob представляет из себя подобный файлу объект с неизменяемыми, необработанными данными
  if (data instanceof Blob) return JSON.parse(await data.text())
  else if (data instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder('utf-8').decode(await data))
  }
}

var socket = new WebSocket('ws://localhost:3000/')
socket.binaryType = 'arraybuffer'

let inputController = new InputController(document.getElementById('input'))

socket.onopen = (e) => {
  console.log('[open] Соединение установлено')
}

socket.onmessage = async function (socketData) {
  let finalData = await socketDataToObject(socketData.data)
  var manager = new PacketManager(finalData)

  console.log(`Данные получены: ${JSON.stringify(manager.data)}`)

  switch (manager.code) {
    case 'getId': {
      socket.id = manager.get('id')
      break
    }

    case 'private': {
      let author = manager.get('author')
      switch (author) {
        case 'system': {
          ChatController.systemPrint(manager.get('message'))
          break
        }

        case 'group': {
          ChatController.print(manager.get('message'))
          break
        }

        case 'user': {
          ChatController.print(manager.get('message'))
          break
        }

        case socket.id:
          break
      }
      break
    }

    case 'system': {
      ChatController.systemPrint(manager.get('message'))
      break
    }
  }
}

socket.onclose = async function (event) {
  if (event.wasClean) {
    console.log(
      `[close] Соединение закрыто чисто, код: ${event.code} причина: ${event.reason}`,
    )
  } else {
    // например, сервер убил процесс или сеть недоступна
    // обычно в этом случае event.code 1006
    console.log('[close] Соединение прервано')
  }
}

var button = document.getElementById('btn')
button.addEventListener('click', () => {
  dataPacket = PacketFactory.create(inputController.command)

  switch (inputController.command) {
    case 'join': {
      dataPacket.set('room', inputController.data)
      inputController.clear()

      socket.send(dataPacket.toString())
      break
    }

    case 'leave': {
      dataPacket.set('room', inputController.data)
      inputController.clear()

      socket.send(dataPacket.toString())
      break
    }

    case 'send': {
      dataPacket.set('message', inputController.data)
      inputController.clear()

      socket.send(dataPacket.toString())
      break
    }

    case 'sendToRoom': {
      dataPacket.set('roomName', inputController.data.subcommand)
      dataPacket.set('message', inputController.data.message)
      inputController.clear()

      socket.send(dataPacket.toString())
      break
    }

    case 'sendTo': {
      dataPacket.set('destination', inputController.data.subcommand)
      dataPacket.set('message', inputController.data.message)
      inputController.clear()

      socket.send(dataPacket.toString())
      break
    }

    case 'register': {
      dataPacket.set('name', inputController.data)
      inputController.clear()

      socket.send(dataPacket.toString())
      break
    }

    default: {
      inputController.alert('No such command')
    }
  }
})

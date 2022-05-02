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

  //Создаем сообщение формата 'code:data' из объекта
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
  clear() {
    this.#input.value = ''
  }

  get command() {
    return this.#input.value.split(':')[0].trim()
  }

  get data() {
    return this.#input.value.split(':')[1].trim()
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

//Объект Blob представляет из себя подобный файлу объект с неизменяемыми, необработанными данными
async function socketDataToObject(data) {
  if (data instanceof Blob) return JSON.parse(await data.text())
  else if (data instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder('utf-8').decode(await data))
  }
}

var socket = new WebSocket('ws://localhost:3000/')
//socket.binaryType = 'arraybuffer'

let inputController = new InputController(document.getElementById('input'))

socket.onopen = (e) => {
  console.log('[open] Соединение установлено')
}

socket.onmessage = async function (socketData) {
  console.log(await socketDataToObject(socketData.data))
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
  data = PacketFactory.create(inputController.command)

  switch (inputController.command) {
    case 'join': {
      data.set('room', inputController.data)
      inputController.clear()

      socket.send(data)
      break
    }

    case 'leave': {
      data.set('room', inputController.data)
      inputController.clear()

      socket.send(data)
      break
    }

    case 'send': {
      data.set('message', inputController.data)
      inputController.clear()

      socket.send(data)
      break
    }

    case 'register': {
      data.set('name', inputController.data)
      inputController.clear()

      socket.send(data)
      break
    }
  }
})

var socket = new WebSocket('ws://localhost:3000/')

class PacketManager {
  #data
  #code
  constructor() {}

  get(nameOfProperty) {
    if (this.#data[nameOfProperty]) return this.#data[nameOfProperty]
  }

  static newPacket(code, data) {
    return JSON.stringify({ code: code, data: data })
  }

  get code() {
    return this.#code
  }

  set packet(packet) {
    this.#data = packet.data
    this.#code = packet.code
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

  static system(message) {
    var str = `system: ${message}`
    this.print(str)
  }
}

var manager = new PacketManager()

function createDataPacket(action, data) {
  return JSON.stringify({ action: action, data: data })
}

socket.onopen = (e) => {
  console.log('[open] Соединение установлено')
}

socket.onmessage = async function (event) {
  //Получаем текст сообщения из промиса
  let data = await event.data.text()
  console.log(`Данные получены: ${data}`)

  //Преобразуем строку 'код: сообщение' к объекту
  manager.packet = JSON.parse(data)

  switch (manager.code) {
    case 'getId': {
      socket.id = manager.get('id')
      break
    }

    case 'private': {
      let author = manager.get('author')
      switch (author) {
        case 'system': {
          ChatController.system(manager.get('message'))
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
      ChatController.system(manager.get('message'))
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
  let inputController = new InputController(document.getElementById('input'))
  switch (inputController.command) {
    case 'join': {
      data = PacketManager.newPacket('join', { room: inputController.data })
      socket.send(data)
      inputController.clear()
      break
    }

    case 'leave': {
      data = PacketManager.newPacket('leave', { room: inputController.data })
      inputController.clear()
      socket.send(data)
      break
    }

    case 'send': {
      data = PacketManager.newPacket('send', { message: inputController.data })
      inputController.clear()
      socket.send(data)
      break
    }

    case 'register': {
      data = PacketManager.newPacket('register', {
        login: inputController.data,
      })
      inputController.clear()
      socket.send(data)
      break
    }
  }
})

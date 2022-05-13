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
    return this.#input.value.split(':')[1].trim()
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

async function objectFromBinary(data) {
  //Объект Blob представляет из себя подобный файлу объект с неизменяемыми, необработанными данными
  if (data instanceof Blob) return JSON.parse(await data.text())
  else if (data instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder('utf-8').decode(await data))
  }
}

var client = new Client('ws://localhost:3000')

client.of('main').on('open', (e, socket) => {
  console.log('[open] Соединение установлено')
})

client.of('main').on('error', (manager) => {
  ChatController.print(
    'Handle error %s: %s',
    manager.get('data/message'),
    manager.get('data/code'),
  )
})

client.of('main').on('join', (manager) => {
  ChatController.print(
    `(${manager.get('meta/room')}) joined ${manager.get('data/member')}`,
  )
})

client.of('main').on('leave', (manager) => {
  ChatController.print(
    `(${manager.get('meta/room')}) leaved ${manager.get('data/member')}`,
  )
})

client.of('main').on('login', (manager) => {
  ChatController.systemPrint(manager.get('data/message'))
})

client.of('main').on('groupChat', (manager) => {
  ChatController.print(
    `(${manager.get('meta/room')}) ${manager.get('meta/author')}: ${manager.get(
      'data/message',
    )}`,
  )
})

let inputController = new InputController(document.getElementById('input'))

var button = document.getElementById('btn')
button.addEventListener('click', () => {
  var packet = DataManager.createPacket()
  switch (inputController.command) {
    case 'send': {
      packet.set('data/message', inputController.data)
      break
    }

    case 'join': {
      packet.set('data/room', inputController.data)
      break
    }

    case 'leave': {
      packet.set('data/room', inputController.data)
      break
    }

    case 'login': {
      packet.set('data/name', inputController.data)
      break
    }
  }
  client.of('main').emit(inputController.command, DataManager.toString(packet))
  inputController.clear()
})

//Объект, со структурой которого будут сравниваться все пакеты
const PacketStructureConfig = {
  meta: {},
  data: {},
}

const second = 1000

async function objectFromBinary(data) {
  console.log(data)
  if (data instanceof ArrayBuffer)
    return JSON.parse(new TextDecoder('utf-8').decode(data))
  //Объект Blob представляет из себя подобный файлу объект с неизменяемыми, необработанными данными
  else if (data instanceof Blob) {
    return JSON.parse(data.text())
  } else return JSON.parse(data)
}

function parseDataPath(dataPath) {
  return dataPath.split('/')
}

function isCorrect(packetObject) {
  let keys = {
    config: Object.keys(PacketStructureConfig),
    data: Object.keys(packetObject),
  }

  if (equals(keys.config, keys.data)) return true
  else return false
}

function equals(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function isString(entity, value) {
  if (typeof value !== 'string')
    throw new TypeError(entity, 'string', typeof value)
}

//Классы ошибок
class TypeError extends Error {
  constructor(entity, configType, getType) {
    var errorMessage = `${entity} shall have ${configType} type. Get ${getType}`
    super(errorMessage)
    this.type = 'TypeError'
  }
}

class PathError extends Error {
  constructor(configPath, getPath) {
    var errorMessage = `Path parameter shall be ${configPath}. Get ${getPath}`
    super(errorMessage)
    this.type = 'PathError'
  }
}

//Рабочие классы
class Client {
  static managers = new Map()
  url
  constructor(coreUrl) {
    isString('Url', coreUrl)
    coreUrl.trim()

    if (coreUrl[coreUrl.length] !== '/') coreUrl += '/'

    this.url = coreUrl
  }

  of(path) {
    if (Client.managers.has(path)) return Client.managers.get(path)
    var manager = new EventManager(this, path)
    Client.managers.set(path, manager)
    return manager
  }
}

class EventManager {
  #events = new Map()
  #client
  #path
  #onclose
  #onopen
  socket

  constructor(client, path) {
    this.#path = path
    this.#client = client

    this.socket = new WebSocket(client.url + path)
    this.socket.binaryType = 'arraybuffer'

    this.socket.onopen = this.#openHandler.bind(this)
    this.socket.onerror = this.#errorHandler.bind(this)
    this.socket.onclose = this.#closeHandler.bind(this)
    this.socket.onmessage = this.#messageHandler.bind(this.#events)
  }

  reconnect() {
    this.socket = new WebSocket(this.#client.url + this.#path)
    this.socket.binaryType = 'arraybuffer'

    this.socket.onopen = this.#openHandler.bind(this)
    this.socket.onclose = this.#closeHandler.bind(this)
    this.socket.onerror = this.#errorHandler.bind(this)
    this.socket.onmessage = this.#messageHandler.bind(this.#events)
  }

  on(eventName, callback) {
    switch (eventName) {
      case 'open':
        this.open = callback
      case 'close':
        this.close = callback
      default:
        this.#events.set(eventName, callback)
    }
  }

  emit(eventName, eventData = {}, eventMeta = {}) {
    let eventPacket = DataManager.createPacket()
    eventPacket.set('meta/event', eventName)

    if (eventData instanceof Object)
      for (var [key, value] of Object.entries(eventData))
        eventPacket.set(`data/${key}`, value)

    if (eventMeta instanceof Object)
      for (var [key, value] of Object.entries(eventMeta))
        eventPacket.set(`meta/${key}`, value)

    this.socket.send(DataManager.toString(eventPacket))
  }

  set(eventName, callback) {
    this.#events.set(eventName, callback)
  }

  set open(callback) {
    this.#onopen = callback
  }

  set close(callback) {
    this.#onclose = callback
  }

  async #messageHandler(e) {
    var manager = new DataManager()
    manager.packet = await objectFromBinary(e.data)
    var event = manager.get('meta/event')

    this.get(event)(manager)
  }
  #openHandler(e) {
    if (typeof this.#onopen == 'function') this.#onopen(e, this.socket)
  }

  #closeHandler(e) {
    this.socket.close()
    if (e.code !== 1000)
      setTimeout(() => {
        this.reconnect.bind(this)
        this.reconnect()
      }, 5000)
    if (typeof this.#onclose == 'function') this.#onclose(e, this.socket)
  }

  #errorHandler(e) {
    this.socket.close()
  }
}

class DataManager {
  #controller = new PacketController()

  set packet(packetObject) {
    this.#controller.packet = packetObject
  }

  set config(newConfig) {
    this.#controller.config = newConfig
  }

  get packet() {
    return this.#controller.toString()
  }

  get(propPath) {
    return this.#controller.get(propPath)
  }

  static toString(packet) {
    return JSON.stringify(packet.data)
  }

  static createPacket() {
    return PacketFactory.new()
  }
}

//Служебные классы
class PacketFactory {
  static new() {
    return new Packet(PacketStructureConfig)
  }
}

class PacketController {
  #packet
  set packet(packetObject) {
    if (isCorrect(packetObject)) this.#packet = new Packet(packetObject)
  }

  set config(newConfig) {
    PacketStructureConfig = newConfig
  }

  get(propPath) {
    return this.#packet.get(propPath)
  }

  toString() {
    return JSON.stringify(this.#packet.data)
  }
}

class Packet {
  #packetObject = {}

  constructor(packetObject) {
    this.#packetObject = packetObject
  }

  set(propPath, propValue) {
    let path = parseDataPath(propPath)
    if (path.length !== 2)
      throw new PathError('Path parameter shall be segment/name', path)
    this.#packetObject[path[0]][path[1]] = propValue
  }

  get(propPath) {
    let path = parseDataPath(propPath)
    if (path.length !== 2) throw new PathError(' segment/name', path)
    return this.#packetObject[path[0]][path[1]]
  }

  remove(propPath) {
    let path = parseDataPath(propPath)
    if (path.length !== 2) throw new PathError(' segment/name', path)
    this.#packetObject[path[0]][path[1]] = undefined
  }

  get data() {
    return this.#packetObject
  }
}

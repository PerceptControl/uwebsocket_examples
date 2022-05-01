var uuid = require('uuid')

var uws = require('uWebSockets.js')
var app = uws.App()

var PacketManager = require('../packet-manager.js')

//Конвертирует получаемые по сокетам данные в объект(ArrayBuffer to String)
function objectFromBuffer(bufferedData) {
  const { StringDecoder } = require('string_decoder')
  const decoder = new StringDecoder('utf8')
  return JSON.parse(decoder.write(Buffer.from(bufferedData)))
}

//Создаем объект обработчика и привязываем к нему функции
var wsBehavior = {
  open: (socket) => {
    socket.id = uuid.v4()

    data = PacketManager.newPacket('getId')
    data.id = socket.id

    socket.send(data.toString(), true, true)
    console.log(`Socket ${socket.id} connected`)
  },

  close: (socket, code) => {
    console.log(`Socket ${socket.id} disconnected with code: ${code}`)
  },

  message: (socket, message) => {
    console.log(`[Get] data from socket ${socket.id}`)
    isBinary = true
    compress = true

    //Преобразуем данные в сообщении к объекту и передаем их в менеджер
    manager = new PacketManager()
    manager.packet = objectFromBuffer(message)

    switch (manager.code) {
      case 'join': {
        let room = manager.get('room')

        //Информирующее пользователя сообщение
        privatePacket = PacketManager.newPacket('private')
        privatePacket.author = 'system'

        //Информирующее сообщение группе
        systemPacket = PacketManager.newPacket('system')
        systemPacket.message = `${socket.id} joined room ${room}`

        if (socket.subscribe(room)) {
          socket.publish(room, systemPacket.toString(), isBinary, compress)

          privatePacket.message = `joined room ${room}`
          socket.send(privatePacket.toString(), isBinary, compress)

          console.log(`${socket.id} joined ${room}`)
        } else {
          privatePacket.message = `Something went wrong when we added You to room ${room}`
          socket.send(privatePacket.toString(), isBinary, compress)
        }
        break
      }

      case 'leave': {
        let room = manager.get('room')

        //Информирующее пользователя сообщение
        privatePacket = PacketManager.newPacket('private')
        privatePacket.author = 'system'

        //Информирующее сообщение группе
        systemPacket = PacketManager.newPacket('system')
        systemPacket.message = `${socket.id} leaved room ${room}`

        if (socket.unsubscribe(room)) {
          socket.publish(room, systemPacket.toString(), isBinary, compress)

          privatePacket.message = `leave room ${room}`
          socket.send(privatePacket.toString(), isBinary, compress)

          console.log(`${socket.id} leaved ${room}`)
        } else {
          privatePacket.message = `Something went wrong when we tried to delete you from ${room}`
          socket.send(privatePacket.toString(), isBinary, compress)
        }
        break
      }

      case 'send': {
        var rooms = socket.getTopics()
        let userMessage = manager.get('message')

        privatePacket = PacketManager.newPacket('private')
        privatePacket.author = 'group'

        //Отправка сообщения пользователя во все группы, в которых он находится
        for (room of rooms) {
          privatePacket.message = `(${room} room) ${socket.id}: ${userMessage}`
          socket.publish(room, privatePacket.toString(), isBinary, compress)
        }

        //Сообщение пользователю в какие группы какое сообщение он отправил
        privatePacket.message = `(To ${rooms.join(', ')}) You: ${userMessage}`
        socket.send(privatePacket.toString(), isBinary, compress)
        break
      }

      case 'register': {
        let userLogin = manager.get('login')

        privatePacket = PacketManager.newPacket('private')
        privatePacket.author = 'system'
        privatePacket.message = `set name ${userLogin}`

        console.log(`${socket.id} now is ${userLogin}`)
        socket.id = userLogin

        socket.send(privatePacket.toString(), isBinary)
        break
      }
    }
  },
}

//Создаем обработчик по адрессу ws://localhost:port/*
app.ws('/*', wsBehavior)

app.listen(3000, (listenSocket) => {
  if (listenSocket) console.log('Connected to port 3000')
  else console.log('Failed to connect')
})

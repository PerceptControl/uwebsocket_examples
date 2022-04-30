var uuid = require('uuid')

var { StringDecoder } = require('string_decoder')
var decoder = new StringDecoder('utf8')

var uws = require('uWebSockets.js')
var app = uws.App()

var PacketManager = require('../packet-manager.js')

//Конвертирует получаемые по сокетам данные в объект
function objectFromBuffer(bufferedData) {
  return JSON.parse(decoder.write(Buffer.from(bufferedData)))
}

//Создаем объект обработчика и привязываем к нему функции
var wsBehavior = {
  open: (socket) => {
    socket.id = uuid.v4()

    data = PacketManager.newPacket('getId', { id: socket.id })
    socket.send(data, true, true)

    console.log(`Socket ${socket.id} connected`)
  },

  close: (socket, code) => {
    console.log(`Socket ${socket.id} disconnected with code: ${code}`)
    //В момент отключения соккета рассылается сообщение всем комнатам
  },

  message: (socket, message) => {
    console.log(`[Get] data from socket ${socket.id}`)

    //Преобразуем данные в сообщении к объекту и передаем их в менеджер
    manager = new PacketManager()
    manager.packet = objectFromBuffer(message)

    switch (manager.code) {
      case 'join': {
        var room = manager.get('room')
        socket.subscribe(room)

        data = PacketManager.newPacket('system', {
          message: `${socket.id} joined the room ${room}`,
        })
        socket.publish(room, data, true, true)

        data = PacketManager.newPacket('private', {
          author: 'system',
          message: `You has joined room ${room}`,
        })
        socket.send(data, true, true)
        console.log(`${socket.id} joined ${room}`)
        break
      }

      case 'leave': {
        let room = manager.get('room')

        var data = PacketManager.newPacket('system', {
          message: `${socket.id} leaved room ${room}`,
        })
        socket.publish(room, data, true, true)

        console.log(`${socket.id} leaved ${room}`)

        if (socket.unsubscribe(room)) {
          data = PacketManager.newPacket('private', {
            author: 'system',
            message: `You has leaved room ${room}`,
          })
          socket.send(data, true, true)
        }
        break
      }

      case 'send': {
        for (room of socket.getTopics()) {
          data = PacketManager.newPacket('private', {
            author: 'group',
            message: `(${room} room) ${socket.id}: ${manager.get('message')}`,
          })
          socket.publish(room, data, true, true)
        }
        break
      }

      case 'register': {
        userLogin = manager.get('login')
        data = PacketManager.newPacket('private', {
          message: `Now your name is ${userLogin}`,
          author: 'system',
        })

        console.log(`${socket.id} now is ${userLogin}`)

        socket.id = userLogin
        socket.send(data, true)
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

import { PacketManager } from '../packet/packet-manager.mjs'
import { PacketFactory } from '../packet/packet-factory.mjs'

import { v4 as uuidv4 } from 'uuid'
import uWS from 'uWebSockets.js'

import { StringDecoder } from 'string_decoder'

var app = uWS.App()

//Конвертирует получаемые по сокетам данные в объект(ArrayBuffer to String)
async function objectFromBuffer(bufferedData) {
  const decoder = new StringDecoder('utf8')
  return JSON.parse(decoder.write(Buffer.from(bufferedData)))
}

//Создаем объект обработчика и привязываем к нему функции
var wsBehavior = {
  open: (socket) => {
    socket.id = uuidv4()
    let data = PacketFactory.createWithId('getId', socket.id)

    socket.send(data.toString(), true, true)
    console.log(`Socket ${socket.id} connected`)
  },

  close: (socket, code) => {
    console.log(`Socket ${socket.id} disconnected with code: ${code}`)
  },

  message: async (socket, message) => {
    console.log(`[Get] data from socket ${socket.id}`)
    let isBinary = true
    let compress = true

    //Преобразуем данные в сообщении к объекту и передаем их в менеджер
    var manager = new PacketManager(await objectFromBuffer(message))

    switch (manager.code) {
      case 'join': {
        let room = manager.get('room')

        //Информирующее пользователя сообщение
        let privatePacket = PacketFactory.createWithAuthor('private', 'system')

        //Информирующее сообщение группе
        let systemPacket = PacketFactory.create('system')

        if (socket.subscribe(room)) {
          let message = `${socket.id} joined room ${room}`
          systemPacket.message = message
          privatePacket.message = message

          socket.publish(room, systemPacket.toString(), isBinary, compress)
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
        let privatePacket = PacketFactory.createWithAuthor('private', 'system')

        //Информирующее сообщение группе
        let systemPacket = PacketFactory.create('system')

        if (socket.unsubscribe(room)) {
          systemPacket.message = `${socket.id} leaved room ${room}`
          privatePacket.message = `leave room ${room}`

          socket.send(privatePacket.toString(), isBinary, compress)
          socket.publish(room, systemPacket.toString(), isBinary, compress)

          console.log(`${socket.id} leaved ${room}`)
        } else {
          privatePacket.message = `Something went wrong when we tried to delete you from ${room}`

          socket.send(privatePacket.toString(), isBinary, compress)
        }
        break
      }

      case 'send': {
        var rooms = socket.getTopics()

        var userId = socket.id
        var userMessage = manager.get('message')

        var privatePacket = PacketFactory.createWithAuthor('private', 'group')

        //Отправка сообщения пользователя во все группы, в которых он находится
        rooms.forEach((currentRoom) => {
          privatePacket.message = `(${currentRoom}) ${userId}: ${userMessage}`
          socket.publish(room, privatePacket.toString(), isBinary, compress)
        })

        //Сообщение пользователю в какие группы какое сообщение он отправил
        privatePacket.message = `(${rooms.join(', ')}): ${userMessage}`
        socket.send(privatePacket.toString(), isBinary, compress)
        break
      }

      case 'register': {
        let userLogin = manager.get('name')

        privatePacket = PacketFactory.createWithAuthor('private', 'system')
        privatePacket.message = `Setted name ${userLogin}`

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

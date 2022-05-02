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

//Карта для хранения всех сокетов
var socketMap = new Map()

//Создаем объект обработчика и привязываем к нему функции
var wsBehavior = {
  open: (socket) => {
    socket.id = uuidv4()
    socketMap.set(socket.id, socket)

    let data = PacketFactory.createWithId('getId', socket.id)

    socket.send(data.toString(), true, true)
    console.log(`Socket ${socket.id} connected`)
  },

  close: (socket, code) => {
    socketMap.delete(socket.id)
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

        let privatePacket = PacketFactory.createWithAuthor('private', 'group')

        //Отправка сообщения пользователя во все группы, в которых он находится
        rooms.forEach((room) => {
          privatePacket.message = `(${room}) ${userId}: ${userMessage}`
          socket.publish(room, privatePacket.toString(), isBinary, compress)
        })

        //Сообщение пользователю в какие группы какое сообщение он отправил
        privatePacket.message = `(${rooms.join(', ')}): ${userMessage}`
        socket.send(privatePacket.toString(), isBinary, compress)
        break
      }

      case 'sendTo': {
        var destination = manager.get('destination')
        var userMessage = manager.get('message')
        var userName = socket.id

        let privatePacket = PacketFactory.createWithAuthor('private', 'user')

        let destinationSocket = socketMap.get(destination)
        if (destinationSocket === undefined) {
          systemPacket.message = `No such user ${destination}`
          socket.send(systemPacket.toString(), isBinary, compress)
        } else {
          let message = `(${userName} to ${destination}): ${userMessage}`
          privatePacket.message = message

          destinationSocket.send(privatePacket.toString(), isBinary, compress)
          socket.send(privatePacket.toString(), isBinary, compress)
        }
        break
      }

      case 'sendToRoom': {
        var room = manager.get('roomName')
        var userId = socket.id
        var userMessage = manager.get('message')

        let systemMessage = `(${room}) ${userId}: ${userMessage}`

        let privatePacket = PacketFactory.createWithAuthor('private', 'group')
        privatePacket.message = systemMessage

        let systemPacket = PacketFactory.create('system')
        systemPacket.message = systemMessage

        socket.publish(room, privatePacket.toString(), isBinary, compress)
        socket.send(systemPacket.toString(), isBinary, compress)
        break
      }

      case 'register': {
        let userName = manager.get('name')

        let privatePacket = PacketFactory.createWithAuthor('private', 'system')

        if (socketMap.has(userName)) {
          privatePacket.message = `User ${userName} already exist`
          socket.send(privatePacket.toString(), isBinary, compress)
          break
        }
        privatePacket.message = `Setted name ${userName}`

        console.log(`${socket.id} now is ${userName}`)

        socketMap.set(userName, socket)
        socketMap.delete(socket.id)

        socket.id = userName

        socket.send(privatePacket.toString(), isBinary, compress)
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

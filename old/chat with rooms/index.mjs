import { PacketManager } from '../api/packet-manager.mjs'
import { PacketFactory } from '../api/packet-factory.mjs'
import { SocketPoolController } from '../api/socketPool.mjs'

import { v4 as uuidv4 } from 'uuid'
import uWS from 'uWebSockets.js'

import { StringDecoder } from 'string_decoder'

var app = uWS.App()

//Конвертирует получаемые по сокетам данные в объект(ArrayBuffer to String)
async function objectFromBuffer(bufferedData) {
  const decoder = new StringDecoder('utf8')
  return JSON.parse(decoder.write(Buffer.from(bufferedData)))
}

//API для манипуляции пулом сокетов
var socketPool = new SocketPoolController()

//Создаем объект обработчика и привязываем к нему функции
var wsBehavior = {
  open: (socket) => {
    socket.id = uuidv4()
    socketPool.set(socket.id, socket)

    packet = PacketFactory.createWithId('getId', socket.id)

    socket.send(packet.toString(), true, true)
    console.log(`Socket ${socket.id} connected`)
  },

  close: (socket, code) => {
    socketPool.delete(socket.id)
    console.log(`Socket ${socket.id} disconnected with code: ${code}`)
  },

  message: async (userSocket, message) => {
    console.log(`[Get] data from socket ${userSocket.id}`)
    let isBinary = true
    let compress = true

    const currentPacket = await objectFromBuffer(message)
    var manager = new PacketManager(currentPacket)

    switch (manager.code) {
      case 'join': {
        let room = manager.get('room')
        let userName = userSocket.id

        //Информирующее пользователя сообщение
        let privatePacket = PacketFactory.createWithAuthor('private', 'system')

        //Информирующее сообщение группе
        let systemPacket = PacketFactory.create('system')

        if (userSocket.subscribe(room)) {
          let message = `${userName} joined room ${room}`
          systemPacket.message = message
          privatePacket.message = message

          userSocket.publish(room, systemPacket.toString(), isBinary, compress)
          userSocket.send(privatePacket.toString(), isBinary, compress)

          console.log(`${userName} joined ${room}`)
        } else {
          privatePacket.message = `Something went wrong when we added You to room ${room}`
          userSocket.send(privatePacket.toString(), isBinary, compress)
        }
        break
      }

      case 'leave': {
        let userName = userSocket.id
        let room = manager.get('room')

        //Информирующее пользователя сообщение
        let privatePacket = PacketFactory.createWithAuthor('private', 'system')

        //Информирующее системное сообщение группе
        let systemPacket = PacketFactory.create('system')

        if (userSocket.unsubscribe(room)) {
          systemPacket.message = `${userName} leaved room ${room}`
          privatePacket.message = `leaved room ${room}`

          userSocket.send(privatePacket.toString(), isBinary, compress)
          userSocket.publish(room, systemPacket.toString(), isBinary, compress)

          console.log(`${userName} leaved ${room}`)
        } else {
          privatePacket.message = `Something went wrong when we tried to delete you from ${room}`
          userSocket.send(privatePacket.toString(), isBinary, compress)
        }
        break
      }

      case 'send': {
        var rooms = userSocket.getTopics()

        var userName = userSocket.id
        var userMessage = manager.get('message')

        let privatePacket = PacketFactory.createWithAuthor('private', 'group')

        //Отправка сообщения пользователя во все группы, в которых он находится
        rooms.forEach((room) => {
          privatePacket.message = `(${room}) ${userName}: ${userMessage}`
          userSocket.publish(room, privatePacket.toString(), isBinary, compress)
        })

        //Сообщение пользователю в какие группы какое сообщение он отправил
        privatePacket.message = `(${rooms.join(', ')}): ${userMessage}`
        userSocket.send(privatePacket.toString(), isBinary, compress)
        break
      }

      case 'sendTo': {
        var destination = manager.get('destination')
        var userMessage = manager.get('message')
        var userName = userSocket.id

        let privatePacket = PacketFactory.createWithAuthor('private', 'user')

        let destinationSocket = socketPool.get(destination)
        if (destinationSocket === undefined) {
          systemPacket.message = `No such user ${destination}`
          userSocket.send(systemPacket.toString(), isBinary, compress)
        } else {
          let message = `(${userName} to ${destination}): ${userMessage}`
          privatePacket.message = message

          destinationSocket.send(privatePacket.toString(), isBinary, compress)
          userSocket.send(privatePacket.toString(), isBinary, compress)
        }
        break
      }

      case 'sendToRoom': {
        var room = manager.get('roomName')
        var userName = userSocket.id
        var userMessage = manager.get('message')

        let systemMessage = `(${room}) ${userName}: ${userMessage}`

        let privatePacket = PacketFactory.createWithAuthor('private', 'group')
        privatePacket.message = systemMessage

        let systemPacket = PacketFactory.create('system')
        systemPacket.message = systemMessage

        userSocket.publish(room, privatePacket.toString(), isBinary, compress)
        userSocket.send(systemPacket.toString(), isBinary, compress)
        break
      }

      case 'register': {
        let newName = manager.get('name')
        let previousName = userSocket.id

        let privatePacket = PacketFactory.createWithAuthor('private', 'system')

        if (socketPool.has(newName)) {
          privatePacket.message = `User ${newName} already exist`
          userSocket.send(privatePacket.toString(), isBinary, compress)
          break
        }
        privatePacket.message = `Setted name ${newName}`

        console.log(`${previousName} now is ${newName}`)

        try {
          socketPool.swapKey(previousName, newName)
        } catch (e) {
          console.log(e)
        }
        userSocket.id = newName

        userSocket.send(privatePacket.toString(), isBinary, compress)
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

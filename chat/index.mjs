import { Server } from 'usocket.io'

let main = Server.namespace('main')

main.on('join', async (socketId, manager) => {
  var room = manager.get('data/room')
  if (room) {
    main.to(room).join(socketId)

    var user = Server.getSocket(socketId)
    if (user.name)
      main.to(room).emit('join', { member: user.name }, { room: room })
    else main.to(room).emit('join', { member: socketId }, { room: room })
  } else emitError(main, socketId, 'join', 'no room parameter')
})

main.on('leave', async (socketId, manager) => {
  var room = manager.get('data/room')
  if (room) {
    main.to(room).leave(socketId)

    var user = Server.getSocket(socketId)
    if (user.name)
      main.to(room).emit('leave', { member: user.name }, { room: room })
    else main.to(room).emit('leave', { member: socketId }, { room: room })
  } else emitError(main, socketId, 'leave', 'no room parameter')
})

main.on('send', async (socketId, manager) => {
  var message = manager.get('data/message')
  if (message) {
    var user = Server.getSocket(socketId)
    var rooms = user.getTopics()
    for (var room of rooms) {
      var author = user.name ? user.name : socketId
      main
        .to(room)
        .emit(
          'groupChat',
          { message: message },
          { room: room.split('/')[1], author: author },
        )
    }
  } else emitError(main, socketId, 'send', 'no message')
})

main.on('login', async (socketId, manager) => {
  var newName = manager.get('data/name')
  if (newName) {
    var user = Server.getSocket(socketId)
    user.name = newName

    main.to(socketId).emit('login', { message: `your name set to ${newName}` })
  } else emitError(main, socketId, 'login', 'no name parameter')
})

main.on('undefined event', async (socketId, calledEvent) => {
  console.log("%s: tried to call event '%s'", socketId, calledEvent)
})

Server.listen(3000, (listenSocket) => {
  if (listenSocket) console.log('Listening on 3000')
})

function emitError(namespace, socketId, code, message) {
  namespace.to(socketId).emit('error', { code: code, message: message })
}

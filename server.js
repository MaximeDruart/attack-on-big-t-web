const path = require("path")
const express = require("express")

const app = express()
const server = require("http").createServer(app)

const DIST_DIR = path.join(__dirname, "/dist")
const HTML_FILE = path.join(DIST_DIR, "index.html")

app.use(express.static(DIST_DIR))
app.get("*", (req, res) => {
  res.sendFile(HTML_FILE)
})

const {
  generateCode,
  createUser,
  removeUser,
  createRoom,
  filteredUnusedRooms,
  addUserToRoomByCode,
  removeUserFromAllRooms,
  userIsInRoom,
  getPublicRooms,
  getRoomByCode,
  getUserRoom,
} = require("./socket")

const io = require("socket.io")(server)

io.on("connect", (socket) => {
  console.log(`user ${socket.id} connected`)
  // first we create a user with some random options like name, id, avatar etc
  createUser(socket)

  socket.on("createRoom", (fn) => {
    const newRoom = createRoom(socket.user)
    socket.join(newRoom.id)

    console.log("created room", newRoom)

    // return the room to the client
    fn(newRoom)
  })

  socket.on("joinRoom", (code, fn) => {
    const room = getRoomByCode(code)
    if (room) {
      // checking if room is full
      if (room.members.length >= room.maxMembers) {
        fn({ error: `room ${code} is full !` })
      } else {
        // updating our server state
        addUserToRoomByCode(socket.id, code)
        // place the user in the socket room so that it can broadcast and receive accordingly
        socket.join(room.id, (err) => {
          console.log("error:", err)
        })
        // inform room members of the new user
        socket.to(room.id).emit("newUserJoined", room)
        fn(room)
      }
    } else {
      // if the room doesn't exist emit an error to caller
      fn({ error: `No room found with code ${code}` })
    }
  })

  // when user forcibly disconnects (refresh / close tab)
  socket.on("disconnect", () => {
    console.log(`user ${socket.id} disconnected`)
    if (userIsInRoom(socket.user)) {
      const room = getUserRoom(socket.user)
      removeUserFromAllRooms(socket.user)
      filteredUnusedRooms()
      console.log(room)
      socket.to(room.id).emit("userLeftRoom", room)
      socket.leave(room.id)
      removeUser(socket.id)
    }
  })

  socket.on("sendKbStatus", (input) => {
    const room = getUserRoom(socket.user)
    if (room) {
      socket.to(room.id).emit("kbStatusReceived", input)
    }
  })

  // game stuff

  socket.on("startGame", () => {
    const room = getUserRoom(socket.user)
    if (room) {
      io.to(room.id).emit("gameStarted", room)
    }
  })
  socket.on("pause", () => {
    const room = getUserRoom(socket.user)
    socket.user.isPaused = true
    if (room) {
      io.to(room.id).emit("paused")
    }
  })
  socket.on("resume", () => {
    const room = getUserRoom(socket.user)
    socket.user.isPaused = false
    if (room) {
      if (!room.members.player1?.isPaused && !room.members.player2?.isPaused) {
        io.to(room.id).emit("resumed")
      }
    }
  })
})

const PORT = process.env.PORT || 8080

server.listen(PORT, () => {
  console.log("listening on port", PORT)
})

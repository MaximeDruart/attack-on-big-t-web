const { v4: uuidv4 } = require("uuid")

let users = []
let rooms = []

const generateCode = () => {
  let code = ""
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789"
  const roomCodes = rooms.map((room) => room.code)
  do {
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  } while (roomCodes.includes(code))
  return code
}

const createUser = (socket) => {
  let user = {
    id: socket.id,
    isPaused: false,
  }
  socket.user = user
  users.push(user)
}

const removeUser = (socketId) => {
  users = users.filter((user) => user.id !== socketId)
}

const createRoom = (user) => {
  // const user = getUserInfoForId(userId)
  const room = {
    id: uuidv4(),
    ownerId: user.id,
    members: {
      player1: user,
      player2: null,
    },
    code: generateCode(),
  }
  rooms.push(room)
  return room
}

const filteredUnusedRooms = () => {
  rooms = rooms.filter((room) => !room.members.player1 && !room.members.player2)
}

const addUserToRoomByCode = (userId, code) => {
  const room = getRoomByCode(code)
  const user = users.find((user) => user.id === userId)
  if (!room.members["player1"]) {
    room.members["player1"] = user
  } else if (!room.members["player2"]) {
    room.members["player2"] = user
  }
}

// same function as above except it doesn't get a room code and searches for all room
// keeping the above function as it's more efficient

const removeUserFromAllRooms = (user) => {
  for (const room of rooms) {
    for (const key in room.members) {
      if (room.members[key]?.id === user.id) {
        room.members[key] = null
      }
    }
  }
}

const userIsInRoom = (user) => {
  let doesInclude = false
  for (const room of rooms) {
    for (const key in room.members) {
      if (!room.members[key]) return
      if (room.members[key]?.id === user.id) doesInclude = true
    }
  }
  return doesInclude
}

const getPublicRooms = () => rooms.filter((room) => !room.private)

const getRoomByCode = (codeProvided) => rooms.find((room) => room.code === codeProvided)

// searches room for provided user. returns undefined if none found
const getUserRoom = (user) => {
  for (const room of rooms) {
    for (const key in room.members) {
      if (room.members[key]?.id === user.id) return room
    }
  }
  return false
}

module.exports = {
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
}

import player1img from "../assets/img/bonus.png"
import player2img from "../assets/img/bonus.png"
import menuBg from "../assets/img/MainMenu.png"
import buttons from "../assets/img/buttons-screen-menu.png"
import menuSprite from "../assets/img/spritesheetMenu.png"
import introAudio from "../assets/audios/introAudio.mp3"
import { center } from "../constants"
import { gamepadEmulator, player1axis, player2axis } from "../axis"
import inGameAudio from "../assets/audios/inGameAudio.mp3"
import { socket } from "../socket-client"

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" })

    this.gameCanStart = false
    this.room = null
  }

  preload() {
    this.load.image("player1-up", player1img)
    this.load.image("player2-up", player2img)
    this.load.spritesheet("menuBg", menuBg, { frameWidth: 640, frameHeight: 360 })
    this.load.spritesheet("menu-button-start", buttons, { frameWidth: 132, frameHeight: 64 })
    this.load.spritesheet("menu-button-score", buttons, { frameWidth: 132, frameHeight: 64 })
    this.load.spritesheet("menuSprite", menuSprite, { frameWidth: 640, frameHeight: 360 })

    this.load.audio("in-game-music", inGameAudio)
    this.load.audio("introAudio", introAudio)
  }

  createAnims() {
    this.anims.create({
      key: "button-start-press",
      frameRate: 30,
      frames: this.anims.generateFrameNumbers("menu-button-start", { start: 0, end: 3 }),
    })

    this.anims.create({
      key: "button-score-press",
      frameRate: 30,
      frames: this.anims.generateFrameNumbers("menu-button-score", { start: 4, end: 7 }),
    })

    this.anims.create({
      key: "menu-bg",
      frameRate: 1,
      frames: this.anims.generateFrameNumbers("menuBg", { start: 0, end: 1 }),
      repeat: -1,
    })
    this.anims.create({
      key: "menuSpriteAnim",
      frameRate: 8,
      frames: this.anims.generateFrameNumbers("menuSprite"),
      repeat: -1,
    })
  }

  create() {
    this.createAnims()
    this.handleSocketsConnection()

    let background = this.add.sprite(0, 0, "menuBg")
    background.setOrigin(0, 0)
    let scaleX = this.cameras.main.width / background.width
    let scaleY = this.cameras.main.height / background.height
    let scale = Math.max(scaleX, scaleY)
    background.setScale(scale).setScrollFactor(0)

    this.startBtn = this.add.sprite(center.x - center.x / 4, center.y + center.y / 1.5, "menu-button-start")
    this.scoreBtn = this.add.sprite(center.x + center.x / 4, center.y + center.y / 1.5, "menu-button-score", 4)

    const keyDownHandler = this.keyDownHandler.bind(this)
    this.keyDownFn1 = (e) => keyDownHandler(e, 1)
    this.keyDownFn2 = (e) => keyDownHandler(e, 2)
    player1axis.addEventListener("keydown", this.keyDownFn1)
    player2axis.addEventListener("keydown", this.keyDownFn2)

    background.play("menuSpriteAnim")
    this.sound.play("introAudio")

    // socket logic

    this.p1img = this.add.image(center.x - 80, center.y, "player1-up")
    this.p2img = this.add.image(center.x + 80, center.y, "player2-up")
    this.p1img.setVisible(false)
    this.p2img.setVisible(false)

    this.addSocketListeners()
  }

  addSocketListeners() {
    socket.on("newUserJoined", (newRoom) => {
      this.room = newRoom
      this.updatePlayerStatesFromRoomData()
    })
    socket.on("userLeftRoom", (newRoom) => {
      this.room = newRoom
      this.updatePlayerStatesFromRoomData()
    })
    socket.on("gameStarted", this.startGame.bind(this))
  }

  handleSocketsConnection() {
    const path = window.location.pathname
    console.log(path)
    if (path === "/") {
      // send create room request to socket server
      socket.emit("createRoom", (room) => {
        this.room = room
        this.updatePlayerStatesFromRoomData()
        history.pushState(null, null, room.code)
      })
    } else {
      // send join room request to socket server
      socket.emit("joinRoom", path.slice(1), (room) => {
        if (room.error) {
          window.location.href = "/"
        } else {
          this.room = room
          this.updatePlayerStatesFromRoomData()
        }
      })
    }
  }

  updatePlayerStatesFromRoomData() {
    this.p1img.setVisible(!!this.room.members.player1)
    this.p2img.setVisible(!!this.room.members.player2)

    this.gameCanStart = this.room.members.player1 && this.room.members.player2
  }

  emitStartGame() {
    socket.emit("startGame")
  }

  startGame() {
    this.sound.pauseAll()
    this.sound.play("in-game-music")
    this.input.keyboard.enabled = false
    player1axis.removeEventListener("keydown", this.keyDownFn1)
    player2axis.removeEventListener("keydown", this.keyDownFn2)
    this.scene.start("WorldScene", { room: this.room })
  }

  keyDownHandler(e, playerNumber) {
    if (e.key === "a") {
      // if (!this.gameCanStart) return
      this.startBtn.play("button-start-press")
      setTimeout(this.emitStartGame.bind(this), 300)
    }
    if (e.key === "x") {
      return
      this.scoreBtn.play("button-score-press")
      setTimeout(() => {
        this.input.keyboard.enabled = false
        player1axis.removeEventListener("keydown", this.keyDownFn1)
        player2axis.removeEventListener("keydown", this.keyDownFn2)
        this.scene.start("ScoreScene")
      }, 500)
    }
  }

  update() {
    gamepadEmulator.update()
  }
}

export default MenuScene

import Phaser from 'phaser'
import {
  BEVERAGE_ROOM_URL,
  CUSTOMERS_GAME_ATLAS_URL,
  CUSTOMER_STEP_URLS,
  FRESH_ROOM_URL,
  PRODUCTS_ATLAS_URL,
  PRODUCTS_EXPANSION_ATLAS_URL,
  STORE_ENVIRONMENT_URL,
} from '../assets'
import { PRODUCTS, PRODUCT_BY_ID, type ProductId, type RoomId } from './config'
import { gameAudio } from './audio'
import {
  CHECKOUT,
  ENTRANCE,
  PRODUCT_ROW,
  SELF_CHECKOUTS,
  pathToBottleReturn,
  pathToCheckout,
  pathToExit,
  pathToProduct,
  pathToSelfCheckout,
  type AisleRow,
  type PathPoint,
} from './navigation'
import { gameStore, type SelfCheckoutStation } from './store'

const CUSTOMER_COUNT = 6
const CUSTOMER_CROPS = [
  { x: 77, y: 41, width: 270, height: 536, footOriginX: 0.815 },
  { x: 472, y: 50, width: 249, height: 529, footOriginX: 0.829 },
  { x: 852, y: 46, width: 264, height: 525, footOriginX: 0.831 },
  { x: 76, y: 630, width: 274, height: 568, footOriginX: 0.807 },
  { x: 470, y: 645, width: 271, height: 546, footOriginX: 0.78 },
  { x: 862, y: 656, width: 264, height: 537, footOriginX: 0.843 },
] as const
const CUSTOMER_STEP_FRAMES = [
  { width: 282, height: 560, footOriginX: 0.851 },
  { width: 279, height: 560, footOriginX: 0.86 },
  { width: 285, height: 560, footOriginX: 0.835 },
  { width: 279, height: 560, footOriginX: 0.855 },
  { width: 279, height: 560, footOriginX: 0.819 },
  { width: 276, height: 560, footOriginX: 0.851 },
] as const
const CUSTOMER_HEIGHT = 170

type CustomerVisual = {
  avatar: number
  phase: 0 | 1
  sprite: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Ellipse
  contactShadow: Phaser.GameObjects.Ellipse
  stepTimer: Phaser.Time.TimerEvent
}

const mulberry32 = (seed: number) => {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export class MarketScene extends Phaser.Scene {
  private readonly shelfCounts = new Map<ProductId, Phaser.GameObjects.Text>()
  private readonly shelfFrames = new Map<ProductId, Phaser.GameObjects.Graphics>()
  private readonly coolingShelfCounts = new Map<ProductId, Phaser.GameObjects.Text>()
  private readonly selfCheckoutBackGraphics = new Map<SelfCheckoutStation, Phaser.GameObjects.Graphics>()
  private readonly selfCheckoutFrontGraphics = new Map<SelfCheckoutStation, Phaser.GameObjects.Graphics>()
  private readonly selfCheckoutStatuses = new Map<SelfCheckoutStation, Phaser.GameObjects.Text>()
  private readonly selfCheckoutCustomers = new Map<SelfCheckoutStation, Phaser.GameObjects.Image>()
  private readonly selfCheckoutCustomerShadows = new Map<SelfCheckoutStation, Phaser.GameObjects.Ellipse>()
  private bottleReturnStatus: Phaser.GameObjects.Text | null = null
  private renderedRoom: RoomId = 'main'
  private unsubscribe: (() => void) | null = null
  private random = () => 0.5
  private nextSpawnAt = 0
  private activeCustomers = 0
  private readonly activeAvatarCounts = new Map<number, number>()
  private customerId = 0
  private simulationPaused = false
  private visibilityHandler = () => this.syncPauseState()

  constructor() {
    super('market')
  }

  preload() {
    this.load.image('store-main', STORE_ENVIRONMENT_URL)
    this.load.image('store-beverage', BEVERAGE_ROOM_URL)
    this.load.image('store-fresh', FRESH_ROOM_URL)
    this.load.image('products-base', PRODUCTS_ATLAS_URL)
    this.load.image('products-expansion', PRODUCTS_EXPANSION_ATLAS_URL)
    this.load.image('customers-game-atlas', CUSTOMERS_GAME_ATLAS_URL)
    CUSTOMER_STEP_URLS.forEach((url, index) => this.load.image(`customer-step-${index}`, url))
  }

  create() {
    const state = gameStore.getSnapshot()
    this.renderedRoom = state.activeRoom
    this.shelfCounts.clear()
    this.shelfFrames.clear()
    this.coolingShelfCounts.clear()
    this.selfCheckoutBackGraphics.clear()
    this.selfCheckoutFrontGraphics.clear()
    this.selfCheckoutStatuses.clear()
    this.selfCheckoutCustomers.clear()
    this.selfCheckoutCustomerShadows.clear()
    this.activeAvatarCounts.clear()
    this.activeCustomers = 0
    this.bottleReturnStatus = null
    this.random = mulberry32(state.seed)
    this.registerCustomerFrames()
    this.registerProductFrames()

    this.add.image(768, 432, `store-${state.activeRoom}`).setDisplaySize(1536, 864)
    this.add.rectangle(768, 834, 1536, 60, 0x112b2c, 0.18)

    gameStore.getCurrentRoomProducts().forEach((product) => this.createShelf(product.id))
    if (state.activeRoom === 'main') this.createCoolingShelves()
    this.addCheckoutGlow()
    this.createSelfCheckoutStations()
    if (state.activeRoom === 'beverage') this.createBottleReturnMachine()
    this.refreshShelves()
    this.refreshSelfCheckouts()

    this.unsubscribe = gameStore.subscribe(() => {
      if (gameStore.getSnapshot().activeRoom !== this.renderedRoom) {
        this.scene.restart()
        return
      }
      this.refreshShelves()
      this.refreshSelfCheckouts()
      this.refreshBottleReturnMachine()
      this.syncPauseState()
    })
    document.addEventListener('visibilitychange', this.visibilityHandler)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.()
      document.removeEventListener('visibilitychange', this.visibilityHandler)
    })

    this.nextSpawnAt = this.time.now + 900
    this.syncPauseState()
  }

  private registerCustomerFrames() {
    const texture = this.textures.get('customers-game-atlas')
    CUSTOMER_CROPS.forEach((crop, index) => {
      const frameName = `customer-${index}`
      if (!texture.has(frameName)) {
        texture.add(frameName, 0, crop.x, crop.y, crop.width, crop.height)
      }
    })
  }

  private registerProductFrames() {
    const registerAtlas = (textureKey: string, products: typeof PRODUCTS, columns: number) => {
      const texture = this.textures.get(textureKey)
      const source = texture.getSourceImage() as HTMLImageElement
      const cellWidth = source.width / columns
      const cellHeight = source.height / 2
      products.forEach((product, index) => {
        const frameName = `product-${product.id}`
        if (!texture.has(frameName)) {
          texture.add(
            frameName,
            0,
            (index % columns) * cellWidth,
            Math.floor(index / columns) * cellHeight,
            cellWidth,
            cellHeight,
          )
        }
      })
    }
    registerAtlas('products-base', PRODUCTS.filter((product) => product.atlas === 'base'), 4)
    registerAtlas('products-expansion', PRODUCTS.filter((product) => product.atlas === 'expansion'), 5)
  }

  update(time: number) {
    if (this.simulationPaused || time < this.nextSpawnAt || this.activeCustomers >= 6) return
    this.spawnCustomer()
    this.nextSpawnAt = time + 5000 + Math.floor(this.random() * 3001)
  }

  private createShelf(productId: ProductId) {
    const product = PRODUCT_BY_ID[productId]
    const { x, y } = product.shelfPosition
    const frame = this.add.graphics().setDepth(y - 20)
    this.shelfFrames.set(productId, frame)

    this.add
      .image(x, y - 18, product.atlas === 'base' ? 'products-base' : 'products-expansion', `product-${product.id}`)
      .setDepth(y - 15)
      .setDisplaySize(78, 78)

    const label = this.add.text(x, y + 35, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#173c3a',
      backgroundColor: '#fff8e8',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(y + 10).setShadow(0, 2, '#00000044', 3)
    this.shelfCounts.set(productId, label)

    this.add.zone(x, y, 220, 124)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => frame.setAlpha(1))
      .on('pointerout', () => frame.setAlpha(0.7))
      .on('pointerdown', () => {
        const state = gameStore.getSnapshot()
        if (state.modal !== null || state.checkoutQueue.length > 0) return
        gameAudio.play('click')
        gameStore.openModal('restock', productId)
      })
  }

  private createBottleReturnMachine() {
    this.bottleReturnStatus = this.add.text(169, 652, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#245c58ee',
      padding: { x: 10, y: 7 },
      align: 'center',
    }).setOrigin(0.5).setDepth(721).setShadow(0, 2, '#00000088', 3)
    this.refreshBottleReturnMachine()
  }

  private createCoolingShelves() {
    const slots: Array<{ productId: ProductId; y: number }> = [
      { productId: 'milk', y: 430 },
      { productId: 'cheese', y: 555 },
      { productId: 'yogurt', y: 680 },
    ]

    slots.forEach(({ productId, y }) => {
      const product = PRODUCT_BY_ID[productId]
      this.add.rectangle(126, y, 216, 104, 0xe9fbff, 0.9)
        .setStrokeStyle(3, 0x63b5c8, 0.9)
        .setDepth(y - 4)
      this.add.image(72, y - 7, 'products-base', `product-${product.id}`)
        .setDisplaySize(66, 66)
        .setDepth(y)
      const count = this.add.text(122, y - 18, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#174553',
        align: 'left',
      }).setDepth(y + 2)
      this.coolingShelfCounts.set(productId, count)
      this.add.text(122, y + 15, `${product.name}\nZum Auffüllen`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#376873',
        lineSpacing: 1,
      }).setDepth(y + 2)
      this.add.zone(126, y, 216, 104)
        .setInteractive({ useHandCursor: true })
        .setDepth(y + 5)
        .on('pointerdown', () => {
          const state = gameStore.getSnapshot()
          if (state.modal !== null || state.checkoutQueue.length > 0) return
          gameAudio.play('click')
          gameStore.openModal('restock', productId)
        })
    })
    this.refreshCoolingShelves()
  }

  private refreshCoolingShelves() {
    const state = gameStore.getSnapshot()
    const capacity = gameStore.getShelfCapacity()
    this.coolingShelfCounts.forEach((label, productId) => {
      label.setText(`${state.products[productId].shelf} / ${capacity}`)
      label.setColor(state.products[productId].shelf === 0 ? '#b63e34' : '#174553')
    })
  }

  private refreshBottleReturnMachine() {
    if (!this.bottleReturnStatus) return
    const bottles = gameStore.getSnapshot().returnableBottles
    this.bottleReturnStatus.setText(bottles > 0
      ? `♻ PFANDAUTOMAT\n${bottles} KÜNFTIGE RÜCKGABE${bottles === 1 ? '' : 'N'}`
      : '♻ PFANDAUTOMAT\nWARTET AUF KUNDEN')
  }

  private addCheckoutGlow() {
    const graphics = this.add.graphics().setDepth(430)
    graphics.fillStyle(0xffce45, 0.28)
    graphics.fillEllipse(CHECKOUT.x, CHECKOUT.y + 48, 190, 54)
    this.tweens.add({
      targets: graphics,
      alpha: { from: 0.45, to: 0.9 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
    })
  }

  private createSelfCheckoutStations() {
    SELF_CHECKOUTS.forEach(({ x, y }, stationIndex) => {
      const station = stationIndex as SelfCheckoutStation
      const backGraphics = this.add.graphics().setDepth(y - 7)
      const customerShadow = this.add
        .ellipse(x - 42, y + 49, 64, 15, 0x102d2b, 0.3)
        .setDepth(y + 2)
        .setVisible(false)
      const customer = this.add
        .image(x - 22, y + 46, 'customers-game-atlas', 'customer-0')
        .setFlipX(false)
        .setVisible(false)
        .setDepth(y + 6)
      const frontGraphics = this.add.graphics().setDepth(y + 12)
      const status = this.add.text(x + 21, y - 79, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#245c58',
        padding: { x: 7, y: 4 },
        align: 'center',
      }).setOrigin(0.5).setDepth(y + 24).setShadow(0, 2, '#00000066', 2)

      this.selfCheckoutBackGraphics.set(station, backGraphics)
      this.selfCheckoutFrontGraphics.set(station, frontGraphics)
      this.selfCheckoutStatuses.set(station, status)
      this.selfCheckoutCustomers.set(station, customer)
      this.selfCheckoutCustomerShadows.set(station, customerShadow)

      this.add.zone(x + 12, y - 5, 168, 164)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const result = gameStore.helpSelfCheckout(station)
          if (result.ok) gameAudio.play('success')
          else gameAudio.play('click')
        })
    })
  }

  private refreshSelfCheckouts() {
    const state = gameStore.getSnapshot()
    SELF_CHECKOUTS.forEach(({ x, y }, stationIndex) => {
      const station = stationIndex as SelfCheckoutStation
      const entry = state.selfCheckouts[station]
      const needsHelp = entry?.status === 'help'
      const backGraphics = this.selfCheckoutBackGraphics.get(station)
      const frontGraphics = this.selfCheckoutFrontGraphics.get(station)
      const status = this.selfCheckoutStatuses.get(station)
      const customer = this.selfCheckoutCustomers.get(station)
      const customerShadow = this.selfCheckoutCustomerShadows.get(station)
      if (!backGraphics || !frontGraphics || !status || !customer || !customerShadow) return

      const accent = needsHelp ? 0xff5548 : entry ? 0xffcf42 : 0x68d5c9
      const outline = needsHelp ? 0xff6b5d : entry ? 0xffdf70 : 0xb9f1e9

      backGraphics.clear()
      // Floor footprint and a restrained status halo make the station feel grounded.
      backGraphics.fillStyle(0x102d2b, 0.24)
      backGraphics.fillEllipse(x + 14, y + 51, 154, 34)
      backGraphics.fillStyle(accent, needsHelp ? 0.2 : 0.1)
      backGraphics.fillRoundedRect(x - 66, y - 69, 153, 128, 19)
      backGraphics.lineStyle(needsHelp ? 4 : 2, outline, needsHelp ? 0.9 : 0.34)
      backGraphics.strokeRoundedRect(x - 66, y - 69, 153, 128, 19)

      // Countertop, bagging scale and scanner glass.
      backGraphics.fillStyle(0x1a3335, 1)
      backGraphics.fillRoundedRect(x - 36, y + 6, 118, 43, 10)
      backGraphics.fillStyle(0xd6d0c2, 1)
      backGraphics.fillRoundedRect(x - 38, y + 1, 120, 35, 9)
      backGraphics.fillStyle(0xf5f0e6, 1)
      backGraphics.fillRoundedRect(x + 25, y + 6, 48, 23, 5)
      backGraphics.lineStyle(1, 0x8c918e, 0.7)
      backGraphics.strokeRoundedRect(x + 25, y + 6, 48, 23, 5)
      backGraphics.fillStyle(0x192f34, 1)
      backGraphics.fillRoundedRect(x - 28, y + 7, 42, 22, 5)
      backGraphics.fillStyle(0x4f95a3, 0.9)
      backGraphics.fillRoundedRect(x - 22, y + 11, 30, 12, 3)
      backGraphics.fillStyle(accent, entry ? 0.8 : 0.36)
      backGraphics.fillRoundedRect(x - 18, y + 15, 22, 3, 1)

      // Upright monitor with a visible stand and a small status beacon.
      backGraphics.fillStyle(0x445052, 1)
      backGraphics.fillRoundedRect(x + 7, y - 32, 61, 40, 8)
      backGraphics.fillStyle(0x263b3d, 1)
      backGraphics.fillRoundedRect(x + 10, y - 67, 54, 39, 7)
      backGraphics.fillStyle(0x10282c, 1)
      backGraphics.fillRoundedRect(x + 15, y - 62, 44, 28, 4)
      backGraphics.fillStyle(accent, 1)
      backGraphics.fillRoundedRect(x + 20, y - 57, 34, 18, 3)
      backGraphics.fillStyle(0xffffff, 0.28)
      backGraphics.fillRoundedRect(x + 23, y - 54, 20, 3, 1)
      backGraphics.lineStyle(3, 0x495759, 1)
      backGraphics.lineBetween(x + 56, y - 68, x + 56, y - 79)
      backGraphics.fillStyle(accent, 1)
      backGraphics.fillCircle(x + 56, y - 82, needsHelp ? 6 : 4)

      // Angled card terminal beside the scanner.
      backGraphics.fillStyle(0x263b3d, 1)
      backGraphics.fillRoundedRect(x + 70, y - 9, 24, 31, 5)
      backGraphics.fillStyle(0x83b8bd, 1)
      backGraphics.fillRoundedRect(x + 75, y - 4, 14, 9, 2)
      backGraphics.lineStyle(1, 0xdbe8e6, 0.7)
      backGraphics.beginPath()
      backGraphics.arc(x + 81, y + 10, 4, -0.8, 0.8)
      backGraphics.strokePath()
      backGraphics.beginPath()
      backGraphics.arc(x + 81, y + 10, 7, -0.8, 0.8)
      backGraphics.strokePath()

      frontGraphics.clear()
      // Only the front cabinet is above the customer: legs disappear behind it naturally.
      frontGraphics.fillStyle(0x203d3e, 1)
      frontGraphics.fillRoundedRect(x - 36, y + 31, 118, 28, 8)
      frontGraphics.fillStyle(0x162f31, 1)
      frontGraphics.fillRoundedRect(x - 29, y + 45, 104, 17, 5)
      frontGraphics.fillStyle(0xffffff, 0.15)
      frontGraphics.fillRoundedRect(x - 29, y + 34, 104, 3, 1)
      frontGraphics.fillStyle(accent, 0.9)
      frontGraphics.fillRoundedRect(x + 50, y + 50, 17, 4, 2)

      status
        .setText(needsHelp ? `⚠  KASSE ${station + 1} · HILFE` : entry ? `KASSE ${station + 1} · ${entry.items.length} ART.` : `KASSE ${station + 1} · FREI`)
        .setBackgroundColor(needsHelp ? '#c63f32' : entry ? '#9b7413' : '#245c58')

      if (!entry) {
        customer.setVisible(false)
        customerShadow.setVisible(false)
        return
      }
      const crop = CUSTOMER_CROPS[entry.avatar % CUSTOMER_COUNT]
      const customerHeight = 158
      const customerWidth = customerHeight * (crop.width / crop.height)
      customer
        .setTexture('customers-game-atlas', `customer-${entry.avatar % CUSTOMER_COUNT}`)
        .setOrigin(crop.footOriginX, 1)
        .setPosition(x - 17, y + 48)
        .setDisplaySize(customerWidth, customerHeight)
        .setVisible(true)
      customerShadow
        .setPosition(x - 17 + customerWidth * (0.5 - crop.footOriginX), y + 49)
        .setVisible(true)
    })
  }

  private refreshShelves() {
    const state = gameStore.getSnapshot()
    const capacity = gameStore.getShelfCapacity()
    gameStore.getCurrentRoomProducts().forEach(({ id, shelfPosition }) => {
      const stock = state.products[id].shelf
      this.shelfCounts.get(id)?.setText(`${stock} / ${capacity}`)
      const frame = this.shelfFrames.get(id)
      if (!frame) return
      frame.clear()
      frame.fillStyle(stock === 0 ? 0xc54e3f : 0xffffff, stock === 0 ? 0.38 : 0.14)
      frame.fillRoundedRect(shelfPosition.x - 96, shelfPosition.y - 68, 192, 108, 20)
      frame.lineStyle(3, stock === 0 ? 0xff6655 : 0xffd85c, stock === 0 ? 0.9 : 0.55)
      frame.strokeRoundedRect(shelfPosition.x - 96, shelfPosition.y - 68, 192, 108, 20)
      frame.setAlpha(0.7)
    })
    this.refreshCoolingShelves()
  }

  private syncPauseState() {
    if (!this.sys.isActive()) return
    const state = gameStore.getSnapshot()
    const shouldPause = state.modal !== null || (state.checkoutQueue.length > 0 && !state.helpers.cashier) || document.hidden
    if (shouldPause === this.simulationPaused) return
    this.simulationPaused = shouldPause
    if (shouldPause) this.tweens.pauseAll()
    else this.tweens.resumeAll()
  }

  private createCustomer(avatar: number) {
    const container = this.add.container(ENTRANCE.x, ENTRANCE.y).setDepth(ENTRANCE.y)
    const shadow = this.add.ellipse(0, 12, 60, 13, 0x173c3a, 0.26)
    const contactShadow = this.add.ellipse(0, 14, 24, 6, 0x102d2b, 0.5)
    const sprite = this.add
      .image(0, 15, 'customers-game-atlas', `customer-${avatar % CUSTOMER_COUNT}`)
    const visual: CustomerVisual = {
      avatar: avatar % CUSTOMER_COUNT,
      phase: 0,
      sprite,
      shadow,
      contactShadow,
      stepTimer: null as unknown as Phaser.Time.TimerEvent,
    }
    this.applyCustomerFrame(visual)
    visual.stepTimer = this.time.addEvent({
      delay: 360,
      loop: true,
      paused: true,
      callback: () => {
        visual.phase = visual.phase === 0 ? 1 : 0
        this.applyCustomerFrame(visual)
      },
    })
    const thought = this.add.text(0, -163, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 5 },
      color: '#173c3a',
    }).setOrigin(0.5).setVisible(false).setShadow(0, 2, '#00000033', 2)
    container.add([shadow, contactShadow, sprite, thought])
    container.setScale(0.97)
    container.once(Phaser.GameObjects.Events.DESTROY, () => visual.stepTimer.remove(false))
    return { container, visual, thought }
  }

  private applyCustomerFrame(visual: CustomerVisual) {
    const crop = visual.phase === 0 ? CUSTOMER_CROPS[visual.avatar] : CUSTOMER_STEP_FRAMES[visual.avatar]
    if (visual.phase === 0) {
      visual.sprite.setTexture('customers-game-atlas', `customer-${visual.avatar}`)
    } else {
      visual.sprite.setTexture(`customer-step-${visual.avatar}`)
    }
    const displayWidth = CUSTOMER_HEIGHT * (crop.width / crop.height)
    const originX = visual.sprite.flipX ? 1 - crop.footOriginX : crop.footOriginX
    const bodyCenterOffset = displayWidth * (0.5 - originX)
    visual.sprite
      .setOrigin(originX, 1)
      .setDisplaySize(displayWidth, CUSTOMER_HEIGHT)
    visual.shadow.setPosition(bodyCenterOffset * 0.78, 12)
    visual.contactShadow.setPosition(bodyCenterOffset * 0.35, 14)
  }

  private moveAlongPath(
    container: Phaser.GameObjects.Container,
    visual: CustomerVisual,
    points: PathPoint[],
    onComplete: () => void,
  ) {
    const [next, ...remaining] = points
    if (!next) {
      visual.stepTimer.paused = true
      visual.phase = 0
      this.applyCustomerFrame(visual)
      visual.sprite.setAngle(0)
      onComplete()
      return
    }
    visual.stepTimer.paused = false

    const distance = Phaser.Math.Distance.Between(container.x, container.y, next.x, next.y)
    const duration = Phaser.Math.Clamp(distance * 6.5, 380, 2_100)
    const deltaX = next.x - container.x
    if (Math.abs(deltaX) > 5) {
      visual.sprite.setFlipX(deltaX < 0)
      this.applyCustomerFrame(visual)
    }

    this.tweens.add({
      targets: container,
      x: next.x,
      y: next.y,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        container.setDepth(container.y + 25)
        container.setScale(0.9 + container.y / 3_800)
      },
      onComplete: () => this.moveAlongPath(container, visual, remaining, onComplete),
    })
  }

  private spawnCustomer() {
    const roomProducts = gameStore.getCurrentRoomProducts()
    if (!roomProducts.length) return
    const itemCount = 2 + Math.floor(this.random() * 5)
    const shoppingList = Array.from(
      { length: itemCount },
      () => roomProducts[Math.floor(this.random() * roomProducts.length)],
    )
    const state = gameStore.getSnapshot()
    const occupiedAvatars = new Set([
      ...state.checkoutQueue.map((entry) => entry.avatar % CUSTOMER_COUNT),
      ...state.selfCheckouts.flatMap((entry) => entry ? [entry.avatar % CUSTOMER_COUNT] : []),
      ...[...this.activeAvatarCounts.entries()].flatMap(([candidate, count]) => count > 0 ? [candidate] : []),
    ])
    const availableAvatars = Array.from(
      { length: CUSTOMER_COUNT },
      (_, candidate) => candidate,
    ).filter((candidate) => !occupiedAvatars.has(candidate))
    const avatarPool = availableAvatars.length
      ? availableAvatars
      : Array.from({ length: CUSTOMER_COUNT }, (_, candidate) => candidate)
    const avatar = avatarPool[Math.floor(this.random() * avatarPool.length)]
    const id = ++this.customerId
    const depositBottles = state.activeRoom === 'beverage'
      ? gameStore.claimDepositBottles(1 + (id % 5))
      : 0
    const { container, visual, thought } = this.createCustomer(avatar)
    const basket: ProductId[] = []
    let currentRow: AisleRow | null = null
    this.activeCustomers += 1
    this.activeAvatarCounts.set(avatar, (this.activeAvatarCounts.get(avatar) ?? 0) + 1)
    gameAudio.play('bell')

    const goToCheckout = () => {
      if (!basket.length || currentRow === null) {
        gameStore.markCustomerMissed()
        thought.setText('Nichts da!').setVisible(true)
        this.leaveStore(container, visual, currentRow ?? 'top')
        return
      }
      thought.setText(`🛒 ${basket.length}`).setVisible(true)
      const selfCheckoutStation = gameStore.getAvailableSelfCheckoutStation()
      const useSelfCheckout = selfCheckoutStation !== null
      if (useSelfCheckout) {
        thought.setText(`🛒 Selbstkasse ${selfCheckoutStation + 1}`)
        this.moveAlongPath(container, visual, pathToSelfCheckout(currentRow, selfCheckoutStation), () => {
          const result = gameStore.enqueueSelfCheckout({ id, items: basket, avatar, depositBottles }, selfCheckoutStation)
          if (!result.ok) gameStore.enqueueCheckout({ id, items: basket, avatar, depositBottles })
          container.destroy(true)
          this.releaseActiveCustomer(avatar)
        })
        return
      }
      this.moveAlongPath(container, visual, pathToCheckout(currentRow), () => {
        gameStore.enqueueCheckout({ id, items: basket, avatar, depositBottles })
        container.destroy(true)
        this.releaseActiveCustomer(avatar)
      })
    }

    const visitShelf = (index: number) => {
      if (index >= shoppingList.length) {
        goToCheckout()
        return
      }
      const product = shoppingList[index]
      thought.setText(product.emoji).setVisible(true)
      this.moveAlongPath(container, visual, pathToProduct(currentRow, product.id), () => {
        currentRow = PRODUCT_ROW[product.id]
        const gotProduct = gameStore.takeFromShelf(product.id)
        if (gotProduct) basket.push(product.id)
        thought.setText(gotProduct ? `✓ ${product.emoji}  ${basket.length}` : `${product.emoji} leer`)
        this.time.delayedCall(gameStore.getSnapshot().reducedMotion ? 80 : 320, () => visitShelf(index + 1))
      })
    }

    if (depositBottles > 0) {
      thought.setText(`♻ ${depositBottles} × 0,25 €`).setVisible(true)
      this.moveAlongPath(container, visual, pathToBottleReturn(), () => {
        currentRow = 'bottom'
        thought.setText(`🎟️ ${(depositBottles * 0.25).toFixed(2).replace('.', ',')} € Pfandbon`)
        gameAudio.play('success')
        this.time.delayedCall(state.reducedMotion ? 100 : 550, () => visitShelf(0))
      })
    } else {
      visitShelf(0)
    }
  }

  private leaveStore(
    container: Phaser.GameObjects.Container,
    visual: CustomerVisual,
    currentRow: AisleRow,
  ) {
    this.time.delayedCall(550, () => {
      this.moveAlongPath(container, visual, pathToExit(currentRow), () => {
        container.destroy(true)
        this.releaseActiveCustomer(visual.avatar)
      })
    })
  }

  private releaseActiveCustomer(avatar: number) {
    this.activeCustomers = Math.max(0, this.activeCustomers - 1)
    const remaining = Math.max(0, (this.activeAvatarCounts.get(avatar) ?? 1) - 1)
    if (remaining === 0) this.activeAvatarCounts.delete(avatar)
    else this.activeAvatarCounts.set(avatar, remaining)
  }
}

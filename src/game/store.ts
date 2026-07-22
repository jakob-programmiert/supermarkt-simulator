import { useSyncExternalStore } from 'react'
import {
  CHECKOUT_DURATION,
  CASHIER_DURATION,
  HELPER_INFO,
  HELPER_PRICES,
  PRODUCT_BY_ID,
  PRODUCTS,
  PRODUCTS_BY_ROOM,
  ROOM_INFO,
  SELF_CHECKOUT_HELP_CHANCE,
  SHELF_CAPACITY,
  STARTING_MONEY,
  STORAGE_CAPACITY,
  UPGRADE_PRICES,
  formatMoney,
  type ExpansionRoomId,
  type ProductId,
  type HelperId,
  type RoomId,
  type UpgradeId,
} from './config'

const SAVE_KEY = 'supermarkt-simulator-save-v1'
const SAVE_VERSION = 1

export type AppScreen = 'menu' | 'game'
export type ModalName = 'order' | 'restock' | 'upgrades' | 'rooms' | 'pickup' | 'helpers' | 'management' | 'settings' | 'pricing' | 'help' | null

export type BusinessStrategy = 'value' | 'regional' | 'premium'
export type SpecialistId = 'logistics' | 'marketing' | 'quality' | 'analytics'
export type FranchiseId = 'discount' | 'bio' | 'express' | 'premium'
export type MarketEventId = 'heatwave' | 'festival' | 'shortage' | 'recall'

export interface MarketEvent {
  id: MarketEventId
  choice: 'safe' | 'bold' | null
}

export interface MarketBoost {
  label: string
  salesRemaining: number
  revenuePercent: number
  satisfaction: number
}

export interface BusinessState {
  strategy: BusinessStrategy | null
  franchises: FranchiseId[]
  specialists: Record<SpecialistId, boolean>
  ownBrandLevel: number
  marketShare: number
  reputation: number
  prestige: number
  completedContracts: string[]
  activeEvent: MarketEvent | null
  eventCursor: number
  marketBoost: MarketBoost | null
}

export interface ProductStock {
  shelf: number
  storage: number
}

export interface CheckoutEntry {
  id: number
  items: ProductId[]
  avatar: number
  depositBottles?: number
  queuedAt?: number
}

export const SELF_CHECKOUT_STATIONS = [0, 1, 2, 3] as const
export type SelfCheckoutStation = typeof SELF_CHECKOUT_STATIONS[number]
export type SelfCheckoutStatus = 'scanning' | 'help'

export interface SelfCheckoutEntry extends CheckoutEntry {
  station: SelfCheckoutStation
  status: SelfCheckoutStatus
  needsHelp: boolean
  assisted: boolean
}

export type PickupOrderStatus = 'new' | 'packing' | 'ready'

export interface PickupOrder {
  id: number
  customerName: string
  items: ProductId[]
  packedItems: ProductId[]
  status: PickupOrderStatus
}

export const PICKUP_SERVICE_FEE = 200
export const PICKUP_MAX_ORDERS = 3

export interface GameState {
  version: 1
  screen: AppScreen
  modal: ModalName
  selectedProduct: ProductId | null
  activeRoom: RoomId
  rooms: Record<ExpansionRoomId, boolean>
  returnableBottles: number
  pickupOrders: PickupOrder[]
  nextPickupOrderId: number
  money: number
  prices: Record<ProductId, number>
  customerSatisfaction: number
  products: Record<ProductId, ProductStock>
  upgrades: Record<UpgradeId, number>
  helpers: Record<HelperId, boolean>
  business: BusinessState
  stats: {
    customersServed: number
    customersMissed: number
    revenue: number
    pickupOrdersCompleted: number
    sold: Record<ProductId, number>
  }
  checkoutQueue: CheckoutEntry[]
  selfCheckouts: [SelfCheckoutEntry | null, SelfCheckoutEntry | null, SelfCheckoutEntry | null, SelfCheckoutEntry | null]
  soundEnabled: boolean
  reducedMotion: boolean
  tutorialSeen: boolean
  hasSave: boolean
  seed: number
}

interface PersistedState {
  version: 1
  activeRoom: RoomId
  rooms: Record<ExpansionRoomId, boolean>
  returnableBottles: number
  pickupOrders: PickupOrder[]
  nextPickupOrderId: number
  money: number
  prices: Record<ProductId, number>
  customerSatisfaction: number
  products: Record<ProductId, ProductStock>
  upgrades: Record<UpgradeId, number>
  helpers: Record<HelperId, boolean>
  business: BusinessState
  stats: GameState['stats']
  checkoutQueue: CheckoutEntry[]
  selfCheckouts: [SelfCheckoutEntry | null, SelfCheckoutEntry | null, SelfCheckoutEntry | null, SelfCheckoutEntry | null]
  soundEnabled: boolean
  reducedMotion: boolean
  tutorialSeen: boolean
  seed: number
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface ActionResult {
  ok: boolean
  message: string
}

const productRecord = <T,>(factory: (id: ProductId) => T) =>
  Object.fromEntries(PRODUCTS.map(({ id }) => [id, factory(id)])) as Record<ProductId, T>

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

const createBusinessState = (): BusinessState => ({
  strategy: null,
  franchises: [],
  specialists: { logistics: false, marketing: false, quality: false, analytics: false },
  ownBrandLevel: 0,
  marketShare: 3,
  reputation: 40,
  prestige: 0,
  completedContracts: [],
  activeEvent: null,
  eventCursor: 0,
  marketBoost: null,
})

const createInitialState = (hasSave = false, seed = 2_026_071_4): GameState => ({
  version: SAVE_VERSION,
  screen: 'menu',
  modal: null,
  selectedProduct: null,
  money: STARTING_MONEY,
  activeRoom: 'main',
  rooms: { beverage: false, fresh: false },
  returnableBottles: 0,
  pickupOrders: [],
  nextPickupOrderId: 1,
  products: productRecord((id) => PRODUCT_BY_ID[id].room === 'main'
    ? { shelf: 8, storage: 8 }
    : { shelf: 0, storage: 0 }),
  prices: productRecord((id) => PRODUCT_BY_ID[id].sellPrice),
  customerSatisfaction: 70,
  upgrades: { shelf: 0, storage: 0, checkout: 0 },
  helpers: { restock: false, cashier: false, order: false, pickup: false },
  business: createBusinessState(),
  stats: {
    customersServed: 0,
    customersMissed: 0,
    revenue: 0,
    pickupOrdersCompleted: 0,
    sold: productRecord(() => 0),
  },
  checkoutQueue: [],
  selfCheckouts: [null, null, null, null],
  soundEnabled: true,
  reducedMotion: false,
  tutorialSeen: false,
  hasSave,
  seed,
})

const isProductId = (value: string): value is ProductId => value in PRODUCT_BY_ID

export const getProductPrice = (productId: ProductId, prices?: Record<ProductId, number>) =>
  prices?.[productId] ?? PRODUCT_BY_ID[productId].sellPrice

export const getCheckoutSubtotal = (entry: CheckoutEntry, prices?: Record<ProductId, number>) =>
  entry.items.reduce((sum, productId) => sum + getProductPrice(productId, prices), 0)

export const getDepositVoucherValue = (entry: CheckoutEntry) =>
  Math.max(0, Math.floor(entry.depositBottles ?? 0)) * 25

export const getCheckoutTotal = (entry: CheckoutEntry, prices?: Record<ProductId, number>) => {
  const subtotal = getCheckoutSubtotal(entry, prices)
  return Math.max(0, subtotal - Math.min(subtotal, getDepositVoucherValue(entry)))
}

export const getPickupOrderTotal = (order: Pick<PickupOrder, 'items'>, prices?: Record<ProductId, number>) =>
  order.items.reduce((sum, productId) => sum + getProductPrice(productId, prices), 0) + PICKUP_SERVICE_FEE

export const chooseCashBill = (total: number) =>
  [500, 1_000, 2_000, 5_000].find((bill) => bill >= total) ?? Math.ceil(total / 5_000) * 5_000

export const parseMoneyInput = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null
  const cents = Math.round(Number(normalized) * 100)
  return Number.isFinite(cents) ? cents : null
}

const isValidSave = (value: unknown): value is PersistedState => {
  if (!value || typeof value !== 'object') return false
  const save = value as Partial<PersistedState>
  return (
    save.version === SAVE_VERSION &&
    typeof save.money === 'number' &&
    !!save.products &&
    !!save.upgrades &&
    !!save.stats
  )
}

export class GameStore {
  private state: GameState
  private readonly listeners = new Set<() => void>()
  private readonly storage: StorageLike | null
  private nextSelfCheckoutStation: SelfCheckoutStation = 0

  constructor(storage?: StorageLike | null) {
    this.storage = storage === undefined
      ? typeof window !== 'undefined'
        ? window.localStorage
        : null
      : storage
    const saved = this.readSave()
    this.state = saved
      ? {
          ...createInitialState(true, saved.seed),
          ...saved,
          screen: 'menu',
          modal: null,
          selectedProduct: null,
          hasSave: true,
        }
      : createInitialState(false)
  }

  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(next: GameState, persist = false) {
    this.state = next
    this.listeners.forEach((listener) => listener())
    if (persist) this.save()
  }

  private readSave(): PersistedState | null {
    try {
      const raw = this.storage?.getItem(SAVE_KEY)
      if (!raw) return null
      const value: unknown = JSON.parse(raw)
      if (!isValidSave(value)) return null
      const rawQueue = Array.isArray(value.checkoutQueue) ? value.checkoutQueue : []
      const checkoutQueue = rawQueue.flatMap((rawEntry) => {
        if (!rawEntry || typeof rawEntry !== 'object') return []
        const candidate = rawEntry as { id?: unknown; avatar?: unknown; items?: unknown; productId?: unknown; depositBottles?: unknown; queuedAt?: unknown }
        const items = Array.isArray(candidate.items)
          ? candidate.items.filter((item): item is ProductId => typeof item === 'string' && isProductId(item))
          : typeof candidate.productId === 'string' && isProductId(candidate.productId)
            ? [candidate.productId]
            : []
        if (!items.length || typeof candidate.id !== 'number' || typeof candidate.avatar !== 'number') return []
        const depositBottles = Number.isFinite(candidate.depositBottles)
          ? Math.max(0, Math.floor(candidate.depositBottles as number))
          : 0
        const queuedAt = Number.isFinite(candidate.queuedAt)
          ? Math.max(0, Math.floor(candidate.queuedAt as number))
          : undefined
        return [{ id: candidate.id, avatar: candidate.avatar, items, depositBottles, queuedAt }]
      })
      const helpers = {
        restock: value.helpers?.restock === true,
        cashier: value.helpers?.cashier === true,
        order: value.helpers?.order === true,
        pickup: value.helpers?.pickup === true,
      }
      const rawBusiness = value.business
      const business: BusinessState = {
        ...createBusinessState(),
        ...(rawBusiness && typeof rawBusiness === 'object' ? rawBusiness : {}),
        strategy: rawBusiness?.strategy === 'value' || rawBusiness?.strategy === 'regional' || rawBusiness?.strategy === 'premium'
          ? rawBusiness.strategy : null,
        franchises: Array.isArray(rawBusiness?.franchises)
          ? rawBusiness.franchises.filter((id): id is FranchiseId => id === 'discount' || id === 'bio' || id === 'express' || id === 'premium').slice(0, 3)
          : [],
        specialists: {
          logistics: rawBusiness?.specialists?.logistics === true,
          marketing: rawBusiness?.specialists?.marketing === true,
          quality: rawBusiness?.specialists?.quality === true,
          analytics: rawBusiness?.specialists?.analytics === true,
        },
        ownBrandLevel: clamp(Number.isFinite(rawBusiness?.ownBrandLevel) ? Math.floor(rawBusiness.ownBrandLevel) : 0, 0, 3),
        marketShare: clamp(Number.isFinite(rawBusiness?.marketShare) ? Math.round(rawBusiness.marketShare) : 3, 0, 100),
        reputation: clamp(Number.isFinite(rawBusiness?.reputation) ? Math.round(rawBusiness.reputation) : 40, 0, 100),
        prestige: Math.max(0, Number.isFinite(rawBusiness?.prestige) ? Math.floor(rawBusiness.prestige) : 0),
        completedContracts: Array.isArray(rawBusiness?.completedContracts)
          ? rawBusiness.completedContracts.filter((id): id is string => typeof id === 'string').slice(0, 30) : [],
        activeEvent: rawBusiness?.activeEvent && ['heatwave', 'festival', 'shortage', 'recall'].includes(rawBusiness.activeEvent.id)
          ? { id: rawBusiness.activeEvent.id as MarketEventId, choice: rawBusiness.activeEvent.choice === 'safe' || rawBusiness.activeEvent.choice === 'bold' ? rawBusiness.activeEvent.choice : null }
          : null,
        eventCursor: Math.max(0, Number.isFinite(rawBusiness?.eventCursor) ? Math.floor(rawBusiness.eventCursor) : 0),
        marketBoost: rawBusiness?.marketBoost && typeof rawBusiness.marketBoost.label === 'string'
          ? { label: rawBusiness.marketBoost.label.slice(0, 80), salesRemaining: Math.max(0, Math.floor(rawBusiness.marketBoost.salesRemaining ?? 0)), revenuePercent: clamp(Math.round(rawBusiness.marketBoost.revenuePercent ?? 0), 0, 100), satisfaction: clamp(Math.round(rawBusiness.marketBoost.satisfaction ?? 0), -20, 20) }
          : null,
      }
      const rooms = {
        beverage: value.rooms?.beverage === true,
        fresh: value.rooms?.fresh === true,
      }
      const activeRoom: RoomId = value.activeRoom === 'beverage' && rooms.beverage
        ? 'beverage'
        : value.activeRoom === 'fresh' && rooms.fresh
          ? 'fresh'
          : 'main'
      const returnableBottles = Number.isFinite(value.returnableBottles)
        ? Math.max(0, Math.floor(value.returnableBottles))
        : 0
      const pickupOrders = (Array.isArray(value.pickupOrders) ? value.pickupOrders : []).flatMap((rawOrder) => {
        if (!rawOrder || typeof rawOrder !== 'object') return []
        const candidate = rawOrder as Partial<PickupOrder>
        const items = Array.isArray(candidate.items)
          ? candidate.items.filter((item): item is ProductId => typeof item === 'string' && isProductId(item))
          : []
        const packedItems = Array.isArray(candidate.packedItems)
          ? candidate.packedItems.filter((item): item is ProductId => typeof item === 'string' && isProductId(item))
          : []
        if (!items.length || typeof candidate.id !== 'number') return []
        return [{
          id: Math.max(1, Math.floor(candidate.id)),
          customerName: typeof candidate.customerName === 'string' && candidate.customerName.trim()
            ? candidate.customerName.slice(0, 30)
            : 'Onlinekunde',
          items,
          packedItems: packedItems.slice(0, items.length),
          status: candidate.status === 'ready' ? 'ready' : candidate.status === 'packing' ? 'packing' : 'new',
        } satisfies PickupOrder]
      }).slice(0, PICKUP_MAX_ORDERS)
      const nextPickupOrderId = Number.isFinite(value.nextPickupOrderId)
        ? Math.max(1, Math.floor(value.nextPickupOrderId))
        : Math.max(0, ...pickupOrders.map(({ id }) => id)) + 1
      const products = productRecord((id) => {
        const stock = value.products?.[id]
        return stock && Number.isFinite(stock.shelf) && Number.isFinite(stock.storage)
          ? { shelf: Math.max(0, Math.floor(stock.shelf)), storage: Math.max(0, Math.floor(stock.storage)) }
          : PRODUCT_BY_ID[id].room === 'main'
            ? { shelf: 4, storage: 5 }
            : { shelf: 0, storage: 0 }
      })
      const prices = productRecord((id) => {
        const price = value.prices?.[id]
        return Number.isFinite(price)
          ? Math.max(25, Math.min(PRODUCT_BY_ID[id].sellPrice * 5, Math.round(price)))
          : PRODUCT_BY_ID[id].sellPrice
      })
      const customerSatisfaction = Number.isFinite(value.customerSatisfaction)
        ? Math.max(5, Math.min(100, Math.round(value.customerSatisfaction)))
        : 70
      const sold = productRecord((id) => {
        const amount = value.stats?.sold?.[id]
        return Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0
      })
      const stats = {
        ...value.stats,
        pickupOrdersCompleted: Number.isFinite(value.stats?.pickupOrdersCompleted)
          ? Math.max(0, Math.floor(value.stats.pickupOrdersCompleted))
          : 0,
        sold,
      }
      const rawSelfCheckouts = Array.isArray(value.selfCheckouts) ? value.selfCheckouts : []
      const selfCheckouts = SELF_CHECKOUT_STATIONS.map((station) => {
        const rawEntry = rawSelfCheckouts[station]
        if (!rawEntry || typeof rawEntry !== 'object') return null
        const candidate = rawEntry as Partial<SelfCheckoutEntry>
        const items = Array.isArray(candidate.items)
          ? candidate.items.filter((item): item is ProductId => typeof item === 'string' && isProductId(item))
          : []
        if (!items.length || typeof candidate.id !== 'number' || typeof candidate.avatar !== 'number') return null
        return {
          id: candidate.id,
          avatar: candidate.avatar,
          items,
          depositBottles: Number.isFinite(candidate.depositBottles)
            ? Math.max(0, Math.floor(candidate.depositBottles as number))
            : 0,
          queuedAt: Number.isFinite(candidate.queuedAt)
            ? Math.max(0, Math.floor(candidate.queuedAt as number))
            : undefined,
          station,
          status: candidate.status === 'help' ? 'help' : 'scanning',
          needsHelp: candidate.needsHelp === true,
          assisted: candidate.assisted === true,
        }
      }) as GameState['selfCheckouts']
      return {
        ...value,
        activeRoom,
        rooms,
        returnableBottles,
        pickupOrders,
        nextPickupOrderId,
        products,
        prices,
        customerSatisfaction,
        stats,
        helpers,
        business,
        checkoutQueue,
        selfCheckouts,
      }
    } catch {
      return null
    }
  }

  private toPersisted(): PersistedState {
    const {
      activeRoom,
      rooms,
      returnableBottles,
      pickupOrders,
      nextPickupOrderId,
      money,
      prices,
      customerSatisfaction,
      products,
      upgrades,
      helpers,
      business,
      stats,
      checkoutQueue,
      selfCheckouts,
      soundEnabled,
      reducedMotion,
      tutorialSeen,
      seed,
    } = this.state
    return {
      version: SAVE_VERSION,
      activeRoom,
      rooms,
      returnableBottles,
      pickupOrders,
      nextPickupOrderId,
      money,
      prices,
      customerSatisfaction,
      products,
      upgrades,
      helpers,
      business,
      stats,
      checkoutQueue,
      selfCheckouts,
      soundEnabled,
      reducedMotion,
      tutorialSeen,
      seed,
    }
  }

  save = () => {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.toPersisted()))
      if (!this.state.hasSave) {
        this.state = { ...this.state, hasSave: true }
        this.listeners.forEach((listener) => listener())
      }
    } catch {
      // The game remains playable when storage is unavailable or full.
    }
  }

  newGame = (seed = Date.now() >>> 0) => {
    this.nextSelfCheckoutStation = 0
    const previousSettings = {
      soundEnabled: this.state.soundEnabled,
      reducedMotion: this.state.reducedMotion,
    }
    this.state = {
      ...createInitialState(true, seed),
      ...previousSettings,
      screen: 'game',
      modal: 'help',
    }
    this.save()
    this.listeners.forEach((listener) => listener())
  }

  continueGame = (): boolean => {
    const saved = this.readSave()
    if (!saved) return false
    this.nextSelfCheckoutStation = 0
    const next = createInitialState(true, saved.seed)
    this.setState({
      ...next,
      ...saved,
      screen: 'game',
      modal: null,
      selectedProduct: null,
      hasSave: true,
    })
    return true
  }

  goToMenu = () => {
    this.save()
    this.setState({ ...this.state, screen: 'menu', modal: null, selectedProduct: null })
  }

  clearSave = () => {
    this.storage?.removeItem(SAVE_KEY)
    this.setState(createInitialState(false))
  }

  openModal = (modal: Exclude<ModalName, null>, selectedProduct: ProductId | null = null) => {
    this.setState({ ...this.state, modal, selectedProduct })
  }

  closeModal = () => this.setState({ ...this.state, modal: null, selectedProduct: null })

  isRoomUnlocked = (room: RoomId) => room === 'main' || this.state.rooms[room]

  isProductUnlocked = (productId: ProductId) => this.isRoomUnlocked(PRODUCT_BY_ID[productId].room)

  getUnlockedProducts = () => PRODUCTS.filter((product) => this.isRoomUnlocked(product.room))

  getCurrentRoomProducts = () => PRODUCTS_BY_ROOM[this.state.activeRoom]

  setActiveRoom = (room: RoomId): ActionResult => {
    if (!this.isRoomUnlocked(room)) return { ok: false, message: 'Dieser Raum ist noch nicht freigeschaltet.' }
    if (room === this.state.activeRoom) return { ok: true, message: `Du bist bereits im ${ROOM_INFO[room].name}.` }
    this.setState({ ...this.state, activeRoom: room, modal: null, selectedProduct: null }, true)
    return { ok: true, message: `${ROOM_INFO[room].name} betreten.` }
  }

  buyRoom = (room: ExpansionRoomId): ActionResult => {
    if (this.state.rooms[room]) return this.setActiveRoom(room)
    const price = ROOM_INFO[room].price
    if (this.state.money < price) return { ok: false, message: 'Dafür reicht dein Geld noch nicht.' }
    const products = { ...this.state.products }
    PRODUCTS_BY_ROOM[room].forEach(({ id }) => {
      products[id] = { shelf: 4, storage: 0 }
    })
    this.setState({
      ...this.state,
      money: this.state.money - price,
      rooms: { ...this.state.rooms, [room]: true },
      products,
      activeRoom: room,
      modal: null,
      selectedProduct: null,
    }, true)
    return { ok: true, message: `${ROOM_INFO[room].name} freigeschaltet!` }
  }

  claimDepositBottles = (maxBottles: number): number => {
    if (this.state.activeRoom !== 'beverage' || this.state.returnableBottles <= 0) return 0
    const bottles = Math.min(this.state.returnableBottles, Math.max(0, Math.floor(maxBottles)))
    if (bottles <= 0) return 0
    this.setState({
      ...this.state,
      returnableBottles: this.state.returnableBottles - bottles,
    }, true)
    return bottles
  }

  generatePickupOrder = (): ActionResult => {
    if (this.state.pickupOrders.length >= PICKUP_MAX_ORDERS) {
      return { ok: false, message: 'Der Abholbereich ist voll. Packe zuerst einen Auftrag fertig.' }
    }
    const eligible = this.getUnlockedProducts().filter(({ id }) => this.state.products[id].shelf > 0)
    if (!eligible.length) return { ok: false, message: 'Für eine Onlinebestellung ist gerade keine Ware im Regal.' }

    const id = this.state.nextPickupOrderId
    const names = ['Mia', 'Noah', 'Emma', 'Leon', 'Sofia', 'Finn', 'Lina', 'Paul']
    const customerName = names[(this.state.seed + id * 7) % names.length]
    const desiredCount = 3 + ((this.state.seed + id) % 4)
    const available = new Map(eligible.map(({ id: productId }) => [productId, this.state.products[productId].shelf]))
    const items: ProductId[] = []
    for (let step = 0; step < desiredCount * 3 && items.length < desiredCount; step += 1) {
      const product = eligible[(this.state.seed + id * 11 + step * 5) % eligible.length]
      const remaining = available.get(product.id) ?? 0
      if (remaining <= 0) continue
      items.push(product.id)
      available.set(product.id, remaining - 1)
    }
    if (!items.length) return { ok: false, message: 'Die Onlinekundschaft findet gerade keine verfügbare Ware.' }

    const order: PickupOrder = { id, customerName, items, packedItems: [], status: 'new' }
    this.setState({
      ...this.state,
      pickupOrders: [...this.state.pickupOrders, order],
      nextPickupOrderId: id + 1,
    }, true)
    return { ok: true, message: `Neue Onlinebestellung von ${customerName}: ${items.length} Artikel.` }
  }

  startPackingPickupOrder = (orderId: number): ActionResult => {
    const order = this.state.pickupOrders.find(({ id }) => id === orderId)
    if (!order) return { ok: false, message: 'Diese Bestellung ist nicht mehr vorhanden.' }
    if (order.status === 'ready') return { ok: false, message: 'Diese Bestellung ist bereits abholbereit.' }
    const pickupOrders = this.state.pickupOrders.map((candidate) => (
      candidate.id === orderId ? { ...candidate, status: 'packing' as const } : candidate
    ))
    this.setState({ ...this.state, pickupOrders }, true)
    return { ok: true, message: `Bestellung #${orderId} wird jetzt gepackt.` }
  }

  packPickupItem = (orderId: number, productId: ProductId): ActionResult => {
    const order = this.state.pickupOrders.find(({ id }) => id === orderId)
    if (!order) return { ok: false, message: 'Diese Bestellung ist nicht mehr vorhanden.' }
    if (order.status === 'ready') return { ok: false, message: 'Diese Bestellung ist bereits fertig gepackt.' }
    const required = order.items.filter((item) => item === productId).length
    const packed = order.packedItems.filter((item) => item === productId).length
    if (packed >= required) return { ok: false, message: `${PRODUCT_BY_ID[productId].name} sind bereits vollständig eingepackt.` }
    const stock = this.state.products[productId]
    if (stock.shelf <= 0) return { ok: false, message: `${PRODUCT_BY_ID[productId].name} sind im Regal ausverkauft.` }

    const packedItems = [...order.packedItems, productId]
    const finished = packedItems.length === order.items.length
    const pickupOrders = this.state.pickupOrders.map((candidate) => candidate.id === orderId
      ? { ...candidate, packedItems, status: finished ? 'ready' as const : 'packing' as const }
      : candidate)
    const products = {
      ...this.state.products,
      [productId]: { ...stock, shelf: stock.shelf - 1 },
    }
    this.setState({ ...this.state, products, pickupOrders }, true)
    return {
      ok: true,
      message: finished
        ? `Bestellung #${orderId} ist abholbereit!`
        : `${PRODUCT_BY_ID[productId].name} eingepackt.`,
    }
  }

  completePickupOrder = (orderId: number): ActionResult => {
    const order = this.state.pickupOrders.find(({ id }) => id === orderId)
    if (!order) return { ok: false, message: 'Diese Bestellung wurde bereits abgeholt.' }
    if (order.status !== 'ready') return { ok: false, message: 'Packe zuerst alle bestellten Artikel ein.' }
    const total = getPickupOrderTotal(order, this.state.prices)
    const sold = { ...this.state.stats.sold }
    order.items.forEach((productId) => { sold[productId] += 1 })
    const bottles = order.items.reduce((sum, productId) => sum + (PRODUCT_BY_ID[productId].deposit ? 1 : 0), 0)
    this.setState({
      ...this.state,
      money: this.state.money + total,
      pickupOrders: this.state.pickupOrders.filter(({ id }) => id !== orderId),
      returnableBottles: this.state.returnableBottles + bottles,
      stats: {
        ...this.state.stats,
        customersServed: this.state.stats.customersServed + 1,
        pickupOrdersCompleted: this.state.stats.pickupOrdersCompleted + 1,
        revenue: this.state.stats.revenue + total,
        sold,
      },
    }, true)
    return { ok: true, message: `${order.customerName} hat Bestellung #${order.id} abgeholt · ${formatMoney(total)}.` }
  }

  processPickupOrderByHelper = (): ActionResult => {
    if (!this.state.helpers.pickup) return { ok: false, message: 'Die Online-Shop-Hilfe wurde noch nicht eingestellt.' }
    const readyOrder = this.state.pickupOrders.find((order) => order.status === 'ready')
    if (readyOrder) return this.completePickupOrder(readyOrder.id)

    const newOrder = this.state.pickupOrders.find((order) => order.status === 'new')
    if (newOrder) return this.startPackingPickupOrder(newOrder.id)

    for (const order of this.state.pickupOrders) {
      if (order.status !== 'packing') continue
      const nextProduct = order.items.find((productId) => {
        const required = order.items.filter((item) => item === productId).length
        const packed = order.packedItems.filter((item) => item === productId).length
        return packed < required && this.state.products[productId].shelf > 0
      })
      if (nextProduct) return this.packPickupItem(order.id, nextProduct)
    }
    return { ok: false, message: 'Die Online-Shop-Hilfe wartet auf Ware im Regal.' }
  }

  setTutorialSeen = () => {
    this.setState({ ...this.state, tutorialSeen: true, modal: null }, true)
  }

  toggleSound = () => {
    this.setState({ ...this.state, soundEnabled: !this.state.soundEnabled }, true)
  }

  toggleReducedMotion = () => {
    this.setState({ ...this.state, reducedMotion: !this.state.reducedMotion }, true)
  }

  getShelfCapacity = () => SHELF_CAPACITY[this.state.upgrades.shelf]
  getStorageCapacity = () => STORAGE_CAPACITY[this.state.upgrades.storage]
  getScanDuration = () => CHECKOUT_DURATION[this.state.upgrades.checkout]
  getCashierDuration = () => CASHIER_DURATION[this.state.upgrades.checkout]
  getStorageTotal = () => this.getUnlockedProducts().reduce((sum, { id }) => sum + this.state.products[id].storage, 0)
  getProductPrice = (productId: ProductId) => this.state.prices[productId]

  getShelfFill = () => {
    const products = this.getUnlockedProducts()
    if (!products.length) return 0
    const capacity = this.getShelfCapacity()
    return products.reduce((sum, { id }) => sum + this.state.products[id].shelf / capacity, 0) / products.length
  }

  getCustomerDemand = () => {
    const roomProducts = this.getCurrentRoomProducts()
    const averagePriceRatio = roomProducts.reduce(
      (sum, { id, sellPrice }) => sum + this.state.prices[id] / sellPrice,
      0,
    ) / Math.max(1, roomProducts.length)
    const serviceFactor = 0.4 + this.state.customerSatisfaction / 100
    const priceFactor = clamp(1 - (averagePriceRatio - 1) * 1.2, 0.25, 2.3)
    const shelfFactor = 0.35 + this.getShelfFill() * 0.9
    const business = this.state.business
    const strategyBonus = business.strategy === 'value' ? 0.14 : business.strategy === 'regional' ? 0.08 : business.strategy === 'premium' ? 0.03 : 0
    const networkBonus = business.franchises.length * 0.04
    const expertBonus = (business.specialists.marketing ? 0.12 : 0) + business.prestige * 0.04
    return clamp(serviceFactor * priceFactor * shelfFactor * (1 + strategyBonus + networkBonus + expertBonus), 0.25, 3.4)
  }

  getCustomerSpawnDelay = (variation: number) => {
    const baseDelay = 6_500 + clamp(variation, 0, 1) * 2_500
    return Math.round(clamp(baseDelay / this.getCustomerDemand(), 2_600, 16_000))
  }

  getCustomerCapacity = () => Math.round(clamp(4 + this.getCustomerDemand() * 2, 4, 9))

  chooseBusinessStrategy = (strategy: BusinessStrategy): ActionResult => {
    if (this.state.business.strategy) return { ok: false, message: 'Dein Unternehmenskonzept steht bereits fest.' }
    const cost = 15_000
    if (this.state.money < cost) return { ok: false, message: 'Für die Marktanalyse fehlen noch Mittel.' }
    this.setState({
      ...this.state,
      money: this.state.money - cost,
      business: { ...this.state.business, strategy, reputation: this.state.business.reputation + 6 },
    }, true)
    return { ok: true, message: 'Unternehmenskonzept festgelegt. Dein Markt hebt sich jetzt von der Konkurrenz ab.' }
  }

  openFranchise = (franchise: FranchiseId): ActionResult => {
    const prices: Record<FranchiseId, number> = { discount: 35_000, bio: 50_000, express: 65_000, premium: 85_000 }
    if (!this.state.business.strategy) return { ok: false, message: 'Lege zuerst ein Unternehmenskonzept fest.' }
    if (this.state.business.franchises.includes(franchise)) return { ok: false, message: 'Diese Filiale gehört bereits zu deinem Konzern.' }
    if (this.state.business.franchises.length >= 3) return { ok: false, message: 'Dein Regionalmanagement ist mit drei Filialen vorerst ausgelastet.' }
    if (this.state.money < prices[franchise]) return { ok: false, message: 'Für diese Filiale reicht das Investitionsbudget noch nicht.' }
    this.setState({
      ...this.state,
      money: this.state.money - prices[franchise],
      business: {
        ...this.state.business,
        franchises: [...this.state.business.franchises, franchise],
        marketShare: clamp(this.state.business.marketShare + 4, 0, 100),
        reputation: clamp(this.state.business.reputation + 3, 0, 100),
      },
    }, true)
    return { ok: true, message: 'Neue Filiale eröffnet! Ihr Netzwerk stärkt Marktanteil und Nachfrage.' }
  }

  hireSpecialist = (specialist: SpecialistId): ActionResult => {
    const prices: Record<SpecialistId, number> = { logistics: 24_000, marketing: 30_000, quality: 32_000, analytics: 28_000 }
    if (this.state.business.specialists[specialist]) return { ok: false, message: 'Diese Spezialistin bzw. dieser Spezialist arbeitet bereits für dich.' }
    if (this.state.money < prices[specialist]) return { ok: false, message: 'Dafür reicht das Unternehmensbudget noch nicht.' }
    this.setState({
      ...this.state,
      money: this.state.money - prices[specialist],
      business: { ...this.state.business, specialists: { ...this.state.business.specialists, [specialist]: true } },
    }, true)
    return { ok: true, message: 'Spezialist eingestellt. Die Konzernleitung gewinnt eine neue Stärke.' }
  }

  upgradeOwnBrand = (): ActionResult => {
    const prices = [25_000, 55_000, 100_000]
    const level = this.state.business.ownBrandLevel
    if (!this.state.business.strategy) return { ok: false, message: 'Definiere zuerst, wofür deine Marke steht.' }
    if (level >= prices.length) return { ok: false, message: 'Deine Eigenmarke ist bereits auf ihrem höchsten Niveau.' }
    if (this.state.money < prices[level]) return { ok: false, message: 'Für die Produktentwicklung fehlen noch Mittel.' }
    this.setState({
      ...this.state,
      money: this.state.money - prices[level],
      business: { ...this.state.business, ownBrandLevel: level + 1, reputation: clamp(this.state.business.reputation + 4, 0, 100) },
    }, true)
    return { ok: true, message: 'Eigenmarke ausgebaut: Jeder Verkauf wird jetzt profitabler.' }
  }

  startMarketEvent = (): ActionResult => {
    if (this.state.business.activeEvent) return { ok: false, message: 'Ein Marktgeschehen braucht noch deine Entscheidung.' }
    const events: MarketEventId[] = ['heatwave', 'festival', 'shortage', 'recall']
    const id = events[(this.state.seed + this.state.business.eventCursor) % events.length]
    this.setState({ ...this.state, business: { ...this.state.business, activeEvent: { id, choice: null }, eventCursor: this.state.business.eventCursor + 1 } }, true)
    return { ok: true, message: 'Neue Marktchance entdeckt. Entscheide, wie dein Unternehmen reagiert.' }
  }

  resolveMarketEvent = (choice: 'safe' | 'bold'): ActionResult => {
    const event = this.state.business.activeEvent
    if (!event) return { ok: false, message: 'Im Moment steht keine Marktentscheidung an.' }
    const safe = choice === 'safe'
    const definitions: Record<MarketEventId, { label: string; safe: MarketBoost; bold: MarketBoost }> = {
      heatwave: { label: 'Hitzewelle', safe: { label: 'Sommer-Sortiment', salesRemaining: 16, revenuePercent: 10, satisfaction: 2 }, bold: { label: 'Große Sommeroffensive', salesRemaining: 28, revenuePercent: 18, satisfaction: -1 } },
      festival: { label: 'Stadtfest', safe: { label: 'Stadtfest-Stand', salesRemaining: 14, revenuePercent: 12, satisfaction: 3 }, bold: { label: 'Festival-Hauptpartner', salesRemaining: 25, revenuePercent: 21, satisfaction: -2 } },
      shortage: { label: 'Lieferengpass', safe: { label: 'Faire Ersatzlieferung', salesRemaining: 12, revenuePercent: 7, satisfaction: 5 }, bold: { label: 'Knappheitsmarge', salesRemaining: 18, revenuePercent: 16, satisfaction: -5 } },
      recall: { label: 'Produktrückruf', safe: { label: 'Vorbildlicher Rückruf', salesRemaining: 10, revenuePercent: 5, satisfaction: 7 }, bold: { label: 'Schnelle Umstellung', salesRemaining: 18, revenuePercent: 13, satisfaction: -4 } },
    }
    const boost = definitions[event.id][safe ? 'safe' : 'bold']
    const cost = safe ? 7_500 : 0
    if (this.state.money < cost) return { ok: false, message: 'Für die sichere Lösung fehlen noch Mittel.' }
    this.setState({
      ...this.state,
      money: this.state.money - cost,
      business: { ...this.state.business, activeEvent: null, marketBoost: boost, reputation: clamp(this.state.business.reputation + boost.satisfaction, 0, 100) },
    }, true)
    return { ok: true, message: `${definitions[event.id].label}: Entscheidung umgesetzt. Der Effekt gilt für die nächsten ${boost.salesRemaining} Verkäufe.` }
  }

  claimBusinessContract = (contractId: string): ActionResult => {
    const business = this.state.business
    if (business.completedContracts.includes(contractId)) return { ok: false, message: 'Diesen Großauftrag hast du bereits abgeschlossen.' }
    const conditions: Record<string, { done: boolean; reward: number; reputation: number; label: string }> = {
      neighborhood: { done: this.state.stats.customersServed >= 50 && this.state.customerSatisfaction >= 75, reward: 30_000, reputation: 6, label: 'Nachbarschaftsauftrag' },
      supplier: { done: this.state.rooms.beverage && this.state.rooms.fresh && this.state.stats.revenue >= 120_000, reward: 55_000, reputation: 8, label: 'Regionaler Liefervertrag' },
      leader: { done: business.marketShare >= 18 && business.franchises.length >= 2, reward: 90_000, reputation: 10, label: 'Bezirkspartnerschaft' },
    }
    const contract = conditions[contractId]
    if (!contract || !contract.done) return { ok: false, message: 'Die Voraussetzungen für diesen Auftrag sind noch nicht erfüllt.' }
    this.setState({
      ...this.state,
      money: this.state.money + contract.reward,
      business: { ...business, completedContracts: [...business.completedContracts, contractId], reputation: clamp(business.reputation + contract.reputation, 0, 100), marketShare: clamp(business.marketShare + 2, 0, 100) },
    }, true)
    return { ok: true, message: `${contract.label} abgeschlossen: ${formatMoney(contract.reward)} Prämie erhalten.` }
  }

  startNewRegion = (): ActionResult => {
    const business = this.state.business
    if (this.state.money < 250_000 || business.franchises.length < 2 || business.ownBrandLevel < 2) {
      return { ok: false, message: 'Für eine neue Region brauchst du 2 Filialen, Eigenmarke Stufe 2 und 2.500 € Kapital.' }
    }
    const region = createInitialState(true, (this.state.seed + 1) >>> 0)
    this.setState({
      ...region,
      screen: 'game',
      modal: null,
      soundEnabled: this.state.soundEnabled,
      reducedMotion: this.state.reducedMotion,
      tutorialSeen: true,
      money: STARTING_MONEY + (business.prestige + 1) * 5_000,
      business: { ...createBusinessState(), prestige: business.prestige + 1, reputation: 45 },
    }, true)
    return { ok: true, message: 'Neue Region gegründet! Dein Konzernruf gibt dir dauerhaft mehr Nachfrage.' }
  }

  updateProductPrice = (productId: ProductId, price: number): ActionResult => {
    if (!this.isProductUnlocked(productId)) return { ok: false, message: 'Dieses Produkt ist noch nicht freigeschaltet.' }
    const maximum = PRODUCT_BY_ID[productId].sellPrice * 5
    const nextPrice = Math.round(clamp(price, 25, maximum))
    if (nextPrice === this.state.prices[productId]) return { ok: false, message: 'Dieser Preis ist bereits eingestellt.' }
    this.setState({
      ...this.state,
      prices: { ...this.state.prices, [productId]: nextPrice },
    }, true)
    return { ok: true, message: `${PRODUCT_BY_ID[productId].name}: ${formatMoney(nextPrice)} eingestellt.` }
  }

  private nextCustomerSatisfaction = (change: number) =>
    Math.round(clamp(this.state.customerSatisfaction + change, 5, 100))

  orderProduct = (productId: ProductId): ActionResult => {
    if (!this.isProductUnlocked(productId)) return { ok: false, message: 'Dieses Produkt ist noch nicht freigeschaltet.' }
    const product = PRODUCT_BY_ID[productId]
    const cost = product.buyPrice * product.orderSize
    if (this.state.money < cost) return { ok: false, message: 'Dafür reicht dein Geld noch nicht.' }
    if (this.getStorageTotal() + product.orderSize > this.getStorageCapacity()) {
      return { ok: false, message: 'Dein Lager ist voll.' }
    }
    const products = {
      ...this.state.products,
      [productId]: {
        ...this.state.products[productId],
        storage: this.state.products[productId].storage + product.orderSize,
      },
    }
    this.setState({ ...this.state, money: this.state.money - cost, products }, true)
    return { ok: true, message: `${product.name} wurden geliefert.` }
  }

  orderNextProductByHelper = (): ActionResult => {
    if (!this.state.helpers.order) return { ok: false, message: 'Du hast noch keine Bestellhilfe.' }
    const storageSpace = this.getStorageCapacity() - this.getStorageTotal()
    const stockThreshold = this.getShelfCapacity()
    const product = this.getUnlockedProducts()
      .map((candidate) => ({
        ...candidate,
        total: this.state.products[candidate.id].shelf + this.state.products[candidate.id].storage,
        cost: candidate.buyPrice * candidate.orderSize,
      }))
      .filter((candidate) => (
        candidate.total <= stockThreshold &&
        candidate.orderSize <= storageSpace &&
        candidate.cost <= this.state.money
      ))
      .sort((a, b) => a.total - b.total)[0]
    if (!product) return { ok: false, message: 'Noch ist keine Bestellung nötig oder möglich.' }
    return this.orderProduct(product.id)
  }

  restockProduct = (productId: ProductId): ActionResult => {
    if (!this.isProductUnlocked(productId)) return { ok: false, message: 'Dieses Produkt ist noch nicht freigeschaltet.' }
    const current = this.state.products[productId]
    const amount = Math.min(this.getShelfCapacity() - current.shelf, current.storage)
    if (amount <= 0) {
      return {
        ok: false,
        message: current.storage <= 0 ? 'Im Lager ist nichts mehr davon.' : 'Das Regal ist bereits voll.',
      }
    }
    const products = {
      ...this.state.products,
      [productId]: { shelf: current.shelf + amount, storage: current.storage - amount },
    }
    this.setState({ ...this.state, products }, true)
    return { ok: true, message: `${amount} ${PRODUCT_BY_ID[productId].name} aufgefüllt.` }
  }

  restockNextShelfByHelper = (): ActionResult => {
    if (!this.state.helpers.restock) return { ok: false, message: 'Du hast noch keine Regalhilfe.' }
    const capacity = this.getShelfCapacity()
    const product = this.getUnlockedProducts()
      .map(({ id }) => ({ id, amount: Math.min(capacity - this.state.products[id].shelf, this.state.products[id].storage) }))
      .filter(({ amount }) => amount > 0)
      .sort((a, b) => b.amount - a.amount)[0]
    if (!product) return { ok: false, message: 'Alle Regale sind versorgt.' }
    return this.restockProduct(product.id)
  }

  takeFromShelf = (productId: ProductId): boolean => {
    if (!this.isProductUnlocked(productId)) return false
    const current = this.state.products[productId]
    if (current.shelf <= 0) return false
    const products = {
      ...this.state.products,
      [productId]: { ...current, shelf: current.shelf - 1 },
    }
    this.setState({ ...this.state, products }, true)
    return true
  }

  recordEmptyShelf = () => {
    this.setState({
      ...this.state,
      customerSatisfaction: this.nextCustomerSatisfaction(-3),
    }, true)
  }

  markCustomerMissed = () => {
    this.setState({
      ...this.state,
      customerSatisfaction: this.nextCustomerSatisfaction(-8),
      stats: { ...this.state.stats, customersMissed: this.state.stats.customersMissed + 1 },
    }, true)
  }

  getAvailableSelfCheckoutStation = (): SelfCheckoutStation | null => {
    for (let offset = 0; offset < SELF_CHECKOUT_STATIONS.length; offset += 1) {
      const station = ((this.nextSelfCheckoutStation + offset) % SELF_CHECKOUT_STATIONS.length) as SelfCheckoutStation
      if (this.state.selfCheckouts[station]) continue
      this.nextSelfCheckoutStation = ((station + 1) % SELF_CHECKOUT_STATIONS.length) as SelfCheckoutStation
      return station
    }
    return null
  }

  enqueueSelfCheckout = (entry: CheckoutEntry, station: SelfCheckoutStation): ActionResult => {
    if (!entry.items.length || entry.items.some((item) => !isProductId(item))) {
      return { ok: false, message: 'Der Einkauf ist ungültig.' }
    }
    if (this.state.selfCheckouts[station]) return { ok: false, message: 'Diese Selbstkasse ist belegt.' }
    const issueRoll = (Math.imul(entry.id + 1, 2_654_435_761) ^ this.state.seed) >>> 0
    const selfCheckouts = [...this.state.selfCheckouts] as GameState['selfCheckouts']
    selfCheckouts[station] = {
      ...entry,
      items: [...entry.items],
      depositBottles: Math.max(0, Math.floor(entry.depositBottles ?? 0)),
      queuedAt: entry.queuedAt ?? Date.now(),
      station,
      status: 'scanning',
      needsHelp: issueRoll % 100 < SELF_CHECKOUT_HELP_CHANCE,
      assisted: false,
    }
    this.nextSelfCheckoutStation = ((station + 1) % SELF_CHECKOUT_STATIONS.length) as SelfCheckoutStation
    this.setState({ ...this.state, selfCheckouts }, true)
    return { ok: true, message: `Kunde benutzt Selbstkasse ${station + 1}.` }
  }

  flagSelfCheckoutHelp = (station: SelfCheckoutStation): ActionResult => {
    const entry = this.state.selfCheckouts[station]
    if (!entry || entry.status !== 'scanning') return { ok: false, message: 'Hier wird gerade keine Hilfe benötigt.' }
    const selfCheckouts = [...this.state.selfCheckouts] as GameState['selfCheckouts']
    selfCheckouts[station] = { ...entry, status: 'help' }
    this.setState({ ...this.state, selfCheckouts }, true)
    return { ok: true, message: `Selbstkasse ${station + 1} braucht Hilfe!` }
  }

  helpSelfCheckout = (station: SelfCheckoutStation): ActionResult => {
    const entry = this.state.selfCheckouts[station]
    if (!entry || entry.status !== 'help') return { ok: false, message: 'An dieser Selbstkasse ist alles in Ordnung.' }
    const selfCheckouts = [...this.state.selfCheckouts] as GameState['selfCheckouts']
    selfCheckouts[station] = { ...entry, status: 'scanning', needsHelp: false, assisted: true }
    this.setState({ ...this.state, selfCheckouts }, true)
    return { ok: true, message: `Du hast an Selbstkasse ${station + 1} geholfen.` }
  }

  private completeSale = (entry: CheckoutEntry, changes: Partial<GameState>): ActionResult => {
    const total = getCheckoutTotal(entry, this.state.prices)
    const voucherValue = Math.min(getCheckoutSubtotal(entry, this.state.prices), getDepositVoucherValue(entry))
    const waitMs = entry.queuedAt ? Date.now() - entry.queuedAt : 0
    const shelfFill = this.getShelfFill()
    const serviceChange = waitMs > 25_000
      ? -8
      : waitMs > 12_000
        ? -4
        : 2
    const stockChange = shelfFill < 0.25 ? -3 : shelfFill > 0.7 ? 1 : 0
    const returnedLater = entry.items.reduce(
      (sum, productId) => sum + (PRODUCT_BY_ID[productId].deposit ? 1 : 0),
      0,
    )
    const sold = { ...this.state.stats.sold }
    entry.items.forEach((productId) => { sold[productId] += 1 })
    const business = this.state.business
    const boost = business.marketBoost
    const revenuePercent = business.ownBrandLevel * 5
      + (business.strategy === 'premium' ? 4 : 0)
      + business.franchises.length * 2
      + (boost ? boost.revenuePercent : 0)
    const earned = Math.round(total * (1 + revenuePercent / 100))
    const served = this.state.stats.customersServed + 1
    const nextBoost = boost ? { ...boost, salesRemaining: boost.salesRemaining - 1 } : null
    const nextBusiness: BusinessState = {
      ...business,
      marketBoost: nextBoost && nextBoost.salesRemaining > 0 ? nextBoost : null,
      marketShare: clamp(business.marketShare + (this.state.customerSatisfaction >= 70 ? 1 : 0) + (business.specialists.marketing ? 1 : 0), 0, 100),
      reputation: clamp(business.reputation + (business.specialists.quality ? 1 : 0) + (boost?.satisfaction ?? 0), 0, 100),
    }
    if (!nextBusiness.activeEvent && served % 18 === 0) {
      const events: MarketEventId[] = ['heatwave', 'festival', 'shortage', 'recall']
      nextBusiness.activeEvent = { id: events[(this.state.seed + nextBusiness.eventCursor) % events.length], choice: null }
      nextBusiness.eventCursor += 1
    }
    this.setState({
      ...this.state,
      ...changes,
      money: this.state.money + earned,
      customerSatisfaction: this.nextCustomerSatisfaction(serviceChange + stockChange + (business.specialists.quality ? 1 : 0)),
      returnableBottles: this.state.returnableBottles + returnedLater,
      business: nextBusiness,
      stats: {
        ...this.state.stats,
        customersServed: this.state.stats.customersServed + 1,
        revenue: this.state.stats.revenue + earned,
        sold,
      },
    }, true)
    return {
      ok: true,
      message: voucherValue > 0
        ? `${formatMoney(total)} eingenommen · ${formatMoney(voucherValue)} Pfandbon eingelöst.`
        : `${formatMoney(total)} eingenommen.`,
    }
  }

  enqueueCheckout = (entry: CheckoutEntry) => {
    if (!entry.items.length || entry.items.some((item) => !isProductId(item))) return
    const safeEntry = {
      ...entry,
      items: [...entry.items],
      depositBottles: Math.max(0, Math.floor(entry.depositBottles ?? 0)),
      queuedAt: entry.queuedAt ?? Date.now(),
    }
    this.setState({ ...this.state, checkoutQueue: [...this.state.checkoutQueue, safeEntry] }, true)
  }

  completeCheckout = (): ActionResult => {
    const [entry, ...rest] = this.state.checkoutQueue
    if (!entry) return { ok: false, message: 'Niemand wartet an der Kasse.' }
    return this.completeSale(entry, { checkoutQueue: rest })
  }

  completeSelfCheckout = (station: SelfCheckoutStation): ActionResult => {
    const entry = this.state.selfCheckouts[station]
    if (!entry) return { ok: false, message: 'Diese Selbstkasse ist frei.' }
    if (entry.status === 'help') return { ok: false, message: 'Hilf dem Kunden zuerst.' }
    const selfCheckouts = [...this.state.selfCheckouts] as GameState['selfCheckouts']
    selfCheckouts[station] = null
    return this.completeSale(entry, { selfCheckouts })
  }

  buyUpgrade = (upgradeId: UpgradeId): ActionResult => {
    const level = this.state.upgrades[upgradeId]
    if (level >= UPGRADE_PRICES[upgradeId].length) {
      return { ok: false, message: 'Diese Verbesserung ist bereits maximal.' }
    }
    const price = UPGRADE_PRICES[upgradeId][level]
    if (this.state.money < price) return { ok: false, message: 'Dafür reicht dein Geld noch nicht.' }
    const upgrades = { ...this.state.upgrades, [upgradeId]: level + 1 }
    this.setState({ ...this.state, money: this.state.money - price, upgrades }, true)
    return { ok: true, message: 'Verbesserung gekauft!' }
  }

  buyHelper = (helperId: HelperId): ActionResult => {
    if (this.state.helpers[helperId]) return { ok: false, message: 'Diese Hilfe arbeitet bereits für dich.' }
    const price = HELPER_PRICES[helperId]
    if (this.state.money < price) return { ok: false, message: 'Dafür reicht dein Geld noch nicht.' }
    const helpers = { ...this.state.helpers, [helperId]: true }
    this.setState({ ...this.state, money: this.state.money - price, helpers }, true)
    return { ok: true, message: `${HELPER_INFO[helperId].name} eingestellt!` }
  }

  canClaimEmergency = () => {
    const products = this.getUnlockedProducts()
    const total = products.reduce(
      (sum, { id }) => sum + this.state.products[id].shelf + this.state.products[id].storage,
      0,
    )
    const cheapestOrder = Math.min(...products.map((product) => product.buyPrice * product.orderSize))
    return total === 0 && this.state.money < cheapestOrder
  }

  claimEmergency = (): ActionResult => {
    if (!this.canClaimEmergency()) return { ok: false, message: 'Das Notfallpaket wird gerade nicht benötigt.' }
    const products = { ...this.state.products }
    this.getUnlockedProducts().forEach(({ id }) => {
      products[id] = { ...products[id], storage: 2 }
    })
    this.setState({ ...this.state, products }, true)
    return { ok: true, message: 'Notfalllieferung erhalten: je 2 Produkte.' }
  }
}

export const gameStore = new GameStore()

export const useGameState = () =>
  useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, gameStore.getSnapshot)

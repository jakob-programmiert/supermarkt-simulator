import { describe, expect, it } from 'vitest'
import { HELPER_PRICES, STARTING_MONEY } from './config'
import {
  chooseCashBill,
  GameStore,
  getCheckoutSubtotal,
  getCheckoutTotal,
  getDepositVoucherValue,
  getPickupOrderTotal,
  parseMoneyInput,
} from './store'

class MemoryStorage {
  private data = new Map<string, string>()
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, value) }
  removeItem(key: string) { this.data.delete(key) }
}

describe('GameStore economy and inventory', () => {
  it('starts with the planned money and stock values', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    const state = store.getSnapshot()
    expect(state.money).toBe(STARTING_MONEY)
    expect(state.products.bread).toEqual({ shelf: 8, storage: 8 })
    expect(state.products.nutellaRoll).toEqual({ shelf: 8, storage: 8 })
    expect(state.products.water).toEqual({ shelf: 0, storage: 0 })
    expect(state.rooms).toEqual({ beverage: false, fresh: false })
    expect(store.orderProduct('water').ok).toBe(false)
    expect(store.getShelfCapacity()).toBe(8)
    expect(store.getStorageCapacity()).toBe(80)
  })

  it('orders packs of eight and charges their purchase cost', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    const result = store.orderProduct('bread')
    expect(result.ok).toBe(true)
    expect(store.getSnapshot().products.bread.storage).toBe(16)
    expect(store.getSnapshot().money).toBe(9_200)
  })

  it('never overfills a shelf while restocking', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.takeFromShelf('milk')).toBe(true)
    expect(store.takeFromShelf('milk')).toBe(true)
    const result = store.restockProduct('milk')
    expect(result.ok).toBe(true)
    expect(store.getSnapshot().products.milk).toEqual({ shelf: 8, storage: 6 })
  })

  it('credits every product in a multi-item basket', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.takeFromShelf('cookies')).toBe(true)
    expect(store.takeFromShelf('bread')).toBe(true)
    expect(store.takeFromShelf('milk')).toBe(true)
    store.enqueueCheckout({ id: 1, items: ['cookies', 'bread', 'milk'], avatar: 0 })
    const result = store.completeCheckout()
    expect(result.ok).toBe(true)
    expect(store.getSnapshot().products.cookies.shelf).toBe(7)
    expect(store.getSnapshot().money).toBe(10_750)
    expect(store.getSnapshot().stats.customersServed).toBe(1)
    expect(store.getSnapshot().stats.sold.cookies).toBe(1)
    expect(store.getSnapshot().stats.sold.bread).toBe(1)
    expect(store.getSnapshot().stats.sold.milk).toBe(1)
  })

  it('runs four self-checkouts and lets the player resolve a help request', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.getAvailableSelfCheckoutStation()).toBe(0)
    expect(store.enqueueSelfCheckout({ id: 10, items: ['bread', 'milk'], avatar: 1 }, 0).ok).toBe(true)
    expect(store.getAvailableSelfCheckoutStation()).toBe(1)
    expect(store.enqueueSelfCheckout({ id: 11, items: ['apple'], avatar: 3 }, 1).ok).toBe(true)
    expect(store.getAvailableSelfCheckoutStation()).toBe(2)
    expect(store.enqueueSelfCheckout({ id: 12, items: ['nutellaRoll'], avatar: 4 }, 2).ok).toBe(true)
    expect(store.getAvailableSelfCheckoutStation()).toBe(3)
    expect(store.enqueueSelfCheckout({ id: 13, items: ['yogurt'], avatar: 5 }, 3).ok).toBe(true)
    expect(store.getAvailableSelfCheckoutStation()).toBeNull()

    expect(store.flagSelfCheckoutHelp(0).ok).toBe(true)
    expect(store.completeSelfCheckout(0).ok).toBe(false)
    expect(store.helpSelfCheckout(0).ok).toBe(true)
    expect(store.getSnapshot().selfCheckouts[0]?.assisted).toBe(true)
    expect(store.completeSelfCheckout(0).ok).toBe(true)
    expect(store.getSnapshot().money).toBe(STARTING_MONEY + 450)
    expect(store.getSnapshot().stats.customersServed).toBe(1)
    expect(store.getSnapshot().stats.sold.bread).toBe(1)
    expect(store.getSnapshot().stats.sold.milk).toBe(1)
    expect(store.getAvailableSelfCheckoutStation()).toBe(0)
  })

  it('rotates customers fairly through all four self-checkouts even when earlier stations are free', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    const selectedStations: number[] = []

    for (let customer = 0; customer < 8; customer += 1) {
      const station = store.getAvailableSelfCheckoutStation()
      expect(station).not.toBeNull()
      selectedStations.push(station!)
      expect(store.enqueueSelfCheckout({ id: 100 + customer, items: ['bread'], avatar: customer % 6 }, station!).ok).toBe(true)
      expect(store.completeSelfCheckout(station!).ok).toBe(true)
    }

    expect(selectedStations).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
  })

  it('calculates cash bills and German change input correctly', () => {
    const entry = { id: 1, items: ['cookies', 'bread', 'milk'] as const, avatar: 0 }
    const total = getCheckoutTotal({ ...entry, items: [...entry.items] })
    expect(total).toBe(750)
    expect(chooseCashBill(total)).toBe(1_000)
    expect(parseMoneyInput('2,50')).toBe(250)
    expect(parseMoneyInput('zweifünfzig')).toBeNull()
  })

  it('values each returned bottle at 25 cents and deducts the voucher', () => {
    const entry = { id: 2, items: ['bread', 'milk'] as const, avatar: 1, depositBottles: 3 }
    const checkout = { ...entry, items: [...entry.items] }
    expect(getCheckoutSubtotal(checkout)).toBe(450)
    expect(getDepositVoucherValue(checkout)).toBe(75)
    expect(getCheckoutTotal(checkout)).toBe(375)
  })

  it('applies upgrade levels and their configured effects', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.buyUpgrade('shelf').ok).toBe(true)
    expect(store.getShelfCapacity()).toBe(12)
    expect(store.getSnapshot().money).toBe(0)
    expect(store.buyUpgrade('shelf').ok).toBe(false)
  })

  it('supports larger shelf and storage upgrades beyond the original maximum', () => {
    const storage = new MemoryStorage()
    const first = new GameStore(storage)
    first.newGame(42)
    const raw = JSON.parse(storage.getItem('supermarkt-simulator-save-v1')!)
    raw.money = 300_000
    storage.setItem('supermarkt-simulator-save-v1', JSON.stringify(raw))

    const expanded = new GameStore(storage)
    expanded.continueGame()
    for (let level = 0; level < 4; level += 1) expect(expanded.buyUpgrade('shelf').ok).toBe(true)
    for (let level = 0; level < 4; level += 1) expect(expanded.buyUpgrade('storage').ok).toBe(true)
    expect(expanded.getShelfCapacity()).toBe(32)
    expect(expanded.getStorageCapacity()).toBe(320)
    expect(expanded.buyUpgrade('shelf').ok).toBe(false)
  })

  it('unlocks the beverage room and carries a bottle voucher into checkout', () => {
    const storage = new MemoryStorage()
    const first = new GameStore(storage)
    first.newGame(42)
    const raw = JSON.parse(storage.getItem('supermarkt-simulator-save-v1')!)
    raw.money = 30_000
    storage.setItem('supermarkt-simulator-save-v1', JSON.stringify(raw))

    const expanded = new GameStore(storage)
    expanded.continueGame()
    expect(expanded.buyRoom('beverage').ok).toBe(true)
    expect(expanded.getSnapshot().activeRoom).toBe('beverage')
    expect(expanded.getSnapshot().products.water).toEqual({ shelf: 4, storage: 0 })
    expect(expanded.orderProduct('water').ok).toBe(true)
    expect(expanded.takeFromShelf('water')).toBe(true)
    expanded.enqueueCheckout({ id: 30, items: ['water'], avatar: 0 })
    expect(expanded.completeCheckout().ok).toBe(true)
    expect(expanded.getSnapshot().returnableBottles).toBe(1)
    expect(expanded.claimDepositBottles(4)).toBe(1)
    expect(expanded.getSnapshot().returnableBottles).toBe(0)
    const beforeDiscountedSale = expanded.getSnapshot().money
    expanded.enqueueCheckout({ id: 31, items: ['water'], avatar: 1, depositBottles: 1 })
    const result = expanded.completeCheckout()
    expect(result.ok).toBe(true)
    expect(result.message).toContain('Pfandbon eingelöst')
    expect(expanded.getSnapshot().money).toBe(beforeDiscountedSale + 125)
  })

  it('receives, packs and completes an online pickup order', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.generatePickupOrder().ok).toBe(true)
    const order = store.getSnapshot().pickupOrders[0]
    expect(order.status).toBe('new')
    expect(order.items.length).toBeGreaterThanOrEqual(3)
    expect(store.startPackingPickupOrder(order.id).ok).toBe(true)

    order.items.forEach((productId) => {
      expect(store.packPickupItem(order.id, productId).ok).toBe(true)
    })
    const packed = store.getSnapshot().pickupOrders[0]
    expect(packed.status).toBe('ready')
    expect(packed.packedItems).toEqual(packed.items)

    const expectedRevenue = getPickupOrderTotal(packed)
    expect(store.completePickupOrder(order.id).ok).toBe(true)
    expect(store.getSnapshot().pickupOrders).toHaveLength(0)
    expect(store.getSnapshot().stats.pickupOrdersCompleted).toBe(1)
    expect(store.getSnapshot().stats.customersServed).toBe(1)
    expect(store.getSnapshot().stats.revenue).toBe(expectedRevenue)
    expect(store.getSnapshot().money).toBe(STARTING_MONEY + expectedRevenue)
  })

  it('lets the online-shop helper pack and hand over pickup orders automatically', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.buyHelper('pickup').ok).toBe(true)
    expect(store.generatePickupOrder().ok).toBe(true)
    const order = store.getSnapshot().pickupOrders[0]
    const expectedRevenue = getPickupOrderTotal(order)

    for (let step = 0; step < order.items.length + 2; step += 1) {
      expect(store.processPickupOrderByHelper().ok).toBe(true)
    }

    expect(store.getSnapshot().pickupOrders).toHaveLength(0)
    expect(store.getSnapshot().stats.pickupOrdersCompleted).toBe(1)
    expect(store.getSnapshot().money).toBe(STARTING_MONEY - HELPER_PRICES.pickup + expectedRevenue)
  })

  it('persists pickup orders and limits the collection area to three orders', () => {
    const storage = new MemoryStorage()
    const store = new GameStore(storage)
    store.newGame(42)
    expect(store.generatePickupOrder().ok).toBe(true)
    expect(store.generatePickupOrder().ok).toBe(true)
    expect(store.generatePickupOrder().ok).toBe(true)
    expect(store.generatePickupOrder().ok).toBe(false)

    const restored = new GameStore(storage)
    expect(restored.continueGame()).toBe(true)
    expect(restored.getSnapshot().pickupOrders).toHaveLength(3)
    expect(restored.getSnapshot().nextPickupOrderId).toBe(4)
  })

  it('charges for helpers and lets the shelf helper restock automatically', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.takeFromShelf('milk')).toBe(true)
    expect(store.restockNextShelfByHelper().ok).toBe(false)
    expect(store.buyHelper('restock').ok).toBe(true)
    expect(store.getSnapshot().money).toBe(STARTING_MONEY - HELPER_PRICES.restock)
    expect(store.restockNextShelfByHelper().ok).toBe(true)
    expect(store.getSnapshot().products.milk).toEqual({ shelf: 8, storage: 7 })
    expect(store.buyHelper('restock').ok).toBe(false)
  })

  it('persists helpers and allows a cashier to finish a waiting purchase', () => {
    const storage = new MemoryStorage()
    const first = new GameStore(storage)
    first.newGame(42)
    first.buyHelper('restock')
    first.enqueueCheckout({ id: 8, items: ['bread'], avatar: 2 })
    const raw = JSON.parse(storage.getItem('supermarkt-simulator-save-v1')!)
    raw.money = HELPER_PRICES.cashier
    storage.setItem('supermarkt-simulator-save-v1', JSON.stringify(raw))

    const second = new GameStore(storage)
    second.continueGame()
    expect(second.getSnapshot().helpers.restock).toBe(true)
    expect(second.buyHelper('cashier').ok).toBe(true)
    expect(second.completeCheckout().ok).toBe(true)
    expect(second.getSnapshot().stats.customersServed).toBe(1)
  })

  it('lets the order helper replenish only genuinely low stock', () => {
    const store = new GameStore(new MemoryStorage())
    store.newGame(42)
    expect(store.orderNextProductByHelper().ok).toBe(false)
    expect(store.buyHelper('order').ok).toBe(true)
    expect(store.orderNextProductByHelper().ok).toBe(false)

    for (let index = 0; index < 8; index += 1) expect(store.takeFromShelf('bread')).toBe(true)
    expect(store.restockProduct('bread').ok).toBe(true)
    expect(store.takeFromShelf('bread')).toBe(true)
    expect(store.orderNextProductByHelper().ok).toBe(true)
    expect(store.getSnapshot().products.bread).toEqual({ shelf: 7, storage: 8 })
    expect(store.getSnapshot().money).toBe(STARTING_MONEY - HELPER_PRICES.order - 800)
  })

  it('restores a versioned save including a waiting checkout', () => {
    const storage = new MemoryStorage()
    const first = new GameStore(storage)
    first.newGame(123)
    first.takeFromShelf('apple')
    first.enqueueCheckout({ id: 7, items: ['apple', 'bread', 'apple'], avatar: 4 })

    const second = new GameStore(storage)
    expect(second.continueGame()).toBe(true)
    expect(second.getSnapshot().seed).toBe(123)
    expect(second.getSnapshot().products.apple.shelf).toBe(7)
    expect(second.getSnapshot().checkoutQueue).toHaveLength(1)
    expect(second.getSnapshot().checkoutQueue[0].items).toEqual(['apple', 'bread', 'apple'])
  })

  it('adds the new products when an older save does not contain them yet', () => {
    const storage = new MemoryStorage()
    const first = new GameStore(storage)
    first.newGame(123)
    const raw = JSON.parse(storage.getItem('supermarkt-simulator-save-v1')!)
    delete raw.products.nutellaRoll
    delete raw.products.cheese
    delete raw.products.juice
    delete raw.products.yogurt
    storage.setItem('supermarkt-simulator-save-v1', JSON.stringify(raw))

    const migrated = new GameStore(storage)
    expect(migrated.continueGame()).toBe(true)
    expect(migrated.getSnapshot().products.nutellaRoll).toEqual({ shelf: 4, storage: 5 })
    expect(migrated.getSnapshot().products.yogurt).toEqual({ shelf: 4, storage: 5 })
    expect(migrated.getSnapshot().products.water).toEqual({ shelf: 0, storage: 0 })
    expect(migrated.getSnapshot().rooms.beverage).toBe(false)
    expect(migrated.getSnapshot().pickupOrders).toEqual([])
    expect(migrated.getSnapshot().stats.pickupOrdersCompleted).toBe(0)
    expect(migrated.getSnapshot().selfCheckouts).toHaveLength(4)
  })

  it('grants emergency stock only in a true deadlock', () => {
    const storage = new MemoryStorage()
    const store = new GameStore(storage)
    store.newGame(42)
    expect(store.claimEmergency().ok).toBe(false)

    const raw = JSON.parse(storage.getItem('supermarkt-simulator-save-v1')!)
    raw.money = 0
    Object.keys(raw.products).forEach((id) => {
      raw.products[id] = { shelf: 0, storage: 0 }
    })
    storage.setItem('supermarkt-simulator-save-v1', JSON.stringify(raw))

    const deadlocked = new GameStore(storage)
    deadlocked.continueGame()
    expect(deadlocked.canClaimEmergency()).toBe(true)
    expect(deadlocked.claimEmergency().ok).toBe(true)
    expect(deadlocked.getSnapshot().products.bread.storage).toBe(2)
  })
})

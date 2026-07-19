import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { CUSTOMERS_ATLAS_URL, PRODUCTS_ATLAS_URL, PRODUCTS_EXPANSION_ATLAS_URL, STORE_ENVIRONMENT_URL } from './assets'
import { gameAudio } from './game/audio'
import {
  CHECKOUT_DURATION,
  EXPANSION_ROOMS,
  HELPER_INFO,
  HELPER_PRICES,
  ORDER_HELPER_INTERVAL,
  PICKUP_HELPER_INTERVAL,
  PRODUCT_BY_ID,
  PRODUCTS,
  PRODUCTS_BY_ROOM,
  ROOM_INFO,
  SHELF_CAPACITY,
  STORAGE_CAPACITY,
  RESTOCK_HELPER_INTERVAL,
  SELF_CHECKOUT_ASSISTED_DURATION,
  SELF_CHECKOUT_DURATION,
  UPGRADE_INFO,
  UPGRADE_PRICES,
  formatMoney,
  type ProductDefinition,
  type ProductId,
  type HelperId,
  type UpgradeId,
} from './game/config'
import {
  chooseCashBill,
  gameStore,
  getCheckoutSubtotal,
  getCheckoutTotal,
  getDepositVoucherValue,
  getPickupOrderTotal,
  parseMoneyInput,
  PICKUP_MAX_ORDERS,
  PICKUP_SERVICE_FEE,
  SELF_CHECKOUT_STATIONS,
  useGameState,
  type ActionResult,
  type PickupOrderStatus,
  type SelfCheckoutStation,
} from './game/store'

const GameCanvas = lazy(() =>
  import('./game/GameCanvas').then((module) => ({ default: module.GameCanvas })),
)

type ToastState = { id: number; message: string; ok: boolean } | null

const iconStyle = (product: ProductDefinition): CSSProperties => ({
  backgroundImage: `url(${product.atlas === 'base' ? PRODUCTS_ATLAS_URL : PRODUCTS_EXPANSION_ATLAS_URL})`,
  backgroundPosition: product.atlasPosition,
  backgroundSize: product.atlas === 'base' ? '400% 200%' : '500% 200%',
})

function ProductIcon({ productId, size = 'normal' }: { productId: ProductId; size?: 'small' | 'normal' | 'large' }) {
  return (
    <span
      className={`product-icon product-icon--${size}`}
      style={iconStyle(PRODUCT_BY_ID[productId])}
      role="img"
      aria-label={PRODUCT_BY_ID[productId].name}
    />
  )
}

function CustomerAvatar({ index, large = false }: { index: number; large?: boolean }) {
  const column = index % 3
  const row = Math.floor(index / 3)
  return (
    <span
      className={`customer-avatar${large ? ' customer-avatar--large' : ''}`}
      style={{
        backgroundImage: `url(${CUSTOMERS_ATLAS_URL})`,
        backgroundPosition: `${column * 50}% ${row * 100}%`,
      }}
      aria-hidden="true"
    />
  )
}

function GameLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`game-logo${compact ? ' game-logo--compact' : ''}`} aria-label="Supermarkt-Simulator">
      <span className="game-logo__cart">🛒</span>
      <span className="game-logo__top">Supermarkt</span>
      <span className="game-logo__bottom">Simulator</span>
    </div>
  )
}

function MenuScreen() {
  const state = useGameState()

  const startNew = () => {
    gameAudio.play('click')
    if (state.hasSave && !window.confirm('Möchtest du wirklich ein neues Spiel beginnen? Der alte Spielstand wird ersetzt.')) return
    gameStore.newGame()
  }

  const continueGame = () => {
    gameAudio.play('click')
    gameStore.continueGame()
  }

  return (
    <main className="menu-screen">
      <div
        className="menu-screen__backdrop"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(8, 32, 30, .8), rgba(8, 32, 30, .08) 62%, rgba(8, 32, 30, .4)), url(${STORE_ENVIRONMENT_URL})`,
        }}
      />
      <section className="menu-card">
        <GameLogo />
        <p className="menu-card__tagline">Dein Laden. Deine Produkte. Dein Erfolg.</p>
        <div className="menu-actions">
          {state.hasSave && (
            <button className="button button--green button--wide" onClick={continueGame} data-testid="continue-game">
              <span>▶</span> Weiterspielen
            </button>
          )}
          <button className="button button--blue button--wide" onClick={startNew} data-testid="new-game">
            <span>✨</span> Neues Spiel
          </button>
          <button className="button button--cream button--wide" onClick={() => gameStore.openModal('settings')}>
            <span>⚙️</span> Einstellungen
          </button>
        </div>
        {state.hasSave && (
          <div className="save-summary">
            <span><b>{formatMoney(state.money)}</b> Kontostand</span>
            <span><b>{state.stats.customersServed}</b> Kunden bedient</span>
          </div>
        )}
      </section>
      <section className="menu-customers" aria-label="Unsere Kunden">
        {[0, 1, 2, 3, 4, 5].map((index) => <CustomerAvatar key={index} index={index} />)}
      </section>
      <p className="version-label">Webversion 1.0</p>
    </main>
  )
}

function TopHud() {
  const state = useGameState()
  const unlockedProducts = gameStore.getUnlockedProducts()
  const totalStock = unlockedProducts.reduce(
    (sum, { id }) => sum + state.products[id].shelf + state.products[id].storage,
    0,
  )

  return (
    <header className="top-hud">
      <button className="icon-button" onClick={() => {
        gameAudio.play('click')
        gameStore.goToMenu()
      }} aria-label="Zum Hauptmenü">⌂</button>
      <GameLogo compact />
      <div className="room-indicator"><span>{ROOM_INFO[state.activeRoom].icon}</span><b>{ROOM_INFO[state.activeRoom].name}</b></div>
      <div className="hud-spacer" />
      <div className="hud-pill hud-pill--money" data-testid="money"><span>💶</span><b>{formatMoney(state.money)}</b></div>
      <div className="hud-pill hud-secondary"><span>📦</span><b>{totalStock}</b><small> Waren</small></div>
      <div className="hud-pill hud-secondary"><span>😊</span><b>{state.stats.customersServed}</b><small> bedient</small></div>
      <button className="icon-button" onClick={() => {
        gameStore.toggleSound()
        gameAudio.play('click')
      }} aria-label={state.soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}>
        {state.soundEnabled ? '🔊' : '🔇'}
      </button>
      <button className="icon-button" onClick={() => gameStore.openModal('settings')} aria-label="Einstellungen">⚙</button>
    </header>
  )
}

function GoalCard() {
  const state = useGameState()
  const unlockedProducts = gameStore.getUnlockedProducts()
  const shelfTotal = unlockedProducts.reduce((sum, { id }) => sum + state.products[id].shelf, 0)
  return (
    <aside className="goal-card">
      <div className="goal-card__title"><span>⭐</span> HEUTE IM LADEN</div>
      <div className="goal-row"><span>Kunden bedienen</span><b>{state.stats.customersServed}</b></div>
      <div className="goal-row"><span>Waren im Regal</span><b>{shelfTotal}</b></div>
      <div className="goal-row"><span>Umsatz</span><b>{formatMoney(state.stats.revenue)}</b></div>
      <div className="goal-row"><span>Abholaufträge</span><b>{state.pickupOrders.length}</b></div>
      {state.activeRoom === 'beverage' && (
        <div className="goal-row"><span>Künftige Rückgaben</span><b>{state.returnableBottles}</b></div>
      )}
      <div className="goal-tip">{ROOM_INFO[state.activeRoom].name} · Klicke ein Regal direkt an, um es aufzufüllen.</div>
    </aside>
  )
}

function BottomToolbar() {
  const state = useGameState()
  const helperCount = Object.values(state.helpers).filter(Boolean).length
  const readyPickups = state.pickupOrders.filter(({ status }) => status === 'ready').length
  return (
    <nav className="bottom-toolbar" aria-label="Ladenaktionen">
      <button className="tool-button" onClick={() => {
        gameAudio.play('click')
        gameStore.openModal('order')
      }}><span className="tool-button__icon">📦</span><span>Bestellen</span></button>
      <button className="tool-button" onClick={() => {
        gameAudio.play('click')
        gameStore.openModal('restock')
      }}><span className="tool-button__icon">🧺</span><span>Auffüllen</span></button>
      <button className="tool-button tool-button--gold" onClick={() => {
        gameAudio.play('click')
        gameStore.openModal('upgrades')
      }}><span className="tool-button__icon">🔨</span><span>Ausbauen</span></button>
      <button className={`tool-button${state.activeRoom !== 'main' ? ' tool-button--room' : ''}`} onClick={() => {
        gameAudio.play('click')
        gameStore.openModal('rooms')
      }}><span className="tool-button__icon">🚪</span><span>Räume</span></button>
      <button className={`tool-button tool-button--pickup${readyPickups ? ' tool-button--pickup-ready' : ''}`} onClick={() => {
        gameAudio.play('click')
        gameStore.openModal('pickup')
      }}>
        <span className="tool-button__icon">🛍️</span><span>Abholung</span>
        {state.pickupOrders.length > 0 && <b className="tool-button__badge">{readyPickups || state.pickupOrders.length}</b>}
      </button>
      <button className={`tool-button${helperCount ? ' tool-button--staffed' : ''}`} onClick={() => {
        gameAudio.play('click')
        gameStore.openModal('helpers')
      }}><span className="tool-button__icon">🧑‍💼</span><span>Helfer{helperCount ? ` (${helperCount})` : ''}</span></button>
      <button className="tool-button" onClick={() => gameStore.openModal('help')}>
        <span className="tool-button__icon">?</span><span>Hilfe</span>
      </button>
    </nav>
  )
}

function HelperStatus() {
  const state = useGameState()
  const shelfCapacity = gameStore.getShelfCapacity()
  const unlockedProducts = gameStore.getUnlockedProducts()
  const restockBusy = unlockedProducts.some(({ id }) => (
    state.products[id].shelf < shelfCapacity && state.products[id].storage > 0
  ))
  const lowStock = unlockedProducts.some(({ id }) => (
    state.products[id].shelf + state.products[id].storage <= shelfCapacity
  ))
  if (!state.helpers.restock && !state.helpers.cashier && !state.helpers.order && !state.helpers.pickup) return null
  return (
    <aside className="helper-status" aria-label="Aktive Helfer" aria-live="polite">
      {state.helpers.restock && (
        <div className={restockBusy ? 'helper-status--busy' : ''}>
          <span>🧑‍🔧</span><p><b>Regalhilfe</b><small>{restockBusy ? 'füllt gerade auf' : 'alles aufgefüllt'}</small></p>
        </div>
      )}
      {state.helpers.cashier && (
        <div className={state.checkoutQueue.length ? 'helper-status--busy' : ''}>
          <span>🧑‍💼</span><p><b>Kassenhilfe</b><small>{state.checkoutQueue.length ? `${state.checkoutQueue.length} Kunde${state.checkoutQueue.length === 1 ? '' : 'n'} an der Kasse` : 'wartet auf Kunden'}</small></p>
        </div>
      )}
      {state.helpers.order && (
        <div className={lowStock ? 'helper-status--busy' : ''}>
          <span>🧑‍💻</span><p><b>Bestellhilfe</b><small>{lowStock ? 'prüft den Nachschub' : 'Bestand ausreichend'}</small></p>
        </div>
      )}
      {state.helpers.pickup && (
        <div className={state.pickupOrders.length ? 'helper-status--busy' : ''}>
          <span>🛍️</span><p><b>Online-Shop-Hilfe</b><small>{state.pickupOrders.length ? `bearbeitet ${state.pickupOrders.length} Online-Aufträge` : 'wartet auf Aufträge'}</small></p>
        </div>
      )}
    </aside>
  )
}

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null
  return <div className={`toast ${toast.ok ? 'toast--ok' : 'toast--error'}`} role="status">{toast.ok ? '✓' : '!'} {toast.message}</div>
}

function ModalShell({ title, icon, children, onClose = () => gameStore.closeModal() }: {
  title: string
  icon?: string
  children: ReactNode
  onClose?: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{icon && <span>{icon}</span>} {title}</h2>
          <button className="close-button" onClick={onClose} aria-label={`${title} schließen`}>×</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

function OrderModal({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  const used = gameStore.getStorageTotal()
  const capacity = gameStore.getStorageCapacity()
  const products = gameStore.getUnlockedProducts()
  return (
    <ModalShell title="Ware bestellen" icon="🛒">
      <div className="capacity-line">
        <span>Lagerplatz</span><b>{used} / {capacity}</b>
        <div className="progress"><i style={{ width: `${Math.min(100, (used / capacity) * 100)}%` }} /></div>
      </div>
      <div className="product-grid">
        {products.map((product) => {
          const price = product.buyPrice * product.orderSize
          const disabled = state.money < price || used + product.orderSize > capacity
          return (
            <article className="product-card" key={product.id}>
              <ProductIcon productId={product.id} />
              <div className="product-card__content">
                <h3>{product.name}</h3>
                <p>{formatMoney(product.sellPrice)} Verkauf</p>
                <small>Im Lager: {state.products[product.id].storage}</small>
              </div>
              <button disabled={disabled} onClick={() => {
                const result = gameStore.orderProduct(product.id)
                gameAudio.play(result.ok ? 'success' : 'click')
                notify(result)
              }}>+{product.orderSize} · {formatMoney(price)}</button>
            </article>
          )
        })}
      </div>
      {gameStore.canClaimEmergency() && (
        <button className="emergency-button" onClick={() => notify(gameStore.claimEmergency())}>
          🎁 Kostenloses Notfallpaket erhalten
        </button>
      )}
    </ModalShell>
  )
}

function RestockModal({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  const capacity = gameStore.getShelfCapacity()
  const products = state.selectedProduct
    ? PRODUCTS.filter((product) => product.id === state.selectedProduct)
    : gameStore.getCurrentRoomProducts()

  return (
    <ModalShell title="Regale auffüllen" icon="🧺">
      <p className="modal-intro">Übertrage deine Vorräte aus dem Lager direkt ins Regal.</p>
      <div className={`product-grid${products.length === 1 ? ' product-grid--single' : ''}`}>
        {products.map((product) => {
          const stock = state.products[product.id]
          const amount = Math.min(capacity - stock.shelf, stock.storage)
          return (
            <article className="product-card product-card--stock" key={product.id}>
              <ProductIcon productId={product.id} />
              <div className="product-card__content">
                <h3>{product.name}</h3>
                <p>Regal: <b>{stock.shelf} / {capacity}</b></p>
                <small>Lager: {stock.storage}</small>
              </div>
              <button disabled={amount <= 0} onClick={() => {
                const result = gameStore.restockProduct(product.id)
                gameAudio.play(result.ok ? 'success' : 'click')
                notify(result)
              }}>{amount > 0 ? `${amount} auffüllen` : stock.storage === 0 ? 'Lager leer' : 'Regal voll'}</button>
            </article>
          )
        })}
      </div>
    </ModalShell>
  )
}

function UpgradeModal({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  const upgradeIds: UpgradeId[] = ['shelf', 'storage', 'checkout']
  return (
    <ModalShell title="Laden ausbauen" icon="🔨">
      <p className="modal-intro">Investiere deine Einnahmen und mache den Laden Schritt für Schritt besser.</p>
      <div className="upgrade-list">
        {upgradeIds.map((id) => {
          const level = state.upgrades[id]
          const levelCount = UPGRADE_PRICES[id].length + 1
          const maxed = level >= UPGRADE_PRICES[id].length
          const price = maxed ? null : UPGRADE_PRICES[id][level]
          const value = id === 'shelf'
            ? `${SHELF_CAPACITY[level]} Plätze je Produkt`
            : id === 'storage'
              ? `${STORAGE_CAPACITY[level]} Lagerplätze`
              : `${CHECKOUT_DURATION[level] / 1000}s Scanzeit`
          return (
            <article className="upgrade-card" key={id}>
              <span className="upgrade-card__icon">{UPGRADE_INFO[id].icon}</span>
              <div>
                <h3>{UPGRADE_INFO[id].name}</h3>
                <p>{UPGRADE_INFO[id].description}</p>
                <small>Stufe {level + 1}/{levelCount} · aktuell {value}</small>
              </div>
              <div className="upgrade-card__levels" aria-label={`Stufe ${level + 1} von ${levelCount}`}>
                {Array.from({ length: levelCount }, (_, dot) => <i key={dot} className={dot <= level ? 'active' : ''} />)}
              </div>
              <button disabled={maxed || (price !== null && state.money < price)} onClick={() => {
                const result = gameStore.buyUpgrade(id)
                gameAudio.play(result.ok ? 'success' : 'click')
                notify(result)
              }}>{maxed ? 'Maximum' : formatMoney(price!)}</button>
            </article>
          )
        })}
      </div>
    </ModalShell>
  )
}

function RoomProductPreview({ product }: { product: ProductDefinition }) {
  return (
    <span className="room-product" title={product.name}>
      <ProductIcon productId={product.id} />
      <small>{product.name}</small>
    </span>
  )
}

function RoomsModal({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  const roomIds = ['main', ...EXPANSION_ROOMS] as const

  return (
    <ModalShell title="Neue Räume" icon="🚪">
      <p className="modal-intro">Kaufe Anbauten, schalte neue Waren frei und wechsle jederzeit zwischen deinen Verkaufsräumen.</p>
      <div className="room-list">
        {roomIds.map((roomId) => {
          const room = ROOM_INFO[roomId]
          const unlocked = gameStore.isRoomUnlocked(roomId)
          const active = state.activeRoom === roomId
          return (
            <article className={`room-card${active ? ' room-card--active' : ''}${!unlocked ? ' room-card--locked' : ''}`} key={roomId}>
              <div className="room-card__heading">
                <span>{room.icon}</span>
                <div><h3>{room.name}</h3><p>{room.description}</p></div>
                <b>{active ? 'DU BIST HIER' : unlocked ? 'FREIGESCHALTET' : 'ERWEITERUNG'}</b>
              </div>
              <div className="room-products">
                {PRODUCTS_BY_ROOM[roomId].map((product) => <RoomProductPreview key={product.id} product={product} />)}
              </div>
              {roomId === 'beverage' && (
                <p className="room-card__feature">♻️ Kunden geben Flaschen für je 0,25 € zurück und lösen ihren Pfandbon anschließend an der Kasse ein.</p>
              )}
              <button disabled={active || (!unlocked && state.money < room.price)} onClick={() => {
                const result = roomId === 'main' || unlocked
                  ? gameStore.setActiveRoom(roomId)
                  : gameStore.buyRoom(roomId)
                gameAudio.play(result.ok ? 'success' : 'click')
                notify(result)
              }}>
                {active ? 'Aktueller Raum' : unlocked ? 'Raum betreten' : `Freischalten · ${formatMoney(room.price)}`}
              </button>
            </article>
          )
        })}
      </div>
    </ModalShell>
  )
}

const PICKUP_STATUS_LABEL: Record<PickupOrderStatus, string> = {
  new: 'NEU EINGEGANGEN',
  packing: 'WIRD GEPACKT',
  ready: 'ABHOLBEREIT',
}

function PickupModal({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()

  const perform = (action: () => ActionResult) => {
    const result = action()
    gameAudio.play(result.ok ? 'success' : 'click')
    notify(result)
  }

  return (
    <ModalShell title="Online-Abholservice" icon="🛍️">
      <div className="pickup-intro">
        <span>📱</span>
        <div><b>Kunden stellen ihren Warenkorb online zusammen.</b><small>Du nimmst den Auftrag an, packst jeden Artikel aus deinen Regalen ein und gibst die fertige Bestellung bei der Abholung aus.</small></div>
        <strong>Servicegebühr {formatMoney(PICKUP_SERVICE_FEE)}</strong>
      </div>

      {state.pickupOrders.length === 0 ? (
        <div className="pickup-empty">
          <span>🛒</span><h3>Noch keine Onlinebestellung</h3>
          <p>Die Kundschaft füllt gerade ihre digitalen Warenkörbe.</p>
          <button onClick={() => perform(() => gameStore.generatePickupOrder())}>Online-Shop aktualisieren</button>
        </div>
      ) : (
        <div className="pickup-orders">
          {state.pickupOrders.map((order) => {
            const grouped = order.items.reduce<Array<{ productId: ProductId; required: number }>>((result, productId) => {
              const existing = result.find((item) => item.productId === productId)
              if (existing) existing.required += 1
              else result.push({ productId, required: 1 })
              return result
            }, [])
            const total = getPickupOrderTotal(order)
            return (
              <article className={`pickup-order pickup-order--${order.status}`} key={order.id}>
                <header>
                  <div><span>#{order.id}</span><h3>{order.customerName}</h3><small>{order.items.length} Artikel · {formatMoney(total)}</small></div>
                  <b>{PICKUP_STATUS_LABEL[order.status]}</b>
                </header>
                <div className="pickup-order__progress"><i style={{ width: `${(order.packedItems.length / order.items.length) * 100}%` }} /></div>
                <div className="pickup-items">
                  {grouped.map(({ productId, required }) => {
                    const packed = order.packedItems.filter((item) => item === productId).length
                    const product = PRODUCT_BY_ID[productId]
                    const done = packed >= required
                    return (
                      <button
                        className={done ? 'pickup-item--done' : ''}
                        key={productId}
                        disabled={order.status !== 'packing' || done || state.products[productId].shelf <= 0}
                        onClick={() => perform(() => gameStore.packPickupItem(order.id, productId))}
                        aria-label={`${product.name} einpacken`}
                      >
                        <ProductIcon productId={productId} size="small" />
                        <span><b>{product.name}</b><small>{ROOM_INFO[product.room].name} · Regal {state.products[productId].shelf}</small></span>
                        <strong>{packed}/{required}{done ? ' ✓' : ''}</strong>
                      </button>
                    )
                  })}
                </div>
                <footer>
                  {order.status === 'new' && <button onClick={() => perform(() => gameStore.startPackingPickupOrder(order.id))}>📦 Auftrag annehmen</button>}
                  {order.status === 'packing' && <p>Tippe jeden bestellten Artikel an, um ihn aus dem Regal einzupacken.</p>}
                  {order.status === 'ready' && <button className="pickup-collect" onClick={() => perform(() => gameStore.completePickupOrder(order.id))}>🚗 Bestellung an {order.customerName} ausgeben</button>}
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {state.pickupOrders.length > 0 && state.pickupOrders.length < PICKUP_MAX_ORDERS && (
        <button className="pickup-refresh" onClick={() => perform(() => gameStore.generatePickupOrder())}>＋ Nächste Onlinebestellung abrufen</button>
      )}
      <p className="pickup-summary">Bereits abgeholt: <b>{state.stats.pickupOrdersCompleted}</b></p>
    </ModalShell>
  )
}

function HelpersModal({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  const helperIds: HelperId[] = ['restock', 'cashier', 'order', 'pickup']
  return (
    <ModalShell title="Helfer einstellen" icon="🧑‍💼">
      <p className="modal-intro">Stelle einmalig Mitarbeiter ein, die dir dauerhaft Arbeit im Laden abnehmen.</p>
      <div className="helper-list">
        {helperIds.map((id) => {
          const hired = state.helpers[id]
          return (
            <article className={`helper-card${hired ? ' helper-card--hired' : ''}`} key={id}>
              <span className="helper-card__icon">{HELPER_INFO[id].icon}</span>
              <div>
                <h3>{HELPER_INFO[id].name}</h3>
                <p>{HELPER_INFO[id].description}</p>
                <small>{id === 'restock'
                  ? 'Arbeitet alle 3 Sekunden'
                  : id === 'cashier'
                  ? `${gameStore.getCashierDuration() / 1000} Sekunden je Einkauf`
                    : id === 'order'
                      ? 'Prüft alle 6 Sekunden den Bestand'
                      : 'Packt alle 1,5 Sekunden einen Arbeitsschritt'}</small>
              </div>
              <button disabled={hired || state.money < HELPER_PRICES[id]} onClick={() => {
                const result = gameStore.buyHelper(id)
                gameAudio.play(result.ok ? 'success' : 'click')
                notify(result)
              }}>{hired ? '✓ Eingestellt' : formatMoney(HELPER_PRICES[id])}</button>
            </article>
          )
        })}
      </div>
    </ModalShell>
  )
}

function HelperAutomation({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  const checkoutId = state.checkoutQueue[0]?.id

  useEffect(() => {
    if (!state.helpers.restock) return
    const interval = window.setInterval(() => {
      const snapshot = gameStore.getSnapshot()
      if (snapshot.screen === 'game' && snapshot.helpers.restock) gameStore.restockNextShelfByHelper()
    }, RESTOCK_HELPER_INTERVAL)
    return () => window.clearInterval(interval)
  }, [state.helpers.restock])

  useEffect(() => {
    if (!state.helpers.order) return
    const interval = window.setInterval(() => {
      const snapshot = gameStore.getSnapshot()
      if (snapshot.screen !== 'game' || !snapshot.helpers.order) return
      const result = gameStore.orderNextProductByHelper()
      if (result.ok) {
        gameAudio.play('success')
        notify({ ...result, message: `Bestellhilfe: ${result.message}` })
      }
    }, ORDER_HELPER_INTERVAL)
    return () => window.clearInterval(interval)
  }, [notify, state.helpers.order])

  useEffect(() => {
    if (!state.helpers.pickup) return
    const interval = window.setInterval(() => {
      const snapshot = gameStore.getSnapshot()
      if (snapshot.screen !== 'game' || !snapshot.helpers.pickup) return
      const result = gameStore.processPickupOrderByHelper()
      if (result.ok && (result.message.includes('abholbereit') || result.message.includes('abgeholt'))) {
        gameAudio.play('success')
        notify({ ...result, message: `Online-Shop-Hilfe: ${result.message}` })
      }
    }, PICKUP_HELPER_INTERVAL)
    return () => window.clearInterval(interval)
  }, [notify, state.helpers.pickup])

  useEffect(() => {
    if (!state.helpers.cashier || checkoutId === undefined || state.screen !== 'game') return
    const timeout = window.setTimeout(() => {
      const snapshot = gameStore.getSnapshot()
      if (!snapshot.helpers.cashier || snapshot.checkoutQueue[0]?.id !== checkoutId) return
      const result = gameStore.completeCheckout()
      if (result.ok) {
        gameAudio.play('coin')
        notify({ ...result, message: `Kassenhilfe: ${result.message}` })
      }
    }, gameStore.getCashierDuration())
    return () => window.clearTimeout(timeout)
  }, [checkoutId, notify, state.helpers.cashier, state.screen, state.upgrades.checkout])

  return null
}

function PickupAutomation({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()

  useEffect(() => {
    if (state.screen !== 'game') return
    const receiveOrder = () => {
      const snapshot = gameStore.getSnapshot()
      if (snapshot.screen !== 'game' || snapshot.pickupOrders.length >= PICKUP_MAX_ORDERS) return
      const result = gameStore.generatePickupOrder()
      if (result.ok) {
        gameAudio.play('bell')
        notify({ ...result, message: `Online-Shop: ${result.message}` })
      }
    }
    const firstOrder = window.setTimeout(receiveOrder, 5_000)
    const interval = window.setInterval(receiveOrder, 24_000)
    return () => {
      window.clearTimeout(firstOrder)
      window.clearInterval(interval)
    }
  }, [notify, state.screen])

  return null
}

function SelfCheckoutStationWorker({ station, notify }: {
  station: SelfCheckoutStation
  notify: (result: ActionResult) => void
}) {
  const state = useGameState()
  const entry = state.selfCheckouts[station]

  useEffect(() => {
    if (state.screen !== 'game' || !entry || entry.status !== 'scanning') return
    const timeout = window.setTimeout(() => {
      const current = gameStore.getSnapshot().selfCheckouts[station]
      if (!current || current.id !== entry.id || current.status !== 'scanning') return
      if (current.needsHelp && !current.assisted) {
        const result = gameStore.flagSelfCheckoutHelp(station)
        if (result.ok) {
          gameAudio.play('bell')
          notify({ ok: false, message: result.message })
        }
        return
      }
      const result = gameStore.completeSelfCheckout(station)
      if (result.ok) {
        gameAudio.play('coin')
        notify({ ...result, message: `Selbstkasse ${station + 1}: ${result.message}` })
      }
    }, entry.assisted ? SELF_CHECKOUT_ASSISTED_DURATION : SELF_CHECKOUT_DURATION)
    return () => window.clearTimeout(timeout)
  }, [entry?.assisted, entry?.id, entry?.needsHelp, entry?.status, notify, state.screen, station])

  return null
}

function SelfCheckoutAutomation({ notify }: { notify: (result: ActionResult) => void }) {
  return (
    <>
      {SELF_CHECKOUT_STATIONS.map((station) => (
        <SelfCheckoutStationWorker key={station} station={station} notify={notify} />
      ))}
    </>
  )
}

function SelfCheckoutAlerts({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  if (state.modal !== null) return null
  const stations = SELF_CHECKOUT_STATIONS.filter((station) => state.selfCheckouts[station]?.status === 'help')
  if (!stations.length) return null
  return (
    <aside className="self-checkout-alerts" aria-live="assertive" aria-label="Hilfe an Selbstkassen">
      {stations.map((station) => (
        <button key={station} onClick={() => {
          const result = gameStore.helpSelfCheckout(station)
          gameAudio.play(result.ok ? 'success' : 'click')
          notify(result)
        }}>
          <span>⚠️</span><b>Selbstkasse {station + 1}</b><small>Hilfe leisten</small>
        </button>
      ))}
    </aside>
  )
}

function SettingsModal() {
  const state = useGameState()
  return (
    <ModalShell title="Einstellungen" icon="⚙️">
      <div className="settings-list">
        <label className="setting-row">
          <span><b>Ton</b><small>Türglocke, Scanner und Münzen</small></span>
          <input type="checkbox" checked={state.soundEnabled} onChange={() => gameStore.toggleSound()} />
        </label>
        <label className="setting-row">
          <span><b>Weniger Bewegung</b><small>Kunden bewegen sich deutlich schneller</small></span>
          <input type="checkbox" checked={state.reducedMotion} onChange={() => gameStore.toggleReducedMotion()} />
        </label>
      </div>
      {state.hasSave && (
        <button className="danger-button" onClick={() => {
          if (window.confirm('Spielstand wirklich löschen?')) gameStore.clearSave()
        }}>Spielstand löschen</button>
      )}
    </ModalShell>
  )
}

function HelpModal() {
  const state = useGameState()
  return (
    <ModalShell title="Willkommen in deinem Laden!" icon="👋" onClose={() => {
      if (state.tutorialSeen) gameStore.closeModal()
    }}>
      <div className="tutorial-steps">
        <div><span>1</span><p><b>Kunden kommen automatisch.</b><br />Sie suchen zwei bis fünf Artikel in deinen Regalen.</p></div>
        <div><span>2</span><p><b>Halte die Regale voll.</b><br />Bestelle Ware und fülle sie aus dem Lager nach.</p></div>
        <div><span>3</span><p><b>Kassiere oder hilf.</b><br />Kunden nutzen vier Selbstkassen. Leuchtet eine rot, klicke sie an und hilf.</p></div>
        <div><span>4</span><p><b>Baue deinen Laden aus.</b><br />Verbessere Regale und schalte über „Räume“ neue Abteilungen frei.</p></div>
        <div><span>5</span><p><b>Scanne Pfandbons.</b><br />Im Getränkemarkt geben Kunden Flaschen für je 0,25 € zurück. Scanne ihren Bon an der Kasse.</p></div>
        <div><span>6</span><p><b>Packe Onlinebestellungen.</b><br />Unter „Abholung“ stellst du Warenkörbe zusammen und gibst sie an Kunden aus.</p></div>
      </div>
      <button className="button button--green button--wide" onClick={() => {
        gameAudio.play('success')
        gameStore.setTutorialSeen()
      }}>{state.tutorialSeen ? 'Zurück zum Laden' : 'Los geht’s!'}</button>
    </ModalShell>
  )
}

function CheckoutModal({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  const entry = state.checkoutQueue[0]
  const [scanningIndex, setScanningIndex] = useState<number | null>(null)
  const [scanned, setScanned] = useState<boolean[]>([])
  const [voucherScanning, setVoucherScanning] = useState(false)
  const [voucherScanned, setVoucherScanned] = useState(false)
  const [payment, setPayment] = useState<'cash' | 'card' | null>(null)
  const [changeInput, setChangeInput] = useState('')
  const [changeError, setChangeError] = useState('')
  const scanTimer = useRef<number | null>(null)
  const cardTimer = useRef<number | null>(null)

  useEffect(() => {
    if (scanTimer.current) window.clearTimeout(scanTimer.current)
    if (cardTimer.current) window.clearTimeout(cardTimer.current)
    setScanningIndex(null)
    setScanned([])
    setVoucherScanning(false)
    setVoucherScanned(false)
    setPayment(null)
    setChangeInput('')
    setChangeError('')
    return () => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current)
      if (cardTimer.current) window.clearTimeout(cardTimer.current)
    }
  }, [entry?.id])

  if (!entry || state.helpers.cashier) return null
  const duration = gameStore.getScanDuration()
  const subtotal = getCheckoutSubtotal(entry)
  const voucherValue = Math.min(subtotal, getDepositVoucherValue(entry))
  const total = getCheckoutTotal(entry)
  const cashBill = chooseCashBill(total)
  const expectedChange = cashBill - total
  const allScanned = entry.items.every((_, index) => scanned[index])
  const checkoutReady = allScanned && (voucherValue === 0 || voucherScanned)
  const receiptLines = PRODUCTS.flatMap((product) => {
    const amount = entry.items.filter((item) => item === product.id).length
    return amount ? [{ product, amount }] : []
  })

  const scan = (index: number) => {
    if (scanningIndex !== null || voucherScanning || scanned[index] || payment) return
    gameAudio.play('scan')
    setScanningIndex(index)
    scanTimer.current = window.setTimeout(() => {
      setScanningIndex(null)
      setScanned((current) => entry.items.map((_, itemIndex) => current[itemIndex] || itemIndex === index))
    }, duration)
  }

  const scanVoucher = () => {
    if (!allScanned || voucherValue === 0 || voucherScanned || voucherScanning || payment) return
    gameAudio.play('scan')
    setVoucherScanning(true)
    scanTimer.current = window.setTimeout(() => {
      setVoucherScanning(false)
      setVoucherScanned(true)
      gameAudio.play('success')
    }, duration)
  }

  const finishSale = () => {
    const result = gameStore.completeCheckout()
    gameAudio.play('coin')
    notify(result)
  }

  const submitCash = (event: FormEvent) => {
    event.preventDefault()
    const enteredChange = parseMoneyInput(changeInput)
    if (enteredChange !== expectedChange) {
      setChangeError(`Das stimmt noch nicht. Rechne ${formatMoney(cashBill)} minus ${formatMoney(total)}.`)
      gameAudio.play('click')
      return
    }
    finishSale()
  }

  const startCardPayment = () => {
    setPayment('card')
    gameAudio.play('click')
    cardTimer.current = window.setTimeout(finishSale, state.reducedMotion ? 700 : 2_600)
  }

  return (
    <div className="checkout-backdrop">
      <section className="checkout-panel" role="dialog" aria-modal="true" aria-label="Kasse">
        <div className="checkout-customer">
          <CustomerAvatar index={entry.avatar} large />
          <div>
            <small>KUNDE AN DER KASSE</small>
            <b>{entry.items.length === 1 ? 'Ich habe einen Artikel.' : `Ich habe ${entry.items.length} Artikel.`}</b>
            {voucherValue > 0 && <small>Außerdem habe ich einen Pfandbon über {formatMoney(voucherValue)}.</small>}
          </div>
          {state.checkoutQueue.length > 1 && <span className="queue-badge">+{state.checkoutQueue.length - 1} wartet</span>}
        </div>
        <div className="checkout-counter">
          <div className="basket-scanner">
            <div className="basket-scanner__title">
              <b>Artikel scannen</b>
              <span>{scanned.filter(Boolean).length} / {entry.items.length}</span>
            </div>
            <div className="basket-items">
              {entry.items.map((productId, index) => (
                <button
                  className={`basket-item${scanned[index] ? ' basket-item--done' : ''}${scanningIndex === index ? ' basket-item--scanning' : ''}`}
                  key={`${entry.id}-${index}`}
                  onClick={() => scan(index)}
                  disabled={scanningIndex !== null || voucherScanning || scanned[index] || payment !== null}
                  aria-label={`${PRODUCT_BY_ID[productId].name} ${scanned[index] ? 'gescannt' : 'scannen'}`}
                >
                  <ProductIcon productId={productId} />
                  <span>{PRODUCT_BY_ID[productId].name}</span>
                  {scanned[index] && <i>✓</i>}
                </button>
              ))}
            </div>
            {voucherValue > 0 && (
              <button
                className={`deposit-voucher${voucherScanned ? ' deposit-voucher--done' : ''}${voucherScanning ? ' deposit-voucher--scanning' : ''}`}
                onClick={scanVoucher}
                disabled={!allScanned || voucherScanned || voucherScanning || scanningIndex !== null || payment !== null}
              >
                <span>🎟️</span>
                <span><small>PFANDBON · {entry.depositBottles} × 0,25 €</small><b>{formatMoney(voucherValue)} Rabatt</b></span>
                <i>{voucherScanned ? '✓ EINGELÖST' : allScanned ? 'JETZT SCANNEN' : 'NACH DEN ARTIKELN'}</i>
              </button>
            )}
            <p className="scanner-status">
              {scanningIndex !== null
                ? 'Piep! Artikel wird erfasst …'
                : voucherScanning
                  ? 'Piep! Pfandbon wird eingelesen …'
                  : checkoutReady
                    ? '✓ Artikel und Pfandbon vollständig erfasst'
                    : allScanned && voucherValue > 0
                      ? 'Scanne jetzt den Pfandbon des Kunden.'
                      : 'Tippe die Artikel nacheinander an.'}
            </p>
          </div>
          <div className="receipt">
            {receiptLines.map(({ product, amount }) => (
              <span className="receipt-line" key={product.id}>
                <span>{amount}× {product.name}</span>
                <b>{formatMoney(product.sellPrice * amount)}</b>
              </span>
            ))}
            {voucherValue > 0 && (
              <>
                <span className="receipt-line receipt-line--subtotal"><span>Zwischensumme</span><b>{formatMoney(subtotal)}</b></span>
                <span className={`receipt-line receipt-line--deposit${voucherScanned ? ' receipt-line--active' : ''}`}>
                  <span>Pfandbon</span><b>− {voucherScanned ? formatMoney(voucherValue) : 'noch scannen'}</b>
                </span>
              </>
            )}
            <strong><span>Gesamt</span><b>{formatMoney(voucherScanned || voucherValue === 0 ? total : subtotal)}</b></strong>
          </div>
        </div>

        {checkoutReady && payment === null && (
          <div className="payment-choice">
            <b>Wie bezahlt der Kunde?</b>
            <div>
              <button className="payment-choice__cash" onClick={() => setPayment('cash')}>💶 Bar bezahlen</button>
              <button className="payment-choice__card" onClick={startCardPayment}>💳 Kreditkarte</button>
            </div>
          </div>
        )}

        {payment === 'cash' && (
          <form className="cash-payment" onSubmit={submitCash}>
            <div className="cash-bill" aria-label={`Kunde gibt ${formatMoney(cashBill)}`}>
              <small>DER KUNDE GIBT</small><strong>{cashBill / 100} €</strong>
            </div>
            <label>
              Wechselgeld eingeben
              <span className="money-input"><input autoFocus inputMode="decimal" value={changeInput} onChange={(event) => {
                setChangeInput(event.target.value)
                setChangeError('')
              }} placeholder="0,00" aria-label="Wechselgeld in Euro" /><b>€</b></span>
            </label>
            <button className="pay-button" type="submit">Wechselgeld geben</button>
            {changeError && <p className="cash-error" role="alert">{changeError}</p>}
          </form>
        )}

        {payment === 'card' && (
          <div className={`card-payment${state.reducedMotion ? ' card-payment--reduced' : ''}`}>
            <div className="card-video" role="img" aria-label="Kunde hält seine Kreditkarte an das Kartenlesegerät">
              <div className="card-terminal"><span>●</span><i>)))</i><b>KARTE</b></div>
              <div className="card-tap"><span>💳</span><i>🤚</i></div>
            </div>
            <b>Karte wird an den Sensor gehalten …</b>
            <small>Bitte kurz warten</small>
          </div>
        )}
      </section>
    </div>
  )
}

function GameScreen({ notify }: { notify: (result: ActionResult) => void }) {
  const state = useGameState()
  return (
    <main className="game-screen">
      <Suspense fallback={<div className="game-loading">Laden wird geöffnet …</div>}>
        <GameCanvas />
      </Suspense>
      <TopHud />
      <GoalCard />
      <HelperStatus />
      <BottomToolbar />
      <HelperAutomation notify={notify} />
      <PickupAutomation notify={notify} />
      <SelfCheckoutAutomation notify={notify} />
      <SelfCheckoutAlerts notify={notify} />
      {gameStore.canClaimEmergency() && (
        <button className="emergency-float" onClick={() => notify(gameStore.claimEmergency())}>🎁 Notfallpaket</button>
      )}
      {state.modal === 'order' && <OrderModal notify={notify} />}
      {state.modal === 'restock' && <RestockModal notify={notify} />}
      {state.modal === 'upgrades' && <UpgradeModal notify={notify} />}
      {state.modal === 'rooms' && <RoomsModal notify={notify} />}
      {state.modal === 'pickup' && <PickupModal notify={notify} />}
      {state.modal === 'helpers' && <HelpersModal notify={notify} />}
      {state.modal === 'help' && <HelpModal />}
      <CheckoutModal notify={notify} />
    </main>
  )
}

function RotateOverlay() {
  return (
    <div className="rotate-overlay" role="alert">
      <div className="rotate-phone">📱</div>
      <h2>Bitte drehe dein Gerät</h2>
      <p>Der Supermarkt braucht im Querformat etwas mehr Platz.</p>
      <span>↻</span>
    </div>
  )
}

export default function App() {
  const state = useGameState()
  const [toast, setToast] = useState<ToastState>(null)
  const notify = useMemo(() => (result: ActionResult) => {
    const next = { id: Date.now(), ...result }
    setToast(next)
    window.setTimeout(() => setToast((current) => current?.id === next.id ? null : current), 2600)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (gameStore.getSnapshot().hasSave) gameStore.save()
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <>
      {state.screen === 'menu' ? <MenuScreen /> : <GameScreen notify={notify} />}
      {state.modal === 'settings' && <SettingsModal />}
      <Toast toast={toast} />
      <RotateOverlay />
    </>
  )
}

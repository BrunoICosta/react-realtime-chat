type EventMap<T> = { [K in keyof T]: (...args: never[]) => void }

/** Minimal typed event emitter; listeners are isolated so one failing does not stop the rest. */
export class Emitter<Events extends EventMap<Events>> {
  private readonly listeners = new Map<keyof Events, Set<Events[keyof Events]>>()

  on<E extends keyof Events>(event: E, listener: Events[E]): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(listener)
    return () => {
      set.delete(listener)
    }
  }

  emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of [...set]) {
      try {
        ;(listener as (...params: Parameters<Events[E]>) => void)(...args)
      } catch (error) {
        console.error(`[emitter] listener for "${String(event)}" failed`, error)
      }
    }
  }

  clear() {
    this.listeners.clear()
  }
}

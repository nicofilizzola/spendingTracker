type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeTransactionsChanged(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitTransactionsChanged() {
  listeners.forEach((listener) => listener());
}

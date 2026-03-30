type AppEvent =
  | "auth"
  | "overview"
  | "books"
  | "favorites"
  | "loans"
  | "reservations"
  | "notifications"
  | "fines"
  | "feedback"
  | "appointments"
  | "seatReservations"
  | "recommendations"
  | "profile"
  | "reviews";

type Listener = (event: AppEvent) => void;

const listeners = new Set<Listener>();

export function emitAppEvent(event: AppEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeAppEvent(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export type { AppEvent };

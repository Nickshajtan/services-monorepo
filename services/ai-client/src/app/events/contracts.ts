import { EventHandler, Middleware } from '@app/events/types';

export interface EventBusInterface<E extends Record<string, any>> {
  on<K extends keyof E>(event: K, handler: EventHandler<E[K]>): () => void;
  emit<K extends keyof E>(event: K, payload: E[K]): Promise<void>;

  use<K extends keyof E>(event: K, mw: Middleware<E[K]>): () => void;
  run<K extends keyof E>(event: K, initial: E[K]): Promise<E[K]>;
}

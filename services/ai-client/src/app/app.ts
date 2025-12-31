import { createAppDecorators } from '@app/composition';
import { EventBus } from '@app/events/EventBus';
import { eventsPlugin, eventBusAdapter } from '@app/events/decorators';
import { EventBusInterface } from '@app/events/contracts';
import { WildcardKeyResolver } from '@app/wildcards/WildcardKeyResolver';
import { MemoryCache } from '@app/cache/MemoryCache';

type AppEvents = {
  'registries.initialize': {
    mode: 'sequential';
  };
}

const eventWildcards = new WildcardKeyResolver(new MemoryCache(), '.', 4);
const eventBus: EventBusInterface<AppEvents> = new EventBus<AppEvents>( eventWildcards );
const AppDecorators = createAppDecorators({
  plugins: [ eventsPlugin<AppEvents>('events') ],
  adapters: [ eventBusAdapter<AppEvents>( eventBus, 'events') ],
});
const appConfig = {
  bus: eventBus,
  decorators: {
    Events: AppDecorators.decorators.events,
    register: AppDecorators.register,
  },
} as const;

export { appConfig };

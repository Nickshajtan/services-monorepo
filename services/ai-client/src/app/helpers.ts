import { Capabilities, Capability } from '@app/types';

export const isCapability = (value: string): value is Capability => {
  return Object.values(Capabilities).includes(value as Capability);
}

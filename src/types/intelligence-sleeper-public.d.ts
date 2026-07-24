import type { CardID } from './ids';

declare module './intelligence' {
  interface PublicSleeperNetworkState {
    cards?: CardID[];
  }
}

export {};

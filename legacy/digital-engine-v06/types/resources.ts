export type FactionResourceKey =
  | 'command'
  | 'influence'
  | 'capital'
  | 'intel'
  | 'operation_progress'
  | 'conviction';

export interface FactionResourceState {
  key: FactionResourceKey;
  label: string;
  value: number;
  minimum: number;
  maximum?: number;
  limitKind: 'static' | 'dynamic' | 'none';
}

export type FactionResourceMap = Partial<Record<FactionResourceKey, FactionResourceState>>;

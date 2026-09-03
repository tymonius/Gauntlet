export type GamePhase =
  | 'setup'
  | 'turn_start'
  | 'action_before_movement'
  | 'movement'
  | 'battle'
  | 'action_after_movement'
  | 'cleanup'
  | 'game_over';

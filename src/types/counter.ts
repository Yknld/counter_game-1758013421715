export interface GameState {
  targetNumber: number;
  attempts: number;
  gameStatus: 'playing' | 'won' | 'new';
  minRange: number;
  maxRange: number;
  lastGuess?: number;
  feedback?: 'higher' | 'lower' | 'correct' | null;
}

export interface GameSettings {
  hapticEnabled: boolean;
  minRange: number;
  maxRange: number;
}

export interface GameStats {
  gamesPlayed: number;
  bestScore: number | null;
  lastPlayedDate: string | null;
}
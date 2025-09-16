import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, GameSettings, GameStats } from '../types/counter';

const KEYS = {
  GAME_STATE: 'gameState',
  GAME_SETTINGS: 'gameSettings',
  GAME_STATS: 'gameStats',
};

export const defaultGameState: GameState = {
  targetNumber: 0,
  attempts: 0,
  gameStatus: 'new',
  minRange: 1,
  maxRange: 100,
  lastGuess: undefined,
  feedback: null,
};

export const defaultGameSettings: GameSettings = {
  hapticEnabled: true,
  minRange: 1,
  maxRange: 100,
};

export const defaultGameStats: GameStats = {
  gamesPlayed: 0,
  bestScore: null,
  lastPlayedDate: null,
};

export const generateRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const saveGameState = async (state: GameState): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.GAME_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

export const loadGameState = async (): Promise<GameState> => {
  try {
    const stateStr = await AsyncStorage.getItem(KEYS.GAME_STATE);
    return stateStr ? JSON.parse(stateStr) : defaultGameState;
  } catch (error) {
    console.error('Error loading game state:', error);
    return defaultGameState;
  }
};

export const saveGameSettings = async (settings: GameSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.GAME_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving game settings:', error);
  }
};

export const loadGameSettings = async (): Promise<GameSettings> => {
  try {
    const settingsStr = await AsyncStorage.getItem(KEYS.GAME_SETTINGS);
    return settingsStr ? JSON.parse(settingsStr) : defaultGameSettings;
  } catch (error) {
    console.error('Error loading game settings:', error);
    return defaultGameSettings;
  }
};

export const saveGameStats = async (stats: GameStats): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.GAME_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving game stats:', error);
  }
};

export const loadGameStats = async (): Promise<GameStats> => {
  try {
    const statsStr = await AsyncStorage.getItem(KEYS.GAME_STATS);
    return statsStr ? JSON.parse(statsStr) : defaultGameStats;
  } catch (error) {
    console.error('Error loading game stats:', error);
    return defaultGameStats;
  }
};

export const updateGameStats = async (attempts: number): Promise<void> => {
  try {
    const currentStats = await loadGameStats();
    const newStats: GameStats = {
      gamesPlayed: currentStats.gamesPlayed + 1,
      bestScore: currentStats.bestScore === null ? attempts : Math.min(currentStats.bestScore, attempts),
      lastPlayedDate: new Date().toISOString(),
    };
    await saveGameStats(newStats);
  } catch (error) {
    console.error('Error updating game stats:', error);
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (error) {
    console.error('Error clearing all data:', error);
  }
};
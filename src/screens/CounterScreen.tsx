import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { 
  loadGameState, 
  saveGameState, 
  loadGameSettings,
  loadGameStats,
  generateRandomNumber,
  updateGameStats,
} from '../utils/storage';
import { GameState, GameSettings, GameStats } from '../types/counter';

const { width, height } = Dimensions.get('window');

interface GuessNumberScreenProps {
  navigation: any;
}

const GuessNumberScreen: React.FC<GuessNumberScreenProps> = ({ navigation }) => {
  const [gameState, setGameState] = useState<GameState>({
    targetNumber: 0,
    attempts: 0,
    gameStatus: 'new',
    minRange: 1,
    maxRange: 100,
    lastGuess: undefined,
    feedback: null,
  });
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGuess, setCurrentGuess] = useState('');
  const [inputError, setInputError] = useState('');
  const [showWinModal, setShowWinModal] = useState(false);

  // Animation values
  const scaleValue = useRef(new Animated.Value(1)).current;
  const feedbackScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const winModalScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [state, settingsData, statsData] = await Promise.all([
        loadGameState(),
        loadGameSettings(),
        loadGameStats()
      ]);
      
      // If it's a new game or no target number set, generate a new one
      if (state.gameStatus === 'new' || state.targetNumber === 0) {
        const newTargetNumber = generateRandomNumber(settingsData.minRange, settingsData.maxRange);
        const newState = {
          ...state,
          targetNumber: newTargetNumber,
          gameStatus: 'playing' as const,
          attempts: 0,
          feedback: null,
          lastGuess: undefined,
        };
        setGameState(newState);
        await saveGameState(newState);
      } else {
        setGameState(state);
      }
      
      setSettings(settingsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (newState: GameState) => {
    try {
      await saveGameState(newState);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const animateFeedback = () => {
    Animated.sequence([
      Animated.timing(feedbackScale, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateButton = (animValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateWinModal = () => {
    Animated.spring(winModalScale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const validateInput = (input: string): boolean => {
    setInputError('');
    
    if (!input || input.trim() === '') {
      setInputError('Please enter a number');
      return false;
    }
    
    const numericValue = parseInt(input);
    
    if (isNaN(numericValue)) {
      setInputError('Please enter a valid number');
      return false;
    }
    
    if (numericValue < (settings?.minRange || 1) || numericValue > (settings?.maxRange || 100)) {
      setInputError(`Please enter a number between ${settings?.minRange || 1} and ${settings?.maxRange || 100}`);
      return false;
    }
    
    return true;
  };

  const makeGuess = async () => {
    if (!validateInput(currentGuess)) return;
    
    const guess = parseInt(currentGuess);
    const newAttempts = gameState.attempts + 1;
    let feedback: 'higher' | 'lower' | 'correct';
    let status: 'playing' | 'won' = 'playing';
    
    if (guess === gameState.targetNumber) {
      feedback = 'correct';
      status = 'won';
      await updateGameStats(newAttempts);
      setShowWinModal(true);
      animateWinModal();
    } else if (guess < gameState.targetNumber) {
      feedback = 'higher';
    } else {
      feedback = 'lower';
    }
    
    const newState: GameState = {
      ...gameState,
      attempts: newAttempts,
      lastGuess: guess,
      feedback,
      gameStatus: status,
    };
    
    setGameState(newState);
    await saveData(newState);
    setCurrentGuess('');
    animateFeedback();
    
    if (settings?.hapticEnabled) {
      if (status === 'won') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const startNewGame = async () => {
    if (!settings) return;
    
    const newTargetNumber = generateRandomNumber(settings.minRange, settings.maxRange);
    const newState: GameState = {
      targetNumber: newTargetNumber,
      attempts: 0,
      gameStatus: 'playing',
      minRange: settings.minRange,
      maxRange: settings.maxRange,
      lastGuess: undefined,
      feedback: null,
    };
    
    setGameState(newState);
    await saveData(newState);
    setCurrentGuess('');
    setInputError('');
    setShowWinModal(false);
    winModalScale.setValue(0);
    
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const getFeedbackText = () => {
    if (!gameState.feedback) return 'Enter your guess!';
    if (gameState.feedback === 'higher') return '📈 Go Higher!';
    if (gameState.feedback === 'lower') return '📉 Go Lower!';
    return '🎉 Correct!';
  };

  const getFeedbackColor = () => {
    if (!gameState.feedback) return '#6B7280';
    if (gameState.feedback === 'higher') return '#EF4444';
    if (gameState.feedback === 'lower') return '#3B82F6';
    return '#10B981';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Guess the Number</Text>
            <Text style={styles.subtitle}>
              Between {gameState.minRange} and {gameState.maxRange}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.mainContent}>
        {/* Game Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Attempts</Text>
              <Text style={styles.statValue}>{gameState.attempts}</Text>
            </View>
            {stats && stats.bestScore && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Best Score</Text>
                <Text style={styles.statValue}>{stats.bestScore}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.feedbackSection}>
          <Animated.View 
            style={[
              styles.feedbackCard,
              { 
                transform: [{ scale: feedbackScale }],
                borderColor: getFeedbackColor(),
              }
            ]}
          >
            <Text style={[styles.feedbackText, { color: getFeedbackColor() }]}>
              {getFeedbackText()}
            </Text>
            {gameState.lastGuess && (
              <Text style={styles.lastGuessText}>
                Your last guess: {gameState.lastGuess}
              </Text>
            )}
          </Animated.View>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.guessInput, inputError ? styles.inputError : null]}
              value={currentGuess}
              onChangeText={(text) => {
                setCurrentGuess(text);
                if (inputError) setInputError('');
              }}
              placeholder={`Enter ${gameState.minRange}-${gameState.maxRange}`}
              keyboardType="numeric"
              maxLength={3}
              editable={gameState.gameStatus === 'playing'}
            />
            
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.guessButton, gameState.gameStatus !== 'playing' && styles.buttonDisabled]}
                onPress={() => {
                  makeGuess();
                  animateButton(buttonScale);
                }}
                disabled={gameState.gameStatus !== 'playing'}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gameState.gameStatus === 'playing' ? ['#10B981', '#059669'] : ['#9CA3AF', '#6B7280']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.guessButtonText}>Guess</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          {inputError ? (
            <Text style={styles.errorText}>{inputError}</Text>
          ) : null}
        </View>

        {/* New Game Button */}
        <View style={styles.newGameSection}>
          <TouchableOpacity
            style={styles.newGameButton}
            onPress={startNewGame}
            activeOpacity={0.8}
          >
            <View style={styles.newGameButtonContent}>
              <Ionicons name="refresh-outline" size={20} color="#6366F1" />
              <Text style={styles.newGameButtonText}>New Game</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Win Modal */}
      <Modal
        visible={showWinModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowWinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.winModal,
              { transform: [{ scale: winModalScale }] }
            ]}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.winModalGradient}
            >
              <Text style={styles.winEmoji}>🎉</Text>
              <Text style={styles.winTitle}>Congratulations!</Text>
              <Text style={styles.winMessage}>
                You guessed the number {gameState.targetNumber} in {gameState.attempts} attempts!
              </Text>
              
              <TouchableOpacity
                style={styles.playAgainButton}
                onPress={startNewGame}
                activeOpacity={0.8}
              >
                <Text style={styles.playAgainButtonText}>Play Again</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  feedbackSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  feedbackCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    minWidth: width * 0.85,
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  lastGuessText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  guessInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  guessButton: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  guessButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  newGameSection: {
    alignItems: 'center',
  },
  newGameButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#6366f1',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  newGameButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newGameButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winModal: {
    width: width * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  winModalGradient: {
    padding: 32,
    alignItems: 'center',
  },
  winEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  winTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  winMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  playAgainButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  playAgainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default GuessNumberScreen;
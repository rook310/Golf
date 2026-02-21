import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  onSnapshot,
  docData
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import {
  Game,
  GamePlayer,
  PlayerHoleScore,
  CreateGameData,
  AddPlayerData,
  UpdateScoreData,
  LeaderboardEntry,
  GameSummary,
  PlayerType
} from '../models/game/game-module';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly GAMES_COLLECTION = 'games';
  
  // Real-time observable for all games with caching
  private games$: Observable<Game[]> | null = null;
  
  // Cache for individual game observables
  private gameCache = new Map<string, Observable<Game | null>>();

  constructor(private firestore: Firestore) {
    console.log('[GameService] Service initialized');
  }

  //
  // Initialization Methods
  //

  // Initialize real-time listener for all games collection
  private initializeGamesListener(): void {
    console.log('[GameService] Initializing real-time games listener');
    
    this.games$ = new Observable<Game[]>(observer => {
      const gamesRef = collection(this.firestore, this.GAMES_COLLECTION);
      const q = query(gamesRef, orderBy('createdAt', 'desc'));
      
      console.log('[GameService] Setting up onSnapshot listener for games collection');
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log('[GameService] Games snapshot received, size:', snapshot.size);
          
          const games = snapshot.docs.map(doc => {
            const data = doc.data();
            return this.convertFirestoreToGame(doc.id, data);
          });
          
          console.log('[GameService] Emitting', games.length, 'games to all subscribers');
          observer.next(games);
        },
        (error) => {
          console.error('[GameService] Games snapshot error:', error);
          observer.error(error);
        }
      );
      
      return () => {
        console.log('[GameService] Unsubscribing from games listener');
        unsubscribe();
      };
    }).pipe(
      shareReplay(1) // Cache the last emitted value for ALL subscribers
    );
  }

  //
  // Game Retrieval Methods
  //

  // Get all games observable with lazy-initialized real-time listener
  getAllGames(): Observable<Game[]> {
    console.log('[GameService] getAllGames called');
    
    if (!this.games$) {
      console.log('[GameService] Games observable not initialized, initializing now');
      this.initializeGamesListener();
    } else {
      console.log('[GameService] Returning existing games observable (cached)');
    }
    
    return this.games$ as Observable<Game[]>;
  }

  // Get real-time observable for single game with caching
  getGame(gameId: string): Observable<Game | null> {
    console.log('[GameService] getGame called for:', gameId);

    // Return cached observable if exists
    if (this.gameCache.has(gameId)) {
      console.log('[GameService] Returning cached observable for game:', gameId);
      return this.gameCache.get(gameId)!;
    }

    console.log('[GameService] Creating new real-time observable for game:', gameId);
    const gameRef = doc(this.firestore, this.GAMES_COLLECTION, gameId);

    const game$ = new Observable<Game | null>(observer => {
      const unsubscribe = onSnapshot(
        gameRef,
        snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const game = this.convertFirestoreToGame(gameId, data);
            observer.next(game);
          } else {
            observer.next(null);
          }
        },
        error => {
          console.error('[GameService] onSnapshot error:', error);
          observer.error(error);
        }
      );
      return { unsubscribe };
    }).pipe(
      tap(game => {
        if (game) {
          console.log('[GameService] Game details:', {
            gameId: game.gameId,
            course: game.courseInfo.courseName,
            players: game.players.length,
            isActive: game.isActive
          });
        }
      }),
      shareReplay(1),
      catchError(error => {
        console.error('[GameService] Error in game observable:', error);
        return of(null);
      })
    );

    this.gameCache.set(gameId, game$);
    return game$;
  }

  // Get game by ID as Promise for one-time reads
  async getGameById(gameId: string): Promise<Game | null> {
    console.log('[GameService] getGameById called for:', gameId);
    
    try {
      const gameRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      const gameDoc = await getDoc(gameRef);
      
      if (gameDoc.exists()) {
        const data = gameDoc.data();
        console.log('[GameService] Game document retrieved:', gameId);
        
        const game = this.convertFirestoreToGame(gameId, data);
        console.log('[GameService] Game converted successfully');
        return game;
      } else {
        console.warn('[GameService] Game not found:', gameId);
        return null;
      }
    } catch (error) {
      console.error('[GameService] Error fetching game by ID:', error);
      throw error;
    }
  }

  // Get games for specific user with real-time filtering
  getUserGames(userId: string): Observable<GameSummary[]> {
    console.log('[GameService] getUserGames called for user:', userId);
    
    return this.getAllGames().pipe(
      map(games => {
        console.log('[GameService] Filtering', games.length, 'games for user:', userId);
        
        const userGames = games.filter(game => {
          const isCreator = game.createdBy === userId;
          const isPlayer = game.players.some(p => p.userId === userId);
          return isCreator || isPlayer;
        });
        
        console.log('[GameService] Found', userGames.length, 'games for user');
        
        return userGames.map(game => {
          const myPlayer = game.players.find(p => p.userId === userId);
          
          const summary: GameSummary = {
            gameId: game.gameId,
            courseName: game.courseInfo.courseName,
            clubName: game.courseInfo.clubName,
            startDate: game.startDate,
            numberOfPlayers: game.players.length,
            isActive: game.isActive,
            isCompleted: game.isCompleted,
            myPlayerName: myPlayer?.playerName,
            holes: game.numberOfHoles,
            playerCount: this.playerCount(game.players),
            createdAt: game.createdAt
          };
          
          console.log('[GameService] Game summary:', summary);
          return summary;
        });
      })
    );
  }

  playerCount(players: GamePlayer[]): number {
    return players.length;
  }

  //
  // Game Creation Methods
  //

  // Create new game with host player initialization
  async createGame(userId: string, userName: string, gameData: CreateGameData): Promise<string> {
    console.log('[GameService] Creating new game for user:', userId);
    console.log('[GameService] Game data:', gameData);
    
    try {
      const gameId = this.generateGameId();
      console.log('[GameService] Generated game ID:', gameId);
      
      // Initialize hole scores for the host player
      const holeScores = this.initializeHoleScores(
        gameData.courseInfo.holes,
        gameData.numberOfHoles,
        gameData.startingHole
      );
      
      console.log('[GameService] Initialized', holeScores.length, 'hole scores');
      
      // Create host player
      const hostPlayer: GamePlayer = {
        gamePlayerId: this.generatePlayerId(),
        userId: userId,
        playerName: gameData.hostPlayerName,
        playerType: PlayerType.HOST,
        teeId: gameData.hostTeeId,
        teeName: gameData.hostTeeName,
        holeScores: holeScores,
        totalScore: 0,
        totalPar: holeScores.reduce((sum, hole) => sum + hole.par, 0),
        currentHole: gameData.startingHole
      };
      
      console.log('[GameService] Host player created:', hostPlayer.playerName);
      
      // Create the game document
      const game: Game = {
        gameId: gameId,
        createdBy: userId,
        createdByName: userName,
        createdAt: new Date(),
        startDate: gameData.startDate,
        courseInfo: gameData.courseInfo,
        numberOfHoles: gameData.numberOfHoles,
        startingHole: gameData.startingHole,
        players: [hostPlayer],
        invitations: [],
        isActive: true,
        isCompleted: false
      };
      
      console.log('[GameService] Saving game to Firestore...');
      
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      
      await setDoc(gameDocRef, {
        ...game,
        createdAt: serverTimestamp(),
        startDate: Timestamp.fromDate(gameData.startDate)
      });
      
      console.log('[GameService] Game created successfully in Firestore with ID:', gameId);
      
      // Real-time listener will automatically update, no need to clear cache
      
      return gameId;
    } catch (error) {
      console.error('[GameService] Error creating game:', error);
      throw error;
    }
  }

  //
  // Player Management Methods
  //

  // Add player to existing game with score initialization
  async addPlayer(playerData: AddPlayerData): Promise<void> {
    console.log('[GameService] Adding player to game:', playerData.gameId);
    console.log('[GameService] Player name:', playerData.playerName);
    
    

    try {
      const game = await this.getGameById(playerData.gameId);

      if (!game) {
        console.error('[GameService] Game not found:', playerData.gameId);
        throw new Error('Game not found');
      }
      
      if (game.players.length >= 4) {
          console.error('[GameService] too many players:', game.players.length);
          throw new Error('Too many players');
      }        
      
      console.log('[GameService] Current players:', game.players.length);
      
      // Initialize hole scores for the new player
      const holeScores = this.initializeHoleScores(
        game.courseInfo.holes,
        game.numberOfHoles,
        game.startingHole
      );
      
      // Create the base player object with required fields only
      const newPlayer: any = {
        gamePlayerId: this.generatePlayerId(),
        playerName: playerData.playerName,
        playerType: playerData.isGuest ? PlayerType.GUEST : PlayerType.PLAYER,
        teeId: playerData.teeId,
        teeName: playerData.teeName,
        holeScores: holeScores,
        totalScore: 0,
        totalPar: holeScores.reduce((sum, hole) => sum + hole.par, 0),
        currentHole: game.startingHole
      };

      // Conditionally add the appropriate ID field
      if (!playerData.isGuest && playerData.userId) {
        newPlayer.userId = playerData.userId;
      } else if (playerData.isGuest) {
        newPlayer.guestId = this.generateGuestId();
      }
      
      console.log('[GameService] New player created:', newPlayer.playerName);
      
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${playerData.gameId}`);
      
      await updateDoc(gameDocRef, {
        players: arrayUnion(newPlayer),
        updatedAt: serverTimestamp()
      });
      
      console.log('[GameService] Player added successfully');
      
      // Real-time listener will update automatically
      
    } catch (error) {
      console.error('[GameService] Error adding player:', error);
      throw error;
    }
  }



  //
  // Score Management Methods
  //

  // Update player's score for specific hole with recalculation
  async updateScore(scoreData: UpdateScoreData): Promise<void> {
    console.log('[GameService] Updating score');
    console.log('[GameService] Game:', scoreData.gameId);
    console.log('[GameService] Player:', scoreData.gamePlayerId);
    console.log('[GameService] Hole:', scoreData.holeNumber, 'Strokes:', scoreData.strokes);
    
    try {
      const game = await this.getGameById(scoreData.gameId);
      
      if (!game) {
        console.error('[GameService] Game not found:', scoreData.gameId);
        throw new Error('Game not found');
      }
      
      // Find the player
      const playerIndex = game.players.findIndex(p => p.gamePlayerId === scoreData.gamePlayerId);
      
      if (playerIndex === -1) {
        console.error('[GameService] Player not found:', scoreData.gamePlayerId);
        throw new Error('Player not found');
      }
      
      const player = game.players[playerIndex];
      console.log('[GameService] Player found:', player.playerName);
      
      // Find the hole
      const holeIndex = player.holeScores.findIndex(h => h.holeNumber === scoreData.holeNumber);
      
      if (holeIndex === -1) {
        console.error('[GameService] Hole not found:', scoreData.holeNumber);
        throw new Error('Hole not found');
      }
      
      // Update the hole score
      player.holeScores[holeIndex].strokes = scoreData.strokes;
      player.holeScores[holeIndex].completed = true;
      
      console.log('[GameService] Hole score updated');
      
      // Recalculate total score
      player.totalScore = player.holeScores
        .filter(h => h.completed && h.strokes != null) // Handles both null and undefined
        .reduce((sum, hole) => sum + (hole.strokes || 0), 0);
      
      console.log('[GameService] New total score:', player.totalScore);
      
      // Update current hole
      const completedHoles = player.holeScores.filter(h => h.completed).length;
      if (completedHoles < game.numberOfHoles) {
        const nextIncompleteHole = player.holeScores.find(h => !h.completed);
        if (nextIncompleteHole) {
          player.currentHole = nextIncompleteHole.holeNumber;
          console.log('[GameService] Current hole updated to:', player.currentHole);
        }
      }
      
      // Update the game in Firestore
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${scoreData.gameId}`);
      
      await updateDoc(gameDocRef, {
        players: game.players,
        updatedAt: serverTimestamp()
      });
      
      console.log('[GameService] Score updated in Firestore');
      
      // Real-time listener will update all subscribers automatically
      
    } catch (error) {
      console.error('[GameService] Error updating score:', error);
      throw error;
    }
  }

  //
  // Leaderboard Methods
  //

  // Generate leaderboard with sorting by score
  async getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
    console.log('[GameService] Generating leaderboard for game:', gameId);
    
    try {
      const game = await this.getGameById(gameId);
      
      if (!game) {
        console.error('[GameService] Game not found:', gameId);
        return [];
      }
      
      console.log('[GameService] Processing', game.players.length, 'players');
      
      const leaderboard: LeaderboardEntry[] = game.players.map(player => {
        const completedHoles = player.holeScores.filter(h => h.completed).length;
        const totalScore = player.totalScore || 0;
        const totalPar = player.totalPar || 0;
        const scoreToPar = totalScore - totalPar;
        
        return {
          gamePlayerId: player.gamePlayerId,
          playerName: player.playerName,
          totalScore: totalScore,
          totalPar: totalPar,
          scoreToPar: scoreToPar,
          holesCompleted: completedHoles,
          currentHole: player.currentHole
        };
      });
      
      // Sort by score (lowest first)
      leaderboard.sort((a, b) => {
        if (a.totalScore === b.totalScore) {
          return b.holesCompleted - a.holesCompleted;
        }
        return a.totalScore - b.totalScore;
      });
      
      console.log('[GameService] Leaderboard generated with', leaderboard.length, 'entries');
      return leaderboard;
    } catch (error) {
      console.error('[GameService] Error generating leaderboard:', error);
      throw error;
    }
  }

  //
  // Game State Management Methods
  //

  // Mark game as completed with timestamp
  async completeGame(gameId: string): Promise<void> {
    console.log('[GameService] Completing game:', gameId);
    
    try {
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      
      await updateDoc(gameDocRef, {
        isActive: false,
        isCompleted: true,
        completedAt: serverTimestamp(),
        endDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('[GameService] Game completed');
      
      // Real-time listener will update automatically
      
    } catch (error) {
      console.error('[GameService] Error completing game:', error);
      throw error;
    }
  }

  // Update game data with partial updates
  async updateGame(gameId: string, gameData: Partial<Game>): Promise<void> {
    console.log('[GameService] Updating game:', gameId);
    
    try {
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      await updateDoc(gameDocRef, {
        ...gameData,
        updatedAt: serverTimestamp()
      });
      
      console.log('[GameService] Game updated');
      
      // Real-time listener will update automatically
      
    } catch (error) {
      console.error('[GameService] Error updating game:', error);
      throw error;
    }
  }

  // Delete game from Firestore and clear cache
  async deleteGame(gameId: string): Promise<void> {
    console.log('[GameService] Deleting game:', gameId);
    
    try {
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      await deleteDoc(gameDocRef);
      
      console.log('[GameService] Game deleted');
      
      // Clear cache for this game
      this.gameCache.delete(gameId);
      
    } catch (error) {
      console.error('[GameService] Error deleting game:', error);
      throw error;
    }
  }

  //
  // Helper Methods
  //

  // Initialize hole scores array for new player
  private initializeHoleScores(
    courseHoles: any[],
    numberOfHoles: number,
    startingHole: number
  ): PlayerHoleScore[] {
    console.log('[GameService] Initializing hole scores');
    console.log('[GameService] Holes:', numberOfHoles, 'Starting:', startingHole);
    const holeScores: PlayerHoleScore[] = [];

    for (let i = 0; i < numberOfHoles; i++) {
      const holeNumber = ((startingHole - 1 + i) % 18) + 1;
      const courseHole = courseHoles[holeNumber - 1];
      
      if (courseHole) {
        holeScores.push({
          holeNumber: holeNumber,
          strokes: 0, 
          par: courseHole.par,
          handicap: courseHole.handicap ?? null,
          yardage: courseHole.yardage,
          completed: false
        });
      }
    }

    console.log('[GameService] Initialized', holeScores.length, 'hole scores');
    return holeScores;
  }

  // Convert Firestore document to Game object
  private convertFirestoreToGame(gameId: string, data: any): Game {
    return {
      gameId: gameId,
      createdBy: data['createdBy'],
      createdByName: data['createdByName'],
      createdAt: data['createdAt']?.toDate() || new Date(),
      startDate: data['startDate']?.toDate() || new Date(),
      endDate: data['endDate']?.toDate(),
      courseInfo: data['courseInfo'],
      numberOfHoles: data['numberOfHoles'],
      startingHole: data['startingHole'],
      players: data['players'] || [],
      invitations: data['invitations'] || [],
      isActive: data['isActive'] ?? true,
      isCompleted: data['isCompleted'] ?? false,
      completedAt: data['completedAt']?.toDate(),
      updatedAt: data['updatedAt']?.toDate()
    };
  }

  // Generate unique game ID
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique player ID
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique guest ID
  private generateGuestId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getGameIdFromGame(game: Game): string | null {
    return game?.gameId || null;
  }
}
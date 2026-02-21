import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval, Subscription, combineLatest, filter, take } from 'rxjs';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { Game, GamePlayer, PlayerHoleScore, UpdateScoreData } from '../../models/game/game-module';
import { User } from '../../models/user-model/user-module';
import { ChangeDetectorRef } from '@angular/core';
import { AddPlayer } from '../../invite/add-player/add-player';


@Component({
  selector: 'app-score-card',
  standalone: false,
  templateUrl: './score-card.html',
  styleUrl: './score-card.scss',
})
export class ScoreCard {
  gameId!: string;
  userId!: string;
  game: Game | null = null;
  currentUser: User | null = null;
  currentPlayer: GamePlayer | null = null;

  selectedHoleNumber = 1;
  isLoading = false;
  errorMessage = '';

  // UI state
  showMainScorecard = false;        // false = course info screen, true = main scorecard

  // Dialog flags
  showCourseInfoDialog = false;
  showScoreDialog = false;
  showAddPlayerDialog = false;
  selectedPlayerForScore: GamePlayer | null = null;

  private destroy$ = new Subject<void>();
  private autoRefreshInterval = 10000;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
    console.log('[ScorecardComponent] Component constructed');
  }

  //
  // Lifecycle Methods
  //

  /**
   * Angular lifecycle hook. Initializes component by fetching route parameters
   * and the current user, then loads the game. Also sets up an auto-refresh interval.
   */
  ngOnInit(): void {
    console.log('[ScorecardComponent] ngOnInit called');

    // Combine route parameters and current user, ensuring user exists
    combineLatest([
      this.route.params.pipe(take(1)),
      this.authService.currentUser$.pipe(
        filter((user): user is User => !!user),
        take(1)
      )
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, user]) => {
        this.gameId = params['gameId'];
        this.userId = user.uid;
        this.currentUser = user;
        console.log('[ScorecardComponent] Game ID:', this.gameId, 'User ID:', this.userId);
        this.loadGame();
      });

    // Set up periodic auto-refresh of game data
    // interval(this.autoRefreshInterval)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(() => {
    //     console.log('[ScorecardComponent] Auto-refreshing game data');
    //     this.loadGame(true);
    //   });
  }

  /**
   * Angular lifecycle hook. Cleans up subscriptions.
   */
  ngOnDestroy(): void {
    console.log('[ScorecardComponent] Component destroyed, cleaning up');
    this.destroy$.next();
    this.destroy$.complete();
  }

  //
  // Data Loading
  //

  /**
   * Loads the game data from the service. If silent is true, does not set loading flag.
   * Updates game, currentPlayer, and selectedHoleNumber based on loaded data.
   */
  async loadGame(silent: boolean = false): Promise<void> {
    console.log('[ScorecardComponent] Loading game:', this.gameId, '(silent:', silent, ')');
    if (!silent) this.isLoading = true;

    try {
      this.gameService.getGame(this.gameId).subscribe({
        next: (data) => {
          if (data) {
            this.game = data;
            console.log('[ScorecardComponent] Game loaded successfully:', this.game.gameId);
            if (this.userId) {
              this.currentPlayer = this.game.players.find(p => p.userId === this.userId) || null;
            }
            if (this.currentPlayer) {
              console.log('[ScorecardComponent] Current player found:', this.currentPlayer.playerName);
              this.selectedHoleNumber = this.currentPlayer.currentHole;
            } else {
              console.warn('[ScorecardComponent] Current player not found in game players list');
            }
            this.isLoading = false;
            this.cdr.detectChanges();
            console.log('[ScorecardComponent] Change detector detached, game data:', this.game);
          } else {
            console.error('[ScorecardComponent] Game not found (null data):', this.gameId);
            this.errorMessage = 'Game not found';
            this.isLoading = false;
            this.cdr.detectChanges();
            console.log('[ScorecardComponent] Change detector detached, error state');
          }
        },
        error: (error) => {
          console.error('[ScorecardComponent] Error in getGame subscription:', error);
          this.errorMessage = 'Failed to load game';
          this.isLoading = false;
          this.cdr.detectChanges();
          console.log('[ScorecardComponent] Change detector detached after error');
        }
      });
    } catch (error) {
      console.error('[ScorecardComponent] Exception in loadGame:', error);
      this.errorMessage = 'Failed to load game';
      this.isLoading = false;
      this.cdr.detectChanges();
      console.log('[ScorecardComponent] Change detector detached after exception');
    }
  }

  //
  // Dialog Management
  //

  /**
   * Opens the score entry dialog for a specific player.
   */
  openScoreDialog(player: GamePlayer): void {
    console.log('[ScorecardComponent] Opening score dialog for player:', player.playerName);
    this.selectedPlayerForScore = player;
    this.showScoreDialog = true;
  }

  /**
   * Closes the score entry dialog and clears selected player.
   */
  closeScoreDialog(): void {
    console.log('[ScorecardComponent] Closing score dialog');
    this.showScoreDialog = false;
    this.selectedPlayerForScore = null;
    this.puttsMap.clear();
  }

  /**
   * Updates the selected hole in the score dialog after navigation.
   * This ensures the displayed hole matches the selectedHoleNumber.
   */
  updateSelectedHoleForDialog(): void {
    if (this.selectedPlayerForScore) {
      const hole = this.selectedPlayerForScore.holeScores.find(
        h => h.holeNumber === this.selectedHoleNumber
      );
      if (hole) {
        console.log('[ScorecardComponent] Updated selected hole in dialog to:', this.selectedHoleNumber);
      } else {
        console.warn('[ScorecardComponent] Selected hole not found for player');
      }
    }
  }

  /**
   * Closes the add player dialog.
   */
  closeAddPlayerDialog(): void {
    console.log('[ScorecardComponent] Closing add player dialog');
    this.showAddPlayerDialog = false;
  }

  /**
   * Opens the add player dialog.
   */
  openAddPlayerDialog(): void {
    console.log('[ScorecardComponent] Opening add player dialog');
    this.showAddPlayerDialog = true;
  }

  /**
   * Placeholder: navigates to invite player page (currently goes home).
   */
  openInvitePlayerDialog(): void {
    console.log('[ScorecardComponent] Navigate to Invite Player (placeholder → home)');
    this.showAddPlayerDialog = false;
    this.router.navigate(['/home']);
  }


  // For local putts storage (not saved to backend)
  private puttsMap = new Map<string, number>();

  get currentPutts(): number {
    if (!this.selectedPlayerForScore) return 0;
    const key = `${this.selectedPlayerForScore.gamePlayerId}-${this.selectedHoleNumber}`;
    return this.puttsMap.get(key) || 0;
  }

  set currentPutts(value: number) {
    if (!this.selectedPlayerForScore) return;
    const key = `${this.selectedPlayerForScore.gamePlayerId}-${this.selectedHoleNumber}`;
    this.puttsMap.set(key, value);
  }

  incrementPutts(): void {
    this.currentPutts = this.currentPutts + 1;
  }

  decrementPutts(): void {
    if (this.currentPutts > 0) {
      this.currentPutts = this.currentPutts - 1;
    }
  }

  // New method for AddScore button
  openScoreDialogForCurrentPlayer(): void {
    if (!this.currentPlayer) {
      this.errorMessage = 'You are not a player in this game';
      return;
    }
    this.selectedPlayerForScore = this.currentPlayer;
    this.selectedHoleNumber = this.currentPlayer.currentHole;
    this.showScoreDialog = true;
  }
  /**
   * Placeholder: navigates to add guest page (currently goes home).
   */
  openAddGuestDialog(): void {
    console.log('[ScorecardComponent] Navigate to Add Guest (placeholder → home)');
    this.showAddPlayerDialog = false;
    this.router.navigate(['/home']);
  }

  /**
   * Opens the course information dialog.
   */
  openCourseInfoDialog(): void {
    console.log('[ScorecardComponent] Opening course info dialog');
    this.showCourseInfoDialog = true;
  }

  /**
   * Closes all dialogs (currently only course info).
   */
  closeAllDialogs(): void {
    console.log('[ScorecardComponent] Closing all dialogs');
    this.showCourseInfoDialog = false;
  }

  /**
   * Switches from course info screen to the main scorecard view.
   */
  startRound(): void {
    console.log('[ScorecardComponent] Switching to main scorecard view');
    this.showMainScorecard = true;
  }

  //
  // Statistics Calculations
  //

  /**
   * Counts holes where player scored par or better.
   */
  calculateParOrBetter(player: GamePlayer): number {
    return player.holeScores.filter(h => 
      h.completed && h.strokes !== undefined && h.strokes <= h.par
    ).length;
  }

  /**
   * Counts holes where player scored bogey or worse.
   */
  calculateBogeyOrWorse(player: GamePlayer): number {
    return player.holeScores.filter(h => 
      h.completed && h.strokes !== undefined && h.strokes > h.par
    ).length;
  }

  /**
   * Counts eagles (two under par).
   */
  calculateEagles(player: GamePlayer): number {
    return player.holeScores.filter(h => 
      h.completed && h.strokes !== undefined && h.strokes === h.par - 2
    ).length;
  }

  /**
   * Counts birdies (one under par).
   */
  calculateBirdies(player: GamePlayer): number {
    return player.holeScores.filter(h => 
      h.completed && h.strokes !== undefined && h.strokes === h.par - 1
    ).length;
  }

  /**
   * Counts bogeys (one over par).
   */
  calculateBogeys(player: GamePlayer): number {
    return player.holeScores.filter(h => 
      h.completed && h.strokes !== undefined && h.strokes === h.par + 1
    ).length;
  }

  /**
   * Returns the holes that are actually being played in this game,
   * based on startingHole and numberOfHoles.
   */
  get playedHoles() {
    if (!this.game) return [];
    const start = this.game.startingHole - 1;          // zero‑based index
    const count = this.game.numberOfHoles;
    return this.game.courseInfo.holes.slice(start, start + count);
  }

  /**
   * Total par for the holes being played.
   */
  get playedTotalPar() {
    return this.playedHoles.reduce((sum, hole) => sum + hole.par, 0);
  }

  /**
   * Total yardage for the holes being played.
   */
  get playedTotalYardage() {
    return this.playedHoles.reduce((sum, hole) => sum + hole.yardage, 0);
  }

  /**
   * Counts double bogeys or worse (two or more over par).
   */
  calculateDoubleBogeys(player: GamePlayer): number {
    return player.holeScores.filter(h => 
      h.completed && h.strokes !== undefined && h.strokes >= h.par + 2
    ).length;
  }

  /**
   * Placeholder for fairways hit statistic (not yet implemented).
   */
  calculateFairwaysHit(player: GamePlayer): number {
    // This would need actual fairway data which isn't in the current model
    console.warn('[ScorecardComponent] calculateFairwaysHit called but not implemented');
    return 0;
  }

  //
  // Hole Navigation
  //

  /**
   * Sets the selected hole number.
   */
  selectHole(holeNumber: number): void {
    console.log('[ScorecardComponent] Hole selected:', holeNumber);
    this.selectedHoleNumber = holeNumber;
  }

  /**
   * Moves to the previous hole in the sequence (if available).
   */
  previousHole(): void {
    if (!this.game || !this.currentPlayer) {
      console.warn('[ScorecardComponent] Cannot go to previous hole: game or currentPlayer missing');
      return;
    }
    
    const currentIndex = this.currentPlayer.holeScores.findIndex(
      h => h.holeNumber === this.selectedHoleNumber
    );
    
    if (currentIndex > 0) {
      const previousHole = this.currentPlayer.holeScores[currentIndex - 1];
      console.log('[ScorecardComponent] Moving to previous hole:', previousHole.holeNumber);
      this.selectedHoleNumber = previousHole.holeNumber;
    } else {
      console.log('[ScorecardComponent] Already at first hole, cannot go previous');
    }
  }

  /**
   * Moves to the next hole in the sequence (if available).
   */
  nextHole(): void {
    if (!this.game || !this.currentPlayer) {
      console.warn('[ScorecardComponent] Cannot go to next hole: game or currentPlayer missing');
      return;
    }
    
    const currentIndex = this.currentPlayer.holeScores.findIndex(
      h => h.holeNumber === this.selectedHoleNumber
    );
    
    if (currentIndex < this.currentPlayer.holeScores.length - 1) {
      const nextHole = this.currentPlayer.holeScores[currentIndex + 1];
      console.log('[ScorecardComponent] Moving to next hole:', nextHole.holeNumber);
      this.selectedHoleNumber = nextHole.holeNumber;
    } else {
      console.log('[ScorecardComponent] Already at last hole, cannot go next');
    }
  }

  //
  // Score Management
  //

  /**
   * Generic method to update a player's score for a specific hole.
   * Calls the game service and reloads data on success.
   */
  async updateScoreForPlayer(gamePlayerId: string, holeNumber: number, strokes: number): Promise<void> {
    console.log('[ScorecardComponent] updateScoreForPlayer called', { gamePlayerId, holeNumber, strokes });
    
    const updateData: UpdateScoreData = {
      gameId: this.gameId,
      gamePlayerId: gamePlayerId,
      holeNumber: holeNumber,
      strokes: strokes
    };
    
    try {
      await this.gameService.updateScore(updateData);
      console.log('[ScorecardComponent] Score updated successfully via service');
      
      // Reload game to get updated data
      await this.loadGame(true);

      // If the score dialog is still open, refresh the selected player reference
      if (this.showScoreDialog && this.selectedPlayerForScore) {
        // Find the updated player in the fresh game data
        const updatedPlayer = this.game?.players.find(p => p.gamePlayerId === gamePlayerId);
        if (updatedPlayer) {
          this.selectedPlayerForScore = updatedPlayer;
        }
      }
      
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('[ScorecardComponent] Error updating score:', error);
      this.errorMessage = 'Failed to update score';
    }
  }

  /**
   * Increments the score for a specific player and hole by 1.
   */
  async incrementScoreForPlayer(gamePlayerId: string, holeNumber: number): Promise<void> {
    const player = this.game?.players.find(p => p.gamePlayerId === gamePlayerId);
    if (!player) {
      console.warn('[ScorecardComponent] incrementScoreForPlayer: player not found');
      return;
    }
    
    const hole = player.holeScores.find(h => h.holeNumber === holeNumber);
    if (!hole) {
      console.warn('[ScorecardComponent] incrementScoreForPlayer: hole not found');
      return;
    }
    
    const currentStrokes = hole.strokes || 0;
    const newStrokes = currentStrokes + 1;
    
    console.log('[ScorecardComponent] Incrementing score for player', gamePlayerId, 'hole', holeNumber, 'from', currentStrokes, 'to', newStrokes);
    await this.updateScoreForPlayer(gamePlayerId, holeNumber, newStrokes);
  }

  /**
   * Decrements the score for a specific player and hole by 1 (minimum 0).
   */
  async decrementScoreForPlayer(gamePlayerId: string, holeNumber: number): Promise<void> {
    const player = this.game?.players.find(p => p.gamePlayerId === gamePlayerId);
    if (!player) {
      console.warn('[ScorecardComponent] decrementScoreForPlayer: player not found');
      return;
    }
    
    const hole = player.holeScores.find(h => h.holeNumber === holeNumber);
    if (!hole) {
      console.warn('[ScorecardComponent] decrementScoreForPlayer: hole not found');
      return;
    }
    
    const currentStrokes = hole.strokes || 0;
    if (currentStrokes <= 0) {
      console.log('[ScorecardComponent] Cannot decrement below 0');
      return;
    }
    
    const newStrokes = currentStrokes - 1;
    
    console.log('[ScorecardComponent] Decrementing score for player', gamePlayerId, 'hole', holeNumber, 'from', currentStrokes, 'to', newStrokes);
    await this.updateScoreForPlayer(gamePlayerId, holeNumber, newStrokes);
  }

  /**
   * Sets an exact score for a specific player and hole.
   */
  async setScoreForPlayer(gamePlayerId: string, holeNumber: number, strokes: number): Promise<void> {
    console.log('[ScorecardComponent] setScoreForPlayer called', { gamePlayerId, holeNumber, strokes });
    await this.updateScoreForPlayer(gamePlayerId, holeNumber, strokes);
  }

  /**
   * Updates the score for the current player and the selected hole.
   */
  async updateScore(holeNumber: number, strokes: number): Promise<void> {
    console.log('[ScorecardComponent] updateScore called', { holeNumber, strokes });
    
    if (!this.currentPlayer) {
      console.error('[ScorecardComponent] No current player to update score');
      return;
    }
    
    await this.updateScoreForPlayer(this.currentPlayer.gamePlayerId, holeNumber, strokes);
  }

  /**
   * Increments the score for the current player on the selected hole by 1.
   */
  incrementScore(): void {
    const hole = this.selectedHole;
    if (!hole) {
      console.warn('[ScorecardComponent] No hole selected for increment');
      return;
    }
    
    const currentStrokes = hole.strokes || 0;
    const newStrokes = currentStrokes + 1;
    
    console.log('[ScorecardComponent] Incrementing score on selected hole from', currentStrokes, 'to', newStrokes);
    this.updateScore(this.selectedHoleNumber, newStrokes);
  }

  /**
   * Decrements the score for the current player on the selected hole by 1 (minimum 0).
   */
  decrementScore(): void {
    const hole = this.selectedHole;
    if (!hole) {
      console.warn('[ScorecardComponent] No hole selected for decrement');
      return;
    }
    
    const currentStrokes = hole.strokes || 0;
    if (currentStrokes <= 0) {
      console.log('[ScorecardComponent] Cannot decrement below 0');
      return;
    }
    
    const newStrokes = currentStrokes - 1;
    
    console.log('[ScorecardComponent] Decrementing score on selected hole from', currentStrokes, 'to', newStrokes);
    this.updateScore(this.selectedHoleNumber, newStrokes);
  }

  //
  // Navigation & Game Actions
  //

  /**
   * Navigates to the leaderboard for this game.
   */
  viewLeaderboard(): void {
    console.log('[ScorecardComponent] Navigating to leaderboard for game:', this.gameId);
    this.router.navigate(['/leaderBoard/', this.gameId]);
  }

  /**
   * Navigates back to the home page.
   */
  goHome(): void {
    console.log('[ScorecardComponent] Navigating to home');
    this.router.navigate(['/home']);
  }

  /**
   * Placeholder for adding a player (not yet implemented).
   */
  addPlayer(): void {
    console.log('[ScorecardComponent] addPlayer called - functionality not yet implemented');
  }

  /**
   * Marks the game as completed and navigates to the leaderboard.
   */
  async completeGame(): Promise<void> {
    console.log('[ScorecardComponent] Completing game:', this.gameId);
    
    try {
      await this.gameService.completeGame(this.gameId);
      console.log('[ScorecardComponent] Game completed successfully');
      
      // Navigate to leaderboard
      this.router.navigate(['/leaderboard', this.gameId]);
      
    } catch (error) {
      console.error('[ScorecardComponent] Error completing game:', error);
      this.errorMessage = 'Failed to complete game';
    }
  }

  //
  // Helper Getters & Calculations
  //

  

  /**
   * Gets the currently selected hole score data for the active player (or selected player in dialog).
   */
  get selectedHole(): PlayerHoleScore | undefined {
    // If we have a selected player for score dialog, use that
    if (this.selectedPlayerForScore) {
      return this.selectedPlayerForScore.holeScores.find(
        h => h.holeNumber === this.selectedHoleNumber
      );
    }
    
    // Otherwise use current player
    if (!this.currentPlayer) {
      return undefined;
    }
    
    return this.currentPlayer.holeScores.find(h => h.holeNumber === this.selectedHoleNumber);
  }

  /**
   * Calculates the score to par for a given player.
   */
  getScoreToPar(player: GamePlayer): number {
    const totalScore = player.totalScore || 0;
    const totalPar = player.totalPar || 0;
    return totalScore - totalPar;
  }

  /**
   * Formats a score-to-par value for display (E for even, + for over).
   */
  formatScoreToPar(scoreToPar: number): string {
    if (scoreToPar === 0) return 'E';
    if (scoreToPar > 0) return `+${scoreToPar}`;
    return `${scoreToPar}`;
  }

  /**
   * Indicates whether the current player has completed all holes and can finish the game.
   */
  get canCompleteGame(): boolean {
    if (!this.currentPlayer) return false;
    
    const allHolesCompleted = this.currentPlayer.holeScores.every(h => h.completed);
    console.log('[ScorecardComponent] canCompleteGame check:', allHolesCompleted);
    return allHolesCompleted;
  }

  /**
   * Returns the total par for all holes in the course.
   */
  getTotalPar(): number {
    if (!this.game) return 0;
    let total = 0;
    for (const hole of this.game.courseInfo.holes) {
      total += hole.par;
    }
    return total;
  }

  /**
   * Returns the total yardage for all holes in the course.
   */
  getTotalYardage(): number {
    if (!this.game) return 0;
    let total = 0;
    for (const hole of this.game.courseInfo.holes) {
      total += hole.yardage;
    }
    return total;
  }

  /**
   * Returns the number of holes completed by the current player.
   */
  get completedHolesCount(): number {
    if (!this.currentPlayer) {
      return 0;
    }
    return this.currentPlayer.holeScores.filter(h => h.completed).length;
  }
}
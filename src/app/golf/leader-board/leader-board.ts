import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { GameService } from '../../services/game.service';
import { Game, LeaderboardEntry } from '../../models/game/game-module';

@Component({
  selector: 'app-leaderboard',
  standalone: false,
  templateUrl: './leader-board.html',
  styleUrls: ['./leader-board.scss']
})
export class Leaderboard{
  gameId!: string;
  game: Game | null = null;
  leaderboard: LeaderboardEntry[] = [];
  isLoading = false;
  errorMessage = '';
  
  private destroy$ = new Subject<void>();
  private autoRefreshInterval = 5000; // Refresh every 5 seconds

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService
  ) {
    console.log('[LeaderboardComponent] Component initialized');
  }

  //
  // Lifecycle Methods
  //

  // Initialize component with route parameters and auto-refresh setup
  ngOnInit(): void {
    console.log('[LeaderboardComponent] ngOnInit called');
    
    // Get game ID from route parameters
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.gameId = params['gameId'];
        console.log('[LeaderboardComponent] Game ID from route:', this.gameId);
        
        if (this.gameId) {
          this.loadLeaderboard();
        }
      });
    
    // Setup auto-refresh
    interval(this.autoRefreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('[LeaderboardComponent] Auto-refreshing leaderboard');
        this.loadLeaderboard(true);
      });
  }

  // Cleanup subscriptions when component is destroyed
  ngOnDestroy(): void {
    console.log('[LeaderboardComponent] Component destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }

  //
  // Data Loading Methods
  //

  // Load leaderboard data with auto-refresh option
  private async loadLeaderboard(silent: boolean = false): Promise<void> {
    console.log('[LeaderboardComponent] Loading leaderboard for game:', this.gameId);
    
    if (!silent) {
      this.isLoading = true;
    }
    
    try {
      // Load game data
      this.gameService.getGame(this.gameId).subscribe(data => {
        if (data)//check if data exisits
        {
          this.game = data; // get data
        }
      });
      
      if (!this.game) {
        console.error('[LeaderboardComponent] Game not found:', this.gameId);
        this.errorMessage = 'Game not found';
        this.isLoading = false;
        return;
      }
      
      console.log('[LeaderboardComponent] Game loaded:', this.game.gameId);
      console.log('[LeaderboardComponent] Course:', this.game.courseInfo.courseName);
      
      // Load leaderboard
      this.leaderboard = await this.gameService.getLeaderboard(this.gameId);
      
      console.log('[LeaderboardComponent] Leaderboard loaded with', this.leaderboard.length, 'entries');
      
      this.leaderboard.forEach((entry, index) => {
        console.log(`[LeaderboardComponent] ${index + 1}. ${entry.playerName}: ${entry.totalScore} (${this.formatScoreToPar(entry.scoreToPar)})`);
      });
      
      this.isLoading = false;
      
    } catch (error) {
      console.error('[LeaderboardComponent] Error loading leaderboard:', error);
      this.errorMessage = 'Failed to load leaderboard';
      this.isLoading = false;
    }
  }

  // Manual refresh trigger for leaderboard data
  async refresh(): Promise<void> {
    console.log('[LeaderboardComponent] Manual refresh triggered');
    await this.loadLeaderboard();
  }

  private async loadLeaderboardData(): Promise<void> {
    if (!this.game) return;
    
    try {
      // Load leaderboard
      this.leaderboard = await this.gameService.getLeaderboard(this.gameId);
      
      console.log('[LeaderboardComponent] Leaderboard loaded with', this.leaderboard.length, 'entries');
      
      this.leaderboard.forEach((entry, index) => {
        console.log(`[LeaderboardComponent] ${index + 1}. ${entry.playerName}: ${entry.totalScore} (${this.formatScoreToPar(entry.scoreToPar)})`);
      });
      
      this.isLoading = false;
      
    } catch (error) {
      console.error('[LeaderboardComponent] Error loading leaderboard data:', error);
      this.errorMessage = 'Failed to load leaderboard data';
      this.isLoading = false;
    }
  }

  //
  // Navigation Methods
  //

  // Navigate back to scorecard for current game
  backToScorecard(): void {
    console.log('[LeaderboardComponent] Navigating back to scorecard');
    this.router.navigate(['/scorecard', this.gameId]);
  }

  // Navigate to home page
  goHome(): void {
    console.log('[LeaderboardComponent] Navigating to home');
    this.router.navigate(['/home']);
  }

  //
  // Helper Methods (Calculations & Formatting)
  //

  

  // Format score to par for display with E for even
  formatScoreToPar(scoreToPar: number): string {
    if (scoreToPar === 0) return 'E';
    if (scoreToPar > 0) return `+${scoreToPar}`;
    return `${scoreToPar}`;
  }

  // Get position suffix for ranking display (st, nd, rd, th)
  getPositionSuffix(position: number): string {
    const lastDigit = position % 10;
    const lastTwoDigits = position % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }
    
    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // Get formatted position string with suffix
  getFormattedPosition(index: number): string {
    const position = index + 1;
    return `${position}${this.getPositionSuffix(position)}`;
  }

  // Calculate completion percentage based on holes completed
  getCompletionPercentage(entry: LeaderboardEntry): number {
    if (!this.game) return 0;
    
    const percentage = (entry.holesCompleted / this.game.numberOfHoles) * 100;
    console.log(`[LeaderboardComponent] Completion for ${entry.playerName}: ${percentage.toFixed(0)}%`);
    return percentage;
  }

  //
  // Getters (Computed Properties)
  //

  // Get leader's name from first position in leaderboard
  get leaderName(): string {
    if (this.leaderboard.length === 0) return '';
    return this.leaderboard[0].playerName;
  }

  // Get leader's total score from first position
  get leaderScore(): number {
    if (this.leaderboard.length === 0) return 0;
    return this.leaderboard[0].totalScore;
  }

  // Get leader's score to par from first position
  get leaderScoreToPar(): number {
    if (this.leaderboard.length === 0) return 0;
    return this.leaderboard[0].scoreToPar;
  }

  // Check if game is marked as completed
  get isGameCompleted(): boolean {
    return this.game?.isCompleted || false;
  }
}
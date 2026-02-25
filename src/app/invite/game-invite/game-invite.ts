import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GameService } from '../../services/game.service';
import { GameInviteService } from '../../services/game-invite.service';
import { CourseAPIService } from '../../services/course-api.service';
import { AuthService } from '../../services/auth.service';
import { Game, AddPlayerData, GameInvitation } from '../../models/game/game-module';
import { User } from '../../models/user-model/user-module';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { ChangeDetectorRef } from '@angular/core';
import { GolfCourse } from '../../models/golf-course/golf-course-module';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-game-invitation',
  standalone: false,
  templateUrl: './game-invite.html',
  styleUrls: ['./game-invite.scss']
})
export class GameInvite implements OnInit, OnDestroy {
  // Core properties
  userId: string = '';
  gameId: string = '';
  game: Game | null = null;
  currentUser: User | null = null;
  pendingInvitations: GameInvitation[] = [];
  selectedInvitation: GameInvitation | null = null;
  isListMode = false;

  // Cache for multiple games (for invitation list)
  gamesCache: Map<string, Game> = new Map();

  selectedCourse: GolfCourse | null = null;
  

  // Form
  addPlayerForm!: FormGroup;
  availableTees: string[] = [];
  selectedTee = '';

  // UI state
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private gameService: GameService,
    private gameInvitationService: GameInviteService,
    private golfCourseApiService: CourseAPIService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private dialogRef: BrnDialogRef<GameInvite>
  ) {
    console.log('[GameInvitationComponent] Component constructed');
  }

  ngOnInit(): void {
    console.log('[GameInvitationComponent] ngOnInit started');

    this.addPlayerForm = this.formBuilder.group({
      playerName: ['', [Validators.required, Validators.minLength(2)]],
      teeName: ['', Validators.required]
    });

    this.addPlayerForm.get('playerName')?.disable();

    // Subscribe to current user for form default AND as fallback userId
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        console.log('[GameInvitationComponent] Current user loaded:', user?.uid);
        if (user?.displayName) {
          this.addPlayerForm.patchValue({ playerName: user.displayName });
          console.log('[GameInvitationComponent] Pre-filled player name with:', user.displayName);
        }

        // If we don't have a userId from route yet, use the current user
        if (!this.userId && user?.uid) {
          console.log('[GameInvitationComponent] Using current user as userId:', user.uid);
          this.userId = user.uid;
          this.determineModeAndLoad();
        }
      });

    // Handle route parameters for direct navigation
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        console.log('[GameInvitationComponent] Route params:', params);
        if (params['userId']) {
          this.userId = params['userId'];
        }
        if (params['gameId']) {
          this.gameId = params['gameId'];
        }
        // If we already have userId (from route or currentUser), load
        if (this.userId) {
          this.determineModeAndLoad();
        }
      });
  }

  ngOnDestroy(): void {
    console.log('[GameInvitationComponent] ngOnDestroy called, cleaning up');
    this.destroy$.next();
    this.destroy$.complete();
  }

  private determineModeAndLoad(): void {
    if (this.userId && !this.gameId) {
      // List mode
      console.log('[GameInvitationComponent] Entering list mode for userId:', this.userId);
      this.isListMode = true;
      this.loadPendingInvitations();
    } else if (this.gameId) {
      // Single invitation mode
      console.log('[GameInvitationComponent] Entering single invitation mode for gameId:', this.gameId);
      this.isListMode = false;
      this.loadPendingInvitations().then(() => {
        const inv = this.pendingInvitations.find(i => i.gameId === this.gameId);
        if (inv) {
          console.log('[GameInvitationComponent] Found matching invitation:', inv.invitationId);
          this.selectedInvitation = inv;
          this.loadGame();
        } else {
          console.warn('[GameInvitationComponent] No matching invitation found for gameId:', this.gameId);
          this.errorMessage = 'Invitation not found or already responded.';
        }
      });
    }
  }

  private async loadPendingInvitations(): Promise<void> {
    if (!this.userId) {
      console.warn('[GameInvitationComponent] loadPendingInvitations: no userId, aborting');
      return;
    }

    console.log('[GameInvitationComponent] Loading pending invitations for user:', this.userId);
    
    this.isLoading = true;
    try {
      this.pendingInvitations = await this.gameInvitationService.getPendingInvitations(this.userId);
      console.log('[GameInvitationComponent] Pending invitations loaded, count:', this.pendingInvitations.length);
      
      // Load all games for the invitations into cache
      const gameLoadPromises = this.pendingInvitations.map(async (invitation) => {
        const gameId = invitation.gameId;
        
        // Load game data
        return new Promise<void>((resolve) => {
          this.gameService.getGame(gameId).subscribe({
            next: (game) => {
              if (game) {
                console.log('[GameInvitationComponent] Loaded game into cache:', gameId);
                this.gamesCache.set(gameId, game);
              }
              resolve();
            },
            error: (error) => {
              console.error('[GameInvitationComponent] Error loading game:', gameId, error);
              resolve(); // Don't fail the whole operation
            }
          });
        });
      });
      
      // Wait for all games to load
      await Promise.all(gameLoadPromises);
      console.log('[GameInvitationComponent] All games loaded, cache size:', this.gamesCache.size);
      
    } catch (error) {
      console.error('[GameInvitationComponent] Error loading invitations:', error);
      this.errorMessage = 'Failed to load invitations.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
      console.log('[GameInvitationComponent] isLoading set to false, pending invitations:', this.pendingInvitations.length);
    }
  }

  selectInvitation(invitation: GameInvitation): void {
    console.log('[GameInvitationComponent] selectInvitation called with invitation:', invitation.invitationId);
    this.selectedInvitation = invitation;
    this.gameId = invitation.gameId;
    this.isListMode = false;
    this.loadGame();
  }

  private async loadGame(): Promise<void> {
    console.log('[GameInvitationComponent] Loading game with ID:', this.gameId);
    this.isLoading = true;
    try {
      this.gameService.getGame(this.gameId).subscribe(data => {
        if (data) {
          console.log('[GameInvitationComponent] Game data received:', data);
          this.game = data;
          this.loadCourseTees();
        } else {
          console.warn('[GameInvitationComponent] Game not found for ID:', this.gameId);
          this.errorMessage = 'Game not found';
        }
        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('[GameInvitationComponent] isLoading set to false, pending invitations:', this.pendingInvitations.length);
      });
    } catch (error) {
      console.error('[GameInvitationComponent] Error loading game:', error);
      this.errorMessage = 'Failed to load game';
      this.isLoading = false;
      this.cdr.detectChanges();
        console.log('[GameInvitationComponent] isLoading set to false, pending invitations:', this.pendingInvitations.length);
    }
  }

  private async loadCourseTees(): Promise<void> {
    if (!this.game) {
      console.warn('[GameInvitationComponent] loadCourseTees: game is null, aborting');
      return;
    }
    try {
      const courseId = this.game.courseInfo.apiCourseId;
      console.log('[GameInvitationComponent] Loading course tees for course ID:', courseId);
      this.golfCourseApiService.getCourseById(courseId).subscribe(course => {
        if (course) {
          console.log('[GameInvitationComponent] Course data received:', course);
          this.selectedCourse = course;
          this.availableTees = this.golfCourseApiService.getTeeNames(course, true);
          console.log('[GameInvitationComponent] Available tees:', this.availableTees);
          if (this.availableTees.length > 0) {
            this.selectedTee = this.availableTees[0];
            this.addPlayerForm.patchValue({ teeName: this.selectedTee });
            console.log('[GameInvitationComponent] Default tee selected:', this.selectedTee);
          }
        } else {
          console.warn('[GameInvitationComponent] Course not found, using game default tee');
          // Use non-null assertion because we already checked this.game above
          if (this.game) {
            this.availableTees = [this.game.courseInfo.selectedTee];
            this.selectedTee = this.game.courseInfo.selectedTee;
            this.addPlayerForm.patchValue({ teeName: this.selectedTee });
          }
        }
        this.isLoading = false;
      });
    } catch (error) {
      console.error('[GameInvitationComponent] Error loading course tees:', error);
      this.isLoading = false;
    }
  }

  selectTee(teeName: string): void {
    console.log('[GameInvitationComponent] Tee selected:', teeName);
    this.selectedTee = teeName;
    this.addPlayerForm.patchValue({ teeName });
  }

  async acceptInvitation(invitation: GameInvitation): Promise<void> {
    console.log('[GameInvitationComponent] Accepting invitation:', invitation.invitationId);
    this.isLoading = true;

    // Check if game has space
    const hasSpace = await this.checkGameCapacity(invitation.gameId);
    if (!hasSpace) {
      return;
    }

    this.isLoading = true;

    try {
      await this.gameInvitationService.acceptInvitation(invitation.gameId, invitation.invitationId);
      console.log('[GameInvitationComponent] Invitation accepted successfully');
      this.selectInvitation(invitation);
    } catch (error) {
      console.error('[GameInvitationComponent] Error accepting invitation:', error);
      this.errorMessage = 'Failed to accept invitation.';
      this.isLoading = false;
      console.log('[GameInvitationComponent] isLoading set to false, pending invitations:', this.pendingInvitations.length);
    }
  }

  async declineInvitation(invitation: GameInvitation): Promise<void> {
    console.log('[GameInvitationComponent] Declining invitation:', invitation.invitationId);
    this.isLoading = true;
    try {
      await this.gameInvitationService.declineInvitation(invitation.gameId, invitation.invitationId);
      console.log('[GameInvitationComponent] Invitation declined, removing from list');
      this.pendingInvitations = this.pendingInvitations.filter(i => i.invitationId !== invitation.invitationId);
      if (this.pendingInvitations.length === 0) {
        console.log('[GameInvitationComponent] No more invitations, returning to list mode');
        this.isListMode = true;
      }
    } catch (error) {
      console.error('[GameInvitationComponent] Error declining invitation:', error);
      this.errorMessage = 'Failed to decline invitation.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
        console.log('[GameInvitationComponent] isLoading set to false, pending invitations:', this.pendingInvitations.length);
    }
  }

  async addPlayerToGame(): Promise<void> {
    if (this.addPlayerForm.invalid) {
      console.warn('[GameInvitationComponent] addPlayerToGame: form invalid, aborting');
      return;
    }
    if (!this.currentUser) {
      console.warn('[GameInvitationComponent] addPlayerToGame: no current user, aborting');
      return;
    }
    if (!this.selectedInvitation) {
      console.warn('[GameInvitationComponent] addPlayerToGame: no selected invitation, aborting');
      return;
    }
    if (!this.selectedTee) {
      console.warn('[GameInvitationComponent] addPlayerToGame: no tee selected, aborting');
      return;
    }

    console.log('[GameInvitationComponent] Adding player to game:', this.gameId);
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Use current user's display name directly (since the form control is disabled)
    const playerName = this.currentUser.displayName || 'Player';

    const addPlayerData: AddPlayerData = {
      gameId: this.gameId,
      playerName: playerName,
      teeId: this.selectedTee,
      teeName: this.selectedTee,
      userId: this.currentUser.uid,
      isGuest: false
    };
    console.log('[GameInvitationComponent] AddPlayerData prepared:', addPlayerData);

    this.anitDuplicateMethod(this.gameId, this.currentUser.uid)

    try {
      await this.gameService.addPlayer(addPlayerData);
      console.log('[GameInvitationComponent] Player added successfully');
      this.successMessage = 'You have joined the game!';
      setTimeout(() => {
        console.log('[GameInvitationComponent] Closing dialog and navigating to scorecard');
        this.dialogRef.close();
        this.viewGame(this.gameId);
      }, 1500);
    } catch (error) {
      console.error('[GameInvitationComponent] Error adding player:', error);
      this.errorMessage = 'Failed to join game.';
      this.isLoading = false;
    }
  }

  getCourseByGameId(gameId: string): string | null {
    // Check cache first
    const cachedGame = this.gamesCache.get(gameId);
    if (cachedGame) {
      return cachedGame.courseInfo.courseName;
    }
    
    // Fallback to this.game if it matches
    if (this.game && this.game.gameId === gameId) {
      return this.game.courseInfo.courseName;
    }
    
    return null;
  }

  getHolesByGameId(gameId: string): number | null {
    // Check cache first
    const cachedGame = this.gamesCache.get(gameId);
    if (cachedGame) {
      return cachedGame.numberOfHoles; // Use numberOfHoles, not holes.length
    }
    
    // Fallback to this.game if it matches
    if (this.game && this.game.gameId === gameId) {
      return this.game.numberOfHoles;
    }
    
    return null;
  }

  backToList(): void {
    console.log('[GameInvitationComponent] Returning to list view');
    this.selectedInvitation = null;
    this.game = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.isListMode = true;
    this.loadPendingInvitations();
  }

  closeDialog(): void {
    console.log('[GameInvitationComponent] Closing dialog');
    this.dialogRef.close();
  }

  get playerName() { return this.addPlayerForm.get('playerName'); }
  get teeName() { return this.addPlayerForm.get('teeName'); }
  
  viewGame(gameId: string): void {
    console.log('[HomeComponent] Navigating to scorecard for game:', gameId);
    this.router.navigate(['/scoreCard', gameId]);  
  }

  /**
   * Checks if a game has fewer than 4 players (i.e., has space for another player).
   * @param gameId The ID of the game to check.
   * @returns Promise<boolean> - true if game has space, false otherwise.
   */
  private async checkGameCapacity(gameId: string): Promise<boolean> {
    try {
      const game = await this.gameService.getGameById(gameId);
      if (!game) {
        this.errorMessage = 'Game not found.';
        return false;
      }
      const playerCount = game.players?.length || 0;
      if (playerCount >= 4) {
        this.errorMessage = 'This game is already full (max 4 players).';
        return false;
      }
      return true;
    } catch (error) {
      console.error('[GameInvitationComponent] Error checking game capacity:', error);
      this.errorMessage = 'Failed to check game availability.';
      return false;
    }
  }

  anitDuplicateMethod(gameId: string, userID: string): void {
    try {
      console.log('[GameInvitationComponent] anitDuplicateMethod called with gameId:', gameId, 'userID:', userID);
      this.gameService.getGame(this.gameId).subscribe(data => {
        if (data) {
          console.log('[GameInvitationComponent] Game data received:', data);
          this.game = data;

          if (this.game.players.some(p => p.userId === userID)) {
            console.log('[GameInvitationComponent] User is already a player in the game, navigating to scorecard');
            this.router.navigate(['/scoreCard', this.gameId]);
          }
          else{
             console.log('[GameInvitationComponent] no extra user');
          }

        } else {
          console.warn('[GameInvitationComponent] Game not found for ID:', this.gameId);
          this.errorMessage = 'Game not found';
        }
      });
    } catch (error) {
      console.error('[GameInvitationComponent] Error loading game:', error);
      this.errorMessage = 'Failed to load game';
      this.isLoading = false;
      this.cdr.detectChanges();
        console.log('[GameInvitationComponent] isLoading set to false, pending invitations:', this.pendingInvitations.length);
    }
  }
  
}
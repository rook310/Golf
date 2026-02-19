import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { GameInviteService } from '../../services/game-invite.service';
import { User } from '../../models/user-model/user-module';
import { GameInvite } from '../../invite/game-invite/game-invite';
import { GameSummary, GameInvitation } from '../../models/game/game-module';
import { HlmDialogService } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit, OnDestroy {
  currentUser: User | null = null;
  
  // Using Observables for real-time updates
  myGames$: Observable<GameSummary[]> | null = null;
  pendingInvitations: GameInvitation[] = [];
  
  isLoadingInvitations = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private gameService: GameService,
    private gameInvitationService: GameInviteService,
    private router: Router,
    private hlmDialogService: HlmDialogService 
  ) {
    console.log('[HomeComponent] Component initialized');
  }

  //
  // Lifecycle Methods
  //

  ngOnInit(): void {
    console.log('[HomeComponent] ngOnInit called');
    
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        console.log('[HomeComponent] Current user updated:', user?.uid);
        this.currentUser = user;
        
        if (user) {
          console.log('[HomeComponent] User display name:', user.displayName);
          console.log('[HomeComponent] User email:', user.email);
          this.loadUserData();
        }
      });
  }

  ngOnDestroy(): void {
    console.log('[HomeComponent] Component destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }

  //
  // Data Loading Methods
  //

  private loadUserData(): void {
    console.log('[HomeComponent] Loading user data');
    
    if (!this.currentUser) {
      console.warn('[HomeComponent] No current user, skipping data load');
      return;
    }
    
    this.loadUserGames();
    this.loadPendingInvitations();
  }

  private loadUserGames(): void {
    console.log('[HomeComponent] Setting up games observable');
    
    if (!this.currentUser) {
      console.warn('[HomeComponent] No current user for loading games');
      return;
    }
    
    this.myGames$ = this.gameService.getUserGames(this.currentUser.uid);
    
    console.log('[HomeComponent] Games observable assigned');
    
    this.myGames$
      .pipe(takeUntil(this.destroy$))
      .subscribe(games => {
        console.log('[HomeComponent] Games updated, count:', games.length);
        games.forEach(game => {
          console.log('[HomeComponent] Game:', game.gameId, '-', game.courseName);
        });
      });
  }

  private async loadPendingInvitations(): Promise<void> {
    console.log('[HomeComponent] Loading pending invitations');
    
    if (!this.currentUser) {
      console.warn('[HomeComponent] No current user for loading invitations');
      return;
    }
    
    this.isLoadingInvitations = true;
    
    try {
      this.pendingInvitations = await this.gameInvitationService.getPendingInvitations(this.currentUser.uid);
      console.log('[HomeComponent] Pending invitations loaded:', this.pendingInvitations.length);
      
      this.pendingInvitations.forEach(inv => {
        console.log('[HomeComponent] Invitation from:', inv.invitedByUserName, 'for game:', inv.gameId);
      });
      
    } catch (error) {
      console.error('[HomeComponent] Error loading pending invitations:', error);
    } finally {
      this.isLoadingInvitations = false;
    }
  }

  //
  // Navigation Methods – UPDATED TO MATCH NEW ROUTES
  //

  createNewGame(): void {
    console.log('[HomeComponent] Navigating to create game page');
    this.router.navigate(['/createGame']);
  }

  viewGame(gameId: string): void {
    console.log('[HomeComponent] Navigating to scorecard for game:', gameId);
    this.router.navigate(['/scoreCard', gameId]);  
  }

  goToUserProfile(userId: string): void {
    console.log(`[Component] Navigating to user profile: ${userId}`);
    this.router.navigate(['/userProfile', userId]);
  }

  //
  // Invitation Management Methods
  //

  async acceptInvitation(invitation: GameInvitation): Promise<void> {
    console.log('[HomeComponent] Accepting invitation:', invitation.invitationId);
    console.log('[HomeComponent] Game ID:', invitation.gameId);
    
    try {
      await this.gameInvitationService.acceptInvitation(invitation.gameId, invitation.invitationId);
      console.log('[HomeComponent] Invitation accepted successfully');
      
      // Reload invitations list
      await this.loadPendingInvitations();
      
      // Navigate to the invitation page using both IDs
      this.router.navigate(['/gameInvite', invitation.gameId, invitation.invitationId]); // ✅ UPDATED: two parameters
      
    } catch (error) {
      console.error('[HomeComponent] Error accepting invitation:', error);
    }
  }

  async declineInvitation(invitation: GameInvitation): Promise<void> {
    console.log('[HomeComponent] Declining invitation:', invitation.invitationId);
    console.log('[HomeComponent] Game ID:', invitation.gameId);
    
    try {
      await this.gameInvitationService.declineInvitation(invitation.gameId, invitation.invitationId);
      console.log('[HomeComponent] Invitation declined successfully');
      
      await this.loadPendingInvitations();
      
    } catch (error) {
      console.error('[HomeComponent] Error declining invitation:', error);
    }
  }

  //
  //open compeont
  //

  openInvitationsDialog(): void {
    if (!this.currentUser) return;
    this.hlmDialogService.open(GameInvite, {
      context: { userId: this.currentUser.uid }
    });
  }

  //
  // User Account Methods
  //

  async logout(): Promise<void> {
    console.log('[HomeComponent] Logging out user');
    
    try {
      await this.authService.logout();
      console.log('[HomeComponent] Logout successful, navigating to login');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('[HomeComponent] Error during logout:', error);
    }
  }

  //
  // Utility Methods
  //

  async refresh(): Promise<void> {
    console.log('[HomeComponent] Manual refresh triggered');
    await this.loadPendingInvitations();
    console.log('[HomeComponent] Refresh complete (games update automatically)');
  }
}
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError, of, from } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { GameInviteService } from '../../services/game-invite.service';
import { User } from '../../models/user-model/user-module';
import { AddPlayerData } from '../../models/game/game-module';

@Component({
  selector: 'app-add-player',
  standalone: false,
  templateUrl: './add-player.html',
  styleUrls: ['./add-player.scss']
})
export class AddPlayer implements OnInit, OnDestroy {
  @Input() gameId!: string;
  @Input() currentUserId!: string;
  @Output() close = new EventEmitter<void>();

  // Mode: 'invite' or 'guest'
  mode: 'invite' | 'guest' = 'invite';

  // Invite mode
  searchTerm = '';
  searchResults: User[] = [];
  isSearching = false;
  selectedUser: User | null = null;

  // Guest mode
  guestForm: FormGroup;

  // UI state
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private gameService: GameService,
    private gameInviteService: GameInviteService
  ) {
    this.guestForm = this.fb.group({
      playerName: ['', [Validators.required, Validators.minLength(2)]],
      handicap: [null, [Validators.min(0), Validators.max(54)]]
    });
  }

  ngOnInit(): void {
    // Setup search with debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.searchResults = [];
          return of([]);
        }
        this.isSearching = true;
        return from(this.authService.searchUsers(term)).pipe(
          catchError(err => {
            console.error('Search error', err);
            this.errorMessage = 'Search failed.';
            return of([]);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      this.searchResults = results;
      this.isSearching = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(term: string): void {
    this.searchSubject.next(term);
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.errorMessage = '';
  }

  clearSelected(): void {
    this.selectedUser = null;
  }

  async sendInvite(): Promise<void> {
    if (!this.selectedUser) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Get current user's name and email from AuthService
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) throw new Error('Current user not found');

      await this.gameInviteService.sendInvitation(
        this.gameId,
        this.currentUserId,
        currentUser.displayName || 'Unknown',
        this.selectedUser.uid,
        this.selectedUser.email
      );

      this.successMessage = `Invitation sent to ${this.selectedUser.displayName || this.selectedUser.email}`;
      setTimeout(() => this.close.emit(), 1500);
    } catch (error) {
      console.error('Error sending invite', error);
      this.errorMessage = 'Failed to send invitation.';
    } finally {
      this.isLoading = false;
    }
  }

  async addGuest(): Promise<void> {
    if (this.guestForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.guestForm.value;

    // Guest data – handicap is collected but not used in AddPlayerData (model doesn't have it)
    const addPlayerData: AddPlayerData = {
      gameId: this.gameId,
      playerName: formValue.playerName,
      teeId: '',       // Will be set by service based on game default tee
      teeName: '',     // Same
      userId: undefined,
      isGuest: true
    };

    try {
      await this.gameService.addPlayer(addPlayerData);
      this.successMessage = `${formValue.playerName} added as guest.`;
      setTimeout(() => this.close.emit(), 1500);
    } catch (error) {
      console.error('Error adding guest', error);
      this.errorMessage = 'Failed to add guest.';
    } finally {
      this.isLoading = false;
    }
  }

  setMode(m: 'invite' | 'guest'): void {
    this.mode = m;
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedUser = null;
    this.searchResults = [];
    this.searchTerm = '';
  }
}
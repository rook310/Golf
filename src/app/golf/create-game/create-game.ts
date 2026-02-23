import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

// Services
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { CourseAPIService } from '../../services/course-api.service';
import { GameInviteService } from '../../services/game-invite.service';

// Models
import { User, PlayerEntry } from '../../models/user-model/user-module';
import { GolfCourse, Hole } from '../../models/golf-course/golf-course-module';
import { CreateGameData } from '../../models/game/game-module';

@Component({
  selector: 'app-create-game',
  standalone: false,
  templateUrl: './create-game.html',
  styleUrl: './create-game.scss',
})

export class CreateGame {
  
  //
  // Variables
  //

  // Form
  gameForm: FormGroup;
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Current User
  currentUser: User | null = null;
  
  // Course Search
  searchQuery: string = '';
  searchResults: GolfCourse[] = [];
  selectedCourse: GolfCourse | null = null;
  isSearching: boolean = false;

  genderTab: 'Male' | 'Female' = 'Male';   // default to Male
  Gender: boolean = true; // true male false female
  
  // Tee Selection
  availableTees: string[] = [];
  selectedTee: string = '';
  selectedHoles: Hole[] = [];
  
  // Game Settings
  numberOfHoles: number = 18;
  startingHole: number = 1;
  
  // Invited Players
  invitedPlayers: User[] = [];
  showInviteSection: boolean = false;
  maxPlayers: number = 4; // Host + 3 invites
  
  // User Search
  userSearchQuery: string = '';
  userSearchResults: User[] = [];
  isSearchingUsers: boolean = false;
  
  // Subscriptions
  private userSubscription?: Subscription;
  private searchSubscription?: Subscription;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private gameService: GameService,
    private golfApi: CourseAPIService,
    private gameInviteService: GameInviteService,
    private router: Router
  ) {
    console.log('[CreateGame] Component initialized');

    // Creating form
    this.gameForm = this.fb.group({
      courseName: ['', Validators.required],
      teeName: ['', Validators.required],
      numberOfHoles: [18, [Validators.required, Validators.min(9), Validators.max(18)]],
      startingHole: [1, [Validators.required, Validators.min(1), Validators.max(18)]],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      playerName: ['', Validators.required]
    });
    
    console.log('[CreateGame] Game form initialized');
  }

  //
  // Lifecycle
  //

  ngOnInit(): void {
    console.log('[CreateGame] ngOnInit called');
    this.Load();
  }

  ngOnDestroy(): void {
    console.log('[CreateGame] Component destroyed');
    
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  //
  // Load Data
  //

  Load(): void {
    console.log('[CreateGame] Loading data');
    
    // Subscribe to current user
    this.userSubscription = this.authService.currentUser$.subscribe({
      next: user => {
        console.log('[CreateGame] Current user:', user?.uid);
        this.currentUser = user;
        
        if (user && user.displayName) {
          console.log('[CreateGame] Setting player name:', user.displayName);
          this.gameForm.patchValue({
            playerName: user.displayName
          });
        }
      },
      error: err => console.error('[CreateGame] User subscription error:', err)
    });
    
    // Subscribe to course search results
    this.searchSubscription = this.golfApi.searchResults$.subscribe({
      next: courses => {
        console.log('[CreateGame] Search results:', courses.length);
        this.searchResults = courses;
        this.isSearching = false;
        
        if (courses.length === 0 && this.searchQuery.trim().length > 0) {
          this.errorMessage = 'No courses found. Try a different search term.';
        }
      },
      error: err => {
        console.error('[CreateGame] Search error:', err);
        this.isSearching = false;
        this.errorMessage = 'Failed to search courses. Please try again.';
      }
    });
  }

  //
  // Course Search
  //

  searchCourses(): void {
    console.log('[CreateGame] Search button clicked');
    console.log('[CreateGame] Search query:', this.searchQuery);
    
    const query = this.searchQuery.trim();
    
    if (!query || query.length === 0) {
      console.log('[CreateGame] Empty search query');
      this.errorMessage = 'Please enter a course name to search';
      return;
    }
    
    this.isSearching = true;
    this.errorMessage = '';
    this.selectedCourse = null;
    
    console.log('[CreateGame] Calling API search');
    this.golfApi.searchCourses(query);
  }

  //
  // Course Selection
  //

  selectCourse(course: GolfCourse): void {
    console.log('[CreateGame] Course selected:', course.course_name);
    console.log('[CreateGame] Club:', course.club_name);
    console.log('[CreateGame] ID:', course.id);
    console.log('[CreateGame] Gender:', this.Gender);
    
    this.selectedCourse = course;
    
    
    // Clear search results
    this.searchResults = [];
    this.golfApi.clearSearchResults();
    
    // Update form
    this.gameForm.patchValue({
      courseName: course.course_name
    });
    
    console.log('[CreateGame] Form updated');

    this.genderTab = this.Gender ? 'Male' : 'Female';
    
    // Get available tees
    this.availableTees = this.golfApi.getTeeNames(course, this.Gender);//true male: false female
    console.log('[CreateGame] Available tees:', this.availableTees);
    
    // Auto-select first tee
    if (this.availableTees.length > 0) {
      this.selectTee(this.availableTees[0]);
    } else {
      console.warn('[CreateGame] No tees available');
      this.errorMessage = 'No tee boxes available for this course';
    }
  }

  clearCourseSelection(): void {
    console.log('[CreateGame] Clearing course selection');
    this.selectedCourse = null;
    this.availableTees = [];
    this.selectedTee = '';
    this.selectedHoles = [];
    this.searchQuery = '';
    this.searchResults = [];
    this.gameForm.patchValue({
      courseName: '',
      teeName: ''
    });
  }

  //
  // Tee Selection
  //

  getStartingHoles(): number[] {
    return Array.from({ length: 18 }, (_, i) => i + 1);
  }

  onTabChange(tabId: string): void {
    this.toggleGender(tabId === 'Male');
  }

  toggleGender(isMale: boolean): void {
    this.Gender = isMale;
    console.log('[CreateGame] Gender toggled:', this.Gender);

    if (this.selectedCourse) {
      // Refresh available tees based on new gender
      this.availableTees = this.golfApi.getTeeNames(this.selectedCourse, this.Gender);
      console.log('[CreateGame] Available tees after gender change:', this.availableTees);

      // Auto-select first tee (or keep previous if still available)
      if (this.availableTees.length > 0) {
        const previousTee = this.selectedTee;
        if (previousTee && this.availableTees.includes(previousTee)) {
          // Keep the same tee – but you might want to re-select it to update holes?
          // Optionally call selectTee(previousTee) to reload holes for that tee
          this.selectTee(previousTee);
        } else {
          this.selectTee(this.availableTees[0]);
        }
      } else {
        this.selectedTee = '';
        this.selectedHoles = [];
        this.gameForm.patchValue({ teeName: '' });
      }
    }
  }

  selectTee(teeName: string): void {
    console.log('[CreateGame] Tee selected:', teeName);
    
    if (!this.selectedCourse) {
      console.error('[CreateGame] No course selected');
      return;
    }
    
    this.selectedTee = teeName;
    
    // Get holes for selected tee
    this.selectedHoles = this.golfApi.getHolesFromTeeBox(
      this.selectedCourse,
      teeName,
      true
    );
    
    console.log('[CreateGame] Holes loaded:', this.selectedHoles.length);
    
    // Update form
    this.gameForm.patchValue({
      teeName: teeName
    });
  }

  //
  // Game Settings
  //

  updateNumberOfHoles(holes: number): void {
    console.log('[CreateGame] Number of holes:', holes);
    this.numberOfHoles = holes;
    this.gameForm.patchValue({
      numberOfHoles: holes
    });
  }

  updateStartingHole(hole: number): void {
    console.log('[CreateGame] Starting hole:', hole);
    this.startingHole = hole;
    this.gameForm.patchValue({
      startingHole: hole
    });
  }

  //
  // Player Invitations
  //

  toggleInviteSection(): void {
    this.showInviteSection = !this.showInviteSection;
    console.log('[CreateGame] Invite section:', this.showInviteSection);
  }

  // Search users by display name
  async searchUsers(): Promise<void> {
    console.log('[CreateGame] Searching users:', this.userSearchQuery);
    
    const query = this.userSearchQuery.trim();
    
    if (!query || query.length === 0) {
      this.userSearchResults = [];
      return;
    }
    
    this.isSearchingUsers = true;
    
    try {
      // Use AuthService searchUsers method (searches both email and displayName)
      const users = await this.authService.searchUsers(query);
      console.log('[CreateGame] Found users:', users.length);
      this.userSearchResults = users;
      this.isSearchingUsers = false;
    } catch (error) {
      console.error('[CreateGame] User search error:', error);
      this.userSearchResults = [];
      this.isSearchingUsers = false;
    }
  }

  // Select user from search results
  selectUser(user: User): void {
    console.log('[CreateGame] Selecting user:', user.displayName);
    
    // Check max players
    if (this.invitedPlayers.length >= 3) {
      this.errorMessage = 'Maximum 3 players can be invited (4 players total including you)';
      return;
    }
    
    // Check if current user
    if (this.currentUser && user.uid === this.currentUser.uid) {
      this.errorMessage = 'You cannot invite yourself';
      return;
    }
    
    // Check if already invited
    const alreadyInvited = this.invitedPlayers.some(p => p.uid === user.uid);
    if (alreadyInvited) {
      this.errorMessage = 'This player has already been invited';
      return;
    }
    
    // Add to invited players
    this.invitedPlayers.push(user);
    console.log('[CreateGame] Player added:', user.displayName);
    console.log('[CreateGame] Total invited:', this.invitedPlayers.length);
    
    // Clear search
    this.userSearchQuery = '';
    this.userSearchResults = [];
    this.errorMessage = '';
    this.successMessage = `${user.displayName} added to game`;
    
    // Clear success message
    setTimeout(() => {
      this.successMessage = '';
    }, 2000);
  }

  // Remove player from invited list
  removePlayerInvite(userId: string): void {
    console.log('[CreateGame] Removing player:', userId);
    this.invitedPlayers = this.invitedPlayers.filter(p => p.uid !== userId);
    console.log('[CreateGame] Remaining:', this.invitedPlayers.length);
  }

  //
  // Create Game
  //

  async createGame(): Promise<void> {
    console.log('[CreateGame] Creating game');
    
    // Validate form
    if (this.gameForm.invalid) {
      console.log('[CreateGame] Form invalid');
      this.markFormGroupTouched(this.gameForm);
      this.errorMessage = 'Please fill in all required fields';
      return;
    }
    
    // Validate course selected
    if (!this.selectedCourse) {
      console.error('[CreateGame] No course selected');
      this.errorMessage = 'Please search for and select a golf course';
      return;
    }
    
    // Validate tee selected
    if (!this.selectedTee) {
      console.error('[CreateGame] No tee selected');
      this.errorMessage = 'Please select a tee box';
      return;
    }
    
    // Validate holes loaded
    if (!this.selectedHoles || this.selectedHoles.length === 0) {
      console.error('[CreateGame] No holes data');
      this.errorMessage = 'No hole data available for selected tee';
      return;
    }
    
    // Validate user authenticated
    if (!this.currentUser) {
      console.error('[CreateGame] No current user');
      this.errorMessage = 'You must be logged in to create a game';
      return;
    }
    
    this.loading = true;
    this.errorMessage = '';
    
    const formValue = this.gameForm.value;
    
    try {
      // Prepare game data using models
      const createGameData: CreateGameData = {
        courseInfo: {
          apiCourseId: this.selectedCourse.id,
          courseName: this.selectedCourse.course_name,
          clubName: this.selectedCourse.club_name,
          selectedTee: this.selectedTee,
          holes: this.selectedHoles
        },
        numberOfHoles: formValue.numberOfHoles,
        startingHole: formValue.startingHole,
        startDate: new Date(formValue.startDate),
        hostPlayerName: formValue.playerName,
        hostTeeId: this.selectedTee,
        hostTeeName: this.selectedTee
      };
      
      console.log('[CreateGame] Game data prepared');
      console.log('[CreateGame] Course:', createGameData.courseInfo.courseName);
      console.log('[CreateGame] Tee:', createGameData.courseInfo.selectedTee);
      console.log('[CreateGame] Holes:', createGameData.courseInfo.holes.length);
      console.log('[CreateGame] Number of holes:', createGameData.numberOfHoles);
      console.log('[CreateGame] Starting hole:', createGameData.startingHole);
      
      const invalidHole = this.selectedHoles.find(h => 
        h.par === undefined || h.yardage === undefined
      );
      if (invalidHole) {
        this.errorMessage = `Invalid course data for hole ${invalidHole.par}. Contact support.`;
        this.loading = false;
        return;
      }

      // Create game
      const gameId = await this.gameService.createGame(
        this.currentUser.uid,
        this.currentUser.displayName || this.currentUser.email || 'Host',
        createGameData
      );
      
      console.log('[CreateGame] Game created:', gameId);
      
      // Send invitations
      await this.sendInvitations(gameId);
      
      console.log('[CreateGame] Navigating to scorecard');
      await this.router.navigate(['/scoreCard', gameId]);
      
    } catch (error: any) {
      console.error('[CreateGame] Error:', error);
      this.loading = false;
      this.errorMessage = error.message || 'Failed to create game. Please try again.';
    }
  }

  //
  // Send Invitations
  //

  private async sendInvitations(gameId: string): Promise<void> {
    console.log('[CreateGame] Sending invitations');
    console.log('[CreateGame] Game ID:', gameId);
    console.log('[CreateGame] Players to invite:', this.invitedPlayers.length);
    
    if (this.invitedPlayers.length === 0) {
      console.log('[CreateGame] No players to invite');
      return;
    }
    
    if (!this.currentUser) {
      console.error('[CreateGame] No current user');
      return;
    }
    
    const promises = this.invitedPlayers.map(player => {
      console.log('[CreateGame] Inviting:', player.displayName, player.email);
      
      return this.gameInviteService.sendInvitation(
        gameId,
        this.currentUser!.uid,
        this.currentUser!.displayName || this.currentUser!.email || 'Host',
        player.uid,
        player.email
      );
    });
    
    try {
      await Promise.all(promises);
      console.log('[CreateGame] All invitations sent successfully');
    } catch (error) {
      console.error('[CreateGame] Invitation error:', error);
      // Don't throw - game is already created
    }
  }

  //
  // Navigation
  //

  goToScoreCard(gameID : string): void{
    console.log('[CreateGame] Cancel');
    this.router.navigate(['/scoreCard/',gameID]);
  }

  cancel(): void {
    console.log('[CreateGame] Cancel');
    this.router.navigate(['/home']);
  }

  //
  // Form Helpers
  //

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  //
  // Getters
  //

  get courseName() {
    return this.gameForm.get('courseName');
  }

  get teeName() {
    return this.gameForm.get('teeName');
  }

  get playerName() {
    return this.gameForm.get('playerName');
  }

  get startDate() {
    return this.gameForm.get('startDate');
  }

  get canInviteMore(): boolean {
    return this.invitedPlayers.length < 3;
  }

  get totalPlayers(): number {
    return this.invitedPlayers.length + 1; // +1 for host
  }
}
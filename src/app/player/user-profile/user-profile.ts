import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

//services
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { CourseAPIService } from '../../services/course-api.service';
import { GameInviteService } from '../../services/game-invite.service';
//models
import { User,UserProfileUpdate } from '../../models/user-model/user-module';
import { GolfCourse } from '../../models/golf-course/golf-course-module';
import { CreateGameData } from '../../models/game/game-module';

@Component({
  selector: 'app-user-profile',
  standalone: false,
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})

export class UserProfile {

  //
  // Variables
  //

  // User Data
  currentUser: User | null = null;
  
  // Form
  profileForm: FormGroup;
  
  // UI States
  isEditMode: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Subscriptions
  private userSubscription?: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    console.log('[UserProfile] Component initialized');
    
    // Initialize profile form
    this.profileForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      handicap: ['', [Validators.min(0), Validators.max(54)]],
      email: [{ value: '', disabled: true }] // Email is read-only
    });
    
    console.log('[UserProfile] Profile form initialized');
  }

  //
  // Lifecycle
  //

  ngOnInit(): void {
    console.log('[UserProfile] ngOnInit called');
    
    // Subscribe to current user from AuthService
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('[UserProfile] Current user updated:', user?.uid);
      this.currentUser = user;
      
      if (user) {
        console.log('[UserProfile] User data:', {
          displayName: user.displayName,
          email: user.email,
          handicap: user.handicap
        });
        
        this.loadUserProfile();
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[UserProfile] Component destroyed');
    
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  //
  // Load User Profile
  //

  private loadUserProfile(): void {
    console.log('[UserProfile] Loading user profile into form');
    
    if (!this.currentUser) {
      console.warn('[UserProfile] No current user to load');
      return;
    }
    
    // Populate form with current user data
    this.profileForm.patchValue({
      displayName: this.currentUser.displayName || '',
      handicap: this.currentUser.handicap || '',
      email: this.currentUser.email || ''
    });
    
    console.log('[UserProfile] Profile form populated');
    
    // Start in view mode (form disabled)
    if (!this.isEditMode) {
      this.disableForm();
    }
  }

  //
  // Edit Mode Toggle
  //

  enterEditMode(): void {
    console.log('[UserProfile] Entering edit mode');
    
    this.isEditMode = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Enable form fields (except email)
    this.profileForm.get('displayName')?.enable();
    this.profileForm.get('handicap')?.enable();
    
    console.log('[UserProfile] Edit mode enabled');
  }

  cancelEdit(): void {
    console.log('[UserProfile] Cancelling edit mode');
    
    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Reload original user data
    this.loadUserProfile();
    
    // Disable form
    this.disableForm();
    
    console.log('[UserProfile] Edit cancelled, form reset');
  }

  //
  // Save Profile Changes
  //

  async saveProfile(): Promise<void> {
    console.log('[UserProfile] Saving profile changes');
    
    // Validate form
    if (this.profileForm.invalid) {
      console.log('[UserProfile] Form is invalid');
      console.log('[UserProfile] Form errors:', this.profileForm.errors);
      this.markFormGroupTouched(this.profileForm);
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }
    
    if (!this.currentUser) {
      console.error('[UserProfile] No current user to update');
      this.errorMessage = 'User not found. Please log in again.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Prepare update data
    const updateData: UserProfileUpdate = {
      displayName: this.profileForm.value.displayName,
      handicap: this.profileForm.value.handicap || undefined
    };
    
    console.log('[UserProfile] Update data:', updateData);
    
    try {
      // Update user profile via AuthService
      await this.authService.updateUserProfile(this.currentUser.uid, updateData);
      
      console.log('[UserProfile] Profile updated successfully');
      
      this.isLoading = false;
      this.isEditMode = false;
      this.successMessage = 'Profile updated successfully!';
      
      // Disable form
      this.disableForm();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      
    } catch (error: any) {
      console.error('[UserProfile] Error updating profile:', error);
      
      this.isLoading = false;
      
      // Handle specific error codes
      if (error.code === 'permission-denied') {
        this.errorMessage = 'You do not have permission to update this profile.';
      } else if (error.code === 'unavailable') {
        this.errorMessage = 'Network error. Please check your connection.';
      } else {
        this.errorMessage = 'Failed to update profile. Please try again.';
      }
    }
  }

  //
  // Navigation
  //

  goToHome(): void {
    console.log('[UserProfile] Navigating to home');
    this.router.navigate(['/home']);
  }

  goToForgotPassword(): void {
    console.log('[UserProfile] Navigating to forgot password');
    this.router.navigate(['/forgotPassword']);
  }

  async logout(): Promise<void> {
    console.log('[UserProfile] Logging out user');
    
    try {
      await this.authService.logout();
      console.log('[UserProfile] Logout successful');
      // AuthService will handle redirect to login
    } catch (error) {
      console.error('[UserProfile] Logout error:', error);
      this.errorMessage = 'Failed to logout. Please try again.';
    }
  }
  
  //
  // Form Helpers
  //

  private disableForm(): void {
    console.log('[UserProfile] Disabling form fields');
    this.profileForm.get('displayName')?.disable();
    this.profileForm.get('handicap')?.disable();
    // Email is always disabled
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    console.log('[UserProfile] Marking all form fields as touched');
    
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  //
  // Getters for Template
  //
  get createdAt() {
    return this.profileForm.get('createdAt');
  }

  get updatedAt() {
    return this.profileForm.get('updatedAt');
  }

  get displayName() {
    return this.profileForm.get('displayName');
  }

  get handicap() {
    return this.profileForm.get('handicap');
  }

  get email() {
    return this.profileForm.get('email');
  }

  // Get display value for view mode
  get displayNameValue(): string {
    return this.currentUser?.displayName || 'Not set';
  }

  get handicapValue(): string {
    return this.currentUser?.handicap !== undefined && this.currentUser?.handicap !== null
      ? this.currentUser.handicap.toString()
      : 'Not set';
  }

  get emailValue(): string {
    return this.currentUser?.email || '';
  }
}
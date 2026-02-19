import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { SpartanuiModule } from '../../shared/spartanui/spartanui-module';

import { AuthService } from '../../services/auth.service';
import { CourseAPIService } from '../../services/course-api.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  [x: string]: any;
  //golbasl variables
  loginForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)])
    });
  }

  //
  // Methods
  //

  // Login method
  async onLogin(): Promise<void> {
    this.errorMessage = '';
    if (this.loginForm.valid) 
    {
      console.log("login 1");
      this.loading = true;
      const email = this.loginForm.get('email')?.value;
      const password = this.loginForm.get('password')?.value;

      console.log("login 2 got emaila and password");
      
      try {
        console.log("login 3 send to auth service");
        await this.authService.login(email, password);
        // Navigate to profile page
        console.log("login 4 nav to user profile");
        const userId = this.authService.getCurrentUserId();
        if (userId) {
          console.log(`[Navigation] Navigating to my profile: ${userId}`);
          this.router.navigate(['/userProfile', userId]);
        } else {
          console.warn('[Navigation] Cannot navigate to profile: no authenticated user');
          // Optional: redirect to login
          // this.goToLogin();
        }
      } catch (error) {
        this.errorMessage = 'Login failed. Please check your credentials.';
        console.error('Login error:', error);
      } finally {
        this.loading = false;
      }
    }
  }

  //
  //gets
  //
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  //
  // Navigation
  //

  goToSignUp(): void {
    console.log('[Component] Navigating to sign up');
    this.router.navigate(['/signUp']);
  }

  goToForgotPassword(): void {
    console.log('[Component] Navigating to forgot password');
    this.router.navigate(['/forgotPassword']);
  }

  goToHome(): void {
    console.log('[Component] Navigating to home');
    this.router.navigate(['/home']);
  }

  goToAbout(): void {
    console.log('[Component] Navigating to about');
    this.router.navigate(['/about']);
  }

  goToUserProfile(userId: string): void {
    console.log(`[Component] Navigating to user profile: ${userId}`);
    this.router.navigate(['/userProfile', userId]);
  }

}

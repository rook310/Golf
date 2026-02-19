import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { sendPasswordResetEmail,confirmPasswordReset } from 'firebase/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  //
  //varibles
  //

  //html
  forgotPasswordForm: FormGroup;

  //messages
  errorMessage: string = '';
  successMessage: string = '';

  //states
  loading: boolean = false;
  isEmailSent: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }

  async onResetPassword(): Promise<void> {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';
    
    // Mark all fields as touched to trigger validation display
    this.forgotPasswordForm.markAllAsTouched();

    if (this.forgotPasswordForm.valid) {
      this.loading = true;
      const email = this.forgotPasswordForm.get('email')?.value.trim();

      try {
        await this.authService.resetPassword(email);//this is all the code tou  really need for this
        this.successMessage = 'Password reset email sent! Check your inbox.';
        this.isEmailSent = true;
      } catch (error: any) {
        console.error('Password reset error:', error);
        
        // User-friendly error messages based on Firebase error codes
        switch (error.code) {
          case 'auth/user-not-found':
            this.errorMessage = 'No account found with this email.';
            break;
          case 'auth/invalid-email':
            this.errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/too-many-requests':
            this.errorMessage = 'Too many attempts. Try again later.';
            break;
          default:
            this.errorMessage = 'Failed to send reset email. Please try again.';
        }
      } finally {
        this.loading = false;
      }
    } else {
      this.errorMessage = 'Please enter a valid email address.';
    }
  }

  //
  //resend email
  //
  resendEmail(): void {
    if (this.forgotPasswordForm.valid) {
      this.onResetPassword();
    }
  }

  //
  //navigation
  //
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  //
  //Gets
  //
  get email() {
    return this.forgotPasswordForm.get('email');
  }
}

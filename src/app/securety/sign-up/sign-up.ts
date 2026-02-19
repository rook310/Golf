import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: false,
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp 
{
  //golbasl variables
  signupForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      displayName: new FormControl('', [Validators.required]),
      handicap: new FormControl('', [Validators.required, Validators.min(0), Validators.max(54)]),
    });
  }

  //parswordchecker
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });

      console.log("Password confirmed")
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit(): Promise<void> {

    if (this.signupForm.invalid) {
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    const userRegistration =  { 
      email: this.signupForm.value.email,
      password:this.signupForm.value.password,
      displayName:this.signupForm.value.displayName,
      handicap : this.signupForm.value.handicap
    }

    try {

      this.authService.register(userRegistration);

      console.log("registration succesful")

      this.navigateToLogin();

    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    } finally {
      this.loading = false;
    }
  }

  //problem stattment messigas from firebase
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please login instead.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use a stronger password.';
      default:
        return 'An error occurred during signup. Please try again.';
    }
  }

  //
  //gets
  //

  get handicap() {
    return this.signupForm.get('handicap');
  }

  get email() {
    return this.signupForm.get('email');
  }

  get displayName() {
    return this.signupForm.get('displayName');
  }

  get password() {
    return this.signupForm.get('password');
  }

  get confirmPassword() {
    return this.signupForm.get('confirmPassword');
  }

  //
  //navigation
  //

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToForgotpassword(): void {
    this.router.navigate(['/forgotPassword']);
  }

}

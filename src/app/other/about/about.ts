import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user-model/user-module';

@Component({
  selector: 'app-about',
  standalone: false,
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {


  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {

  }

  
  //
  // Navigation
  //

  navigateToLogin(): void {
    console.log('[About] Navigating to login page');
    this.router.navigate(['/login']);
  }

  //
  // Form Helpers
  //

  private markFormGroupTouched(formGroup: FormGroup): void {
    console.log('[About] Marking all form fields as touched');
    
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}

//
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing-module';
import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

// Config import
import { environment } from './enviroments/enviroments';

// AngularFire FIRE imports ONLY no compact
import {getAuth, provideAuth} from "@angular/fire/auth";
import {getFirestore, provideFirestore} from "@angular/fire/firestore";
import {getStorage, provideStorage} from "@angular/fire/storage";
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';

import { App } from './app';

//UI
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SpartanuiModule } from './shared/spartanui/spartanui-module';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { NgIcon } from '@ng-icons/core';

//components
import { CreateGame } from './golf/create-game/create-game';
import { ScoreCard } from './golf/score-card/score-card';
import { Leaderboard } from './golf/leader-board/leader-board';
import { GameInvite } from './invite/game-invite/game-invite';
import { Home } from './other/home/home';
import { About } from './other/about/about';
import { SignUp } from './securety/sign-up/sign-up';
import { ForgotPassword } from './securety/forgot-password/forgot-password';
import { Login } from './securety/login/login';
import { UserProfile } from './player/user-profile/user-profile';
import { HlmHint } from "@spartan-ng/helm/form-field";
import { AddPlayer } from './invite/add-player/add-player';

@NgModule({
  declarations: [
    App,
    CreateGame,
    ScoreCard,
    Leaderboard,
    
    Home,
    About,
    GameInvite,
    SignUp,
    ForgotPassword,
    Login,
    UserProfile,
    AddPlayer
  ],
  imports: [
    BrowserModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    AppRoutingModule,
    SpartanuiModule,
    HlmHint
],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideFunctions(() => {
      const functions = getFunctions();
      functions.region = 'europe-west2';
      return functions;
    }),
  ],
  bootstrap: [App]
})
export class AppModule { }

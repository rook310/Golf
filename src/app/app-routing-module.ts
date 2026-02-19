import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

//
//components
//

//security
import { Login } from './securety/login/login';
import { SignUp } from './securety/sign-up/sign-up';
import { ForgotPassword } from './securety/forgot-password/forgot-password';

//invite
import { GameInvite } from './invite/game-invite/game-invite';


//player
import { UserProfile } from './player/user-profile/user-profile';

//other
import { Home } from './other/home/home';
import { About } from './other/about/about';

//golf
import { CreateGame } from './golf/create-game/create-game';
import { Leaderboard } from './golf/leader-board/leader-board';
import { ScoreCard } from './golf/score-card/score-card';

const routes: Routes = [
  { path: '', component: Login},
  { path: 'login', component: Login},
  { path: 'signUp', component: SignUp},
  { path: 'forgotPassword', component: ForgotPassword},
  { path: 'createGame', component: CreateGame},
  { path: 'leaderBoard/:id', component: Leaderboard }, 
  { path: 'userProfile/:id', component: UserProfile},
  { path: 'scoreCard/:gameId', component: ScoreCard },    
  { path: 'gameInvite/:userId', component: GameInvite },
  { path: 'home', component: Home},
  { path: 'about', component: About},
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

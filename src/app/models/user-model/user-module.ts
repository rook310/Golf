//Represents a user in the application
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  handicap?: number;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}


// User Registration Data
export interface UserRegistration {
  email: string;
  password: string;
  displayName: string;
  handicap: number;
}

// login
export interface UserLogin {
  email: string;
  password: string;
}

// password
export interface PasswordResetRequest {
  email: string;
}

// Update user info
export interface UserProfileUpdate {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  handicap?: number;
}

//playerr interface, moving between playeers
export interface PlayerEntry {
  name: string;
  userId?: string;
  isCurrentUser?: boolean;
}


export interface Guest {
  playerName: string;
  handicap: number;
}
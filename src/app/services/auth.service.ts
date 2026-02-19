import { Injectable } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  UserCredential
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp, 
  collection,
  getDocs
} from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

import { User, UserRegistration, UserProfileUpdate } from '../models/user-model/user-module';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  //
  // Variables
  //
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private authStateReady = new BehaviorSubject<boolean>(false);
  public authStateReady$ = this.authStateReady.asObservable();

  private collectionName = 'users';

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    console.log('[AuthService] Service initialized');
    this.initializeAuthStateListener();
  }

  //
  // Initialization
  //

  // Initialize Firebase Auth State Listener
  private initializeAuthStateListener(): void {
    console.log('[AuthService] Initializing auth state listener');
    
    onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('[AuthService] Auth state changed:', firebaseUser ? firebaseUser.uid : 'No user');
      
      if (firebaseUser) {
        try {
          const userData = await this.getUserData(firebaseUser.uid);
          console.log('[AuthService] User data retrieved from Firestore:', userData);
          
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || userData?.displayName || undefined,
            photoURL: firebaseUser.photoURL || userData?.photoURL || undefined,
            handicap: userData?.handicap,
            createdAt: userData?.createdAt || new Date(),
            updatedAt: userData?.updatedAt,
            lastLoginAt: new Date()
          };
          
          // Update last login time
          await this.updateLastLogin(firebaseUser.uid);
          
          console.log('[AuthService] Current user set:', user);
          this.currentUserSubject.next(user);
        } catch (error) {
          console.error('[AuthService] Error fetching user data:', error);
          this.currentUserSubject.next(null);
        }
      } else {
        console.log('[AuthService] No user authenticated, setting current user to null');
        this.currentUserSubject.next(null);
      }
      
      this.authStateReady.next(true);
      console.log('[AuthService] Auth state ready');
    });
  }

    getCurrentDate(): Date {
      return new Date();
    }

  //
  // Authentication Methods
  //

  // Register a new user
  async register(userRegistration: UserRegistration): Promise<void> 
  {
    if(!userRegistration) return;//checker

    const credential = await createUserWithEmailAndPassword(
      this.auth,
      userRegistration.email,//provided email
      userRegistration.password//provided password
    );

    const user = credential.user;
    if (!user) return;//checker

    const userData: User = {
      uid: user.uid,
      email: userRegistration.email,
      displayName: userRegistration.displayName || '',
      handicap: userRegistration.handicap || 0,
      createdAt : this.getCurrentDate()
    };//create other inforamtion

    // Save to Firestore
    await setDoc(doc(this.firestore, 'users', user.uid), userData);

    // Update Auth profile
    if (userRegistration.displayName) {
      await updateProfile(user, { displayName: userRegistration.displayName });
    }
  }

  // Sign in with email and password
  async login(email: string, password: string): Promise<void> 
  {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  // Sign out current user
  async logout(): Promise<void> {
    console.log('[AuthService] Logging out current user');
    
    try {
      await signOut(this.auth);
      console.log('[AuthService] User signed out successfully');
    } catch (error: any) {
      console.error('[AuthService] Logout error:', error.code, error.message);
      throw error;
    }
  }

  // Send password reset email
  async resetPassword(email: string): Promise<void> {
    console.log('[AuthService] Sending password reset email to:', email);
    
    try {
      await sendPasswordResetEmail(this.auth, email);
      console.log('[AuthService] Password reset email sent successfully');
    } catch (error: any) {
      console.error('[AuthService] Password reset error:', error.code, error.message);
      throw error;
    }
  }

  //
  //search
  //

  // Search users by email (partial match)
  async searchUsersByEmail(email: string): Promise<User[]> {
    try {
      const usersRef = collection(this.firestore, this.collectionName);
      const snapshot = await getDocs(usersRef);

      // Convert search term to lowercase for case-insensitive matching
      const lowerEmail = email.toLowerCase();
      
      // Filter on client side for partial matches in email
      const users = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          uid: doc.id
        } as User))
        .filter(user => 
          user.email?.toLowerCase().includes(lowerEmail)
        );

      return users;
    } catch (error) {
      console.error('Error searching users by email:', error);
      throw error;
    }
  }

  // Search users by display name (partial match)
  async searchUsersByName(searchTerm: string): Promise<User[]> {
    try {
      const usersRef = collection(this.firestore, this.collectionName);
      const snapshot = await getDocs(usersRef);

      // Convert search term to lowercase for case-insensitive matching
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      // Filter on client side for partial matches
      const users = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          uid: doc.id
        } as User))
        .filter(user => 
          user.displayName?.toLowerCase().includes(lowerSearchTerm)
        );

      return users;
    } catch (error) {
      console.error('Error searching users by name:', error);
      throw error;
    }
  }

  // Search users by both email and display name (partial match)
  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      //standard ooperation of retreaval of data but without userID
      const usersRef = collection(this.firestore, this.collectionName);
      const snapshot = await getDocs(usersRef);//retrive the user and create a snapshot of a user

      //snapshots are dynamic(thought they where static)
      //a snapshot can be changed and will be changed
      //the data within the database will remain the same unless i set the data to the current snapshot

      // Convert search term to lowercase for case-insensitive matching
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      // Filter on client side for partial matches in BOTH email and display name
      const users = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          uid: doc.id
        } as User))
        .filter(user => {
          const emailMatch = user.email?.toLowerCase().includes(lowerSearchTerm);//look for users with this email
          const nameMatch = user.displayName?.toLowerCase().includes(lowerSearchTerm);//look for user with this display name
          return emailMatch || nameMatch;
        });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  //
  // User Profile Methods
  //

  // Update user profile
  async updateUserProfile(userId: string, updateData: UserProfileUpdate): Promise<void> {
    console.log('[AuthService] Updating user profile for:', userId, 'with data:', updateData);
    
    try {
      const userDocRef = doc(this.firestore, `users/${userId}`);
      
      await updateDoc(userDocRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      console.log('[AuthService] User profile updated successfully in Firestore');
      
      // Update Firebase Auth profile if display name or photo URL changed
      if (this.auth.currentUser && (updateData.displayName || updateData.photoURL)) {
        await updateProfile(this.auth.currentUser, {
          displayName: updateData.displayName || this.auth.currentUser.displayName,
          photoURL: updateData.photoURL || this.auth.currentUser.photoURL
        });
        console.log('[AuthService] Firebase Auth profile updated');
      }
      
      // Refresh current user data
      if (this.auth.currentUser && this.auth.currentUser.uid === userId) {
        const userData = await this.getUserData(userId);
        if (userData) {
          this.currentUserSubject.next(userData);
          console.log('[AuthService] Current user data refreshed');
        }
      }
    } catch (error: any) {
      console.error('[AuthService] Update profile error:', error);
      throw error;
    }
  }

  // Get current authenticated user
  getCurrentUser(): User | null {
    const user = this.currentUserSubject.value;
    console.log('[AuthService] Getting current user:', user?.uid || 'No user');
    return user;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const isAuth = this.currentUserSubject.value !== null;
    console.log('[AuthService] Is authenticated:', isAuth);
    return isAuth;
  }

  //
  // Firestore Operations
  //

  // Create user document in Firestore
  private async createUserDocument(user: User): Promise<void> {
    console.log('[AuthService] Creating user document for:', user.uid);
    
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    
    try {
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        handicap: user.handicap || null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
      
      console.log('[AuthService] User document created successfully');
    } catch (error) {
      console.error('[AuthService] Error creating user document:', error);
      throw error;
    }
  }

  // Get user data from Firestore
  private async getUserData(userId: string): Promise<User | null> {
    console.log('[AuthService] Fetching user data from Firestore for:', userId);
    
    const userDocRef = doc(this.firestore, `users/${userId}`);
    
    try {
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('[AuthService] User data found:', data);
        
        return {
          uid: userId,
          email: data['email'],
          displayName: data['displayName'],
          photoURL: data['photoURL'],
          handicap: data['handicap'],
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate(),
          lastLoginAt: data['lastLoginAt']?.toDate()
        };
      } else {
        console.warn('[AuthService] User document does not exist for:', userId);
        return null;
      }
    } catch (error) {
      console.error('[AuthService] Error fetching user data:', error);
      return null;
    }
  }

  // Change last login timestamp
  private async updateLastLogin(userId: string): Promise<void> {
    console.log('[AuthService] Updating last login time for:', userId);
    
    const userDocRef = doc(this.firestore, `users/${userId}`);
    
    try {
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp()
      });
      console.log('[AuthService] Last login time updated');
    } catch (error) {
      console.error('[AuthService] Error updating last login time:', error);
    }
  }

  // find another user by id - get user by id
  async getUserById(userId: string): Promise<User | null> {
    console.log('[AuthService] Getting user by ID:', userId);
    return await this.getUserData(userId);
  }

  getCurrentUserId(): string | null {
    const user = this.currentUserSubject.value;
    return user?.uid || null;
  }

  getCurrentUserEmail(): string | null {
    const user = this.currentUserSubject.value;
    return user?.email || null;
  }

  getCurrentUserDisplayName(): string | null {
    const user = this.currentUserSubject.value;
    return user?.displayName || null;
  }
}
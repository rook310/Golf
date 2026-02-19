import { Injectable } from '@angular/core';
import { 
  Firestore, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion,
  serverTimestamp,
  collection,
  getDocs
} from '@angular/fire/firestore';
import { 
  GameInvitation, 
  InvitationStatus 
} from '../models/game/game-module';

@Injectable({
  providedIn: 'root'
})
export class GameInviteService {
  private readonly GAMES_COLLECTION = 'games';

  constructor(private firestore: Firestore) {
    console.log('[GameInvitationService] Service initialized');
  }

  //
  // Invitation Creation Methods
  //

  // Send invitation to user and add to game invitations array
  async sendInvitation(
    gameId: string,
    invitedByUserId: string,
    invitedByUserName: string,
    invitedUserId: string,
    invitedUserEmail: string
  ): Promise<string> {
    console.log('[GameInvitationService] Sending invitation');
    console.log('[GameInvitationService] Game ID:', gameId);
    console.log('[GameInvitationService] Invited by user ID:', invitedByUserId);
    console.log('[GameInvitationService] Invited user ID:', invitedUserId);
    console.log('[GameInvitationService] Invited user email:', invitedUserEmail);
    
    try {
      const invitationId = this.generateInvitationId();
      console.log('[GameInvitationService] Generated invitation ID:', invitationId);
      
      const invitation: GameInvitation = {
        invitationId: invitationId,
        gameId: gameId,
        invitedByUserId: invitedByUserId,
        invitedByUserName: invitedByUserName,
        invitedUserId: invitedUserId,
        invitedUserEmail: invitedUserEmail,
        createdAt: new Date(),
        status: InvitationStatus.PENDING
      };
      
      console.log('[GameInvitationService] Invitation object created:', invitation);
      
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      
      await updateDoc(gameDocRef, {
        invitations: arrayUnion(invitation),   // ✅ invitation already has createdAt: new Date()
        updatedAt: serverTimestamp()
      });
      
      console.log('[GameInvitationService] Invitation sent successfully');
      return invitationId;
    } catch (error) {
      console.error('[GameInvitationService] Error sending invitation:', error);
      throw error;
    }
  }

  //
  // Invitation Retrieval Methods
  //

  // Get all invitations for specific user across all games
  async getUserInvitations(userId: string): Promise<GameInvitation[]> {
    console.log('[GameInvitationService] Fetching invitations for user:', userId);
    
    try {
      const gamesRef = collection(this.firestore, this.GAMES_COLLECTION);
      const gamesSnapshot = await getDocs(gamesRef);
      
      console.log('[GameInvitationService] Total games in collection:', gamesSnapshot.size);
      
      const userInvitations: GameInvitation[] = [];
      
      gamesSnapshot.forEach(doc => {
        const data = doc.data();
        const invitations = data['invitations'] || [];
        
        console.log('[GameInvitationService] Checking game', doc.id, 'invitations:', invitations.length);
        
        // Filter invitations for this user
        const userGameInvitations = invitations.filter(
          (inv: any) => inv.invitedUserId === userId
        );
        
        if (userGameInvitations.length > 0) {
          console.log('[GameInvitationService] Found', userGameInvitations.length, 'invitations for user in game', doc.id);
          
          userGameInvitations.forEach((inv: any) => {
            userInvitations.push({
              invitationId: inv.invitationId,
              gameId: inv.gameId,
              invitedByUserId: inv.invitedByUserId,
              invitedByUserName: inv.invitedByUserName,
              invitedUserId: inv.invitedUserId,
              invitedUserEmail: inv.invitedUserEmail,
              createdAt: inv.createdAt?.toDate() || new Date(),
              respondedAt: inv.respondedAt?.toDate(),
              status: inv.status
            });
          });
        }
      });
      
      console.log('[GameInvitationService] Total invitations found for user:', userInvitations.length);
      return userInvitations;
    } catch (error) {
      console.error('[GameInvitationService] Error fetching user invitations:', error);
      throw error;
    }
  }

  // Get pending invitations for user filtered by status
  async getPendingInvitations(userId: string): Promise<GameInvitation[]> {
    console.log('[GameInvitationService] Fetching pending invitations for user:', userId);
    
    try {
      const allInvitations = await this.getUserInvitations(userId);
      const pendingInvitations = allInvitations.filter(
        inv => inv.status === InvitationStatus.PENDING
      );
      
      console.log('[GameInvitationService] Pending invitations:', pendingInvitations.length);
      return pendingInvitations;
    } catch (error) {
      console.error('[GameInvitationService] Error fetching pending invitations:', error);
      throw error;
    }
  }

  // Get all invitations for specific game
  async getGameInvitations(gameId: string): Promise<GameInvitation[]> {
    console.log('[GameInvitationService] Fetching invitations for game:', gameId);
    
    try {
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      const gameDoc = await getDoc(gameDocRef);
      
      if (!gameDoc.exists()) {
        console.warn('[GameInvitationService] Game not found:', gameId);
        return [];
      }
      
      const data = gameDoc.data();
      const invitations = data['invitations'] || [];
      
      console.log('[GameInvitationService] Found', invitations.length, 'invitations for game');
      
      return invitations.map((inv: any) => ({
        invitationId: inv.invitationId,
        gameId: inv.gameId,
        invitedByUserId: inv.invitedByUserId,
        invitedByUserName: inv.invitedByUserName,
        invitedUserId: inv.invitedUserId,
        invitedUserEmail: inv.invitedUserEmail,
        createdAt: inv.createdAt?.toDate() || new Date(),
        respondedAt: inv.respondedAt?.toDate(),
        status: inv.status
      }));
    } catch (error) {
      console.error('[GameInvitationService] Error fetching game invitations:', error);
      throw error;
    }
  }

  //
  // Invitation Response Methods
  //

  // Accept invitation and update status to ACCEPTED
  async acceptInvitation(gameId: string, invitationId: string): Promise<void> {
    console.log('[GameInvitationService] Accepting invitation');
    console.log('[GameInvitationService] Game ID:', gameId);
    console.log('[GameInvitationService] Invitation ID:', invitationId);
    
    try {
      await this.updateInvitationStatus(
        gameId,
        invitationId,
        InvitationStatus.ACCEPTED
      );
      
      console.log('[GameInvitationService] Invitation accepted successfully');
    } catch (error) {
      console.error('[GameInvitationService] Error accepting invitation:', error);
      throw error;
    }
  }

  // Decline invitation and update status to DECLINED
  async declineInvitation(gameId: string, invitationId: string): Promise<void> {
    console.log('[GameInvitationService] Declining invitation');
    console.log('[GameInvitationService] Game ID:', gameId);
    console.log('[GameInvitationService] Invitation ID:', invitationId);
    
    try {
      await this.updateInvitationStatus(
        gameId,
        invitationId,
        InvitationStatus.DECLINED
      );
      
      console.log('[GameInvitationService] Invitation declined successfully');
    } catch (error) {
      console.error('[GameInvitationService] Error declining invitation:', error);
      throw error;
    }
  }

  // Cancel invitation and update status to CANCELLED
  async cancelInvitation(gameId: string, invitationId: string): Promise<void> {
    console.log('[GameInvitationService] Cancelling invitation');
    console.log('[GameInvitationService] Game ID:', gameId);
    console.log('[GameInvitationService] Invitation ID:', invitationId);
    
    try {
      await this.updateInvitationStatus(
        gameId,
        invitationId,
        InvitationStatus.CANCELLED
      );
      
      console.log('[GameInvitationService] Invitation cancelled successfully');
    } catch (error) {
      console.error('[GameInvitationService] Error cancelling invitation:', error);
      throw error;
    }
  }

  //
  // Helper Methods
  //

  // Update invitation status with response timestamp
  private async updateInvitationStatus(
    gameId: string,
    invitationId: string,
    status: InvitationStatus
  ): Promise<void> {
    console.log('[GameInvitationService] Updating invitation status');
    console.log('[GameInvitationService] Game ID:', gameId);
    console.log('[GameInvitationService] Invitation ID:', invitationId);
    console.log('[GameInvitationService] New status:', status);
    
    try {
      const gameDocRef = doc(this.firestore, `${this.GAMES_COLLECTION}/${gameId}`);
      const gameDoc = await getDoc(gameDocRef);
      
      if (!gameDoc.exists()) {
        console.error('[GameInvitationService] Game not found:', gameId);
        throw new Error('Game not found');
      }
      
      const data = gameDoc.data();
      const invitations = data['invitations'] || [];
      
      console.log('[GameInvitationService] Current invitations:', invitations.length);
      
      // Find and update the invitation
      const updatedInvitations = invitations.map((inv: any) => {
        if (inv.invitationId === invitationId) {
          console.log('[GameInvitationService] Found invitation, updating status');
          return {
            ...inv,
            status: status,
            respondedAt: new Date()
          };
        }
        return inv;
      });
      
      await updateDoc(gameDocRef, {
        invitations: updatedInvitations,
        updatedAt: serverTimestamp()
      });
      
      console.log('[GameInvitationService] Invitation status updated successfully');
    } catch (error) {
      console.error('[GameInvitationService] Error updating invitation status:', error);
      throw error;
    }
  }

  // Generate unique invitation ID with timestamp
  private generateInvitationId(): string {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[GameInvitationService] Generated invitation ID:', id);
    return id;
  }

  // Check if user has been invited to specific game
  async isUserInvited(gameId: string, userId: string): Promise<boolean> {
    console.log('[GameInvitationService] Checking if user is invited to game');
    console.log('[GameInvitationService] Game ID:', gameId);
    console.log('[GameInvitationService] User ID:', userId);
    
    try {
      const invitations = await this.getGameInvitations(gameId);
      const userInvitation = invitations.find(inv => inv.invitedUserId === userId);
      
      const isInvited = userInvitation !== undefined;
      console.log('[GameInvitationService] User invited:', isInvited);
      
      if (userInvitation) {
        console.log('[GameInvitationService] Invitation status:', userInvitation.status);
      }
      
      return isInvited;
    } catch (error) {
      console.error('[GameInvitationService] Error checking user invitation:', error);
      return false;
    }
  }

   getInvitationIdFromInvitation(invitation: GameInvitation): string | null {
    return invitation?.invitationId || null;
  }
}
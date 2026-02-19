import { SimplifiedCourseInfo} from '../golf-course/golf-course-module';

//
//Inventation
//
export interface GameInvitation {
  invitationId: string;
  gameId: string;
  invitedByUserId: string;
  invitedByUserName?: string;
  courseName?: string,
  holes?: number,
  invitedUserId: string;
  invitedUserEmail?: string;
  createdAt: Date;
  respondedAt?: Date;
  status: InvitationStatus;
}

export enum InvitationStatus{
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  CANCELLED = "cancled"
}

// hole by hole scrore
export interface PlayerHoleScore {
  holeNumber: number;
  strokes?: number;
  par: number;
  handicap?: number;
  yardage: number;
  completed: boolean;
}

export enum PlayerType {
  HOST = 'host',
  PLAYER = 'player',
  GUEST = 'guest'
}

// player scoring
export interface GamePlayer {
  gamePlayerId: string;
  userId?: string; //does not need to exist for a game to occur
  guestId?: string; ////does not need to exist for a game to occur
  playerName: string;
  playerType: PlayerType;
  teeId: string; //Which tee box the player is using
  teeName: string;
  holeScores: PlayerHoleScore[];
  totalScore?: number;
  totalPar?: number;
  currentHole: number;
}

// 
// Stored Info
// 
export interface Game {
  gameId: string;
  createdBy: string; // User ID of the creator
  createdByName?: string;
  createdAt: Date;
  startDate: Date;
  endDate?: Date;
  
  // Course Information
  courseInfo: SimplifiedCourseInfo;
  
  // Game Settings
  numberOfHoles: number; // 9 or 18
  startingHole: number; // Usually 1, but can start at 10
  
  // Players in the game
  players: GamePlayer[];
  
  // Invitations are nested within the game
  invitations: GameInvitation[];
  
  // Game status
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  
  // Metadata
  updatedAt?: Date;
}

// make new game
export interface CreateGameData {
  courseInfo: SimplifiedCourseInfo;
  numberOfHoles: number;
  startingHole: number;
  startDate: Date;
  hostPlayerName: string;
  hostTeeId: string;
  hostTeeName: string;
}

// add new player to game
export interface AddPlayerData {
  gameId: string;
  playerName: string;
  teeId: string;
  teeName: string;
  userId?: string;
  isGuest: boolean;
}

//Update player score
export interface UpdateScoreData {
  gameId: string;
  gamePlayerId: string;
  holeNumber: number;
  strokes: number;
}

//leader board
export interface LeaderboardEntry {
  gamePlayerId: string;
  playerName: string;
  totalScore: number;
  totalPar: number;
  scoreToPar: number; // +5, -2, E, etc.
  holesCompleted: number;
  currentHole: number;
}

// summary/reporting
export interface GameSummary {
  gameId: string;
  courseName: string;
  clubName: string;
  startDate: Date;
  numberOfPlayers: number;
  isActive: boolean;
  isCompleted: boolean;
  myPlayerName?: string;
  holes: number;
  playerCount: number;
  createdAt: Date;
}
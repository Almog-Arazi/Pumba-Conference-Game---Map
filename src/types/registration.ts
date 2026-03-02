export interface PlayerRegistration {
  name: string;
  company: string;
  contact: string; // phone or email, optional — stored as '' when skipped
}

export interface PlayerMatchResult {
  playerId: 'player1' | 'player2';
  registration: PlayerRegistration;
  score: number;
  isWinner: boolean;
}

export interface MatchRecord {
  id: string;
  timestamp: string;
  numPlayers: 1 | 2;
  players: PlayerMatchResult[];
}

export const MATCH_HISTORY_KEY = 'pumba_match_history';

export function loadMatchHistory(): MatchRecord[] {
  try {
    return JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveMatchRecord(record: MatchRecord): void {
  const history = loadMatchHistory();
  localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify([...history, record]));
}

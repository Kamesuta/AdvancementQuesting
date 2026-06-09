export interface PlayerSession {
  playerUuid: string
  playerName: string
}

export interface AuthCodeRequest {
  code: string
}

export interface AuthCodeResponse {
  token: string
  playerName: string
  playerUuid: string
}

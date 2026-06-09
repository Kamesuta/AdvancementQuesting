export type ProposalStatus = 'pending' | 'approved' | 'rejected'

export interface Proposal {
  id: number
  questId: string
  proposerUuid: string
  proposerName: string
  status: ProposalStatus
  votesUp: number
  votesDown: number
  rejectReason: string | null
  createdAt: string
  myVote: 'up' | 'down' | null
}

export interface VoteRequest {
  type: 'up' | 'down'
}

export interface RejectRequest {
  reason: string
}

export type Thresholds = {
  acceptAvgScore: number
  acceptConfidence: number
  rejectHighSeverity: boolean
}

export const defaultThresholds: Thresholds = {
  acceptAvgScore: 3.5,
  acceptConfidence: 0.6,
  rejectHighSeverity: true,
}

export const temperatures = {
  plannerPrecise: 0.3,
  plannerBalanced: 0.7,
  plannerExploratory: 0.95,
  coder: 0.2,
  validator: 0.0,
  omlx: 0.1,
}

export const longContext = {
  enabled: true,
  tokenTrigger: 150_000,
}

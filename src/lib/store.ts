import type { AppState } from '../types'

const KEY = 'qiuzhi:v1'

export const emptyState: AppState = {
  materials: [],
  profile: null,
  job: null,
  match: null,
  assessment: null,
  assessmentAnswers: {},
  assessmentResult: null,
  interview: null,
  interviewReport: null,
}

export function loadState(): AppState {
  try {
    const value = localStorage.getItem(KEY)
    return value ? { ...emptyState, ...JSON.parse(value) } : emptyState
  } catch {
    return emptyState
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearState() {
  localStorage.removeItem(KEY)
}

import type {
  AssessmentResult,
  AssessmentSession,
  CareerProfile,
  InterviewReport,
  InterviewSession,
  JobTarget,
  MatchReport,
  Material,
} from '../types'

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json() as Promise<T>
}

export async function health(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 1200)
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal })
    window.clearTimeout(timer)
    return response.ok
  } catch {
    return false
  }
}

export const api = {
  buildProfile: (materials: Material[], targetDirection: string) => request<CareerProfile>('/api/v1/profile', {
    method: 'POST',
    body: JSON.stringify({ materials, target_direction: targetDirection }),
  }),
  matchJob: (profile: CareerProfile, job: JobTarget) => request<MatchReport>('/api/v1/jobs/match', {
    method: 'POST',
    body: JSON.stringify({ profile, job }),
  }),
  createAssessment: (profile: CareerProfile, job: JobTarget, match: MatchReport, questionCount = 8) => request<AssessmentSession>('/api/v1/assessments', {
    method: 'POST',
    body: JSON.stringify({ profile, job, match, question_count: questionCount }),
  }),
  gradeAssessment: (session: AssessmentSession, answers: Record<string, string>) => request<AssessmentResult>('/api/v1/assessments/grade', {
    method: 'POST',
    body: JSON.stringify({ session, answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer })) }),
  }),
  createInterview: (profile: CareerProfile, job: JobTarget, match: MatchReport, assessmentResult: AssessmentResult | null, mode = 'mixed') => request<InterviewSession>('/api/v1/interviews', {
    method: 'POST',
    body: JSON.stringify({ profile, job, match, assessment_result: assessmentResult, mode }),
  }),
  interviewTurn: (session: InterviewSession, candidateAnswer: string, profile: CareerProfile, job: JobTarget) => request<{ session: InterviewSession; next_question: string; coach_hint: string }>('/api/v1/interviews/turn', {
    method: 'POST',
    body: JSON.stringify({ session, candidate_answer: candidateAnswer, profile, job }),
  }),
  interviewReport: (session: InterviewSession, profile: CareerProfile, job: JobTarget) => request<InterviewReport>('/api/v1/interviews/report', {
    method: 'POST',
    body: JSON.stringify({ session, profile, job }),
  }),
}

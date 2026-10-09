export type CareerProfile = {
  sourceText: string
  skills: string[]
  highlights: string[]
  updatedAt: string
}

export type JobTarget = {
  title: string
  jdText: string
  requiredSkills: string[]
}

export type MatchReport = {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  strengths: string[]
  suggestions: string[]
}

export type Question = {
  id: string
  skill: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

export type AssessmentResult = {
  score: number
  correct: number
  total: number
  weakSkills: string[]
  review: Array<{
    question: Question
    selectedIndex: number | null
    correct: boolean
  }>
}

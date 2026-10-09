export type MaterialKind = 'resume' | 'project' | 'certificate' | 'portfolio' | 'other'

export type Material = {
  id: string
  name: string
  kind: MaterialKind
  text: string
}

export type SkillEvidence = {
  skill: string
  evidence: string[]
  confidence: number
}

export type CareerProfile = {
  id: string
  headline: string
  summary: string
  target_directions: string[]
  skills: string[]
  skill_evidence: SkillEvidence[]
  projects: string[]
  strengths: string[]
  risks: string[]
  source_material_ids: string[]
  created_at: string
}

export type JobTarget = {
  id: string
  title: string
  company: string
  jd: string
}

export type MatchReport = {
  id: string
  score: number
  matched_skills: string[]
  missing_skills: string[]
  jd_skills: string[]
  strengths: string[]
  recommendations: string[]
  summary: string
}

export type Question = {
  id: string
  kind: 'single' | 'short' | 'scenario'
  skill: string
  prompt: string
  options: string[]
  answer: string
  keywords: string[]
  difficulty: '基础' | '进阶' | '困难'
}

export type AssessmentSession = {
  id: string
  title: string
  questions: Question[]
  focus_skills: string[]
  created_at: string
}

export type QuestionGrade = {
  question_id: string
  score: number
  max_score: number
  feedback: string
}

export type AssessmentResult = {
  id: string
  session_id: string
  score: number
  total: number
  grades: QuestionGrade[]
  weak_skills: string[]
  strong_skills: string[]
  recommendations: string[]
  created_at: string
}

export type InterviewMessage = {
  role: 'interviewer' | 'candidate'
  content: string
}

export type InterviewSession = {
  id: string
  mode: string
  focus_skills: string[]
  messages: InterviewMessage[]
  turn: number
  created_at: string
}

export type InterviewReport = {
  id: string
  session_id: string
  overall_score: number
  dimensions: Record<string, number>
  strengths: string[]
  weaknesses: string[]
  recommended_training: string[]
  summary: string
  created_at: string
}

export type AppState = {
  materials: Material[]
  profile: CareerProfile | null
  job: JobTarget | null
  match: MatchReport | null
  assessment: AssessmentSession | null
  assessmentAnswers: Record<string, string>
  assessmentResult: AssessmentResult | null
  interview: InterviewSession | null
  interviewReport: InterviewReport | null
}

export type ViewKey = 'dashboard' | 'materials' | 'job' | 'assessment' | 'interview' | 'review'

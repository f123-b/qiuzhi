from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Material(BaseModel):
    id: str = Field(default_factory=lambda: uid("mat"))
    name: str
    kind: Literal["resume", "project", "certificate", "portfolio", "other"] = "other"
    text: str


class SkillEvidence(BaseModel):
    skill: str
    evidence: list[str] = Field(default_factory=list)
    confidence: float = 0.7


class CareerProfile(BaseModel):
    id: str = Field(default_factory=lambda: uid("profile"))
    headline: str = "求职候选人"
    summary: str = ""
    target_directions: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    skill_evidence: list[SkillEvidence] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    source_material_ids: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)


class BuildProfileRequest(BaseModel):
    materials: list[Material]
    target_direction: str = ""


class JobTarget(BaseModel):
    id: str = Field(default_factory=lambda: uid("job"))
    title: str
    company: str = ""
    jd: str


class MatchRequest(BaseModel):
    profile: CareerProfile
    job: JobTarget


class MatchReport(BaseModel):
    id: str = Field(default_factory=lambda: uid("match"))
    score: int
    matched_skills: list[str]
    missing_skills: list[str]
    jd_skills: list[str]
    strengths: list[str]
    recommendations: list[str]
    summary: str


class Question(BaseModel):
    id: str = Field(default_factory=lambda: uid("q"))
    kind: Literal["single", "short", "scenario"] = "short"
    skill: str
    prompt: str
    options: list[str] = Field(default_factory=list)
    answer: str = ""
    keywords: list[str] = Field(default_factory=list)
    difficulty: Literal["基础", "进阶", "困难"] = "基础"


class AssessmentCreateRequest(BaseModel):
    profile: CareerProfile
    job: JobTarget
    match: MatchReport
    question_count: int = Field(default=8, ge=3, le=30)


class AssessmentSession(BaseModel):
    id: str = Field(default_factory=lambda: uid("exam"))
    title: str
    questions: list[Question]
    focus_skills: list[str]
    created_at: str = Field(default_factory=now_iso)


class AnswerItem(BaseModel):
    question_id: str
    answer: str


class AssessmentGradeRequest(BaseModel):
    session: AssessmentSession
    answers: list[AnswerItem]


class QuestionGrade(BaseModel):
    question_id: str
    score: int
    max_score: int = 10
    feedback: str


class AssessmentResult(BaseModel):
    id: str = Field(default_factory=lambda: uid("result"))
    session_id: str
    score: int
    total: int = 100
    grades: list[QuestionGrade]
    weak_skills: list[str]
    strong_skills: list[str]
    recommendations: list[str]
    created_at: str = Field(default_factory=now_iso)


class InterviewMessage(BaseModel):
    role: Literal["interviewer", "candidate"]
    content: str


class InterviewCreateRequest(BaseModel):
    profile: CareerProfile
    job: JobTarget
    match: MatchReport
    assessment_result: AssessmentResult | None = None
    mode: Literal["technical", "project", "hr", "mixed"] = "mixed"


class InterviewSession(BaseModel):
    id: str = Field(default_factory=lambda: uid("interview"))
    mode: str
    focus_skills: list[str]
    messages: list[InterviewMessage]
    turn: int = 0
    created_at: str = Field(default_factory=now_iso)


class InterviewTurnRequest(BaseModel):
    session: InterviewSession
    candidate_answer: str
    profile: CareerProfile
    job: JobTarget


class InterviewTurnResponse(BaseModel):
    session: InterviewSession
    next_question: str
    coach_hint: str = ""


class InterviewReportRequest(BaseModel):
    session: InterviewSession
    profile: CareerProfile
    job: JobTarget


class InterviewReport(BaseModel):
    id: str = Field(default_factory=lambda: uid("review"))
    session_id: str
    overall_score: int
    dimensions: dict[str, int]
    strengths: list[str]
    weaknesses: list[str]
    recommended_training: list[str]
    summary: str
    created_at: str = Field(default_factory=now_iso)


class DashboardSnapshot(BaseModel):
    profiles: int = 0
    assessments: int = 0
    interviews: int = 0
    reviews: int = 0
    recent: list[dict] = Field(default_factory=list)

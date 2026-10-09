from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ai import get_ai_provider
from .config import settings
from .engine import (
    build_interview_report,
    build_profile,
    create_assessment,
    create_interview,
    grade_assessment,
    interview_turn,
    match_job,
)
from .extensions import router as extensions_router
from .repository import JsonRepository
from .schemas import (
    AssessmentCreateRequest,
    AssessmentGradeRequest,
    AssessmentResult,
    AssessmentSession,
    BuildProfileRequest,
    CareerProfile,
    DashboardSnapshot,
    InterviewCreateRequest,
    InterviewReport,
    InterviewReportRequest,
    InterviewSession,
    InterviewTurnRequest,
    InterviewTurnResponse,
    MatchReport,
    MatchRequest,
)

app = FastAPI(title="求职 AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(extensions_router)
repo = JsonRepository(settings.data_dir / "qiuzhi.sqlite3")
ai = get_ai_provider()


@app.get("/health")
def health():
    return {"status": "ok", "ai_provider": settings.ai_provider, "ai_enabled": ai.enabled}


@app.post("/api/v1/profile", response_model=CareerProfile)
async def profile(request: BuildProfileRequest):
    value = await build_profile(ai, request.materials, request.target_direction)
    repo.put("profile", value.id, value.model_dump())
    for material in request.materials:
        repo.put("material", material.id, material.model_dump())
    return value


@app.post("/api/v1/jobs/match", response_model=MatchReport)
async def jobs_match(request: MatchRequest):
    value = await match_job(ai, request.profile, request.job)
    repo.put("job", request.job.id, request.job.model_dump())
    repo.put("match", value.id, value.model_dump())
    return value


@app.post("/api/v1/assessments", response_model=AssessmentSession)
async def assessments(request: AssessmentCreateRequest):
    value = await create_assessment(ai, request.profile, request.job, request.match, request.question_count)
    repo.put("assessment", value.id, value.model_dump())
    return value


@app.post("/api/v1/assessments/grade", response_model=AssessmentResult)
def assessment_grade(request: AssessmentGradeRequest):
    answers = {item.question_id: item.answer for item in request.answers}
    value = grade_assessment(request.session, answers)
    repo.put("assessment_result", value.id, value.model_dump())
    return value


@app.post("/api/v1/interviews", response_model=InterviewSession)
def interviews(request: InterviewCreateRequest):
    value = create_interview(request.profile, request.job, request.match, request.assessment_result, request.mode)
    repo.put("interview", value.id, value.model_dump())
    return value


@app.post("/api/v1/interviews/turn", response_model=InterviewTurnResponse)
async def interviews_turn(request: InterviewTurnRequest):
    session, next_question, hint = await interview_turn(ai, request.session, request.candidate_answer, request.profile, request.job)
    repo.put("interview", session.id, session.model_dump())
    return InterviewTurnResponse(session=session, next_question=next_question, coach_hint=hint)


@app.post("/api/v1/interviews/report", response_model=InterviewReport)
async def interviews_report(request: InterviewReportRequest):
    value = await build_interview_report(ai, request.session, request.profile, request.job)
    repo.put("review", value.id, value.model_dump())
    return value


@app.get("/api/v1/dashboard", response_model=DashboardSnapshot)
def dashboard():
    recent: list[dict] = []
    for kind in ["review", "assessment_result", "interview", "match"]:
        for item in repo.list(kind, 3):
            recent.append({"kind": kind, "item": item})
    return DashboardSnapshot(
        profiles=repo.count("profile"),
        assessments=repo.count("assessment_result"),
        interviews=repo.count("interview"),
        reviews=repo.count("review"),
        recent=recent[:8],
    )

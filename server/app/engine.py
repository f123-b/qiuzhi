from __future__ import annotations

import re
from collections import Counter

from .ai import AIProvider
from .schemas import (
    AssessmentResult,
    AssessmentSession,
    CareerProfile,
    InterviewMessage,
    InterviewReport,
    InterviewSession,
    JobTarget,
    MatchReport,
    Question,
    QuestionGrade,
    SkillEvidence,
)

SKILLS: dict[str, list[str]] = {
    "C/C++": ["c++", "c语言", "c/c++", "cpp"],
    "Python": ["python", "pytorch", "numpy"],
    "Java": ["java", "spring"],
    "Linux": ["linux", "嵌入式linux", "ubuntu", "mmap", "epoll"],
    "STM32": ["stm32", "stm32f", "stm32g"],
    "FreeRTOS": ["freertos", "rtos", "任务调度", "优先级反转"],
    "ROS2": ["ros2", "nav2", "tf2", "gazebo", "rviz"],
    "CAN": ["can", "socketcan"],
    "Modbus": ["modbus", "rtu", "modbus tcp"],
    "MQTT": ["mqtt"],
    "FOC": ["foc", "svpwm", "clarke", "park", "pmsm", "bldc"],
    "算法": ["算法", "数据结构", "leetcode", "动态规划"],
    "网络": ["tcp", "udp", "socket", "http", "网络编程"],
    "数据库": ["mysql", "postgresql", "sqlite", "数据库", "sql"],
    "Docker": ["docker", "container", "容器"],
    "Git": ["git", "github", "gitlab"],
    "PyTorch": ["pytorch", "深度学习", "神经网络"],
    "OpenCV": ["opencv", "计算机视觉"],
}

QUESTION_BANK: dict[str, list[tuple[str, list[str]]]] = {
    "FreeRTOS": [
        ("什么是优先级反转？FreeRTOS 中常见的解决办法是什么？", ["优先级继承", "互斥", "高优先级"]),
        ("中断服务函数与普通任务之间传递数据时，你会选择什么机制？为什么？", ["fromisr", "队列", "通知"]),
    ],
    "Linux": [
        ("mmap 与 read/write 访问设备数据相比有什么特点？", ["映射", "用户空间", "拷贝"]),
        ("进程还活着但多个协议线程同时停止上报，你会如何定位？", ["死锁", "线程", "日志"]),
    ],
    "C/C++": [
        ("volatile 在嵌入式开发中解决什么问题？它不能保证什么？", ["优化", "可见", "原子"]),
        ("请解释堆和栈的区别，以及嵌入式系统中应注意的问题。", ["生命周期", "动态", "空间"]),
    ],
    "网络": [
        ("TCP 为什么是可靠传输？至少说明三个机制。", ["确认", "重传", "序号"]),
        ("TCP 粘包产生的原因是什么？应用层通常如何处理？", ["边界", "长度", "协议"]),
    ],
    "算法": [
        ("如何在 O(n) 时间内检测单链表是否存在环？", ["快慢指针", "o(1)", "环"]),
        ("哈希表平均 O(1) 查询的前提是什么？最坏情况为什么会退化？", ["哈希", "冲突", "桶"]),
    ],
    "FOC": [
        ("FOC 中为什么通常让电流环频率高于速度环？", ["带宽", "电流", "速度"]),
        ("PWM 开关沿附近采 ADC 会带来什么问题？你会如何改善？", ["噪声", "同步", "中点"]),
    ],
}


def extract_skills(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []
    for skill, aliases in SKILLS.items():
        if any(alias.lower() in lower for alias in aliases):
            found.append(skill)
    return found


def evidence_for(skill: str, text: str) -> list[str]:
    sentences = re.split(r"[\n。；;]", text)
    aliases = [skill.lower(), *[item.lower() for item in SKILLS.get(skill, [])]]
    return [s.strip()[:140] for s in sentences if s.strip() and any(a in s.lower() for a in aliases)][:3]


async def build_profile(ai: AIProvider, materials, target_direction: str) -> CareerProfile:
    text = "\n".join(item.text for item in materials if item.text.strip())
    skills = extract_skills(text)
    projects = [line.strip("-• ") for line in text.splitlines() if any(k in line.lower() for k in ["项目", "project", "负责", "开发"])][:8]
    profile = CareerProfile(
        headline=target_direction or "求职候选人",
        summary=(text[:220] + "…") if len(text) > 220 else text,
        target_directions=[target_direction] if target_direction else [],
        skills=skills,
        skill_evidence=[SkillEvidence(skill=s, evidence=evidence_for(s, text), confidence=0.85) for s in skills],
        projects=projects,
        strengths=skills[:5],
        risks=["建议继续补充可量化的项目结果和个人贡献"] if text else ["尚未上传足够资料"],
        source_material_ids=[item.id for item in materials],
    )
    if ai.enabled and text.strip():
        data = await ai.json(
            "你是求职档案分析器。只输出 JSON，不虚构候选人经历。",
            f"根据以下资料提炼画像。字段：headline,summary,target_directions,skills,projects,strengths,risks。\n目标方向：{target_direction}\n资料：\n{text[:24000]}",
        )
        if data:
            for key in ["headline", "summary", "target_directions", "skills", "projects", "strengths", "risks"]:
                if data.get(key):
                    setattr(profile, key, data[key])
            profile.skill_evidence = [SkillEvidence(skill=s, evidence=evidence_for(s, text), confidence=0.9) for s in profile.skills]
    return profile


async def match_job(ai: AIProvider, profile: CareerProfile, job: JobTarget) -> MatchReport:
    jd_skills = extract_skills(job.jd)
    matched = [s for s in jd_skills if s in profile.skills]
    missing = [s for s in jd_skills if s not in profile.skills]
    score = 60 if not jd_skills else round(100 * len(matched) / len(jd_skills))
    score = max(15, min(98, score))
    report = MatchReport(
        score=score,
        matched_skills=matched,
        missing_skills=missing,
        jd_skills=jd_skills,
        strengths=[f"已具备 {s} 相关证据" for s in matched[:5]],
        recommendations=[f"优先补齐 {s}，并完成 3-5 道针对性题目" for s in missing[:5]] or ["继续通过项目追问验证技能深度"],
        summary=f"当前与 {job.title} 的核心技能匹配度约为 {score}%，重点差距：{ '、'.join(missing[:4]) or '暂无明显硬技能缺口'}。",
    )
    if ai.enabled:
        data = await ai.json(
            "你是岗位匹配分析器。只能基于候选人画像和 JD，输出 JSON。",
            f"候选人：{profile.model_dump_json()}\nJD：{job.model_dump_json()}\n字段：score,matched_skills,missing_skills,jd_skills,strengths,recommendations,summary",
        )
        if data:
            try:
                return MatchReport(**data)
            except Exception:
                pass
    return report


def _question_for(skill: str, index: int) -> Question:
    bank = QUESTION_BANK.get(skill) or [
        (f"请结合实际经历解释你对 {skill} 的理解，并说明一个容易踩坑的点。", [skill.lower(), "问题", "解决"])
    ]
    prompt, keywords = bank[index % len(bank)]
    return Question(skill=skill, prompt=prompt, keywords=keywords, difficulty="基础" if index < 3 else "进阶")


async def create_assessment(ai: AIProvider, profile: CareerProfile, job: JobTarget, match: MatchReport, count: int) -> AssessmentSession:
    focus = list(dict.fromkeys([*match.missing_skills, *match.jd_skills, *profile.skills]))[: max(3, count)]
    if not focus:
        focus = ["C/C++", "算法", "网络"]
    questions = [_question_for(focus[i % len(focus)], i) for i in range(count)]
    if ai.enabled:
        data = await ai.json(
            "你是技术笔试出题器。题目必须与候选人和岗位相关，只输出 JSON。",
            f"画像：{profile.model_dump_json()}\n岗位：{job.model_dump_json()}\n薄弱项：{match.missing_skills}\n生成 {count} 道题，格式 questions:[{{kind,skill,prompt,options,answer,keywords,difficulty}}]。",
        )
        if data and isinstance(data.get("questions"), list):
            try:
                questions = [Question(**item) for item in data["questions"][:count]]
            except Exception:
                pass
    return AssessmentSession(title=f"{job.title} · 针对性笔试", questions=questions, focus_skills=focus[:8])


def grade_assessment(session: AssessmentSession, answers: dict[str, str]) -> AssessmentResult:
    grades: list[QuestionGrade] = []
    skill_scores: dict[str, list[int]] = {}
    for q in session.questions:
        answer = answers.get(q.id, "").strip().lower()
        if not answer:
            score = 0
            feedback = "未作答。"
        else:
            hit = sum(1 for k in q.keywords if k.lower() in answer)
            keyword_score = round(8 * hit / max(1, len(q.keywords)))
            length_bonus = 2 if len(answer) >= 45 else 1 if len(answer) >= 18 else 0
            score = min(10, keyword_score + length_bonus)
            feedback = "关键点覆盖较完整。" if score >= 7 else f"建议补充：{ '、'.join(q.keywords)}。"
        grades.append(QuestionGrade(question_id=q.id, score=score, feedback=feedback))
        skill_scores.setdefault(q.skill, []).append(score)
    raw = sum(item.score for item in grades)
    total_max = max(1, len(grades) * 10)
    percent = round(raw * 100 / total_max)
    weak = [skill for skill, values in skill_scores.items() if sum(values) / len(values) < 6]
    strong = [skill for skill, values in skill_scores.items() if sum(values) / len(values) >= 7]
    return AssessmentResult(
        session_id=session.id,
        score=percent,
        grades=grades,
        weak_skills=weak,
        strong_skills=strong,
        recommendations=[f"针对 {s} 做专项训练并在面试中重点复测" for s in weak[:5]] or ["进入模拟面试，验证知识能否口头表达"],
    )


def create_interview(profile: CareerProfile, job: JobTarget, match: MatchReport, assessment: AssessmentResult | None, mode: str) -> InterviewSession:
    focus = list(dict.fromkeys([*(assessment.weak_skills if assessment else []), *match.missing_skills, *match.jd_skills, *profile.skills]))[:8]
    first = f"先做一个简短的自我介绍，并说明为什么你适合 {job.title}。"
    return InterviewSession(mode=mode, focus_skills=focus, messages=[InterviewMessage(role="interviewer", content=first)])


async def interview_turn(ai: AIProvider, session: InterviewSession, answer: str, profile: CareerProfile, job: JobTarget) -> tuple[InterviewSession, str, str]:
    session.messages.append(InterviewMessage(role="candidate", content=answer))
    session.turn += 1
    focus = session.focus_skills[session.turn % max(1, len(session.focus_skills))] if session.focus_skills else "项目经验"
    next_question = _question_for(focus, session.turn).prompt
    hint = "回答时先给结论，再说明原理，最后结合一个实际项目。"
    if ai.enabled:
        history = "\n".join(f"{m.role}: {m.content}" for m in session.messages[-8:])
        data = await ai.json(
            "你是真实技术面试官。根据候选人上一轮回答动态追问，不要一次问多个问题。只输出 JSON。",
            f"岗位：{job.title}\n重点：{session.focus_skills}\n历史：\n{history}\n输出 next_question 和 coach_hint。",
        )
        if data:
            next_question = str(data.get("next_question") or next_question)
            hint = str(data.get("coach_hint") or hint)
    session.messages.append(InterviewMessage(role="interviewer", content=next_question))
    return session, next_question, hint


async def build_interview_report(ai: AIProvider, session: InterviewSession, profile: CareerProfile, job: JobTarget) -> InterviewReport:
    answers = [m.content for m in session.messages if m.role == "candidate"]
    avg_len = round(sum(len(x) for x in answers) / max(1, len(answers)))
    base = min(90, 55 + len(answers) * 4 + min(15, avg_len // 20))
    dimensions = {"专业能力": base, "项目理解": min(95, base + 4), "表达结构": max(45, base - 6), "岗位匹配": min(95, base + 2)}
    report = InterviewReport(
        session_id=session.id,
        overall_score=round(sum(dimensions.values()) / len(dimensions)),
        dimensions=dimensions,
        strengths=["能够围绕岗位重点持续作答"] if answers else [],
        weaknesses=[f"需要继续强化 {s} 的口头表达" for s in session.focus_skills[:3]],
        recommended_training=[f"{s}：3 道八股 + 1 次口述复盘" for s in session.focus_skills[:4]],
        summary=f"已完成 {len(answers)} 轮回答，建议继续围绕岗位重点进行追问训练。",
    )
    if ai.enabled:
        data = await ai.json(
            "你是面试复盘教练。只基于真实对话评分，不虚构信息，只输出 JSON。",
            f"岗位：{job.title}\n画像：{profile.model_dump_json()}\n对话：{session.model_dump_json()}\n字段：overall_score,dimensions,strengths,weaknesses,recommended_training,summary",
        )
        if data:
            try:
                data["session_id"] = session.id
                return InterviewReport(**data)
            except Exception:
                pass
    return report

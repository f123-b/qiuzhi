import type {
  AssessmentResult,
  AssessmentSession,
  CareerProfile,
  InterviewReport,
  InterviewSession,
  JobTarget,
  MatchReport,
  Material,
  Question,
} from '../types'

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`
const now = () => new Date().toISOString()

const SKILLS: Record<string, string[]> = {
  'C/C++': ['c++', 'c/c++', 'cpp', 'c语言'],
  Python: ['python', 'numpy', 'pytorch'],
  Java: ['java', 'spring'],
  Linux: ['linux', 'mmap', 'epoll', '嵌入式linux'],
  STM32: ['stm32', 'stm32f', 'stm32g'],
  FreeRTOS: ['freertos', 'rtos', '优先级反转'],
  ROS2: ['ros2', 'nav2', 'tf2', 'gazebo'],
  CAN: ['can总线', 'socketcan', ' can '],
  Modbus: ['modbus'],
  MQTT: ['mqtt'],
  FOC: ['foc', 'svpwm', 'pmsm', 'clarke', 'park'],
  算法: ['算法', '数据结构', 'leetcode', '动态规划'],
  网络: ['tcp', 'udp', 'socket', 'http', '网络编程'],
  数据库: ['sql', 'mysql', 'postgresql', 'sqlite', '数据库'],
  Docker: ['docker', '容器'],
  Git: ['git', 'github', 'gitlab'],
  PyTorch: ['pytorch', '深度学习'],
  OpenCV: ['opencv', '计算机视觉'],
}

const BANK: Record<string, Array<[string, string[]]>> = {
  FreeRTOS: [
    ['什么是优先级反转？FreeRTOS 中常见的解决办法是什么？', ['优先级继承', '互斥', '高优先级']],
    ['中断服务函数与普通任务之间传递数据时，你会选择什么机制？', ['fromisr', '队列', '通知']],
  ],
  Linux: [
    ['mmap 与 read/write 访问设备数据相比有什么特点？', ['映射', '用户空间', '拷贝']],
    ['进程仍然存活但多个协议线程都停止上报，你会如何定位？', ['死锁', '线程', '日志']],
  ],
  'C/C++': [
    ['volatile 在嵌入式开发中解决什么问题？它不能保证什么？', ['优化', '可见', '原子']],
    ['解释堆和栈的区别，以及嵌入式系统中各自的风险。', ['生命周期', '动态', '空间']],
  ],
  网络: [
    ['TCP 为什么能提供可靠传输？至少说明三个机制。', ['确认', '重传', '序号']],
    ['TCP 粘包产生的原因是什么？应用层如何处理？', ['边界', '长度', '协议']],
  ],
  算法: [
    ['如何在 O(n) 时间、O(1) 额外空间下判断链表是否有环？', ['快慢指针', 'o(1)', '环']],
    ['哈希表平均 O(1) 查询的前提是什么？最坏情况为何退化？', ['哈希', '冲突', '桶']],
  ],
  FOC: [
    ['FOC 中为什么通常让电流环频率高于速度环？', ['带宽', '电流', '速度']],
    ['PWM 开关沿附近采 ADC 会造成什么问题？如何优化？', ['噪声', '同步', '中点']],
  ],
}

export function extractSkills(text: string): string[] {
  const source = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `
  return Object.entries(SKILLS)
    .filter(([, aliases]) => aliases.some((alias) => source.includes(alias.toLowerCase())))
    .map(([skill]) => skill)
}

export function buildLocalProfile(materials: Material[], targetDirection: string): CareerProfile {
  const text = materials.map((m) => m.text).join('\n')
  const skills = extractSkills(text)
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  const projects = lines.filter((line) => /项目|project|负责|开发|实现/i.test(line)).slice(0, 8)
  return {
    id: uid('profile'),
    headline: targetDirection || '求职候选人',
    summary: text.slice(0, 220) + (text.length > 220 ? '…' : ''),
    target_directions: targetDirection ? [targetDirection] : [],
    skills,
    skill_evidence: skills.map((skill) => ({
      skill,
      confidence: 0.82,
      evidence: lines.filter((line) => line.toLowerCase().includes(skill.toLowerCase())).slice(0, 3),
    })),
    projects,
    strengths: skills.slice(0, 5),
    risks: text ? ['建议继续补充量化结果、个人贡献和复杂问题的解决过程'] : ['尚未上传有效资料'],
    source_material_ids: materials.map((m) => m.id),
    created_at: now(),
  }
}

export function matchLocalJob(profile: CareerProfile, job: JobTarget): MatchReport {
  const jdSkills = extractSkills(`${job.title}\n${job.jd}`)
  const matched = jdSkills.filter((s) => profile.skills.includes(s))
  const missing = jdSkills.filter((s) => !profile.skills.includes(s))
  const score = jdSkills.length ? Math.max(15, Math.round((matched.length / jdSkills.length) * 100)) : Math.min(88, 58 + profile.skills.length * 3)
  return {
    id: uid('match'),
    score,
    matched_skills: matched,
    missing_skills: missing,
    jd_skills: jdSkills,
    strengths: matched.slice(0, 5).map((s) => `${s} 已在资料中出现，可作为面试证据。`),
    recommendations: missing.length ? missing.slice(0, 5).map((s) => `优先补齐 ${s}，完成专项题后再进入面试。`) : ['核心硬技能覆盖较完整，重点训练项目深挖与口头表达。'],
    summary: `当前与 ${job.title} 的核心技能匹配度约为 ${score}%。`,
  }
}

function questionFor(skill: string, index: number): Question {
  const items = BANK[skill] ?? [[`结合自己的经历解释 ${skill} 的核心原理，并说出一个常见问题和处理办法。`, [skill.toLowerCase(), '问题', '解决']]]
  const [prompt, keywords] = items[index % items.length]
  return {
    id: uid('q'),
    kind: 'short',
    skill,
    prompt,
    options: [],
    answer: '',
    keywords,
    difficulty: index < 3 ? '基础' : '进阶',
  }
}

export function generateLocalAssessment(profile: CareerProfile, job: JobTarget, match: MatchReport, count = 8): AssessmentSession {
  const focus = Array.from(new Set([...match.missing_skills, ...match.jd_skills, ...profile.skills]))
  const pool = focus.length ? focus : ['C/C++', '算法', '网络', 'Linux']
  return {
    id: uid('exam'),
    title: `${job.title} · 针对性笔试`,
    questions: Array.from({ length: count }, (_, i) => questionFor(pool[i % pool.length], i)),
    focus_skills: pool.slice(0, 8),
    created_at: now(),
  }
}

export function gradeLocalAssessment(session: AssessmentSession, answers: Record<string, string>): AssessmentResult {
  const grades = session.questions.map((q) => {
    const answer = (answers[q.id] ?? '').trim().toLowerCase()
    const hits = q.keywords.filter((k) => answer.includes(k.toLowerCase())).length
    const score = answer ? Math.min(10, Math.round((hits / Math.max(1, q.keywords.length)) * 8) + (answer.length >= 45 ? 2 : answer.length >= 18 ? 1 : 0)) : 0
    return { question_id: q.id, score, max_score: 10, feedback: score >= 7 ? '关键点覆盖较完整。' : `建议补充：${q.keywords.join('、')}。` }
  })
  const bySkill = new Map<string, number[]>()
  session.questions.forEach((q, i) => bySkill.set(q.skill, [...(bySkill.get(q.skill) ?? []), grades[i].score]))
  const weak = [...bySkill].filter(([, v]) => v.reduce((a, b) => a + b, 0) / v.length < 6).map(([k]) => k)
  const strong = [...bySkill].filter(([, v]) => v.reduce((a, b) => a + b, 0) / v.length >= 7).map(([k]) => k)
  return {
    id: uid('result'),
    session_id: session.id,
    score: Math.round(grades.reduce((s, g) => s + g.score, 0) * 100 / Math.max(1, grades.length * 10)),
    total: 100,
    grades,
    weak_skills: weak,
    strong_skills: strong,
    recommendations: weak.length ? weak.map((s) => `针对 ${s} 做 3-5 道题并进行一次口述复盘。`) : ['进入模拟面试验证口头表达。'],
    created_at: now(),
  }
}

export function createLocalInterview(profile: CareerProfile, job: JobTarget, match: MatchReport, result: AssessmentResult | null, mode = 'mixed'): InterviewSession {
  const focus = Array.from(new Set([...(result?.weak_skills ?? []), ...match.missing_skills, ...match.jd_skills, ...profile.skills])).slice(0, 8)
  return {
    id: uid('interview'),
    mode,
    focus_skills: focus,
    turn: 0,
    created_at: now(),
    messages: [{ role: 'interviewer', content: `请先做一个简短的自我介绍，并说明为什么你适合 ${job.title}。` }],
  }
}

export function localInterviewTurn(session: InterviewSession, answer: string): { session: InterviewSession; next_question: string; coach_hint: string } {
  const next = structuredClone(session)
  next.messages.push({ role: 'candidate', content: answer })
  next.turn += 1
  const focus = next.focus_skills[next.turn % Math.max(1, next.focus_skills.length)] || '项目经验'
  const question = questionFor(focus, next.turn).prompt
  next.messages.push({ role: 'interviewer', content: question })
  return { session: next, next_question: question, coach_hint: '建议先给结论，再讲原理，最后结合自己的项目。' }
}

export function localInterviewReport(session: InterviewSession): InterviewReport {
  const answers = session.messages.filter((m) => m.role === 'candidate').map((m) => m.content)
  const avg = answers.reduce((s, a) => s + a.length, 0) / Math.max(1, answers.length)
  const base = Math.min(90, 55 + answers.length * 4 + Math.min(15, Math.floor(avg / 20)))
  const dimensions = { 专业能力: base, 项目理解: Math.min(95, base + 4), 表达结构: Math.max(45, base - 6), 岗位匹配: Math.min(95, base + 2) }
  return {
    id: uid('review'),
    session_id: session.id,
    overall_score: Math.round(Object.values(dimensions).reduce((a, b) => a + b, 0) / 4),
    dimensions,
    strengths: answers.length ? ['能够持续围绕岗位问题进行回答'] : [],
    weaknesses: session.focus_skills.slice(0, 3).map((s) => `继续强化 ${s} 的结构化口头表达`),
    recommended_training: session.focus_skills.slice(0, 4).map((s) => `${s}：3 道八股 + 1 次口述训练`),
    summary: `本次完成 ${answers.length} 轮回答，建议根据薄弱项进入下一轮专项训练。`,
    created_at: now(),
  }
}

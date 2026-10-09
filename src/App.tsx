import { useEffect, useMemo, useState } from 'react'
import { api, health } from './lib/api'
import { parseCareerFile } from './lib/fileParser'
import {
  buildLocalProfile,
  createLocalInterview,
  generateLocalAssessment,
  gradeLocalAssessment,
  localInterviewReport,
  localInterviewTurn,
  matchLocalJob,
} from './lib/localEngine'
import { clearState, loadState, saveState } from './lib/store'
import type { AppState, JobTarget, Material, MaterialKind, ViewKey } from './types'

const nav: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: 'dashboard', label: '总览', hint: '准备进度' },
  { key: 'materials', label: '我的资料', hint: '简历与项目' },
  { key: 'job', label: '目标岗位', hint: 'JD 与匹配' },
  { key: 'assessment', label: '笔试训练', hint: '针对性出题' },
  { key: 'interview', label: 'AI 面试', hint: '动态追问' },
  { key: 'review', label: '复盘成长', hint: '薄弱项与建议' },
]

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

function kindFromName(name: string): MaterialKind {
  const lower = name.toLowerCase()
  if (lower.includes('简历') || lower.includes('resume') || lower.includes('cv')) return 'resume'
  if (lower.includes('项目') || lower.includes('project')) return 'project'
  if (lower.includes('证书') || lower.includes('certificate')) return 'certificate'
  if (lower.includes('作品') || lower.includes('portfolio')) return 'portfolio'
  return 'other'
}

function Stat({ label, value, suffix = '', tone = 'default' }: { label: string; value: string | number; suffix?: string; tone?: 'default' | 'good' | 'warn' }) {
  return <div className={`stat ${tone}`}><span>{label}</span><strong>{value}{suffix}</strong></div>
}

function Chips({ items, empty = '暂无' }: { items: string[]; empty?: string }) {
  if (!items.length) return <span className="muted">{empty}</span>
  return <div className="chips">{items.map((item) => <span className="chip" key={item}>{item}</span>)}</div>
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>
}

function Button({ children, onClick, variant = 'primary', disabled = false, type = 'button' }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit' }) {
  return <button type={type} className={`button ${variant}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function readiness(state: AppState) {
  const profile = state.profile ? 20 : 0
  const match = state.match ? Math.round(state.match.score * 0.25) : 0
  const exam = state.assessmentResult ? Math.round(state.assessmentResult.score * 0.25) : 0
  const interview = state.interviewReport ? Math.round(state.interviewReport.overall_score * 0.3) : 0
  return Math.min(100, profile + match + exam + interview)
}

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [view, setView] = useState<ViewKey>('dashboard')
  const [apiOnline, setApiOnline] = useState(false)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [targetDirection, setTargetDirection] = useState(state.profile?.target_directions[0] ?? '')
  const [jobTitle, setJobTitle] = useState(state.job?.title ?? '')
  const [company, setCompany] = useState(state.job?.company ?? '')
  const [jd, setJd] = useState(state.job?.jd ?? '')
  const [interviewAnswer, setInterviewAnswer] = useState('')

  useEffect(() => saveState(state), [state])
  useEffect(() => { health().then(setApiOnline) }, [])

  const ready = useMemo(() => readiness(state), [state])

  async function remoteOrLocal<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
    if (apiOnline) {
      try { return await remote() } catch { setApiOnline(false) }
    }
    return local()
  }

  function patch(next: Partial<AppState>) {
    setState((current) => ({ ...current, ...next }))
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy('正在读取资料…')
    setNotice('')
    try {
      const parsed: Material[] = []
      for (const file of Array.from(files)) {
        const text = await parseCareerFile(file)
        parsed.push({ id: uid('mat'), name: file.name, kind: kindFromName(file.name), text })
      }
      patch({ materials: [...state.materials, ...parsed], profile: null, match: null, assessment: null, assessmentResult: null, interview: null, interviewReport: null })
      setNotice(`已读取 ${parsed.length} 份资料。`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '文件解析失败。')
    } finally { setBusy('') }
  }

  function addPastedMaterial() {
    if (!pasteText.trim()) return
    const material: Material = { id: uid('mat'), name: `补充资料 ${state.materials.length + 1}`, kind: state.materials.length ? 'project' : 'resume', text: pasteText.trim() }
    patch({ materials: [...state.materials, material], profile: null, match: null, assessment: null, assessmentResult: null, interview: null, interviewReport: null })
    setPasteText('')
  }

  function loadDemo() {
    const text = `电子信息硕士，自动化本科。熟悉 C/C++、STM32、FreeRTOS、嵌入式 Linux、Python、ROS2。\n项目：基于 STM32G431 开发 PMSM/BLDC FOC 驱动器，负责 ADC 同步采样、Clarke/Park、PI、电流环、速度环、SVPWM、CAN 与保护。\n项目：RK3566 工业网关，负责 Modbus RTU/TCP、SocketCAN、MQTT、线程安全、OTA 回滚和数据总线。\n项目：ROS2 导航机器人，使用 YOLO、TF2、NAV2、OpenCV。`
    const material: Material = { id: uid('mat'), name: '示例简历.txt', kind: 'resume', text }
    setState({ ...loadState(), materials: [material], profile: null, job: null, match: null, assessment: null, assessmentAnswers: {}, assessmentResult: null, interview: null, interviewReport: null })
    setTargetDirection('嵌入式软件工程师')
    setJobTitle('嵌入式软件工程师')
    setCompany('示例科技')
    setJd('负责嵌入式 Linux、C/C++、FreeRTOS、STM32、CAN、TCP/IP 开发；熟悉 Docker、网络编程、Git，有电机控制经验优先。')
    setView('materials')
  }

  async function buildProfile() {
    if (!state.materials.length) return setNotice('请先上传或粘贴至少一份资料。')
    setBusy('正在生成职业画像…')
    try {
      const profile = await remoteOrLocal(
        () => api.buildProfile(state.materials, targetDirection),
        () => buildLocalProfile(state.materials, targetDirection),
      )
      patch({ profile, match: null, assessment: null, assessmentAnswers: {}, assessmentResult: null, interview: null, interviewReport: null })
      setNotice(apiOnline ? 'Career Profile 已由 AI 服务生成。' : 'Career Profile 已由本地引擎生成。')
    } finally { setBusy('') }
  }

  async function analyzeJob() {
    if (!state.profile) return setNotice('请先生成 Career Profile。')
    if (!jobTitle.trim() || !jd.trim()) return setNotice('请填写岗位名称和 JD。')
    const job: JobTarget = { id: state.job?.id ?? uid('job'), title: jobTitle.trim(), company: company.trim(), jd: jd.trim() }
    setBusy('正在分析岗位匹配…')
    try {
      const match = await remoteOrLocal(() => api.matchJob(state.profile!, job), () => matchLocalJob(state.profile!, job))
      patch({ job, match, assessment: null, assessmentAnswers: {}, assessmentResult: null, interview: null, interviewReport: null })
      setNotice('岗位匹配分析已完成。')
    } finally { setBusy('') }
  }

  async function createAssessment() {
    if (!state.profile || !state.job || !state.match) return setNotice('请先完成资料画像和岗位匹配。')
    setBusy('正在生成针对性笔试…')
    try {
      const assessment = await remoteOrLocal(
        () => api.createAssessment(state.profile!, state.job!, state.match!, 8),
        () => generateLocalAssessment(state.profile!, state.job!, state.match!, 8),
      )
      patch({ assessment, assessmentAnswers: {}, assessmentResult: null, interview: null, interviewReport: null })
    } finally { setBusy('') }
  }

  async function gradeAssessment() {
    if (!state.assessment) return
    setBusy('正在评分并分析薄弱项…')
    try {
      const assessmentResult = await remoteOrLocal(
        () => api.gradeAssessment(state.assessment!, state.assessmentAnswers),
        () => gradeLocalAssessment(state.assessment!, state.assessmentAnswers),
      )
      patch({ assessmentResult, interview: null, interviewReport: null })
    } finally { setBusy('') }
  }

  async function startInterview() {
    if (!state.profile || !state.job || !state.match) return setNotice('请先完成岗位分析。')
    setBusy('正在准备面试…')
    try {
      const interview = await remoteOrLocal(
        () => api.createInterview(state.profile!, state.job!, state.match!, state.assessmentResult),
        () => createLocalInterview(state.profile!, state.job!, state.match!, state.assessmentResult),
      )
      patch({ interview, interviewReport: null })
    } finally { setBusy('') }
  }

  async function sendInterviewAnswer() {
    if (!state.interview || !state.profile || !state.job || !interviewAnswer.trim()) return
    const answer = interviewAnswer.trim()
    setInterviewAnswer('')
    setBusy('面试官正在分析你的回答…')
    try {
      const response = await remoteOrLocal(
        () => api.interviewTurn(state.interview!, answer, state.profile!, state.job!),
        () => localInterviewTurn(state.interview!, answer),
      )
      patch({ interview: response.session })
    } finally { setBusy('') }
  }

  async function finishInterview() {
    if (!state.interview || !state.profile || !state.job) return
    setBusy('正在生成面试复盘…')
    try {
      const interviewReport = await remoteOrLocal(
        () => api.interviewReport(state.interview!, state.profile!, state.job!),
        () => localInterviewReport(state.interview!),
      )
      patch({ interviewReport })
      setView('review')
    } finally { setBusy('') }
  }

  function startVoiceInput() {
    const w = window as typeof window & { webkitSpeechRecognition?: new () => any; SpeechRecognition?: new () => any }
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Recognition) return setNotice('当前浏览器不支持内置语音输入，可使用文本回答或接入云 ASR。')
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event: any) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) text += event.results[i][0].transcript
      setInterviewAnswer(text)
    }
    recognition.start()
  }

  function speakLastQuestion() {
    const message = [...(state.interview?.messages ?? [])].reverse().find((m) => m.role === 'interviewer')
    if (!message || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(message.content)
    utterance.lang = 'zh-CN'
    window.speechSynthesis.speak(utterance)
  }

  function resetAll() {
    clearState()
    setState({ materials: [], profile: null, job: null, match: null, assessment: null, assessmentAnswers: {}, assessmentResult: null, interview: null, interviewReport: null })
    setTargetDirection('')
    setJobTitle('')
    setCompany('')
    setJd('')
    setView('dashboard')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">求</div><div><strong>求职 AI</strong><span>Career Copilot</span></div></div>
        <nav>{nav.map((item) => <button key={item.key} className={view === item.key ? 'nav-item active' : 'nav-item'} onClick={() => setView(item.key)}><strong>{item.label}</strong><span>{item.hint}</span></button>)}</nav>
        <div className="sidebar-foot">
          <div className="status-line"><i className={apiOnline ? 'dot online' : 'dot'} />{apiOnline ? 'AI 服务已连接' : '本地模式'}</div>
          <button className="text-button" onClick={resetAll}>清空本地数据</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="breadcrumb">求职工作台 / {nav.find((x) => x.key === view)?.label}</span></div>
          <div className="top-actions"><span className="mode-pill">{apiOnline ? 'Cloud AI' : 'Local fallback'}</span><div className="avatar">U</div></div>
        </header>

        {busy && <div className="busy-bar"><span />{busy}</div>}
        {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}

        <div className="content">
          {view === 'dashboard' && <>
            <section className="hero">
              <div><span className="eyebrow">CAREER READINESS</span><h1>把求职准备，变成一条可迭代的训练路径。</h1><p>资料、岗位、笔试、面试和复盘共用同一份职业画像。每一次训练都会明确下一步。</p><div className="hero-actions"><Button onClick={() => setView(state.profile ? 'job' : 'materials')}>{state.profile ? '继续准备' : '开始建立画像'}</Button><Button variant="secondary" onClick={loadDemo}>加载演示数据</Button></div></div>
              <div className="readiness"><div className="ring" style={{ '--score': `${ready * 3.6}deg` } as React.CSSProperties}><div><strong>{ready}</strong><span>准备度</span></div></div><p>{ready < 40 ? '先完善资料和目标岗位' : ready < 75 ? '继续完成笔试与面试训练' : '已经形成较完整的岗位训练闭环'}</p></div>
            </section>
            <section className="stats-grid">
              <Stat label="岗位匹配" value={state.match?.score ?? '--'} suffix={state.match ? '%' : ''} tone={(state.match?.score ?? 0) >= 70 ? 'good' : 'default'} />
              <Stat label="笔试成绩" value={state.assessmentResult?.score ?? '--'} suffix={state.assessmentResult ? '%' : ''} />
              <Stat label="面试评分" value={state.interviewReport?.overall_score ?? '--'} suffix={state.interviewReport ? '%' : ''} />
              <Stat label="已识别技能" value={state.profile?.skills.length ?? 0} />
            </section>
            <section className="two-col">
              <div className="card"><div className="card-head"><div><span>当前目标</span><h3>{state.job?.title || '尚未设置目标岗位'}</h3></div><Button variant="ghost" onClick={() => setView('job')}>查看</Button></div><p className="muted">{state.match?.summary || '设置 JD 后，系统会把你的资料与岗位要求进行对齐。'}</p><Chips items={state.match?.missing_skills ?? []} empty="暂时没有待补齐技能" /></div>
              <div className="card"><div className="card-head"><div><span>下一步建议</span><h3>训练优先级</h3></div></div><div className="task-list">{(state.interviewReport?.recommended_training ?? state.assessmentResult?.recommendations ?? state.match?.recommendations ?? ['上传简历和项目资料', '设置一个真实目标岗位', '完成首轮针对性训练']).slice(0, 4).map((x, i) => <div className="task" key={x}><b>{String(i + 1).padStart(2, '0')}</b><span>{x}</span></div>)}</div></div>
            </section>
          </>}

          {view === 'materials' && <>
            <SectionTitle eyebrow="01 · CAREER PROFILE" title="建立你的职业画像" text="资料只负责提供证据；画像负责让笔试和面试真正围绕你展开。" />
            <section className="two-col wide-left">
              <div className="card">
                <label className="upload-zone"><input type="file" multiple accept=".pdf,.docx,.txt,.md,.csv" onChange={(e) => handleFiles(e.target.files)} /><strong>拖入或选择简历 / 项目资料</strong><span>PDF、DOCX、TXT、MD、CSV</span></label>
                <div className="divider"><span>或粘贴内容</span></div>
                <textarea className="textarea" rows={7} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="可粘贴简历、项目说明、作品集文本…" />
                <div className="row end"><Button variant="secondary" onClick={addPastedMaterial} disabled={!pasteText.trim()}>加入资料库</Button></div>
              </div>
              <div className="card">
                <label className="field"><span>目标方向</span><input value={targetDirection} onChange={(e) => setTargetDirection(e.target.value)} placeholder="例如：嵌入式软件工程师" /></label>
                <div className="material-list">{state.materials.length ? state.materials.map((m) => <div className="material" key={m.id}><div><strong>{m.name}</strong><span>{m.kind} · {Math.max(1, Math.round(m.text.length / 1000))}k 字符</span></div><button onClick={() => patch({ materials: state.materials.filter((x) => x.id !== m.id), profile: null })}>×</button></div>) : <div className="empty">还没有资料。你也可以先使用演示数据。</div>}</div>
                <Button onClick={buildProfile} disabled={!state.materials.length}>生成 Career Profile</Button>
              </div>
            </section>
            {state.profile && <section className="card profile-card"><div className="card-head"><div><span>画像已生成</span><h3>{state.profile.headline}</h3></div><span className="score-badge">{state.profile.skills.length} skills</span></div><p>{state.profile.summary}</p><h4>核心技能</h4><Chips items={state.profile.skills} /><div className="profile-columns"><div><h4>项目证据</h4>{state.profile.projects.slice(0, 5).map((x) => <p className="evidence" key={x}>{x}</p>)}</div><div><h4>需要补强</h4>{state.profile.risks.map((x) => <p className="evidence warn-text" key={x}>{x}</p>)}</div></div><div className="row end"><Button onClick={() => setView('job')}>下一步：设置目标岗位</Button></div></section>}
          </>}

          {view === 'job' && <>
            <SectionTitle eyebrow="02 · JOB TARGET" title="把目标岗位变成训练标准" text="不要泛泛准备。直接粘贴真实 JD，系统会把能力差距转成后续训练任务。" />
            <section className="two-col wide-left"><div className="card form-card"><label className="field"><span>岗位名称</span><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="嵌入式软件工程师" /></label><label className="field"><span>公司（可选）</span><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="目标公司" /></label><label className="field"><span>职位描述 JD</span><textarea rows={12} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="粘贴招聘要求、岗位职责、任职资格…" /></label><Button onClick={analyzeJob} disabled={!state.profile}>分析岗位匹配</Button></div><div className="card"><span className="mini-label">CAREER PROFILE</span><h3>{state.profile?.headline || '尚未建立画像'}</h3><Chips items={state.profile?.skills ?? []} /><div className="soft-block"><strong>分析逻辑</strong><p>硬技能覆盖 → 项目证据 → 缺口优先级 → 转化为笔试和面试重点。</p></div></div></section>
            {state.match && <section className="card match-card"><div className="match-score"><strong>{state.match.score}</strong><span>岗位匹配度</span></div><div className="match-content"><h3>{state.job?.company ? `${state.job.company} · ` : ''}{state.job?.title}</h3><p>{state.match.summary}</p><div className="match-grid"><div><h4>已覆盖</h4><Chips items={state.match.matched_skills} empty="暂无明确覆盖" /></div><div><h4>需要补齐</h4><Chips items={state.match.missing_skills} empty="暂无明显硬技能缺口" /></div></div><div className="row end"><Button onClick={() => { setView('assessment'); if (!state.assessment) createAssessment() }}>开始针对性笔试</Button></div></div></section>}
          </>}

          {view === 'assessment' && <>
            <SectionTitle eyebrow="03 · ASSESSMENT" title="只练这个岗位真正会问的内容" text="缺失技能优先，已掌握技能用于验证深度；成绩会直接进入下一轮 AI 面试。" />
            {!state.assessment ? <div className="empty-card"><h3>还没有生成笔试</h3><p>完成岗位匹配后，系统会自动按薄弱项和 JD 生成题目。</p><Button onClick={createAssessment} disabled={!state.match}>生成 8 道针对性题目</Button></div> : <div className="assessment-layout"><div className="question-stack">{state.assessment.questions.map((q, index) => <article className="question-card" key={q.id}><div className="question-meta"><span>Q{index + 1}</span><span>{q.skill}</span><span>{q.difficulty}</span></div><h3>{q.prompt}</h3><textarea rows={5} value={state.assessmentAnswers[q.id] ?? ''} onChange={(e) => patch({ assessmentAnswers: { ...state.assessmentAnswers, [q.id]: e.target.value } })} placeholder="用面试时能直接说出口的方式回答…" />{state.assessmentResult && <div className={(state.assessmentResult.grades[index]?.score ?? 0) >= 7 ? 'feedback good' : 'feedback'}><strong>{state.assessmentResult.grades[index]?.score ?? 0}/10</strong><span>{state.assessmentResult.grades[index]?.feedback}</span></div>}</article>)}</div><aside className="exam-side card"><span className="mini-label">本轮重点</span><Chips items={state.assessment.focus_skills} /><hr /><strong>完成度</strong><p className="large-number">{Object.values(state.assessmentAnswers).filter((x) => x.trim()).length}<span> / {state.assessment.questions.length}</span></p>{!state.assessmentResult ? <Button onClick={gradeAssessment}>提交并评分</Button> : <><div className="exam-result"><strong>{state.assessmentResult.score}</strong><span>综合得分</span></div><h4>薄弱项</h4><Chips items={state.assessmentResult.weak_skills} empty="本轮没有明显薄弱项" /><Button onClick={() => setView('interview')}>进入 AI 面试</Button></>}</aside></div>}
          </>}

          {view === 'interview' && <>
            <SectionTitle eyebrow="04 · AI INTERVIEW" title="让面试官根据你的回答继续追问" text="画像、JD 和笔试薄弱项共同决定面试重点。不是固定题库顺序播放。" />
            {!state.interview ? <div className="empty-card"><h3>准备一轮综合模拟面试</h3><p>系统会优先追问你的项目、JD 缺口和刚才笔试暴露的薄弱项。</p><Button onClick={startInterview} disabled={!state.match}>开始面试</Button></div> : <div className="interview-layout"><section className="interview-room"><div className="interview-top"><div><span className="live-dot" />AI 面试进行中</div><span>第 {state.interview.turn + 1} 轮</span></div><div className="transcript">{state.interview.messages.map((m, i) => <div className={`message ${m.role}`} key={`${m.role}-${i}`}><div className="message-avatar">{m.role === 'interviewer' ? 'AI' : '我'}</div><div><span>{m.role === 'interviewer' ? '面试官' : '候选人'}</span><p>{m.content}</p></div></div>)}</div><div className="answer-box"><textarea rows={5} value={interviewAnswer} onChange={(e) => setInterviewAnswer(e.target.value)} placeholder="回答当前问题。支持键盘输入，也可使用浏览器语音输入。" /><div className="answer-actions"><div><Button variant="ghost" onClick={startVoiceInput}>语音输入</Button><Button variant="ghost" onClick={speakLastQuestion}>朗读问题</Button></div><Button onClick={sendInterviewAnswer} disabled={!interviewAnswer.trim()}>提交回答</Button></div></div></section><aside className="card interview-side"><span className="mini-label">本轮追问重点</span><Chips items={state.interview.focus_skills} /><div className="soft-block"><strong>回答结构</strong><p>结论 → 原理 → 自己的项目 → 边界与取舍。</p></div><Button variant="secondary" onClick={finishInterview}>结束并生成复盘</Button></aside></div>}
          </>}

          {view === 'review' && <>
            <SectionTitle eyebrow="05 · REVIEW" title="把每次训练变成下一轮的输入" text="复盘不是一句“表现不错”。这里聚合岗位差距、笔试薄弱项和面试表达问题。" />
            {!state.interviewReport && !state.assessmentResult ? <div className="empty-card"><h3>还没有训练结果</h3><p>完成一轮笔试或模拟面试后，这里会形成个人能力趋势和下一步任务。</p><Button onClick={() => setView('assessment')}>去训练</Button></div> : <><section className="stats-grid"><Stat label="岗位匹配" value={state.match?.score ?? '--'} suffix={state.match ? '%' : ''} /><Stat label="笔试成绩" value={state.assessmentResult?.score ?? '--'} suffix={state.assessmentResult ? '%' : ''} /><Stat label="面试成绩" value={state.interviewReport?.overall_score ?? '--'} suffix={state.interviewReport ? '%' : ''} /><Stat label="综合准备度" value={ready} suffix="%" tone={ready >= 70 ? 'good' : 'default'} /></section><section className="two-col"><div className="card"><h3>当前薄弱项</h3><Chips items={Array.from(new Set([...(state.match?.missing_skills ?? []), ...(state.assessmentResult?.weak_skills ?? [])]))} empty="暂未发现明显薄弱项" /><h4>面试反馈</h4>{state.interviewReport?.weaknesses.map((x) => <p className="evidence warn-text" key={x}>{x}</p>) ?? <p className="muted">完成 AI 面试后显示。</p>}</div><div className="card"><h3>下一轮训练</h3><div className="task-list">{(state.interviewReport?.recommended_training ?? state.assessmentResult?.recommendations ?? state.match?.recommendations ?? []).map((x, i) => <div className="task" key={x}><b>{String(i + 1).padStart(2, '0')}</b><span>{x}</span></div>)}</div></div></section>{state.interviewReport && <section className="card"><div className="card-head"><div><span>面试维度</span><h3>{state.interviewReport.summary}</h3></div><span className="score-badge">{state.interviewReport.overall_score} 分</span></div><div className="dimension-list">{Object.entries(state.interviewReport.dimensions).map(([name, score]) => <div className="dimension" key={name}><div><span>{name}</span><strong>{score}</strong></div><div className="bar"><i style={{ width: `${score}%` }} /></div></div>)}</div></section>}</>}
          </>}
        </div>
      </main>
    </div>
  )
}

export default App

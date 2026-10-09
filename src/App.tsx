import { useMemo, useState } from 'react'
import { analyzeJob, buildCareerProfile, generateAssessment, gradeAssessment } from './lib/careerEngine'
import { parseCareerFile } from './lib/fileParser'
import type { AssessmentResult, CareerProfile, JobTarget, MatchReport, Question } from './types'

const SAMPLE_RESUME = `李明｜嵌入式软件工程师\n硕士，电子信息。熟悉 C/C++、STM32、FreeRTOS、Linux、CAN、Modbus、MQTT。\n项目：基于 STM32G4 开发 PMSM FOC 电机控制器，负责 ADC 同步采样、PWM、SVPWM、电流环和保护逻辑。\n项目：基于 Linux 开发工业网关，完成 Modbus、MQTT、SocketCAN、多线程与 OTA。\n使用 Git 进行版本管理，能够使用 Python 编写测试与数据处理脚本。`

const SAMPLE_JD = `嵌入式软件工程师\n1. 熟练掌握 C/C++，具备良好的数据结构与算法基础；\n2. 熟悉 Linux、多线程、TCP/IP 网络编程；\n3. 熟悉 STM32、FreeRTOS，有 CAN 或 Modbus 开发经验；\n4. 熟悉 Git，了解 Docker 优先；\n5. 具备良好的问题定位和工程实践能力。`

const steps = ['资料', '岗位', '匹配', '笔试', '复盘']

function App() {
  const [step, setStep] = useState(0)
  const [resumeText, setResumeText] = useState('')
  const [fileNames, setFileNames] = useState<string[]>([])
  const [profile, setProfile] = useState<CareerProfile | null>(null)
  const [jobTitle, setJobTitle] = useState('')
  const [jdText, setJdText] = useState('')
  const [target, setTarget] = useState<JobTarget | null>(null)
  const [report, setReport] = useState<MatchReport | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const completed = useMemo(() => [Boolean(profile), Boolean(target), Boolean(report), Boolean(result), Boolean(result)], [profile, target, report, result])

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError('')
    try {
      const chunks: string[] = []
      const names: string[] = []
      for (const file of Array.from(files)) {
        chunks.push(await parseCareerFile(file))
        names.push(file.name)
      }
      setResumeText((current) => [current, ...chunks].filter(Boolean).join('\n\n'))
      setFileNames((current) => [...current, ...names])
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败，请尝试粘贴文本。')
    } finally {
      setBusy(false)
    }
  }

  function createProfile() {
    if (resumeText.trim().length < 20) {
      setError('请先上传资料或粘贴至少一段简历内容。')
      return
    }
    setError('')
    setProfile(buildCareerProfile(resumeText))
    setStep(1)
  }

  function runMatch() {
    if (!profile) return
    if (!jobTitle.trim() || jdText.trim().length < 20) {
      setError('请填写目标岗位，并粘贴完整 JD。')
      return
    }
    setError('')
    const next = analyzeJob(profile, jobTitle, jdText)
    setTarget(next.target)
    setReport(next.report)
    setStep(2)
  }

  function startAssessment() {
    if (!profile || !target || !report) return
    setQuestions(generateAssessment(profile, target, report, 6))
    setAnswers({})
    setResult(null)
    setStep(3)
  }

  function submitAssessment() {
    if (Object.keys(answers).length < questions.length) {
      setError('请完成全部题目后再提交。')
      return
    }
    setError('')
    const next = gradeAssessment(questions, answers)
    setResult(next)
    setStep(4)
  }

  function loadDemo() {
    setResumeText(SAMPLE_RESUME)
    setJobTitle('嵌入式软件工程师')
    setJdText(SAMPLE_JD)
    setFileNames(['示例简历.txt'])
    setError('')
  }

  function resetAll() {
    setStep(0)
    setResumeText('')
    setFileNames([])
    setProfile(null)
    setJobTitle('')
    setJdText('')
    setTarget(null)
    setReport(null)
    setQuestions([])
    setAnswers({})
    setResult(null)
    setError('')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">求</div>
          <div><strong>求职 AI</strong><span>Career Copilot</span></div>
        </div>
        <nav>
          {steps.map((label, index) => (
            <button key={label} className={`nav-item ${step === index ? 'active' : ''}`} onClick={() => index <= step && setStep(index)}>
              <span className="step-dot">{completed[index] ? '✓' : index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> MVP 本地模式
          <p>无需 API Key，先验证完整求职训练闭环。</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">PHASE 1 · CLOSED LOOP</p>
            <h1>{['建立求职画像', '选择目标岗位', '岗位匹配分析', '针对性笔试', '训练复盘'][step]}</h1>
          </div>
          <button className="ghost" onClick={resetAll}>重新开始</button>
        </header>

        {error && <div className="alert">{error}</div>}

        {step === 0 && (
          <section className="grid two-col">
            <div className="card primary-card">
              <div className="section-heading">
                <div><span className="badge">01</span><h2>上传简历与资料</h2></div>
                <button className="text-button" onClick={loadDemo}>载入示例</button>
              </div>
              <label className="dropzone">
                <input type="file" multiple accept=".pdf,.docx,.txt,.md,.csv" onChange={(e) => handleFiles(e.target.files)} />
                <div className="upload-icon">↑</div>
                <strong>{busy ? '正在解析…' : '拖入或选择文件'}</strong>
                <span>PDF / DOCX / TXT / MD / CSV，可一次上传多个资料</span>
              </label>
              {fileNames.length > 0 && <div className="file-list">{fileNames.map((name) => <span key={name}>{name}</span>)}</div>}
              <div className="divider"><span>或直接粘贴</span></div>
              <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="粘贴简历、项目经历、作品说明等文本…" rows={12} />
              <button className="primary" onClick={createProfile}>生成 Career Profile <span>→</span></button>
            </div>

            <div className="card insight-card">
              <p className="eyebrow">为什么先做画像</p>
              <h2>后面的笔试与面试，都基于同一份“你是谁”。</h2>
              <div className="flow-list">
                <div><span>1</span><p><strong>资料结构化</strong>从简历与项目材料识别技术栈与经历证据。</p></div>
                <div><span>2</span><p><strong>岗位对齐</strong>对比 JD，而不是泛化地推荐“热门题”。</p></div>
                <div><span>3</span><p><strong>训练回流</strong>错题和薄弱项继续写回画像，服务后续 AI 面试。</p></div>
              </div>
            </div>
          </section>
        )}

        {step === 1 && profile && (
          <section className="grid two-col">
            <div className="card">
              <span className="badge success">画像已生成</span>
              <h2>系统目前识别到 {profile.skills.length} 项技能</h2>
              <div className="skill-cloud">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              <h3>经历证据</h3>
              <div className="evidence-list">{profile.highlights.map((item) => <p key={item}>{item}</p>)}</div>
            </div>
            <div className="card primary-card">
              <span className="badge">02</span>
              <h2>输入目标岗位</h2>
              <label className="field"><span>岗位名称</span><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="例如：嵌入式软件工程师" /></label>
              <label className="field"><span>岗位 JD</span><textarea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={14} placeholder="粘贴招聘岗位的职责与要求…" /></label>
              <button className="primary" onClick={runMatch}>分析岗位匹配 <span>→</span></button>
            </div>
          </section>
        )}

        {step === 2 && report && target && (
          <section className="stack">
            <div className="score-hero card">
              <div className="score-ring" style={{ '--score': `${report.score * 3.6}deg` } as React.CSSProperties}><div><strong>{report.score}</strong><span>匹配度</span></div></div>
              <div className="score-copy"><p className="eyebrow">{target.title}</p><h2>{report.score >= 75 ? '匹配度较高，可以进入针对性训练。' : '存在明确能力缺口，先补弱项再强化项目表达。'}</h2><p>已覆盖 {report.matchedSkills.length} 项岗位技能，待补齐 {report.missingSkills.length} 项。</p></div>
              <button className="primary compact" onClick={startAssessment}>生成针对性笔试 →</button>
            </div>
            <div className="grid two-col">
              <div className="card"><h3>已覆盖技能</h3><div className="skill-cloud positive">{report.matchedSkills.length ? report.matchedSkills.map((s) => <span key={s}>{s}</span>) : <p className="muted">尚未识别到明显交集</p>}</div><div className="list-block">{report.strengths.map((s) => <p key={s}>✓ {s}</p>)}</div></div>
              <div className="card"><h3>优先补齐</h3><div className="skill-cloud warning">{report.missingSkills.length ? report.missingSkills.map((s) => <span key={s}>{s}</span>) : <span>暂无明显缺口</span>}</div><div className="list-block">{report.suggestions.map((s) => <p key={s}>→ {s}</p>)}</div></div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="assessment-layout">
            <div className="question-list">
              {questions.map((question, qIndex) => (
                <article className="card question-card" key={question.id}>
                  <div className="question-meta"><span>Q{qIndex + 1}</span><span>{question.skill}</span></div>
                  <h3>{question.prompt}</h3>
                  <div className="options">
                    {question.options.map((option, index) => (
                      <label key={option} className={answers[question.id] === index ? 'selected' : ''}>
                        <input type="radio" name={question.id} checked={answers[question.id] === index} onChange={() => setAnswers((current) => ({ ...current, [question.id]: index }))} />
                        <span className="option-key">{String.fromCharCode(65 + index)}</span>{option}
                      </label>
                    ))}
                  </div>
                </article>
              ))}
              <button className="primary wide" onClick={submitAssessment}>提交笔试并生成复盘</button>
            </div>
            <aside className="card exam-sidebar"><p className="eyebrow">TARGETED TEST</p><h3>岗位定向题</h3><strong>{Object.keys(answers).length}/{questions.length}</strong><span>已完成</span><div className="progress"><i style={{ width: `${questions.length ? Object.keys(answers).length / questions.length * 100 : 0}%` }} /></div><p>题目优先覆盖 JD 缺失项，再验证你简历中的核心技能。</p></aside>
          </section>
        )}

        {step === 4 && result && (
          <section className="stack">
            <div className="result-hero card">
              <div><p className="eyebrow">本轮训练完成</p><h2>{result.score} 分</h2><p>答对 {result.correct}/{result.total} 题。系统已经定位到下一轮应该优先训练的方向。</p></div>
              <button className="ghost" onClick={startAssessment}>再练一轮</button>
            </div>
            <div className="grid two-col">
              <div className="card"><h3>优先弱项</h3>{result.weakSkills.length ? <div className="skill-cloud warning">{result.weakSkills.map((s) => <span key={s}>{s}</span>)}</div> : <p className="success-text">本轮全部答对，可以进入 AI 面试训练。</p>}<div className="recommendation"><strong>下一步建议</strong><p>{result.weakSkills.length ? `围绕 ${result.weakSkills.slice(0, 3).join('、')} 各做一组专项题，并准备可口述的项目例子。` : '开始项目深挖与语音模拟面试，重点验证表达完整性和追问应对。'}</p></div></div>
              <div className="card"><h3>错题复盘</h3><div className="review-list">{result.review.filter((r) => !r.correct).map((r) => <div key={r.question.id}><strong>{r.question.skill} · {r.question.prompt}</strong><p>{r.question.explanation}</p></div>)}{result.review.every((r) => r.correct) && <p className="muted">没有错题。</p>}</div></div>
            </div>
            <div className="next-phase"><span>闭环完成</span><p>资料 → Career Profile → JD 匹配 → 定向笔试 → 复盘建议</p></div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App

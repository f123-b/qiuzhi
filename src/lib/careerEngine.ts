import type { AssessmentResult, CareerProfile, JobTarget, MatchReport, Question } from '../types'

const SKILLS = [
  { name: 'C/C++', aliases: ['c++', 'c/c++', 'cplusplus', 'cpp'] },
  { name: 'Python', aliases: ['python'] },
  { name: 'Java', aliases: ['java'] },
  { name: 'Linux', aliases: ['linux', '嵌入式 linux', 'embedded linux'] },
  { name: 'FreeRTOS', aliases: ['freertos', 'rtos', '实时操作系统'] },
  { name: 'STM32', aliases: ['stm32', 'stm32f4', 'stm32g4'] },
  { name: 'ROS2', aliases: ['ros2', 'ros 2'] },
  { name: 'PyTorch', aliases: ['pytorch'] },
  { name: 'OpenCV', aliases: ['opencv'] },
  { name: 'SQL', aliases: ['sql', 'mysql', 'postgresql', 'sqlite'] },
  { name: 'Docker', aliases: ['docker', '容器'] },
  { name: 'Git', aliases: ['git', 'github'] },
  { name: 'TCP/IP', aliases: ['tcp/ip', 'tcp', 'udp', 'socket'] },
  { name: 'CAN', aliases: ['socketcan', 'can总线', ' can ', 'can bus'] },
  { name: 'Modbus', aliases: ['modbus'] },
  { name: 'MQTT', aliases: ['mqtt'] },
  { name: 'FOC', aliases: ['foc', '矢量控制', 'svpwm', 'pmsm'] },
  { name: '数据结构', aliases: ['数据结构', 'data structure', '链表', '二叉树'] },
  { name: '算法', aliases: ['算法', 'algorithm', 'leetcode'] },
  { name: '操作系统', aliases: ['操作系统', 'operating system', '进程', '线程'] },
  { name: '计算机网络', aliases: ['计算机网络', 'computer network', 'http', 'https'] },
  { name: 'React', aliases: ['react', 'reactjs'] },
  { name: 'TypeScript', aliases: ['typescript', ' ts '] },
  { name: 'Node.js', aliases: ['node.js', 'nodejs'] },
]

const normalize = (text: string) => ` ${text.toLowerCase().replace(/\s+/g, ' ')} `

export function extractSkills(text: string): string[] {
  const source = normalize(text)
  return SKILLS.filter((skill) => skill.aliases.some((alias) => source.includes(alias.toLowerCase())))
    .map((skill) => skill.name)
}

export function buildCareerProfile(sourceText: string): CareerProfile {
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 10)

  const highlightKeywords = ['项目', '负责', '实现', '优化', '开发', '设计', 'intern', 'project', 'developed']
  const highlights = lines
    .filter((line) => highlightKeywords.some((keyword) => line.toLowerCase().includes(keyword)))
    .slice(0, 5)

  return {
    sourceText,
    skills: extractSkills(sourceText),
    highlights: highlights.length ? highlights : lines.slice(0, 3),
    updatedAt: new Date().toISOString(),
  }
}

export function analyzeJob(profile: CareerProfile, title: string, jdText: string): { target: JobTarget; report: MatchReport } {
  const requiredSkills = extractSkills(`${title}\n${jdText}`)
  const matchedSkills = requiredSkills.filter((skill) => profile.skills.includes(skill))
  const missingSkills = requiredSkills.filter((skill) => !profile.skills.includes(skill))
  const score = requiredSkills.length
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : Math.min(85, 55 + profile.skills.length * 4)

  const strengths = matchedSkills.length
    ? matchedSkills.slice(0, 4).map((skill) => `${skill} 已在你的资料中出现，可作为面试重点证据。`)
    : ['当前简历与 JD 的显式技能交集较少，建议补充项目细节和技术关键词。']

  const suggestions = missingSkills.length
    ? missingSkills.slice(0, 5).map((skill) => `补齐 ${skill}：先掌握核心概念，再准备 2~3 个能口述的实战例子。`)
    : ['岗位关键技能覆盖较完整，下一步应重点训练项目深挖和场景追问。']

  return {
    target: { title, jdText, requiredSkills },
    report: { score, matchedSkills, missingSkills, strengths, suggestions },
  }
}

const BANK: Record<string, Omit<Question, 'id' | 'skill'>> = {
  'C/C++': {
    prompt: 'C++ 中，为了让一个基类能够被安全地通过基类指针删除派生类对象，析构函数通常应该怎样声明？',
    options: ['static', 'virtual', 'inline', 'constexpr'],
    correctIndex: 1,
    explanation: '基类析构函数声明为 virtual，可确保通过基类指针 delete 时正确调用派生类析构函数。',
  },
  Linux: {
    prompt: 'Linux 用户态程序访问设备时，mmap 最主要的价值是什么？',
    options: ['自动创建线程', '建立用户虚拟地址与目标内存区域的映射', '提升 CPU 主频', '绕过所有权限检查'],
    correctIndex: 1,
    explanation: 'mmap 用于建立虚拟地址映射，可减少不必要的数据拷贝并方便访问共享或设备内存。',
  },
  FreeRTOS: {
    prompt: 'FreeRTOS 中经典的优先级反转问题，最常见的缓解机制是什么？',
    options: ['优先级继承', '关闭调度器永久运行', '所有任务设置同一优先级', '禁用中断'],
    correctIndex: 0,
    explanation: '互斥量通常结合优先级继承，让持锁低优先级任务临时提升优先级，降低高优先级任务被阻塞时间。',
  },
  STM32: {
    prompt: '在 STM32 电机控制中，将 ADC 采样触发点放在 PWM 相对稳定区间的主要目的是什么？',
    options: ['降低 Flash 占用', '避开开关沿噪声，提高电流采样质量', '提高串口波特率', '增加定时器数量'],
    correctIndex: 1,
    explanation: '功率器件开关沿噪声大，同步到稳定采样窗口能明显改善电流反馈质量。',
  },
  'TCP/IP': {
    prompt: 'TCP 与 UDP 相比，TCP 最典型的特征是什么？',
    options: ['无连接且不保证顺序', '面向连接并提供可靠有序传输', '只能局域网使用', '不需要端口号'],
    correctIndex: 1,
    explanation: 'TCP 是面向连接的可靠字节流协议，包含确认、重传、排序和拥塞控制等机制。',
  },
  SQL: {
    prompt: '数据库索引通常以什么代价换取查询性能提升？',
    options: ['更多存储空间和写入维护开销', '完全取消事务', '禁用缓存', '只能保存整数'],
    correctIndex: 0,
    explanation: '索引需要额外存储，并在 INSERT/UPDATE/DELETE 时维护，因此读性能和写入成本之间需要权衡。',
  },
  Docker: {
    prompt: 'Docker 镜像与容器的关系，更准确的描述是？',
    options: ['镜像是运行中的进程，容器是源码', '容器通常是镜像的运行实例', '二者完全无关', '镜像只能在 Windows 使用'],
    correctIndex: 1,
    explanation: '镜像是不可变的模板，容器是基于镜像创建并运行的实例。',
  },
  算法: {
    prompt: '对一个已排序数组进行二分查找，平均时间复杂度通常是？',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctIndex: 1,
    explanation: '二分查找每次将搜索区间缩小一半，因此时间复杂度为 O(log n)。',
  },
  数据结构: {
    prompt: '单链表与数组相比，单链表在已知节点位置后插入元素的典型优势是什么？',
    options: ['无需移动大量连续元素', '支持 O(1) 随机访问任意下标', '天然有序', '内存一定更少'],
    correctIndex: 0,
    explanation: '链表修改指针即可完成局部插入，不需要像数组一样移动后续连续元素。',
  },
  操作系统: {
    prompt: '线程死锁成立通常需要同时满足哪类条件？',
    options: ['互斥、占有且等待、不可剥夺、循环等待', '高 CPU、高内存、高磁盘、高网络', '读、写、执行、删除', '创建、运行、暂停、退出'],
    correctIndex: 0,
    explanation: '经典 Coffman 四条件是互斥、占有且等待、不可剥夺和循环等待。',
  },
  React: {
    prompt: 'React 中 state 更新后通常会发生什么？',
    options: ['触发相关组件重新渲染', '自动重启浏览器', '删除 DOM', '清空所有网络请求'],
    correctIndex: 0,
    explanation: '状态变化会促使 React 重新计算相关 UI，并按差异更新 DOM。',
  },
  TypeScript: {
    prompt: 'TypeScript 相比 JavaScript 的核心增量能力之一是什么？',
    options: ['静态类型系统', '浏览器内核', '数据库引擎', 'GPU 驱动'],
    correctIndex: 0,
    explanation: 'TypeScript 在 JavaScript 之上提供静态类型、类型推导和编译期检查。',
  },
}

function genericQuestion(skill: string): Omit<Question, 'id' | 'skill'> {
  return {
    prompt: `目标岗位明确涉及 ${skill}。面试前最有效的准备方式是哪一种？`,
    options: [
      '只背一个定义，不准备案例',
      '理解核心原理，并准备与自己经历相关的案例和追问',
      '完全跳过，等面试官解释',
      '只记住英文全称',
    ],
    correctIndex: 1,
    explanation: `对于 ${skill}，岗位训练应同时覆盖原理、实战证据和常见追问。`,
  }
}

export function generateAssessment(profile: CareerProfile, target: JobTarget, report: MatchReport, count = 6): Question[] {
  const priority = [...report.missingSkills, ...report.matchedSkills, ...profile.skills, ...target.requiredSkills]
  const unique = Array.from(new Set(priority))
  const fallbacks = ['算法', '操作系统', 'C/C++', 'Linux', '数据结构']
  const selected = Array.from(new Set([...unique, ...fallbacks])).slice(0, count)

  return selected.map((skill, index) => ({
    id: `q-${index + 1}`,
    skill,
    ...(BANK[skill] ?? genericQuestion(skill)),
  }))
}

export function gradeAssessment(questions: Question[], answers: Record<string, number>): AssessmentResult {
  const review = questions.map((question) => {
    const selectedIndex = answers[question.id] ?? null
    return {
      question,
      selectedIndex,
      correct: selectedIndex === question.correctIndex,
    }
  })
  const correct = review.filter((item) => item.correct).length
  const weakSkills = Array.from(new Set(review.filter((item) => !item.correct).map((item) => item.question.skill)))

  return {
    score: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    correct,
    total: questions.length,
    weakSkills,
    review,
  }
}

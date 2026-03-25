'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Video, 
  Share2, 
  CheckCircle2, 
  Copy, 
  RotateCcw,
  TrendingUp,
  Sparkles,
  Calendar,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

type Step = 'theme' | 'scenario' | 'kling' | 'marketing';

interface Scene {
  sceneNumber: number;
  description: string;
}

interface KlingPrompt {
  sceneNumber: number;
  englishPrompt: string;
}

interface MarketingPlan {
  title: string;
  hashtags: string;
  description: string;
}

interface HistoryItem {
  id: string;
  theme: string;
  scenario: Scene[];
  klingPrompts: KlingPrompt[];
  marketing: MarketingPlan | null;
  timestamp: string;
}

const AGENTS = [
  { id: 'theme', name: '트랜드 분석가', icon: TrendingUp },
  { id: 'scenario', name: '시나리오 작가', icon: PenTool },
  { id: 'kling', name: 'Kling 프롬프트', icon: Video },
  { id: 'marketing', name: '마케터', icon: Share2 },
];

export default function Page() {
  const [inputTheme, setInputTheme] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scene[]>([]);
  const [klingPrompts, setKlingPrompts] = useState<KlingPrompt[]>([]);
  const [marketing, setMarketing] = useState<MarketingPlan | null>(null);
  const [loadingStep, setLoadingStep] = useState<Step | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showKeywordInfo, setShowKeywordInfo] = useState(false);

  useEffect(() => {
    // Load trends
    fetch('/api/trends')
      .then(res => res.json())
      .then(data => {
        if (data.trends) setWeeklyTrends(data.trends);
      })
      .catch(err => console.error('Trends fetch error:', err));

    // Load history from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('youtube_pipeline_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    }
  }, []);

  const saveToHistory = (item: HistoryItem) => {
    const updated = [item, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('youtube_pipeline_history', JSON.stringify(updated));
  };

  const fetchAgent = async (step: Step, body: any) => {
    setLoadingStep(step);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, ...body }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error(`${step} agent error:`, error);
      alert(`${step} 단계 중 오류가 발생했습니다.`);
      return null;
    } finally {
      setLoadingStep(null);
    }
  };

  const handleRecommendTheme = async () => {
    const data = await fetchAgent('theme', {});
    if (data && data.themes) {
      setThemes(data.themes);
      setCompletedSteps(['theme']);
    }
  };

  const startPipeline = async () => {
    if (!selectedTheme) return;

    setScenario([]);
    setKlingPrompts([]);
    setMarketing(null);
    setCompletedSteps(['theme']);

    const scenarioData = await fetchAgent('scenario', { theme: selectedTheme });
    if (!scenarioData) return;
    setScenario(scenarioData.scenario);
    setCompletedSteps(['theme', 'scenario']);

    const klingData = await fetchAgent('kling', { scenario: scenarioData.scenario });
    if (!klingData) return;
    setKlingPrompts(klingData.prompts);
    setCompletedSteps(['theme', 'scenario', 'kling']);

    const marketingData = await fetchAgent('marketing', { theme: selectedTheme });
    if (!marketingData) return;
    setMarketing(marketingData);
    setCompletedSteps(['theme', 'scenario', 'kling', 'marketing']);

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      theme: selectedTheme,
      scenario: scenarioData.scenario,
      klingPrompts: klingData.prompts,
      marketing: marketingData,
      timestamp: new Date().toLocaleString(),
    };
    saveToHistory(newItem);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setSelectedTheme(item.theme);
    setScenario(item.scenario);
    setKlingPrompts(item.klingPrompts);
    setMarketing(item.marketing);
    setCompletedSteps(['theme', 'scenario', 'kling', 'marketing']);
    setShowHistory(false);
  };

  const saveAllThemesToNotion = async () => {
    if (themes.length === 0) return;
    setLoadingStep('theme');
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes }),
      });
      const data = await res.json();
      if (data.success) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Notion save error:', err);
      alert('노션 저장에 실패했습니다.');
    } finally {
      setLoadingStep(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다.');
  };

  const resetAll = () => {
    setInputTheme('');
    setThemes([]);
    setSelectedTheme(null);
    setScenario([]);
    setKlingPrompts([]);
    setMarketing(null);
    setCompletedSteps([]);
  };

  return (
    <div className="main-container" suppressHydrationWarning>
      <header className="header">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '1rem' }}
        >
          <Sparkles color="var(--accent-color)" size={40} />
        </motion.div>
        <motion.h1 
          className="title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          AI Shorts Agent
        </motion.h1>
        <p className="subtitle">AI 유튜브 쇼츠 자동화 파이프라인</p>
      </header>

      {/* Integrated Trends & Keywords Section */}
      <section className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={28} color="var(--accent-color)" /> 이번 주 추천 트렌드 & 키워드
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowKeywordInfo(!showKeywordInfo)}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: showKeywordInfo ? 'var(--accent-color)' : 'var(--text-secondary)' }}
            >
              <HelpCircle size={20} />
            </motion.button>
          </h2>
        </div>

        <AnimatePresence>
          {showKeywordInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              style={{ 
                background: 'rgba(99, 102, 241, 0.08)', 
                border: '1px solid rgba(99, 102, 241, 0.15)',
                borderRadius: '16px',
                padding: '1.2rem',
                fontSize: '0.9rem',
                overflow: 'hidden'
              }}
            >
              <p style={{ fontWeight: 700, marginBottom: '0.6rem', color: 'var(--accent-color)' }}>💡 키워드 선정 기준</p>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'disc' }}>
                <li><strong>대상:</strong> 3-7세 어린이 및 그 부모님</li>
                <li><strong>컨셉:</strong> "왜 안돼?" (호기심과 안전 교육의 결합)</li>
                <li><strong>기준:</strong> 시각적 대비가 뚜렷한 안전 수칙, 의외의 과학 상식, 대자연의 신비</li>
                <li><strong>출처:</strong> Google Gemini AI ('왜 안돼?' 안전/교육 테마 기반 자동 분석)</li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keywords Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          {weeklyTrends.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>트렌드 데이터를 불러오는 중...</p>
          ) : (
            Array.from(new Set(weeklyTrends.map(t => t.keyword))).map((keyword, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="keyword-tag"
                onClick={() => {
                  setInputTheme(keyword);
                  setSelectedTheme(keyword);
                  setThemes([keyword]);
                  setCompletedSteps(['theme']);
                }}
                style={{ padding: '0.5rem 1.2rem' }}
              >
                #{keyword}
              </motion.button>
            ))
          )}
        </div>

        {/* Trends Cards Grid - Always visible */}
        <div 
          id="trends-container"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}
        >
          {weeklyTrends.map((trend, idx) => (
            <motion.div 
              key={idx}
              className="list-item"
              style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.04)', position: 'relative', margin: 0 }}
              onClick={() => {
                setInputTheme(trend.theme);
                setSelectedTheme(trend.theme);
                setThemes([trend.theme]);
                setCompletedSteps(['theme']);
              }}
              whileHover={{ y: -8, background: 'rgba(255, 255, 255, 0.08)' }}
            >
              <span style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.2rem 0.6rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px', fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                {trend.target}
              </span>
              <Sparkles size={14} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--accent-color)' }} />
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {trend.theme}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {trend.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-color)' }}>#{trend.keyword}</span>
                  <ChevronRight size={16} color="var(--text-secondary)" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Step Progress */}
      <div className="agent-steps">
          {AGENTS.map((agent) => {
          const isCompleted = completedSteps.includes(agent.id as Step);
          const isActive = loadingStep === agent.id;
          return (
            <div key={agent.id} className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
              <div className="step-icon">
                {isCompleted ? <CheckCircle2 size={24} /> : isActive ? <div className="loader" /> : <agent.icon size={24} />}
              </div>
              <span className="step-label">{agent.name}</span>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <button 
          className="btn-secondary" 
          onClick={() => setShowHistory(!showHistory)}
          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
        >
          {showHistory ? '히스토리 닫기' : '이전 기록 보기 (History)'}
        </button>
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel"
            style={{ marginBottom: '2rem', padding: '1.5rem', overflow: 'hidden' }}
          >
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={18} /> 최근 생성 기록
            </h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>아직 저장된 기록이 없습니다.</p>
            ) : (
              <div className="history-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      className="list-item" 
                      onClick={() => loadFromHistory(item)}
                      style={{ padding: '0.8rem', fontSize: '0.9rem' }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--accent-color)', marginBottom: '4px' }}>{item.theme}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <main>
        {/* Input Section */}
        <section className="glass-panel">
          <div className="input-group">
            <input 
              type="text" 
              placeholder="주제를 직접 입력하거나 추천받으세요..." 
              value={inputTheme}
              onChange={(e) => setInputTheme(e.target.value)}
            />
            <button className="btn-secondary" onClick={() => { setSelectedTheme(inputTheme); setThemes([inputTheme]); setCompletedSteps(['theme']) }}>
              확인
            </button>
            <button className="btn-primary" onClick={handleRecommendTheme} disabled={!!loadingStep}>
              {loadingStep === 'theme' ? '분석 중...' : '주제 추천'}
            </button>
          </div>

          <AnimatePresence>
            {themes.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="theme-list"
              >
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>주제를 선택하세요:</p>
                {themes.map((t, idx) => (
                  <div 
                    key={idx} 
                    className={`list-item ${selectedTheme === t ? 'selected-item' : ''}`}
                    onClick={() => setSelectedTheme(t)}
                  >
                    {t}
                  </div>
                ))}
                
                {selectedTheme && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <button className="btn-secondary" onClick={saveAllThemesToNotion} disabled={!!loadingStep}>
                      모든 주제 노션에 저장
                    </button>
                    <button className="btn-primary" onClick={startPipeline} disabled={!!loadingStep}>
                      {loadingStep ? '에이전트 작업 중...' : '자동화 파이프라인 시작'}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {scenario.length > 0 && (
            <motion.section 
              key="scenario-section"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel result-section"
            >
              <div className="result-header">
                <h2 className="result-title">🎬 시나리오 (스토리보드)</h2>
                <button className="copy-btn btn-secondary" onClick={() => copyToClipboard(scenario.map(s => `${s.sceneNumber}. ${s.description}`).join('\n'))}>
                  <Copy size={14} style={{ marginRight: '5px', display: 'inline' }} /> 복사
                </button>
              </div>
              <div className="content-box">
                {scenario.map((s) => (
                  <div key={s.sceneNumber} style={{ marginBottom: '1rem' }}>
                    <strong>장면 {s.sceneNumber}:</strong> {s.description}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {klingPrompts.length > 0 && (
            <motion.section 
              key="kling-section"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel result-section"
            >
              <div className="result-header">
                <h2 className="result-title">🖼️ Kling AI 영상 프롬프트</h2>
                <button className="copy-btn btn-secondary" onClick={() => copyToClipboard(klingPrompts.map(p => `Scene ${p.sceneNumber}: ${p.englishPrompt}`).join('\n'))}>
                  <Copy size={14} style={{ marginRight: '5px', display: 'inline' }} /> 복사
                </button>
              </div>
              <div className="content-box">
                {klingPrompts.map((p) => (
                  <div key={p.sceneNumber} style={{ marginBottom: '1rem' }}>
                    <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Scene {p.sceneNumber}</p>
                    <p style={{ fontSize: '0.9rem', color: '#ccc', fontStyle: 'italic' }}>{p.englishPrompt}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {marketing && (
            <motion.section 
              key="marketing-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel result-section"
            >
              <div className="result-header">
                <h2 className="result-title">📈 마케팅 데이터</h2>
                <button className="copy-btn btn-secondary" onClick={() => copyToClipboard(`제목: ${marketing.title}\n\n해시태그: ${marketing.hashtags}\n\n설명: ${marketing.description}`)}>
                  <Copy size={14} style={{ marginRight: '5px', display: 'inline' }} /> 전체 복사
                </button>
              </div>
              <div className="content-box">
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>추천 제목</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{marketing.title}</p>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>해시태그 (30개)</p>
                  <p style={{ color: '#3b82f6', wordBreak: 'break-all' }}>{marketing.hashtags}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>영상 설명</p>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem' }}>{marketing.description}</pre>
                </div>
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button className="btn-secondary" onClick={resetAll} style={{ display: 'flex', alignItems: 'center', margin: '0 auto', gap: '8px' }}>
                  <RotateCcw size={16} /> 프로젝트 초기화
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        © 2026 AI Shorts Agent. Inspired by Premium AI Workflow.
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{ 
              position: 'fixed', 
              bottom: '2rem', 
              right: '2rem', 
              background: 'var(--success-color)', 
              color: 'white', 
              padding: '1rem 2rem', 
              borderRadius: '12px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <CheckCircle2 size={20} />
            노션 데이터베이스에 성공적으로 저장되었습니다!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

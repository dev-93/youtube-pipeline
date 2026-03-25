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

interface Marketing {
  title: string;
  hashtags: string;
  description: string;
}

interface HistoryItem {
  id: string;
  theme: string;
  scenario: Scene[];
  klingPrompts: KlingPrompt[];
  marketing: Marketing;
  timestamp: string;
}

const AGENTS = [
  { id: 'theme', name: '트렌드 분석가', icon: TrendingUp },
  { id: 'scenario', name: '시나리오 작가', icon: PenTool },
  { id: 'kling', name: 'Kling 프롬프트', icon: Video },
  { id: 'marketing', name: '마케터', icon: Share2 },
];

interface TrendItem {
  keyword: string;
  theme: string;
  description: string;
  target: string;
}

const Page = () => {
  const [inputTheme, setInputTheme] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [scenario, setScenario] = useState<Scene[]>([]);
  const [klingPrompts, setKlingPrompts] = useState<KlingPrompt[]>([]);
  const [marketing, setMarketing] = useState<Marketing | null>(null);
  
  const [loadingStep, setLoadingStep] = useState<Step | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [weeklyTrends, setWeeklyTrends] = useState<TrendItem[]>([]);
  const [showWeeklyTrends, setShowWeeklyTrends] = useState(true);
  
  const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'success' | 'error' }>({
    message: '',
    visible: false,
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, visible: true, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  // Load history on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('youtube_history');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch {
          console.error('Failed to parse history');
        }
      }
    }
  });

  // Save history when it changes
  const saveToHistory = (newItem: HistoryItem) => {
    const updated = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(updated);
    localStorage.setItem('youtube_history', JSON.stringify(updated));
  };

  // Fetch weekly trends on mount
  useEffect(() => {
    const fetchWeeklyTrends = async () => {
      try {
        const res = await fetch('/api/trends');
        const data = await res.json();
        if (data.trends) {
          setWeeklyTrends(data.trends);
        }
      } catch (err) {
        console.error('Failed to fetch weekly trends', err);
      }
    };
    fetchWeeklyTrends();
  }, []);

  const fetchAgent = async (step: Step, body: Record<string, unknown>) => {
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
    } catch (err) {
      console.error(err);
      showToast('에러가 발생했습니다. 다시 시도해주세요.', 'error');
      return null;
    } finally {
      setLoadingStep(null);
    }
  };

  const handleRecommendTheme = async () => {
    const data = await fetchAgent('theme', {});
    if (data && data.themes) {
      setThemes(data.themes);
      setCompletedSteps(prev => [...prev.filter(s => s !== 'theme'), 'theme']);
    }
  };

  const startPipeline = async () => {
    if (!selectedTheme) return showToast('주제를 먼저 선택해주세요.', 'error');

    // Step 2: Scenario
    const scenarioData = await fetchAgent('scenario', { theme: selectedTheme });
    if (!scenarioData) return;
    setScenario(scenarioData.scenes);
    setCompletedSteps(prev => [...prev, 'scenario']);

    // Step 3: Kling
    const klingData = await fetchAgent('kling', { scenes: scenarioData.scenes });
    if (!klingData) return;
    setKlingPrompts(klingData.prompts);
    setCompletedSteps(prev => [...prev, 'kling']);

    // Step 4: Marketing
    const marketingData = await fetchAgent('marketing', { theme: selectedTheme });
    if (!marketingData) return;
    setMarketing(marketingData);
    setCompletedSteps(prev => [...prev, 'marketing']);

    // Save to history
    saveToHistory({
      id: Date.now().toString(),
      theme: selectedTheme,
      scenario: scenarioData.scenes,
      klingPrompts: klingData.prompts,
      marketing: marketingData,
      timestamp: new Date().toLocaleString(),
    });

    // Save to Notion as Completed
    await saveToNotion({
      theme: selectedTheme,
      scenario: scenarioData.scenes,
      klingPrompts: klingData.prompts,
      marketing: marketingData,
    }, '생성 완료');
  };

  const loadFromHistory = (item: HistoryItem) => {
    setSelectedTheme(item.theme);
    setScenario(item.scenario);
    setKlingPrompts(item.klingPrompts);
    setMarketing(item.marketing);
    setCompletedSteps(['theme', 'scenario', 'kling', 'marketing']);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveToNotion = async (data: Record<string, unknown>, status = '아이디어') => {
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return result;
    } catch (err) {
      console.error(err);
      showToast('노션 저장 중 에러가 발생했습니다. API 키를 확인해주세요.', 'error');
      return null;
    }
  };

  const saveAllThemesToNotion = async () => {
    setLoadingStep('theme');
    for (const theme of themes) {
      await saveToNotion({ theme });
    }
    setLoadingStep(null);
    showToast(`${themes.length}개의 주제가 노션 '아이디어' 보드로 저장되었습니다!`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('클립보드에 복사되었습니다!');
  };

  const resetAll = () => {
    setThemes([]);
    setSelectedTheme('');
    setScenario([]);
    setKlingPrompts([]);
    setMarketing(null);
    setCompletedSteps([]);
    setInputTheme('');
  };

  return (
    <div className="main-container">
      <header className="header">
        <motion.h1 
          className="title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          왜 안돼?
        </motion.h1>
        <p className="subtitle">유튜브 숏츠 자동화 파이프라인 에이전트</p>
      </header>

      {/* Weekly Trends Section */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} className="text-secondary" /> 이번 주 추천 트렌드
          </h2>
          <button 
            className="btn-secondary" 
            onClick={() => setShowWeeklyTrends(!showWeeklyTrends)}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            {showWeeklyTrends ? '접기' : '모두 보기'}
          </button>
        </div>

        <AnimatePresence>
          {showWeeklyTrends && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}
            >
              {weeklyTrends.length === 0 ? (
                <div className="glass-panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>월요일 오전에 새로운 트렌드가 업데이트됩니다.</p>
                </div>
              ) : (
                weeklyTrends.map((trend, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    className={`glass-panel ${selectedTheme === trend.theme ? 'selected-item' : ''}`}
                    style={{ padding: '1.5rem', marginBottom: 0, cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => {
                      setSelectedTheme(trend.theme);
                      setThemes([trend.theme]);
                      setCompletedSteps(['theme']);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                        {trend.target}
                      </span>
                      <Sparkles size={14} style={{ color: 'var(--accent-color)' }} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      {trend.theme}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {trend.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-color)' }}>#{trend.keyword}</span>
                      <ChevronRight size={16} />
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
              <div className="history-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1) )', gap: '1rem' }}>
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
              initial={{ opacity: 0, x: 20 }}
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
        © 2026 왜 안돼? 유튜브 파이프라인 에이전트. Inspired by Premium AI Workflow.
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              backgroundColor: toast.type === 'success' ? 'var(--success-color)' : '#ef4444',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              zIndex: 1000,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Page;

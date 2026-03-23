'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  PenTool, 
  Video, 
  Share2, 
  CheckCircle2, 
  Copy, 
  RotateCcw,
  PlusCircle,
  TrendingUp,
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

const AGENTS = [
  { id: 'theme', name: '트렌드 분석가', icon: TrendingUp },
  { id: 'scenario', name: '시나리오 작가', icon: PenTool },
  { id: 'kling', name: 'Kling 프롬프트', icon: Video },
  { id: 'marketing', name: '마케터', icon: Share2 },
];

const Page = () => {
  const [inputTheme, setInputTheme] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [scenario, setScenario] = useState<Scene[]>([]);
  const [klingPrompts, setKlingPrompts] = useState<KlingPrompt[]>([]);
  const [marketing, setMarketing] = useState<Marketing | null>(null);
  
  const [loadingStep, setLoadingStep] = useState<Step | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);

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
    } catch (err) {
      console.error(err);
      alert('에러가 발생했습니다. 다시 시도해주세요.');
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
    if (!selectedTheme) return alert('주제를 먼저 선택해주세요.');

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
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
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
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '1.5rem', textAlign: 'center' }}>
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
    </div>
  );
};

export default Page;

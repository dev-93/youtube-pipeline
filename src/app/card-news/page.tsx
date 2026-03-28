'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Image as ImageIcon, 
  Share2, 
  CheckCircle2, 
  Copy, 
  RotateCcw,
  TrendingUp,
  Sparkles,
  ChevronRight,
  CloudUpload,
  Globe,
  Database,
  Layout,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { toJpeg } from 'html-to-image';
import CardPreview from './components/CardPreview';

type CardNewsStep = 'card_trends' | 'card_writer' | 'card_image' | 'card_marketer';

interface CardContent {
  card: number;
  title?: string;
  subtitle?: string;
  body?: string;
  question?: string;
  preview?: string;
}

interface CardDesign {
  card: number;
  themeName: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  accentColor: string;
}

interface CardMarketing {
  caption: string;
  hashtags: string;
}

interface CardTopic {
  title: string;
  description: string;
  category: string;
}

interface CardHistoryItem {
  id: string;
  topic: string;
  cards: CardContent[];
  cardDesigns: CardDesign[];
  marketing: CardMarketing | null;
  timestamp: string;
}

const CARD_AGENTS = [
  { id: 'card_trends', name: '트렌드 수집가', icon: TrendingUp, loadingText: '트렌드 수집가가 주제를 분석하고 있어요...' },
  { id: 'card_writer', name: '카드 작가', icon: PenTool, loadingText: '카드 작가가 콘텐츠를 작성하고 있어요...' },
  { id: 'card_image', name: '디자인 디렉터', icon: Layout, loadingText: '디렉터가 UI/UX 레이아웃을 구성하고 있어요...' },
  { id: 'card_marketer', name: '마케터', icon: Share2, loadingText: '마케터가 캡션을 작성하고 있어요...' },
];

export default function CardNewsPage() {
  const [inputTopic, setInputTopic] = useState('');
  const [recommendedTopics, setRecommendedTopics] = useState<CardTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [cards, setCards] = useState<CardContent[]>([]);
  const [cardDesigns, setCardDesigns] = useState<CardDesign[]>([]);
  const [marketing, setMarketing] = useState<CardMarketing | null>(null);
  const [loadingStep, setLoadingStep] = useState<CardNewsStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<CardNewsStep[]>([]);
  const [history, setHistory] = useState<CardHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'local' | 'notion'>('local');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notionHistory, setNotionHistory] = useState<{
    id: string;
    topic: string;
    status: string;
    date: string;
    url: string;
  }[]>([]);

  const [mounted, setMounted] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchNotionHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/notion');
      const data = await res.json();
      if (Array.isArray(data)) {
        const formattedData = data.map((page: { id: string; properties: Record<string, { select?: { name: string }, title?: { plain_text: string }[], status?: { name: string }, date?: { start: string } }>; url: string; created_time: string }) => {
          const channel = page.properties['channel']?.select?.name;
          return {
            id: page.id,
            topic: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
            status: page.properties['상태']?.status?.name || 'Idea',
            date: page.properties['생성일']?.date?.start || page.created_time,
            url: page.url,
            channel: channel
          };
        });
        
        // channel이 명시적으로 'insta'인 데이터만 표시
        const instaOnly = formattedData.filter((item: { channel?: string }) => item.channel === 'insta');
        setNotionHistory(instaOnly);
      }
    } catch (err) {
      console.error('Notion history fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchAgent = async (step: CardNewsStep, body: Record<string, unknown>) => {
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

  const handleSuggestTopics = async () => {
    const data = await fetchAgent('card_trends', {});
    if (Array.isArray(data)) {
      setRecommendedTopics(data);
      setCompletedSteps(['card_trends']);
    } else if (data && data.topics) {
      setRecommendedTopics(data.topics);
      setCompletedSteps(['card_trends']);
    }
  };

  const saveToHistory = (item: CardHistoryItem) => {
    const updated = [item, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('card_news_history', JSON.stringify(updated));
  };

  const saveToNotion = async () => {
    if (!selectedTopic || cards.length === 0) return;
    setSaveLoading(true);
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card',
          theme: selectedTopic,
          scenario: cards,
          klingPrompts: cardDesigns,
          marketing: marketing,
          status: '생성 완료'
        }),
      });
      if (res.ok) {
        alert('노션에 성공적으로 저장되었습니다!');
      } else {
        throw new Error('노션 저장 실패');
      }
    } catch (error) {
      console.error('Notion Error:', error);
      alert('노션 저장 중 오류가 발생했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('card_news_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    }
    fetchNotionHistory();
  }, []);

  if (!mounted) return null;

  const startPipeline = async (topic: string) => {
    setSelectedTopic(topic);
    setCards([]);
    setCardDesigns([]);
    setMarketing(null);
    setCompletedSteps(['card_trends']);

    const writerData = await fetchAgent('card_writer', { topic });
    if (!writerData) return;
    const cardsResult = Array.isArray(writerData) ? writerData : writerData.cards;
    setCards(cardsResult);
    setCompletedSteps(['card_trends', 'card_writer']);

    const designData = await fetchAgent('card_image', { cards: cardsResult });
    if (!designData) return;
    const designResult = Array.isArray(designData) ? designData : designData.designs || designData;
    setCardDesigns(designResult);
    setCompletedSteps(['card_trends', 'card_writer', 'card_image']);

    const marketingData = await fetchAgent('card_marketer', { topic, cards: cardsResult });
    if (!marketingData) return;
    setMarketing(marketingData);
    setCompletedSteps(['card_trends', 'card_writer', 'card_image', 'card_marketer']);

    const newItem: CardHistoryItem = {
      id: Date.now().toString(),
      topic,
      cards: cardsResult,
      cardDesigns: designResult,
      marketing: marketingData,
      timestamp: new Date().toLocaleString(),
    };
    saveToHistory(newItem);
  };

  const loadFromHistory = (item: CardHistoryItem) => {
    setSelectedTopic(item.topic);
    setCards(item.cards);
    setCardDesigns(item.cardDesigns || []);
    setMarketing(item.marketing);
    setCompletedSteps(['card_trends', 'card_writer', 'card_image', 'card_marketer']);
    setShowHistory(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다.');
  };

  const resetAll = () => {
    setInputTopic('');
    setRecommendedTopics([]);
    setSelectedTopic(null);
    setCards([]);
    setCardDesigns([]);
    setMarketing(null);
    setCompletedSteps([]);
  };

  const handleTextChange = (cardIndex: number, field: keyof CardContent, value: string) => {
    const newCards = [...cards];
    newCards[cardIndex] = { ...newCards[cardIndex], [field]: value };
    setCards(newCards);
  };

  const handleDownloadImage = async (cardNum: number) => {
    const el = document.getElementById(`card-preview-${cardNum}`);
    if (!el) return;
    try {
      const dataUrl = await toJpeg(el, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `card_${cardNum}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
      alert('이미지 저장에 실패했습니다.');
    }
  };

  return (
    <div className="main-container">
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
          Card News Agent
        </motion.h1>
        <p className="subtitle">AI 인스타그램 카드뉴스 자동 생성</p>

        <nav style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link href="/">
            <button className="keyword-tag" style={{ padding: '0.4rem 1.2rem' }}>
              AI Shorts
            </button>
          </Link>
          <button className="keyword-tag selected-item" style={{ padding: '0.4rem 1.2rem', cursor: 'default' }}>
            카드뉴스 만들기
          </button>
        </nav>
      </header>

      {/* Recommended Topics Section */}
      <section className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={28} color="var(--accent-color)" /> 이번 주 추천 트렌드 키워드
          </h2>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          {['#AI', '#테크', '#자기계발', '#비즈니스', '#생활꿀팁'].map((tag, idx) => (
            <span key={idx} className="keyword-tag" style={{ cursor: 'pointer' }} onClick={() => setInputTopic(tag.replace('#', ''))}>
              {tag}
            </span>
          ))}
        </div>

        <div className={recommendedTopics.length === 0 ? "topic-grid-empty" : "topic-grid"}>
          {recommendedTopics.length === 0 ? (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
              <Sparkles size={24} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>주제 추천 버튼을 눌러 인기 있는 카드뉴스 소재를 확인해보세요.</p>
            </div>
          ) : (
            recommendedTopics.map((topic, idx) => (
              <motion.div 
                key={idx}
                className="list-item"
                style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.04)', position: 'relative', margin: 0 }}
                onClick={() => startPipeline(topic.title)}
                whileHover={{ y: -8, background: 'rgba(255, 255, 255, 0.08)' }}
              >
                <span style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.2rem 0.6rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px', fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                  {topic.category}
                </span>
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {topic.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem' }}>
                    {topic.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <ChevronRight size={16} color="var(--text-secondary)" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Step Progress */}
      <div className="agent-steps">
        {CARD_AGENTS.map((agent) => {
          const isCompleted = completedSteps.includes(agent.id as CardNewsStep);
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

      {loadingStep && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '1.5rem' }}
        >
          {CARD_AGENTS.find(a => a.id === loadingStep)?.loadingText}
        </motion.p>
      )}

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
            key="history-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel"
            style={{ marginBottom: '2rem', padding: '1.5rem', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <RotateCcw size={18} /> 최근 생성 기록
              </h3>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
                <button 
                  onClick={() => setHistoryTab('local')}
                  style={{ 
                    padding: '0.4rem 1rem', 
                    fontSize: '0.8rem', 
                    borderRadius: '8px',
                    background: historyTab === 'local' ? 'var(--accent-color)' : 'transparent',
                    color: 'white'
                  }}
                >
                  <Globe size={14} style={{ marginRight: '4px', display: 'inline' }} /> 브라우저
                </button>
                <button 
                  onClick={() => { setHistoryTab('notion'); fetchNotionHistory(); }}
                  style={{ 
                    padding: '0.4rem 1rem', 
                    fontSize: '0.8rem', 
                    borderRadius: '8px',
                    background: historyTab === 'notion' ? 'var(--accent-color)' : 'transparent',
                    color: 'white'
                  }}
                >
                  <Database size={14} style={{ marginRight: '4px', display: 'inline' }} /> 노션 (Archive)
                </button>
              </div>
            </div>
            
            {historyTab === 'local' ? (
              history.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>아직 브라우저에 저장된 기록이 없습니다.</p>
              ) : (
                <div className="history-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      className="list-item" 
                      onClick={() => loadFromHistory(item)}
                      style={{ padding: '0.8rem', fontSize: '0.9rem' }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--accent-color)', marginBottom: '4px' }}>{item.topic}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.timestamp}</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
              ) : notionHistory.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>노션에 저장된 기록이 없습니다.</p>
              ) : (
                <div className="history-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {notionHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="list-item" 
                      onClick={() => window.open(item.url, '_blank')}
                      style={{ padding: '0.8rem', fontSize: '0.9rem', position: 'relative' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                          {item.status}
                        </span>
                        <Database size={12} color="var(--accent-color)" />
                      </div>
                      <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{item.topic}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(item.date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )
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
              value={inputTopic}
              onChange={(e) => setInputTopic(e.target.value)}
            />
            <button className="btn-secondary" onClick={() => startPipeline(inputTopic)}>
              확인
            </button>
            <button className="btn-primary" onClick={handleSuggestTopics} disabled={!!loadingStep}>
              {loadingStep === 'card_trends' ? '분석 중...' : '주제 추천'}
            </button>
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {selectedTopic && cards.length > 0 && (
            <motion.div
              key="selected-topic-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginBottom: '1.5rem', textAlign: 'center' }}
            >
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--accent-color)' }}>[주제]</span> {selectedTopic}
              </h2>
            </motion.div>
          )}

          {cards.length > 0 && (
            <motion.section 
              key="cards-result-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel result-section"
            >
              <div className="result-header">
                <h2 className="result-title">✍️ 카드뉴스 텍스트</h2>
                <button className="copy-btn btn-secondary" onClick={() => copyToClipboard(cards.map(c => `Card ${c.card}: ${c.title || c.question || ''}\n${c.subtitle || c.body || c.preview || ''}`).join('\n\n'))}>
                  <Copy size={14} style={{ marginRight: '5px', display: 'inline' }} /> 전체 복사
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {cards.map((card, idx) => (
                  <div key={card.card} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   
                    {/* Preview Wrapper */}
                    <div style={{ position: 'relative' }}>
                      <div id={`card-preview-${card.card}`} style={{ background: '#000', borderRadius: '32px' }}>
                        <CardPreview 
                          cardData={card} 
                          design={cardDesigns.find(d => d.card === card.card)} 
                        />
                      </div>
                      <button 
                        onClick={() => handleDownloadImage(card.card)}
                        style={{ 
                          position: 'absolute', top: '10px', right: '10px', 
                          background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', 
                          padding: '8px', borderRadius: '50%', color: '#fff', border: 'none', cursor: 'pointer' 
                        }}
                        title="이미지 저장"
                      >
                        <Download size={18} />
                      </button>
                    </div>

                    {/* Editor Form */}
                    <div className="content-box editable-form" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ color: 'var(--accent-color)', fontWeight: 700, marginBottom: '0.5rem' }}>Card {card.card} 상세 텍스트 편집기</p>
                      
                      {card.title !== undefined && (
                        <input 
                          type="text" 
                          value={card.title || ''} 
                          onChange={(e) => handleTextChange(idx, 'title', e.target.value)}
                          style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                        />
                      )}
                      
                      {card.subtitle !== undefined && (
                        <input 
                          type="text" 
                          value={card.subtitle || ''} 
                          onChange={(e) => handleTextChange(idx, 'subtitle', e.target.value)}
                          style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', borderRadius: '4px' }}
                        />
                      )}
                      
                      {card.body !== undefined && (
                        <textarea 
                          rows={4}
                          value={card.body || ''} 
                          onChange={(e) => handleTextChange(idx, 'body', e.target.value)}
                          style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', resize: 'vertical' }}
                        />
                      )}
                      
                      {card.question !== undefined && (
                        <input 
                          type="text" 
                          value={card.question || ''} 
                          onChange={(e) => handleTextChange(idx, 'question', e.target.value)}
                          style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-color)', borderRadius: '4px' }}
                        />
                      )}
                      
                      {card.preview !== undefined && (
                        <input 
                          type="text" 
                          value={card.preview || ''} 
                          onChange={(e) => handleTextChange(idx, 'preview', e.target.value)}
                          style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', borderRadius: '4px' }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {marketing && (
            <motion.section 
              key="marketing-result-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel result-section"
            >
              <div className="result-header">
                <h2 className="result-title">📱 인스타그램 게시물 구성</h2>
                <div>
                  <button 
                    className="btn-primary" 
                    onClick={saveToNotion} 
                    disabled={saveLoading}
                    style={{ marginRight: '10px', background: '#000', color: '#fff', border: '1px solid #333' }}
                  >
                    <CloudUpload size={14} style={{ marginRight: '5px', display: 'inline' }} /> 
                    {saveLoading ? '저장 중...' : '노션에 저장'}
                  </button>
                  <button className="copy-btn btn-secondary" onClick={() => copyToClipboard(`${marketing.caption}\n\n${marketing.hashtags}`)}>
                    <Copy size={14} style={{ marginRight: '5px', display: 'inline' }} /> 전체 복사
                  </button>
                </div>
              </div>
              <div className="content-box">
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>캡션</p>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.6 }}>{marketing.caption}</pre>
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>해시태그</p>
                  <p style={{ color: '#3b82f6', wordBreak: 'break-all', fontSize: '0.9rem' }}>{marketing.hashtags}</p>
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
        © 2026 Card News Agent. Part of AI Shorts Agent Suite.
      </footer>
    </div>
  );
}

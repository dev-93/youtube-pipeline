'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  ArrowRight,
  CheckCircle2,
  Download,
  Zap,
  RotateCcw,
  CloudUpload,
} from 'lucide-react';
import Link from 'next/link';

type TransferStep = 'idle' | 'analyzing' | 'completed';

interface StyleHistoryItem {
  id: string;
  productName: string;
  stylePrompt: string;
  resultImage: string;
  timestamp: string;
  marketingGuide?: string;
  concept?: string;
}

const STYLE_PRESETS = [
  { label: '미니멀 스튜디오', value: 'minimal studio, clean white background, soft shadows' },
  { label: '라이프스타일', value: 'lifestyle shot, model holding product naturally, warm indoor setting' },
  { label: '럭셔리 에디토리얼', value: 'luxury editorial, dramatic lighting, dark moody background' },
  { label: '내추럴 아웃도어', value: 'natural outdoor, golden hour, organic feel' },
  { label: '네온 사이버펑크', value: 'neon cyberpunk, vibrant colors, futuristic setting' },
  { label: 'AI 자동 추천', value: '' },
];

export default function StyleTransferPage() {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [brandStyle, setBrandStyle] = useState('');
  const [status, setStatus] = useState<TransferStep>('idle');
  const [stylePrompt, setStylePrompt] = useState('');
  const [concept, setConcept] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StyleHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [marketingGuide, setMarketingGuide] = useState('');

  const prodInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('style_transfer_history');
      if (saved) setHistory(JSON.parse(saved));
    }
  }, []);

  const compressImage = (base64: string, maxWidth = 1024, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const reader = new FileReader();
    reader.onloadend = () => setProductImage(reader.result as string);
    reader.readAsDataURL(files[0]);
  };

  const saveToHistory = (item: StyleHistoryItem) => {
    try {
      const updated = [item, ...history].slice(0, 10);
      setHistory(updated);
      try {
        localStorage.setItem('style_transfer_history', JSON.stringify(updated));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          const minimal = updated.slice(0, 5);
          localStorage.setItem('style_transfer_history', JSON.stringify(minimal));
          setHistory(minimal);
        }
      }
    } catch (err) {
      console.error('History Error:', err);
    }
  };

  const startTransfer = async () => {
    if (!productImage) {
      alert('제품 이미지를 업로드해주세요.');
      return;
    }

    setStatus('analyzing');
    setError(null);

    try {
      const compressedProduct = await compressImage(productImage, 1024, 0.8);

      const res = await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productImage: compressedProduct,
          productName,
          brandStyle
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error('Server response:', text);
        throw new Error(res.status === 413 ? '이미지 용량이 너무 큽니다.' : '서버 응답 오류');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '실패했습니다.');

      setStylePrompt(data.stylePrompt);
      setConcept(data.concept || '');
      setResultImage(data.generatedImage);
      setMarketingGuide(data.marketingGuide || '');
      setStatus('completed');

      saveToHistory({
        id: Date.now().toString(),
        productName: productName || '브랜드 제품',
        stylePrompt: data.stylePrompt,
        resultImage: data.generatedImage,
        timestamp: new Date().toLocaleString(),
        marketingGuide: data.marketingGuide,
        concept: data.concept
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setStatus('idle');
    }
  };

  const saveToNotion = async () => {
    if (!resultImage || !stylePrompt) return;
    setSaveLoading(true);
    try {
      const isUrl = resultImage.startsWith('http');
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'style',
          theme: productName || '스타일 변환 결과',
          scenario: stylePrompt,
          imageUrl: isUrl ? resultImage : undefined,
          marketing: { caption: marketingGuide },
          status: '생성 완료'
        }),
      });
      if (res.ok) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Notion Error Details:', errData);
        throw new Error(errData.details || errData.error || '노션 저장 실패');
      }
    } catch (error) {
      console.error('Notion Error:', error);
      alert('노션 저장 중 오류가 발생했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `styled-${productName || 'product'}.png`;
    link.click();
  };

  const loadFromHistory = (item: StyleHistoryItem) => {
    setProductName(item.productName);
    setStylePrompt(item.stylePrompt);
    setResultImage(item.resultImage);
    setMarketingGuide(item.marketingGuide || '');
    setConcept(item.concept || '');
    setStatus('completed');
    setShowHistory(false);
  };

  return (
    <div className="main-container">
      <header className="header">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ marginBottom: '1rem' }}>
          <Zap color="var(--accent-color)" size={40} />
        </motion.div>
        <motion.h1 className="title" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          AI Product Branding
        </motion.h1>
        <p className="subtitle">제품 사진 하나로 프리미엄 브랜딩 이미지를 만들어보세요</p>

        <nav style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link href="/"><button className="keyword-tag" style={{ padding: '0.4rem 1.2rem' }}>AI Shorts</button></Link>
          <Link href="/card-news"><button className="keyword-tag" style={{ padding: '0.4rem 1.2rem' }}>카드뉴스 만들기</button></Link>
          <button className="keyword-tag selected-item" style={{ padding: '0.4rem 1.2rem', cursor: 'default' }}>AI 브랜딩</button>
        </nav>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={() => setShowHistory(!showHistory)} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
          {showHistory ? '히스토리 닫기' : '이전 기록 보기'}
        </button>
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', overflow: 'hidden' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}><RotateCcw size={18} /> 최근 브랜딩 기록</h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>아직 기록이 없습니다.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {history.map((item) => (
                  <div key={item.id} className="list-item" onClick={() => loadFromHistory(item)} style={{ padding: '0.8rem', fontSize: '0.9rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{item.timestamp}</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{item.productName}</div>
                    {item.concept && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.concept}</div>}
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <main style={{ position: 'relative' }}>
        {/* Loading Overlay */}
        <AnimatePresence>
          {status === 'analyzing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ marginBottom: '2rem' }}>
                <Sparkles size={60} color="var(--accent-color)" />
              </motion.div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>
                AI 광고 전문가가 브랜딩 중입니다...
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>제품 분석 → 스타일 결정 → 이미지 생성 중. 약 15~30초 소요됩니다.</p>
              <div style={{ marginTop: '2rem', width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ width: '100%', height: '100%', background: 'var(--accent-color)' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ filter: status === 'analyzing' ? 'blur(4px)' : 'none', opacity: status === 'analyzing' ? 0.5 : 1, pointerEvents: status === 'analyzing' ? 'none' : 'auto', transition: 'all 0.4s ease' }}>
          {status !== 'completed' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Product Upload */}
              <section className="glass-panel">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ImageIcon size={20} color="var(--accent-color)" /> 제품 이미지
                </h2>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'start', flexWrap: 'wrap' }}>
                  <div onClick={() => prodInputRef.current?.click()}
                    style={{ width: '200px', height: '200px', background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                    className="hover-effect">
                    {productImage ? (
                      <>
                        <img src={productImage} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={(e) => { e.stopPropagation(); setProductImage(null); }}
                          style={{ position: 'absolute', top: '8px', right: '8px', padding: '6px', background: 'rgba(239,68,68,0.8)', borderRadius: '50%', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '14px', lineHeight: 1 }}>✕</span>
                        </button>
                      </>
                    ) : (
                      <><Upload size={32} style={{ marginBottom: '12px' }} /><span>제품 사진</span></>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                      <input type="text" placeholder="제품 이름 (예: 클레오 세럼, 나이키 에어맥스...)" value={productName} onChange={(e) => setProductName(e.target.value)} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                      배경이 깔끔한 제품 사진일수록 결과가 좋습니다.
                    </p>
                  </div>
                </div>
                <input type="file" ref={prodInputRef} hidden accept="image/*" onChange={handleFileChange} />
              </section>

              {/* Style Preset */}
              <section className="glass-panel">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="var(--accent-color)" /> 브랜딩 스타일
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
                  {STYLE_PRESETS.map((preset) => (
                    <button key={preset.label} className={`keyword-tag ${brandStyle === preset.value ? 'selected-item' : ''}`}
                      onClick={() => setBrandStyle(preset.value)} style={{ padding: '0.5rem 1.2rem' }}>
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="input-group">
                  <input type="text" placeholder="또는 직접 스타일 입력 (예: 따뜻한 카페 분위기, 여성 모델이 들고 있는...)" value={brandStyle} onChange={(e) => setBrandStyle(e.target.value)} />
                </div>
              </section>

              <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <button className="btn-primary" style={{ padding: '1.2rem 4rem', fontSize: '1.2rem', borderRadius: '50px' }} onClick={startTransfer} disabled={!productImage}>
                  AI 브랜딩 시작 <ArrowRight size={20} style={{ marginLeft: '10px', display: 'inline' }} />
                </button>
              </div>
            </motion.div>

          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--success-color)', padding: '10px', borderRadius: '50%', color: 'white' }}>
                    <CheckCircle2 size={32} />
                  </div>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>브랜딩 완료</h2>
                {concept && <p style={{ textAlign: 'center', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '2rem' }}>{concept}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                  {/* Generated Image */}
                  <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {resultImage && <img src={resultImage} alt="Generated" style={{ width: '100%', height: 'auto', display: 'block' }} />}
                    <button onClick={downloadResult}
                      style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Download size={18} /> 고화질 저장
                    </button>
                  </div>

                  {/* Marketing Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Marketing Guide - 접기/펼치기 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <details className="content-box" style={{ background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                        <summary style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: 700, cursor: 'pointer', listStyle: 'none' }}>
                          <Sparkles size={18} /> 인스타 업로드 가이드
                          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>펼치기 ▾</span>
                        </summary>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.2rem', borderRadius: '12px', marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                          <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                            {marketingGuide || "가이드 생성 중..."}
                          </p>
                        </div>
                        <button className="btn-secondary" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', fontSize: '0.85rem', marginTop: '0.8rem' }}
                          onClick={() => { navigator.clipboard.writeText(marketingGuide); alert('가이드가 복사되었습니다!'); }}>
                          가이드 복사
                        </button>
                      </details>

                      <details className="content-box">
                        <summary style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          생성 프롬프트 (AI Decision)
                          <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>펼치기 ▾</span>
                        </summary>
                        <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginTop: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>{stylePrompt}</p>
                      </details>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button className="btn-secondary" onClick={() => setStatus('idle')} style={{ padding: '0.8rem 2rem' }}>
                    <RotateCcw size={16} style={{ marginRight: '8px', display: 'inline' }} /> 새로 만들기
                  </button>
                  <button className="btn-primary" onClick={saveToNotion} disabled={saveLoading} style={{ background: '#fff', color: '#000', padding: '0.8rem 2rem' }}>
                    <CloudUpload size={16} style={{ marginRight: '8px', display: 'inline' }} />
                    {saveLoading ? '저장 중...' : '노션에 저장'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="glass-panel" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', marginTop: '2rem' }}>
              <p style={{ color: '#ef4444', fontWeight: 600 }}>오류 발생: {error}</p>
              <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => { setError(null); setStatus('idle'); }}>다시 시도</button>
            </div>
          )}
        </div>
      </main>

      <footer style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        © 2026 AI Product Branding. Part of AI Shorts Agent Suite.
      </footer>

      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--success-color)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} /> 노션에 저장되었습니다!
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .hover-effect:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: var(--accent-color) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}

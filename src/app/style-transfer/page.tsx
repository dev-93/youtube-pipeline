'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  Download,
  Search,
  Zap,
  RotateCcw,
  CloudUpload,
  Database,
  Globe
} from 'lucide-react';
import Link from 'next/link';

type TransferStep = 'idle' | 'analyzing' | 'transferring' | 'completed';

interface StyleHistoryItem {
  id: string;
  productName: string;
  stylePrompt: string;
  resultImage: string;
  timestamp: string;
  marketingCaption?: string;
  hashtags?: string[];
}

export default function StyleTransferPage() {
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [status, setStatus] = useState<TransferStep>('idle');
  const [stylePrompt, setStylePrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // History states
  const [history, setHistory] = useState<StyleHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Marketing states
  const [marketingCaption, setMarketingCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);

  const refInputRef = useRef<HTMLInputElement>(null);
  const prodInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('style_transfer_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    }
  }, []);

  // 이미지 압축 유틸리티
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
        // data:image/jpeg;base64,... 형식으로 반환 (파일 크기 축소를 위해 jpeg 사용)
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64); // 실패 시 원본 반환
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'reference' | 'product') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'reference') {
          setReferenceImages(prev => [...prev, base64].slice(0, 5)); 
        } else {
          setProductImage(base64);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReference = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const saveToHistory = (item: StyleHistoryItem) => {
    try {
      const updated = [item, ...history].slice(0, 10);
      setHistory(updated);
      
      try {
        localStorage.setItem('style_transfer_history', JSON.stringify(updated));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          // 용량 부족 시 절반으로 더 줄여서 저장
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
      // 1. 이미지 압축 (Payload 크기 4.5MB 제한 이슈 해결)
      // 레퍼런스 이미지는 분석용이므로 800px 정도로 충분
      const compressedRefs = await Promise.all(
        referenceImages.map(img => compressImage(img, 800, 0.7))
      );
      // 제품 이미지는 결과 퀄리티를 위해 1024px 정도 유지
      const compressedProduct = await compressImage(productImage, 1024, 0.8);

      const res = await fetch('/api/style-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImages: compressedRefs,
          productImage: compressedProduct,
          productName
        }),
      });

      // API 응답이 JSON이 아닐 경우(예: 413 Error HTML) 처리
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error('Server response:', text);
        if (res.status === 413) {
          throw new Error('이미지 용량이 너무 큽니다. 더 작은 이미지를 사용해주세요.');
        }
        throw new Error('서버에서 올바르지 않은 응답이 왔습니다.');
      }

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '실패했습니다.');

      setStylePrompt(data.stylePrompt);
      setResultImage(data.generatedImage);
      setMarketingCaption(data.marketingCaption || '');
      setHashtags(data.hashtags || []);
      setStatus('completed');

      // Save to local history
      const newItem: StyleHistoryItem = {
        id: Date.now().toString(),
        productName: productName || '브랜드 제품',
        stylePrompt: data.stylePrompt,
        resultImage: data.generatedImage,
        timestamp: new Date().toLocaleString(),
        marketingCaption: data.marketingCaption,
        hashtags: data.hashtags
      };
      saveToHistory(newItem);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setStatus('idle');
    }
  };

  const saveToNotion = async () => {
    if (!resultImage || !stylePrompt) return;
    setSaveLoading(true);
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'style',
          theme: productName || '스타일 변환 결과',
          scenario: stylePrompt, 
          imageUrl: resultImage,
          marketing: {
            caption: marketingCaption,
            hashtags: hashtags.join(' ')
          },
          status: '생성 완료'
        }),
      });
      if (res.ok) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
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
    setMarketingCaption(item.marketingCaption || '');
    setHashtags(item.hashtags || []);
    setStatus('completed');
    setShowHistory(false);
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
          <Zap color="var(--accent-color)" size={40} />
        </motion.div>
        <motion.h1 
          className="title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          AI Style Transfer
        </motion.h1>
        <p className="subtitle">레퍼런스 이미지의 분위기를 제품에 입혀보세요</p>

        <nav style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link href="/">
            <button className="keyword-tag" style={{ padding: '0.4rem 1.2rem' }}>
              AI Shorts
            </button>
          </Link>
          <Link href="/card-news">
            <button className="keyword-tag" style={{ padding: '0.4rem 1.2rem' }}>
              카드뉴스 만들기
            </button>
          </Link>
          <button className="keyword-tag selected-item" style={{ padding: '0.4rem 1.2rem', cursor: 'default' }}>
            스타일 변환
          </button>
        </nav>
      </header>

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
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <RotateCcw size={18} /> 최근 변환 기록
            </h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>아직 변환된 기록이 없습니다.</p>
            ) : (
              <div className="history-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="list-item" 
                    onClick={() => loadFromHistory(item)}
                    style={{ padding: '0.8rem', fontSize: '0.9rem' }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{item.timestamp}</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{item.productName}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <main style={{ position: 'relative' }}>
        {/* Loading Overlay (Dimmed background) */}
        <AnimatePresence>
          {(status === 'analyzing' || status === 'transferring') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ 
                position: 'fixed', 
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '2rem'
              }}
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                style={{ marginBottom: '2rem' }}
              >
                <Sparkles size={60} color="var(--accent-color)" />
              </motion.div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>
                {status === 'analyzing' ? 'Gemini가 스타일을 분석 중입니다...' : 'FAL AI가 스타일을 적용하고 있습니다...'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>잠시만 기다려주세요. 약 10~20초 정도 소요됩니다.</p>
              
              <div style={{ marginTop: '2rem', width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  style={{ width: '100%', height: '100%', background: 'var(--accent-color)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ 
          filter: (status === 'analyzing' || status === 'transferring') ? 'blur(4px)' : 'none',
          opacity: (status === 'analyzing' || status === 'transferring') ? 0.5 : 1,
          pointerEvents: (status === 'analyzing' || status === 'transferring') ? 'none' : 'auto',
          transition: 'all 0.4s ease'
        }}>
          {status !== 'completed' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Reference Upload Section */}
              <section className="glass-panel">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Search size={20} color="var(--accent-color)" /> 1. 스타일 레퍼런스 (최대 5장)
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {referenceImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={img} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        onClick={() => removeReference(idx)}
                        style={{ position: 'absolute', top: '5px', right: '5px', padding: '4px', background: 'rgba(255,0,0,0.6)', borderRadius: '50%', color: 'white' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {referenceImages.length < 5 && (
                    <button 
                      onClick={() => refInputRef.current?.click()}
                      style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                      className="hover-effect"
                    >
                      <Upload size={24} style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '0.8rem' }}>업로드</span>
                    </button>
                  )}
                </div>
                <input type="file" ref={refInputRef} hidden multiple accept="image/*" onChange={(e) => handleFileChange(e, 'reference')} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>분위기, 색감, 조명을 따오고 싶은 이미지들을 선택하세요.</p>
              </section>

              {/* Product Upload Section */}
              <section className="glass-panel">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ImageIcon size={20} color="var(--accent-color)" /> 2. 대상 제품 이미지
                </h2>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'start', flexWrap: 'wrap' }}>
                  <div 
                    onClick={() => prodInputRef.current?.click()}
                    style={{ width: '200px', height: '200px', background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', overflow: 'hidden' }}
                    className="hover-effect"
                  >
                    {productImage ? (
                      <img src={productImage} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <Upload size={32} style={{ marginBottom: '12px' }} />
                        <span>제품 사진</span>
                      </>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                      <input 
                        type="text" 
                        placeholder="제품 이름 (예: 화장품 병, 나이키 운동화...)" 
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                      />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      스타일을 입힐 원본 제품 사진을 업로드하세요. 배경이 투명하거나 깔끔한 사진일수록 결과가 더 좋습니다.
                    </p>
                  </div>
                </div>
                <input type="file" ref={prodInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'product')} />
              </section>

              <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ padding: '1.2rem 4rem', fontSize: '1.2rem', borderRadius: '50px' }}
                  onClick={startTransfer}
                  disabled={!productImage}
                >
                  {referenceImages.length > 0 ? '스타일 변환 시작' : 'AI 자동 브랜딩 시작'} 
                  <ArrowRight size={20} style={{ marginLeft: '10px', display: 'inline' }} />
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
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center' }}>브랜딩 디자인 완료!</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                  {/* Left: Generated Image */}
                  <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {resultImage && <img src={resultImage} alt="Generated" style={{ width: '100%', height: 'auto', display: 'block' }} />}
                    <button 
                      onClick={downloadResult}
                      style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Download size={18} /> 고화질 저장
                    </button>
                  </div>

                  {/* Right: Marketing Agent Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="content-box" style={{ background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#818cf8', fontWeight: 700 }}>
                        <Sparkles size={18} /> 인스타 마케팅 에이전트 가이드
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1rem' }}>
                        <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                          {marketingCaption || "캡션을 생성 중입니다..."}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
                        {hashtags.map((tag, i) => (
                          <span key={i} style={{ fontSize: '0.85rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button 
                        className="btn-secondary" 
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem' }}
                        onClick={() => {
                          const text = `${marketingCaption}\n\n${hashtags.join(' ')}`;
                          navigator.clipboard.writeText(text);
                          alert('마케팅 문구가 복사되었습니다!');
                        }}
                      >
                        마케팅 문구 전체 복사
                      </button>
                    </div>

                    <div className="content-box">
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', fontSize: '0.85rem', fontWeight: 600 }}>생성 프롬프트 (AI Decision)</p>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                        {stylePrompt}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button className="btn-secondary" onClick={() => setStatus('idle')} style={{ padding: '0.8rem 2rem' }}>
                    <RotateCcw size={16} style={{ marginRight: '8px', display: 'inline' }} /> 새로 만들기
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={saveToNotion} 
                    disabled={saveLoading}
                    style={{ background: '#fff', color: '#000', padding: '0.8rem 2rem' }}
                  >
                    <CloudUpload size={16} style={{ marginRight: '8px', display: 'inline' }} /> 
                    {saveLoading ? '저장 중...' : '노션에 마케팅 데이터 저장'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="glass-panel" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', marginTop: '2rem' }}>
              <p style={{ color: '#ef4444', fontWeight: 600 }}>오류 발생: {error}</p>
              <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setStatus('idle')}>다시 시도</button>
            </div>
          )}
        </div>
      </main>

      <footer style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        © 2026 Style Transfer Agent. Part of AI Shorts Agent Suite.
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

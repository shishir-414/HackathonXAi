import { useState, useEffect, useRef, useCallback } from 'react';
import { FiCamera, FiX, FiZap, FiHelpCircle, FiLoader, FiAlertCircle, FiChevronRight, FiBookOpen } from 'react-icons/fi';
import { practicalAPI } from '../api';

const MIN_CONFIDENCE = 0.55;
const DETECT_INTERVAL = 800;
const FEATURE_DEBOUNCE = 1200;

export default function PracticalMode({ onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const detectLoopRef = useRef(null);
  const featureTimerRef = useRef(null);

  const [stage, setStage] = useState('loading');
  const [loadProgress, setLoadProgress] = useState('');
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [activeObject, setActiveObject] = useState(null);
  const [features, setFeatures] = useState(null);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState('');

  // Attach stream when detecting
  useEffect(() => {
    if (stage !== 'detecting') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch(e => console.warn('Play failed:', e));
      };
    }
  }, [stage]);

  // Initialize AI model + camera
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoadProgress('Loading AI model...');
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (cancelled) return;
        modelRef.current = model;

        setLoadProgress('Accessing camera...');
        let stream = null;
        const configs = [
          { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
          { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
          { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
          { video: true, audio: false },
        ];
        for (const cfg of configs) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(cfg);
            break;
          } catch (camErr) {
            if (camErr.name === 'NotAllowedError') throw camErr;
          }
        }
        if (!stream) throw new Error('No camera available.');
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setStage('detecting');
      } catch (err) {
        if (cancelled) return;
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Allow camera in browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a webcam.');
        } else {
          setError(err.message || 'Failed to start.');
        }
        setStage('error');
      }
    }

    init();
    return () => { cancelled = true; cleanup(); };
  }, []);

  // Detection loop
  useEffect(() => {
    if (stage !== 'detecting') return;

    const runDetection = async () => {
      const model = modelRef.current;
      const video = videoRef.current;
      if (!model || !video || video.readyState < 2) return;

      try {
        const predictions = await model.detect(video);
        const filtered = predictions
          .filter(p => p.score >= MIN_CONFIDENCE)
          .map(p => ({ class: p.class, score: p.score, bbox: p.bbox }));

        setDetectedObjects(filtered);
        drawBoxes(filtered);

        // Auto-fetch features for the highest-confidence new object
        if (filtered.length > 0) {
          const best = filtered.reduce((a, b) => a.score > b.score ? a : b);
          if (best.class !== activeObject) {
            clearTimeout(featureTimerRef.current);
            featureTimerRef.current = setTimeout(() => {
              fetchFeatures(best.class);
            }, FEATURE_DEBOUNCE);
          }
        }
      } catch {}
    };

    detectLoopRef.current = setInterval(runDetection, DETECT_INTERVAL);
    return () => clearInterval(detectLoopRef.current);
  }, [stage, activeObject]);

  // Draw bounding boxes
  const drawBoxes = useCallback((objects) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objects.forEach(obj => {
      const [x, y, w, h] = obj.bbox;
      const isActive = obj.class === activeObject;

      // Box
      ctx.strokeStyle = isActive ? '#22d3ee' : '#a5f3fc';
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      // Corner brackets for active
      if (isActive) {
        const cl = Math.min(20, w * 0.2, h * 0.2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#06b6d4';
        ctx.beginPath(); ctx.moveTo(x, y + cl); ctx.lineTo(x, y); ctx.lineTo(x + cl, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - cl, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h - cl); ctx.lineTo(x, y + h); ctx.lineTo(x + cl, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - cl, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cl); ctx.stroke();
      }

      // Label
      const label = obj.class + ' ' + Math.round(obj.score * 100) + '%';
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = isActive ? 'rgba(6,182,212,0.85)' : 'rgba(6,182,212,0.55)';
      ctx.beginPath(); ctx.roundRect(x, y - 24, tw, 22, 4); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 6, y - 9);
    });
  }, [activeObject]);

  // Fetch features for an object
  const fetchFeatures = async (objectClass) => {
    setLoadingFeatures(true);
    setActiveObject(objectClass);
    setFeatures(null);
    setExpandedFeature(null);
    setQuiz(null);
    setQuizAnswer(null);
    try {
      const { data } = await practicalAPI.getObjectFeatures(objectClass);
      setFeatures(data);
    } catch (err) {
      console.error('Feature fetch error:', err);
      setFeatures({
        name: objectClass,
        category: 'Object',
        features: [{ title: 'Detected', detail: 'Point your camera at common objects like bottles, books, or phones for detailed info!' }],
      });
    } finally {
      setLoadingFeatures(false);
    }
  };

  // Load quiz for current object
  const loadQuiz = async () => {
    if (!activeObject) return;
    try {
      const { data } = await practicalAPI.getQuiz(activeObject);
      setQuiz(data);
      setQuizAnswer(null);
      setSelectedOption(null);
    } catch {
      setQuiz(null);
    }
  };

  // Check quiz answer
  const submitAnswer = async (index) => {
    if (!activeObject) return;
    try {
      const { data } = await practicalAPI.checkAnswer(activeObject, index);
      setQuizAnswer(data);
    } catch {
      setQuizAnswer({ correct: false, explanation: 'Could not check answer. Try again.' });
    }
  };

  const cleanup = () => {
    clearInterval(detectLoopRef.current);
    clearTimeout(featureTimerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const handleClose = () => { cleanup(); onClose(); };

  // ────────────────────────────────────────────────
  // RENDER — video always in DOM
  // ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative w-full h-full">

        {/* Camera (always rendered) */}
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
          playsInline muted autoPlay
          style={{ visibility: stage === 'detecting' ? 'visible' : 'hidden' }} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ visibility: stage === 'detecting' ? 'visible' : 'hidden' }} />

        {/* ── Loading ── */}
        {stage === 'loading' && (
          <div className="absolute inset-0 z-30 bg-dark-950 flex items-center justify-center">
            <div className="text-center max-w-xs mx-auto px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/20">
                <FiCamera size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Object Explorer</h2>
              <p className="text-dark-400 text-sm mb-6">Point your camera at any object to learn about it</p>
              <div className="flex items-center justify-center gap-3 text-cyan-400 text-sm">
                <FiLoader className="animate-spin" size={16} />
                <span>{loadProgress}</span>
              </div>
              <button onClick={handleClose} className="mt-8 text-dark-500 text-sm hover:text-dark-300 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {stage === 'error' && (
          <div className="absolute inset-0 z-30 bg-dark-950 flex items-center justify-center">
            <div className="text-center max-w-xs mx-auto px-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <FiAlertCircle size={28} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
              <p className="text-dark-400 text-sm mb-6">{error}</p>
              <button onClick={handleClose} className="px-6 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-white text-sm transition-all">Go Back</button>
            </div>
          </div>
        )}

        {/* ── Detection UI ── */}
        {stage === 'detecting' && (
          <>
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-sm font-medium">Object Explorer</span>
                  <span className="text-dark-400 text-xs">
                    {detectedObjects.length > 0
                      ? `${detectedObjects.length} detected`
                      : 'Scanning...'}
                  </span>
                </div>
                <button onClick={handleClose} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all">
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Hint when nothing detected */}
            {detectedObjects.length === 0 && !features && (
              <div className="absolute top-24 left-0 right-0 z-10 px-4">
                <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 max-w-sm mx-auto border border-dark-600/50 text-center">
                  <FiCamera size={24} className="text-cyan-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium mb-1">Point your camera at any object</p>
                  <p className="text-dark-400 text-xs">Try: water bottle, phone, book, fruit, plant, laptop...</p>
                </div>
              </div>
            )}

            {/* Feature card */}
            {(features || loadingFeatures) && !quiz && (
              <div className="absolute bottom-28 left-0 right-0 z-10 px-3">
                <div className="bg-dark-800/90 backdrop-blur-xl rounded-2xl max-w-sm mx-auto border border-cyan-500/20 shadow-lg shadow-cyan-500/5 overflow-hidden">
                  {loadingFeatures ? (
                    <div className="flex items-center gap-3 justify-center py-6">
                      <FiLoader className="animate-spin text-cyan-400" size={16} />
                      <span className="text-dark-300 text-sm">Learning about this object...</span>
                    </div>
                  ) : features && (
                    <>
                      {/* Header */}
                      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <FiBookOpen size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-bold text-sm truncate">{features.name}</h3>
                          <p className="text-cyan-400 text-xs">{features.category}</p>
                        </div>
                      </div>

                      {/* Features list */}
                      <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-1">
                        {features.features?.map((f, i) => (
                          <button
                            key={i}
                            onClick={() => setExpandedFeature(expandedFeature === i ? null : i)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-700/60 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-cyan-400 text-xs font-semibold flex-shrink-0">{f.title}</span>
                              <FiChevronRight size={12} className={`text-dark-500 transition-transform ${expandedFeature === i ? 'rotate-90' : ''}`} />
                            </div>
                            {expandedFeature === i && (
                              <p className="text-dark-300 text-xs leading-relaxed mt-1.5 pl-0">{f.detail}</p>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Quiz button */}
                      <div className="px-3 pb-3">
                        <button
                          onClick={loadQuiz}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium shadow-lg shadow-purple-500/20 transition-all"
                        >
                          <FiHelpCircle size={14} />
                          Test Your Knowledge
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Quiz overlay */}
            {quiz && (
              <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-dark-800/95 backdrop-blur-xl rounded-2xl max-w-sm w-full border border-purple-500/20 shadow-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FiHelpCircle size={16} className="text-purple-400" />
                      <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Quiz</span>
                    </div>
                    <button onClick={() => { setQuiz(null); setQuizAnswer(null); setSelectedOption(null); }} className="text-dark-500 hover:text-white transition-colors">
                      <FiX size={16} />
                    </button>
                  </div>

                  <p className="text-white text-sm font-medium mb-4">{quiz.question}</p>

                  <div className="space-y-2">
                    {quiz.options?.map((opt, i) => {
                      let btnClass = 'w-full text-left px-4 py-3 rounded-xl text-sm transition-all ';
                      if (quizAnswer) {
                        if (quizAnswer.correct && selectedOption === i) {
                          btnClass += 'bg-green-500/20 border border-green-500/40 text-green-300';
                        } else if (!quizAnswer.correct && selectedOption === i) {
                          btnClass += 'bg-red-500/20 border border-red-500/40 text-red-300';
                        } else {
                          btnClass += 'bg-dark-700/50 text-dark-500 border border-transparent';
                        }
                      } else {
                        btnClass += 'bg-dark-700/60 hover:bg-dark-600/80 text-dark-200 border border-transparent hover:border-purple-500/30';
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (quizAnswer) return;
                            setSelectedOption(i);
                            submitAnswer(i);
                          }}
                          className={btnClass}
                          disabled={!!quizAnswer}
                        >
                          <span className="text-dark-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizAnswer && (
                    <div className={`mt-4 p-3 rounded-xl text-xs leading-relaxed ${
                      quizAnswer.correct
                        ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    }`}>
                      {quizAnswer.explanation}
                    </div>
                  )}

                  {quizAnswer && (
                    <button
                      onClick={() => { setQuiz(null); setQuizAnswer(null); setSelectedOption(null); }}
                      className="w-full mt-3 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-dark-300 text-xs transition-all"
                    >
                      Continue Exploring
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4 pt-8">
              <div className="flex items-center justify-center">
                <button onClick={handleClose} className="px-6 py-2.5 rounded-xl bg-dark-700/80 backdrop-blur-sm hover:bg-dark-600 text-dark-300 text-sm transition-all">
                  End Session
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

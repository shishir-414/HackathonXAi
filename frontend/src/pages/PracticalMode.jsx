import { useState, useEffect, useRef, useCallback } from 'react';
import { practicalAPI } from '../api';

import {
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  CircularProgress,
  Card,
  CardContent,
  Collapse,
  alpha,
} from '@mui/material';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';

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

      ctx.strokeStyle = isActive ? '#22d3ee' : '#a5f3fc';
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      if (isActive) {
        const cl = Math.min(20, w * 0.2, h * 0.2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#06b6d4';
        ctx.beginPath(); ctx.moveTo(x, y + cl); ctx.lineTo(x, y); ctx.lineTo(x + cl, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - cl, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h - cl); ctx.lineTo(x, y + h); ctx.lineTo(x + cl, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - cl, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cl); ctx.stroke();
      }

      const label = obj.class + ' ' + Math.round(obj.score * 100) + '%';
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = isActive ? 'rgba(6,182,212,0.85)' : 'rgba(6,182,212,0.55)';
      ctx.beginPath(); ctx.roundRect(x, y - 24, tw, 22, 4); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 6, y - 9);
    });
  }, [activeObject]);

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

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 50, bgcolor: 'black' }}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>

        {/* Camera (always rendered) */}
        <Box
          component="video"
          ref={videoRef}
          playsInline
          muted
          autoPlay
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            visibility: stage === 'detecting' ? 'visible' : 'hidden',
          }}
        />
        <Box
          component="canvas"
          ref={canvasRef}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            visibility: stage === 'detecting' ? 'visible' : 'hidden',
          }}
        />

        {/* Loading */}
        {stage === 'loading' && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              bgcolor: '#0a0a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: 280, mx: 'auto', px: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #22d3ee, #2563eb)',
                  mb: 3,
                  boxShadow: '0 8px 24px rgba(34,211,238,0.2)',
                }}
              >
                <CameraAltRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                Object Explorer
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Point your camera at any object to learn about it
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                <CircularProgress size={16} sx={{ color: '#22d3ee' }} />
                <Typography variant="body2" sx={{ color: '#22d3ee' }}>
                  {loadProgress}
                </Typography>
              </Box>
              <Button onClick={handleClose} sx={{ mt: 4, color: 'text.disabled', textTransform: 'none' }}>
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {/* Error */}
        {stage === 'error' && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              bgcolor: '#0a0a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: 280, mx: 'auto', px: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  borderRadius: 3,
                  bgcolor: alpha('#ef4444', 0.15),
                  mb: 3,
                }}
              >
                <ErrorOutlineRoundedIcon sx={{ fontSize: 28, color: '#f87171' }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                Oops!
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                {error}
              </Typography>
              <Button
                variant="contained"
                onClick={handleClose}
                sx={{
                  bgcolor: alpha('#fff', 0.08),
                  '&:hover': { bgcolor: alpha('#fff', 0.12) },
                  textTransform: 'none',
                }}
              >
                Go Back
              </Button>
            </Box>
          </Box>
        )}

        {/* Detection UI */}
        {stage === 'detecting' && (
          <>
            {/* Top bar */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#4ade80',
                      animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                      '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    Object Explorer
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {detectedObjects.length > 0 ? `${detectedObjects.length} detected` : 'Scanning...'}
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleClose}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Hint when nothing detected */}
            {detectedObjects.length === 0 && !features && (
              <Box sx={{ position: 'absolute', top: 96, left: 0, right: 0, zIndex: 10, px: 2 }}>
                <Card
                  sx={{
                    maxWidth: 360,
                    mx: 'auto',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center',
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <CameraAltRoundedIcon sx={{ fontSize: 24, color: '#22d3ee', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 500, mb: 0.5 }}>
                      Point your camera at any object
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Try: water bottle, phone, book, fruit, plant, laptop...
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Feature card */}
            {(features || loadingFeatures) && !quiz && (
              <Box sx={{ position: 'absolute', bottom: 112, left: 0, right: 0, zIndex: 10, px: 1.5 }}>
                <Card
                  sx={{
                    maxWidth: 360,
                    mx: 'auto',
                    bgcolor: 'rgba(30,30,50,0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid',
                    borderColor: alpha('#22d3ee', 0.2),
                    overflow: 'hidden',
                  }}
                >
                  {loadingFeatures ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 3 }}>
                      <CircularProgress size={16} sx={{ color: '#22d3ee' }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Learning about this object...
                      </Typography>
                    </Box>
                  ) : features && (
                    <>
                      {/* Header */}
                      <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #22d3ee, #2563eb)',
                          }}
                        >
                          <MenuBookRoundedIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'white' }} noWrap>
                            {features.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#22d3ee' }}>
                            {features.category}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Features list */}
                      <Box sx={{ px: 1.5, pb: 1.5, maxHeight: 192, overflowY: 'auto' }}>
                        {features.features?.map((f, i) => (
                          <Box
                            key={i}
                            onClick={() => setExpandedFeature(expandedFeature === i ? null : i)}
                            sx={{
                              px: 1.5,
                              py: 1,
                              borderRadius: 2,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                              transition: 'all 0.2s',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" sx={{ color: '#22d3ee', fontWeight: 700 }}>
                                {f.title}
                              </Typography>
                              <ChevronRightRoundedIcon
                                sx={{
                                  fontSize: 12,
                                  color: 'text.disabled',
                                  transition: 'transform 0.2s',
                                  transform: expandedFeature === i ? 'rotate(90deg)' : 'none',
                                }}
                              />
                            </Box>
                            <Collapse in={expandedFeature === i}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6, mt: 0.5, display: 'block' }}>
                                {f.detail}
                              </Typography>
                            </Collapse>
                          </Box>
                        ))}
                      </Box>

                      {/* Quiz button */}
                      <Box sx={{ px: 1.5, pb: 1.5 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<HelpOutlineRoundedIcon sx={{ fontSize: 14 }} />}
                          onClick={loadQuiz}
                          sx={{
                            py: 1,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            textTransform: 'none',
                            boxShadow: '0 4px 16px rgba(124,58,237,0.2)',
                            '&:hover': { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' },
                          }}
                        >
                          Test Your Knowledge
                        </Button>
                      </Box>
                    </>
                  )}
                </Card>
              </Box>
            )}

            {/* Quiz overlay */}
            {quiz && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 20,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                }}
              >
                <Card
                  sx={{
                    maxWidth: 360,
                    width: '100%',
                    bgcolor: 'rgba(30,30,50,0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid',
                    borderColor: alpha('#a855f7', 0.2),
                    p: 2.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HelpOutlineRoundedIcon sx={{ fontSize: 16, color: '#c084fc' }} />
                      <Typography variant="overline" sx={{ color: '#c084fc', fontWeight: 700 }}>
                        Quiz
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => { setQuiz(null); setQuizAnswer(null); setSelectedOption(null); }}
                      size="small"
                      sx={{ color: 'text.disabled' }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500, mb: 2 }}>
                    {quiz.question}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {quiz.options?.map((opt, i) => {
                      let sx = {
                        textAlign: 'left',
                        px: 2,
                        py: 1.5,
                        borderRadius: 3,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        border: '1px solid transparent',
                        transition: 'all 0.2s',
                      };
                      if (quizAnswer) {
                        if (quizAnswer.correct && selectedOption === i) {
                          sx = { ...sx, bgcolor: alpha('#22c55e', 0.12), borderColor: alpha('#22c55e', 0.4), color: '#86efac' };
                        } else if (!quizAnswer.correct && selectedOption === i) {
                          sx = { ...sx, bgcolor: alpha('#ef4444', 0.12), borderColor: alpha('#ef4444', 0.4), color: '#fca5a5' };
                        } else {
                          sx = { ...sx, bgcolor: alpha('#fff', 0.03), color: 'text.disabled' };
                        }
                      } else {
                        sx = {
                          ...sx,
                          bgcolor: alpha('#fff', 0.04),
                          color: '#e2e8f0',
                          '&:hover': { bgcolor: alpha('#fff', 0.06), borderColor: alpha('#a855f7', 0.3) },
                        };
                      }

                      return (
                        <Button
                          key={i}
                          onClick={() => {
                            if (quizAnswer) return;
                            setSelectedOption(i);
                            submitAnswer(i);
                          }}
                          disabled={!!quizAnswer}
                          sx={sx}
                        >
                          <Typography component="span" sx={{ color: 'text.disabled', mr: 1 }}>
                            {String.fromCharCode(65 + i)}.
                          </Typography>
                          {opt}
                        </Button>
                      );
                    })}
                  </Box>

                  {quizAnswer && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 3,
                        fontSize: '0.75rem',
                        lineHeight: 1.6,
                        bgcolor: quizAnswer.correct ? alpha('#22c55e', 0.08) : alpha('#f59e0b', 0.08),
                        border: '1px solid',
                        borderColor: quizAnswer.correct ? alpha('#22c55e', 0.2) : alpha('#f59e0b', 0.2),
                        color: quizAnswer.correct ? '#86efac' : '#fcd34d',
                      }}
                    >
                      <Typography variant="caption">{quizAnswer.explanation}</Typography>
                    </Box>
                  )}

                  {quizAnswer && (
                    <Button
                      fullWidth
                      onClick={() => { setQuiz(null); setQuizAnswer(null); setSelectedOption(null); }}
                      sx={{
                        mt: 1.5,
                        py: 1,
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.06),
                        color: 'text.secondary',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: alpha('#fff', 0.1) },
                      }}
                    >
                      Continue Exploring
                    </Button>
                  )}
                </Card>
              </Box>
            )}

            {/* Bottom bar */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                p: 2,
                pt: 4,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                onClick={handleClose}
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  color: 'text.secondary',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                }}
              >
                End Session
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

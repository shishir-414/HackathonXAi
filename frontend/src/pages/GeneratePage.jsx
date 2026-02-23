import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../api';
import { useVideoStore } from '../store';
import toast from 'react-hot-toast';
import { FiSend, FiZap, FiLoader, FiCheck } from 'react-icons/fi';

const SUGGESTED_QUESTIONS = [
  { emoji: '🌿', q: 'What is photosynthesis?' },
  { emoji: '🌍', q: 'How does gravity work?' },
  { emoji: '💧', q: 'Explain the water cycle' },
  { emoji: '🧬', q: 'What are cells made of?' },
  { emoji: '⚡', q: 'What is electricity?' },
  { emoji: '🌋', q: 'What causes earthquakes?' },
  { emoji: '🔢', q: 'What is the Pythagorean theorem?' },
  { emoji: '🧪', q: 'What is an atom?' },
];

export default function GeneratePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(searchParams.get('q') || '');
  const [generating, setGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const { addVideo } = useVideoStore();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuestion(q);
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setGenerating(true);
    setGeneratedVideo(null);

    try {
      const { data } = await videoAPI.generate({ question: question.trim() });
      setGeneratedVideo(data);
      addVideo(data);
      toast.success('Video generation started! It will be ready in about a minute.');

      // Poll for completion
      pollVideoStatus(data.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate video');
    } finally {
      setGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await videoAPI.get(videoId);
        setGeneratedVideo(data);
        if (data.status === 'completed') {
          clearInterval(interval);
          toast.success('Video is ready! 🎬');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          toast.error('Video generation failed');
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-2xl mb-4">
          <FiZap size={28} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Ask a Question</h1>
        <p className="text-dark-400">Get an AI-generated educational video in seconds</p>
      </div>

      {/* Input */}
      <div className="card mb-8">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here... e.g., 'What is photosynthesis?'"
            className="input-field min-h-[120px] resize-none pr-16 text-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !question.trim()}
            className="absolute bottom-4 right-4 w-12 h-12 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            {generating ? (
              <FiLoader className="animate-spin" size={20} />
            ) : (
              <FiSend size={20} />
            )}
          </button>
        </div>
        <p className="text-xs text-dark-500 mt-2">Press Enter to generate, Shift+Enter for new line</p>
      </div>

      {/* Generated Video Status */}
      {generatedVideo && (
        <div className="card mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              generatedVideo.status === 'completed'
                ? 'bg-green-500/20 text-green-400'
                : generatedVideo.status === 'failed'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {generatedVideo.status === 'completed' ? (
                <FiCheck size={24} />
              ) : generatedVideo.status === 'failed' ? (
                <span className="text-xl">✗</span>
              ) : (
                <FiLoader size={24} className="animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{generatedVideo.title}</h3>
              <p className="text-sm text-dark-400">
                {generatedVideo.status === 'completed'
                  ? `Ready! Duration: ${generatedVideo.duration}s`
                  : generatedVideo.status === 'failed'
                  ? 'Generation failed. Try again.'
                  : 'Generating your video...'}
              </p>
            </div>
            {generatedVideo.status === 'completed' && (
              <button
                onClick={() => navigate('/feed', { state: { videoId: generatedVideo.id } })}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Watch <FiZap size={16} />
              </button>
            )}
          </div>

          {/* Script preview */}
          {generatedVideo.script && (
            <div className="mt-4 p-4 bg-dark-800 rounded-xl">
              <p className="text-xs text-dark-500 mb-2 font-semibold">GENERATED SCRIPT</p>
              <p className="text-sm text-dark-300 leading-relaxed">{generatedVideo.script}</p>
            </div>
          )}
        </div>
      )}

      {/* Suggested Questions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Try these questions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_QUESTIONS.map(({ emoji, q }) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="flex items-center gap-3 p-4 bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-primary-500/30 rounded-xl text-left transition-all duration-200"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-sm text-dark-300">{q}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

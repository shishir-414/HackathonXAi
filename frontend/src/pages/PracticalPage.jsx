import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCamera, FiArrowLeft, FiZap, FiSmartphone, FiBookOpen, FiHelpCircle } from 'react-icons/fi';
import PracticalMode from './PracticalMode';

export default function PracticalPage() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);

  if (started) {
    return <PracticalMode onClose={() => setStarted(false)} />;
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-8 transition-colors"
      >
        <FiArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-cyan-500/30">
          <FiCamera size={34} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Object Explorer</h1>
        <p className="text-dark-400 text-sm max-w-md mx-auto leading-relaxed">
          Point your camera at any object around you — AI will identify it and
          show you interesting facts, science, and educational features about it!
        </p>
      </div>

      {/* How it works */}
      <div className="bg-dark-800/60 border border-dark-700 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wide mb-4">How it works</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiSmartphone size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">1. Open Camera</p>
              <p className="text-dark-400 text-xs">AI loads in your browser — no data leaves your device</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiZap size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">2. Point at Objects</p>
              <p className="text-dark-400 text-xs">Bottles, books, phones, fruits, plants — anything!</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiBookOpen size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">3. Learn Features</p>
              <p className="text-dark-400 text-xs">See what it's made of, how it works, and fun science facts</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiHelpCircle size={14} className="text-purple-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">4. Take a Quiz</p>
              <p className="text-dark-400 text-xs">Test your knowledge with questions about each object</p>
            </div>
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => setStarted(true)}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <FiCamera size={20} />
        Start Exploring
      </button>

      <p className="text-center text-dark-600 text-xs mt-4">
        Works best with good lighting. Supports 20+ common objects.
      </p>
    </div>
  );
}

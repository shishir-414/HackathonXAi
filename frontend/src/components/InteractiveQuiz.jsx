import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiAward, FiRefreshCw } from 'react-icons/fi';
import { practicalAPI } from '../api';

export default function InteractiveQuiz({ topic, onClose, onNextQuiz }) {
  const [quiz, setQuiz] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Load quiz on mount
  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setSelectedIndex(null);
    setResult(null);
    try {
      const { data } = await practicalAPI.getQuiz(topic);
      setQuiz(data);
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (index) => {
    if (selectedIndex !== null) return; // Already answered
    setSelectedIndex(index);

    try {
      const { data } = await practicalAPI.checkAnswer(
        topic,
        index,
        quiz.correct_index
      );
      setResult(data);
      setScore((prev) => ({
        correct: prev.correct + (data.is_correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      console.error('Failed to check answer:', err);
      const isCorrect = index === quiz.correct_index;
      setResult({
        is_correct: isCorrect,
        explanation: isCorrect ? 'Correct!' : 'Not quite right.',
      });
      setScore((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    }
  };

  if (loading) {
    return (
      <div className="bg-dark-800/95 backdrop-blur-xl rounded-2xl p-6 border border-dark-600 max-w-sm mx-auto">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
          <span className="text-dark-300">Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="bg-dark-800/95 backdrop-blur-xl rounded-2xl p-6 border border-dark-600 max-w-sm mx-auto">
        <p className="text-dark-400 text-center">No quiz available for this topic.</p>
        <button onClick={onClose} className="mt-4 w-full btn-primary text-sm py-2">
          Back to Camera
        </button>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/95 backdrop-blur-xl rounded-2xl p-5 border border-dark-600 max-w-sm mx-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiAward className="text-yellow-400" size={18} />
          <span className="text-sm font-semibold text-white">Quick Quiz</span>
        </div>
        <div className="text-xs text-dark-400 bg-dark-700 px-2 py-1 rounded-full">
          {score.correct}/{score.total} correct
        </div>
      </div>

      {/* Question */}
      <h3 className="text-white font-medium text-base mb-4 leading-relaxed">
        {quiz.question}
      </h3>

      {/* Options */}
      <div className="space-y-2.5 mb-4">
        {quiz.options.map((option, index) => {
          let optionStyle = 'border-dark-600 hover:border-primary-500/50 hover:bg-dark-700/50';
          let icon = null;

          if (selectedIndex !== null) {
            if (index === quiz.correct_index) {
              optionStyle = 'border-green-500/60 bg-green-500/10';
              icon = <FiCheck className="text-green-400" size={16} />;
            } else if (index === selectedIndex && index !== quiz.correct_index) {
              optionStyle = 'border-red-500/60 bg-red-500/10';
              icon = <FiX className="text-red-400" size={16} />;
            } else {
              optionStyle = 'border-dark-700 opacity-50';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={selectedIndex !== null}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${optionStyle}`}
            >
              <span className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-dark-300 flex-shrink-0">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm text-white flex-1">{option}</span>
              {icon}
            </button>
          );
        })}
      </div>

      {/* Result explanation */}
      {result && (
        <div
          className={`p-3 rounded-xl text-sm leading-relaxed mb-4 ${
            result.is_correct
              ? 'bg-green-500/10 border border-green-500/30 text-green-300'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
          }`}
        >
          {result.is_correct ? '🎉 ' : '💡 '}
          {result.explanation}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {result && (
          <button
            onClick={loadQuiz}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-all"
          >
            <FiRefreshCw size={14} />
            Next Question
          </button>
        )}
        <button
          onClick={onClose}
          className={`${result ? '' : 'flex-1'} px-4 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-dark-300 text-sm transition-all`}
        >
          {result ? 'Done' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

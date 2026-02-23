import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { documentAPI, videoAPI } from '../api';
import { useVideoStore } from '../store';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiFile, FiLoader, FiCheck, FiVideo, FiChevronRight } from 'react-icons/fi';

export default function UploadPage() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState(null);
  const { addVideo } = useVideoStore();

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const { data } = await documentAPI.upload(file);
        setDocuments((prev) => [data, ...prev]);
        toast.success(`${file.name} uploaded successfully!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const loadQuestions = async (doc) => {
    setSelectedDoc(doc);
    setQuestionsLoading(true);
    setQuestions([]);

    // Poll for questions
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data } = await documentAPI.getQuestions(doc.id);
        if (data.status === 'completed' && data.questions.length > 0) {
          setQuestions(data.questions);
          setQuestionsLoading(false);
          return;
        }
        // Wait 2 seconds before polling again
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        break;
      }
    }
    setQuestionsLoading(false);
    toast.error('Could not extract questions. Try a different document.');
  };

  const generateVideoFromQuestion = async (questionIndex) => {
    if (!selectedDoc) return;

    setGeneratingIdx(questionIndex);
    try {
      const { data } = await documentAPI.generateVideo(selectedDoc.id, questionIndex);
      addVideo(data);
      toast.success('Video generation started!');
    } catch (err) {
      toast.error('Failed to start video generation');
    } finally {
      setGeneratingIdx(null);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data } = await documentAPI.list();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useState(() => {
    loadDocuments();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl mb-4">
          <FiUploadCloud size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Upload Notes</h1>
        <p className="text-dark-400">Upload your study materials and we'll generate Q&A videos</p>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`card mb-8 cursor-pointer transition-all duration-300 text-center py-12
          ${isDragActive
            ? 'border-primary-500 bg-primary-500/5 border-dashed border-2'
            : 'border-dashed border-2 border-dark-700 hover:border-primary-500/50'
          }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <FiLoader size={40} className="text-primary-400 animate-spin" />
            <p className="text-dark-300">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <FiUploadCloud size={48} className={isDragActive ? 'text-primary-400' : 'text-dark-500'} />
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-dark-500 mt-1">
                or click to browse — PDF, DOCX, TXT (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Documents</h3>
          {documents.length === 0 ? (
            <div className="card text-center py-8">
              <FiFile size={32} className="mx-auto text-dark-600 mb-2" />
              <p className="text-sm text-dark-500">No documents yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => loadQuestions(doc)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    selectedDoc?.id === doc.id
                      ? 'bg-primary-600/10 border-primary-500/30'
                      : 'bg-dark-900 border-dark-800 hover:border-dark-600'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0">
                    <FiFile size={18} className="text-dark-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-dark-500 mt-0.5">
                      {doc.processed ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <FiCheck size={12} /> Processed
                        </span>
                      ) : (
                        <span className="text-yellow-400">Processing...</span>
                      )}
                    </p>
                  </div>
                  <FiChevronRight size={16} className="text-dark-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Questions Panel */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Extracted Questions</h3>
          {!selectedDoc ? (
            <div className="card text-center py-8">
              <p className="text-sm text-dark-500">Select a document to see extracted questions</p>
            </div>
          ) : questionsLoading ? (
            <div className="card text-center py-8">
              <FiLoader size={32} className="mx-auto text-primary-400 animate-spin mb-3" />
              <p className="text-sm text-dark-400">Extracting questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-dark-500">No questions extracted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-4 bg-dark-900 border border-dark-800 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center text-sm font-bold text-primary-400 flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="flex-1 text-sm text-dark-300">{q}</p>
                  <button
                    onClick={() => generateVideoFromQuestion(idx)}
                    disabled={generatingIdx === idx}
                    className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 flex items-center justify-center transition-all"
                  >
                    {generatingIdx === idx ? (
                      <FiLoader size={16} className="animate-spin" />
                    ) : (
                      <FiVideo size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

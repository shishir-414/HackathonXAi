import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { documentAPI, videoAPI } from '../api';
import { useVideoStore } from '../store';
import toast from 'react-hot-toast';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Grid,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';

export default function UploadPage() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState(null);
  const { addVideo } = useVideoStore();
  const theme = useTheme();

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
    maxSize: 10 * 1024 * 1024,
  });

  const loadQuestions = async (doc) => {
    setSelectedDoc(doc);
    setQuestionsLoading(true);
    setQuestions([]);

    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data } = await documentAPI.getQuestions(doc.id);
        if (data.status === 'completed' && data.questions.length > 0) {
          setQuestions(data.questions);
          setQuestionsLoading(false);
          return;
        }
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
    <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #22c55e, #10b981)',
            mb: 2,
          }}
        >
          <CloudUploadRoundedIcon sx={{ fontSize: 28, color: 'white' }} />
        </Avatar>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Upload Notes
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Upload your study materials and we'll generate Q&A videos
        </Typography>
      </Box>

      {/* Dropzone */}
      <Card
        {...getRootProps()}
        sx={{
          mb: 4,
          cursor: 'pointer',
          textAlign: 'center',
          py: 6,
          border: '2px dashed',
          borderColor: isDragActive
            ? 'primary.main'
            : alpha(theme.palette.text.primary, 0.12),
          bgcolor: isDragActive
            ? alpha(theme.palette.primary.main, 0.04)
            : 'transparent',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.5),
          },
        }}
      >
        <input {...getInputProps()} />
        <CardContent>
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Uploading...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CloudUploadRoundedIcon
                sx={{
                  fontSize: 48,
                  color: isDragActive ? 'primary.main' : 'text.disabled',
                }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                or click to browse — PDF, DOCX, TXT (max 10MB)
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Two column layout */}
      <Grid container spacing={3}>
        {/* Document List */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Your Documents
          </Typography>
          {documents.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <InsertDriveFileRoundedIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                No documents yet
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {documents.map((doc) => (
                <Card
                  key={doc.id}
                  onClick={() => loadQuestions(doc)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderColor: selectedDoc?.id === doc.id
                      ? alpha(theme.palette.primary.main, 0.3)
                      : 'transparent',
                    bgcolor: selectedDoc?.id === doc.id
                      ? alpha(theme.palette.primary.main, 0.06)
                      : undefined,
                    '&:hover': { borderColor: alpha(theme.palette.text.primary, 0.15) },
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, '&:last-child': { pb: 2 } }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                      }}
                    >
                      <InsertDriveFileRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                        {doc.filename}
                      </Typography>
                      <Typography variant="caption" sx={{ color: doc.processed ? 'success.main' : 'warning.main' }}>
                        {doc.processed ? (
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleRoundedIcon sx={{ fontSize: 12 }} /> Processed
                          </Box>
                        ) : (
                          'Processing...'
                        )}
                      </Typography>
                    </Box>
                    <ChevronRightRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Grid>

        {/* Questions Panel */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Extracted Questions
          </Typography>
          {!selectedDoc ? (
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                Select a document to see extracted questions
              </Typography>
            </Card>
          ) : questionsLoading ? (
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={32} sx={{ mb: 1.5 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Extracting questions...
              </Typography>
            </Card>
          ) : questions.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                No questions extracted yet
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {questions.map((q, idx) => (
                <Card key={idx}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, '&:last-child': { pb: 2 } }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </Avatar>
                    <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>
                      {q}
                    </Typography>
                    <IconButton
                      onClick={() => generateVideoFromQuestion(idx)}
                      disabled={generatingIdx === idx}
                      size="small"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': { bgcolor: alpha(theme.palette.text.primary, 0.08) },
                      }}
                    >
                      {generatingIdx === idx ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <VideocamRoundedIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

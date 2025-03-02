import React, { useState, useEffect } from 'react';
import { useRepo } from '../contexts/RepoContext';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Container, Alert, CircularProgress, List, ListItem, ListItemText } from '@mui/material';
import { GitHub } from '@mui/icons-material';

const RepoSelector = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [logs, setLogs] = useState([]);
  const { fetchRepoData, loading, error, fetchLogs } = useRepo();
  const navigate = useNavigate();

  // Reference to the logs container for auto-scrolling
  const logsEndRef = React.useRef(null);

  // Add a log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, timestamp, type }]);
  };

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Clear logs when starting new repository loading
  useEffect(() => {
    if (!loading) return;
    setLogs([{ message: 'Starting repository load...', timestamp: new Date().toLocaleTimeString(), type: 'info' }]);
  }, [loading]);

  // Monitor for error changes
  useEffect(() => {
    if (error) {
      addLog(error, 'error');
    }
  }, [error]);
  
  // Monitor and sync logs from the RepoContext
  useEffect(() => {
    if (fetchLogs && fetchLogs.length > 0) {
      // Get the latest log that we haven't processed yet
      const lastLog = fetchLogs[fetchLogs.length - 1];
      addLog(lastLog.message, lastLog.type);
    }
  }, [fetchLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate and parse GitHub URL
    if (!repoUrl.trim()) {
      setUrlError('Please enter a GitHub repository URL');
      return;
    }
    
    setLogs([]); // Clear previous logs
    addLog(`Processing repository URL: ${repoUrl}`);
    
    try {
      // Extract owner and repo from GitHub URL
      // Support formats like:
      // - https://github.com/owner/repo
      // - github.com/owner/repo
      // - owner/repo
      let owner, repo;
      const urlPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/?$/;
      const simplePattern = /^([^/]+)\/([^/]+)$/;
      
      const urlMatch = repoUrl.match(urlPattern);
      const simpleMatch = repoUrl.match(simplePattern);
      
      if (urlMatch) {
        owner = urlMatch[1];
        repo = urlMatch[2];
      } else if (simpleMatch) {
        owner = simpleMatch[1];
        repo = simpleMatch[2];
      } else {
        const errorMsg = 'Invalid GitHub repository URL format. Use: owner/repo or https://github.com/owner/repo';
        setUrlError(errorMsg);
        addLog(errorMsg, 'error');
        return;
      }
      
      addLog(`Extracted repository information: ${owner}/${repo}`);
      addLog(`Fetching repository data...`);
      
      // We don't need the interval anymore since we're using fetchLogs
      // Fetch repository data
      await fetchRepoData(owner, repo);
      
      addLog(`Repository data fetched successfully!`, 'success');
      addLog(`Navigating to dashboard...`, 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error("Error processing repo URL:", err);
      const errorMsg = 'Failed to parse repository URL or fetch repository data';
      setUrlError(errorMsg);
      addLog(errorMsg, 'error');
      if (err.message) {
        addLog(`Error details: ${err.message}`, 'error');
      }
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <GitHub fontSize="large" sx={{ mr: 2 }} />
            <Typography component="h1" variant="h5">
              Select GitHub Repository
            </Typography>
          </Box>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            Enter the URL of the GitHub repository you want to manage:
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="GitHub Repository URL"
              placeholder="owner/repo or https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setUrlError('');
              }}
              error={!!urlError}
              helperText={urlError}
              autoFocus
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading || !repoUrl.trim()}
              sx={{ mt: 2, mb: 2 }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Loading Repository...' : 'Continue'}
            </Button>
            
            {/* Log display area */}
            {logs.length > 0 && (
              <Paper 
                variant="outlined" 
                sx={{ 
                  mt: 3, 
                  p: 2, 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  backgroundColor: '#f5f5f5'
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Loading Logs:
                </Typography>
                <List dense>
                  {logs.map((log, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemText 
                        primary={
                          <Typography 
                            variant="body2" 
                            component="span"
                            sx={{ 
                              color: log.type === 'error' ? 'error.main' : 
                                     log.type === 'success' ? 'success.main' : 
                                     'text.primary'
                            }}
                          >
                            <span style={{ opacity: 0.7 }}>[{log.timestamp}]</span> {log.message}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                  <div ref={logsEndRef} />
                </List>
              </Paper>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RepoSelector;
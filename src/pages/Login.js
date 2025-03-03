import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, TextField, Typography, Paper, Container, Alert, Divider } from '@mui/material';
import { GitHub } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [token, setToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const { login, loading, error, isAuthenticated } = useAuth();
  const [usingEnvVar, setUsingEnvVar] = useState(!!process.env.REACT_APP_GITHUB_TOKEN);
  
  const navigate = useNavigate();
  
  // Add effect to navigate when isAuthenticated changes
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is authenticated, redirecting to select-repo");
      navigate('/select-repo');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    
    console.log("Attempting login with token:", token.substring(0, 5) + '...');
    await login(token, repoUrl);
    console.log("Login function completed");
    // Don't need to manually check isAuthenticated or navigate
    // since the useEffect will handle that when isAuthenticated changes
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <GitHub fontSize="large" sx={{ mr: 2 }} />
            <Typography component="h1" variant="h5">
              GitHub Release Dashboard
            </Typography>
          </Box>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            Sign in with your GitHub Personal Access Token to manage your repository releases.
          </Typography>

          {usingEnvVar ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Using GitHub token from environment variables. You can set a new token below to override it.
            </Alert>
          ) : (
            <Typography variant="body1" sx={{ mb: 3 }}>
              Sign in with your GitHub Personal Access Token to manage your repository releases.
            </Typography>
          )}

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required={!usingEnvVar}
              fullWidth
              label="GitHub Personal Access Token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus={!usingEnvVar}
              hhelperText={usingEnvVar
                ? "Enter a new token to override the environment variable"
                : "Create a token at GitHub > Settings > Developer settings > Personal access tokens"
              }
            />
            
            <TextField
              margin="normal"
              fullWidth
              label="Repository URL (optional)"
              type="text"
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              helperText={usingEnvVar && process.env.REACT_APP_DEFAULT_REPO_URL 
                ? "Enter a new URL to override the default from environment variables" 
                : "Enter repository URL to use immediately after login"
              }
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading || !token.trim()}
              sx={{ mt: 2, mb: 2 }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
            
            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Your token needs permissions for: repos, read:org, read:user
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            For improved security, consider using environment variables by creating a .env file.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
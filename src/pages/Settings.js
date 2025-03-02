import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { CachedOutlined, InfoOutlined, WarningAmberOutlined } from '@mui/icons-material';
import AppNavbar from '../components/AppNavbar';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const { 
    cacheExpiryTime, 
    updateCacheExpiryTime,
    itemLimit,
    updateItemLimit,
    rateLimit, 
    fetchRateLimit, 
    clearAllCache,
    isLoading 
  } = useSettings();
  
  const [tempCacheTime, setTempCacheTime] = useState(cacheExpiryTime);
  const [tempItemLimit, setTempItemLimit] = useState(itemLimit || '');
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Fetch rate limit only on component mount
    fetchRateLimit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTempCacheTime(cacheExpiryTime);
  }, [cacheExpiryTime]);
  
  useEffect(() => {
    setTempItemLimit(itemLimit || '');
  }, [itemLimit]);

  const handleCacheTimeChange = (e) => {
    setTempCacheTime(e.target.value);
  };
  
  const handleItemLimitChange = (e) => {
    setTempItemLimit(e.target.value);
  };

  const handleUpdateCacheTime = () => {
    const success = updateCacheExpiryTime(tempCacheTime);
    if (success) {
      setMessage({ text: 'Cache expiry time updated successfully!', severity: 'success' });
    } else {
      setMessage({ text: 'Please enter a valid positive number for cache time.', severity: 'error' });
    }
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };
  
  const handleUpdateItemLimit = () => {
    const success = updateItemLimit(tempItemLimit);
    if (success) {
      setMessage({ 
        text: tempItemLimit ? 'Item limit updated successfully!' : 'Item limit removed successfully!', 
        severity: 'success' 
      });
    } else {
      setMessage({ text: 'Please enter a valid positive number for item limit.', severity: 'error' });
    }
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const handleClearCache = () => {
    clearAllCache();
    setMessage({ text: 'All cached data has been cleared.', severity: 'success' });
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Calculate percentage of rate limit used
  const calculateRateLimitPercentage = () => {
    if (!rateLimit) return 0;
    return Math.round((rateLimit.used / rateLimit.limit) * 100);
  };

  const getRateLimitColor = () => {
    const percent = calculateRateLimitPercentage();
    if (percent > 80) return 'error';
    if (percent > 50) return 'warning';
    return 'success';
  };

  return (
    <>
      <AppNavbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>

        {showMessage && (
          <Alert 
            severity={message.severity} 
            sx={{ mb: 2 }}
            onClose={() => setShowMessage(false)}
          >
            {message.text}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Cache Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Cache Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TextField
                  label="Cache Expiry Time (minutes)"
                  type="number"
                  value={tempCacheTime}
                  onChange={handleCacheTimeChange}
                  sx={{ mr: 2 }}
                  InputProps={{
                    inputProps: { min: 1 }
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleUpdateCacheTime}
                  disabled={tempCacheTime === cacheExpiryTime}
                >
                  Update
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Tooltip title="Leave blank to remove limit (retrieve all available items)">
                  <TextField
                    label="Item Limit (PRs and Issues)"
                    type="number"
                    value={tempItemLimit}
                    onChange={handleItemLimitChange}
                    sx={{ mr: 2 }}
                    placeholder="No limit"
                    helperText="Maximum number of PRs/issues to fetch (blank = no limit)"
                    InputProps={{
                      inputProps: { min: 1 }
                    }}
                  />
                </Tooltip>
                <Button 
                  variant="contained" 
                  onClick={handleUpdateItemLimit}
                  disabled={tempItemLimit === itemLimit}
                >
                  Update
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  startIcon={<CachedOutlined />}
                  onClick={handleClearCache}
                >
                  Clear All Cached Data
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* GitHub API Rate Limit */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  GitHub API Rate Limit
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={fetchRateLimit}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {rateLimit ? (
                <>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="text.secondary" gutterBottom>
                            Rate Limit Usage
                          </Typography>
                          <Typography variant="h5" component="div">
                            {rateLimit.used} / {rateLimit.limit}
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={calculateRateLimitPercentage()} 
                              color={getRateLimitColor()} 
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="text.secondary" gutterBottom>
                            Reset Time
                          </Typography>
                          <Typography variant="h5" component="div">
                            {formatDateTime(rateLimit.reset)}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Requests remaining: {rateLimit.remaining}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                    <InfoOutlined color="info" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      GitHub's REST API has a rate limit of 5,000 requests per hour for authenticated users.
                    </Typography>
                  </Box>

                  {calculateRateLimitPercentage() > 80 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        You are approaching GitHub's API rate limit. Consider adjusting the cache settings to reduce API calls.
                      </Typography>
                    </Alert>
                  )}
                </>
              ) : isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                  <WarningAmberOutlined color="warning" sx={{ mr: 1 }} />
                  <Typography>
                    Failed to fetch rate limit information. Please try again.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Token Security */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Token Security
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Your GitHub Personal Access Token is currently stored in browser localStorage. 
                  While convenient, this is not the most secure storage method and could be vulnerable to XSS attacks.
                </Typography>
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Recommendations:
              </Typography>
              <ul>
                <li>Use a token with minimal required permissions</li>
                <li>Rotate your token periodically</li>
                <li>Set token expiration dates when creating tokens in GitHub</li>
              </ul>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default Settings;
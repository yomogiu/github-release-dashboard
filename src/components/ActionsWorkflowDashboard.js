import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip as MuiTooltip,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { useRepo } from '../contexts/RepoContext';
import { useSettings } from '../contexts/SettingsContext';
import githubService from '../services/githubService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ActionsWorkflowDashboard = () => {
  const { currentRepo } = useRepo();
  const { cacheExpiryTime } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Load cached data on component mount
  useEffect(() => {
    if (currentRepo) {
      loadCachedData();
    }
  }, [currentRepo]);

  // Save data to local storage
  const saveToLocalStorage = (key, data) => {
    const storageKey = `${currentRepo.owner.login}/${currentRepo.name}:${key}`;
    const storageData = {
      data,
      timestamp: Date.now(),
      expiryTime: cacheExpiryTime * 60 * 1000 // Convert minutes to milliseconds
    };
    localStorage.setItem(storageKey, JSON.stringify(storageData));
  };

  // Load data from local storage
  const loadFromLocalStorage = (key) => {
    if (!currentRepo) return null;
    
    const storageKey = `${currentRepo.owner.login}/${currentRepo.name}:${key}`;
    const storageData = localStorage.getItem(storageKey);
    
    if (!storageData) return null;
    
    try {
      const parsedData = JSON.parse(storageData);
      const now = Date.now();
      
      // Check if the data is expired
      if (parsedData.timestamp + parsedData.expiryTime < now) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return parsedData.data;
    } catch (err) {
      console.error('Error parsing stored data:', err);
      localStorage.removeItem(storageKey);
      return null;
    }
  };

  // Load both cached workflows and runs
  const loadCachedData = () => {
    if (!currentRepo) return;
    
    // Load cached workflows
    const cachedWorkflows = loadFromLocalStorage('workflows');
    if (cachedWorkflows && cachedWorkflows.length > 0) {
      console.log('Using cached workflows data');
      setWorkflows(cachedWorkflows);
      
      // Also check if we have cached runs for the current selection
      const runsKey = `workflow-runs:${selectedWorkflow}`;
      const cachedRuns = loadFromLocalStorage(runsKey);
      
      if (cachedRuns && cachedRuns.length > 0) {
        console.log('Using cached workflow runs data');
        setWorkflowRuns(cachedRuns);
        
        // Set last updated timestamp from storage
        const storageKey = `${currentRepo.owner.login}/${currentRepo.name}:workflows`;
        try {
          const storageData = JSON.parse(localStorage.getItem(storageKey));
          if (storageData && storageData.timestamp) {
            setLastUpdated(new Date(storageData.timestamp));
          }
        } catch (err) {
          console.error('Error parsing timestamp:', err);
        }
      }
    } else {
      // No cached data, fetch fresh data
      fetchWorkflows();
    }
  };

  // Fetch workflows from GitHub API
  const fetchWorkflows = async (skipCache = false) => {
    if (!currentRepo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const owner = currentRepo.owner.login;
      const repo = currentRepo.name;
      
      const result = await githubService.getWorkflows(owner, repo, !skipCache);
      
      if (result.success) {
        setWorkflows(result.workflows);
        saveToLocalStorage('workflows', result.workflows);
        setLastUpdated(new Date());
        
        // If we have a workflow selected, also update its runs
        if (selectedWorkflow !== 'all' && result.workflows.some(w => w.id.toString() === selectedWorkflow)) {
          fetchWorkflowRuns(skipCache);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch workflows');
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
      setForceRefresh(false);
    }
  };

  // Force refresh data from API ignoring cache
  const handleRefresh = () => {
    setForceRefresh(true);
    fetchWorkflows(true);
  };

  // Fetch workflow runs when a workflow is selected
  const fetchWorkflowRuns = async (skipCache = false) => {
    if (!currentRepo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const owner = currentRepo.owner.login;
      const repo = currentRepo.name;
      
      // Handle the workflow ID parameter carefully
      const workflowId = selectedWorkflow === 'all' ? null : selectedWorkflow;
      
      console.log(`Fetching workflow runs with workflowId: ${workflowId || 'all'}`);
      
      const result = await githubService.getWorkflowRuns(
        owner, 
        repo, 
        workflowId,
        !skipCache
      );
      
      if (result.success) {
        console.log(`Successfully fetched ${result.workflowRuns.length} workflow runs`);
        setWorkflowRuns(result.workflowRuns);
        
        // Save to local storage with the correct key
        const storageKey = `workflow-runs:${selectedWorkflow}`;
        saveToLocalStorage(storageKey, result.workflowRuns);
        
        setLastUpdated(new Date());
      } else {
        console.error(`Error from API: ${result.error}`);
        setError(result.error);
      }
    } catch (err) {
      console.error('Exception fetching workflow runs:', err);
      setError(`Failed to fetch workflow runs: ${err.message}`);
    } finally {
      setLoading(false);
      setForceRefresh(false);
    }
  };

  // Handle workflow selection change
  const handleWorkflowChange = (event) => {
    const newWorkflowId = event.target.value;
    setSelectedWorkflow(newWorkflowId);
    
    // Check if we have cached data for this workflow
    const runsKey = `workflow-runs:${newWorkflowId}`;
    const cachedRuns = loadFromLocalStorage(runsKey);
    
    if (cachedRuns && cachedRuns.length > 0) {
      console.log('Using cached workflow runs for selected workflow');
      setWorkflowRuns(cachedRuns);
    } else {
      // No cached data, fetch fresh data
      fetchWorkflowRuns(false);
    }
  };
  
  // Listen for settings changes to clear outdated caches
  useEffect(() => {
    const handleSettingsChange = () => {
      if (currentRepo) {
        // Check if our cached data has expired based on new settings
        const cachedWorkflows = loadFromLocalStorage('workflows');
        const runsKey = `workflow-runs:${selectedWorkflow}`;
        const cachedRuns = loadFromLocalStorage(runsKey);
        
        // If we don't have valid cached data anymore, fetch fresh data
        if (!cachedWorkflows || cachedWorkflows.length === 0) {
          fetchWorkflows();
        }
        
        if (!cachedRuns || cachedRuns.length === 0) {
          fetchWorkflowRuns();
        }
      }
    };
    
    // Listen for the cache expiry time changes
    window.addEventListener('cacheExpiryTimeChanged', handleSettingsChange);
    
    return () => {
      window.removeEventListener('cacheExpiryTimeChanged', handleSettingsChange);
    };
  }, [currentRepo, selectedWorkflow, cacheExpiryTime]);

  // Processed workflow stats for the table
  const workflowStats = useMemo(() => {
    const stats = {
      success: 0,
      failure: 0,
      inProgress: 0,
      other: 0,
      total: 0
    };
    
    workflowRuns.forEach(run => {
      stats.total++;
      
      if (run.status === 'completed' && run.conclusion === 'success') {
        stats.success++;
      } else if (run.status === 'completed' && (run.conclusion === 'failure' || run.conclusion === 'timed_out')) {
        stats.failure++;
      } else if (run.status === 'in_progress' || run.status === 'queued') {
        stats.inProgress++;
      } else {
        stats.other++;
      }
    });
    
    return stats;
  }, [workflowRuns]);

  // Format data for the line chart
  const chartData = useMemo(() => {
    // Group workflow runs by date (using the created_at field)
    const runsByDate = {};
    
    workflowRuns.forEach(run => {
      const date = new Date(run.created_at).toLocaleDateString();
      
      if (!runsByDate[date]) {
        runsByDate[date] = {
          date,
          totalDuration: 0,
          count: 0
        };
      }
      
      // Only count completed runs with durations
      if (run.status === 'completed' && run.updated_at) {
        const startTime = new Date(run.created_at);
        const endTime = new Date(run.updated_at);
        const durationMs = endTime - startTime;
        const durationMinutes = durationMs / (1000 * 60);
        
        runsByDate[date].totalDuration += durationMinutes;
        runsByDate[date].count++;
      }
    });
    
    // Calculate average duration by date
    const labels = [];
    const data = [];
    
    // Sort dates chronologically
    const sortedDates = Object.keys(runsByDate).sort((a, b) => new Date(a) - new Date(b));
    
    sortedDates.forEach(date => {
      const entry = runsByDate[date];
      if (entry.count > 0) {
        labels.push(date);
        data.push((entry.totalDuration / entry.count).toFixed(2));
      }
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Average Workflow Duration (minutes)',
          data,
          fill: false,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1
        }
      ]
    };
  }, [workflowRuns]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" component="h2">
                GitHub Actions Dashboard
              </Typography>
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Last updated: {lastUpdated.toLocaleString()}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <MuiTooltip title="Refresh data from GitHub API">
                <IconButton 
                  color="primary" 
                  onClick={handleRefresh}
                  disabled={loading}
                  size="small"
                >
                  <RefreshIcon />
                </IconButton>
              </MuiTooltip>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => fetchWorkflows(false)}
                disabled={loading}
              >
                {workflows.length === 0 ? 'Fetch GitHub Actions' : 'Load Workflows'}
              </Button>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {workflows.length > 0 && (
            <>
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="workflow-select-label">Select Workflow</InputLabel>
                  <Select
                    labelId="workflow-select-label"
                    id="workflow-select"
                    value={selectedWorkflow}
                    label="Select Workflow"
                    onChange={handleWorkflowChange}
                  >
                    <MenuItem value="all">All Workflows</MenuItem>
                    {workflows.map((workflow) => (
                      <MenuItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => fetchWorkflowRuns(false)}
                  disabled={loading}
                >
                  {workflowRuns.length > 0 
                    ? `Reload ${selectedWorkflow === 'all' ? 'All' : 'Selected'} Workflow Runs` 
                    : `Load ${selectedWorkflow === 'all' ? 'All' : 'Selected'} Workflow Runs`}
                </Button>
              </Box>
              
              {workflowRuns.length > 0 && (
                <>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2 }} elevation={2}>
                        <Typography variant="h6" gutterBottom>
                          Workflow Status
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Count</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell>Success</TableCell>
                                <TableCell align="right">{workflowStats.success}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Failure</TableCell>
                                <TableCell align="right">{workflowStats.failure}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>In Progress</TableCell>
                                <TableCell align="right">{workflowStats.inProgress}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Other</TableCell>
                                <TableCell align="right">{workflowStats.other}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell><strong>Total</strong></TableCell>
                                <TableCell align="right"><strong>{workflowStats.total}</strong></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Paper sx={{ p: 2 }} elevation={2}>
                        <Typography variant="h6" gutterBottom>
                          Workflow Duration Trend
                        </Typography>
                        {chartData.labels.length > 0 ? (
                          <Box sx={{ height: 300 }}>
                            <Line 
                              data={chartData} 
                              options={{ 
                                maintainAspectRatio: false,
                                plugins: {
                                  title: {
                                    display: true,
                                    text: 'Average Workflow Duration (minutes)'
                                  }
                                }
                              }} 
                            />
                          </Box>
                        ) : (
                          <Alert severity="info">
                            No completed workflow runs found for duration chart
                          </Alert>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 3 }}>
                    <Paper sx={{ p: 2 }} elevation={2}>
                      <Typography variant="h6" gutterBottom>
                        Recent Workflow Runs
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell>Branch</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Conclusion</TableCell>
                              <TableCell>Started</TableCell>
                              <TableCell>Duration</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {workflowRuns.slice(0, 10).map((run) => {
                              const startTime = new Date(run.created_at);
                              const endTime = run.updated_at ? new Date(run.updated_at) : null;
                              const durationMs = endTime ? (endTime - startTime) : null;
                              const durationText = durationMs 
                                ? `${Math.floor(durationMs / (1000 * 60))}m ${Math.floor((durationMs / 1000) % 60)}s` 
                                : 'In progress';
                              
                              return (
                                <TableRow key={run.id}>
                                  <TableCell>{run.name || run.workflow_id}</TableCell>
                                  <TableCell>{run.head_branch}</TableCell>
                                  <TableCell>{run.status}</TableCell>
                                  <TableCell>{run.conclusion || '-'}</TableCell>
                                  <TableCell>{new Date(run.created_at).toLocaleString()}</TableCell>
                                  <TableCell>{durationText}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Box>
                </>
              )}
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ActionsWorkflowDashboard;
import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Chip,
  Card,
  CardContent,
  Divider,
  OutlinedInput,
  TextField,
  InputAdornment,
  ListSubheader
} from '@mui/material';
import { 
  Search as SearchIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { 
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon, 
  PendingActions as PendingActionsIcon,
  InsertDriveFile as InsertDriveFileIcon
} from '@mui/icons-material';
import { useRepo } from '../contexts/RepoContext';
import PullRequestList from './PullRequestList';
import { 
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const PRDashboard = () => {
  const { pullRequests, labels, milestones: repoMilestones, reviewStatuses: apiReviewStatuses } = useRepo();
  const [selectedMilestones, setSelectedMilestones] = useState(['all']);
  const [selectedReviewStatuses, setSelectedReviewStatuses] = useState(['all']);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  // Search states for filters
  const [milestoneSearch, setMilestoneSearch] = useState('');
  const [labelSearch, setLabelSearch] = useState('');

  // Use milestones from the API
  const milestones = useMemo(() => {
    return ['all', ...repoMilestones.map(milestone => milestone.title)];
  }, [repoMilestones]);
  
  // Filtered milestones based on search
  const filteredMilestones = useMemo(() => {
    if (!milestoneSearch.trim()) return milestones;
    
    const searchTerm = milestoneSearch.toLowerCase().trim();
    // Always include 'all' option and filter others by search term
    return [
      'all',
      ...milestones.filter(m => 
        m !== 'all' && m.toLowerCase().includes(searchTerm)
      )
    ];
  }, [milestones, milestoneSearch]);
  
  // Use review statuses from the API
  const reviewStatuses = useMemo(() => {
    return ['all', ...apiReviewStatuses];
  }, [apiReviewStatuses]);
  
  // Filtered labels based on search
  const filteredLabels = useMemo(() => {
    if (!labelSearch.trim()) return labels;
    
    const searchTerm = labelSearch.toLowerCase().trim();
    return labels.filter(label => 
      label.name.toLowerCase().includes(searchTerm)
    );
  }, [labels, labelSearch]);

  // Filter PRs based on selected filters
  const filteredPRs = useMemo(() => {
    return pullRequests.filter(pr => {
      // If 'all' is not selected, filter by milestones
      if (!selectedMilestones.includes('all')) {
        if (!pr.milestone || !selectedMilestones.includes(pr.milestone.title)) {
          return false;
        }
      }

      // If 'all' is not selected, filter by review statuses
      if (!selectedReviewStatuses.includes('all')) {
        if (!selectedReviewStatuses.includes(pr.reviewStatus)) {
          return false;
        }
      }
      
      // Filter by labels if any are selected
      if (selectedLabels.length > 0) {
        // Get array of label names from the PR
        const prLabelNames = pr.labels.map(label => label.name);
        // Check if at least one selected label is in the PR's labels
        if (!selectedLabels.some(selectedLabel => prLabelNames.includes(selectedLabel))) {
          return false;
        }
      }
      
      // Filter by date range
      if (startDate) {
        const prDate = new Date(pr.created_at);
        if (prDate < startDate) {
          return false;
        }
      }
      
      if (endDate) {
        const prDate = new Date(pr.created_at);
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (prDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [pullRequests, selectedMilestones, selectedReviewStatuses, selectedLabels, startDate, endDate]);

  // Calculate PR statistics - based on filtered data
  const stats = useMemo(() => {
    const total = filteredPRs.length;
    const open = filteredPRs.filter(pr => pr.state === 'open').length;
    const closed = filteredPRs.filter(pr => pr.state === 'closed').length;
    const merged = filteredPRs.filter(pr => pr.merged).length;
    const draft = filteredPRs.filter(pr => pr.draft).length;

    return { total, open, closed, merged, draft };
  }, [filteredPRs]);

  // PR status chart data - dynamically updates based on filtered data
  const statusChartData = useMemo(() => {
    const labels = [];
    const data = [];
    const colors = [];
    
    // Only include statuses that have count > 0
    if (stats.open - stats.draft > 0) {
      labels.push('Open');
      data.push(stats.open - stats.draft);
      colors.push('#ff9800'); // Orange for open
    }
    
    if (stats.merged > 0) {
      labels.push('Merged');
      data.push(stats.merged);
      colors.push('#4caf50'); // Green for merged
    }
    
    if (stats.closed - stats.merged > 0) {
      labels.push('Closed');
      data.push(stats.closed - stats.merged);
      colors.push('#f44336'); // Red for closed
    }
    
    if (stats.draft > 0) {
      labels.push('Draft');
      data.push(stats.draft);
      colors.push('#9e9e9e'); // Grey for draft
    }
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  // PR by author chart data - using filtered PRs
  const authorChartData = useMemo(() => {
    // Count PRs by author
    const authorCounts = filteredPRs.reduce((acc, pr) => {
      const author = pr.user.login;
      acc[author] = (acc[author] || 0) + 1;
      return acc;
    }, {});

    // Get top 5 authors by PR count
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: topAuthors.map(([author]) => author),
      datasets: [
        {
          label: 'Pull Requests',
          data: topAuthors.map(([, count]) => count),
          backgroundColor: '#2f81f7',
        },
      ],
    };
  }, [pullRequests]);

  // PR by milestone chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top Contributors',
      },
    },
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Pull Request Dashboard</Typography>
      
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InsertDriveFileIcon fontSize="large" sx={{ mr: 2, color: '#2f81f7' }} />
                <Box>
                  <Typography variant="h4">{stats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">Total PRs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PendingActionsIcon fontSize="large" sx={{ mr: 2, color: '#ff9800' }} />
                <Box>
                  <Typography variant="h4">{stats.open}</Typography>
                  <Typography variant="body2" color="text.secondary">Open PRs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon fontSize="large" sx={{ mr: 2, color: '#4caf50' }} />
                <Box>
                  <Typography variant="h4">{stats.merged}</Typography>
                  <Typography variant="body2" color="text.secondary">Merged PRs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorOutlineIcon fontSize="large" sx={{ mr: 2, color: '#f44336' }} />
                <Box>
                  <Typography variant="h4">{stats.closed - stats.merged}</Typography>
                  <Typography variant="body2" color="text.secondary">Closed (not merged)</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Pull Request Status
            </Typography>
            <Box sx={{ height: 230 }}>
              <Pie data={statusChartData} />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Top Contributors
            </Typography>
            <Box sx={{ height: 230 }}>
              <Bar options={chartOptions} data={authorChartData} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="From Date"
            type="date"
            size="small"
            sx={{ width: 170 }}
            InputLabelProps={{ shrink: true }}
            value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                setStartDate(new Date(e.target.value));
              } else {
                setStartDate(null);
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <DateRangeIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            sx={{ width: 170 }}
            InputLabelProps={{ shrink: true }}
            value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                setEndDate(new Date(e.target.value));
              } else {
                setEndDate(null);
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <DateRangeIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        <FormControl sx={{ minWidth: 200, maxWidth: 300 }}>
          <InputLabel>Filter by Milestone</InputLabel>
          <Select
            multiple
            value={selectedMilestones}
            label="Filter by Milestone"
            onChange={(e) => {
              const values = e.target.value;
              // If "all" is selected, clear other selections
              if (values.includes('all') && !selectedMilestones.includes('all')) {
                setSelectedMilestones(['all']);
              } 
              // If any other value is selected and "all" was already selected, remove "all"
              else if (values.includes('all') && values.length > 1) {
                setSelectedMilestones(values.filter(v => v !== 'all'));
              }
              // Otherwise just set the values
              else {
                setSelectedMilestones(values);
              }
            }}
            renderValue={(selected) => {
              if (selected.includes('all')) return 'All Milestones';
              return selected.join(', ');
            }}
            onClose={() => setMilestoneSearch('')}
            onOpen={() => {
              // Set a timeout to allow the Select menu to fully render before focusing
              setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder="Search milestones..."]');
                if (searchInput) {
                  searchInput.focus();
                }
              }, 10);
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300
                }
              },
              // Disable text input navigation behavior from Select
              disableAutoFocusItem: true,
              autoFocus: false
            }}
          >
            <ListSubheader sx={{ p: 0 }}>
              <TextField
                size="small"
                autoFocus
                placeholder="Search milestones..."
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  autoFocus: true
                }}
                value={milestoneSearch}
                onChange={(e) => setMilestoneSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Stop propagation of ALL keyboard events to prevent the dropdown from navigating
                  e.stopPropagation();
                }}
                sx={{ p: 1 }}
                onClick={(e) => {
                  // Prevent the click from closing the dropdown
                  e.stopPropagation();
                  // Focus the input immediately
                  e.target.focus();
                }}
                onFocus={(e) => {
                  // Move cursor to the end of the text
                  const value = e.target.value;
                  e.target.value = '';
                  e.target.value = value;
                }}
              />
            </ListSubheader>
            <MenuItem value="all">All Milestones</MenuItem>
            {filteredMilestones.filter(m => m !== 'all').map((milestone) => (
              <MenuItem key={milestone} value={milestone}>
                {milestone}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200, maxWidth: 300 }}>
          <InputLabel>Review Status</InputLabel>
          <Select
            multiple
            value={selectedReviewStatuses}
            label="Review Status"
            onChange={(e) => {
              const values = e.target.value;
              // If "all" is selected, clear other selections
              if (values.includes('all') && !selectedReviewStatuses.includes('all')) {
                setSelectedReviewStatuses(['all']);
              } 
              // If any other value is selected and "all" was already selected, remove "all"
              else if (values.includes('all') && values.length > 1) {
                setSelectedReviewStatuses(values.filter(v => v !== 'all'));
              }
              // Otherwise just set the values
              else {
                setSelectedReviewStatuses(values);
              }
            }}
            renderValue={(selected) => {
              if (selected.includes('all')) return 'All Review Statuses';
              return selected.map(status => 
                status === 'APPROVED' ? 'Approved' :
                status === 'CHANGES_REQUESTED' ? 'Changes requested' :
                status === 'REVIEW_REQUIRED' ? 'Review required' :
                status === 'NO_REVIEW' ? 'No reviews' :
                status === 'COMMENTED' ? 'Commented' :
                status === 'DRAFT' ? 'Draft' : status
              ).join(', ');
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300
                }
              }
            }}
          >
            {reviewStatuses.map(status => (
              <MenuItem key={status} value={status}>
                {status === 'all' ? 'All Reviews' : 
                 status === 'APPROVED' ? 'Approved review' :
                 status === 'CHANGES_REQUESTED' ? 'Changes requested' :
                 status === 'REVIEW_REQUIRED' ? 'Review required' :
                 status === 'NO_REVIEW' ? 'No reviews' :
                 status === 'COMMENTED' ? 'Reviewed with comments' :
                 status === 'DRAFT' ? 'Draft PR' : status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200, maxWidth: 300 }}>
          <InputLabel>Filter by Labels</InputLabel>
          <Select
            multiple
            value={selectedLabels}
            onChange={(e) => setSelectedLabels(e.target.value)}
            input={<OutlinedInput label="Filter by Labels" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
            onClose={() => setLabelSearch('')}
            onOpen={() => {
              // Set a timeout to allow the Select menu to fully render before focusing
              setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder="Search labels..."]');
                if (searchInput) {
                  searchInput.focus();
                }
              }, 10);
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300
                }
              },
              // Disable text input navigation behavior from Select
              disableAutoFocusItem: true,
              autoFocus: false
            }}
          >
            <ListSubheader sx={{ p: 0 }}>
              <TextField
                size="small"
                autoFocus
                placeholder="Search labels..."
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  autoFocus: true
                }}
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Stop propagation of ALL keyboard events to prevent the dropdown from navigating
                  e.stopPropagation();
                }}
                sx={{ p: 1 }}
                onClick={(e) => {
                  // Prevent the click from closing the dropdown
                  e.stopPropagation();
                  // Focus the input immediately
                  e.target.focus();
                }}
                onFocus={(e) => {
                  // Move cursor to the end of the text
                  const value = e.target.value;
                  e.target.value = '';
                  e.target.value = value;
                }}
              />
            </ListSubheader>
            {filteredLabels.map((label) => (
              <MenuItem key={label.id} value={label.name}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box 
                    component="span" 
                    sx={{ 
                      width: 14, 
                      height: 14, 
                      borderRadius: '50%', 
                      bgcolor: `#${label.color}`,
                      mr: 1
                    }} 
                  />
                  {label.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ mb: 3 }} />
      
      {/* PR Table */}
      <Paper sx={{ p: 2 }}>
        <PullRequestList customPRs={filteredPRs} />
      </Paper>
    </Box>
  );
};

export default PRDashboard;
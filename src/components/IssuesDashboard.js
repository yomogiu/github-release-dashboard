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
  Card,
  CardContent,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
  BugReport as BugReportIcon,
  NewReleases as NewReleasesIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon
} from '@mui/icons-material';
import { SvgIcon } from '@mui/material';
import { useRepo } from '../contexts/RepoContext';
import IssuesList from './IssuesList';
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

// Enhancement icon for feature requests
const EnhancementIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" />
  </SvgIcon>
);

const IssuesDashboard = () => {
  const { issues, labels, milestones: repoMilestones } = useRepo();
  const [selectedMilestones, setSelectedMilestones] = useState(['all']);
  const [selectedAssignees, setSelectedAssignees] = useState(['all']);
  const [selectedTypes, setSelectedTypes] = useState(['all']);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  // Search terms for filters
  const [milestoneSearch, setMilestoneSearch] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [labelSearch, setLabelSearch] = useState('');

  // Use milestones from API instead of extracting from issues
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

  // Get unique assignees from issues
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set();
    issues.forEach(issue => {
      if (issue.assignees && issue.assignees.length > 0) {
        issue.assignees.forEach(assignee => {
          uniqueAssignees.add(assignee.login);
        });
      }
    });
    return ['all', ...Array.from(uniqueAssignees)];
  }, [issues]);
  
  // Filtered assignees based on search
  const filteredAssignees = useMemo(() => {
    if (!assigneeSearch.trim()) return assignees;
    
    const searchTerm = assigneeSearch.toLowerCase().trim();
    // Always include 'all' option and filter others by search term
    return [
      'all',
      ...assignees.filter(a => 
        a !== 'all' && a.toLowerCase().includes(searchTerm)
      )
    ];
  }, [assignees, assigneeSearch]);
  
  // Filtered labels based on search
  const filteredLabels = useMemo(() => {
    if (!labelSearch.trim()) return labels;
    
    const searchTerm = labelSearch.toLowerCase().trim();
    return labels.filter(label => 
      label.name.toLowerCase().includes(searchTerm)
    );
  }, [labels, labelSearch]);

  // Get issue type (now comes directly from the API)
  const getIssueType = (issue) => {
    // We now use the issueType property that was added in the GitHub service
    return issue.issueType || 'other';
  };

  // Filter issues based on selected filters
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // If 'all' is not selected in milestones filter
      if (!selectedMilestones.includes('all')) {
        if (!issue.milestone || !selectedMilestones.includes(issue.milestone.title)) {
          return false;
        }
      }

      // If 'all' is not selected in assignees filter
      if (!selectedAssignees.includes('all')) {
        if (!issue.assignees || issue.assignees.length === 0) {
          return false;
        }
        
        // Check if any of the issue's assignees are in the selected assignees
        const issueAssigneeLogins = issue.assignees.map(assignee => assignee.login);
        if (!selectedAssignees.some(login => issueAssigneeLogins.includes(login))) {
          return false;
        }
      }

      // If 'all' is not selected in types filter
      if (!selectedTypes.includes('all')) {
        if (!selectedTypes.includes(getIssueType(issue))) {
          return false;
        }
      }
      
      // Filter by labels if any are selected
      if (selectedLabels.length > 0) {
        // Get array of label names from the issue
        const issueLabelNames = issue.labels.map(label => label.name);
        // Check if at least one selected label is in the issue's labels
        if (!selectedLabels.some(selectedLabel => issueLabelNames.includes(selectedLabel))) {
          return false;
        }
      }
      
      // Filter by date range
      if (startDate) {
        const issueDate = new Date(issue.created_at);
        if (issueDate < startDate) {
          return false;
        }
      }
      
      if (endDate) {
        const issueDate = new Date(issue.created_at);
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (issueDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [issues, selectedMilestones, selectedAssignees, selectedTypes, selectedLabels, startDate, endDate, getIssueType]);

  // Calculate issue statistics based on filtered issues
  const stats = useMemo(() => {
    const total = filteredIssues.length;
    const open = filteredIssues.filter(issue => issue.state === 'open').length;
    const closed = filteredIssues.filter(issue => issue.state === 'closed').length;
    const bugs = filteredIssues.filter(issue => getIssueType(issue) === 'bug').length;
    const enhancements = filteredIssues.filter(issue => getIssueType(issue) === 'enhancement').length;
    const documentation = filteredIssues.filter(issue => getIssueType(issue) === 'documentation').length;
    const questions = filteredIssues.filter(issue => getIssueType(issue) === 'question').length;
    const withMilestone = filteredIssues.filter(issue => issue.milestone).length;
    const withAssignee = filteredIssues.filter(issue => issue.assignees && issue.assignees.length > 0).length;

    return { 
      total, 
      open, 
      closed, 
      bugs, 
      enhancements, 
      documentation, 
      questions, 
      withMilestone, 
      withAssignee 
    };
  }, [filteredIssues]);

  // Issue status chart data - dynamically updates based on filtered data
  const statusChartData = useMemo(() => {
    const labels = [];
    const data = [];
    const colors = [];
    
    if (stats.open > 0) {
      labels.push('Open');
      data.push(stats.open);
      colors.push('#ff9800'); // Orange for open
    }
    
    if (stats.closed > 0) {
      labels.push('Closed');
      data.push(stats.closed);
      colors.push('#4caf50'); // Green for closed
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

  // Issue type chart data - dynamically adjusts based on which types exist in the filtered set
  const typeChartData = useMemo(() => {
    const labels = [];
    const data = [];
    const colors = [];
    
    if (stats.bugs > 0) {
      labels.push('Bugs');
      data.push(stats.bugs);
      colors.push('#f44336'); // Red for bugs
    }
    
    if (stats.enhancements > 0) {
      labels.push('Enhancements');
      data.push(stats.enhancements);
      colors.push('#2196f3'); // Blue for enhancements
    }
    
    if (stats.documentation > 0) {
      labels.push('Documentation');
      data.push(stats.documentation);
      colors.push('#9c27b0'); // Purple for documentation
    }
    
    if (stats.questions > 0) {
      labels.push('Questions');
      data.push(stats.questions);
      colors.push('#ff9800'); // Orange for questions
    }
    
    const otherCount = stats.total - stats.bugs - stats.enhancements - stats.documentation - stats.questions;
    if (otherCount > 0) {
      labels.push('Other');
      data.push(otherCount);
      colors.push('#9e9e9e'); // Grey for other
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

  // Not using this chart data anymore since we're showing a table instead
  // But keeping it for filteredIssues dependency tracking
  const filteredIssuesByMilestone = useMemo(() => {
    // Used to track filtered issues per milestone
    const result = {};
    if (repoMilestones.length > 0) {
      repoMilestones.forEach(milestone => {
        result[milestone.title] = filteredIssues.filter(
          issue => issue.milestone && issue.milestone.title === milestone.title
        ).length;
      });
    }
    return result;
  }, [filteredIssues, repoMilestones]);

  // Issues by assignee chart data - calculated from filtered issues
  const assigneeChartData = useMemo(() => {
    // Skip 'all' in the first position and get top 5 assignees
    const assigneesList = assignees.slice(1);
    
    const assigneeCounts = assigneesList.map(assignee => 
      filteredIssues.filter(issue => 
        issue.assignees && issue.assignees.some(a => a.login === assignee)
      ).length
    );

    // Sort by count and get top 5
    const combined = assigneesList.map((assignee, index) => ({
      assignee,
      count: assigneeCounts[index]
    }));
    
    const top5 = combined
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      labels: top5.map(item => item.assignee),
      datasets: [
        {
          label: 'Assigned Issues',
          data: top5.map(item => item.count),
          backgroundColor: '#6e40c9',
        },
      ],
    };
  }, [issues, assignees]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Issues by Milestone',
      },
    },
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Issues Dashboard</Typography>
      
      {/* KPI Cards - Dynamically generated based on issue types */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Always show Total Issues card */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AssignmentTurnedInIcon fontSize="large" sx={{ mr: 2, color: '#2f81f7' }} />
                <Box>
                  <Typography variant="h4">{stats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Issues</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Bugs card - if bugs are present */}
        {stats.bugs > 0 && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BugReportIcon fontSize="large" sx={{ mr: 2, color: '#f44336' }} />
                  <Box>
                    <Typography variant="h4">{stats.bugs}</Typography>
                    <Typography variant="body2" color="text.secondary">Bugs</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {/* Enhancements card - if enhancements are present */}
        {stats.enhancements > 0 && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EnhancementIcon fontSize="large" sx={{ mr: 2, color: '#2196f3' }} />
                  <Box>
                    <Typography variant="h4">{stats.enhancements}</Typography>
                    <Typography variant="body2" color="text.secondary">Enhancements</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {/* Documentation card - if docs issues are present */}
        {stats.documentation > 0 && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SvgIcon fontSize="large" sx={{ mr: 2, color: '#9c27b0' }}>
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </SvgIcon>
                  <Box>
                    <Typography variant="h4">{stats.documentation}</Typography>
                    <Typography variant="body2" color="text.secondary">Documentation</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {/* Questions card - if question issues are present */}
        {stats.questions > 0 && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SvgIcon fontSize="large" sx={{ mr: 2, color: '#ff9800' }}>
                    <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
                  </SvgIcon>
                  <Box>
                    <Typography variant="h4">{stats.questions}</Typography>
                    <Typography variant="body2" color="text.secondary">Questions</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {/* With Milestone card - always show */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <NewReleasesIcon fontSize="large" sx={{ mr: 2, color: '#4caf50' }} />
                <Box>
                  <Typography variant="h4">{stats.withMilestone}</Typography>
                  <Typography variant="body2" color="text.secondary">With Milestone</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Issues by Status
            </Typography>
            <Box sx={{ height: 230, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: '60%' }}>
                <Pie data={statusChartData} />
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Issues by Type
            </Typography>
            <Box sx={{ height: 230, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: '60%' }}>
                <Pie data={typeChartData} />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300, overflow: 'auto' }}>
            <Typography variant="h6" align="center" gutterBottom>
              Issues by Milestone
            </Typography>
            {milestones.length > 1 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Milestone</TableCell>
                    <TableCell align="right">Open Issues</TableCell>
                    <TableCell align="right">Closed Issues</TableCell>
                    <TableCell align="right">Total Issues</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {repoMilestones.map(milestone => {
                    // Count issues for this milestone from the filtered set
                    const milestoneIssues = filteredIssues.filter(issue => 
                      issue.milestone && issue.milestone.title === milestone.title
                    );
                    const openIssues = milestoneIssues.filter(issue => issue.state === 'open').length;
                    const closedIssues = milestoneIssues.filter(issue => issue.state === 'closed').length;
                    
                    return (
                      <TableRow key={milestone.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <NewReleasesIcon fontSize="small" sx={{ mr: 1, color: '#4caf50' }} />
                            {milestone.title}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={openIssues} 
                            size="small" 
                            color="warning" 
                            variant={openIssues > 0 ? "default" : "outlined"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={closedIssues} 
                            size="small" 
                            color="success" 
                            variant={closedIssues > 0 ? "default" : "outlined"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={milestoneIssues.length} 
                            size="small" 
                            color="primary" 
                            variant={milestoneIssues.length > 0 ? "default" : "outlined"}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No milestones available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Top Issue Assignees
            </Typography>
            <Box sx={{ height: 230 }}>
              {assignees.length > 1 ? (
                <Bar 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Top Issue Assignees'
                      }
                    }
                  }} 
                  data={assigneeChartData} 
                />
              ) : (
                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No assignees available
                  </Typography>
                </Box>
              )}
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
          <InputLabel>Filter by Assignee</InputLabel>
          <Select
            multiple
            value={selectedAssignees}
            label="Filter by Assignee"
            onChange={(e) => {
              const values = e.target.value;
              // If "all" is selected, clear other selections
              if (values.includes('all') && !selectedAssignees.includes('all')) {
                setSelectedAssignees(['all']);
              } 
              // If any other value is selected and "all" was already selected, remove "all"
              else if (values.includes('all') && values.length > 1) {
                setSelectedAssignees(values.filter(v => v !== 'all'));
              }
              // Otherwise just set the values
              else {
                setSelectedAssignees(values);
              }
            }}
            renderValue={(selected) => {
              if (selected.includes('all')) return 'All Assignees';
              return selected.join(', ');
            }}
            onClose={() => setAssigneeSearch('')}
            onOpen={() => {
              // Set a timeout to allow the Select menu to fully render before focusing
              setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder="Search assignees..."]');
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
                placeholder="Search assignees..."
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  autoFocus: true
                }}
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
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
            <MenuItem value="all">All Assignees</MenuItem>
            {filteredAssignees.filter(a => a !== 'all').map((assignee) => (
              <MenuItem key={assignee} value={assignee}>
                {assignee}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200, maxWidth: 300 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            multiple
            value={selectedTypes}
            label="Filter by Type"
            onChange={(e) => {
              const values = e.target.value;
              // If "all" is selected, clear other selections
              if (values.includes('all') && !selectedTypes.includes('all')) {
                setSelectedTypes(['all']);
              } 
              // If any other value is selected and "all" was already selected, remove "all"
              else if (values.includes('all') && values.length > 1) {
                setSelectedTypes(values.filter(v => v !== 'all'));
              }
              // Otherwise just set the values
              else {
                setSelectedTypes(values);
              }
            }}
            renderValue={(selected) => {
              if (selected.includes('all')) return 'All Types';
              return selected.join(', ');
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300
                }
              }
            }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="bug">Bugs</MenuItem>
            <MenuItem value="enhancement">Enhancements</MenuItem>
            <MenuItem value="documentation">Documentation</MenuItem>
            <MenuItem value="question">Questions</MenuItem>
            <MenuItem value="other">Other</MenuItem>
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
      
      {/* Issues Table */}
      <Paper sx={{ p: 2 }}>
        <IssuesList issues={filteredIssues} getIssueType={getIssueType} />
      </Paper>
    </Box>
  );
};

export default IssuesDashboard;
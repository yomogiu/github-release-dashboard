import React, { useState, useMemo, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Grid,
  Pagination,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Stack,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  Launch as LaunchIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  PriorityHigh as PriorityHighIcon,
  HourglassEmpty as HourglassEmptyIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  CheckCircle as CheckCircleIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Help as HelpIcon,
  Description as DescriptionIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useRepo } from '../contexts/RepoContext';

const ItemType = {
  ISSUE: 'issue',
  PR: 'pull_request'
};

// Custom table view component that shows both PRs and issues
const CustomView = () => {
  const { issues, pullRequests, labels } = useRepo();
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [customViews, setCustomViews] = useState([]);
  const [activeCustomView, setActiveCustomView] = useState(null);
  const [customViewDialogOpen, setCustomViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [rowLabels, setRowLabels] = useState([]);
  const [columnLabels, setColumnLabels] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editViewIndex, setEditViewIndex] = useState(null);
  const [showBothTypes, setShowBothTypes] = useState(true); 
  const [showIssues, setShowIssues] = useState(true);
  const [showPRs, setShowPRs] = useState(true);

  // Combine issues and PRs into a single dataset
  const combinedItems = useMemo(() => {
    const issuesWithType = issues.map(issue => ({
      ...issue,
      type: ItemType.ISSUE
    }));
    
    const prsWithType = pullRequests.map(pr => ({
      ...pr,
      type: ItemType.PR
    }));
    
    return [...issuesWithType, ...prsWithType];
  }, [issues, pullRequests]);

  // Filter combined items based on selected labels and type filters
  const filteredItems = useMemo(() => {
    return combinedItems.filter(item => {
      // Filter by item type (issues/PRs)
      if (!showBothTypes) {
        if (showIssues && !showPRs && item.type === ItemType.PR) {
          return false;
        }
        if (!showIssues && showPRs && item.type === ItemType.ISSUE) {
          return false; 
        }
      }
      
      // If no labels selected, include all items
      if (selectedLabels.length === 0) {
        return true;
      }
      
      // Check if item has any of the selected labels
      return item.labels.some(label => 
        selectedLabels.includes(label.name)
      );
    });
  }, [combinedItems, selectedLabels, showBothTypes, showIssues, showPRs]);

  // Handle pagination
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  // Handle label selection
  const handleLabelChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedLabels(typeof value === 'string' ? value.split(',') : value);
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Get item type icon
  const getItemTypeIcon = (item) => {
    if (item.type === ItemType.PR) {
      if (item.merged) {
        return <CheckIcon fontSize="small" color="success" />;
      } else if (item.state === 'closed' && !item.merged) {
        return <ErrorIcon fontSize="small" color="error" />;
      } else if (item.draft) {
        return <HourglassEmptyIcon fontSize="small" color="disabled" />;
      } else {
        return <PriorityHighIcon fontSize="small" color="warning" />;
      }
    } else {
      // For issues
      if (item.state === 'open') {
        return <RadioButtonUncheckedIcon fontSize="small" color="warning" />;
      } else {
        return <CheckCircleIcon fontSize="small" color="success" />;
      }
    }
  };

  // Get item status text
  const getItemStatusText = (item) => {
    if (item.type === ItemType.PR) {
      if (item.merged) {
        return 'Merged';
      } else if (item.state === 'closed' && !item.merged) {
        return 'Closed';
      } else if (item.draft) {
        return 'Draft';
      } else {
        return 'Open';
      }
    } else {
      // For issues
      return item.state === 'open' ? 'Open' : 'Closed';
    }
  };

  // Get issue type icon
  const getIssueTypeIcon = (issue) => {
    if (issue.type !== ItemType.ISSUE) return null;
    
    const issueType = getIssueType(issue);
    
    switch (issueType) {
      case 'bug':
        return <BugReportIcon fontSize="small" color="error" />;
      case 'enhancement':
        return <BuildIcon fontSize="small" color="primary" />;
      case 'documentation':
        return <DescriptionIcon fontSize="small" color="info" />;
      case 'question':
        return <QuestionAnswerIcon fontSize="small" color="warning" />;
      default:
        return <HelpIcon fontSize="small" color="disabled" />;
    }
  };

  // Get issue type text
  const getIssueType = (issue) => {
    if (!issue.labels) return 'other';
    
    const typeLabels = issue.labels.map(label => label.name.toLowerCase());
    
    if (typeLabels.includes('bug')) return 'bug';
    if (typeLabels.includes('enhancement') || typeLabels.includes('feature')) return 'enhancement';
    if (typeLabels.includes('documentation')) return 'documentation';
    if (typeLabels.includes('question')) return 'question';
    
    return 'other';
  };

  // Handle custom view dialog
  const handleOpenCustomViewDialog = (isEdit = false, index = null) => {
    if (isEdit && index !== null) {
      const viewToEdit = customViews[index];
      setNewViewName(viewToEdit.name);
      setRowLabels(viewToEdit.rowLabels);
      setColumnLabels(viewToEdit.columnLabels);
      setEditMode(true);
      setEditViewIndex(index);
    } else {
      setNewViewName('');
      setRowLabels([]);
      setColumnLabels([]);
      setEditMode(false);
      setEditViewIndex(null);
    }
    setCustomViewDialogOpen(true);
  };

  const handleCloseCustomViewDialog = () => {
    setCustomViewDialogOpen(false);
  };

  // Save custom view
  const handleSaveCustomView = () => {
    if (!newViewName) return;
    
    const newView = {
      name: newViewName,
      rowLabels,
      columnLabels
    };
    
    if (editMode && editViewIndex !== null) {
      // Update existing view
      const updatedViews = [...customViews];
      updatedViews[editViewIndex] = newView;
      setCustomViews(updatedViews);
      
      if (activeCustomView === editViewIndex) {
        setActiveCustomView(editViewIndex);
      }
    } else {
      // Add new view
      setCustomViews([...customViews, newView]);
      setActiveCustomView(customViews.length);
    }
    
    setCustomViewDialogOpen(false);
  };

  // Delete custom view
  const handleDeleteCustomView = (index) => {
    const updatedViews = customViews.filter((_, i) => i !== index);
    setCustomViews(updatedViews);
    
    if (activeCustomView === index) {
      setActiveCustomView(null);
    } else if (activeCustomView > index) {
      setActiveCustomView(activeCustomView - 1);
    }
  };

  // Generate matrix view for custom view
  const generateMatrixView = useCallback(() => {
    if (activeCustomView === null || !customViews[activeCustomView]) {
      return null;
    }
    
    const { rowLabels, columnLabels } = customViews[activeCustomView];
    
    return (
      <TableContainer component={Paper}>
        <Table aria-label="custom matrix view">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              {columnLabels.map((colLabel) => (
                <TableCell key={colLabel}>{colLabel}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rowLabels.map((rowLabel) => (
              <TableRow key={rowLabel}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  {rowLabel}
                </TableCell>
                {columnLabels.map((colLabel) => {
                  // Find items that have both the row and column labels
                  const matchingItems = filteredItems.filter(item => 
                    item.labels.some(label => label.name === rowLabel) && 
                    item.labels.some(label => label.name === colLabel)
                  );
                  
                  return (
                    <TableCell key={`${rowLabel}-${colLabel}`}>
                      {matchingItems.length > 0 ? (
                        <Stack spacing={1}>
                          {matchingItems.map(item => (
                            <Box 
                              key={item.id} 
                              sx={{ 
                                p: 1, 
                                borderRadius: 1,
                                backgroundColor: item.type === ItemType.ISSUE ? '#f1f8e9' : '#e3f2fd',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getItemTypeIcon(item)}
                                <Typography variant="body2" sx={{ ml: 1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  #{item.number} {item.title}
                                </Typography>
                              </Box>
                              <Tooltip title="View on GitHub">
                                <IconButton 
                                  size="small"
                                  href={item.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <LaunchIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No items
                        </Typography>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [activeCustomView, customViews, filteredItems]);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Custom View Dashboard</Typography>
        
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Total Items</Typography>
                <Typography variant="h3">{combinedItems.length}</Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Chip 
                    label={`Issues: ${issues.length}`} 
                    color="primary" 
                    size="small"
                  />
                  <Chip 
                    label={`PRs: ${pullRequests.length}`} 
                    color="secondary" 
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Open Items</Typography>
                <Typography variant="h3">
                  {combinedItems.filter(item => item.state === 'open').length}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Chip 
                    label={`Issues: ${issues.filter(issue => issue.state === 'open').length}`} 
                    color="primary" 
                    size="small"
                  />
                  <Chip 
                    label={`PRs: ${pullRequests.filter(pr => pr.state === 'open').length}`} 
                    color="secondary" 
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Filtered Items</Typography>
                <Typography variant="h3">{filteredItems.length}</Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Chip 
                    label={`Issues: ${filteredItems.filter(item => item.type === ItemType.ISSUE).length}`} 
                    color="primary" 
                    size="small"
                  />
                  <Chip 
                    label={`PRs: ${filteredItems.filter(item => item.type === ItemType.PR).length}`} 
                    color="secondary" 
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Custom Views</Typography>
                <Typography variant="h3">{customViews.length}</Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenCustomViewDialog()}
                    size="small"
                  >
                    New View
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      {/* Filters and Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Labels</InputLabel>
              <Select
                multiple
                value={selectedLabels}
                onChange={handleLabelChange}
                input={<OutlinedInput label="Filter by Labels" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {labels.map((label) => (
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
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={showIssues} 
                    onChange={(e) => {
                      setShowIssues(e.target.checked);
                      if (e.target.checked && showPRs) {
                        setShowBothTypes(true);
                      } else {
                        setShowBothTypes(false);
                      }
                    }}
                  />
                }
                label="Show Issues"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={showPRs} 
                    onChange={(e) => {
                      setShowPRs(e.target.checked);
                      if (showIssues && e.target.checked) {
                        setShowBothTypes(true);
                      } else {
                        setShowBothTypes(false);
                      }
                    }}
                  />
                }
                label="Show Pull Requests"
              />
            </FormGroup>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Custom Views Tab Bar */}
      {customViews.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Paper>
            <Tabs
              value={activeCustomView !== null ? activeCustomView : false}
              onChange={(e, newValue) => setActiveCustomView(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {customViews.map((view, index) => (
                <Tab 
                  key={index} 
                  label={view.name} 
                  value={index}
                  icon={
                    <Box sx={{ display: 'flex' }}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCustomViewDialog(true, index);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomView(index);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                  iconPosition="end"
                />
              ))}
            </Tabs>
          </Paper>
        </Box>
      )}
      
      {/* Matrix View */}
      {activeCustomView !== null && (
        <Box sx={{ mb: 3 }}>
          {generateMatrixView()}
        </Box>
      )}
      
      {/* Standard Combined Table */}
      {(activeCustomView === null || customViews.length === 0) && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="combined items table">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell>Labels</TableCell>
                <TableCell>Milestone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    sx={{ 
                      backgroundColor: item.type === ItemType.ISSUE 
                        ? '#f1f8e9'  // Light green for issues
                        : '#e3f2fd'   // Light blue for PRs
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {item.type === ItemType.ISSUE ? (
                          <>
                            {getIssueTypeIcon(item)}
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              Issue
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="secondary">
                            Pull Request
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell component="th" scope="row">
                      #{item.number} {item.title}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getItemTypeIcon(item)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {getItemStatusText(item)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title={item.user.login}>
                          <Box 
                            component="img" 
                            src={item.user.avatar_url} 
                            alt={item.user.login}
                            sx={{ width: 24, height: 24, borderRadius: '50%', mr: 1 }}
                          />
                        </Tooltip>
                        {item.user.login}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {item.labels.slice(0, 3).map((label) => (
                          <Chip 
                            key={label.id} 
                            label={label.name} 
                            size="small"
                            sx={{ 
                              backgroundColor: `#${label.color}`,
                              color: parseInt(label.color, 16) > 0x7FFFFF ? '#000' : '#fff'
                            }}
                          />
                        ))}
                        {item.labels.length > 3 && (
                          <Chip 
                            label={`+${item.labels.length - 3}`} 
                            size="small"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {item.milestone ? (
                        <Chip 
                          label={item.milestone.title} 
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          None
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View on GitHub">
                        <IconButton 
                          size="small"
                          href={item.html_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination 
          count={Math.ceil(filteredItems.length / rowsPerPage)} 
          page={page}
          onChange={handleChangePage}
          color="primary"
        />
      </Box>
      
      {/* Custom View Dialog */}
      <Dialog 
        open={customViewDialogOpen} 
        onClose={handleCloseCustomViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editMode ? 'Edit Custom View' : 'Create Custom View'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="View Name"
              fullWidth
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="h6" gutterBottom>Matrix Configuration</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Row Labels (e.g., priorities)</InputLabel>
                  <Select
                    multiple
                    value={rowLabels}
                    onChange={(e) => setRowLabels(e.target.value)}
                    input={<OutlinedInput label="Row Labels (e.g., priorities)" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {labels.map((label) => (
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
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Column Labels (e.g., types)</InputLabel>
                  <Select
                    multiple
                    value={columnLabels}
                    onChange={(e) => setColumnLabels(e.target.value)}
                    input={<OutlinedInput label="Column Labels (e.g., types)" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {labels.map((label) => (
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
              </Grid>
            </Grid>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Example: Rows could be priority labels (P1, P2, P3) and columns could be type labels
              (bug, enhancement, documentation).
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCustomViewDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveCustomView}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newViewName || rowLabels.length === 0 || columnLabels.length === 0}
          >
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomView;
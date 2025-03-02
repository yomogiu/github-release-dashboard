import React, { useState, useMemo, useRef } from 'react';
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
  TextField,
  Autocomplete,
  ClickAwayListener,
  Button
} from '@mui/material';
import { 
  Launch as LaunchIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  PriorityHigh as PriorityHighIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useRepo } from '../contexts/RepoContext';
import Pagination from './common/Pagination';

const PullRequestList = ({ customPRs }) => {
  const { pullRequests, labels, addLabelToItem, removeLabelFromItem } = useRepo();
  const [filterLabels, setFilterLabels] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [editingLabels, setEditingLabels] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedLabels, setSelectedLabels] = useState([]);
  const labelCellRef = useRef(null);
  
  // Use customPRs if provided, otherwise use the ones from context
  const prData = customPRs || pullRequests;

  // Filter PRs by selected labels (when not using customPRs)
  const filteredPRs = useMemo(() => {
    // If we're already using customPRs, don't apply additional label filtering
    if (customPRs) {
      return customPRs;
    }
    
    let filtered = [...prData];
    
    if (filterLabels.length > 0) {
      filtered = filtered.filter(pr => 
        pr.labels.some(label => filterLabels.includes(label.name))
      );
    }
    
    return filtered;
  }, [prData, filterLabels, customPRs]);

  // Apply pagination to the filtered PRs
  const paginatedPRs = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredPRs.slice(startIndex, endIndex);
  }, [filteredPRs, page, rowsPerPage]);
  
  const handleLabelClick = (pr) => {
    setEditingLabels(pr.number);
    // Set the currently selected labels
    setSelectedLabels(pr.labels.map(label => label.name));
  };
  
  const handleLabelEditClose = () => {
    setEditingLabels(null);
    setInputValue('');
    setSelectedLabels([]);
  };
  
  const handleLabelChange = async (event, newValue) => {
    if (!editingLabels) return;
    
    const currentPR = prData.find(pr => pr.number === editingLabels);
    if (!currentPR) return;
    
    const currentLabels = currentPR.labels.map(label => label.name);
    
    // Find labels to add (in newValue but not in currentLabels)
    const labelsToAdd = newValue.filter(label => !currentLabels.includes(label));
    
    // Find labels to remove (in currentLabels but not in newValue)
    const labelsToRemove = currentLabels.filter(label => !newValue.includes(label));
    
    // Add new labels
    for (const label of labelsToAdd) {
      await addLabelToItem(editingLabels, label);
    }
    
    // Remove labels
    for (const label of labelsToRemove) {
      await removeLabelFromItem(editingLabels, label);
    }
    
    setSelectedLabels(newValue);
  };

  const getStatusIcon = (pr) => {
    if (pr.merged) {
      return <CheckIcon fontSize="small" color="success" />;
    } else if (pr.state === 'closed' && !pr.merged) {
      return <ErrorIcon fontSize="small" color="error" />;
    } else if (pr.draft) {
      return <HourglassEmptyIcon fontSize="small" color="disabled" />;
    } else {
      return <PriorityHighIcon fontSize="small" color="warning" />;
    }
  };

  const getStatusText = (pr) => {
    if (pr.merged) {
      return 'Merged';
    } else if (pr.state === 'closed' && !pr.merged) {
      return 'Closed';
    } else if (pr.draft) {
      return 'Draft';
    } else {
      return 'Open';
    }
  };

  const handleFilterLabelChange = (event) => {
    const {
      target: { value },
    } = event;
    setFilterLabels(typeof value === 'string' ? value.split(',') : value);
    // Reset to first page when filter changes
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
  };

  return (
    <Box>
      {/* Only show the header with label filter if not using customPRs */}
      {!customPRs && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Pull Requests</Typography>
          
          <FormControl sx={{ m: 1, width: 300 }}>
            <InputLabel>Filter by Labels</InputLabel>
            <Select
              multiple
              value={filterLabels}
              onChange={handleFilterLabelChange}
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
                  {label.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      
      <TableContainer component={customPRs ? Box : Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="pull requests table">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Labels</TableCell>
              {customPRs && <TableCell>Milestone</TableCell>}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPRs.length > 0 ? (
              paginatedPRs.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell component="th" scope="row">
                    #{pr.number} {pr.title}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getStatusIcon(pr)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {getStatusText(pr)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Tooltip title={pr.user.login}>
                        <Box 
                          component="img" 
                          src={pr.user.avatar_url} 
                          alt={pr.user.login}
                          sx={{ width: 24, height: 24, borderRadius: '50%', mr: 1 }}
                        />
                      </Tooltip>
                      {pr.user.login}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(pr.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell 
                    ref={editingLabels === pr.number ? labelCellRef : null}
                    onClick={() => handleLabelClick(pr)}
                    sx={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {editingLabels === pr.number ? (
                      <ClickAwayListener onClickAway={handleLabelEditClose}>
                        <Box sx={{ position: 'absolute', zIndex: 1000, width: 300, bgcolor: 'background.paper', boxShadow: 3, borderRadius: 1, p: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Edit Labels</Typography>
                          <Autocomplete
                            multiple
                            freeSolo
                            autoHighlight
                            value={selectedLabels}
                            onChange={handleLabelChange}
                            inputValue={inputValue}
                            onInputChange={(event, newInputValue) => {
                              setInputValue(newInputValue);
                            }}
                            options={labels.map(label => label.name)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="outlined"
                                size="small"
                                placeholder="Add or remove labels..."
                                fullWidth
                              />
                            )}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  size="small"
                                  label={option}
                                  {...getTagProps({ index })}
                                />
                              ))
                            }
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Button size="small" onClick={handleLabelEditClose}>Done</Button>
                          </Box>
                        </Box>
                      </ClickAwayListener>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {pr.labels.length > 0 ? (
                          <>
                            {pr.labels.slice(0, 3).map((label) => (
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
                            {pr.labels.length > 3 && (
                              <Chip 
                                label={`+${pr.labels.length - 3}`} 
                                size="small"
                              />
                            )}
                          </>
                        ) : (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ display: 'flex', alignItems: 'center' }}
                          >
                            <AddIcon fontSize="small" sx={{ mr: 0.5 }} /> Add Labels
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  {customPRs && (
                    <TableCell>
                      {pr.milestone ? (
                        <Chip 
                          label={pr.milestone.title} 
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
                  )}
                  <TableCell align="right">
                    <Tooltip title="View on GitHub">
                      <IconButton 
                        size="small"
                        href={pr.html_url} 
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
                <TableCell colSpan={customPRs ? 7 : 6} align="center">
                  No pull requests found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {filteredPRs.length > 0 && (
        <Pagination
          count={filteredPRs.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      )}
    </Box>
  );
};

export default PullRequestList;
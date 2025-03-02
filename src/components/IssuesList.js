import React, { useState, useMemo, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  AvatarGroup,
  Avatar,
  TextField,
  Autocomplete,
  Popper,
  ClickAwayListener,
  Paper,
  Button
} from '@mui/material';
import { 
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Help as HelpIcon,
  Description as DescriptionIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Add as AddIcon
} from '@mui/icons-material';
import Pagination from './common/Pagination';
import { useRepo } from '../contexts/RepoContext';

const IssuesList = ({ issues, getIssueType }) => {
  const { labels, addLabelToItem, removeLabelFromItem } = useRepo();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [editingLabels, setEditingLabels] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedLabels, setSelectedLabels] = useState([]);
  const labelCellRef = useRef(null);

  // Apply pagination to issues
  const paginatedIssues = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return issues.slice(startIndex, endIndex);
  }, [issues, page, rowsPerPage]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
  };
  
  const handleLabelClick = (issue) => {
    setEditingLabels(issue.number);
    // Set the currently selected labels
    setSelectedLabels(issue.labels.map(label => label.name));
  };
  
  const handleLabelEditClose = () => {
    setEditingLabels(null);
    setInputValue('');
    setSelectedLabels([]);
  };
  
  const handleLabelChange = async (event, newValue) => {
    if (!editingLabels) return;
    
    const currentIssue = issues.find(issue => issue.number === editingLabels);
    if (!currentIssue) return;
    
    const currentLabels = currentIssue.labels.map(label => label.name);
    
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

  const getTypeIcon = (issue) => {
    const type = getIssueType(issue);
    
    switch (type) {
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

  const getTypeText = (issue) => {
    const type = getIssueType(issue);
    
    switch (type) {
      case 'bug':
        return 'Bug';
      case 'enhancement':
        return 'Enhancement';
      case 'documentation':
        return 'Documentation';
      case 'question':
        return 'Question';
      default:
        return 'Other';
    }
  };

  const getTypeColor = (issue) => {
    const type = getIssueType(issue);
    
    switch (type) {
      case 'bug':
        return 'error';
      case 'enhancement':
        return 'primary';
      case 'documentation':
        return 'info';
      case 'question':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Issues List</Typography>
      
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="issues table">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Labels</TableCell>
              <TableCell>Milestone</TableCell>
              <TableCell>Assignees</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedIssues.length > 0 ? (
              paginatedIssues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell component="th" scope="row">
                    #{issue.number} {issue.title}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getTypeIcon(issue)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {getTypeText(issue)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {issue.state === 'open' ? (
                        <RadioButtonUncheckedIcon fontSize="small" color="warning" />
                      ) : (
                        <CheckCircleIcon fontSize="small" color="success" />
                      )}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {issue.state === 'open' ? 'Open' : 'Closed'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell 
                    ref={editingLabels === issue.number ? labelCellRef : null}
                    onClick={() => handleLabelClick(issue)}
                    sx={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {editingLabels === issue.number ? (
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
                        {issue.labels.length > 0 ? (
                          <>
                            {issue.labels.slice(0, 3).map((label) => (
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
                            {issue.labels.length > 3 && (
                              <Chip 
                                label={`+${issue.labels.length - 3}`} 
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
                  <TableCell>
                    {issue.milestone ? (
                      <Chip 
                        label={issue.milestone.title} 
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
                  <TableCell>
                    {issue.assignees && issue.assignees.length > 0 ? (
                      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24 } }}>
                        {issue.assignees.map((assignee) => (
                          <Tooltip key={assignee.id} title={assignee.login}>
                            <Avatar
                              alt={assignee.login}
                              src={assignee.avatar_url}
                              sx={{ width: 24, height: 24 }}
                            />
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(issue.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View on GitHub">
                      <IconButton 
                        size="small"
                        href={issue.html_url} 
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
                  No issues found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {issues.length > 0 && (
        <Pagination
          count={issues.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      )}
    </Box>
  );
};

export default IssuesList;
import React, { useState, useMemo } from 'react';
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
  OutlinedInput
} from '@mui/material';
import { 
  Launch as LaunchIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  PriorityHigh as PriorityHighIcon,
  HourglassEmpty as HourglassEmptyIcon
} from '@mui/icons-material';
import { useRepo } from '../contexts/RepoContext';
import Pagination from './common/Pagination';

const PullRequestList = ({ customPRs }) => {
  const { pullRequests, labels } = useRepo();
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Use customPRs if provided, otherwise use the ones from context
  const prData = customPRs || pullRequests;

  // Filter PRs by selected labels (when not using customPRs)
  const filteredPRs = useMemo(() => {
    // If we're already using customPRs, don't apply additional label filtering
    if (customPRs) {
      return customPRs;
    }
    
    let filtered = [...prData];
    
    if (selectedLabels.length > 0) {
      filtered = filtered.filter(pr => 
        pr.labels.some(label => selectedLabels.includes(label.name))
      );
    }
    
    return filtered;
  }, [prData, selectedLabels, customPRs]);

  // Apply pagination to the filtered PRs
  const paginatedPRs = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredPRs.slice(startIndex, endIndex);
  }, [filteredPRs, page, rowsPerPage]);

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

  const handleLabelChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedLabels(typeof value === 'string' ? value.split(',') : value);
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
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
                    </Box>
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
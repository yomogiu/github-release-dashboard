import React, { useState, useMemo } from 'react';
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
  Avatar
} from '@mui/material';
import { 
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Help as HelpIcon,
  Description as DescriptionIcon,
  QuestionAnswer as QuestionAnswerIcon
} from '@mui/icons-material';
import Pagination from './common/Pagination';

const IssuesList = ({ issues, getIssueType }) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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
                <TableCell colSpan={7} align="center">
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
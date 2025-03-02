import React from 'react';
import { Box, Pagination as MuiPagination, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const Pagination = ({ count, page, onPageChange, rowsPerPage = 50, onRowsPerPageChange }) => {
  const handlePageChange = (event, value) => {
    onPageChange(value);
  };

  const handleRowsPerPageChange = (event) => {
    onRowsPerPageChange(event.target.value);
    // Reset to first page when changing rows per page
    onPageChange(1);
  };
  
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
      <FormControl size="small">
        <InputLabel id="rows-per-page-label">Items per page</InputLabel>
        <Select
          labelId="rows-per-page-label"
          id="rows-per-page"
          value={rowsPerPage}
          label="Items per page"
          onChange={handleRowsPerPageChange}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </Select>
      </FormControl>
      
      <MuiPagination 
        count={Math.ceil(count / rowsPerPage)} 
        page={page} 
        onChange={handlePageChange} 
        color="primary"
        showFirstButton 
        showLastButton
      />
    </Box>
  );
};

export default Pagination;
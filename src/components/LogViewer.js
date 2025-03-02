import React, { useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Typography 
} from '@mui/material';

const LogViewer = ({ logs = [] }) => {
  const logsEndRef = useRef(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        mt: 3, 
        p: 2, 
        maxHeight: '200px', 
        overflowY: 'auto',
        backgroundColor: '#f5f5f5'
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Logs:
      </Typography>
      <List dense>
        {logs.map((log, index) => (
          <ListItem key={index} sx={{ py: 0 }}>
            <ListItemText 
              primary={
                <Typography 
                  variant="body2" 
                  component="span"
                  sx={{ 
                    color: log.type === 'error' ? 'error.main' : 
                           log.type === 'success' ? 'success.main' : 
                           'text.primary'
                  }}
                >
                  <span style={{ opacity: 0.7 }}>[{log.timestamp}]</span> {log.message}
                </Typography>
              }
            />
          </ListItem>
        ))}
        <div ref={logsEndRef} />
      </List>
    </Paper>
  );
};

export default LogViewer;
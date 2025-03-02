import React, { createContext, useState, useContext } from 'react';

// Create the log context
const LogContext = createContext();

// Hook to use the log context
export const useLog = () => useContext(LogContext);

// Provider component
export const LogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);

  // Add a log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, timestamp, type }]);
    
    // Log to console as well
    switch (type) {
      case 'error':
        console.error(`[${timestamp}] ${message}`);
        break;
      case 'warn':
        console.warn(`[${timestamp}] ${message}`);
        break;
      default:
        console.log(`[${timestamp}] ${message}`);
    }
  };

  // Clear the logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Value provided by the context
  const value = {
    logs,
    addLog,
    clearLogs
  };

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
};

export default LogContext;
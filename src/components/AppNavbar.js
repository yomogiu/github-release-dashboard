import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Tooltip,
  Avatar,
  IconButton
} from '@mui/material';
import { Assessment, Logout, Settings as SettingsIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { useNavigate, useLocation } from 'react-router-dom';

const AppNavbar = () => {
  const { currentUser, logout } = useAuth();
  const { currentRepo, clearRepoData } = useRepo();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    clearRepoData();
    navigate('/login');
  };

  const handleChangeRepo = () => {
    clearRepoData();
    navigate('/select-repo');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Check if we're on the settings page
  const isSettingsPage = location.pathname === '/settings';

  return (
    <AppBar position="static">
      <Toolbar>
        <Assessment sx={{ mr: 2 }} />
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Repository Dashboard
          {currentRepo && !isSettingsPage && (
            <Typography variant="subtitle1" component="span" sx={{ ml: 2, opacity: 0.8 }}>
              {currentRepo.full_name}
            </Typography>
          )}
        </Typography>
        
        {currentRepo && !isSettingsPage && (
          <Button 
            color="inherit" 
            onClick={handleChangeRepo}
            sx={{ mr: 2 }}
          >
            Change Repository
          </Button>
        )}
        
        {currentUser && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Settings">
              <IconButton 
                color="inherit" 
                onClick={handleSettingsClick}
                sx={{ mr: 1 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={currentUser.login || 'User'}>
              <Avatar 
                src={currentUser.avatar_url} 
                alt={currentUser.login}
                sx={{ width: 32, height: 32, mr: 1 }}
              />
            </Tooltip>
            
            <Button 
              color="inherit" 
              onClick={handleLogout}
              startIcon={<Logout />}
            >
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default AppNavbar;
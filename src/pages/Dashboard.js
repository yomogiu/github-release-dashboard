import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  CircularProgress,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import AppNavbar from '../components/AppNavbar';
import ReleaseList from '../components/ReleaseList';
import PullRequestList from '../components/PullRequestList';
import PRDashboard from '../components/PRDashboard';
import IssuesDashboard from '../components/IssuesDashboard';
import CustomView from '../components/CustomView';

// Create TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Dashboard = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const { currentRepo, loading, error } = useRepo();
  const [tabValue, setTabValue] = useState(0);

  console.log("Dashboard - Auth state:", { isAuthenticated, user: currentUser?.login });
  console.log("Dashboard - Repo state:", { 
    repoName: currentRepo?.name, 
    loading, 
    hasError: !!error
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // This check shouldn't be necessary with ProtectedRoute, but keeping as a backup
  if (!isAuthenticated) {
    console.log("Dashboard detected user is not authenticated");
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loading) {
    return (
      <>
        <AppNavbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppNavbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Error Loading Repository
            </Typography>
            <Typography variant="body1">
              {error}
            </Typography>
          </Paper>
        </Box>
      </>
    );
  }

  if (!currentRepo) {
    return (
      <>
        <AppNavbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Repository Selected
            </Typography>
            <Typography variant="body1">
              Please select a repository to continue
            </Typography>
          </Paper>
        </Box>
      </>
    );
  }

  return (
    <>
      <AppNavbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
              <Tab label="Releases" id="tab-0" aria-controls="tabpanel-0" />
              <Tab label="Pull Requests" id="tab-1" aria-controls="tabpanel-1" />
              <Tab label="Issues" id="tab-2" aria-controls="tabpanel-2" />
              <Tab label="Custom View" id="tab-3" aria-controls="tabpanel-3" />
            </Tabs>
          </Box>
          
          {/* Releases Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <ReleaseList />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Pull Requests Tab */}
          <TabPanel value={tabValue} index={1}>
            <PRDashboard />
          </TabPanel>
          
          {/* Issues Tab */}
          <TabPanel value={tabValue} index={2}>
            <IssuesDashboard />
          </TabPanel>
          
          {/* Custom View Tab */}
          <TabPanel value={tabValue} index={3}>
            <CustomView />
          </TabPanel>
        </Paper>
      </Container>
    </>
  );
};

export default Dashboard;
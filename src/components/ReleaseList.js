import React, { useState } from 'react';
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
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  InputAdornment
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Launch as LaunchIcon, 
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { useRepo } from '../contexts/RepoContext';

const getPhaseColor = (phase) => {
  switch (phase) {
    case 'development': return 'warning';
    case 'staging': return 'info';
    case 'production': return 'success';
    default: return 'default';
  }
};

const ReleaseList = () => {
  const { releases, createNewRelease, updateReleasePhase, loading } = useRepo();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [newPhase, setNewPhase] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [newRelease, setNewRelease] = useState({
    name: '',
    tagName: '',
    body: '',
    draft: true,
    prerelease: false
  });

  const handleMenuOpen = (event, release) => {
    setAnchorEl(event.currentTarget);
    setSelectedRelease(release);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePhaseDialogOpen = () => {
    handleMenuClose();
    setNewPhase(selectedRelease.phase);
    setPhaseDialogOpen(true);
  };

  const handlePhaseDialogClose = () => {
    setPhaseDialogOpen(false);
  };

  const handlePhaseChange = async () => {
    if (selectedRelease && newPhase) {
      await updateReleasePhase(selectedRelease.id, newPhase);
      handlePhaseDialogClose();
    }
  };

  const handleCreateDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setDialogOpen(false);
  };

  const handleCreateRelease = async () => {
    if (newRelease.name && newRelease.tagName) {
      await createNewRelease(newRelease);
      handleCreateDialogClose();
      setNewRelease({
        name: '',
        tagName: '',
        body: '',
        draft: true,
        prerelease: false
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setNewRelease(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Filter releases based on date range
  const filteredReleases = releases.filter(release => {
    if (startDate) {
      const releaseDate = new Date(release.created_at);
      if (releaseDate < startDate) return false;
    }
    
    if (endDate) {
      const releaseDate = new Date(release.created_at);
      // Set end date to end of day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (releaseDate > endOfDay) return false;
    }
    
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Releases</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleCreateDialogOpen}
        >
          New Release
        </Button>
      </Box>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          label="From Date"
          type="date"
          size="small"
          sx={{ width: 170 }}
          InputLabelProps={{ shrink: true }}
          value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
          onChange={(e) => {
            if (e.target.value) {
              setStartDate(new Date(e.target.value));
            } else {
              setStartDate(null);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <DateRangeIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="To Date"
          type="date"
          size="small"
          sx={{ width: 170 }}
          InputLabelProps={{ shrink: true }}
          value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
          onChange={(e) => {
            if (e.target.value) {
              setEndDate(new Date(e.target.value));
            } else {
              setEndDate(null);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <DateRangeIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="releases table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Tag</TableCell>
              <TableCell>Phase</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Issues</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReleases.length > 0 ? (
              filteredReleases.map((release) => (
                <TableRow key={release.id}>
                  <TableCell component="th" scope="row">
                    {release.name}
                  </TableCell>
                  <TableCell>{release.tag_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={release.phase} 
                      color={getPhaseColor(release.phase)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(release.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{release.issueCount || 0}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="View on GitHub">
                        <IconButton 
                          size="small"
                          href={release.html_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <IconButton 
                        size="small"
                        onClick={(e) => handleMenuOpen(e, release)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {loading ? 'Loading releases...' : 'No releases found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Release actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={handlePhaseDialogOpen}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Change Phase
        </MenuItem>
      </Menu>

      {/* Create Release Dialog */}
      <Dialog open={dialogOpen} onClose={handleCreateDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Release</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Release Name"
            name="name"
            value={newRelease.name}
            onChange={handleInputChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Tag Name"
            name="tagName"
            value={newRelease.tagName}
            onChange={handleInputChange}
            helperText="Example: v1.0.0"
          />
          <TextField
            margin="normal"
            fullWidth
            label="Release Notes"
            name="body"
            value={newRelease.body}
            onChange={handleInputChange}
            multiline
            rows={6}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Release Type</InputLabel>
            <Select
              value={newRelease.prerelease ? 'prerelease' : (newRelease.draft ? 'draft' : 'release')}
              label="Release Type"
              onChange={(e) => {
                const value = e.target.value;
                setNewRelease(prev => ({
                  ...prev,
                  draft: value === 'draft',
                  prerelease: value === 'prerelease'
                }));
              }}
            >
              <MenuItem value="draft">Draft (Development)</MenuItem>
              <MenuItem value="prerelease">Pre-release (Staging)</MenuItem>
              <MenuItem value="release">Release (Production)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateRelease} 
            variant="contained"
            disabled={!newRelease.name || !newRelease.tagName || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Phase Dialog */}
      <Dialog open={phaseDialogOpen} onClose={handlePhaseDialogClose}>
        <DialogTitle>Change Release Phase</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Phase</InputLabel>
            <Select
              value={newPhase}
              label="Phase"
              onChange={(e) => setNewPhase(e.target.value)}
            >
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePhaseDialogClose}>Cancel</Button>
          <Button 
            onClick={handlePhaseChange} 
            variant="contained"
            disabled={!newPhase || loading}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReleaseList;
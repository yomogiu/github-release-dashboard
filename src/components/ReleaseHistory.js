import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  TimelineDot
} from '@mui/lab';
import { 
  Upgrade as UpgradeIcon,
  Flag as FlagIcon,
  NewReleases as NewReleasesIcon
} from '@mui/icons-material';
import { useRepo } from '../contexts/RepoContext';

const ReleaseHistory = () => {
  const { releases } = useRepo();
  
  // Sort releases by date (newest first)
  const sortedReleases = [...releases].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const getReleaseDot = (release) => {
    switch (release.phase) {
      case 'development':
        return <TimelineDot color="warning"><NewReleasesIcon /></TimelineDot>;
      case 'staging':
        return <TimelineDot color="info"><FlagIcon /></TimelineDot>;
      case 'production':
        return <TimelineDot color="success"><UpgradeIcon /></TimelineDot>;
      default:
        return <TimelineDot><NewReleasesIcon /></TimelineDot>;
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Release History</Typography>
      
      <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
        {sortedReleases.length > 0 ? (
          <Timeline position="alternate">
            {sortedReleases.map((release, index) => (
              <TimelineItem key={release.id}>
                <TimelineOppositeContent color="text.secondary">
                  {new Date(release.created_at).toLocaleDateString()} {new Date(release.created_at).toLocaleTimeString()}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  {getReleaseDot(release)}
                  {index < sortedReleases.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="span">
                    {release.name}
                  </Typography>
                  <Typography variant="body2">
                    {release.tag_name} - {release.phase}
                  </Typography>
                  {release.body && (
                    <Box sx={{ mt: 1, color: 'text.secondary', maxHeight: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Typography variant="body2" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {release.body}
                      </Typography>
                    </Box>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No release history available
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ReleaseHistory;
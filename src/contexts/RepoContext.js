import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import githubService from '../services/githubService';

const RepoContext = createContext();

export const useRepo = () => useContext(RepoContext);

export const RepoProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  // We'll get itemLimit from localStorage directly to avoid circular dependencies
  const [itemLimit, setItemLimit] = useState(null);
  // Track last used item limit to prevent infinite re-renders
  const [lastUsedItemLimit, setLastUsedItemLimit] = useState(null);
  
  // Load itemLimit from localStorage
  useEffect(() => {
    // Initial load
    const savedItemLimit = localStorage.getItem('item_limit');
    if (savedItemLimit) {
      const limit = parseInt(savedItemLimit, 10);
      setItemLimit(limit);
      setLastUsedItemLimit(limit); // Also update last used limit
    }
    
    // Listen for changes to localStorage from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'item_limit') {
        if (e.newValue) {
          setItemLimit(parseInt(e.newValue, 10));
        } else {
          setItemLimit(null);
        }
      }
    };
    
    // Listen for the custom event for changes in the same window
    const handleItemLimitChanged = (e) => {
      // Note: We only update itemLimit here and not lastUsedItemLimit
      // This is because we want the useEffect that's watching itemLimit to trigger
      // when this change happens, so it can decide if a data refresh is needed
      setItemLimit(e.detail);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('itemLimitChanged', handleItemLimitChanged);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('itemLimitChanged', handleItemLimitChanged);
    };
  }, []);
  const [currentRepo, setCurrentRepo] = useState(null);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [releases, setReleases] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [labels, setLabels] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [reviewStatuses, setReviewStatuses] = useState([]);

  const determineReleasePhase = useCallback((release) => {
    // Logic to determine the phase: test, development, staging, production
    if (release.draft) return 'development';
    if (release.prerelease) return 'staging';
    return 'production'; // Published releases
  }, []);

  const isIssueAssociatedWithRelease = useCallback((issue, release) => {
    // Simple implementation - enhance with your specific rules
    // E.g., look for labels like "release-v1.0" or milestone matching the release
    if (issue.labels.some(label => 
      label.name.toLowerCase().includes('release') && 
      release.tag_name.includes(label.name.split('-')[1])
    )) {
      return true;
    }
    
    if (issue.milestone && release.name.includes(issue.milestone.title)) {
      return true;
    }
    
    return false;
  }, []);

  const clearRepoData = useCallback(() => {
    setCurrentRepo(null);
    setReleases([]);
    setPullRequests([]);
    setIssues([]);
    setLabels([]);
    setMilestones([]);
    setIssueTypes([]);
    setReviewStatuses([]);
    setShouldLoadRepo(false);
    localStorage.removeItem('github_repo');
    localStorage.removeItem('github_owner');
    
    // Also clear the GitHub service cache for this repo
    if (owner && repo) {
      githubService.clearRepoCache(owner, repo);
    }
  }, [owner, repo]);

  // Removed unused functions that were moved inline to fetchRepoData
  
  // This state will hold log messages during repo data fetching
  const [fetchLogs, setFetchLogs] = useState([]);

  // Add a log function to record fetching progress
  const addFetchLog = useCallback((message, type = 'info') => {
    console.log(`[RepoContext] ${message}`);
    setFetchLogs(prevLogs => [...prevLogs, { message, type, timestamp: new Date() }]);
  }, []);

  // Create a function to trigger loading of repo data
  const fetchRepoData = useCallback((ownerName, repoName) => {
    if (!isAuthenticated || !ownerName || !repoName) {
      console.log('Authentication or repository details missing, cannot fetch data');
      return;
    }
    
    console.log(`Setting up to fetch repo data for ${ownerName}/${repoName}`);
    setOwner(ownerName);
    setRepo(repoName);
    setShouldLoadRepo(true);
  }, [isAuthenticated]);

  // Simplified loading trigger
  const [shouldLoadRepo, setShouldLoadRepo] = useState(false);
  
  // This effect sets up initial repo to load or responds to auth changes
  useEffect(() => {
    if (isAuthenticated) {
      const storedRepo = localStorage.getItem('github_repo');
      const storedOwner = localStorage.getItem('github_owner');
      
      if (storedRepo && storedOwner) {
        setRepo(storedRepo);
        setOwner(storedOwner);
        // Set the lastUsedItemLimit to the current itemLimit to prevent double-fetching
        setLastUsedItemLimit(itemLimit);
        // Signal that we should load the repo data
        setShouldLoadRepo(true);
      }
    }
  }, [isAuthenticated, itemLimit]);
  
  // This effect actually fetches the repo data when conditions are right
  useEffect(() => {
    // Only run if we should load and we're not already loading
    if (shouldLoadRepo && !loading && owner && repo) {
      console.log(`Triggering repository data fetch for ${owner}/${repo}`);
      // Reset the flag immediately
      setShouldLoadRepo(false);
      
      // Now fetch the repo data
      (async () => {
        try {
          setLoading(true);
          setError('');
          setFetchLogs([]); // Clear previous logs
          
          addFetchLog(`Fetching main repository data for ${owner}/${repo}`);
          const repoResult = await githubService.getRepository(owner, repo);
          
          if (repoResult.success) {
            addFetchLog(`Repository information retrieved successfully`);
            setCurrentRepo(repoResult.repo);
            localStorage.setItem('github_repo', repo);
            localStorage.setItem('github_owner', owner);
            
            // Fetch releases
            addFetchLog(`Fetching releases for ${owner}/${repo}`);
            const releasesResult = await githubService.getReleases(owner, repo);
            let enhancedReleases = [];
            if (releasesResult.success) {
              addFetchLog(`Found ${releasesResult.releases.length} releases`);
              // Add release phase tracking
              enhancedReleases = releasesResult.releases.map(release => ({
                ...release,
                phase: determineReleasePhase(release),
                issueCount: 0 // Will be updated when we fetch issues
              }));
              setReleases(enhancedReleases);
            } else {
              addFetchLog(`Failed to fetch releases: ${releasesResult.error}`, 'error');
            }
            
            // Fetch milestones
            addFetchLog(`Fetching milestones for ${owner}/${repo}`);
            const milestonesResult = await githubService.getMilestones(owner, repo);
            if (milestonesResult.success) {
              addFetchLog(`Found ${milestonesResult.milestones.length} milestones`);
              setMilestones(milestonesResult.milestones);
            } else {
              addFetchLog(`Failed to fetch milestones: ${milestonesResult.error}`, 'error');
            }
            
            // Fetch issue types (based on labels)
            addFetchLog(`Determining issue types based on repository labels`);
            const issueTypesResult = await githubService.getIssueTypes(owner, repo);
            if (issueTypesResult.success) {
              addFetchLog(`Identified ${issueTypesResult.issueTypes.length} issue types`);
              setIssueTypes(issueTypesResult.issueTypes);
            } else {
              addFetchLog(`Failed to determine issue types: ${issueTypesResult.error}`, 'error');
            }
            
            // Fetch pull requests - first get quick data with skipReviewData option
            addFetchLog(`Fetching basic pull request data for ${owner}/${repo}`);
            const quickPullRequestsResult = await githubService.getPullRequests(owner, repo, "all", "", {
              skipReviewData: true,  // Get basic data first for faster initial load
              maxPRs: itemLimit || 100  // Use item limit if set, otherwise use 100 as default
            });
            
            if (quickPullRequestsResult.success) {
              addFetchLog(`Found ${quickPullRequestsResult.pullRequests.length} pull requests (basic data)`);
              // Set pull requests right away for fast UI rendering
              setPullRequests(quickPullRequestsResult.pullRequests);
              
              // Extract review statuses from initial PR data
              const initialStatuses = new Set();
              quickPullRequestsResult.pullRequests.forEach(pr => {
                if (pr.reviewStatus) {
                  initialStatuses.add(pr.reviewStatus);
                }
              });
              setReviewStatuses(Array.from(initialStatuses));
              
              // Now start a background fetch of full PR data with reviews, if we have incomplete data
              if (quickPullRequestsResult.incomplete) {
                addFetchLog(`Starting background fetch of detailed PR data...`);
                // Async fetch that doesn't block the UI
                (async () => {
                  try {
                    const fullPullRequestsResult = await githubService.getPullRequests(owner, repo);
                    if (fullPullRequestsResult.success) {
                      addFetchLog(`Completed detailed PR data fetch (${fullPullRequestsResult.pullRequests.length} PRs with review data)`);
                      // Update with full data
                      setPullRequests(fullPullRequestsResult.pullRequests);
                      
                      // Update review statuses
                      const reviewStatusesResult = await githubService.getPRReviewStatuses(owner, repo);
                      if (reviewStatusesResult.success) {
                        addFetchLog(`Updated PR review statuses (${reviewStatusesResult.reviewStatuses.length} types)`);
                        setReviewStatuses(reviewStatusesResult.reviewStatuses);
                      }
                    }
                  } catch (err) {
                    addFetchLog(`Background PR data fetch encountered an error: ${err.message}`, 'error');
                    // This is non-critical since we already have basic PR data
                  }
                })();
              } else {
                // If we already have complete data, just update review statuses
                addFetchLog(`Analyzing PR review statuses`);
                const reviewStatusesResult = await githubService.getPRReviewStatuses(owner, repo);
                if (reviewStatusesResult.success) {
                  addFetchLog(`Identified ${reviewStatusesResult.reviewStatuses.length} review status types`);
                  setReviewStatuses(reviewStatusesResult.reviewStatuses);
                } else {
                  addFetchLog(`Failed to analyze PR review statuses: ${reviewStatusesResult.error}`, 'error');
                }
              }
            } else {
              addFetchLog(`Failed to fetch pull requests: ${quickPullRequestsResult.error}`, 'error');
            }
            
            // Fetch issues - optimize loading with options
            addFetchLog(`Fetching issues for ${owner}/${repo}`);
            const issuesResult = await githubService.getIssues(owner, repo, "all", "", {
              maxIssues: itemLimit || 500 // Use item limit if set, otherwise use 500 as default
            });
            if (issuesResult.success) {
              addFetchLog(`Found ${issuesResult.issues.length} issues`);
              setIssues(issuesResult.issues);
              
              // Update release issue counts
              if (enhancedReleases.length > 0) {
                addFetchLog(`Associating issues with releases`);
                const updatedReleases = [...enhancedReleases];
                let associationCount = 0;
                
                issuesResult.issues.forEach(issue => {
                  for (const release of updatedReleases) {
                    if (isIssueAssociatedWithRelease(issue, release)) {
                      release.issueCount = (release.issueCount || 0) + 1;
                      associationCount++;
                    }
                  }
                });
                
                addFetchLog(`Associated ${associationCount} issues with releases`);
                setReleases(updatedReleases);
              }
            } else {
              addFetchLog(`Failed to fetch issues: ${issuesResult.error}`, 'error');
            }
            
            // Fetch labels
            addFetchLog(`Fetching labels for ${owner}/${repo}`);
            const labelsResult = await githubService.getLabels(owner, repo);
            if (labelsResult.success) {
              addFetchLog(`Found ${labelsResult.labels.length} labels`);
              setLabels(labelsResult.labels);
            } else {
              addFetchLog(`Failed to fetch labels: ${labelsResult.error}`, 'error');
            }
            
            addFetchLog(`Repository data loaded successfully!`, 'success');
          } else {
            const errorMsg = 'Failed to fetch repository. Please check repository details.';
            addFetchLog(errorMsg, 'error');
            if (repoResult.error) {
              addFetchLog(`Error details: ${repoResult.error}`, 'error');
            }
            setError(errorMsg);
            clearRepoData();
          }
        } catch (err) {
          const errorMsg = 'An error occurred while fetching repository data.';
          addFetchLog(errorMsg, 'error');
          addFetchLog(`Error details: ${err.message || err}`, 'error');
          setError(errorMsg);
          clearRepoData();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [shouldLoadRepo, loading, owner, repo, itemLimit, addFetchLog, clearRepoData, determineReleasePhase, isIssueAssociatedWithRelease]);
  
  // Effect to handle item limit changes
  useEffect(() => {
    // Only trigger a refresh if the item limit actually changed from the last fetch
    // and we have a valid repo to fetch data for
    if (currentRepo && owner && repo && itemLimit !== lastUsedItemLimit) {
      console.log(`Item limit changed from ${lastUsedItemLimit} to ${itemLimit}, triggering data refresh`);
      setLastUsedItemLimit(itemLimit);
      setShouldLoadRepo(true);
    }
  }, [itemLimit, currentRepo, owner, repo, lastUsedItemLimit]);

  const createNewRelease = async (releaseData) => {
    setLoading(true);
    
    try {
      const result = await githubService.createRelease(
        owner,
        repo,
        releaseData.tagName,
        releaseData.name,
        releaseData.body,
        releaseData.draft,
        releaseData.prerelease
      );
      
      if (result.success) {
        // Add phase information
        const newRelease = {
          ...result.release,
          phase: determineReleasePhase(result.release),
          issueCount: 0
        };
        
        setReleases(prevReleases => [newRelease, ...prevReleases]);
        return { success: true, release: newRelease };
      } else {
        setError(result.error || 'Failed to create release');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('An error occurred while creating the release');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateReleasePhase = async (releaseId, newPhase) => {
    setLoading(true);
    
    try {
      // Map phase to GitHub release properties
      const updates = {
        draft: newPhase === 'development',
        prerelease: newPhase === 'staging'
      };
      
      const result = await githubService.updateRelease(owner, repo, releaseId, updates);
      
      if (result.success) {
        setReleases(prevReleases => 
          prevReleases.map(release => 
            release.id === releaseId 
              ? { ...release, ...updates, phase: newPhase } 
              : release
          )
        );
        return { success: true };
      } else {
        setError(result.error || 'Failed to update release phase');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('An error occurred while updating the release phase');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const addLabelToItem = async (itemNumber, labelName) => {
    setLoading(true);
    try {
      const result = await githubService.addLabelToIssue(owner, repo, itemNumber, labelName);
      
      if (result.success) {
        // Refresh the repo data to reflect the changes
        setShouldLoadRepo(true);
        return { success: true };
      } else {
        setError(result.error || 'Failed to add label');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('An error occurred while adding label');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  const removeLabelFromItem = async (itemNumber, labelName) => {
    setLoading(true);
    try {
      const result = await githubService.removeLabelFromIssue(owner, repo, itemNumber, labelName);
      
      if (result.success) {
        // Refresh the repo data to reflect the changes
        setShouldLoadRepo(true);
        return { success: true };
      } else {
        setError(result.error || 'Failed to remove label');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('An error occurred while removing label');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentRepo,
    owner,
    repo,
    loading,
    error,
    releases,
    pullRequests,
    issues,
    labels,
    milestones,
    issueTypes,
    reviewStatuses,
    fetchLogs,    // Expose logs to consumers
    setOwner,
    setRepo,
    fetchRepoData,
    createNewRelease,
    updateReleasePhase,
    clearRepoData,
    addLabelToItem,
    removeLabelFromItem
  };

  return (
    <RepoContext.Provider value={value}>
      {children}
    </RepoContext.Provider>
  );
};

export default RepoContext;

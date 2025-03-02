import { Octokit } from "octokit";

class GitHubService {
  constructor() {
    this.octokit = null;
    // Cache system to store API results
    this.cache = new Map();
    // Default cache expiry time (30 minutes in milliseconds)
    this.defaultCacheExpiry = 30 * 60 * 1000;
    // Rate limit tracking
    this.rateLimitRemaining = null;
    this.rateLimitReset = null;
  }
  
  /**
   * Get an item from cache
   * @param {string} key - The cache key
   * @returns {any|null} - The cached value or null if not found/expired
   */
  getCachedItem(key) {
    if (!this.cache.has(key)) return null;
    
    const { data, expiry } = this.cache.get(key);
    if (Date.now() > expiry) {
      // Cache expired, remove it
      this.cache.delete(key);
      return null;
    }
    
    return data;
  }
  
  /**
   * Store an item in cache
   * @param {string} key - The cache key
   * @param {any} data - The data to cache
   * @param {number} [expiryMs] - Time in ms until cache expires (defaults to 30 min)
   */
  setCacheItem(key, data, expiryMs = this.defaultCacheExpiry) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + expiryMs
    });
  }
  
  /**
   * Clear cache for a specific repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  clearRepoCache(owner, repo) {
    const repoPrefix = `${owner}/${repo}:`;
    
    // Find and delete all keys related to this repo
    for (const key of this.cache.keys()) {
      if (key.startsWith(repoPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  async initialize(token) {
    console.log("Creating Octokit instance");
    try {
      this.octokit = new Octokit({ auth: token });
      return await this.isAuthenticated();
    } catch (error) {
      console.error("Error initializing Octokit:", error);
      return { success: false, error: error.message };
    }
  }

  async isAuthenticated() {
    try {
      console.log("Calling GitHub API to authenticate user");
      const { data } = await this.octokit.rest.users.getAuthenticated();
      console.log("GitHub API authenticated successfully as:", data.login);
      return { success: true, user: data };
    } catch (error) {
      console.error("GitHub API authentication error:", error);
      return { success: false, error: error.message };
    }
  }

  async getRepository(owner, repo) {
    try {
      console.log(`[GitHub API] Fetching repository details for ${owner}/${repo}`);
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      console.log(`[GitHub API] Repository details fetched successfully: ${data.full_name}`);
      return { success: true, repo: data };
    } catch (error) {
      console.error(`[GitHub API] Error fetching repository: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getReleases(owner, repo) {
    try {
      console.log(`[GitHub API] Fetching releases for ${owner}/${repo}`);
      
      // Initialize variables for pagination
      let allReleases = [];
      let page = 1;
      let hasNextPage = true;
      
      // Fetch all pages of releases
      while (hasNextPage) {
        console.log(`[GitHub API] Fetching releases page ${page}`);
        const response = await this.octokit.rest.repos.listReleases({
          owner,
          repo,
          per_page: 100,
          page: page
        });
        
        const releases = response.data;
        allReleases = [...allReleases, ...releases];
        console.log(`[GitHub API] Retrieved ${releases.length} releases on page ${page}`);
        
        // Check if we've reached the last page
        if (releases.length < 100) {
          hasNextPage = false;
        } else {
          page++;
        }
      }
      
      console.log(`[GitHub API] Total releases fetched: ${allReleases.length}`);
      return { success: true, releases: allReleases };
    } catch (error) {
      console.error(`[GitHub API] Error fetching releases: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getPullRequests(owner, repo, state = "all", labels = "", options = {}) {
    try {
      const cacheKey = `${owner}/${repo}:prs:${state}:${labels}`;
      const { useCache = true, maxPRs = 200, skipReviewData = false } = options;
      
      // Try to get from cache first if cache use is enabled
      if (useCache) {
        const cachedData = this.getCachedItem(cacheKey);
        if (cachedData) {
          console.log(`[GitHub API] Using cached PR data for ${owner}/${repo} (${cachedData.length} PRs)`);
          return { success: true, pullRequests: cachedData };
        }
      }
      
      console.log(`[GitHub API] Fetching pull requests for ${owner}/${repo}`);
      
      // Initialize variables for pagination
      let allPRs = [];
      let page = 1;
      let hasNextPage = true;
      
      // Fetch pull requests with pagination, stopping at maxPRs limit
      while (hasNextPage && allPRs.length < maxPRs) {
        console.log(`[GitHub API] Fetching PRs page ${page}`);
        const response = await this.octokit.rest.pulls.list({
          owner,
          repo,
          state,
          per_page: 100,
          page: page,
          sort: "updated",
          direction: "desc",
          ...(labels && { labels }),
        });
        
        const prs = response.data;
        allPRs = [...allPRs, ...prs];
        
        console.log(`[GitHub API] Retrieved ${prs.length} PRs on page ${page}`);
        
        // Stop pagination if we've reached the max limit, the last page, or this is the first
        // page and skipReviewData is true (for faster initial loading)
        if (prs.length < 100 || allPRs.length >= maxPRs || (page === 1 && skipReviewData)) {
          hasNextPage = false;
        } else {
          page++;
        }
      }
      
      // Optionally limit the number of PRs to process
      if (allPRs.length > maxPRs) {
        console.log(`[GitHub API] Limiting PRs to ${maxPRs} (out of ${allPRs.length} retrieved)`);
        allPRs = allPRs.slice(0, maxPRs);
      }
      
      // Skip review data processing if flag is set (for faster initial loading)
      if (skipReviewData) {
        console.log(`[GitHub API] Skipping review data processing for faster loading`);
        const simplePRs = allPRs.map(pr => ({
          ...pr,
          reviewStatus: pr.draft ? 'DRAFT' : 
                        pr.merged ? 'APPROVED' : 
                        pr.state === 'closed' ? 'CHANGES_REQUESTED' : 'NO_REVIEW'
        }));
        
        // Store in cache with shorter expiration (5 minutes) since it's incomplete data
        this.setCacheItem(cacheKey, simplePRs, 5 * 60 * 1000);
        return { success: true, pullRequests: simplePRs, incomplete: true };
      }
      
      console.log(`[GitHub API] Processing review data for ${allPRs.length} PRs`);
      
      // Process PRs to include review data - this is the most time-consuming part
      // Use batch processing to reduce load (process in chunks of 10 PRs)
      const batchSize = 10;
      let processedPRs = [];
      
      for (let i = 0; i < allPRs.length; i += batchSize) {
        const batch = allPRs.slice(i, i + batchSize);
        console.log(`[GitHub API] Processing PR batch ${i/batchSize + 1}/${Math.ceil(allPRs.length/batchSize)}`);
        
        const batchResults = await Promise.all(batch.map(async (pr) => {
          // Default to "NO_REVIEW" for open PRs without reviews
          let reviewStatus = pr.draft ? "DRAFT" : "NO_REVIEW";
          
          try {
            // Check if PR review data is cached
            const prReviewCacheKey = `${owner}/${repo}:pr:${pr.number}:review`;
            const cachedReviewStatus = this.getCachedItem(prReviewCacheKey);
            
            if (cachedReviewStatus) {
              return {
                ...pr,
                reviewStatus: cachedReviewStatus
              };
            }
            
            // Get all reviews for this PR with pagination (only if needed)
            let allReviews = [];
            
            // Only fetch reviews if necessary (skip for draft, merged, or closed PRs where we can determine status)
            if (!pr.draft && !(pr.merged) && !(pr.state === 'closed' && !pr.merged)) {
              let reviewsPage = 1;
              let hasMoreReviews = true;
              
              while (hasMoreReviews) {
                const reviewsResponse = await this.octokit.rest.pulls.listReviews({
                  owner,
                  repo,
                  pull_number: pr.number,
                  per_page: 100,
                  page: reviewsPage
                });
                
                const reviews = reviewsResponse.data;
                allReviews = [...allReviews, ...reviews];
                
                if (reviews.length < 100) {
                  hasMoreReviews = false;
                } else {
                  reviewsPage++;
                }
              }
              
              // Fetch requested reviewers only for open PRs without reviews
              if (pr.state !== 'closed' && allReviews.length === 0) {
                const reviewRequestsResponse = await this.octokit.rest.pulls.listRequestedReviewers({
                  owner,
                  repo,
                  pull_number: pr.number,
                });
                
                const reviewRequests = reviewRequestsResponse.data;
                
                // If PR has active review requests, mark as REVIEW_REQUIRED
                if (reviewRequests.users && reviewRequests.users.length > 0) {
                  reviewStatus = 'REVIEW_REQUIRED';
                }
              }
            }
            
            // Determine review status based on the data we collected
            if (pr.draft) {
              reviewStatus = 'DRAFT';
            } else if (pr.merged) {
              reviewStatus = 'APPROVED';
            } else if (pr.state === 'closed') {
              reviewStatus = 'CHANGES_REQUESTED';
            } else if (allReviews && allReviews.length > 0) {
              // Group reviews by reviewer
              const reviewerLatestReviews = {};
              allReviews.forEach(review => {
                const reviewer = review.user.login;
                const existingReview = reviewerLatestReviews[reviewer];
                
                // Keep only the most recent review from each reviewer
                if (!existingReview || new Date(review.submitted_at) > new Date(existingReview.submitted_at)) {
                  reviewerLatestReviews[reviewer] = review;
                }
              });
              
              // Convert to array of latest reviews by each reviewer
              const latestReviews = Object.values(reviewerLatestReviews);
              
              // Check if any reviewer has requested changes
              const hasChangesRequested = latestReviews.some(review => review.state === 'CHANGES_REQUESTED');
              
              // Check if there are approvals
              const hasApproval = latestReviews.some(review => review.state === 'APPROVED');
              
              // Determine overall status
              if (hasChangesRequested) {
                reviewStatus = 'CHANGES_REQUESTED';
              } else if (hasApproval) {
                reviewStatus = 'APPROVED';
              } else {
                // If only comments, mark as COMMENTED
                reviewStatus = 'COMMENTED';
              }
            }
            
            // Cache the review status for this PR
            this.setCacheItem(prReviewCacheKey, reviewStatus, 60 * 60 * 1000); // 1 hour cache for PR reviews
            
            return {
              ...pr,
              reviewStatus
            };
          } catch (error) {
            console.error(`Error fetching reviews for PR #${pr.number}:`, error);
            // Fallback to algorithmic determination if API call fails
            if (pr.draft) {
              reviewStatus = 'DRAFT';
            } else if (pr.merged) {
              reviewStatus = 'APPROVED';
            } else if (pr.state === 'closed') {
              reviewStatus = 'CHANGES_REQUESTED';
            } else {
              reviewStatus = 'NO_REVIEW';
            }
            
            return {
              ...pr,
              reviewStatus
            };
          }
        }));
        
        processedPRs = [...processedPRs, ...batchResults];
      }
      
      console.log(`[GitHub API] Completed processing ${processedPRs.length} PRs with review data`);
      
      // Cache the full results
      this.setCacheItem(cacheKey, processedPRs);
      
      return { success: true, pullRequests: processedPRs };
    } catch (error) {
      console.error(`[GitHub API] Error fetching pull requests: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getLabels(owner, repo, useCache = true) {
    try {
      const cacheKey = `${owner}/${repo}:labels`;
      
      // Try to get from cache first if cache use is enabled
      if (useCache) {
        const cachedData = this.getCachedItem(cacheKey);
        if (cachedData) {
          console.log(`[GitHub API] Using cached labels for ${owner}/${repo} (${cachedData.length} labels)`);
          return { success: true, labels: cachedData };
        }
      }
      
      console.log(`[GitHub API] Fetching labels for ${owner}/${repo}`);
      
      // Initialize variables for pagination
      let allLabels = [];
      let page = 1;
      let hasNextPage = true;
      
      // Fetch all pages of labels
      while (hasNextPage) {
        console.log(`[GitHub API] Fetching labels page ${page}`);
        const response = await this.octokit.rest.issues.listLabelsForRepo({
          owner,
          repo,
          per_page: 100,
          page: page
        });
        
        const labels = response.data;
        allLabels = [...allLabels, ...labels];
        
        console.log(`[GitHub API] Retrieved ${labels.length} labels on page ${page}`);
        
        // Check if we've reached the last page
        if (labels.length < 100) {
          hasNextPage = false;
        } else {
          page++;
        }
      }
      
      console.log(`[GitHub API] Total labels fetched: ${allLabels.length}`);
      
      // Cache the results - labels rarely change so use a longer expiry time
      this.setCacheItem(cacheKey, allLabels, 60 * 60 * 1000); // 1 hour cache
      
      return { success: true, labels: allLabels };
    } catch (error) {
      console.error(`[GitHub API] Error fetching labels: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async createRelease(owner, repo, tagName, name, body, draft = false, prerelease = false) {
    try {
      const { data } = await this.octokit.rest.repos.createRelease({
        owner,
        repo,
        tag_name: tagName,
        name,
        body,
        draft,
        prerelease,
      });
      return { success: true, release: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateRelease(owner, repo, releaseId, updates) {
    try {
      const { data } = await this.octokit.rest.repos.updateRelease({
        owner,
        repo,
        release_id: releaseId,
        ...updates,
      });
      return { success: true, release: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async addLabelToIssue(owner, repo, issueNumber, labelName) {
    try {
      // Check if label exists first
      const labelsResult = await this.getLabels(owner, repo);
      if (!labelsResult.success) {
        return { success: false, error: labelsResult.error };
      }
      
      const labelExists = labelsResult.labels.some(label => 
        label.name.toLowerCase() === labelName.toLowerCase()
      );
      
      // Create the label if it doesn't exist
      if (!labelExists) {
        console.log(`[GitHub API] Creating new label: ${labelName}`);
        
        // Generate a random color for the new label
        const randomColor = Math.floor(Math.random()*16777215).toString(16);
        
        try {
          await this.octokit.rest.issues.createLabel({
            owner,
            repo,
            name: labelName,
            color: randomColor,
            description: `Label created via GitHub Release Dashboard`
          });
        } catch (error) {
          return { success: false, error: `Failed to create label: ${error.message}` };
        }
      }
      
      // Add the label to the issue
      const { data } = await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [labelName]
      });
      
      // Clear cache for this issue
      const cacheKey = `${owner}/${repo}:issues:all:`;
      this.cache.delete(cacheKey);
      
      return { success: true, labels: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async removeLabelFromIssue(owner, repo, issueNumber, labelName) {
    try {
      await this.octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: labelName
      });
      
      // Clear cache for this issue
      const cacheKey = `${owner}/${repo}:issues:all:`;
      this.cache.delete(cacheKey);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getMilestones(owner, repo, state = "all") {
    try {
      // Initialize variables for pagination
      let allMilestones = [];
      let page = 1;
      let hasNextPage = true;
      
      // Fetch all pages of milestones
      while (hasNextPage) {
        const response = await this.octokit.rest.issues.listMilestones({
          owner,
          repo,
          state,
          per_page: 100,
          page: page,
          sort: "due_on"
        });
        
        const milestones = response.data;
        allMilestones = [...allMilestones, ...milestones];
        
        // Check if we've reached the last page
        if (milestones.length < 100) {
          hasNextPage = false;
        } else {
          page++;
        }
      }
      
      return { success: true, milestones: allMilestones };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPRReviewStatuses(owner, repo) {
    try {
      // Get PRs to extract review statuses
      const prsResult = await this.getPullRequests(owner, repo);
      
      if (!prsResult.success) {
        return { success: false, error: prsResult.error };
      }
      
      // Extract unique review statuses
      const reviewStatuses = new Set();
      prsResult.pullRequests.forEach(pr => {
        if (pr.reviewStatus) {
          reviewStatuses.add(pr.reviewStatus);
        }
      });
      
      // Define the standard GitHub review statuses in a logical order
      const statusOrder = [
        'APPROVED',           // Approved review
        'CHANGES_REQUESTED',  // Changes requested
        'REVIEW_REQUIRED',    // Review required
        'NO_REVIEW',          // No reviews
        'COMMENTED',          // Reviewed with comments only
        'DRAFT'               // Draft PR
      ];
      
      // Get array of statuses and sort them in the standard order
      const statuses = Array.from(reviewStatuses).sort((a, b) => {
        const indexA = statusOrder.indexOf(a);
        const indexB = statusOrder.indexOf(b);
        
        // If both statuses are in the order list, sort by the defined order
        if (indexA >= 0 && indexB >= 0) {
          return indexA - indexB;
        }
        
        // If only one status is in the order list, prioritize it
        if (indexA >= 0) return -1;
        if (indexB >= 0) return 1;
        
        // Otherwise, sort alphabetically
        return a.localeCompare(b);
      });
      
      return { success: true, reviewStatuses: statuses };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getIssueTypes(owner, repo) {
    try {
      // Get all labels
      const { success, labels, error } = await this.getLabels(owner, repo);
      
      if (!success) {
        return { success: false, error };
      }
      
      // Filter out labels that represent issue types
      // Common issue type labels include: bug, feature, enhancement, documentation, etc.
      const issueTypeKeywords = [
        'bug', 'fix', 'error',
        'feature', 'enhancement', 'improvement',
        'documentation', 'docs',
        'question', 'help',
        'security', 'vulnerability',
        'refactor', 'technical debt',
        'test', 'testing'
      ];
      
      // Find labels that match issue type keywords
      const issueTypeLabels = labels.filter(label => 
        issueTypeKeywords.some(keyword => 
          label.name.toLowerCase().includes(keyword)
        )
      );
      
      return { success: true, issueTypes: issueTypeLabels };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getIssues(owner, repo, state = "all", labels = "", options = {}) {
    try {
      const cacheKey = `${owner}/${repo}:issues:${state}:${labels}`;
      const { useCache = true, maxIssues = 300 } = options;
      
      // Try to get from cache first if cache use is enabled
      if (useCache) {
        const cachedData = this.getCachedItem(cacheKey);
        if (cachedData) {
          console.log(`[GitHub API] Using cached issues for ${owner}/${repo} (${cachedData.length} issues)`);
          return { success: true, issues: cachedData };
        }
      }
      
      console.log(`[GitHub API] Fetching issues for ${owner}/${repo}`);
      
      // Initialize variables for pagination
      let allIssues = [];
      let page = 1;
      let hasNextPage = true;
      
      // Fetch issues with pagination, stopping at maxIssues limit
      while (hasNextPage && allIssues.length < maxIssues) {
        console.log(`[GitHub API] Fetching issues page ${page}`);
        const response = await this.octokit.rest.issues.listForRepo({
          owner,
          repo,
          state,
          per_page: 100,
          page: page,
          sort: "updated",
          direction: "desc",
          ...(labels && { labels }),
        });
        
        const issues = response.data;
        allIssues = [...allIssues, ...issues];
        
        console.log(`[GitHub API] Retrieved ${issues.length} issues on page ${page}`);
        
        // Check if we've reached the last page or the max limit
        if (issues.length < 100 || allIssues.length >= maxIssues) {
          hasNextPage = false;
        } else {
          page++;
        }
      }
      
      // Optionally limit the number of issues to process
      if (allIssues.length > maxIssues) {
        console.log(`[GitHub API] Limiting issues to ${maxIssues} (out of ${allIssues.length} retrieved)`);
        allIssues = allIssues.slice(0, maxIssues);
      }
      
      console.log(`[GitHub API] Filtering PRs from issues and classifying ${allIssues.length} items`);
      
      // Filter out pull requests which also appear in the issues endpoint
      const issues = allIssues.filter(issue => !issue.pull_request);
      
      console.log(`[GitHub API] After filtering PRs, processing ${issues.length} true issues`);
      
      // Get issue types mapping from labels - use cache for efficiency
      const { success: typesSuccess, issueTypes } = await this.getIssueTypes(owner, repo);
      
      // Add issue type classification if we have the issue types
      const enhancedIssues = issues.map(issue => {
        let issueType = 'other';
        
        // Determine issue type based on labels
        if (typesSuccess && issueTypes.length > 0) {
          // Check for bug labels
          if (issue.labels.some(label => 
            label.name.toLowerCase().includes('bug') || 
            label.name.toLowerCase().includes('fix') ||
            label.name.toLowerCase().includes('error')
          )) {
            issueType = 'bug';
          }
          // Check for enhancement/feature labels
          else if (issue.labels.some(label => 
            label.name.toLowerCase().includes('feature') || 
            label.name.toLowerCase().includes('enhancement') ||
            label.name.toLowerCase().includes('improvement')
          )) {
            issueType = 'enhancement';
          }
          // Check for documentation labels
          else if (issue.labels.some(label => 
            label.name.toLowerCase().includes('doc')
          )) {
            issueType = 'documentation';
          }
          // Check for question labels
          else if (issue.labels.some(label => 
            label.name.toLowerCase().includes('question') ||
            label.name.toLowerCase().includes('help')
          )) {
            issueType = 'question';
          }
        }
        
        return {
          ...issue,
          issueType
        };
      });
      
      console.log(`[GitHub API] Completed processing ${enhancedIssues.length} issues with types`);
      
      // Cache the results
      this.setCacheItem(cacheKey, enhancedIssues, 30 * 60 * 1000); // 30 min cache
      
      return { success: true, issues: enhancedIssues };
    } catch (error) {
      console.error(`[GitHub API] Error fetching issues: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current rate limit information from GitHub API
   * @returns {Promise<{success: boolean, rateLimit?: object, error?: string}>}
   */
  async getRateLimit() {
    try {
      console.log("[GitHub API] Fetching rate limit information");
      const { data } = await this.octokit.rest.rateLimit.get();
      console.log("[GitHub API] Rate limit information retrieved:", data.rate);
      return { success: true, rateLimit: data.rate };
    } catch (error) {
      console.error(`[GitHub API] Error fetching rate limit: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set the default cache expiry time
   * @param {number} timeInMinutes - Time in minutes for cache expiry
   */
  setCacheExpiryTime(timeInMinutes) {
    if (typeof timeInMinutes !== 'number' || timeInMinutes <= 0) {
      console.error("[GitHub Service] Invalid cache expiry time. Must be a positive number.");
      return false;
    }
    this.defaultCacheExpiry = timeInMinutes * 60 * 1000;
    console.log(`[GitHub Service] Cache expiry time set to ${timeInMinutes} minutes`);
    return true;
  }

  /**
   * Get the current cache expiry time in minutes
   * @returns {number} - Current cache expiry time in minutes
   */
  getCacheExpiryTime() {
    return this.defaultCacheExpiry / (60 * 1000);
  }

  /**
   * Track rate limit from response headers
   * @param {Response} response - GitHub API response
   * @private
   */
  _trackRateLimit(response) {
    if (response && response.headers) {
      // Octokit response headers are objects, not Maps, so we access properties directly
      const remaining = response.headers['x-ratelimit-remaining'];
      const reset = response.headers['x-ratelimit-reset'];
      
      if (remaining) this.rateLimitRemaining = parseInt(remaining, 10);
      if (reset) this.rateLimitReset = parseInt(reset, 10);
      
      // Log when rate limit is getting low
      if (this.rateLimitRemaining !== null && this.rateLimitRemaining < 50) {
        console.warn(`[GitHub API] Rate limit is getting low: ${this.rateLimitRemaining} requests remaining`);
      }
    }
  }
  
  /**
   * Check if we should back off due to rate limiting
   * @returns {boolean} True if should back off
   * @private
   */
  _shouldBackOff() {
    if (this.rateLimitRemaining !== null && this.rateLimitRemaining < 10) {
      const now = Math.floor(Date.now() / 1000);
      const timeToReset = this.rateLimitReset ? (this.rateLimitReset - now) : 0;
      
      if (timeToReset > 0) {
        console.warn(`[GitHub API] Rate limiting active, backing off. ${timeToReset}s until reset.`);
        return true;
      }
    }
    return false;
  }

  /**
   * Get GitHub Actions workflows for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<{success: boolean, workflows?: Array, error?: string}>}
   */
  async getWorkflows(owner, repo, useCache = true) {
    try {
      const cacheKey = `${owner}/${repo}:workflows`;
      
      // Try to get from cache first if cache use is enabled
      if (useCache) {
        const cachedData = this.getCachedItem(cacheKey);
        if (cachedData) {
          console.log(`[GitHub API] Using cached workflows for ${owner}/${repo} (${cachedData.length} workflows)`);
          return { success: true, workflows: cachedData };
        }
      }
      
      // Check rate limiting
      if (this._shouldBackOff()) {
        return { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          rateLimit: {
            remaining: this.rateLimitRemaining,
            resetAt: new Date(this.rateLimitReset * 1000).toLocaleString()
          }
        };
      }
      
      console.log(`[GitHub API] Fetching workflows for ${owner}/${repo}`);
      
      // Initialize variables for pagination
      let allWorkflows = [];
      let page = 1;
      let hasNextPage = true;
      
      // Fetch all pages of workflows
      while (hasNextPage) {
        console.log(`[GitHub API] Fetching workflows page ${page}`);
        const response = await this.octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
          owner,
          repo,
          per_page: 100,
          page: page
        });
        
        // Track rate limit
        this._trackRateLimit(response);
        
        // Make sure we safely handle the workflows array
        const workflows = response.data.workflows || [];
        allWorkflows = [...allWorkflows, ...workflows];
        
        console.log(`[GitHub API] Retrieved ${workflows.length} workflows on page ${page}`);
        
        // Check if we've reached the last page
        if (workflows.length < 100) {
          hasNextPage = false;
        } else {
          page++;
        }
      }
      
      console.log(`[GitHub API] Total workflows fetched: ${allWorkflows.length}`);
      
      // Cache the results
      this.setCacheItem(cacheKey, allWorkflows);
      
      return { success: true, workflows: allWorkflows };
    } catch (error) {
      console.error(`[GitHub API] Error fetching workflows: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get GitHub Actions workflow runs for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string|null} workflowId - Specific workflow ID to fetch runs for, or null for all workflows
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<{success: boolean, workflowRuns?: Array, error?: string}>}
   */
  async getWorkflowRuns(owner, repo, workflowId = null, useCache = true) {
    try {
      const cacheKey = `${owner}/${repo}:workflow-runs:${workflowId || 'all'}`;
      
      // Try to get from cache first if cache use is enabled
      if (useCache) {
        const cachedData = this.getCachedItem(cacheKey);
        if (cachedData) {
          console.log(`[GitHub API] Using cached workflow runs for ${owner}/${repo} (${cachedData.length} runs)`);
          return { success: true, workflowRuns: cachedData };
        }
      }
      
      // Check rate limiting
      if (this._shouldBackOff()) {
        return { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          rateLimit: {
            remaining: this.rateLimitRemaining,
            resetAt: new Date(this.rateLimitReset * 1000).toLocaleString()
          }
        };
      }
      
      console.log(`[GitHub API] Fetching workflow runs for ${owner}/${repo}${workflowId ? ` (workflow ID: ${workflowId})` : ''}`);
      
      // Endpoint depends on whether a specific workflow was requested
      const endpoint = workflowId
        ? `GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs`
        : `GET /repos/{owner}/{repo}/actions/runs`;
      
      // Parameters for the request
      const params = {
        owner,
        repo,
        per_page: 100,
        page: 1
      };
      
      // Add workflow_id parameter if specified
      if (workflowId) {
        // Convert to string if it's not already
        params.workflow_id = typeof workflowId === 'string' ? workflowId : String(workflowId);
        console.log(`[GitHub API] Using workflow ID: ${params.workflow_id}`);
      }
      
      // Initialize variables for pagination
      let allRuns = [];
      let page = 1;
      let hasNextPage = true;
      
      // Fetch workflow runs with pagination (limit to 500 runs total for performance)
      const maxRuns = 500;
      
      while (hasNextPage && allRuns.length < maxRuns) {
        console.log(`[GitHub API] Fetching workflow runs page ${page}`);
        params.page = page;
        
        try {
          console.log(`[GitHub API] Requesting: ${endpoint} with params:`, JSON.stringify(params));
          const response = await this.octokit.request(endpoint, params);
          
          // Track rate limit
          this._trackRateLimit(response);
          
          // Debug the response structure
          console.log(`[GitHub API] Response structure:`, 
            Object.keys(response.data).join(', '));
          
          // In the GitHub API, the response format can be different depending on the endpoint
          // The workflow runs are in response.data.workflow_runs
          const runs = Array.isArray(response.data.workflow_runs) 
            ? response.data.workflow_runs 
            : [];
            
          if (runs.length === 0) {
            console.log(`[GitHub API] No workflow runs found in response. This might be normal if there are no runs.`);
          }
          
          allRuns = [...allRuns, ...runs];
          
          console.log(`[GitHub API] Retrieved ${runs.length} workflow runs on page ${page}`);
          
          // Check if we've reached the last page or the max limit
          if (runs.length < 100 || allRuns.length >= maxRuns) {
            hasNextPage = false;
          } else {
            page++;
          }
        } catch (requestError) {
          console.error(`[GitHub API] Error during request: ${requestError.message}`);
          // Stop the loop on error
          hasNextPage = false;
        }
      }
      
      console.log(`[GitHub API] Total workflow runs fetched: ${allRuns.length}`);
      
      // Cache the results with a shorter expiry since workflow runs change frequently
      this.setCacheItem(cacheKey, allRuns, 15 * 60 * 1000); // 15 minutes
      
      return { success: true, workflowRuns: allRuns };
    } catch (error) {
      console.error(`[GitHub API] Error fetching workflow runs: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

const githubService = new GitHubService();
export default githubService;
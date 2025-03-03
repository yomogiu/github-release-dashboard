# GitHub Release Dashboard

This app was created with Claude Code.

Demo: [GitHub Release Dashboard](https://github-release-dashboard-7zrm.vercel.app)

This a React-based dashboard for managing GitHub releases and tracking pull requests, as well as monitoring GitHub Actions (e.g., code scan, unit tests, etc.). This tool is designed to help software product managers or release owners manage and track their software more efficiently. Important parts to implement still would be license compliance reporting (SBOM generation) and GitHub Actions monitoring filtered by branches.

## Open Issues

The GitHub Actions fetching has some issue with the initial retrieval so if the line graph is only showing a handful of events, hit the "Reload Selected Workflow Runs" again to refresh.

## Features

- **Authentication**: Login with GitHub Personal Access Token (PAT)
- **Repository Selection**: Paste url to any repository you have access to
- **Release Management**:
  - View all releases
  - Create new releases
  - Track release phases (development, staging, production)
  - Update release phases
- **Pull Request Tracking**:
  - View pull requests
  - Filter PRs by date, milestone, review status, and labels
- **Issue Tracking**:
  - View issues
  - Filter PRs by date, milestone, review status, and labels
- **Actions Dashboard**:
  - View specific GitHub Actions workflow
  - Dashboard showing count of Success, Failure, In Progress workflow
  - Trend graph showing average duration for the day
- **Custom View**:
	- Create custom view by combining labels
- **Settings**:
	- Change cache expiry time (helps with API call limit)
 	- Modify the number of PR/issues to fetch
  - View your current API limit for the token/user

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/github-release-dashboard.git
cd github-release-dashboard
```
2. Install dependencies:
```
npm install
```
3. Create a '.env' file in the root directory (reference '.env.example') and store your GitHub Personal Access Token
```
4. Start the development server:
```
npm start
```
5. Open your browser and navigate to `http://localhost:3000`
```

## Technologies Used

- React
- Material UI
- Octokit (GitHub API client)
- React Router
- Chart.js

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

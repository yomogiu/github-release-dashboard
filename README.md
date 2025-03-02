# GitHub Release Dashboard

This app was created with Claude Code.

It's a React-based dashboard for managing GitHub releases and tracking pull requests. This tool is designed to help software product managers or release owners manage and track their software more efficiently.

## Features

- **Authentication**: Login with GitHub Personal Access Token (PAT)
- **Repository Selection**: View any repository you have access to
- **Release Management**:
  - View all releases
  - Create new releases
  - Track release phases (development, staging, production)
  - Update release phases
- **Pull Request Tracking**:
  - View pull requests
  - Filter PRs by date, milestone, review status, and labels
- **Issue Management**:
  - View issues
  - Filter PRs by date, milestone, review status, and labels
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

3. Start the development server:
```
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Login**: Enter your GitHub Personal Access Token (needs repos, read:org, read:user permissions)
2. **Select Repository**: Enter a GitHub repository URL or owner/repo format
3. **Dashboard**: Access the main dashboard with release management, pull requests, and history
4. **Create Release**: Click "New Release" to create a new release
5. **Manage Releases**: Update release phases and track issues

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

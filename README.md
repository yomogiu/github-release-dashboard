# GitHub Release Dashboard

A React-based dashboard for managing GitHub releases and tracking pull requests. This tool is designed to help Open Source Program Offices (OSPOs) manage their software release processes more efficiently.

## Features

- **Authentication**: Login with GitHub Personal Access Token (PAT)
- **Repository Selection**: View any repository you have access to
- **Release Management**:
  - View all releases
  - Create new releases
  - Track release phases (development, staging, production)
  - Update release phases
- **Pull Request Tracking**:
  - View top 10 pull requests
  - Filter PRs by labels
- **Issue Management**:
  - Associate issues with releases
  - Count issues per release
- **Release History**: Timeline view of all releases

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
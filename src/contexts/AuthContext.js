import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import githubService from '../services/githubService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken('');
    setIsAuthenticated(false);
    localStorage.removeItem('github_token');
  }, []);

  const login = useCallback(async (accessToken, initialRepo = '') => {
    setLoading(true);
    setError('');
    
    try {
      console.log("Initializing GitHub service with token");
      const result = await githubService.initialize(accessToken);
      console.log("GitHub service initialization result:", result);
      
      if (result.success) {
        console.log("Authentication successful");
        setCurrentUser(result.user);
        setToken(accessToken);
        setIsAuthenticated(true);
        localStorage.setItem('github_token', accessToken);
        
        // If initial repo URL is provided, store it
        if (initialRepo) {
          localStorage.setItem('initial_repo_url', initialRepo);
        }
      } else {
        console.log("Authentication failed:", result.error);
        setError('Authentication failed. Please check your token.');
        logout();
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError('An error occurred during authentication.');
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);
  
  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      login(storedToken);
    } else {
      setLoading(false);
    }
  }, [login]);

  const value = {
    currentUser,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import Cookies from 'js-cookie';
import { authService } from '../services';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

// Action types
const actionTypes = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  LOGOUT: 'LOGOUT',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case actionTypes.LOGOUT:
      return {
        ...initialState,
        loading: false,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get('token');
      
      if (token) {
        try {
          const response = await authService.getProfile();
          // authService.getProfile already returns response.data
          const data = response && response.data ? response.data : response;
          dispatch({
            type: actionTypes.SET_USER,
            payload: {
              user: (data && data.user) || (data && data.data && data.data.user) || null,
              token,
            },
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          Cookies.remove('token');
          dispatch({ type: actionTypes.SET_LOADING, payload: false });
        }
      } else {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      const resp = await authService.login(credentials);
      // authService.login returns response.data from axios
      const data = resp && resp.data ? resp.data : resp;
      const { user, token } = (data && data.data) || data || {};

      // Save token to cookie
      Cookies.set('token', token, { expires: 7 }); // 7 days

      dispatch({
        type: actionTypes.SET_USER,
        payload: { user, token },
      });
      return { success: true, user, token };
    } catch (error) {
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const resp = await authService.register(userData);
      // authService.register returns response.data from axios
      const data = resp && resp.data ? resp.data : resp;
      const { user, token } = (data && data.data) || data || {};

      // Save token to cookie
      Cookies.set('token', token, { expires: 7 }); // 7 days

      dispatch({
        type: actionTypes.SET_USER,
        payload: { user, token },
      });
      return { success: true, user, token };
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    Cookies.remove('token');
    dispatch({ type: actionTypes.LOGOUT });
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const resp = await authService.updateProfile(userData);
      const data = resp && resp.data ? resp.data : resp;
      const nextUser = (data && data.user) || (data && data.data && data.data.user) || state.user;
      dispatch({
        type: actionTypes.SET_USER,
        payload: { user: nextUser, token: state.token },
      });
      return { success: true, user: nextUser };
    } catch (error) {
      throw error;
    }
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    // Backwards compatibility helper: directly set user object
    setUser: (userObj) => {
      dispatch({
        type: actionTypes.SET_USER,
        payload: { user: userObj, token: state.token }
      });
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import History from './components/History';
import RoadmapVisualization from './components/RoadmapVisualization';
import { getCurrentUser } from './services/authService';
import { generateRoadmap } from './services/geminiService';
import { saveRoadmap } from './services/roadmapService';
import './App.css';

function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const [inputError, setInputError] = useState('');

  // Handle storage changes for user state
  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Prefill last role from localStorage
  useEffect(() => {
    try {
      const last = localStorage.getItem('lastRole');
      if (last && inputRef.current) inputRef.current.value = last;
    } catch {
      // ignore
    }
  }, []);

  // Apply theme to document and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const inputValue = inputRef.current.value.trim();
    if (!inputValue) {
      setInputError('Please enter a role');
      return;
    }
    setInputError('');

    setLoading(true);
    setError(null);
    setRoadmap(null);

    try {
      const generatedRoadmap = await generateRoadmap(inputValue);
      setRoadmap(generatedRoadmap);
      
      // Save the roadmap to user's history
      if (user) {
        await saveRoadmap(inputValue, generatedRoadmap);
      }
      // persist last role
      localStorage.setItem('lastRole', inputValue);
    } catch (err) {
      setError('Failed to generate roadmap. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setRoadmap(null);
    setError(null);
  };

  const PrivateRoute = ({ children }) => {
    return user ? children : <Navigate to="/login" />;
  };

  PrivateRoute.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return (
    <Router>
      <div className={`app ${theme}-theme`}>
        <div className="background-gradient" />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <div className="content-wrapper">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  {!roadmap ? (
                    <div className="landing-section">
                      <div className="hero-content">
                        <h1 className="hero-title">
                          Career Roadmap
                          <span className="gradient-text">Generator</span>
                        </h1>
                        <p className="hero-subtitle">
                          Transform your career aspirations into a structured, actionable roadmap powered by AI
                        </p>

                        <form onSubmit={handleGenerate} className="search-form">
                          <div className="input-wrapper">
                            <input
                              ref={inputRef}
                              type="text"
                              defaultValue=""
                              placeholder="Enter your desired role (e.g., MERN Stack Developer)"
                              className="search-input"
                              disabled={loading}
                              spellCheck="false"
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              inputMode="text"
                              aria-label="Desired role"
                            />
                            <button
                              type="submit"
                              className="generate-button"
                              disabled={loading}
                              aria-label="Generate roadmap"
                            >
                              {loading ? (
                                <>
                                  <span className="spinner"></span>
                                  Generating...
                                </>
                              ) : (
                                'Generate Roadmap'
                              )}
                            </button>
                          </div>
                          {inputError && (
                            <p className="error-message" role="alert" aria-live="assertive">{inputError}</p>
                          )}
                          {error && <p className="error-message" role="alert" aria-live="polite">{error}</p>}
                        </form>

                        <div className="example-roles">
                          <p>Try these:</p>
                          <div className="role-tags">
                            <button
                              onClick={() => {
                                inputRef.current.value = 'MERN Stack Developer';
                                inputRef.current.focus();
                              }}
                              className="role-tag"
                              aria-label="Use example role MERN Stack Developer"
                              type="button"
                            >
                              MERN Stack Developer
                            </button>
                            <button
                              onClick={() => {
                                inputRef.current.value = 'Data Scientist';
                                inputRef.current.focus();
                              }}
                              className="role-tag"
                              aria-label="Use example role Data Scientist"
                              type="button"
                            >
                              Data Scientist
                            </button>
                            <button
                              onClick={() => {
                                inputRef.current.value = 'DevOps Engineer';
                                inputRef.current.focus();
                              }}
                              className="role-tag"
                              aria-label="Use example role DevOps Engineer"
                              type="button"
                            >
                              DevOps Engineer
                            </button>
                            <button
                              onClick={() => {
                                inputRef.current.value = 'UI/UX Designer';
                                inputRef.current.focus();
                              }}
                              className="role-tag"
                              aria-label="Use example role UI/UX Designer"
                              type="button"
                            >
                              UI/UX Designer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="roadmap-section">
                      <RoadmapVisualization roadmap={roadmap} onReset={handleReset} />
                    </div>
                  )}
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
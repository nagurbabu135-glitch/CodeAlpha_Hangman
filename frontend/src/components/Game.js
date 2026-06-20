import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Game.css';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

function Game() {
  const [game, setGame] = useState(null);
  const [letter, setLetter] = useState('');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    startNewGame();
  }, [navigate]);

  const startNewGame = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/game/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGame(response.data);
      setMessage('');
      setHint('');
    } catch (error) {
      console.error('Failed to start game:', error);
      if (error.response?.status === 401) {
        handleLogout();
      } else {
        setMessage(error.response?.data?.message || 'Failed to start game');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async (e) => {
    e.preventDefault();
    if (!letter || !game) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/game/guess`,
        { gameId: game.gameId, letter },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGame({ ...game, ...response.data });
      setLetter('');
      
      if (response.data.status === 'won') {
        setMessage('🎉 You won!');
        updateUserStats();
      } else if (response.data.status === 'lost') {
        setMessage(`😢 Game over! The word was: ${response.data.word}`);
        updateUserStats();
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Invalid guess');
    }
  };

  const getHint = async () => {
    if (!game) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/game/hint`,
        { gameId: game.gameId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHint(response.data.hint);
    } catch (error) {
      setMessage('Failed to get hint');
    }
  };

  const updateUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/auth/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Failed to update stats');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!game) {
    return (
      <div className="game-container">
        <div className="game-card">
          <div className="game-header">
            <h1>Hangman</h1>
          </div>
          {message ? (
            <div className="error-screen" style={{ textAlign: 'center', padding: '20px' }}>
              <div className="message error" style={{ marginBottom: '20px' }}>{message}</div>
              <button onClick={startNewGame} className="new-game-btn" style={{ width: '100%' }}>
                Retry Start Game
              </button>
              <button onClick={handleLogout} className="logout-btn" style={{ width: '100%', marginTop: '10px' }}>
                Back to Login
              </button>
            </div>
          ) : (
            <div className="loading" style={{ textAlign: 'center', padding: '40px', fontSize: '1.2rem', color: '#fff' }}>
              Loading...
            </div>
          )}
        </div>
      </div>
    );
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Hangman diagram based on incorrect guesses (SVG implementation with animations)
  const renderHangmanSVG = (incorrect) => {
    return (
      <svg width="200" height="250" viewBox="0 0 200 250" className="hangman-svg">
        {/* Gallows post and beams */}
        <line x1="20" y1="230" x2="180" y2="230" className="gallows-base" />
        <line x1="60" y1="230" x2="60" y2="20" className="gallows-post" />
        <line x1="60" y1="20" x2="140" y2="20" className="gallows-beam" />
        <line x1="60" y1="60" x2="100" y2="20" className="gallows-support" />
        <line x1="140" y1="20" x2="140" y2="50" className="gallows-rope" />

        {/* The Man */}
        <g className={`hangman-man ${game.status === 'lost' ? 'swinging' : ''}`}>
          {/* Head */}
          <circle 
            cx="140" 
            cy="65" 
            r="15" 
            className={`hangman-part head ${incorrect >= 1 ? 'visible' : ''}`} 
          />
          {/* Body */}
          <line 
            x1="140" 
            y1="80" 
            x2="140" 
            y2="135" 
            className={`hangman-part body ${incorrect >= 2 ? 'visible' : ''}`} 
          />
          {/* Left Arm */}
          <line 
            x1="140" 
            y1="95" 
            x2="115" 
            y2="115" 
            className={`hangman-part left-arm ${incorrect >= 3 ? 'visible' : ''}`} 
          />
          {/* Right Arm */}
          <line 
            x1="140" 
            y1="95" 
            x2="165" 
            y2="115" 
            className={`hangman-part right-arm ${incorrect >= 4 ? 'visible' : ''}`} 
          />
          {/* Left Leg */}
          <line 
            x1="140" 
            y1="135" 
            x2="120" 
            y2="180" 
            className={`hangman-part left-leg ${incorrect >= 5 ? 'visible' : ''}`} 
          />
          {/* Right Leg */}
          <line 
            x1="140" 
            y1="135" 
            x2="160" 
            y2="180" 
            className={`hangman-part right-leg ${incorrect >= 6 ? 'visible' : ''}`} 
          />
          
          {/* Sad eyes/face on Game Over */}
          {incorrect >= 6 && (
            <g className="hangman-face">
              {/* Left eye x */}
              <line x1="134" y1="61" x2="138" y2="65" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
              <line x1="138" y1="61" x2="134" y2="65" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
              
              {/* Right eye x */}
              <line x1="142" y1="61" x2="146" y2="65" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
              <line x1="146" y1="61" x2="142" y2="65" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
              
              {/* Frown */}
              <path d="M 136 73 Q 140 69 144 73" stroke="#e74c3c" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>
      </svg>
    );
  };

  return (
    <div className="game-container">
      <div className="game-card">
        <div className="game-header">
          <h1>Hangman</h1>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
        
        {user && (
          <div className="user-stats">
            <span>Games: {user.gamesPlayed}</span>
            <span>Wins: {user.gamesWon}</span>
          </div>
        )}
        
        <div className="hangman-diagram">
          {renderHangmanSVG(game.incorrectGuesses)}
        </div>
        
        <div className="word-display">
          {game.wordState || '_ '.repeat(game.wordLength)}
        </div>
        
        <div className="game-info">
          <p>Incorrect guesses: {game.incorrectGuesses} / {game.maxIncorrectGuesses}</p>
        </div>
        
        {message && <div className={`message ${game.status === 'won' ? 'success' : game.status === 'lost' ? 'error' : ''}`}>{message}</div>}
        
        {hint && <div className="hint">💡 Hint: {hint}</div>}
        
        {game.status === 'active' && (
          <>
            <form onSubmit={handleGuess} className="guess-form">
              <input
                type="text"
                value={letter}
                onChange={(e) => setLetter(e.target.value.toUpperCase())}
                maxLength={1}
                placeholder="Enter a letter"
                className="letter-input"
              />
              <button type="submit" className="guess-btn">Guess</button>
            </form>
            
            <div className="keyboard">
              {alphabet.map((char) => (
                <button
                  key={char}
                  onClick={() => {
                    setLetter(char);
                    if (game.status === 'active') {
                      document.querySelector('.letter-input').value = char;
                    }
                  }}
                  disabled={game.guessedLetters?.includes(char)}
                  className={`key ${game.guessedLetters?.includes(char) ? 'used' : ''}`}
                >
                  {char}
                </button>
              ))}
            </div>
            
            <button onClick={getHint} className="hint-btn" disabled={loading}>
              Get AI Hint
            </button>
          </>
        )}
        
        {game.status !== 'active' && (
          <button onClick={startNewGame} className="new-game-btn">
            New Game
          </button>
        )}
      </div>
    </div>
  );
}

export default Game;

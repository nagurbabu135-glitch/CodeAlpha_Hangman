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

  // Hangman diagram based on incorrect guesses
  const getHangmanDiagram = (incorrect) => {
    const stages = [
      '', // 0 incorrect
      '  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========', // 1
      '  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========', // 2
      '  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========', // 3
      '  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========', // 4
      '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========', // 5
      '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========', // 6
      '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========', // 7 (game over)
    ];
    return stages[incorrect] || stages[6];
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
          <pre>{getHangmanDiagram(game.incorrectGuesses)}</pre>
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

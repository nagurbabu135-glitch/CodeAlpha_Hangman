# Hangman Game - Full Stack Application

A full-stack Hangman game with authentication, MongoDB database, and AI-powered hints using OpenAI.

## Features

- **Authentication**: User registration and login with JWT tokens
- **MongoDB Database**: Persistent storage for users and game history
- **AI-Powered Hints**: OpenAI GPT-3.5 integration for intelligent game hints
- **Game Statistics**: Track games played and won
- **Modern UI**: Clean, responsive React frontend with beautiful design

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- OpenAI API
- bcryptjs for password hashing

### Frontend
- React
- React Router
- Axios for API calls
- CSS for styling

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas connection string)
- OpenAI API Key

## Setup Instructions

### 1. Install MongoDB

**Option A: Local MongoDB**
- Download and install MongoDB from https://www.mongodb.com/try/download/community
- Start MongoDB service

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a cluster and get your connection string

### 2. Get OpenAI API Key

- Sign up at https://platform.openai.com/
- Generate an API key from your dashboard

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hangman
# Or use MongoDB Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/hangman
JWT_SECRET=your_super_secret_jwt_key_change_this
OPENAI_API_KEY=your_openai_api_key_here
```

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Start the React development server:

```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. Open `http://localhost:3000` in your browser
2. Register a new account or login
3. Start playing Hangman!
4. Use the "Get AI Hint" button for intelligent hints
5. Track your wins and games played

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)

### Game
- `POST /api/game/start` - Start a new game (requires auth)
- `POST /api/game/guess` - Make a letter guess (requires auth)
- `POST /api/game/hint` - Get AI hint (requires auth)
- `GET /api/game/history` - Get game history (requires auth)

## Game Rules

- Guess the word one letter at a time
- You have 6 incorrect guesses allowed
- Use the virtual keyboard or type letters
- Get AI hints if you're stuck
- Win by guessing all letters before running out of attempts

## Project Structure

```
hangman-app/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Game.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── game.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── Login.css
│   │   │   ├── Game.js
│   │   │   └── Game.css
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   └── package.json
└── README.md
```

## Troubleshooting

**MongoDB Connection Error**
- Ensure MongoDB is running
- Check your MONGODB_URI in .env file

**OpenAI API Error**
- Verify your OPENAI_API_KEY is correct
- Ensure you have credits in your OpenAI account

**CORS Error**
- Backend CORS is configured for localhost:3000
- If using different ports, update CORS in server.js

## Security Notes

- Change the JWT_SECRET in production
- Use environment variables for sensitive data
- Implement rate limiting for production
- Add HTTPS for production deployment

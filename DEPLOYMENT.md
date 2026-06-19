# Deployment Guide - Hangman Game

This guide will help you deploy the Hangman game to production using Vercel (frontend) and Railway (backend).

## Quick Start - Local Development with Docker (MongoDB Auto-Start)

**For local development with automatic MongoDB startup:**

1. Install Docker Desktop (https://www.docker.com/products/docker-desktop)
2. Update `backend/.env.docker` with your JWT_SECRET and OPENAI_API_KEY
3. Run the startup script:
   - **Windows**: Double-click `start.bat`
   - **Mac/Linux**: Run `chmod +x start.sh && ./start.sh`

This will automatically:
- Start MongoDB in a Docker container
- Start the backend server
- MongoDB data persists across restarts

The backend will be available at `http://localhost:5000`

Then start the frontend separately:
```bash
cd frontend
npm install
npm start
```

## Production Deployment

### Prerequisites

- GitHub account (for version control)
- Vercel account (free)
- Railway account (free)
- MongoDB Atlas account (free)
- OpenAI API key

## Step 1: Set up MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas and sign up
2. Create a free cluster
3. Create a database user with username and password
4. Get your connection string from "Connect" → "Connect your application"
5. Format: `mongodb+srv://<username>:<password>@cluster.mongodb.net/hangman`

## Step 2: Push Code to GitHub

1. Create a new repository on GitHub
2. Initialize git in your project:
```bash
cd C:\Users\nagur\CascadeProjects\hangman-app
git init
git add .
git commit -m "Initial commit"
```
3. Connect to your GitHub repository and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/hangman-app.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy Backend to Railway

1. Go to https://railway.app/ and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your hangman-app repository
4. Railway will detect the backend from the `backend` folder
5. Configure environment variables in Railway:
   - `PORT`: 5000
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Generate a random secret (use: `openssl rand -base64 32`)
   - `OPENAI_API_KEY`: Your OpenAI API key
6. Click "Deploy"
7. Wait for deployment to complete
8. Copy your Railway backend URL (e.g., `https://hangman-backend.railway.app`)

## Step 4: Deploy Frontend to Vercel

1. Go to https://vercel.com/ and sign up/login
2. Click "Add New Project" → "Import" your GitHub repository
3. Configure the project:
   - Root Directory: `frontend`
   - Framework Preset: Create React App
4. Add environment variable:
   - `REACT_APP_API_URL`: Your Railway backend URL + `/api`
   - Example: `https://hangman-backend.railway.app/api`
5. Click "Deploy"
6. Wait for deployment to complete
7. Copy your Vercel frontend URL

## Step 5: Update CORS (if needed)

If you encounter CORS errors, update the backend CORS configuration:

In `backend/server.js`, update the CORS middleware:
```javascript
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

Then redeploy the backend on Railway.

## Step 6: Test Your Deployed App

1. Open your Vercel frontend URL
2. Register a new account
3. Play the game
4. Test AI hints (requires OpenAI API key)

## Alternative: Deploy Everything on Railway

If you prefer to deploy both frontend and backend on Railway:

1. Create a `docker-compose.yml` in the root:
```yaml
version: "3.8"
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=https://your-backend-url.railway.app/api
```

2. Deploy the entire repository to Railway
3. Configure environment variables for both services

## Troubleshooting

**MongoDB Connection Error**
- Verify your MongoDB Atlas connection string
- Ensure IP whitelist includes Railway's IP (0.0.0.0/0)

**OpenAI API Error**
- Verify your API key is correct
- Ensure you have credits in your OpenAI account

**CORS Error**
- Update CORS configuration in backend
- Add your Vercel domain to allowed origins

**Build Failures**
- Check Railway/Vercel build logs
- Ensure all dependencies are in package.json

## Cost Summary

- **MongoDB Atlas**: Free tier (512MB)
- **Railway**: Free tier ($5/month credit)
- **Vercel**: Free tier
- **OpenAI**: Pay per usage (minimal for hints)

Total cost: Free or minimal depending on OpenAI usage

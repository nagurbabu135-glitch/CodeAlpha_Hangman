#!/bin/bash

echo "Starting Hangman App with automatic MongoDB..."
echo ""

# Check if Docker is running
if ! docker --version > /dev/null 2>&1; then
    echo "ERROR: Docker is not running or not installed."
    echo "Please install Docker Desktop and start it."
    exit 1
fi

echo "Docker is running. Starting services..."
docker-compose up --build

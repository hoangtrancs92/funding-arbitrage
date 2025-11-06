#!/bin/bash

echo "🚀 Starting Funding Rate Arbitrage Bot..."
echo

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your API keys"
    echo
    echo "Command: cp .env.example .env"
    echo
    read -p "Press enter to continue..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        read -p "Press enter to continue..."
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
    echo
fi

# Start the application
echo "🔄 Starting development server..."
echo
echo "📊 Dashboard will be available at: http://localhost:3000"
echo "🩺 Health check: http://localhost:3000/health"
echo "📈 API endpoints: http://localhost:3000/funding-rates"
echo
echo "Press Ctrl+C to stop the bot"
echo

npm run start:dev
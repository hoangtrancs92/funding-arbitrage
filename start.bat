@echo off
echo 🚀 Starting Funding Rate Arbitrage Bot...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ❌ Error: .env file not found!
    echo Please copy .env.example to .env and configure your API keys
    echo.
    echo Command: copy .env.example .env
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
    echo.
)

REM Start the application
echo 🔄 Starting development server...
echo.
echo 📊 Dashboard will be available at: http://localhost:3000
echo 🩺 Health check: http://localhost:3000/health
echo 📈 API endpoints: http://localhost:3000/funding-rates
echo.
echo Press Ctrl+C to stop the bot
echo.

call npm run start:dev
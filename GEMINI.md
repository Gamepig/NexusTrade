# NexusTrade Project

This file provides context for the Gemini AI assistant.

make sure "think"<"think hard"<"think harder"<"ultrathink"

## Project Overview

NexusTrade appears to be a cryptocurrency trading application. It includes features like AI-based technical analysis, data collection, and integration with Binance API. The project is built with Node.js and uses Docker for containerization.

## Key Technologies

*   **Backend:** Node.js, Express.js (likely)
*   **Frontend:** HTML, CSS, JavaScript (from the `public` directory)
*   **Database:** MongoDB (from `mongo-init.js`)
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions (from `.github/workflows`)

## Development Notes

*   The main server entry point is likely `src/server.js`.
*   The project uses Prettier for code formatting and ESLint for linting.
*   There are numerous test scripts in the root directory, prefixed with `test_`.
*   The `openrouter-rate-limit-monitor` seems to be a separate utility or microservice within the project.

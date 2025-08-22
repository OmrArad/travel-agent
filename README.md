# Travel Assistant

A simple conversational travel assistant built with React + Node + Ollama.

### Features
- Handles 3 types of queries:
  1. Destination recommendations
  2. Packing suggestions
  3. Weather/local info (via function calling)
- Maintains conversation context
- Uses enhanced prompt engineering (chain-of-thought, system instructions)
- Function calling support with weather tool
- Simple error handling
- Runs locally with Ollama for privacy and cost savings

### Prerequisites
- [Ollama](https://ollama.ai/) installed and running locally
- A model pulled (e.g., `ollama pull llama3:latest`)
- OpenWeather API key (optional, for weather functionality)

### Weather Tool
The assistant uses function calling to access real-time weather data:
- Automatically detects when weather information is requested
- Calls the OpenWeather API to get current conditions
- Provides detailed weather information including temperature, humidity, wind speed, and "feels like" temperature
- Works with any city name (e.g., "What's the weather in Paris?", "How's the weather in Tokyo?")

### How to Run
1. Clone repo
2. `cd backend && npm install`
3. Create `.env` file with optional configuration:
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3:latest
   OPENWEATHER_KEY=your_openweather_api_key_here
   ```
4. `node index.js`
5. `cd frontend && npm install && npm start`
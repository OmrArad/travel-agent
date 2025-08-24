# Travel Assistant

A simple conversational travel assistant built with React + Node + Ollama.

## 📚 Documentation
- **[Sample Conversations](docs/SYSTEM_DOCUMENTATION.md)** - Example conversation transcripts showing the system in action
- **[Prompt Engineering](docs/PROMPT_ENGINEERING_GUIDE.md)** - Brief notes on key prompt engineering decisions

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

### Intelligent Timeout System
The assistant automatically adjusts response timeouts based on question complexity and context:
- **Simple queries**: 2 minutes (e.g., "What's the weather in Paris?")
- **Complex queries**: 3 minutes (e.g., "Plan a 7-day itinerary for Japan")
- **Follow-up questions**: 2.5 minutes (e.g., "What about restaurants?")
- **Follow-ups after complex queries**: 4 minutes (e.g., "Can you add more details?" after a complex planning request)
- All timeouts are configurable via environment variables

### Conversation History Management
The assistant intelligently manages conversation context to improve performance:
- **Duplicate detection**: Automatically skips processing of duplicate or very similar messages
- **Weather query consolidation**: Combines multiple weather queries for the same city into one
- **Context optimization**: Maintains only the most relevant recent messages (default: 8 messages)
- **Smart cleanup**: Removes redundant information while preserving conversation flow

### How to Run
1. Clone repo
2. `cd backend && npm install`
3. Create `.env` file with optional configuration:
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3:latest
   OPENWEATHER_KEY=your_openweather_api_key_here
   
   # Timeout configurations (in milliseconds)
   OLLAMA_TIMEOUT_SIMPLE=120000        # 2 minutes for simple queries
   OLLAMA_TIMEOUT_COMPLEX=180000       # 3 minutes for complex queries
   OLLAMA_TIMEOUT_FOLLOWUP=150000      # 2.5 minutes for follow-up questions
   OLLAMA_TIMEOUT_FOLLOWUP_COMPLEX=240000  # 4 minutes for follow-ups after complex queries
   
   # Conversation management
   OLLAMA_MAX_HISTORY_MESSAGES=8       # Maximum conversation history to maintain
   ```
4. `node index.js`
5. `cd frontend && npm install && npm start`
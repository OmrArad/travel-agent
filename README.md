# Travel Assistant

A simple conversational travel assistant built with React + Node + Ollama.

### Features
- Handles 3 types of queries:
  1. Destination recommendations
  2. Packing suggestions
  3. Weather/local info (via external API)
- Maintains conversation context
- Uses enhanced prompt engineering (chain-of-thought, system instructions)
- Simple error handling
- Runs locally with Ollama for privacy and cost savings

### Prerequisites
- [Ollama](https://ollama.ai/) installed and running locally
- A model pulled (e.g., `ollama pull llama3.2`)

### How to Run
1. Clone repo
2. `cd backend && npm install`
3. Create `.env` file with optional configuration:
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   OPENWEATHER_KEY=your_key_here
   ```
4. `node index.js`
5. `cd frontend && npm install && npm start`
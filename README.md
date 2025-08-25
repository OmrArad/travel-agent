# AI Travel Assistant

A simple, effective travel assistant that demonstrates LLM conversation capabilities with Ollama integration and weather data augmentation.

## Features

- **Conversation-First Design**: Natural travel conversations with context awareness
- **Enhanced Prompt Engineering**: Chain-of-thought reasoning for complex travel planning
- **Weather Integration**: Real-time weather data for travel destinations
- **Simple Technical Implementation**: Clean, straightforward codebase
- **Modern UI**: Beautiful React frontend with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Ollama installed and running locally
- OpenWeather API key (optional, for weather features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-agent
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Backend (.env file)
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   OPENWEATHER_KEY=your_openweather_api_key_here
   PORT=3001
   ```

4. **Start Ollama**
   ```bash
   # Make sure Ollama is running with a model
   ollama run llama2
   ```

### Running the Application

1. **Start the backend**
   ```bash
   cd backend
   npm start
   ```
   Backend will run on http://localhost:3001

2. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on http://localhost:5173

3. **Open your browser**
   Navigate to http://localhost:5173 to start chatting with your travel assistant!

## Usage

### Travel Queries Supported

- **Destination Recommendations**: "Recommend some travel destinations for summer"
- **Weather Information**: "What's the weather in Paris?"
- **Packing Suggestions**: "What should I pack for a beach vacation?"
- **Budget Planning**: "Tell me about budget travel tips"
- **Itinerary Planning**: "Plan a 3-day trip to Tokyo"
- **Local Insights**: "What are the best restaurants in Rome?"

### Quick Actions

The sidebar includes quick action buttons for common travel queries:
- Weather Check
- Summer Destinations
- Packing Tips
- Budget Travel

## Architecture

### Backend (Express.js)
- **Simple session management** for conversation history
- **Ollama integration** with optimized prompts
- **Weather API integration** for real-time data
- **Clean error handling** and logging

### Frontend (React)
- **Modern chat interface** with markdown support
- **Responsive design** with Tailwind CSS
- **Real-time messaging** with loading states
- **Session persistence** across conversations

### Prompt Engineering

The system uses two types of prompts:

1. **Standard Prompt**: For simple travel queries
2. **Chain-of-Thought Prompt**: For complex planning and recommendations

Both prompts include:
- Travel-only policy enforcement
- Markdown formatting guidelines
- Follow-up question generation
- Weather data integration

## API Endpoints

- `POST /chat` - Send a message and get response
- `POST /new-chat` - Create a new chat session
- `GET /health` - Health check endpoint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model to use | `llama2` |
| `OPENWEATHER_KEY` | OpenWeather API key | None (weather disabled) |
| `PORT` | Backend port | `3001` |

## Development

### Project Structure
```
travel-agent/
├── backend/
│   ├── index.js              # Main server file
│   ├── services/
│   │   ├── llm.js           # Ollama integration
│   │   └── weather.js       # Weather API
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── api.js           # API client
│   │   └── main.jsx         # React entry point
│   └── package.json
└── README.md
```

### Key Features Implemented

✅ **Conversation-First Design**
- Handles 3+ types of travel queries
- Maintains conversation context
- Natural follow-up question handling

✅ **Enhanced Prompt Engineering**
- Chain-of-thought reasoning for complex queries
- Optimized system prompts
- Concise, relevant responses

✅ **Simple Technical Implementation**
- Clean Express.js backend
- Modern React frontend
- Easy to understand and modify

✅ **Data Augmentation**
- Weather API integration
- External data blending with LLM knowledge
- Smart decision making for data usage

## Troubleshooting

### Common Issues

1. **Ollama not responding**
   - Ensure Ollama is running: `ollama list`
   - Check model is available: `ollama run llama2`

2. **Weather not working**
   - Verify OpenWeather API key is set
   - Check API key has proper permissions

3. **Frontend can't connect to backend**
   - Ensure backend is running on port 3001
   - Check CORS configuration

### Logs

Backend logs show:
- 🚀 Startup information
- 💬 Incoming messages
- 🌤️ Weather API calls
- 🤖 Ollama requests
- ❌ Error messages

## Contributing

This project demonstrates:
- Clean code principles
- Effective prompt engineering
- Simple but powerful architecture
- User-focused design

Feel free to extend the functionality while maintaining the simple, straightforward approach!
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function sendMessage(message, sessionId = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sessionId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      reply: data.reply,
      sessionId: data.sessionId
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to get response from travel assistant');
  }
}

export async function createNewChat() {
  try {
    const response = await fetch(`${API_BASE_URL}/new-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    console.error('Error creating new chat:', error);
    throw new Error('Failed to create new chat session');
  }
}

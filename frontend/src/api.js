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
      const errorData = await response.json().catch(() => ({}));
      
      // Handle cancellation specifically
      if (response.status === 499 || errorData.cancelled) {
        throw new Error('Request was cancelled');
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      reply: data.reply,
      sessionId: data.sessionId,
      messageCount: data.messageCount
    };
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Re-throw cancellation errors as-is
    if (error.message === 'Request was cancelled') {
      throw error;
    }
    
    throw new Error('Failed to get response from AI assistant');
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

export async function getSessionInfo(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting session info:', error);
    throw new Error('Failed to get session information');
  }
}

export async function clearSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error clearing session:', error);
    throw new Error('Failed to clear session');
  }
}

export async function cancelRequest(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/cancel/${sessionId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error cancelling request:', error);
    throw new Error('Failed to cancel request');
  }
}

export async function getRequestStatus(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/status/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting request status:', error);
    throw new Error('Failed to get request status');
  }
}

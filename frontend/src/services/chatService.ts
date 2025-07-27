interface ChatRequest {
  query: string;
  userId?: string;
}

interface ChatResponse {
  response: string;
  query: string;
  rephrased_question?: string;
  guardrail?: string;
}

interface ChatError {
  error: string;
}

export class ChatService {
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

  async sendMessage(query: string, userId?: string): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          userId: userId || '100'
        } as ChatRequest),
      });

      if (!response.ok) {
        const errorData: ChatError = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Chat service error:', error);
      throw error instanceof Error ? error : new Error('Failed to send message');
    }
  }
}

export const chatService = new ChatService();

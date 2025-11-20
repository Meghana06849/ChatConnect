export interface Reaction {
  emoji: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  message_type: string;
  created_at: string;
  read_at?: string | null;
  reactions?: Reaction[];
  metadata?: any;
}

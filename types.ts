import { Part } from '@google/genai';

export enum Sender {
  User = 'user',
  Model = 'model',
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  image?: {
    b64: string;
    mime: string;
  }
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}
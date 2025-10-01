import { Conversation } from '../types';

const CONVERSATIONS_KEY = 'nur-al-hikmah-conversations';

export const saveConversations = (conversations: Conversation[]): void => {
  try {
    const data = JSON.stringify(conversations);
    localStorage.setItem(CONVERSATIONS_KEY, data);
  } catch (error) {
    console.error("Failed to save conversations to localStorage", error);
  }
};

export const loadConversations = (): Conversation[] => {
  try {
    const data = localStorage.getItem(CONVERSATIONS_KEY);
    if (data) {
      return JSON.parse(data) as Conversation[];
    }
  } catch (error) {
    console.error("Failed to load conversations from localStorage", error);
  }
  return [];
};

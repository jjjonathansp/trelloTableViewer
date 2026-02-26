import { TrelloBoard, TrelloCard } from "../types";

const API_KEY = process.env.VITE_TRELLO_API_KEY;

export const trelloService = {
  getAuthUrl: () => {
    const returnUrl = `${window.location.origin}/auth/trello/callback`;
    return `https://trello.com/1/authorize?key=${API_KEY}&name=TrelloTableMaster&expiration=never&response_type=token&scope=read,write&return_url=${returnUrl}`;
  },

  setToken: (token: string) => {
    localStorage.setItem("trello_token", token);
  },

  getToken: () => {
    return localStorage.getItem("trello_token");
  },

  logout: () => {
    localStorage.removeItem("trello_token");
  },

  fetchBoards: async (): Promise<TrelloBoard[]> => {
    const token = trelloService.getToken();
    if (!token) throw new Error("No token");
    const res = await fetch(`https://api.trello.com/1/members/me/boards?key=${API_KEY}&token=${token}`);
    if (!res.ok) throw new Error("Failed to fetch boards");
    return res.json();
  },

  fetchCards: async (boardId: string): Promise<TrelloCard[]> => {
    const token = trelloService.getToken();
    if (!token) throw new Error("No token");
    const res = await fetch(`https://api.trello.com/1/boards/${boardId}/cards?key=${API_KEY}&token=${token}&checklists=all`);
    if (!res.ok) throw new Error("Failed to fetch cards");
    return res.json();
  },

  fetchCard: async (cardId: string): Promise<TrelloCard> => {
    const token = trelloService.getToken();
    if (!token) throw new Error("No token");
    const res = await fetch(`https://api.trello.com/1/cards/${cardId}?key=${API_KEY}&token=${token}&checklists=all`);
    if (!res.ok) throw new Error("Failed to fetch card");
    return res.json();
  },

  // Helper to extract card IDs from a control card
  // It looks for Trello card URLs in checklists or description
  extractLinkedCards: async (controlCard: TrelloCard): Promise<TrelloCard[]> => {
    const cardUrls: string[] = [];
    const trelloUrlRegex = /https:\/\/trello\.com\/c\/([a-zA-Z0-9]+)/g;

    // Check description
    let match;
    while ((match = trelloUrlRegex.exec(controlCard.desc)) !== null) {
      cardUrls.push(match[1]);
    }

    // Check checklists
    controlCard.checklists?.forEach(cl => {
      cl.checkItems.forEach(item => {
        const itemMatch = trelloUrlRegex.exec(item.name);
        if (itemMatch) cardUrls.push(itemMatch[1]);
        // Reset regex state
        trelloUrlRegex.lastIndex = 0;
      });
    });

    const uniqueIds = [...new Set(cardUrls)];
    const cards = await Promise.all(uniqueIds.map(id => trelloService.fetchCard(id).catch(() => null)));
    return cards.filter((c): c is TrelloCard => c !== null);
  }
};

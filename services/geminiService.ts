import { GoogleGenAI } from "@google/genai";
import { Item, LogEntry } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateInventoryInsight = async (items: Item[], logs: LogEntry[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    return "API Key not configured. Please set process.env.API_KEY to use AI insights.";
  }

  // Filter for critical data to reduce token usage
  const lowStockItems = items.filter(i => i.currentStock < 10).map(i => `${i.name} (${i.currentStock} ${i.uom})`);
  const recentLogs = logs.slice(0, 10).map(l => `${l.type}: ${l.quantity} ${l.itemName}`);

  const prompt = `
    Analyze this inventory data and provide a brief, actionable executive summary (max 3 bullet points).
    
    Low Stock Items: ${lowStockItems.join(', ') || 'None'}
    Recent Activity: ${recentLogs.join(', ')}
    Total SKU Count: ${items.length}
    
    Focus on reordering needs and unusual movement patterns. Be professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time.";
  }
};
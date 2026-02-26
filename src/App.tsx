import { useState, useEffect } from "react";
import { trelloService } from "./services/trello";
import { TrelloBoard, TrelloCard, CustomColumn, CustomData } from "./types";
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Layout, 
  LogOut, 
  Database,
  Columns
} from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [token, setToken] = useState<string | null>(trelloService.getToken());
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [controlCardId, setControlCardId] = useState<string>("");
  const [linkedCards, setLinkedCards] = useState<TrelloCard[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customData, setCustomData] = useState<CustomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth message from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "TRELLO_AUTH_SUCCESS") {
        const token = event.data.token;
        trelloService.setToken(token);
        setToken(token);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleConnect = () => {
    const url = trelloService.getAuthUrl();
    window.open(url, "trello_auth", "width=600,height=700");
  };

  // Fetch boards when token is available
  useEffect(() => {
    if (token) {
      const apiKey = process.env.VITE_TRELLO_API_KEY;
      if (!apiKey) {
        setError("Trello API Key is missing. Please add VITE_TRELLO_API_KEY to your Secrets.");
        return;
      }
      trelloService.fetchBoards()
        .then(setBoards)
        .catch(() => setError("Error fetching boards. Check your API key and token."));
    }
  }, [token]);

  // Fetch cards when board is selected
  useEffect(() => {
    if (selectedBoard) {
      trelloService.fetchCards(selectedBoard).then(setCards);
    }
  }, [selectedBoard]);

  // Fetch linked cards and custom data when control card is selected
  useEffect(() => {
    if (controlCardId) {
      loadControlCardData();
    }
  }, [controlCardId]);

  const loadControlCardData = async () => {
    setLoading(true);
    try {
      const controlCard = cards.find(c => c.id === controlCardId);
      if (controlCard) {
        const linked = await trelloService.extractLinkedCards(controlCard);
        setLinkedCards(linked);
      }

      const [colsRes, dataRes] = await Promise.all([
        fetch(`/api/columns/${controlCardId}`),
        fetch(`/api/data/${controlCardId}`)
      ]);
      
      const cols = await colsRes.json();
      const data = await dataRes.json();
      
      setCustomColumns(cols);
      setCustomData(data);
    } catch (err) {
      setError("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async () => {
    const name = prompt("Enter column name:");
    if (!name) return;

    const res = await fetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controlCardId, name })
    });
    const newCol = await res.json();
    setCustomColumns([...customColumns, newCol]);
  };

  const handleDeleteColumn = async (id: number) => {
    if (!confirm("Are you sure? All data in this column will be lost.")) return;
    await fetch(`/api/columns/${id}`, { method: "DELETE" });
    setCustomColumns(customColumns.filter(c => c.id !== id));
    setCustomData(customData.filter(d => d.column_id !== id));
  };

  const handleUpdateData = async (cardId: string, columnId: number, value: string) => {
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, columnId, value })
    });
    
    setCustomData(prev => {
      const existing = prev.find(d => d.card_id === cardId && d.column_id === columnId);
      if (existing) {
        return prev.map(d => d.card_id === cardId && d.column_id === columnId ? { ...d, value } : d);
      }
      return [...prev, { card_id: cardId, column_id: columnId, value }];
    });
  };

  const getCustomValue = (cardId: string, columnId: number) => {
    return customData.find(d => d.card_id === cardId && d.column_id === columnId)?.value || "";
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-black/5 text-center"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Layout className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-[#141414] mb-2 tracking-tight">Trello Table Master</h1>
          <p className="text-gray-500 mb-8">Connect your Trello account to start visualizing your cards in a powerful table view.</p>
          <button 
            onClick={handleConnect}
            className="w-full bg-[#141414] text-white py-4 rounded-xl font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            Connect Trello
          </button>
          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#141414]/10 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Layout className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight italic font-serif">Trello Table Master</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className="bg-[#f5f5f5] border border-black/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
          >
            <option value="">Select Board</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select 
            value={controlCardId}
            onChange={(e) => setControlCardId(e.target.value)}
            disabled={!selectedBoard}
            className="bg-[#f5f5f5] border border-black/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20 disabled:opacity-50"
          >
            <option value="">Select Control Card</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <button 
            onClick={() => { trelloService.logout(); setToken(null); }}
            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-8">
        {!controlCardId ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-black/5">
              <Database className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Control Card Selected</h2>
            <p className="text-gray-500 max-w-md">
              Select a board and a card that contains links to other cards in its description or checklists to generate your table.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-[#141414]/10 overflow-hidden">
            <div className="p-6 border-b border-[#141414]/10 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <Columns className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-lg">Card View: {cards.find(c => c.id === controlCardId)?.name}</h2>
              </div>
              <button 
                onClick={handleAddColumn}
                className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-[11px] font-serif italic uppercase tracking-wider text-gray-500 border-b border-[#141414]/10">
                      Trello Card
                    </th>
                    {customColumns.map(col => (
                      <th key={col.id} className="px-6 py-4 text-left text-[11px] font-serif italic uppercase tracking-wider text-gray-500 border-b border-[#141414]/10 group">
                        <div className="flex items-center justify-between">
                          <span>{col.name}</span>
                          <button 
                            onClick={() => handleDeleteColumn(col.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/5">
                  {loading ? (
                    <tr>
                      <td colSpan={customColumns.length + 1} className="px-6 py-12 text-center text-gray-400">
                        Loading linked cards...
                      </td>
                    </tr>
                  ) : linkedCards.length === 0 ? (
                    <tr>
                      <td colSpan={customColumns.length + 1} className="px-6 py-12 text-center text-gray-400">
                        No linked cards found in this control card.
                      </td>
                    </tr>
                  ) : (
                    linkedCards.map(card => (
                      <tr key={card.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-[#141414]">{card.name}</div>
                              <div className="text-xs text-gray-400 font-mono mt-1">ID: {card.id}</div>
                            </div>
                            <a 
                              href={card.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                        {customColumns.map(col => (
                          <td key={col.id} className="px-6 py-4">
                            <textarea
                              value={getCustomValue(card.id, col.id)}
                              onChange={(e) => handleUpdateData(card.id, col.id, e.target.value)}
                              placeholder="Add note..."
                              className="w-full bg-transparent border-none focus:ring-1 ring-blue-500/20 rounded p-2 text-sm resize-none min-h-[40px] hover:bg-gray-100/50 transition-colors"
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="p-8 text-center text-gray-400 text-xs border-t border-[#141414]/5 mt-12">
        <p>Trello Table Master • Built for efficient card management</p>
      </footer>
    </div>
  );
}

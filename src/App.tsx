import { useState, useEffect } from "react";
import { trelloService } from "./services/trello";
import { TrelloBoard, TrelloCard, CardMetadata } from "./types";
import { 
  ExternalLink, 
  Layout, 
  LogOut, 
  Database,
  Columns
} from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const isPowerUpMode = searchParams.get("mode") === "powerup";
  const debugEnabled = isPowerUpMode && searchParams.get("debug") === "1";
  const [token, setToken] = useState<string | null>(trelloService.getToken());
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [controlCardId, setControlCardId] = useState<string>("");
  const [linkedCards, setLinkedCards] = useState<TrelloCard[]>([]);
  const [cardMetadata, setCardMetadata] = useState<Record<string, CardMetadata>>({});
  const [powerUpReady, setPowerUpReady] = useState(!isPowerUpMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const getStorageKey = (cardId: string) => `trello_table_metadata_${cardId}`;
  const pushDebugLog = (message: string) => {
    if (!debugEnabled) return;
    const entry = `[${new Date().toISOString()}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-19), entry]);
    console.log(`[TTM Iframe] ${message}`);
  };

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
    pushDebugLog(`App started. powerUpMode=${isPowerUpMode}`);
  }, []);

  useEffect(() => {
    if (!isPowerUpMode && token) {
      const apiKey = process.env.VITE_TRELLO_API_KEY;
      if (!apiKey) {
        setError("Trello API Key is missing. Please add VITE_TRELLO_API_KEY to your Secrets.");
        return;
      }
      trelloService.fetchBoards()
        .then(setBoards)
        .catch(() => setError("Error fetching boards. Check your API key and token."));
    }
  }, [token, isPowerUpMode]);

  useEffect(() => {
    if (!isPowerUpMode) return;

    const setupPowerUpContext = async () => {
      try {
        pushDebugLog("Reading Trello Power-Up iframe context...");
        const iframe = window.TrelloPowerUp?.iframe();
        if (!iframe) {
          setError("Power-Up context is not available.");
          pushDebugLog("ERROR: window.TrelloPowerUp.iframe() is not available.");
          return;
        }

        const cardContext = await iframe.card("id", "idBoard");
        setSelectedBoard(cardContext.idBoard);
        setControlCardId(cardContext.id);
        setPowerUpReady(true);
        pushDebugLog(`Power-Up context loaded. board=${cardContext.idBoard}, card=${cardContext.id}`);
      } catch {
        setError("Could not read Trello card context.");
        pushDebugLog("ERROR: Failed to read Trello card context.");
      }
    };

    setupPowerUpContext();
  }, [isPowerUpMode]);

  // Fetch cards when board is selected
  useEffect(() => {
    if (selectedBoard) {
      pushDebugLog(`Fetching board cards for board=${selectedBoard}`);
      trelloService.fetchCards(selectedBoard).then(setCards);
    }
  }, [selectedBoard]);

  // Fetch linked cards and custom data when control card is selected
  useEffect(() => {
    if (controlCardId && token) {
      loadControlCardData();
    }
  }, [controlCardId, token, cards]);

  const loadControlCardData = async () => {
    setLoading(true);
    try {
      pushDebugLog(`Loading control card data for card=${controlCardId}`);
      const cachedControlCard = cards.find(c => c.id === controlCardId);
      const controlCard = cachedControlCard ?? await trelloService.fetchCard(controlCardId);
      const linked = await trelloService.extractLinkedCards(controlCard);
      setLinkedCards(linked);
      pushDebugLog(`Linked cards loaded: ${linked.length}`);

      if (isPowerUpMode && window.TrelloPowerUp?.iframe) {
        const iframe = window.TrelloPowerUp.iframe();
        const metadataMap = (await iframe.get("card", "shared", "linkedCardMetadata", {})) as Record<string, CardMetadata>;
        setCardMetadata(metadataMap ?? {});
        pushDebugLog(`Loaded notes from Trello shared storage. records=${Object.keys(metadataMap ?? {}).length}`);
      } else {
        const raw = localStorage.getItem(getStorageKey(controlCardId));
        setCardMetadata(raw ? JSON.parse(raw) : {});
        pushDebugLog(`Loaded notes from localStorage. hasData=${raw ? "yes" : "no"}`);
      }
    } catch (err) {
      setError("Error loading data");
      pushDebugLog("ERROR: Failed loading control card data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMetadata = async (cardId: string, patch: Partial<Pick<CardMetadata, "note" | "priority">>) => {
    const current = cardMetadata[cardId] ?? {
      control_card_id: controlCardId,
      card_id: cardId,
      note: "",
      priority: null
    };

    const next: CardMetadata = {
      ...current,
      ...patch
    };

    const nextMap = {
      ...cardMetadata,
      [cardId]: next
    };

    if (isPowerUpMode && window.TrelloPowerUp?.iframe) {
      const iframe = window.TrelloPowerUp.iframe();
      await iframe.set("card", "shared", "linkedCardMetadata", nextMap);
      pushDebugLog(`Saved note in Trello shared storage for linked card=${cardId}`);
    } else {
      localStorage.setItem(getStorageKey(controlCardId), JSON.stringify(nextMap));
      pushDebugLog(`Saved note in localStorage for linked card=${cardId}`);
    }

    setCardMetadata(nextMap);
  };

  const getMetadataForCard = (cardId: string): CardMetadata => {
    return cardMetadata[cardId] ?? {
      control_card_id: controlCardId,
      card_id: cardId,
      note: "",
      priority: null
    };
  };

  if (!token) {
    return (
      <div className={`bg-[#E4E3E0] flex items-center justify-center p-6 ${isPowerUpMode ? "min-h-[520px]" : "min-h-screen"}`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-black/5 text-center"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Layout className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-[#141414] mb-2 tracking-tight">Trello Table Master</h1>
          <p className="text-gray-500 mb-8">
            {isPowerUpMode
              ? "Connect your Trello account to render this control card as a table inside Trello."
              : "Connect your Trello account to start visualizing your cards in a powerful table view."}
          </p>
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
    <div className={`bg-[#E4E3E0] text-[#141414] font-sans ${isPowerUpMode ? "min-h-[520px]" : "min-h-screen"}`}>
      {debugEnabled && (
        <div className="mx-8 mt-4 p-3 bg-black text-green-300 rounded-lg text-[11px] font-mono max-h-40 overflow-auto">
          <div className="font-bold mb-1">TTM Debug Trace</div>
          {debugLogs.length === 0 ? <div>Waiting for logs...</div> : debugLogs.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      {/* Header */}
      <header className={`bg-white border-b border-[#141414]/10 px-8 py-4 flex items-center justify-between ${isPowerUpMode ? "" : "sticky top-0 z-10"}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Layout className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight italic font-serif">Trello Table Master</h1>
        </div>

        {!isPowerUpMode && (
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
        )}
      </header>

      <main className="p-8">
        {!powerUpReady ? (
          <div className="h-[40vh] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-black/5">
              <Database className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Loading Trello Context</h2>
            <p className="text-gray-500 max-w-md">
              Preparing the card table inside Trello...
            </p>
          </div>
        ) : !controlCardId ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-black/5">
              <Database className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Control Card Selected</h2>
            <p className="text-gray-500 max-w-md">
              Select a board and a control card that contains links to other cards in its description or checklists to generate your table.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-[#141414]/10 overflow-hidden">
            <div className="p-6 border-b border-[#141414]/10 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <Columns className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-lg">Control Card: {cards.find(c => c.id === controlCardId)?.name}</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-[11px] font-serif italic uppercase tracking-wider text-gray-500 border-b border-[#141414]/10">
                      Trello Card
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-serif italic uppercase tracking-wider text-gray-500 border-b border-[#141414]/10">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/5">
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-12 text-center text-gray-400">
                        Loading linked cards...
                      </td>
                    </tr>
                  ) : linkedCards.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-12 text-center text-gray-400">
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
                        <td className="px-6 py-4">
                          <textarea
                            value={getMetadataForCard(card.id).note}
                            onChange={(e) => handleUpdateMetadata(card.id, { note: e.target.value })}
                            placeholder="Add note..."
                            className="w-full bg-transparent border border-[#141414]/10 focus:ring-1 ring-blue-500/20 rounded p-2 text-sm resize-none min-h-[40px] hover:bg-gray-100/50 transition-colors"
                          />
                        </td>
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
      <footer className={`p-8 text-center text-gray-400 text-xs border-t border-[#141414]/5 ${isPowerUpMode ? "mt-6" : "mt-12"}`}>
        <p>Trello Table Master • Built for efficient card management</p>
      </footer>
    </div>
  );
}

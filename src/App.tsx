import { useState, useEffect } from "react";
import { trelloService } from "./services/trello";
import { TrelloCard, CardMetadata } from "./types";
import { 
  ExternalLink, 
  Layout, 
  Database,
  Columns
} from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const isPowerUpMode = searchParams.get("mode") === "powerup";
  const debugEnabled = isPowerUpMode && searchParams.get("debug") === "1";
  const [token, setToken] = useState<string | null>(trelloService.getToken());
  const [controlCardId, setControlCardId] = useState<string>("");
  const [controlCardName, setControlCardName] = useState<string>("");
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

  useEffect(() => {
    pushDebugLog(`App started. powerUpMode=${isPowerUpMode}`);
  }, []);

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

        const cardContext = await iframe.card("id", "name");
        setControlCardId(cardContext.id);
        setControlCardName((cardContext as { id: string; name?: string }).name ?? "");
        setPowerUpReady(true);
        pushDebugLog(`Power-Up context loaded. card=${cardContext.id}`);
      } catch {
        setError("Could not read Trello card context.");
        pushDebugLog("ERROR: Failed to read Trello card context.");
      }
    };

    setupPowerUpContext();
  }, [isPowerUpMode]);

  useEffect(() => {
    if (isPowerUpMode && controlCardId && token) {
      loadControlCardData();
    }
  }, [controlCardId, token, isPowerUpMode]);

  const loadControlCardData = async () => {
    setLoading(true);
    try {
      pushDebugLog(`Loading control card data for card=${controlCardId}`);
      const controlCard = await trelloService.fetchCard(controlCardId);
      setControlCardName(controlCard.name);
      const linked = await trelloService.extractLinkedCards(controlCard);
      setLinkedCards(linked);
      pushDebugLog(`Linked cards loaded: ${linked.length}`);

      if (isPowerUpMode && window.TrelloPowerUp?.iframe) {
        const iframe = window.TrelloPowerUp.iframe();
        const notesMap = (await iframe.get("card", "shared", "linkedCardNotes", {})) as Record<string, string>;
        const legacyMetadataMap = (await iframe.get("card", "shared", "linkedCardMetadata", {})) as Record<string, CardMetadata>;
        const mergedNotes = {
          ...Object.entries(legacyMetadataMap ?? {}).reduce<Record<string, string>>((acc, [cardId, metadata]) => {
            acc[cardId] = metadata?.note ?? "";
            return acc;
          }, {}),
          ...(notesMap ?? {})
        };
        const normalizedMerged = Object.entries(mergedNotes).reduce<Record<string, CardMetadata>>((acc, [cardId, note]) => {
          acc[cardId] = {
            control_card_id: controlCardId,
            card_id: cardId,
            note: note ?? ""
          };
          return acc;
        }, {});
        setCardMetadata(normalizedMerged);
        pushDebugLog(`Loaded notes from Trello shared storage. records=${Object.keys(normalizedMerged).length}`);
      } else {
        const raw = localStorage.getItem(getStorageKey(controlCardId));
        const parsed = raw ? JSON.parse(raw) as Record<string, string> : {};
        const normalized = Object.entries(parsed).reduce<Record<string, CardMetadata>>((acc, [cardId, note]) => {
          acc[cardId] = {
            control_card_id: controlCardId,
            card_id: cardId,
            note: note ?? ""
          };
          return acc;
        }, {});
        setCardMetadata(normalized);
        pushDebugLog(`Loaded notes from localStorage. hasData=${raw ? "yes" : "no"}`);
      }
    } catch (err) {
      setError("Error loading data");
      pushDebugLog("ERROR: Failed loading control card data.");
    } finally {
      setLoading(false);
    }
  };

  const persistNotes = async (notes: Record<string, string>, updatedCardId: string) => {
    if (isPowerUpMode && window.TrelloPowerUp?.iframe) {
      const iframe = window.TrelloPowerUp.iframe();
      await iframe.set("card", "shared", "linkedCardNotes", notes);
      pushDebugLog(`Saved note in Trello shared storage for linked card=${updatedCardId}`);
    } else {
      localStorage.setItem(getStorageKey(controlCardId), JSON.stringify(notes));
      pushDebugLog(`Saved note in localStorage for linked card=${updatedCardId}`);
    }
  };

  const handleUpdateNote = (cardId: string, note: string) => {
    setCardMetadata(prev => {
      const nextMap = {
        ...prev,
        [cardId]: {
          control_card_id: controlCardId,
          card_id: cardId,
          note
        }
      };

      const notesOnly = (Object.entries(nextMap) as Array<[string, CardMetadata]>).reduce<Record<string, string>>((acc, [linkedCardId, metadata]) => {
        acc[linkedCardId] = metadata.note;
        return acc;
      }, {});

      persistNotes(notesOnly, cardId).catch(() => {
        setError("Error saving note");
        pushDebugLog(`ERROR: Failed saving note for linked card=${cardId}`);
      });

      return nextMap;
    });
  };

  const getMetadataForCard = (cardId: string): CardMetadata => {
    return cardMetadata[cardId] ?? {
      control_card_id: controlCardId,
      card_id: cardId,
      note: ""
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

  if (!isPowerUpMode) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white p-8 rounded-2xl shadow-xl border border-black/5 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Layout className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Power-Up Only</h1>
          <p className="text-gray-500">
            This app is intended to run inside Trello card back sections. Open a Trello card where the Power-Up is installed.
          </p>
        </div>
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
                <h2 className="font-bold text-lg">Control Card: {controlCardName || controlCardId}</h2>
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
                            onChange={(e) => handleUpdateNote(card.id, e.target.value)}
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

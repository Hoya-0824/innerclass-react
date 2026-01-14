import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import LoginGateOverlay from "../components/Auth/LoginGateOverlay";
import ChatbotLogo from "../assets/Logo.svg";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: number;
  title: string;
  template_id: number | null;
  created_at: string;
  updated_at: string;
};

type PromptTemplate = {
  id: number;
  key: string;
  name: string;
  description: string;
  updated_at: string;
};

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchTemplates(): Promise<PromptTemplate[]> {
  const res = await fetch("/api/chatbot/prompts/", {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load prompt templates");
  const data = await res.json();
  return data.templates ?? [];
}

async function sendChat(
  payload: {
    message: string;
    session_id?: number;
    template_id?: number;
    template_key?: string;
  },
  signal?: AbortSignal
): Promise<{ answer: string; session_id: number }> {
  const res = await fetch("/api/chatbot/chat/", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let detail = "Chat request failed";
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {}
    throw new Error(detail);
  }

  const data = await res.json();
  return { answer: data.answer ?? "", session_id: data.session_id };
}

async function fetchSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/chatbot/sessions/?limit=50", {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load chat sessions");
  const data = await res.json();
  return data.sessions ?? [];
}

async function fetchSessionMessages(params: {
  session_id: number;
  page?: number;
  page_size?: number;
}): Promise<{
  session: ChatSession;
  messages: Array<{ id: number; role: "user" | "assistant"; content: string; created_at: string }>;
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}> {
  const { session_id, page = 1, page_size = 50 } = params;
  const res = await fetch(`/api/chatbot/sessions/${session_id}/?page=${page}&page_size=${page_size}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load session messages");
  return await res.json();
}

async function deleteSession(session_id: number): Promise<void> {
  const res = await fetch(`/api/chatbot/sessions/${session_id}/`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete session");
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(d, today)) return "오늘";
  if (isSameDay(d, yday)) return "어제";
  return d.toLocaleDateString();
}

// Message Icon SVG for history items
const MessageIcon = () => (
  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const Chatbot = () => {
  const [templateId, setTemplateId] = useState<number | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChatView, setShowChatView] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const autoSentRef = useRef(false);

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, ChatSession[]>();
    for (const s of sessions) {
      const key = formatDateLabel(s.updated_at || s.created_at);
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [sessions]);

  const refreshSessions = async (selectNewest = false) => {
    const ss = await fetchSessions();
    setSessions(ss);
    if (selectNewest && ss.length > 0) {
      void onSelectSession(ss[0].id);
    }
  };

  const onSelectSession = async (sid: number) => {
    if (!sid || sid === sessionId) return;
    setError(null);
    setSessionId(sid);
    setHasMore(false);
    setNextPage(2);
    setMessages([]);
    setShowChatView(true);
    setMobileMenuOpen(false); // Close mobile menu on selection

    try {
      const r = await fetchSessionMessages({ session_id: sid, page: 1, page_size: 50 });
      const ordered = [...(r.messages ?? [])].reverse();
      setMessages(ordered.map((m) => ({ role: m.role, content: m.content })));
      setHasMore(Boolean(r.has_next));
      setNextPage(2);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load session");
    }
  };

  const onNewChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setError(null);
    setSessionId(null);
    setMessages([]);
    setHasMore(false);
    setNextPage(2);
    setShowChatView(false);
    setMobileMenuOpen(false); // Close mobile menu
    inputRef.current?.focus();
  };

  const onLoadMore = async () => {
    if (!sessionId || !hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetchSessionMessages({ session_id: sessionId, page: nextPage, page_size: 50 });
      const ordered = [...(r.messages ?? [])].reverse();
      setMessages((prev) => [...ordered.map((m) => ({ role: m.role, content: m.content })), ...prev]);
      setHasMore(Boolean(r.has_next));
      setNextPage((p) => p + 1);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const onDeleteSession = async (sid: number) => {
    const ok = window.confirm("이 대화를 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await deleteSession(sid);
      if (sessionId === sid) {
        onNewChat();
      }
      await refreshSessions(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete session");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const ts = await fetchTemplates();
        if (ts.length > 0) setTemplateId(ts[0].id);
      } catch (e: any) {
        console.warn(e?.message ?? e);
      }
    })();

    (async () => {
      try {
        if (!getAccessToken()) return;
        await refreshSessions(false);
      } catch (e: any) {
        console.warn(e?.message ?? e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loadingMore) return;
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loadingMore]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!getAccessToken()) {
      setError("로그인이 필요합니다. 다시 로그인 후 이용해 주세요.");
      return;
    }

    setError(null);
    setLoading(true);
    setShowChatView(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    try {
      const { answer, session_id } = await sendChat(
        {
          message: text,
          ...(sessionId ? { session_id: sessionId } : {}),
          ...(templateId ? { template_id: templateId } : {}),
        },
        controller.signal
      );

      if (!sessionId) {
        setSessionId(session_id);
        await refreshSessions(false);
      } else {
        await refreshSessions(false);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      inputRef.current?.focus();
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message ?? "Chat failed");
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, templateId]);

  // ✅ Home에서 넘어온 draft 자동 전송 로직
  useEffect(() => {
    if (autoSentRef.current) return;

    const draft = sessionStorage.getItem("chatbot_draft")?.trim() ?? "";
    const flag = sessionStorage.getItem("chatbot_autosend");

    if (!draft) return;
    if (flag !== null && flag !== "1") return;

    if (!getAccessToken()) {
      setInput(draft);
      sessionStorage.removeItem("chatbot_draft");
      sessionStorage.removeItem("chatbot_autosend");
      requestAnimationFrame(() => inputRef.current?.focus());
      autoSentRef.current = true;
      return;
    }

    autoSentRef.current = true;

    sessionStorage.removeItem("chatbot_draft");
    sessionStorage.removeItem("chatbot_autosend");

    (async () => {
      if (loading) return;

      setError(null);
      setLoading(true);
      setShowChatView(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setMessages((prev) => [...prev, { role: "user", content: draft }]);

      try {
        const { answer, session_id } = await sendChat(
          {
            message: draft,
            ...(sessionId ? { session_id: sessionId } : {}),
            ...(templateId ? { template_id: templateId } : {}),
          },
          controller.signal
        );

        if (!sessionId) {
          setSessionId(session_id);
          await refreshSessions(false);
        } else {
          await refreshSessions(false);
        }

        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
        requestAnimationFrame(() => inputRef.current?.focus());
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Chat failed");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  };

  const featureCards = [
    {
      icon: (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      ),
      title: "오늘의 뉴스 해석",
      description: "금리·환율·증시 뉴스를\n초보자 눈높이로 정리",
      bgColor: "bg-blue-50/70",
    },
    {
      icon: (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      ),
      title: "투자 판단 도움",
      description: "지금 상황에서\n리스크와 포인트 요약",
      bgColor: "bg-purple-50/70",
    },
    {
      icon: (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      ),
      title: "용어 & 맥락 설명",
      description: "경제 용어, 배경,\n왜 이런 반응이 나오는지",
      bgColor: "bg-amber-50/70",
    },
  ];

  return (
    <div className="">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pb-8 relative min-h-[calc(100vh-120px)]">
        <div className="flex gap-6 relative">
          {/* Mobile Menu Backdrop */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`
            fixed md:relative inset-y-0 left-0 z-50 mt-6 w-[280px] md:w-[260px] bg-gray-50 md:bg-transparent transform transition-transform duration-300 ease-in-out md:translate-x-0 md:transform-none shrink-0
            ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          `}
          >
            <div className="h-full md:h-auto bg-white/80 backdrop-blur-sm md:rounded-2xl md:shadow-sm md:border md:border-white/50 overflow-hidden flex flex-col">
              {/* Mobile Header in Sidebar */}
              <div className="md:hidden p-4 flex justify-between items-center border-b border-gray-100">
                <span className="font-bold text-lg text-gray-800">메뉴</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* New Chat Button */}
              <div className="p-4">
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full cursor-pointer text-white text-sm font-semibold transition-all duration-200 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}
                  onClick={onNewChat}
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  새 채팅
                </button>
              </div>

              {/* History Section */}
              <div className="px-4 pb-2">
                <div className="text-sm font-semibold text-gray-700 mb-3">히스토리</div>
              </div>

              <div className="px-2 pb-4 flex-1 overflow-auto max-h-[calc(100vh-180px)] md:max-h-[500px]">
                {!getAccessToken() ? (
                  <div className="text-xs text-gray-500 px-2 py-3">로그인 후 히스토리를 볼 수 있습니다.</div>
                ) : sessions.length === 0 ? (
                  <div className="text-xs text-gray-500 px-2 py-3">대화 내역이 없습니다.</div>
                ) : (
                  <div className="space-y-3">
                    {groupedSessions.map(([label, items]) => (
                      <div key={label}>
                        <div className="px-2 mb-2 text-xs font-medium text-gray-500">{label}</div>

                        <div className="space-y-1">
                          {items.map((s) => {
                            const active = s.id === sessionId;
                            return (
                              <div
                                key={s.id}
                                className={[
                                  "group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors",
                                  active ? "bg-gray-100" : "hover:bg-gray-50",
                                ].join(" ")}
                                onClick={() => void onSelectSession(s.id)}
                                role="button"
                                tabIndex={0}
                              >
                                <MessageIcon />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-800 truncate">
                                    {s.title?.trim() ? s.title : `대화 ${s.id}`}
                                  </div>
                                </div>

                                <button
                                  className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void onDeleteSession(s.id);
                                  }}
                                  type="button"
                                  title="대화 삭제"
                                >
                                  삭제
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 pt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden flex-1 flex flex-col min-h-[600px] relative">

              {/* Mobile Menu Button - Increased top spacing to avoid Navbar overlap */}
              <div className="md:hidden absolute top-4 left-4 z-10">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {!showChatView && messages.length === 0 ? (
                /* Welcome View */
                <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-12 pt-20 md:pt-12">
                  {/* Logo */}
                  <div className="flex justify-center items-center gap-3 mb-4">
                    <img src={ChatbotLogo} alt="DecodeX Logo" width={48} height={48} className="object-contain" />
                    <span className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">DecodeX</span>
                  </div>

                  {/* Subtitle */}
                  <div className="text-center mb-8 md:mb-12">
                    <p className="text-lg font-semibold text-gray-900">초보 투자자를 위한 뉴스 해석 AI</p>
                    <p className="text-gray-600">복잡한 경제 뉴스를 한눈에 이해하세요</p>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid grid-cols-2 md:flex gap-3 md:gap-4 mb-10 md:mb-16 w-full md:w-auto justify-center">
                    {featureCards.map((card, idx) => (
                      <div
                        key={idx}
                        className={`${card.bgColor} rounded-2xl p-4 md:p-5 w-full md:w-[180px] transition-transform hover:scale-105 cursor-pointer border border-white/50 flex flex-col items-center text-center`}
                      >
                        <div className="mb-2 md:mb-3">{card.icon}</div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">{card.title}</div>
                        <div className="text-xs text-gray-600 whitespace-pre-line leading-tight">{card.description}</div>
                      </div>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="w-full max-w-2xl">
                    <div className="flex items-center bg-white rounded-full border border-gray-200 shadow-sm px-5 py-3 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                      <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-sm bg-transparent"
                        placeholder='"금리 인하 뉴스, 주식엔 어떤 영향이야?"'
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={loading}
                      />
                      <button
                        onClick={() => void onSend()}
                        disabled={loading || input.trim().length === 0}
                        className="ml-3 p-2 rounded-full hover:bg-gray-100 disabled:opacity-40 transition-colors"
                        type="button"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </button>
                    </div>

                    {error && (
                      <div className="mt-3 text-center text-sm text-red-600 bg-red-50 py-2 px-4 rounded-lg">{error}</div>
                    )}
                  </div>
                </div>
              ) : (
                /* Chat View */
                <>
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-auto px-4 md:px-6 py-5 space-y-4 pt-20 md:pt-5">
                    {hasMore && (
                      <div className="flex justify-center">
                        <button
                          className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                          onClick={() => void onLoadMore()}
                          disabled={loading || loadingMore}
                          type="button"
                        >
                          {loadingMore ? "불러오는 중…" : "이전 대화 더 보기"}
                        </button>
                      </div>
                    )}

                    {messages.map((m, idx) => {
                      const isUser = m.role === "user";
                      return (
                        <div key={idx} className={isUser ? "flex justify-end" : "flex justify-start"}>
                          <div
                            className={[
                              "max-w-[75%] px-4 py-3 text-sm whitespace-pre-wrap",
                              isUser
                                ? "rounded-2xl rounded-tr-md bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                : "rounded-2xl rounded-tl-md bg-gray-100 text-gray-900",
                            ].join(" ")}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })}

                    {loading && (
                      <div className="flex justify-start">
                        <div className="max-w-[75%] rounded-2xl rounded-tl-md bg-gray-100 text-gray-900 px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="flex justify-center">
                        <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-wrap">
                          {error}
                        </div>
                      </div>
                    )}

                    <div ref={scrollRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <div className="border-t border-gray-100 bg-white/50 px-6 py-4">
                    <div className="flex items-center bg-white rounded-full border border-gray-200 shadow-sm px-5 py-3 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                      <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-sm bg-transparent"
                        placeholder="메시지를 입력하세요..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={loading}
                      />
                      <button
                        onClick={() => void onSend()}
                        disabled={loading || input.trim().length === 0}
                        className="ml-3 p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90 disabled:opacity-40 transition-all"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {/* Login Gate Overlay for unauthenticated users */}
        {!getAccessToken() && <LoginGateOverlay message={"로그인하고\n나만의 AI 상담을 받아보세요!"} />}
      </div>
    </div>
  );
};

export default Chatbot;

import { useEffect, useMemo, useRef, useState } from "react";

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

type OnboardingProfile = {
  assetType: string;
  sectors: string[];
  riskProfile: string; // "A" | "B" | "C"
  knowledgeLevel: number; // 1~5
};

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function knowledgeLabel(level?: number) {
  if (!level) return "미지정";
  if (level <= 1) return "주린이";
  if (level === 2) return "초보자";
  if (level === 3) return "중급자";
  if (level === 4) return "숙련자";
  return "전문가";
}

async function fetchTemplates(): Promise<PromptTemplate[]> {
  const res = await fetch("/api/chatbot/prompts/", {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load prompt templates");
  const data = await res.json();
  return data.templates ?? [];
}

async function fetchOnboarding(): Promise<OnboardingProfile | null> {
  const res = await fetch("/api/user/onboarding/", {
    headers: { ...authHeaders() },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data ?? null;
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
  const res = await fetch(
    `/api/chatbot/sessions/${session_id}/?page=${page}&page_size=${page_size}`,
    { headers: { ...authHeaders() } }
  );
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

const SummaryBar = ({
  profile,
  loading,
}: {
  profile: OnboardingProfile | null;
  loading: boolean;
}) => {
  const sectors = profile?.sectors ?? [];

  const chip = (cls: string) =>
    `inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium ${cls}`;

  const riskTone = (() => {
    const code = profile?.riskProfile;
    if (code === "A") return "bg-red-500/10 text-red-700 border border-red-500/20";
    if (code === "B") return "bg-sky-500/10 text-sky-700 border border-sky-500/20";
    if (code === "C") return "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20";
    return "bg-zinc-500/10 text-zinc-700 border border-zinc-500/20";
  })();

  const riskLabel = (() => {
    const code = profile?.riskProfile;
    if (code === "A") return "공격형";
    if (code === "B") return "중립형";
    if (code === "C") return "안정형";
    return "미지정";
  })();

  return (
    <div className="px-4 md:px-6 py-3 bg-white/70 backdrop-blur border-b border-zinc-200">
      {loading ? (
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-24 rounded-full bg-zinc-200/70 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-zinc-200/70 animate-pulse" />
          <div className="h-6 w-28 rounded-full bg-zinc-200/70 animate-pulse" />
        </div>
      ) : !profile ? (
        <div className="text-sm text-zinc-700">온보딩 정보가 없습니다.</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className={chip("bg-violet-500/10 text-violet-700 border border-violet-500/20")}>
            {profile.assetType || "미지정"}
          </span>
          <span className={chip(riskTone)}>{riskLabel}</span>
          <span className={chip("bg-zinc-500/10 text-zinc-700 border border-zinc-500/20")}>
            Lv.{profile.knowledgeLevel} {knowledgeLabel(profile.knowledgeLevel)}
          </span>
          {sectors.length > 0 ? (
            sectors.map((s) => (
              <span
                key={s}
                className={chip("bg-zinc-500/10 text-zinc-700 border border-zinc-500/20")}
              >
                {s}
              </span>
            ))
          ) : (
            <span className={chip("bg-zinc-500/10 text-zinc-700 border border-zinc-500/20")}>
              관심 섹터 없음
            </span>
          )}
        </div>
      )}
    </div>
  );
};

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, today)) return "오늘";
  if (isSameDay(d, yday)) return "어제";
  return d.toLocaleDateString();
}

const Chatbot = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);

  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, ChatSession[]>();
    for (const s of sessions) {
      const key = formatDateLabel(s.updated_at || s.created_at);
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    // keep insertion order by iterating sessions already sorted from API (assumed recent-first)
    return Array.from(groups.entries());
  }, [sessions]);

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const p = await fetchOnboarding();
      setProfile(p);
    } finally {
      setProfileLoading(false);
    }
  };

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

    try {
      const r = await fetchSessionMessages({ session_id: sid, page: 1, page_size: 50 });
      const ordered = [...(r.messages ?? [])].reverse(); // UI: oldest-first
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
    textareaRef.current?.focus();
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
    const ok = window.confirm("이 대화를 삭제하시겠습니까? (최근 3일 내 로그만 보관됩니다)");
    if (!ok) return;

    try {
      await deleteSession(sid);
      // 삭제한 세션이 현재 열려있는 세션이면 새 대화 상태로
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
        setTemplates(ts);
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

    void loadProfile();
  }, []);

  useEffect(() => {
    if (loadingMore) return;
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loadingMore]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!getAccessToken()) {
      setError("로그인이 필요합니다. 다시 로그인 후 이용해 주세요.");
      return;
    }

    setError(null);
    setLoading(true);

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

      // 첫 메시지로 서버가 세션 생성한 경우 → 사이드바 새로고침 + 해당 세션 선택
      if (!sessionId) {
        setSessionId(session_id);
        await refreshSessions(false);
      } else {
        // 세션 updated_at이 바뀌므로 목록 갱신(상단으로 올라오게)
        await refreshSessions(false);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      textareaRef.current?.focus();
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message ?? "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(160, Math.max(52, el.scrollHeight));
    el.style.height = `${next}px`;
  }, [input]);

  return (
    <div className="min-h-[calc(100vh-48px)] bg-zinc-50">
      <div className="max-w-[1180px] mx-auto px-3 md:px-6 py-6 md:py-10">
        <div className="rounded-[22px] border border-zinc-200 bg-white shadow-[0_6px_30px_rgba(16,24,40,0.08)] overflow-hidden">
          <div className="flex h-[760px]">
            {/* Sidebar */}
            <aside className="w-[280px] shrink-0 border-r border-zinc-200 bg-white">
              <div className="h-14 px-3 flex items-center justify-between border-b border-zinc-200">
                <div className="text-sm font-semibold text-zinc-900">히스토리</div>
                <button
                  className="text-xs px-2.5 py-2 rounded-xl bg-zinc-900 text-white hover:opacity-95"
                  onClick={onNewChat}
                  type="button"
                >
                  새 채팅
                </button>
              </div>

              <div className="p-2 overflow-auto h-[calc(760px-56px)]">
                {!getAccessToken() ? (
                  <div className="text-xs text-zinc-500 px-2 py-3">
                    로그인 후 히스토리를 볼 수 있습니다.
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-xs text-zinc-500 px-2 py-3">대화 내역이 없습니다.</div>
                ) : (
                  <div className="space-y-4">
                    {groupedSessions.map(([label, items]) => (
                      <div key={label}>
                        <div className="px-2 mb-2 text-[11px] font-medium text-zinc-500">
                          {label}
                        </div>

                        <div className="space-y-1">
                          {items.map((s) => {
                            const active = s.id === sessionId;
                            return (
                              <div
                                key={s.id}
                                className={[
                                  "group flex items-center gap-2 rounded-xl px-2 py-2 cursor-pointer",
                                  active ? "bg-zinc-100" : "hover:bg-zinc-50",
                                ].join(" ")}
                                onClick={() => void onSelectSession(s.id)}
                                role="button"
                                tabIndex={0}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] text-zinc-900 truncate">
                                    {s.title?.trim() ? s.title : `대화 ${s.id}`}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 truncate">
                                    {new Date(s.updated_at || s.created_at).toLocaleString()}
                                  </div>
                                </div>

                                <button
                                  className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
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
            </aside>

            {/* Main */}
            <section className="flex-1 flex flex-col">
              {/* Top bar */}
              <div className="h-14 px-4 flex items-center justify-between bg-white border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                    <span className="text-[12px] font-semibold">GPT</span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-zinc-900">주식봇</div>
                    <div className="text-[11px] text-zinc-500">
                      {loading ? "응답 생성 중" : "Online"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {templates.length > 0 && (
                    <select
                      className="text-xs px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 outline-none border border-zinc-200"
                      value={templateId ?? ""}
                      onChange={(e) => setTemplateId(Number(e.target.value))}
                      disabled={loading}
                      title="프롬프트 템플릿"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <SummaryBar profile={profile} loading={profileLoading} />

              {/* Chat area */}
              <div className="flex-1 bg-white overflow-hidden">
                <div className="h-full overflow-auto px-4 md:px-6 py-5 space-y-4">
                  {hasMore && (
                    <div className="flex justify-center">
                      <button
                        className="text-xs px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 disabled:opacity-50"
                        onClick={() => void onLoadMore()}
                        disabled={loading || loadingMore}
                        type="button"
                      >
                        {loadingMore ? "불러오는 중…" : "이전 대화 더 보기"}
                      </button>
                    </div>
                  )}

                  {messages.length === 0 && !loading && (
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-2xl bg-zinc-50 text-zinc-900 px-4 py-3 text-sm border border-zinc-200">
                        관심 있는 종목이나 시장 상황을 물어보세요.
                        <div className="mt-1 text-xs text-zinc-500">
                          예) “오늘 삼성전자 이슈 뭐야?” / “미장 반도체 섹터 흐름 요약”
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((m, idx) => {
                    const isUser = m.role === "user";
                    return (
                      <div key={idx} className={isUser ? "flex justify-end" : "flex justify-start"}>
                        <div
                          className={[
                            "max-w-[82%] px-4 py-3 text-sm whitespace-pre-wrap",
                            isUser
                              ? "rounded-2xl rounded-tr-md bg-zinc-900 text-white"
                              : "rounded-2xl rounded-tl-md bg-white text-zinc-900 border border-zinc-200",
                          ].join(" ")}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-white text-zinc-900 border border-zinc-200 px-4 py-3 text-sm">
                        답변 생성 중…
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
              </div>

              {/* Input bar */}
              <div className="border-t border-zinc-200 bg-white px-4 md:px-6 py-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-zinc-200">
                    <textarea
                      ref={textareaRef}
                      className="w-full resize-none text-sm leading-5 outline-none bg-transparent"
                      placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      disabled={loading}
                      style={{ height: 52 }}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-[11px] text-zinc-400">Shift+Enter 줄바꿈</div>
                      <div className="text-[11px] text-zinc-400">{input.trim().length}/2000</div>
                    </div>
                  </div>

                  <button
                    className="h-[52px] px-4 rounded-2xl bg-zinc-900 text-white text-sm disabled:opacity-50 hover:opacity-95"
                    onClick={() => void onSend()}
                    disabled={loading || input.trim().length === 0}
                    type="button"
                  >
                    전송
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-zinc-500 text-center">
          본 서비스는 투자자문이 아닌 정보 제공 목적입니다. 최종 투자 판단은 본인 책임입니다.
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
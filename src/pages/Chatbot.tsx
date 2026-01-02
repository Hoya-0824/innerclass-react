import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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
    history: ChatMessage[];
    template_id?: number;
    template_key?: string;
  },
  signal?: AbortSignal
): Promise<{ answer: string }> {
  const res = await fetch("/api/chatbot/chat/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let detail = "Chat request failed";
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {}
    if (res.status === 401 || res.status === 403) {
      detail = detail || "Authentication required";
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return { answer: data.answer ?? "" };
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
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cls}`;

  const riskChipClass = (() => {
    const code = profile?.riskProfile;
    if (code === "A") return chip("bg-rose-500/20 text-rose-900");
    if (code === "B") return chip("bg-sky-500/20 text-sky-900");
    if (code === "C") return chip("bg-emerald-500/20 text-emerald-900");
    return chip("bg-gray-500/20 text-gray-900");
  })();

  const riskLabel = (() => {
    const code = profile?.riskProfile;
    if (code === "A") return "공격형";
    if (code === "B") return "중립형";
    if (code === "C") return "안정형";
    return "미지정";
  })();

  const sectorClass = (s: string) => {
    const map: Record<string, string> = {
      반도체: "bg-indigo-500/20 text-indigo-900",
      AI: "bg-fuchsia-500/20 text-fuchsia-900",
      "2차전지": "bg-amber-500/20 text-amber-900",
      바이오: "bg-teal-500/20 text-teal-900",
      자동차: "bg-orange-500/20 text-orange-900",
      "인터넷/플랫폼": "bg-cyan-500/20 text-cyan-900",
      금융: "bg-blue-500/20 text-blue-900",
      에너지: "bg-lime-500/20 text-lime-900",
    };
    return chip(map[s] ?? "bg-gray-500/20 text-gray-900");
  };

  return (
    // 채팅영역과 동일 배경으로 통일 (카드/보더/섀도 없음)
    <div className="px-4 md:px-8 py-3 bg-[#B2C7DA]">
      {loading ? (
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-24 rounded-full bg-white/40 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-white/40 animate-pulse" />
          <div className="h-6 w-28 rounded-full bg-white/40 animate-pulse" />
          <div className="h-6 w-40 rounded-full bg-white/40 animate-pulse" />
        </div>
      ) : !profile ? (
        <div className="text-sm text-gray-800">온보딩 정보가 없습니다.</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {/* 자산 */}
          <span className={chip("bg-violet-500/20 text-violet-900")}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-700/70" />
            {profile.assetType || "미지정"}
          </span>

          {/* 성향 */}
          <span className={riskChipClass}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {riskLabel}
          </span>

          {/* 지식 */}
          <span className={chip("bg-gray-900/15 text-gray-900")}>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-900/60" />
            Lv.{profile.knowledgeLevel} {knowledgeLabel(profile.knowledgeLevel)}
          </span>

          {/* 섹터 */}
          {sectors.length > 0 ? (
            sectors.map((s) => (
              <span key={s} className={sectorClass(s)}>
                {s}
              </span>
            ))
          ) : (
            <span className={chip("bg-gray-500/15 text-gray-900")}>
              관심 섹터 없음
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const Chatbot = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);

  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const p = await fetchOnboarding();
      setProfile(p);
    } finally {
      setProfileLoading(false);
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

    void loadProfile();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    setInput("");
    setLoading(false);
  };

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

    const historyToSend = [...messages].slice(-20);

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    try {
      const { answer } = await sendChat(
        {
          message: text,
          history: historyToSend,
          ...(templateId ? { template_id: templateId } : {}),
        },
        controller.signal
      );

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
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

  return (
    <div className="max-w-[980px] mx-auto px-4 md:px-8 mt-6 md:mt-10">
      <div className="rounded-[28px] border bg-white shadow-sm overflow-hidden">
        {/* header */}
        <div className="h-14 px-4 flex items-center justify-between bg-[#111827] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-sm font-semibold">AI</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">주식봇</div>
              <div className="text-[11px] text-white/70">
                {loading ? "응답 생성 중" : "온라인"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <select
                className="text-xs px-2 py-2 rounded-lg bg-white/10 hover:bg-white/15 outline-none"
                value={templateId ?? ""}
                onChange={(e) => setTemplateId(Number(e.target.value))}
                disabled={loading}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <button
              className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15"
              onClick={reset}
              type="button"
            >
              대화 초기화
            </button>
          </div>
        </div>

        {/* profile summary bar (same bg as chat area) */}
        <SummaryBar profile={profile} loading={profileLoading} />

        {/* chat area */}
        <div className="bg-[#B2C7DA]">
          <div className="h-[560px] overflow-auto px-3 py-3 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="flex justify-start">
                <div className="max-w-[78%] rounded-2xl bg-white text-gray-900 px-4 py-3 text-sm shadow-sm">
                  관심 있는 종목이나 시장 상황을 물어보세요.
                  <div className="mt-1 text-xs text-gray-500">
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
                      "max-w-[78%] px-4 py-3 text-sm whitespace-pre-wrap shadow-sm",
                      isUser
                        ? "rounded-2xl rounded-tr-md bg-[#FEE500] text-gray-900"
                        : "rounded-2xl rounded-tl-md bg-white text-gray-900",
                    ].join(" ")}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-white text-gray-900 px-4 py-3 text-sm shadow-sm">
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

          {/* input bar */}
          <div className="border-t bg-white px-3 py-3">
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 border rounded-2xl p-3 text-sm resize-none h-[52px] leading-5 focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
              />
              <button
                className="px-4 h-[52px] rounded-2xl bg-gray-900 text-white text-sm disabled:opacity-50"
                onClick={() => void onSend()}
                disabled={loading || input.trim().length === 0}
                type="button"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

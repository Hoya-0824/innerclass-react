import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import TermsModal from "../components/Footer/TermsModal";

import type { UserData } from "../types/user";

type Step = 1 | 2 | 3 | 4 | 5;

// --- Step Components (Extracted to prevent re-renders) ---

interface StepProps {
  userData: UserData;
  updateData: (key: keyof UserData, value: any) => void;
}

const Step1AssetType = ({ userData, updateData }: StepProps) => {
  const options = ["국내주식", "미국주식", "가상화폐", "ETF/원자재"];

  const toggleAsset = (asset: string) => {
    const current = Array.isArray(userData.assetType) ? userData.assetType : [];
    if (current.includes(asset)) {
      updateData(
        "assetType",
        current.filter((a) => a !== asset)
      );
    } else {
      updateData("assetType", [...current, asset]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => toggleAsset(opt)}
          className={`p-4 sm:p-6 rounded-xl border-2 transition-all cursor-pointer duration-200 text-sm sm:text-lg font-medium ${(userData.assetType ?? []).includes(opt)
            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md"
            : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700"
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

const Step2Sector = ({ userData, updateData }: StepProps) => {
  const options = ["반도체/AI", "배터리", "IT/인터넷", "바이오/건강", "자동차", "친환경/석유에너지", "금융/지주"];

  const current = Array.isArray(userData.sectors) ? userData.sectors : [];
  const selectedCount = current.length;

  const toggleSector = (sector: string) => {
    const now = Array.isArray(userData.sectors) ? userData.sectors : [];
    if (now.includes(sector)) {
      updateData(
        "sectors",
        now.filter((s) => s !== sector)
      );
      return;
    }
    if (now.length >= 3) return; // ✅ 최대 3개 제한
    updateData("sectors", [...now, sector]);
  };

  return (
    <div>
      <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-500">
        최대 3개까지 선택 가능합니다. <span className="text-gray-400">({selectedCount}/3)</span>
      </p>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {options.map((opt) => {
          const selected = current.includes(opt);
          const disabled = !selected && selectedCount >= 3; // ✅ 3개 찼으면 비선택 항목 비활성
          return (
            <button
              key={opt}
              onClick={() => toggleSector(opt)}
              disabled={disabled}
              className={[
                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border transition-all duration-200 text-sm sm:text-base",
                selected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400",
                disabled ? "opacity-40 cursor-not-allowed hover:border-gray-300" : "cursor-pointer",
              ].join(" ")}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface Step3Props extends StepProps {
  portfolioInput: string;
  setPortfolioInput: (val: string) => void;
}

type SuggestItem = {
  symbol: string;
  name: string;
  market?: string | null;
};

const Step3Portfolio = ({ userData, updateData, portfolioInput, setPortfolioInput }: Step3Props) => {
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const [loading, setLoading] = useState(false);

  // ✅ 등록 시 ticker(심볼) 제거: "삼성전자 (005930)" -> "삼성전자"
  const normalizeRegisterName = (text: string) => {
    const t = (text ?? "").trim();
    if (!t) return "";
    // 끝에 붙은 "(...)" 패턴 제거
    return t.replace(/\s*\([^)]*\)\s*$/, "").trim();
  };

  const addStock = (value?: string) => {
    const raw = (value ?? portfolioInput).trim();
    if (!raw) return;

    const nameOnly = normalizeRegisterName(raw);
    if (!nameOnly) return;

    const cur = Array.isArray(userData.portfolio) ? userData.portfolio : [];
    if (!cur.includes(nameOnly)) {
      updateData("portfolio", [...cur, nameOnly]);
    }

    setPortfolioInput("");
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
  };

  const removeStock = (stock: string) => {
    const cur = Array.isArray(userData.portfolio) ? userData.portfolio : [];
    updateData(
      "portfolio",
      cur.filter((s) => s !== stock)
    );
  };

  // ✅ Step1 자산 선택과 무관하게 항상 전시장 자동완성
  //    - 서버가 market 파라미터 없이 ALL로 처리한다면 market 생략 가능
  //    - 지금은 명시적으로 market=ALL을 보냄 (KOSPI/KOSDAQ/NASDAQ 전부 포함 의도)
  const marketParam = "ALL" as const;

  // 검색 API 호출 (debounce)
  useEffect(() => {
    const q = portfolioInput.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      setHighlight(-1);
      return;
    }

    let canceled = false;
    const t = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/markets/symbols/suggest/`, {
          params: { q, limit: 10, market: marketParam },
        });

        if (canceled) return;
        const results: SuggestItem[] = res.data?.results ?? [];
        setSuggestions(results);
        setOpen(results.length > 0);
        setHighlight(-1);
      } catch {
        if (canceled) return;
        setSuggestions([]);
        setOpen(false);
        setHighlight(-1);
      } finally {
        if (!canceled) setLoading(false);
      }
    }, 250);

    return () => {
      canceled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.nativeEvent as any).isComposing) return;

    if (e.key === "ArrowDown") {
      if (!open && suggestions.length > 0) setOpen(true);
      e.preventDefault();
      setHighlight((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
      return;
    }

    if (e.key === "Enter") {
      // ✅ 자동완성 선택 중이면 "name"만 등록 (ticker 제거)
      if (open && highlight >= 0 && highlight < suggestions.length) {
        const item = suggestions[highlight];
        addStock(item.name);
      } else {
        // ✅ 사용자가 티커로 입력했을 때도 등록 값에서 "(...)" 제거만 적용
        // (예: "Apple (AAPL)" 입력했으면 "Apple"로 저장)
        addStock();
      }
    }
  };

  // ✅ 클릭 선택도 "name"만 등록
  const onPick = (item: SuggestItem) => addStock(item.name);

  const portfolio = Array.isArray(userData.portfolio) ? userData.portfolio : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={portfolioInput}
            onChange={(e) => setPortfolioInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="종목명 또는 티커 입력"
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 120);
            }}
          />

          <button
            onClick={() => addStock()}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-900 text-white cursor-pointer rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm sm:text-base"
          >
            기록
          </button>
        </div>

        {open && (
          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="px-3 sm:px-4 py-2 text-xs text-gray-500 bg-gray-50 flex items-center justify-between">
              <span>자동완성</span>
              {loading && <span>검색중…</span>}
            </div>
            <ul className="max-h-48 sm:max-h-64 overflow-auto">
              {suggestions.map((it, idx) => {
                const active = idx === highlight;
                return (
                  <li
                    key={`${it.symbol}-${idx}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(it)}
                    className={`px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer flex items-center justify-between ${active ? "bg-indigo-50" : "bg-white"
                      } hover:bg-indigo-50`}
                  >
                    <div className="min-w-0">

                      {/* ✅ 리스트에서는 티커를 보여주되, 등록은 name만 */}
                      <div className="font-semibold text-gray-900 truncate">{it.name}</div>
                      <div className="text-xs text-gray-500">
                        {it.symbol}
                        {it.market ? ` • ${it.market}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">선택</div>
                  </li>
                );
              })}
              {suggestions.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">검색 결과가 없습니다.</li>}
            </ul>
          </div>
        )}
      </div>

      {portfolio.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 min-h-[80px] sm:min-h-[100px]">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-500 mb-2 sm:mb-3">등록된 종목</h4>
          <div className="flex flex-wrap gap-2">
            {portfolio.map((stock) => (
              <span
                key={stock}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-xs sm:text-sm text-gray-800"
              >
                {stock}
                <button onClick={() => removeStock(stock)} className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Step4RiskProfile = ({ userData, updateData }: StepProps) => {
  const profiles = [
    { id: "A", title: "공격형", desc: "손실 위험이 있어도 고수익을 노립니다.", sub: "(성장주 위주)", emoji: "🔥" },
    { id: "B", title: "중립형", desc: "시장 수익률 정도면 만족합니다.", sub: "(ETF/우량주)", emoji: "⚖️" },
    { id: "C", title: "안정형", desc: "원금 보존과 배당이 중요합니다.", sub: "(채권/배당주)", emoji: "🛡️" },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {profiles.map((p) => (
        <div
          key={p.id}
          onClick={() => updateData("riskProfile", p.id)}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${userData.riskProfile === p.id ? "border-indigo-600 bg-indigo-50 shadow-md" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
            }`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl">{p.emoji}</span>
            <div>
              <h4 className={`text-base sm:text-lg font-bold ${userData.riskProfile === p.id ? "text-indigo-800" : "text-gray-900"}`}>{p.title}</h4>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{p.desc}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.sub}</p>
            </div>
          </div>
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${userData.riskProfile === p.id ? "border-indigo-600" : "border-gray-300"
              }`}
          >
            {userData.riskProfile === p.id && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-600 rounded-full" />}
          </div>
        </div>
      ))}
    </div>
  );
};

const Step5KnowledgeLevel = ({ userData, updateData }: StepProps) => {
  const levels = [
    { level: 1, title: "입문자", desc: '"금리가 올라서 주식 시장이 전체적으로 힘들어요. 당분간 조심하세요!"', medal: "🥉" },
    { level: 2, title: "초보자", desc: '"금리 인상으로 인해 시장 유동성이 줄어들고 있어요. 보수적인 접근이 필요합니다."', medal: "🥈" },
    { level: 3, title: "중급자", desc: '"기준금리 인상이 지속되면서 기술주 중심의 하락이 예상됩니다."', medal: "🥇" },
    { level: 4, title: "숙련자", desc: '"긴축 통화 정책으로 인한 밸류에이션 조정이 진행 중입니다."', medal: "💠" },
    { level: 5, title: "전문가", desc: '"FOMC의 매파적 기조로 국채 금리가 급등하며 밸류에이션 부담이 가중되었습니다."', medal: "💎" },
  ];

  return (
    <div className="space-y-2 sm:space-y-3">
      {levels.map((l) => (
        <div
          key={l.level}
          onClick={() => updateData("knowledgeLevel", l.level)}
          className={`cursor-pointer p-3 sm:p-4 rounded-xl border transition-all duration-200 ${userData.knowledgeLevel === l.level ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
            }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
            <span className="text-lg sm:text-xl">{l.medal}</span>
            <span
              className={`px-2 py-0.5 sm:py-1 rounded-md text-xs font-bold ${userData.knowledgeLevel === l.level ? "bg-indigo-200 text-indigo-800" : "bg-gray-200 text-gray-700"
                }`}
            >
              Lv.{l.level}
            </span>
            <span className="font-bold text-gray-900 text-sm sm:text-base">{l.title}</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 italic leading-relaxed">{l.desc}</p>
        </div>
      ))}
    </div>
  );
};

const Onboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = location.state?.isEditing;

  // 약관 동의 모달 상태 (수정 모드가 아닐 때만 true로 시작)
  const [showTerms, setShowTerms] = useState(!isEditing);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [userData, setUserData] = useState<UserData>({
    assetType: [],
    sectors: [],
    portfolio: [],
    riskProfile: "",
    knowledgeLevel: 0,
  });

  const [portfolioInput, setPortfolioInput] = useState("");

  // ✅ 서버 응답 정규화(배열 보장)
  const normalizeUserData = (raw: any): UserData => {
    const toArray = (v: any): string[] => {
      if (Array.isArray(v)) return v.filter(Boolean).map(String);
      if (typeof v === "string") {
        const s = v.trim();
        if (!s) return [];
        if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
        return [s];
      }
      return [];
    };

    return {
      assetType: toArray(raw?.assetType),
      sectors: toArray(raw?.sectors),
      portfolio: toArray(raw?.portfolio),
      riskProfile: String(raw?.riskProfile ?? ""),
      knowledgeLevel: Number(raw?.knowledgeLevel ?? 0),
    };
  };

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) return;

        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/onboarding/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const normalized = normalizeUserData(response.data);

        if (isEditing) {
          setUserData(normalized);
        } else {
          if (normalized.assetType.length > 0) {
            navigate("/");
          }
        }
      } catch {
        // ignore
      }
    };

    checkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, isEditing]);

  const submitData = async () => {
    try {
      const accessToken = localStorage.getItem("access_token");

      const payload: UserData = {
        ...userData,
        assetType: Array.isArray(userData.assetType) ? userData.assetType : [],
        sectors: Array.isArray(userData.sectors) ? userData.sectors : [],
        portfolio: Array.isArray(userData.portfolio) ? userData.portfolio : [],
        riskProfile: userData.riskProfile ?? "",
        knowledgeLevel: Number(userData.knowledgeLevel ?? 0),
      };

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/user/onboarding/`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      console.error("온보딩 데이터 전송 실패: ", error);
    }
  };

  const handleNext = async () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      await submitData();
      navigate(isEditing ? "/mypage" : "/");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const updateData = (key: keyof UserData, value: any) => {
    setUserData((prev) => ({ ...prev, [key]: value }));
  };

  const isStepValid = () => {
    const a = Array.isArray(userData.assetType) ? userData.assetType : [];
    const s = Array.isArray(userData.sectors) ? userData.sectors : [];
    switch (currentStep) {
      case 1:
        return a.length > 0;
      case 2:
        return s.length > 0;
      case 3:
        return true;
      case 4:
        return !!userData.riskProfile;
      case 5:
        return userData.knowledgeLevel > 0;
      default:
        return false;
    }
  };

  const stepTitles = [
    "주로 투자하시는 자산은 무엇인가요?",
    "관심 있는 산업 분야를 골라주세요.",
    "현재 보유 중인 종목이 있다면 알려주세요.",
    "자신에게 해당되는 투자 스타일을 선택해 주세요.",
    "어떤 스타일의 요약을 선호하시나요?",
  ];

  return (
    <div className="min-h-screen flex items-start justify-center px-3 sm:px-4 pt-8 sm:pt-20 pb-8" style={{ backgroundColor: '#f5f3ff' }}>
      {showTerms && (
        <TermsModal
          onClose={() => navigate("/login")}
          onAgree={() => setShowTerms(false)}
        />
      )}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Progress bar */}
        <div className="bg-gray-100 h-1.5 sm:h-2 w-full">
          <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${(currentStep / 5) * 100}%` }} />
        </div>

        <div className="p-5 sm:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <span className="text-indigo-600 font-bold tracking-wider text-[10px] sm:text-xs uppercase mb-1.5 sm:mb-2 block">
              Step {currentStep} of 5
            </span>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1.5 sm:mb-2 leading-tight">
              {stepTitles[currentStep - 1]}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {currentStep === 3 && "한국(KRX) 및 미국(US) 주식 검색 가능"}
              {currentStep === 5 && "예시를 읽고 선택해 주세요."}
            </p>
          </div>

          {/* Content */}
          <div className="mb-6 sm:mb-8 min-h-[250px] sm:min-h-[300px]">
            {currentStep === 1 && <Step1AssetType userData={userData} updateData={updateData} />}
            {currentStep === 2 && <Step2Sector userData={userData} updateData={updateData} />}
            {currentStep === 3 && (
              <Step3Portfolio userData={userData} updateData={updateData} portfolioInput={portfolioInput} setPortfolioInput={setPortfolioInput} />
            )}
            {currentStep === 4 && <Step4RiskProfile userData={userData} updateData={updateData} />}
            {currentStep === 5 && <Step5KnowledgeLevel userData={userData} updateData={updateData} />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg cursor-pointer font-medium transition-colors text-sm sm:text-base ${currentStep === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              이전
            </button>
            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className={`px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg cursor-pointer font-bold text-white shadow-lg transition-all transform active:scale-95 text-sm sm:text-base ${!isStepValid() ? "bg-gray-300 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30"
                }`}
            >
              {currentStep === 5 ? (isEditing ? "수정 완료" : "완료") : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

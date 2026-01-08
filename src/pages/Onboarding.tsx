import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import type { UserData } from '../types/user';

type Step = 1 | 2 | 3 | 4 | 5;

// interface UserData removed - imported from types


// --- Step Components (Extracted to prevent re-renders) ---

interface StepProps {
    userData: UserData;
    updateData: (key: keyof UserData, value: any) => void;
}

const Step1AssetType = ({ userData, updateData }: StepProps) => {
    const options = ['국내주식', '미국주식', '가상화폐', 'ETF/원자재'];
    return (
        <div className="grid grid-cols-2 gap-4">
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => updateData('assetType', opt)}
                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer duration-200 text-lg font-medium ${userData.assetType === opt
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                        }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
};

const Step2Sector = ({ userData, updateData }: StepProps) => {
    const options = ['반도체', '2차전지', 'AI', '바이오', '자동차', '인터넷/플랫폼', '금융', '에너지'];
    const toggleSector = (sector: string) => {
        const current = userData.sectors;
        if (current.includes(sector)) {
            updateData('sectors', current.filter(s => s !== sector));
        } else {
            if (current.length < 3) {
                updateData('sectors', [...current, sector]);
            }
        }
    };

    return (
        <div>
            <p className="mb-4 text-sm text-gray-500">최대 3개까지 선택 가능합니다.</p>
            <div className="flex flex-wrap gap-3">
                {options.map((opt) => (
                    <button
                        key={opt}
                        onClick={() => toggleSector(opt)}
                        className={`px-4 py-2 rounded-full border cursor-pointer transition-all duration-200 ${userData.sectors.includes(opt)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};

interface Step3Props extends StepProps {
    portfolioInput: string;
    setPortfolioInput: (val: string) => void;
}

const Step3Portfolio = ({ userData, updateData, portfolioInput, setPortfolioInput }: Step3Props) => {
    const addStock = () => {
        if (portfolioInput.trim() && !userData.portfolio.includes(portfolioInput.trim())) {
            updateData('portfolio', [...userData.portfolio, portfolioInput.trim()]);
            setPortfolioInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Prevent IME composition duplication
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter') {
            addStock();
        }
    };

    const removeStock = (stock: string) => {
        updateData('portfolio', userData.portfolio.filter(s => s !== stock));
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={portfolioInput}
                    onChange={(e) => setPortfolioInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="종목명 또는 티커 입력 (예: 삼성전자)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                    onClick={addStock}
                    className="px-6 py-3 bg-gray-900 text-white cursor-pointer rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                    기록
                </button>
            </div>

            {userData.portfolio.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
                    <h4 className="text-sm font-semibold text-gray-500 mb-3">등록된 종목</h4>
                    <div className="flex flex-wrap gap-2">
                        {userData.portfolio.map((stock) => (
                            <span key={stock} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-sm text-gray-800">
                                {stock}
                                <button onClick={() => removeStock(stock)} className="text-gray-400 hover:text-red-500 ml-1">
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
        { id: 'A', title: '공격형', desc: '손실 위험이 있어도 고수익을 노립니다.', sub: '(성장주 위주)' },
        { id: 'B', title: '중립형', desc: '시장 수익률 정도면 만족합니다.', sub: '(ETF/우량주)' },
        { id: 'C', title: '안정형', desc: '원금 보존과 배당이 중요합니다.', sub: '(채권/배당주)' },
    ];

    return (
        <div className="space-y-4">
            {profiles.map((p) => (
                <div
                    key={p.id}
                    onClick={() => updateData('riskProfile', p.id)}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${userData.riskProfile === p.id
                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                >
                    <div>
                        <h4 className={`text-lg font-bold ${userData.riskProfile === p.id ? 'text-indigo-800' : 'text-gray-900'}`}>{p.title}</h4>
                        <p className="text-gray-600 mt-1">{p.desc}</p>
                        <p className="text-xs text-gray-400 mt-1">{p.sub}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${userData.riskProfile === p.id ? 'border-indigo-600' : 'border-gray-300'
                        }`}>
                        {userData.riskProfile === p.id && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
                    </div>
                </div>
            ))}
        </div>
    );
};

const Step5KnowledgeLevel = ({ userData, updateData }: StepProps) => {
    const levels = [
        { level: 1, title: '주린이', desc: '"금리가 올라서 주식 시장이 전체적으로 힘들어요. 당분간 조심하세요!"' },
        { level: 2, title: '초보자', desc: '"금리 인상으로 인해 시장 유동성이 줄어들고 있어요. 보수적인 접근이 필요합니다."' },
        { level: 3, title: '중급자', desc: '"기준금리 인상이 지속되면서 기술주 중심의 하락이 예상됩니다. 포트폴리오 재구성이 필요해 보여요."' },
        { level: 4, title: '숙련자', desc: '"긴축 통화 정책으로 인한 밸류에이션 조정이 진행 중입니다. 현금 비중을 확대하고 방어주 위주의 전략을 추천합니다."' },
        { level: 5, title: '전문가', desc: '"FOMC의 매파적 기조로 국채 금리가 급등하며 밸류에이션 부담이 가중되었습니다. 리스크 오프 전략이 유효합니다."' },
    ];

    return (
        <div className="space-y-3">
            {levels.map((l) => (
                <div
                    key={l.level}
                    onClick={() => updateData('knowledgeLevel', l.level)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${userData.knowledgeLevel === l.level
                        ? 'border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${userData.knowledgeLevel === l.level ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-700'
                            }`}>
                            Lv.{l.level}
                        </span>
                        <span className="font-bold text-gray-900">{l.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 italic">
                        {l.desc}
                    </p>
                </div>
            ))}
        </div>
    );
};

const Onboarding = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isEditing = location.state?.isEditing;

    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [userData, setUserData] = useState<UserData>({
        assetType: '',
        sectors: [],
        portfolio: [],
        riskProfile: '',
        knowledgeLevel: 0,
    });

    const [portfolioInput, setPortfolioInput] = useState('');

    useEffect(() => {
        const checkProfile = async () => {
            try {
                const accessToken = localStorage.getItem('access_token');
                if (accessToken) {
                    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/onboarding/`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    if (isEditing) {
                        if (response.data) {
                            setUserData(response.data);
                        }
                    } else {
                        if (response.data && response.data.assetType) {
                            navigate('/');
                        }
                    }
                }
            } catch (error) {
            }
        };
        checkProfile();
    }, [navigate, isEditing]);

    const submitData = async () => {
        try {
            const accessToken = localStorage.getItem('access_token');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/user/onboarding/`, userData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

        } catch (error) {
            console.error('온보딩 데이터 전송 실패: ', error);
        }
    };

    const handleNext = async () => {
        if (currentStep < 5) {
            setCurrentStep((prev) => (prev + 1) as Step);
        } else {
            // console.log('온보딩 데이터: ', userData);
            await submitData();
            navigate('/mypage');
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
        switch (currentStep) {
            case 1: return !!userData.assetType;
            case 2: return userData.sectors.length > 0;
            case 3: return true;
            case 4: return !!userData.riskProfile;
            case 5: return userData.knowledgeLevel > 0;
            default: return false;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-20">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="bg-gray-100 h-2 w-full">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${(currentStep / 5) * 100}%` }}
                    />
                </div>

                <div className="p-8">
                    <div className="mb-8">
                        <span className="text-indigo-600 font-bold tracking-wider text-xs uppercase mb-2 block">
                            Step {currentStep} of 5
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {currentStep === 1 && "주로 투자하시는 자산은 무엇인가요?"}
                            {currentStep === 2 && "관심 있는 산업 분야를 골라주세요."}
                            {currentStep === 3 && "현재 보유 중인 종목이 있다면 알려주세요."}
                            {currentStep === 4 && "자신에게 해당되는 투자 스타일을 선택해 주세요."}
                            {currentStep === 5 && "어떤 스타일의 요약을 선호하시나요?"}
                        </h2>
                        <p className="text-gray-500">
                            {currentStep === 3 && "가장 먼저 분석해 드립니다."}
                            {currentStep === 5 && "예시를 읽고 선택해 주세요."}
                        </p>
                    </div>

                    <div className="mb-8 min-h-[300px]">
                        {currentStep === 1 && <Step1AssetType userData={userData} updateData={updateData} />}
                        {currentStep === 2 && <Step2Sector userData={userData} updateData={updateData} />}
                        {currentStep === 3 && <Step3Portfolio userData={userData} updateData={updateData} portfolioInput={portfolioInput} setPortfolioInput={setPortfolioInput} />}
                        {currentStep === 4 && <Step4RiskProfile userData={userData} updateData={updateData} />}
                        {currentStep === 5 && <Step5KnowledgeLevel userData={userData} updateData={updateData} />}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className={`px-6 py-2.5 rounded-lg cursor-pointer font-medium transition-colors ${currentStep === 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            이전
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            className={`px-8 py-2.5 rounded-lg cursor-pointer font-bold text-white shadow-lg transition-all transform active:scale-95 ${!isStepValid()
                                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30'
                                }`}
                        >
                            {currentStep === 5 ? (isEditing ? '수정 완료' : '완료') : '다음'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;

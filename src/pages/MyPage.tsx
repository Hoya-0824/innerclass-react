import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { UserData } from '../types/user';
import databaseIcon from '../assets/database.svg';
import folderIcon from '../assets/folder.svg';
import levelIcon from '../assets/level.svg';
import fireIcon from '../assets/fire.svg';
import temaIcon from '../assets/tema.svg';

const MyPage = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [userEmail, setUserEmail] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const accessToken = localStorage.getItem('access_token');
                if (!accessToken) {
                    alert('로그인이 필요합니다.');
                    navigate('/login');
                    return;
                }

                // Get email from localStorage (saved during Google login)
                setUserEmail(localStorage.getItem('user_email') || '');

                // Fetch onboarding data
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/onboarding/`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.data || Object.keys(response.data).length === 0) {
                    // Handle empty profile if needed
                }

                setUserData(response.data);
            } catch (err: any) {
                console.error(err);
                if (err.response && err.response.status === 401) {
                    alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user_name');
                    navigate('/login');
                    return;
                }
                setError('데이터를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const getRiskProfileLabel = (profile: string | undefined) => {
        if (profile === 'A') return '공격형';
        if (profile === 'B') return '중립형';
        if (profile === 'C') return '안정형';
        return '-';
    };

    const getRiskProfileEmoji = (profile: string | undefined) => {
        if (profile === 'A') return '🔥'; // 공격형 - 불
        if (profile === 'B') return '⚖️'; // 중립형 - 저울
        if (profile === 'C') return '🛡️'; // 안정형 - 방패
        return '🔥';
    };

    // 투자 레벨에 따른 메달 이모지 (동, 은, 금, 플래티넘, 다이아)
    const getLevelMedal = (level: number | undefined) => {
        if (level === 1) return '🥉'; // 동메달
        if (level === 2) return '🥈'; // 은메달
        if (level === 3) return '🥇'; // 금메달
        if (level === 4) return '💠'; // 플래티넘
        if (level === 5) return '💎'; // 다이아
        return '🥉';
    };

    const getLevelLabel = (level: number | undefined) => {
        if (level === 1) return 'LV.1 주린이';
        if (level === 2) return 'LV.2 초보자';
        if (level === 3) return 'LV.3 중급자';
        if (level === 4) return 'LV.4 숙련자';
        if (level === 5) return 'LV.5 전문가';
        return `LV.${level || 1} 주린이`;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">로딩중...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

    if (!userData || !userData.assetType) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                <p className="text-gray-600 mb-4">등록된 투자 성향 정보가 없습니다.</p>
                <button
                    onClick={() => navigate('/onboarding')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    투자 성향 분석하러 가기
                </button>
            </div>
        );
    }

    const userName = localStorage.getItem('user_name') || '주린이';

    return (
        <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-4" style={{ backgroundColor: '#f5f3ff' }}>
            <div className="max-w-2xl mx-auto">
                {/* Header with Settings */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">마이페이지</h1>
                    <div className="relative">
                        <button
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50 transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        {showSettingsMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <button
                                        onClick={() => {
                                            navigate('/onboarding', { state: { isEditing: true } });
                                            setShowSettingsMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100"
                                        role="menuitem"
                                    >
                                        수정하기
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setShowSettingsMenu(false);
                                            if (window.confirm('정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                                try {
                                                    const accessToken = localStorage.getItem('access_token');
                                                    await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/user/withdraw/`, {
                                                        headers: { Authorization: `Bearer ${accessToken}` }
                                                    });
                                                    alert('탈퇴가 완료되었습니다.');
                                                    localStorage.removeItem('access_token');
                                                    localStorage.removeItem('refresh_token');
                                                    localStorage.removeItem('user_name');
                                                    navigate('/');
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('회원탈퇴 처리에 실패했습니다.');
                                                }
                                            }
                                        }}
                                        className="w-full text-left px-4 py-2 cursor-pointer text-sm text-red-600 hover:bg-gray-100"
                                        role="menuitem"
                                    >
                                        회원탈퇴
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Section - Profile and Investment Info */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                    {/* Profile Card */}
                    <div
                        className="flex-1 bg-white rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center"
                        style={{
                            border: '2px solid transparent',
                            background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #a78bfa 0%, #818cf8 100%) border-box'
                        }}
                    >
                        {/* Avatar */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        {/* Name with edit icon */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg sm:text-xl font-semibold text-gray-900">{userName}</span>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-500">{userEmail}</span>
                    </div>

                    {/* Investment Info Card */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm sm:min-w-[200px]">
                        {/* 투자 성향 */}
                        <div className="mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b from-red-400 to-red-500 flex items-center justify-center">
                                    <img src={fireIcon} alt="level" className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </div>
                                <span className="text-sm sm:text-base font-bold text-gray-700">투자 성향</span>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-orange-50 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                                <span className="text-base sm:text-lg">{getRiskProfileEmoji(userData.riskProfile)}</span>
                                <span className="text-sm sm:text-base font-medium text-orange-500">{getRiskProfileLabel(userData.riskProfile)}</span>
                            </div>
                        </div>

                        {/* 투자 레벨 */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b from-green-500 to-green-600 flex items-center justify-center">
                                    <img src={levelIcon} alt="level" className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </div>
                                <span className="text-sm sm:text-base font-bold text-gray-700">투자 레벨</span>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-yellow-50 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                                <span className="text-base sm:text-lg">{getLevelMedal(userData.knowledgeLevel)}</span>
                                <span className="text-sm sm:text-base font-medium text-yellow-600">{getLevelLabel(userData.knowledgeLevel)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 투자 자산 유형 */}
                <InfoCard
                    icon={<img src={databaseIcon} alt="database" className="w-4 h-4" />}
                    iconBgColor="bg-gradient-to-b from-indigo-500 to-purple-500"
                    title="투자 자산 유형"
                    badges={userData.assetType}
                    onEdit={() => navigate('/onboarding', { state: { isEditing: true } })}
                />

                {/* 관심 테마 */}
                <InfoCard
                    icon={<img src={temaIcon} alt="tema" className="w-4 h-4" />}
                    iconBgColor="bg-gradient-to-b from-indigo-500 to-purple-500"
                    title="관심 테마"
                    badges={userData.sectors}
                    onEdit={() => navigate('/onboarding', { state: { isEditing: true } })}
                />

                {/* 보유 종목 */}
                <InfoCard
                    icon={<img src={folderIcon} alt="folder" className="w-4 h-4" />}
                    iconBgColor="bg-gradient-to-b from-indigo-500 to-purple-500"
                    title="보유 종목"
                    badges={userData.portfolio.length > 0 ? userData.portfolio : ['없음']}
                    onEdit={() => navigate('/onboarding', { state: { isEditing: true } })}
                />
            </div>
        </div>
    );
};

// InfoCard Component
interface InfoCardProps {
    icon: React.ReactNode;
    iconBgColor: string;
    title: string;
    badges: string[];
    onEdit: () => void;
    badgeBgColor?: string;
    badgeTextColor?: string;
}

const InfoCard = ({ icon, iconBgColor, title, badges, onEdit, badgeBgColor = 'bg-gray-100', badgeTextColor = 'text-gray-600' }: InfoCardProps) => {
    return (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm mb-3 sm:mb-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${iconBgColor} flex items-center justify-center`}>
                        {icon}
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-gray-800">{title}</span>
                </div>
                <button
                    onClick={onEdit}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </button>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
                {badges.map((badge, index) => (
                    <span
                        key={index}
                        className={`px-3 sm:px-4 py-1 sm:py-1.5 ${badgeBgColor} ${badgeTextColor} text-xs sm:text-sm font-medium rounded-lg`}
                    >
                        {badge}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MyPage;

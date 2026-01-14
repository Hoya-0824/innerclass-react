import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { UserData } from '../types/user';

const MyPage = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const accessToken = localStorage.getItem('access_token');
                if (!accessToken) {
                    alert('로그인이 필요합니다.');
                    navigate('/login');
                    return;
                }

                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/onboarding/`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                // 만약 데이터가 비어있다면 (아직 온보딩 안함)
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

    if (loading) return <div className="min-h-screen flex items-center justify-center">로딩중...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

    if (!userData || !userData.assetType) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
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

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-gray-900">마이 페이지</h1>
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">내 투자 성향 정보</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">온보딩에서 선택한 정보입니다.</p>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                        <dl className="sm:divide-y sm:divide-gray-200">
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">주 투자 자산</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData.assetType}</dd>
                            </div>
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">관심 섹터</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <div className="flex gap-2 flex-wrap">
                                        {userData.sectors.map(s => (
                                            <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </dd>
                            </div>
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">보유 종목</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <div className="flex gap-2 flex-wrap">
                                        {userData.portfolio.map(s => (
                                            <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {s}
                                            </span>
                                        ))}
                                        {userData.portfolio.length === 0 && <span className="text-gray-400">-</span>}
                                    </div>
                                </dd>
                            </div>
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">위험 성향</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {userData.riskProfile === 'A' && '공격형 (고수익 추구)'}
                                    {userData.riskProfile === 'B' && '중립형 (시장수익률 추구)'}
                                    {userData.riskProfile === 'C' && '안정형 (원금보존 추구)'}
                                    {!userData.riskProfile && '-'}
                                </dd>
                            </div>
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">투자 지식 레벨</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    Lv.{userData.knowledgeLevel}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
            <div className="mt-8 flex justify-center gap-4">
                <button
                    onClick={() => navigate('/onboarding', { state: { isEditing: true } })}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-orange-600 transition-colors font-bold sm:w-auto"
                >
                    수정하기
                </button>
                <button
                    className="bg-red-500 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-red-600 transition-colors font-bold sm:w-auto"
                    onClick={async () => {
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
                >
                    회원탈퇴
                </button>
            </div>
        </div>
    );
};

export default MyPage;

import React, { useEffect } from 'react';

interface PrivacyPolicyModalProps {
    onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // 모달이 열리면 스크롤 방지
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl animate-fadeIn flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">개인정보처리방침</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-8 text-gray-700 leading-relaxed text-sm md:text-base overflow-y-auto">
                    <section>
                        <p className="mb-4">
                            [DecodeX] (이하 "회사")은 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">1. 개인정보의 수집 및 이용 목적</h3>
                        <p className="mb-2">회사는 다음의 목적을 위해 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않습니다.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-gray-900">회원 가입 및 관리:</strong> 회원제 서비스 이용에 따른 본인확인, 개인 식별, 가입 의사 확인, 불량 회원의 부정 이용 방지.</li>
                            <li><strong className="text-gray-900">서비스 제공:</strong> AI 맞춤형 뉴스 추천, 투자 성향 분석(온보딩), 관심 종목 관리.</li>
                            <li><strong className="text-gray-900">신규 서비스 개발 및 마케팅:</strong> 통계학적 특성에 따른 서비스 제공, 접속 빈도 파악, 서비스 이용에 대한 통계.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">2. 수집하는 개인정보의 항목 및 수집 방법</h3>
                        <p className="mb-2">회사는 회원가입 및 서비스 이용 과정에서 아래와 같은 최소한의 개인정보를 수집합니다.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-gray-900">필수항목:</strong> 이메일 주소, 닉네임, 프로필 사진 (소셜 로그인 연동 시 제공받는 정보), 로그인 ID(Social ID).</li>
                            <li><strong className="text-gray-900">선택항목:</strong> 투자 성향 정보(관심 섹터, 보유 종목, 투자 자산 규모, 지식 레벨 등).</li>
                            <li><strong className="text-gray-900">자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보, 불량 이용 기록.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">3. 개인정보의 보유 및 이용 기간</h3>
                        <p className="mb-2">회사는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 회원 탈퇴 시 서비스 부정 이용 방지 및 민원 처리를 위해 일정 기간(예: 7일) 보관 후 파기할 수 있으며, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-gray-900">회원 탈퇴 시:</strong> 보유하고 있는 투자 성향 및 민감 데이터 즉시 파기 (단, 법령에 따른 보존 의무가 있는 경우 제외).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">4. 개인정보의 제3자 제공</h3>
                        <p className="mb-2">회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 이용자가 외부 제휴사의 서비스를 이용하기 위해 동의한 경우나 법령의 규정에 의거한 경우는 예외로 합니다.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">5. 개인정보의 파기 절차 및 방법</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong className="text-gray-900">파기 절차:</strong> 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.</li>
                            <li><strong className="text-gray-900">파기 방법:</strong> 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">6. 이용자 및 법정대리인의 권리와 행사 방법</h3>
                        <p className="mb-2">이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 가입 해지(탈퇴)를 요청할 수 있습니다. 마이페이지의 '회원탈퇴' 기능을 통해 직접 처리가 가능합니다.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">7. 개인정보 보호책임자</h3>
                        <p className="mb-2">회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 이와 관련한 이용자의 고충 처리 및 피해 구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                        <div className="bg-gray-50 p-4 rounded-lg mt-2">
                            <ul className="space-y-1">
                                <li><span className="font-bold w-20 inline-block">책임자:</span> [OOO]</li>
                                <li><span className="font-bold w-20 inline-block">직책:</span> [PM / 대표]</li>
                                <li><span className="font-bold w-20 inline-block">이메일:</span> [help@team2.com (예시)]</li>
                            </ul>
                        </div>
                    </section>

                    <section className="pt-4 border-t border-gray-100">
                        <p className="text-gray-500 text-sm">부칙 본 방침은 2026년 1월 17일부터 시행됩니다.</p>
                    </section>
                </div>

                {/* Footer Button (Mobile friendly) */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyModal;

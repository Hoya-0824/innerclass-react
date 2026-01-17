import React, { useEffect } from 'react';

interface TermsModalProps {
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ onClose }) => {
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
                    <h2 className="text-xl font-bold text-gray-900">이용약관</h2>
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
                    <div className="mb-6">
                        <h3 className="font-bold text-lg mb-1">[DecodeX] 서비스 이용약관</h3>
                    </div>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">제1장 총칙</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제1조 (목적)</h4>
                                <p>본 약관은 DecodeX가 제공하는 AI 맞춤형 뉴스 추천 및 투자 정보 관련 제반 서비스의 이용과 관련하여, "회사"와 "이용자" 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제2조 (용어의 정의)</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong className="text-gray-900">서비스:</strong> "회사"가 구현하여 "이용자"가 이용할 수 있는 AI 뉴스 추천, 투자 성향 분석, 관심 종목 관리 등의 제반 서비스를 의미합니다.</li>
                                    <li><strong className="text-gray-900">이용자:</strong> 본 약관에 따라 "회사"가 제공하는 "서비스"를 이용하는 회원 및 비회원을 말합니다.</li>
                                    <li><strong className="text-gray-900">회원:</strong> "회사"의 "서비스"에 접속하여 본 약관에 동의하고, 이메일 주소 등을 통해 가입하여 "서비스"를 이용하는 고객을 의미합니다.</li>
                                    <li><strong className="text-gray-900">콘텐츠:</strong> "회사"가 "서비스" 상에 게시한 글, 사진, AI 분석 결과, 뉴스 데이터 등 일체의 정보를 의미합니다.</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제3조 (약관의 명시와 개정)</h4>
                                <p className="mb-2">"회사"는 본 약관의 내용을 "이용자"가 쉽게 알 수 있도록 서비스 화면에 게시합니다.</p>
                                <p className="mb-2">"회사"는 약관의 규제에 관한 법률 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</p>
                                <p>약관이 개정될 경우 "회사"는 적용일자 및 개정 사유를 명시하여 현행 약관과 함께 서비스 내에 공지합니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">제2장 서비스 이용계약</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제4조 (이용계약 체결)</h4>
                                <p className="mb-2">이용계약은 "이용자"가 본 약관의 내용에 동의한 후 가입 신청을 하고, "회사"가 이를 승낙함으로써 체결됩니다.</p>
                                <p>"회사"는 소셜 로그인(SNS 계정 연동)을 통한 가입 시, 해당 플랫폼으로부터 제공받는 정보(이메일, 닉네임, 프로필 사진 등)를 기반으로 이용계약을 승인합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제5조 (회원정보의 변경)</h4>
                                <p>"회원"은 마이페이지를 통해 언제든지 본인의 개인정보를 열람하고 수정할 수 있습니다. 다만, 서비스 관리를 위해 필요한 필수 식별 정보(Social ID 등)는 수정이 불가능할 수 있습니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">제3장 서비스 이용</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제6조 (서비스의 내용 및 변경)</h4>
                                <p className="mb-2">"회사"는 "이용자"에게 다음과 같은 서비스를 제공합니다.</p>
                                <ul className="list-disc pl-5 space-y-1 mb-2">
                                    <li>AI 맞춤형 뉴스 추천 및 큐레이션</li>
                                    <li>투자 성향 분석(온보딩) 및 결과 리포트</li>
                                    <li>관심 종목 관리 및 개인화된 알림</li>
                                    <li>기타 "회사"가 추가 개발하거나 다른 회사와의 제휴를 통해 "이용자"에게 제공하는 서비스</li>
                                </ul>
                                <p>"회사"는 서비스의 운영상, 기술상의 필요에 따라 제공하고 있는 서비스의 전부 또는 일부를 변경할 수 있습니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제7조 (서비스 이용의 제한 및 중단)</h4>
                                <p className="mb-2">"회사"는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
                                <p>"회사"는 "이용자"가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해하는 경우, 서비스 이용을 단계적으로 제한하거나 강제 탈퇴 처리할 수 있습니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제8조 (투자 정보에 대한 면책 고지)</h4>
                                <p className="mb-2">"회사"가 제공하는 모든 투자 관련 정보 및 AI 분석 결과는 투자 참고용이며, 투자 권유나 종목 추천을 의미하지 않습니다.</p>
                                <p>모든 투자의 최종 결정과 그로 인한 책임은 "이용자" 본인에게 있으며, "회사"는 "이용자"의 투자 손실에 대하여 어떠한 법적 책임도 지지 않습니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">제4장 계약 당사자의 의무</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제9조 ("회사"의 의무)</h4>
                                <p className="mb-2">"회사"는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 지속적이고 안정적으로 서비스를 제공하기 위해 최선을 다합니다.</p>
                                <p>"회사"는 "이용자"가 안전하게 서비스를 이용할 수 있도록 개인정보 보호를 위한 보안 시스템을 갖추어야 하며, 개인정보처리방침을 준수합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">제10조 ("이용자"의 의무)</h4>
                                <p className="mb-2">"이용자"는 본인의 계정 및 비밀번호(또는 소셜 로그인 연동 정보)를 관리할 책임이 있습니다.</p>
                                <p className="mb-2">"이용자"는 다음 행위를 하여서는 안 됩니다.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>타인의 정보 도용</li>
                                    <li>"회사"가 게시한 정보의 무단 변경</li>
                                    <li>"회사"가 정한 정보 이외의 정보(컴퓨터 프로그램 등)의 송신 또는 게시</li>
                                    <li>"회사" 및 제3자의 지적재산권에 대한 침해</li>
                                    <li>"회사"의 동의 없이 서비스를 영리 목적으로 이용하는 행위</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">제5장 계약 해지 및 데이터 처리</h3>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">제11조 (계약 해지 및 탈퇴)</h4>
                            <p className="mb-2">"회원"은 언제든지 마이페이지 내 '회원탈퇴' 기능을 통해 이용계약 해지를 신청할 수 있습니다.</p>
                            <p>탈퇴 시 "회사"는 개인정보처리방침에 따라 "회원"의 데이터를 즉시 파기합니다. 단, 부정 이용 방지 및 민원 처리를 위해 7일간 보관 후 파기될 수 있습니다.</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-gray-900 text-lg mb-3">제6장 기타</h3>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">제12조 (준거법 및 재판관할)</h4>
                            <p className="mb-2">"회사"와 "이용자" 간 제기된 소송은 대한민국법을 준거법으로 합니다.</p>
                            <p>"회사"와 "이용자" 간 발생한 분쟁에 관한 소송은 민사소송법상 관할법원에 제소합니다.</p>
                        </div>
                    </section>

                    <section className="pt-4 border-t border-gray-100">
                        <p className="text-gray-500 text-sm">부칙 이 약관은 2026년 1월 17일부터 시행됩니다.</p>
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

export default TermsModal;

import { useState } from 'react';
import Logo from '../../assets/Logo.svg';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsModal from './TermsModal';

const Footer = () => {
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    return (
        <>
            <footer className="bg-[#929292] text-white p-6 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-4 text-sm font-medium">
                                    <span
                                        className="font-bold cursor-pointer hover:text-gray-600 transition-colors"
                                        onClick={() => setIsTermsOpen(true)}
                                    >
                                        이용약관
                                    </span>
                                    <span
                                        className="font-bold cursor-pointer hover:text-gray-600 transition-colors"
                                        onClick={() => setIsPrivacyOpen(true)}
                                    >
                                        개인정보처리방침
                                    </span>
                                </div>
                                <img src={Logo} alt="DecodeX Logo" className="w-8 opacity-80 md:hidden" />
                            </div>

                            <h4 className="font-bold mb-2 text-sm">서비스 유의사항</h4>
                            <ul className="text-xs text-white space-y-1.5 list-disc pl-4 leading-relaxed">
                                <li>본 서비스에서 제공하는 모든 정보는 투자 판단을 돕기 위한 참고 자료이며, 투자 결과에 대한 법적 책임은 사용자 본인에게 있습니다.</li>
                                <li>AI가 요약 및 분석한 내용은 뉴스 원문과 차이가 있을 수 있으므로, 반드시 원문 기사를 확인하시기 바랍니다.</li>
                                <li>실시간 지수 및 종목 정보는 데이터 제공처의 사정에 따라 실제와 오차가 발생할 수 있습니다.</li>
                            </ul>
                        </div>
                        <img src={Logo} alt="DecodeX Logo" className="hidden md:block w-12 opacity-80" />
                    </div>
                    <div className="text-[10px] text-white border-t border-gray-500 pt-4">
                        Copyright © 2026 DecodeX. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Privacy Policy Modal */}
            {isPrivacyOpen && (
                <PrivacyPolicyModal onClose={() => setIsPrivacyOpen(false)} />
            )}

            {/* Terms Modal */}
            {isTermsOpen && (
                <TermsModal onClose={() => setIsTermsOpen(false)} />
            )}
        </>
    );
};

export default Footer;

import { useNavigate } from 'react-router-dom';

interface LoginGateOverlayProps {
    message?: string;
}

const LoginGateOverlay = ({
    message = "로그인하고\n나에게 딱 맞는 뉴스를 받아보세요!"
}: LoginGateOverlayProps) => {
    const navigate = useNavigate();

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center pt-20"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(1.5px)',
                WebkitBackdropFilter: 'blur(1.5px)'
            }}
        >
            {/* Pointer events blocker - only login button is clickable */}
            <div className="absolute inset-0 pointer-events-auto" />

            {/* Lock Icon */}
            <div className="relative z-10 mb-4">
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400"
                >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            </div>

            {/* Message */}
            <p className="relative z-10 text-center text-gray-900 font-semibold text-lg mb-6 whitespace-pre-line">
                {message}
            </p>

            {/* Login Button */}
            <button
                onClick={handleLoginClick}
                className="relative z-10 px-8 py-3 bg-white border border-gray-300 rounded-full cursor-pointer text-gray-900 font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm pointer-events-auto"
                data-gtm-click="lock_news_lp"
            >
                로그인 하러 가기
            </button>
        </div>
    );
};

export default LoginGateOverlay;

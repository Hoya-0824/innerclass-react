import googleLogo from '../../assets/google-logo.svg';

interface GoogleLoginButtonProps {
    text?: string;
}

const GoogleLoginButton = ({ text = "Google로 계속하기" }: GoogleLoginButtonProps) => {
    const handleGoogleLogin = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'email profile',
            include_granted_scopes: 'true',
        });

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        window.location.href = googleAuthUrl;
    };

    return (
        <button
            onClick={handleGoogleLogin}
            className="w-full flex justify-center items-center gap-1.5 md:gap-2 py-3.5 px-2 md:py-4 md:px-4 border border-gray-200 rounded-xl cursor-pointer shadow-sm text-xs md:text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 whitespace-nowrap"
        >
            <img src={googleLogo} alt="google-logo" className="w-4 h-4 md:w-5 md:h-5" />
            {text}
        </button>
    )
}

export default GoogleLoginButton;
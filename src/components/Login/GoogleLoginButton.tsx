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
        <button onClick={handleGoogleLogin} className='w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md cursor-pointer shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 gap-3 items-center'>
            <img src={googleLogo} alt="google-logo" width={22} height={22} />
            <span className="text-gray-700 font-medium text-sm">
                {text}
            </span>
        </button>
    )
}

export default GoogleLoginButton;
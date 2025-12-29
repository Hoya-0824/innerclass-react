import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const GoogleCallback = () => {
    const navigate = useNavigate();
    const isRun = useRef(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code && !isRun.current) {
            isRun.current = true;
            handleGoogleLogin(code);
        } else {
            console.error("인증 코드가 없습니다.");
            // navigate('/login'); // 실패 시 로그인 창으로
        }
    }, []);

    const handleGoogleLogin = async (code: string) => {
        try {
            console.log("백엔드로 코드를 보냅니다:", code);

            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/google/`, {
                code: code,
            });

            console.log("로그인 성공! 토큰:", res.data);

            const { access, refresh, user } = res.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('user_name', user.name);

            navigate('/');

        } catch (error) {
            console.error("로그인 에러 발생:", error);
            alert("로그인 처리에 실패했습니다. 관리자에게 문의하세요.");
            navigate('/');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="text-4xl animate-bounce">📨</div>
            <h2 className="mt-4 text-xl font-bold text-gray-700">서버와 통신 중입니다...</h2>
        </div>
    );
};

export default GoogleCallback;
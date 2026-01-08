import axios from 'axios';

// 환경 변수나 상수로 기본 URL 설정 (필요시)
const baseURL = `${import.meta.env.VITE_API_BASE_URL}/api` || 'http://localhost:8000/api';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터: 토큰 자동 추가
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터: 401 에러 처리 (토큰 갱신)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 아직 재시도하지 않은 요청이라면
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');

                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // 토큰 갱신 요청
                const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
                    refresh: refreshToken
                });

                const { access } = response.data;

                // 새 토큰 저장
                localStorage.setItem('access_token', access);

                // 실패했던 요청의 헤더 업데이트 후 재시도
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);

            } catch (refreshError) {
                // 토큰 갱신 실패 시 (리프레시 토큰 만료 등) -> 로그아웃 처리
                console.error("Token refresh failed:", refreshError);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_name');

                alert("세션이 만료되었습니다. 다시 로그인해주세요.");
                window.location.href = '/login';

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

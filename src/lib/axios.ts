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

// 응답 인터셉터: 401 에러 처리 등 (선택 사항)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // 토큰 만료 처리 등을 여기에 추가할 수 있음
        return Promise.reject(error);
    }
);

export default api;

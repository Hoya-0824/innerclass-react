

import { Link } from 'react-router-dom';
import GoogleLoginButton from '../components/Login/GoogleLoginButton';

const Login = () => {
    return (
        <div className="flex justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        로그인
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        서비스 이용을 위해 로그인이 필요합니다.
                    </p>
                </div>
                <form className="mt-8 space-y-6" action="#" method="POST">
                    <input type="hidden" name="remember" value="true" />
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">이메일 주소</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-mkOrange focus:border-mkOrange focus:z-10 sm:text-sm"
                                placeholder="이메일 주소"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">비밀번호</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-mkOrange focus:border-mkOrange focus:z-10 sm:text-sm"
                                placeholder="비밀번호"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-mkOrange focus:ring-mkOrange border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                로그인 유지
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-mkOrange hover:text-orange-500">
                                비밀번호 찾기
                            </a>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-mkOrange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mkOrange transition-colors duration-200"
                        >
                            로그인
                        </button>
                    </div>
                </form>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <GoogleLoginButton text="Google" />
                    <button
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md cursor-pointer shadow-sm text-sm font-medium text-black bg-[#FEE500] hover:bg-[#FDD835] transition-colors duration-200 gap-3 items-center"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2C6.48 2 2 5.58 2 10C2 12.03 2.94 13.84 4.5 15.19C4.38 15.8 3.5 18 3.5 18C3.5 18 5.75 17.5 7.15 16.5C8.5 17.5 10.2 18 12 18C17.52 18 22 14.42 22 10C22 5.58 17.52 2 12 2Z" />
                        </svg>
                        Kakao
                    </button>
                </div>

                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        아직 회원이 아니신가요?{' '}
                        <Link to="/signup" className="font-medium text-mkOrange hover:text-orange-500">
                            회원가입
                        </Link>
                    </p>
                </div>
            </div>
        </div >
    );
};

export default Login;

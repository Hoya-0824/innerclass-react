import { useState } from 'react';
import GoogleLoginButton from '../components/Login/GoogleLoginButton';
import LoginBg from '../assets/Login_bg.png';
import AppLogo from '../assets/Logo.svg';

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);

    return (
        <div
            className="w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative px-4 py-6 sm:px-6 md:px-8"
            style={{ backgroundImage: `url(${LoginBg})`, backgroundBlendMode: 'overlay' }}
        >
            {/* 컨테이너 - 반응형 */}
            <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-5xl xl:max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-6 md:gap-8 lg:gap-16 z-10 pt-16 sm:pt-28 lg:pt-22">

                {/* 왼쪽 로고 영역 - lg 이상에서만 표시 */}
                <div className="hidden lg:flex flex-col justify-center items-center flex-1">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex flex-col items-center justify-center mb-4 lg:mb-6">
                            <img src={AppLogo} alt="DecodeX Logo" className="w-21 h-21 object-contain" />
                            <h1 className="text-3xl lg:text-4xl xl:text-7xl font-extrabold text-[#111827] tracking-tight">
                                DecodeX
                            </h1>
                        </div>
                        <p className="text-sm lg:text-base xl:text-lg text-gray-600 font-medium whitespace-nowrap">
                            복잡한 투자 뉴스를 한 번에 해독하세요.
                        </p>
                    </div>
                </div>

                {/* 오른쪽 로그인/회원가입 카드 - 완전 반응형 */}
                <div className="w-full lg:w-auto lg:flex-1 flex justify-center lg:justify-end">
                    <div className="w-full max-w-[90vw] sm:max-w-sm md:max-w-md lg:max-w-md xl:max-w-lg bg-white/45 backdrop-blur-xl px-6 py-8 md:px-12 md:py-10 lg:px-18 lg:py-12 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30">

                        {/* 제목 */}
                        <div className="text-center mb-3 sm:mb-4 md:mb-5 lg:mb-6">
                            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold text-[#111827] tracking-tight">
                                {isSignUp ? '회원가입' : '로그인'}
                            </h2>
                        </div>

                        {/* 로그인 폼 - 로그인 모드일 때만 표시 */}
                        {!isSignUp && (
                            <form className="space-y-2.5 sm:space-y-3 lg:space-y-4" action="#" method="POST">
                                <input type="hidden" name="remember" value="true" />

                                {/* 입력 필드들 */}
                                <div className="space-y-2.5 sm:space-y-3 lg:space-y-4">
                                    {/* 아이디 */}
                                    <div>
                                        <label htmlFor="email-address" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 ml-0.5">
                                            아이디
                                        </label>
                                        <input
                                            id="email-address"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="appearance-none block w-full px-4 py-3 sm:px-4 sm:py-3 md:py-3 lg:py-3.5 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-[#F9FAFB] text-sm"
                                            placeholder="아이디를 입력해주세요."
                                        />
                                    </div>

                                    {/* 비밀번호 */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1 ml-0.5">
                                            <label htmlFor="password" className="block text-xs sm:text-sm font-bold text-gray-700">
                                                비밀번호
                                            </label>
                                            <a href="#" className="text-[10px] sm:text-xs text-gray-400 hover:text-blue-600 transition-colors">
                                                비밀번호를 잊으셨나요?
                                            </a>
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            className="appearance-none block w-full px-4 py-3 sm:px-4 sm:py-3 md:py-3 lg:py-3.5 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-[#F9FAFB] text-sm"
                                            placeholder="비밀번호를 입력해 주세요."
                                        />
                                    </div>
                                </div>

                                {/* 로그인 상태 유지 */}
                                <div className="flex items-center ml-0.5">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-600 cursor-pointer select-none font-medium">
                                        로그인 상태 유지
                                    </label>
                                </div>

                                {/* 로그인 버튼 */}
                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-2.5 sm:py-3 lg:py-3.5 px-4 border border-transparent text-sm sm:text-base font-bold rounded-lg sm:rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-blue-500/30 cursor-pointer"
                                >
                                    로그인
                                </button>
                            </form>
                        )}

                        {/* 하단 영역 */}
                        <div className={isSignUp ? '' : 'mt-2 sm:mt-2 md:mt-3 lg:mt-4'}>
                            {/* 로그인/회원가입 전환 링크 */}
                            <div className="text-center mb-3 sm:mb-4">
                                <span className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                    {isSignUp ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}
                                    <button
                                        type="button"
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        className="font-bold text-gray-900 hover:text-blue-600 ml-1.5 transition-colors cursor-pointer"
                                    >
                                        {isSignUp ? '로그인' : '회원가입'}
                                    </button>
                                </span>
                            </div>

                            {/* 소셜 로그인 버튼들 */}
                            <div className={isSignUp ? 'flex flex-col gap-2 sm:gap-3' : 'grid grid-cols-2 gap-2 sm:gap-3'}>
                                <button
                                    className="w-full flex justify-center items-center gap-1.5 md:gap-2 py-3.5 px-2 md:py-4 md:px-4 border border-transparent rounded-xl cursor-pointer shadow-sm text-xs md:text-sm font-bold text-[#191919] bg-[#FEE500] hover:bg-[#FDD835] transition-all duration-200 whitespace-nowrap"
                                >
                                    <svg className="w-4 h-4 md:w-5 md:h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 3C6.48 3 2 6.58 2 11C2 13.03 2.94 14.84 4.5 16.19C4.38 16.8 3.5 19 3.5 19C3.5 19 5.75 18.5 7.15 17.5C8.5 18.5 10.2 19 12 19C17.52 19 22 15.42 22 11C22 6.58 17.52 3 12 3Z" />
                                    </svg>
                                    <span>카카오로 시작하기</span>
                                </button>
                                <GoogleLoginButton text="구글로 시작하기" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

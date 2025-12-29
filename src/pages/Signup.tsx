import { Link } from 'react-router-dom';

import GoogleLoginButton from '../components/Login/GoogleLoginButton';

const Signup = () => {
    return (
        <div className="flex justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        회원가입
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        SNS 계정으로 간편하게 가입하세요.
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <GoogleLoginButton />
                    <button
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md cursor-pointer shadow-sm text-sm font-medium text-black bg-[#FEE500] hover:bg-[#FDD835] transition-colors duration-200 gap-3 items-center"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2C6.48 2 2 5.58 2 10C2 12.03 2.94 13.84 4.5 15.19C4.38 15.8 3.5 18 3.5 18C3.5 18 5.75 17.5 7.15 16.5C8.5 17.5 10.2 18 12 18C17.52 18 22 14.42 22 10C22 5.58 17.52 2 12 2Z" />
                        </svg>
                        Kakao로 계속하기
                    </button>

                </div>

                <div className="text-center mt-8">
                    <p className="text-sm text-gray-600">
                        이미 계정이 있으신가요?{' '}
                        <Link to="/login" className="font-medium text-mkOrange hover:text-orange-500">
                            로그인
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;

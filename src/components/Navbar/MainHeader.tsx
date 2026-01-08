import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const MainHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string | null>(null);

  const menuItems = [
    { name: "홈", path: "/" },
    { name: "챗봇 상담하기", path: "/chatbot" },
    { name: "관심 뉴스", path: "/news" },
    { name: "관심 종목 예측", path: "/prediction" }
  ];

  // 1. 화면이 뜰 때(또는 페이지 이동 시) 로컬스토리지에서 로그인 정보 확인
  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    const token = localStorage.getItem('access_token');

    // 토큰과 이름이 모두 있어야 로그인 상태로 인정
    if (token && storedName) {
      setUsername(storedName);
    } else {
      setUsername(null);
    }
  }, [location]); // location이 바뀔 때마다 체크 (로그인 후 홈으로 올 때 갱신 위함)

  // 2. 로그아웃 처리 함수
  const handleLogout = () => {
    // 저장된 정보 삭제
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');

    // 상태 초기화
    setUsername(null);
    navigate('/');
  };

  const AuthButtons = () => (
    username ? (
      <div className="flex items-center gap-2 md:gap-4">
        <Link to="/mypage" className="flex items-center gap-2 group no-underline">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
            {username}님
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-bold text-mkOrange bg-white border-2 border-mkOrange cursor-pointer rounded-full hover:bg-orange-50 transition-colors duration-200"
        >
          로그아웃
        </button>
      </div>
    ) : (
      <Link to="/login">
        <button className="px-5 py-2 text-sm font-bold text-white bg-mkOrange cursor-pointer rounded-full hover:bg-orange-600 transition-colors duration-200">
          로그인
        </button>
      </Link>
    )
  );

  return (
    <header className="bg-white py-5">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row items-center gap-4 md:gap-0">
        <div className="w-full md:w-auto flex justify-between items-center">
          <Link to="/" className="font-black text-3xl font-serif cursor-pointer no-underline text-black">
            Team <span className="text-mkOrange">2</span>
          </Link>

          {/* Mobile Auth */}
          <div className="md:hidden">
            <AuthButtons />
          </div>
        </div>

        <nav className="flex gap-6 md:gap-8 w-full md:w-auto overflow-x-auto whitespace-nowrap pb-2 md:pb-0 scrollbar-hide md:ml-10">
          {menuItems.map((menu) => (
            <Link
              key={menu.name}
              to={menu.path}
              className={`text-lg font-bold no-underline transition-colors shrink-0 ${location.pathname === menu.path ? 'text-mkOrange' : 'text-black hover:text-mkOrange'
                }`}
            >
              {menu.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:block ml-auto">
          <AuthButtons />
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
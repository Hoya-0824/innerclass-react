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

  return (
    <header className="bg-white py-5">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row items-center gap-4 md:gap-0">
        <div className="w-full md:w-auto flex justify-between items-center">
          <Link to="/" className="font-black text-3xl font-serif cursor-pointer no-underline text-black">
            Team <span className="text-mkOrange">2</span>
          </Link>
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

        <div className="hidden md:block ml-auto">
          {username ? (
            <div className="flex items-center gap-4">
              <span className="font-bold text-gray-700">
                {username}님
              </span>
              <button
                onClick={handleLogout}
                className="px-5 py-2 text-sm font-bold text-mkOrange bg-white border-2 border-mkOrange cursor-pointer rounded-full hover:bg-orange-50 transition-colors duration-200"
              >
                로그아웃
              </button>
            </div>
          ) : (
            // [비로그인 상태일 때] : 기존 로그인 버튼
            <Link to="/login">
              <button className="px-5 py-2 text-sm font-bold text-white bg-mkOrange cursor-pointer rounded-full hover:bg-orange-600 transition-colors duration-200">
                로그인
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
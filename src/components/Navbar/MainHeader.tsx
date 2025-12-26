import { Link, useLocation } from 'react-router-dom';

const MainHeader = () => {
  const location = useLocation();
  const menuItems = [
    { name: "홈", path: "/" },
    { name: "챗봇 상담하기", path: "/chatbot" },
    { name: "관심 뉴스", path: "/news" },
    { name: "관심 종목 예측", path: "/prediction" }
  ];

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
          <Link to="/login">
            <button className="px-5 py-2 text-sm font-bold text-white bg-mkOrange cursor-pointer rounded-full hover:bg-orange-600 transition-colors duration-200">
              로그인
            </button>
          </Link>
        </div>
      </div>
    </header >
  );
};

export default MainHeader;
const SubHeader = () => {
  const subMenus = ["마켓홈", "국내증시", "해외증시", "시장지표", "뉴스"];

  return (
    <div className="bg-white border-y border-gray-200 py-3">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">

        {/* 소분류 메뉴 */}
        <nav className="flex items-center gap-5 text-[15px] font-medium text-gray-700 w-full md:w-auto overflow-x-auto whitespace-nowrap pb-2 md:pb-0">
          <div className="text-xl cursor-pointer mr-1 shrink-0">≡</div>
          {subMenus.map((menu) => (
            <a
              key={menu}
              href="#"
              className={`hover:text-black hover:font-bold transition-colors shrink-0 ${menu === '마켓홈' ? 'text-black font-bold' : ''
                }`}
            >
              {menu}
            </a>
          ))}
        </nav>

        {/* 검색창 */}
        <div className="flex border border-gray-300 bg-white px-3 py-1.5 w-full md:w-[300px]">
          <input
            type="text"
            placeholder="종목명 또는 종목코드를 입력하세요."
            className="flex-grow border-none outline-none text-sm placeholder-gray-400"
          />
          <button className="text-mkOrange font-bold bg-transparent border-none cursor-pointer">
            🔍
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubHeader;
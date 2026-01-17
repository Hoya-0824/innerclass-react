import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import MainHeader from './components/Navbar/MainHeader';
import Home from './pages/Home';
import Chatbot from './pages/Chatbot';
import News from './pages/News';
import Prediction from './pages/Prediction';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import GoogleCallback from './pages/GoogleCallback';
import MyPage from './pages/MyPage';
import Footer from './components/Footer/Footer';

const AppContent = () => {
  const location = useLocation();

  const fullScreenPages = ['/login'];
  const isFullScreenPage = fullScreenPages.includes(location.pathname);

  return (
    <div className={`min-h-screen flex flex-col ${isFullScreenPage ? 'bg-white' : 'bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50'}`}>
      <MainHeader />

      {isFullScreenPage ? (
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      ) : (
        <main className="flex-1 pt-24 sm:pt-26">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/news" element={<News />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/oauth/callback/google" element={<GoogleCallback />} />
          </Routes>
          <Footer />
        </main>
      )}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App

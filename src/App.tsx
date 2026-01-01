import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopTicker from './components/Navbar/TopTicker';
import MainHeader from './components/Navbar/MainHeader';
import SubHeader from './components/Navbar/SubHeader';
import Home from './pages/Home';
import Chatbot from './pages/Chatbot';
import News from './pages/News';
import Prediction from './pages/Prediction';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import GoogleCallback from './pages/GoogleCallback';
import MyPage from './pages/MyPage';

function App() {
  return (
    <BrowserRouter>
      <div className='min-h-screen bg-white'>
        <TopTicker />
        <MainHeader />
        <SubHeader />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/news" element={<News />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/oauth/callback/google" element={<GoogleCallback />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App

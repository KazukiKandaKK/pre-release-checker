import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.js';
import Runs from './pages/Runs.js';
import RunDetail from './pages/RunDetail.js';

function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-slate-800 text-white py-4 px-6 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">pre-release-checker</h1>
          <nav className="space-x-4">
            <Link to="/" className="hover:underline">
              設定・実行
            </Link>
            <Link to="/runs" className="hover:underline">
              実行履歴
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:id" element={<RunDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

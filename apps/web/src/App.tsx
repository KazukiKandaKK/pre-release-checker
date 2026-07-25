import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.js';
import Runs from './pages/Runs.js';
import RunDetail from './pages/RunDetail.js';
import Scenarios from './pages/Scenarios.js';
import ScenarioDetail from './pages/ScenarioDetail.js';
import ScenarioRunDetail from './pages/ScenarioRunDetail.js';
import ScenarioForm from './pages/ScenarioForm.js';
import ApiTests from './pages/ApiTests.js';

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
            <Link to="/scenarios" className="hover:underline">
              シナリオ
            </Link>
            <Link to="/api-tests" className="hover:underline">
              API テスト
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/scenarios/new" element={<ScenarioForm />} />
          <Route path="/scenarios/:id" element={<ScenarioDetail />} />
          <Route path="/scenario-runs/:id" element={<ScenarioRunDetail />} />
          <Route path="/api-tests" element={<ApiTests />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

import React, { useState, useEffect, useCallback } from 'react';

// --- KONFIGURASI ---
// URL ini harus menunjuk ke server backend Express.js Anda
const API_BASE_URL = 'http://localhost:3000/api';

// --- KOMPONEN KECIL / HELPERS ---
const formatRupiah = (number) => {
    if (typeof number !== 'number') return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

const Icon = ({ name }) => {
    // Placeholder - Di aplikasi nyata, gunakan library ikon
    const icons = { beranda: '🏠', bayar: '💳', riwayat: '📜', profil: '👤' };
    return <span className="text-2xl">{icons[name] || '?'}</span>;
};

const TransactionItem = ({ tx }) => {
    const isIncome = tx.amount > 0;
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncome ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                    <span className="text-xl">{isIncome ? '⬇️' : '⬆️'}</span>
                </div>
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{tx.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
            </div>
            <p className={`font-semibold ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                {isIncome ? '+' : ''}{formatRupiah(tx.amount)}
            </p>
        </div>
    );
};

// --- API HELPER ---
const apiFetch = async (endpoint, options = {}) => {
    const token = sessionStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Terjadi kesalahan jaringan');
    return data;
};

// --- LAYAR-LAYAR APLIKASI ---

const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('budi');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      sessionStorage.setItem('authToken', data.token);
      sessionStorage.setItem('username', username);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 justify-center">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">Selamat Datang!</h2>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Masuk untuk melanjutkan.</p>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">{error}</div>}
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label htmlFor="login-username" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Nama Pengguna</label>
          <input type="text" id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-200 dark:bg-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div className="mb-6">
          <label htmlFor="login-password" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Kata Sandi</label>
          <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-200 dark:bg-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all" disabled={isLoading}>
          {isLoading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
};

const DashboardScreen = ({ username, onNavigate }) => {
    const [data, setData] = useState({ accounts: [], transactions: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [accounts, transactions] = await Promise.all([
                    apiFetch('/accounts'),
                    apiFetch('/transactions')
                ]);
                setData({ accounts, transactions });
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    if (isLoading) return <div className="flex justify-center items-center h-full"><p className="dark:text-white">Memuat data...</p></div>;
    if (error) return <div className="p-5 text-center text-red-500">Gagal memuat data: {error}</div>;

    const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <div className="overflow-y-auto h-full">
            <header className="flex justify-between items-center p-5">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selamat datang,</p>
                    <h1 className="font-bold text-xl text-gray-900 dark:text-white">{username}</h1>
                </div>
                <button onClick={() => onNavigate('profile')} className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center"><Icon name="profil" /></button>
            </header>
            <main className="px-5 pb-5">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg mb-6">
                    <p className="text-sm opacity-80">Total Saldo Terpadu</p>
                    <p className="text-4xl font-bold mt-2 mb-4">{formatRupiah(totalBalance)}</p>
                </div>
                <section className="mb-6">
                    <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-3">Akun Terhubung</h2>
                    <div className="space-y-3">{data.accounts.map(acc => <div key={acc.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow"><div className="flex items-center gap-4"><div style={{backgroundColor: acc.logoColor || '#ccc'}} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">{acc.name.charAt(0)}</div><div><p className="font-semibold text-gray-900 dark:text-white">{acc.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{acc.type}</p></div></div><p className="font-semibold text-gray-800 dark:text-gray-200">{formatRupiah(acc.balance)}</p></div>)}</div>
                </section>
                <section>
                    <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-3">Transaksi Terakhir</h2>
                    <div className="space-y-3">{data.transactions.slice(0, 3).map(tx => <TransactionItem key={tx.id} tx={tx} />)}</div>
                </section>
            </main>
        </div>
    );
};

const HistoryScreen = () => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const data = await apiFetch('/transactions');
                setTransactions(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="flex flex-col h-full">
            <header className="p-5 border-b dark:border-gray-800 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Riwayat Transaksi</h2>
            </header>
            <main className="flex-grow p-5 space-y-3 overflow-y-auto">
                {isLoading && <p className="text-center dark:text-white">Memuat riwayat...</p>}
                {error && <p className="text-center text-red-500">{error}</p>}
                {!isLoading && !error && transactions.length === 0 && <p className="text-center text-gray-500">Tidak ada transaksi ditemukan.</p>}
                {!isLoading && !error && transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)}
            </main>
        </div>
    );
};

const ProfileScreen = ({ username, onLogout }) => {
    return (
        <div className="flex flex-col h-full">
             <header className="p-5 border-b dark:border-gray-800 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Profil & Pengaturan</h2>
            </header>
            <main className="flex-grow p-5 text-center flex flex-col">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="profil" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{username}</h3>
                <div className="flex-grow mt-8">
                     {/* Placeholder for other settings */}
                </div>
                <button onClick={onLogout} className="w-full mt-8 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg">
                    Keluar
                </button>
            </main>
        </div>
    );
};

const QrisScreen = ({ onNavigate }) => {
    // Di aplikasi nyata, ini akan menggunakan kamera.
    // Ini adalah simulasi UI.
    const handleSimulatePayment = () => {
        alert("Fitur QRIS sedang dalam pengembangan.\nDi aplikasi nyata, ini akan membuka kamera untuk memindai kode QR, kemudian memproses pembayaran melalui backend.");
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-5 border-b dark:border-gray-800 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Bayar dengan QRIS</h2>
            </header>
            <main className="flex-grow p-5 flex flex-col justify-center items-center gap-6">
                <div className="w-64 h-64 bg-gray-800 rounded-2xl relative overflow-hidden shadow-inner flex justify-center items-center">
                    <p className="text-white/50 text-6xl">📷</p>
                </div>
                <p className="text-center text-gray-500 dark:text-gray-400">Posisikan kode QR di dalam area</p>
                <button onClick={handleSimulatePayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">
                    Buka Kamera
                </button>
            </main>
        </div>
    );
};


// --- Komponen Utama Aplikasi ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem('authToken');
      if (token) {
        const storedUsername = sessionStorage.getItem('username');
        setUsername(storedUsername || '');
        setIsLoggedIn(true);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    const storedUsername = sessionStorage.getItem('username');
    setUsername(storedUsername || '');
    setIsLoggedIn(true);
  };
  
  const handleLogout = () => {
    sessionStorage.clear();
    setIsLoggedIn(false);
    setUsername('');
    setActiveScreen('dashboard');
  };

  const renderContent = () => {
    switch (activeScreen) {
        case 'dashboard': return <DashboardScreen username={username} onNavigate={setActiveScreen} />;
        case 'history': return <HistoryScreen />;
        case 'qris': return <QrisScreen onNavigate={setActiveScreen} />;
        case 'profile': return <ProfileScreen username={username} onLogout={handleLogout} />;
        default: return <DashboardScreen username={username} onNavigate={setActiveScreen} />;
    }
  };
  
  const Nav = () => (
      <footer className="sticky bottom-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 p-2">
          <div className="grid grid-cols-4 gap-2 text-center text-gray-500 dark:text-gray-400">
              {['dashboard', 'qris', 'history', 'profile'].map(screen => (
                  <button key={screen} onClick={() => setActiveScreen(screen)} className={`p-2 rounded-lg flex flex-col items-center w-full ${activeScreen === screen ? 'text-blue-600' : ''}`}>
                      <Icon name={screen} />
                      <span className="text-xs font-medium">{screen.charAt(0).toUpperCase() + screen.slice(1)}</span>
                  </button>
              ))}
          </div>
      </footer>
  );

  if (isLoading) {
      return <div className="w-full h-full flex justify-center items-center"><p>Memeriksa sesi...</p></div>;
  }

  return (
    <div className="w-full max-w-sm mx-auto h-[700px] bg-slate-100 dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden ring-4 ring-gray-200 dark:ring-gray-800 flex flex-col">
      <main className="flex-grow overflow-y-auto">
        {isLoggedIn ? renderContent() : <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      </main>
      {isLoggedIn && <Nav />}
    </div>
  );
};

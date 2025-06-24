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

const Icon = ({ name, className = '' }) => {
    // Placeholder - Di aplikasi nyata, gunakan library ikon SVG
    const icons = { beranda: '🏠', bayar: '💳', riwayat: '📜', profil: '👤' };
    return <span className={`text-2xl ${className}`}>{icons[name] || '?'}</span>;
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
    <div className="flex flex-col h-screen w-screen items-center justify-center bg-slate-100 dark:bg-gray-900 p-8">
        <div className="w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-xl p-8">
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
    </div>
  );
};

const DashboardScreen = ({ username }) => {
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
    if (error) return <div className="p-8 text-center text-red-500">Gagal memuat data: {error}</div>;

    const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dasbor</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Kolom Kiri */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8 shadow-lg">
                        <p className="text-lg opacity-80">Total Saldo Terpadu</p>
                        <p className="text-5xl font-bold mt-2 mb-4">{formatRupiah(totalBalance)}</p>
                    </div>
                    <section>
                        <h2 className="font-bold text-2xl text-gray-800 dark:text-gray-200 mb-4">Transaksi Terakhir</h2>
                        <div className="space-y-3">{data.transactions.slice(0, 5).map(tx => <TransactionItem key={tx.id} tx={tx} />)}</div>
                    </section>
                </div>
                {/* Kolom Kanan (Sidebar) */}
                <div className="lg:col-span-1 space-y-8">
                     <section>
                        <h2 className="font-bold text-2xl text-gray-800 dark:text-gray-200 mb-4">Akun Terhubung</h2>
                        <div className="space-y-3">{data.accounts.map(acc => <div key={acc.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow"><div className="flex items-center gap-4"><div style={{backgroundColor: acc.logoColor || '#ccc'}} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">{acc.name.charAt(0)}</div><div><p className="font-semibold text-gray-900 dark:text-white">{acc.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{acc.type}</p></div></div><p className="font-semibold text-gray-800 dark:text-gray-200">{formatRupiah(acc.balance)}</p></div>)}</div>
                    </section>
                </div>
            </div>
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
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Riwayat Transaksi</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="space-y-3">
                    {isLoading && <p className="text-center dark:text-white">Memuat riwayat...</p>}
                    {error && <p className="text-center text-red-500">{error}</p>}
                    {!isLoading && !error && transactions.length === 0 && <p className="text-center text-gray-500">Tidak ada transaksi ditemukan.</p>}
                    {!isLoading && !error && transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)}
                </div>
            </div>
        </div>
    );
};

const ProfileScreen = ({ username, onLogout }) => {
     return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profil & Pengaturan</h1>
             <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="profil" className="text-4xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">{username}</h3>
                <button onClick={onLogout} className="w-full mt-8 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg">
                    Keluar
                </button>
            </div>
        </div>
    );
};

const QrisScreen = () => {
    const handleSimulatePayment = () => {
        alert("Fitur QRIS sedang dalam pengembangan.\nDi aplikasi nyata, ini akan membuka kamera untuk memindai kode QR, kemudian memproses pembayaran melalui backend.");
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Bayar dengan QRIS</h1>
            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-8 flex flex-col items-center">
                 <div className="w-64 h-64 bg-gray-800 dark:bg-black rounded-2xl relative overflow-hidden shadow-inner flex justify-center items-center">
                    <p className="text-white/50 text-6xl">📷</p>
                </div>
                <p className="text-center text-gray-500 dark:text-gray-400 mt-6 mb-6">Posisikan kode QR di dalam area</p>
                <button onClick={handleSimulatePayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">
                    Buka Kamera
                </button>
            </div>
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
        case 'dashboard': return <DashboardScreen username={username} />;
        case 'history': return <HistoryScreen />;
        case 'qris': return <QrisScreen />;
        case 'profile': return <ProfileScreen username={username} onLogout={handleLogout} />;
        default: return <DashboardScreen username={username} />;
    }
  };
  
  const Nav = () => (
      <aside className="w-64 bg-white dark:bg-gray-800 p-6 flex flex-col shadow-lg">
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-500 mb-10">DompetKu</h2>
          <nav className="flex flex-col space-y-4">
              {[{id: 'dashboard', name: 'Beranda'}, {id: 'qris', name: 'Bayar'}, {id: 'history', name: 'Riwayat'}, {id: 'profile', name: 'Profil'}].map(screen => (
                  <button key={screen.id} onClick={() => setActiveScreen(screen.id)} className={`p-3 rounded-lg flex items-center gap-4 text-left ${activeScreen === screen.id ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      <Icon name={screen.id} />
                      <span className="text-lg font-medium">{screen.name}</span>
                  </button>
              ))}
          </nav>
      </aside>
  );

  if (isLoading) {
      return <div className="w-screen h-screen flex justify-center items-center bg-slate-100"><p>Memeriksa sesi...</p></div>;
  }

  if (!isLoggedIn) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="w-screen h-screen bg-slate-100 dark:bg-gray-900 flex">
      <Nav />
      <main className="flex-grow overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

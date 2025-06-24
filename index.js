// Import library yang dibutuhkan
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// --- INISIALISASI ---
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
// Mengizinkan request dari domain lain (frontend Anda)
app.use(cors()); 
// Mengizinkan Express untuk membaca body request dalam format JSON
app.use(express.json()); 

// Middleware untuk verifikasi token JWT
const authenticateToken = (req, res, next) => {
    // Ambil token dari header Authorization
    const authHeader = req.headers['authorization'];
    // Token akan dalam format "Bearer <TOKEN>"
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // Jika tidak ada token, kirim status Unauthorized
        return res.status(401).json({ message: "Akses ditolak. Token tidak ditemukan." });
    }

    // Verifikasi token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Jika token tidak valid (misal: sudah expired), kirim status Forbidden
            return res.status(403).json({ message: "Token tidak valid." });
        }
        // Jika valid, simpan informasi user dari token ke dalam object request
        req.user = user;
        next(); // Lanjutkan ke handler rute berikutnya
    });
};


// --- RUTE API (ENDPOINTS) ---

// === Rute Autentikasi ===

// Rute untuk registrasi pengguna baru
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validasi input dasar
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    try {
        // Hash kata sandi sebelum disimpan ke database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat user baru di database
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash: hashedPassword,
            },
        });

        // Jangan kirim hash password kembali ke client
        const { passwordHash, ...userWithoutPassword } = newUser;
        res.status(201).json({ message: "Registrasi berhasil!", user: userWithoutPassword });

    } catch (error) {
        // Tangani error jika username atau email sudah ada (unique constraint)
        if (error.code === 'P2002') {
            return res.status(409).json({ message: `Registrasi gagal. ${error.meta.target[0]} sudah digunakan.` });
        }
        // Tangani error lainnya
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: error.message });
    }
});

// Rute untuk login pengguna
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Cari pengguna berdasarkan username
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: "Username atau password salah." });
        }

        // Bandingkan password yang diberikan dengan hash di database
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Username atau password salah." });
        }

        // Jika password valid, buat token JWT
        const tokenPayload = { userId: user.id, username: user.username };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' }); // Token berlaku 1 hari

        res.json({ message: "Login berhasil!", token });

    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: error.message });
    }
});


// === Rute Terproteksi (Membutuhkan Token) ===

// Rute untuk mendapatkan semua akun milik pengguna yang login
app.get('/api/accounts', authenticateToken, async (req, res) => {
    try {
        const accounts = await prisma.account.findMany({
            where: { userId: req.user.userId }
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data akun.", error: error.message });
    }
});

// Rute untuk mendapatkan riwayat transaksi pengguna yang login
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user.userId },
            orderBy: { date: 'desc' } // Urutkan dari yang terbaru
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil riwayat transaksi.", error: error.message });
    }
});

// Rute untuk memproses pembayaran QRIS
app.post('/api/transactions/qris', authenticateToken, async (req, res) => {
    const { amount, merchantName, sourceAccountId } = req.body;
    const userId = req.user.userId;

    if (!amount || !merchantName || !sourceAccountId) {
        return res.status(400).json({ message: "Detail pembayaran tidak lengkap." });
    }

    try {
        // Gunakan transaksi database untuk memastikan semua operasi berhasil atau semua gagal (atomicity)
        const result = await prisma.$transaction(async (tx) => {
            // 1. Ambil data akun dan pastikan milik pengguna yang benar
            const sourceAccount = await tx.account.findUnique({
                where: { id: sourceAccountId }
            });

            if (!sourceAccount || sourceAccount.userId !== userId) {
                throw new Error("Akun sumber tidak valid atau bukan milik Anda.");
            }
            
            // 2. Cek apakah saldo mencukupi
            if (sourceAccount.balance < amount) {
                throw new Error("Saldo tidak mencukupi untuk melakukan transaksi.");
            }

            // 3. Kurangi saldo dari akun sumber
            const updatedAccount = await tx.account.update({
                where: { id: sourceAccountId },
                data: { balance: { decrement: amount } }
            });

            // 4. Catat transaksi baru
            const newTransaction = await tx.transaction.create({
                data: {
                    userId: userId,
                    name: `Pembayaran QRIS: ${merchantName}`,
                    amount: -amount // Jumlah pengeluaran dibuat negatif
                }
            });

            return { updatedAccount, newTransaction };
        });

        res.status(201).json({ message: "Pembayaran berhasil!", data: result });

    } catch (error) {
        // Kirim response error sesuai dengan pesan error yang dilempar dari dalam transaksi
        res.status(400).json({ message: "Transaksi gagal.", error: error.message });
    }
});


// --- Menjalankan Server ---
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

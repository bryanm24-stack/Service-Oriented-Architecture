<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - SOA Financial App</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">
    <div class="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <h2 class="text-2xl font-bold text-center mb-6 text-yellow-400">Daftar Akun Baru</h2>
        
        <div id="alertBox" class="hidden mb-4 p-3 rounded text-sm"></div>

        <form id="registerForm" class="space-y-4">
            @csrf
            <div>
                <label class="block text-sm font-medium mb-1">Nama Lengkap</label>
                <input type="text" id="name" required class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-yellow-400" placeholder="Nama Anda">
            </div>

            <div>
                <label class="block text-sm font-medium mb-1">Email</label>
                <input type="email" id="email" required class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-yellow-400" placeholder="nama@email.com">
            </div>

            <div>
                <label class="block text-sm font-medium mb-1">Password (Min. 8 Karakter)</label>
                <input type="password" id="password" required class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-yellow-400" placeholder="••••••••">
            </div>

            <div>
                <label class="block text-sm font-medium mb-1">Konfirmasi Password</label>
                <div class="relative">
                    <input type="password" id="konfirmasi_password" required class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-yellow-400 pr-16" placeholder="••••••••">
                    <button type="button" id="togglePassword" class="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white">Lihat</button>
                </div>
            </div>

            <button type="submit" id="submitBtn" class="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded transition duration-200">
                Daftar
            </button>
        </form>

        <p class="mt-4 text-center text-sm text-gray-400">
            Sudah punya akun? <a href="/login" class="text-yellow-400 hover:underline">Login di sini</a>
        </p>
    </div>

    <script>
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('konfirmasi_password');
        const registerForm = document.getElementById('registerForm');
        const alertBox = document.getElementById('alertBox');

        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            confirmInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? 'Lihat' : 'Sembunyikan';
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            alertBox.className = 'hidden mb-4 p-3 rounded text-sm';

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const konfirmasi_password = confirmInput.value;

            if (password !== konfirmasi_password) {
                alertBox.textContent = 'Password dan Konfirmasi Password tidak cocok.';
                alertBox.className = 'mb-4 p-3 bg-red-500/20 border border-red-500 text-red-300 rounded text-sm';
                return;
            }

            try {
                // Sesuaikan port backend Express Anda jika berbeda (misal: 3000)
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password, konfirmasi_password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Terjadi kesalahan saat registrasi.');
                }

                alertBox.textContent = 'Registrasi berhasil! Mengarahkan ke halaman login...';
                alertBox.className = 'mb-4 p-3 bg-green-500/20 border border-green-500 text-green-300 rounded text-sm';
                
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } catch (err) {
                alertBox.textContent = err.message;
                alertBox.className = 'mb-4 p-3 bg-red-500/20 border border-red-500 text-red-300 rounded text-sm';
            }
        });
    </script>
</body>
</html>
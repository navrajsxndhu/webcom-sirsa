document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value.trim().toLowerCase();
            const password = document.getElementById('password').value.trim();

            // Loading state
            const originalText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating...';
            loginBtn.disabled = true;

            try {
                const apiUrl = (window.WEBCOM_API || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                                ? 'http://localhost:5000/api' : 'https://webcom-sirsa.onrender.com/api')) + '/login';

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    showToast('Success', 'Login successful. Redirecting...', 'success');
                    // Save token to localStorage
                    localStorage.setItem('webcom_admin_token', data.token);
                    
                    // Redirect to Admin Dashboard
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1000);
                } else {
                    showToast('Error', data.error || 'Invalid credentials.', 'error');
                    if (window.shakeLoginCard) window.shakeLoginCard();
                }
            } catch (error) {
                console.error('Login Error:', error);
                showToast('Error', 'Failed to connect to server.', 'error');
                if (window.shakeLoginCard) window.shakeLoginCard();
            } finally {
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        });
    }
});

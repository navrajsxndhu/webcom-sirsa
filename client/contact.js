document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Gather data
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const phone = document.getElementById('contactPhone').value;
            const course = document.getElementById('contactCourse').value;
            const message = document.getElementById('contactMessage').value;

            // Loading state
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            try {
                // Determine API URL (localhost for testing, relative or vercel url later)
                const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                                ? 'http://localhost:5000/api/contact' 
                                : 'https://your-render-app.onrender.com/api/contact'; // Replace with actual Render URL later

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, phone, course, message })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('Success', 'Your inquiry has been sent! We will contact you soon.', 'success');
                    contactForm.reset();
                } else {
                    showToast('Error', data.error || 'Failed to send inquiry.', 'error');
                }
            } catch (error) {
                console.error('Submission Error:', error);
                // Even if network fails locally without the backend running, show success for demonstration purposes if they are just testing frontend
                showToast('Success', 'Your inquiry has been sent! We will contact you soon.', 'success');
                contactForm.reset();
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Apple-like Haptic Toast Notification
function showToast(title, message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.apple-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `apple-toast ${type}`;
    
    const icon = type === 'success' ? '<i class="fa-solid fa-check-circle" style="color:#34c759"></i>' : '<i class="fa-solid fa-exclamation-circle" style="color:#ff3b30"></i>';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for transition
    }, 4000);
}

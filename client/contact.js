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
                                : 'https://webcom-sirsa.onrender.com/api/contact';

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
                showToast('Error', 'Failed to connect to server. Please try again or contact us directly.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

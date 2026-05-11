document.addEventListener('DOMContentLoaded', () => {
    // --- CUSTOM SELECT LOGIC ---
    const trigger = document.getElementById('courseTrigger');
    const options = document.getElementById('courseOptions');
    const hiddenInput = document.getElementById('contactCourse');
    const allOptions = document.querySelectorAll('.custom-option');

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            options.classList.toggle('open');
            trigger.classList.toggle('active');
        });

        allOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                const val = opt.getAttribute('data-value');
                const text = opt.innerText;

                hiddenInput.value = val;
                trigger.querySelector('span').innerText = text;
                
                allOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                
                options.classList.remove('open');
                trigger.classList.remove('active');
            });
        });

        document.addEventListener('click', () => {
            options.classList.remove('open');
            trigger.classList.remove('active');
        });
    }

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
                // Determine API URL
                const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                    ? 'http://localhost:5000/api' 
                    : (window.location.origin.includes('vercel.app') 
                        ? 'https://webcom-sirsa.onrender.com/api' 
                        : window.location.origin + '/api');

                const response = await fetch(`${API_BASE}/contact`, {
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
                    // Reset custom select
                    if (trigger) {
                        trigger.querySelector('span').innerText = 'Choose a Course';
                        allOptions.forEach(o => o.classList.remove('selected'));
                    }
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

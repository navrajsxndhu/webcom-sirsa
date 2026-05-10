document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('webcom_admin_token');
    if(!token) return;

    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                    ? 'http://localhost:5000/api' : 'https://webcom-sirsa.onrender.com/api';

    // --- NAVIGATION LOGIC ---
    const navBtns = document.querySelectorAll('.nav-btn[data-target]');
    const panels = document.querySelectorAll('.panel');

    // Restore active tab
    const savedTab = sessionStorage.getItem('adminActiveTab') || 'overview-panel';

    navBtns.forEach(btn => {
        // Initialize the correct tab
        if (btn.getAttribute('data-target') === savedTab) {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panels.forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById(savedTab);
            if(targetPanel) targetPanel.classList.add('active');
        }

        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const target = btn.getAttribute('data-target');
            sessionStorage.setItem('adminActiveTab', target);

            panels.forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById(target);
            if(targetPanel) targetPanel.classList.add('active');
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('webcom_admin_token');
        window.location.href = 'login.html';
    });

    // --- QUICK ACTION HELPERS ---
    window.showPanel = (targetId) => {
        const fullTarget = targetId.endsWith('-panel') ? targetId : targetId + '-panel';
        navBtns.forEach(btn => {
            if (btn.getAttribute('data-target') === fullTarget) {
                btn.click();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };

    function updateGreeting() {
        const hour = new Date().getHours();
        let greeting = "Good Morning";
        if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
        if (hour >= 17) greeting = "Good Evening";
        
        const welcomeEl = document.getElementById('welcomeMessage');
        if (welcomeEl) {
            welcomeEl.innerHTML = `${greeting}, Director! Here is what's happening with <strong>Webcom Sirsa</strong> today.`;
        }
    }
    updateGreeting();

    // --- FETCH DATA ---
    let globalData = { settings: {}, courses: [], gallery: [], staff: [], testimonials: [], eventVideos: [] };
    let globalInquiries = [];

    async function fetchDashboardData() {
        try {
            // Fetch public DB data (Courses/Gallery)
            const resData = await fetch(`${API_BASE}/data`);
            globalData = await resData.json();

            // Fetch Protected Inquiries
            const resInq = await fetch(`${API_BASE}/inquiries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if(resInq.ok) {
                globalInquiries = await resInq.json();
            } else {
                if(resInq.status === 401 || resInq.status === 403) {
                    localStorage.removeItem('webcom_admin_token');
                    window.location.href = 'login.html';
                }
            }

            renderDashboard();



        } catch(e) {
            console.error("Failed to load CMS data", e);
            showToast('Error', 'Failed to load data from server', 'error');
        }
    }

    // --- UTILS ---


    // --- DELETE EVENT VIDEO ---
    window.deleteEventVideo = async (videoId) => {
        if (!confirm('Are you sure you want to remove this video from the homepage?')) return;

        try {
            const vidIdx = globalData.eventVideos.findIndex(v => v.id === videoId);
            if (vidIdx !== -1) {
                globalData.eventVideos[vidIdx].url = null; // Clear the URL
            }

            const saveRes = await fetch(`${API_BASE}/event-videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ eventVideos: globalData.eventVideos })
            });

            if (saveRes.ok) {
                showToast('Success', 'Video removed successfully!', 'success');
                renderDashboard();
            } else {
                throw new Error('Failed to remove video');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', error.message, 'error');
        }
    };

    // --- RENDER LOGIC ---
    function renderDashboard() {
        // Overview Stats
        document.getElementById('statCourses').innerText = globalData.courses.length;
        document.getElementById('statGallery').innerText = globalData.gallery.length;
        document.getElementById('statInquiries').innerText = globalInquiries.length;

        // Render Settings
        if (globalData.settings) {
            if(document.getElementById('setPhone')) document.getElementById('setPhone').value = globalData.settings.phone || '';
            if(document.getElementById('setWhatsapp')) document.getElementById('setWhatsapp').value = globalData.settings.whatsapp || '';
            if(document.getElementById('setEmail')) document.getElementById('setEmail').value = globalData.settings.email || '';
            if(document.getElementById('setAddress')) document.getElementById('setAddress').value = globalData.settings.address || '';
            if(document.getElementById('setInstagram')) document.getElementById('setInstagram').value = globalData.settings.instagram || '';
            if(document.getElementById('setYoutube')) document.getElementById('setYoutube').value = globalData.settings.youtube || '';
        }

        // Render Inquiries Table
        const inqBody = document.getElementById('inquiriesTableBody');
        inqBody.innerHTML = '';
        if(globalInquiries.length === 0) {
            inqBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No student inquiries yet.</td></tr>';
        } else {
            globalInquiries.forEach(inq => {
                const date = new Date(inq.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                inqBody.innerHTML += `
                    <tr>
                        <td class="text-muted"><small>${date}</small></td>
                        <td class="fw-bold">${inq.name}</td>
                        <td>${inq.phone}<br><small class="text-muted">${inq.email}</small></td>
                        <td><span class="badge badge-course">${inq.course}</span></td>
                        <td><small>${inq.message || '-'}</small></td>
                    </tr>
                `;
            });
        }

        // Render Courses Table
        const coursesBody = document.getElementById('coursesTableBody');
        coursesBody.innerHTML = '';
        globalData.courses.forEach((course, index) => {
            coursesBody.innerHTML += `
                <tr>
                    <td><span class="badge badge-course me-2"><i class="fa-solid ${course.icon}"></i></span> <span class="fw-bold">${course.title}</span></td>
                    <td><input type="text" class="form-control mb-0 course-price" data-index="${index}" value="${course.price}"></td>
                    <td><input type="text" class="form-control mb-0 course-duration" data-index="${index}" value="${course.duration}"></td>
                </tr>
            `;
        });

        // Render Staff Table
        const staffBody = document.getElementById('staffTableBody');
        staffBody.innerHTML = '';
        globalData.staff.forEach((member, index) => {
            staffBody.innerHTML += `
                <tr>
                    <td><input type="text" class="form-control mb-0 staff-name" data-index="${index}" value="${member.name}"></td>
                    <td><input type="text" class="form-control mb-0 staff-role" data-index="${index}" value="${member.role}"></td>
                    <td><input type="text" class="form-control mb-0 staff-bio" data-index="${index}" value="${member.bio}"></td>
                    <td><button class="btn btn-outline-danger btn-sm delete-staff-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        });

        // Render Testimonials Table
        const testimonialsBody = document.getElementById('testimonialsTableBody');
        testimonialsBody.innerHTML = '';
        globalData.testimonials.forEach((testimonial, index) => {
            testimonialsBody.innerHTML += `
                <tr>
                    <td><input type="text" class="form-control mb-0 t-student" data-index="${index}" value="${testimonial.student}"></td>
                    <td><input type="text" class="form-control mb-0 t-score" data-index="${index}" value="${testimonial.score}"></td>
                    <td><input type="text" class="form-control mb-0 t-review" data-index="${index}" value="${testimonial.review}"></td>
                    <td><button class="btn btn-outline-danger btn-sm delete-test-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        });
    }

    // --- UPDATE COURSES ---
    document.getElementById('saveCoursesBtn').addEventListener('click', async (e) => {
        const btn = e.target;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Publishing...';
        btn.disabled = true;
        
        const priceInputs = document.querySelectorAll('.course-price');
        const durationInputs = document.querySelectorAll('.course-duration');

        priceInputs.forEach(input => {
            const idx = input.getAttribute('data-index');
            globalData.courses[idx].price = input.value;
        });

        durationInputs.forEach(input => {
            const idx = input.getAttribute('data-index');
            globalData.courses[idx].duration = input.value;
        });

        try {
            const res = await fetch(`${API_BASE}/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ courses: globalData.courses })
            });

            if(res.ok) {
                showToast('Success', 'Live website updated instantly!', 'success');
            } else {
                showToast('Error', 'Failed to publish changes.', 'error');
            }
        } catch(e) {
            showToast('Error', 'Network connection failed.', 'error');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    });

    // --- UPDATE SETTINGS ---
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveSettingsBtn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Saving...';
            btn.disabled = true;

            const newSettings = {
                phone: document.getElementById('setPhone').value,
                whatsapp: document.getElementById('setWhatsapp').value,
                email: document.getElementById('setEmail').value,
                address: document.getElementById('setAddress').value,
                instagram: document.getElementById('setInstagram').value,
                youtube: document.getElementById('setYoutube').value
            };

            try {
                const res = await fetch(`${API_BASE}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ settings: newSettings })
                });

                if(res.ok) {
                    globalData.settings = newSettings;
                    showToast('Success', 'Contact Settings updated globally!', 'success');
                } else {
                    showToast('Error', 'Failed to save settings.', 'error');
                }
            } catch(err) {
                showToast('Error', 'Network connection failed.', 'error');
            } finally {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        });
    }

    // --- UPDATE STAFF ---
    document.getElementById('saveStaffBtn').addEventListener('click', async (e) => {
        const btn = e.target;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Publishing...';
        btn.disabled = true;

        document.querySelectorAll('.staff-name').forEach(input => globalData.staff[input.getAttribute('data-index')].name = input.value);
        document.querySelectorAll('.staff-role').forEach(input => globalData.staff[input.getAttribute('data-index')].role = input.value);
        document.querySelectorAll('.staff-bio').forEach(input => globalData.staff[input.getAttribute('data-index')].bio = input.value);

        try {
            const res = await fetch(`${API_BASE}/staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ staff: globalData.staff })
            });
            if(res.ok) showToast('Success', 'Staff updated instantly!', 'success');
            else showToast('Error', 'Failed to publish changes.', 'error');
        } catch(e) { showToast('Error', 'Network connection failed.', 'error'); }
        finally { btn.innerHTML = originalHtml; btn.disabled = false; }
    });

    // --- UPDATE TESTIMONIALS ---
    document.getElementById('saveTestimonialsBtn').addEventListener('click', async (e) => {
        const btn = e.target;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Publishing...';
        btn.disabled = true;

        document.querySelectorAll('.t-student').forEach(input => globalData.testimonials[input.getAttribute('data-index')].student = input.value);
        document.querySelectorAll('.t-score').forEach(input => globalData.testimonials[input.getAttribute('data-index')].score = input.value);
        document.querySelectorAll('.t-review').forEach(input => globalData.testimonials[input.getAttribute('data-index')].review = input.value);

        try {
            const res = await fetch(`${API_BASE}/testimonials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ testimonials: globalData.testimonials })
            });
            if(res.ok) showToast('Success', 'Testimonials updated instantly!', 'success');
            else showToast('Error', 'Failed to publish changes.', 'error');
        } catch(e) { showToast('Error', 'Network connection failed.', 'error'); }
        finally { btn.innerHTML = originalHtml; btn.disabled = false; }
    });

    // --- CROPPER LOGIC ---
    let cropper;
    let currentFileInput;
    let croppedBlobMap = new Map(); // Store blob mapped by input element id
    
    const cropperModal = document.getElementById('cropperModal');
    const cropperImage = document.getElementById('cropperImage');
    
    function initCropper(fileInput, aspectRatio = 1) {
        if(fileInput.files && fileInput.files[0]) {
            currentFileInput = fileInput;
            const reader = new FileReader();
            reader.onload = (e) => {
                cropperImage.src = e.target.result;
                cropperModal.classList.add('active');
                
                if(cropper) cropper.destroy();
                cropper = new Cropper(cropperImage, {
                    aspectRatio: aspectRatio,
                    viewMode: 1,
                    background: false
                });
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    }

    document.getElementById('btnCancelCrop').addEventListener('click', () => {
        cropperModal.classList.remove('active');
        if(currentFileInput) currentFileInput.value = ''; // Reset input
        if(cropper) { cropper.destroy(); cropper = null; }
    });

    document.getElementById('btnConfirmCrop').addEventListener('click', () => {
        if(cropper) {
            // For free-form gallery, we might not want to force 800x800 if it's rectangular
            // But getCroppedCanvas() without params gives original resolution which is fine
            cropper.getCroppedCanvas({
                maxWidth: 1600,
                maxHeight: 1600
            }).toBlob((blob) => {
                croppedBlobMap.set(currentFileInput.id, blob);
                cropperModal.classList.remove('active');
                cropper.destroy();
                cropper = null;
                showToast('Success', 'Image cropped successfully!', 'success');
            }, 'image/jpeg', 0.9);
        }
    });

    document.getElementById('newStaffPhoto').addEventListener('change', function() { initCropper(this, 1); });
    document.getElementById('newTestPhoto').addEventListener('change', function() { initCropper(this, 1); });
    document.getElementById('fileInput').addEventListener('change', function() { initCropper(this, NaN); }); // NaN for free-form gallery images

    // --- UPLOAD GALLERY PHOTO ---
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.querySelector('#uploadForm button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Uploading...';
        btn.disabled = true;

        const fileInput = document.getElementById('fileInput');
        const fileBlob = croppedBlobMap.get('fileInput') || fileInput.files[0];
        const formData = new FormData();
        formData.append('file', fileBlob, 'gallery.jpg');

        try {
            const uploadRes = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            if(!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

            const newImg = { id: Date.now(), url: uploadData.url };
            globalData.gallery.push(newImg);

            const saveRes = await fetch(`${API_BASE}/gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ gallery: globalData.gallery })
            });

            if(saveRes.ok) {
                showToast('Success', 'Photo added to Gallery!', 'success');
                document.getElementById('uploadForm').reset();
                croppedBlobMap.delete('fileInput');
                renderDashboard();
            } else throw new Error('Failed to save gallery');
        } catch(err) {
            console.error(err);
            showToast('Error', err.message, 'error');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    });

    // --- ADD NEW STAFF & UPLOAD PHOTO ---
    document.getElementById('addStaffForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('addStaffSubmitBtn');
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Uploading...';
        btn.disabled = true;

        const fileInput = document.getElementById('newStaffPhoto');
        const fileBlob = croppedBlobMap.get('newStaffPhoto') || fileInput.files[0];
        const formData = new FormData();
        formData.append('file', fileBlob, 'staff.jpg');

        try {
            // 1. Upload Photo
            const uploadRes = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            
            if(!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

            // 2. Push new staff to array
            const newStaff = {
                id: Date.now(),
                name: document.getElementById('newStaffName').value,
                role: document.getElementById('newStaffRole').value,
                bio: document.getElementById('newStaffBio').value,
                photo: uploadData.url // Use the returned URL
            };

            globalData.staff.push(newStaff);

            // 3. Save to backend
            const saveRes = await fetch(`${API_BASE}/staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ staff: globalData.staff })
            });

            if(saveRes.ok) {
                showToast('Success', 'New staff member added!', 'success');
                document.getElementById('addStaffForm').reset();
                croppedBlobMap.delete('newStaffPhoto');
                renderDashboard();
            } else {
                throw new Error('Failed to save staff data');
            }
        } catch(err) {
            console.error(err);
            showToast('Error', err.message, 'error');
        } finally {
            btn.innerHTML = 'Add Staff Member';
            btn.disabled = false;
        }
    });

    // --- ADD NEW TESTIMONIAL & UPLOAD PHOTO ---
    document.getElementById('addTestimonialForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('addTestSubmitBtn');
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Uploading...';
        btn.disabled = true;

        const fileInput = document.getElementById('newTestPhoto');
        const fileBlob = croppedBlobMap.get('newTestPhoto') || (fileInput.files.length > 0 ? fileInput.files[0] : null);
        
        try {
            let photoUrl = null;

            if (fileBlob) {
                const formData = new FormData();
                formData.append('file', fileBlob, 'testimonial.jpg');

                // 1. Upload Photo
                const uploadRes = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                
                if(!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
                photoUrl = uploadData.url;
            }

            // 2. Push new testimonial
            const newTest = {
                id: Date.now(),
                student: document.getElementById('newTestStudent').value,
                score: document.getElementById('newTestScore').value,
                review: document.getElementById('newTestReview').value,
                photo: photoUrl, // Use the uploaded photo URL or null
                videoUrl: document.getElementById('newTestVideo').value || null // Optional video link
            };

            globalData.testimonials.push(newTest);

            // 3. Save
            const saveRes = await fetch(`${API_BASE}/testimonials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ testimonials: globalData.testimonials })
            });

            if(saveRes.ok) {
                showToast('Success', photoUrl ? 'Testimonial added with photo!' : 'Testimonial added (No photo)!', 'success');
                document.getElementById('addTestimonialForm').reset();
                croppedBlobMap.delete('newTestPhoto');
                renderDashboard();
            } else {
                throw new Error('Failed to save testimonials');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', error.message, 'error');
        } finally {
            btn.innerHTML = 'Add Testimonial';
            btn.disabled = false;
        }
    });

    // --- DELETE LOGIC (Event Delegation) ---
    document.addEventListener('click', async (e) => {
        // Delete Staff
        const staffBtn = e.target.closest('.delete-staff-btn');
        if(staffBtn) {
            const idx = staffBtn.getAttribute('data-index');
            globalData.staff.splice(idx, 1);
            
            try {
                await fetch(`${API_BASE}/staff`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ staff: globalData.staff })
                });
                showToast('Success', 'Staff member removed.', 'success');
                renderDashboard();
            } catch(err) { showToast('Error', 'Failed to remove staff.', 'error'); }
        }

        // Delete Testimonial
        const testBtn = e.target.closest('.delete-test-btn');
        if(testBtn) {
            const idx = testBtn.getAttribute('data-index');
            globalData.testimonials.splice(idx, 1);
            
            try {
                await fetch(`${API_BASE}/testimonials`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ testimonials: globalData.testimonials })
                });
                showToast('Success', 'Testimonial removed.', 'success');
                renderDashboard();
            } catch(err) { showToast('Error', 'Failed to remove testimonial.', 'error'); }
        }
    });

    // --- CHANGE CREDENTIALS ---


    // --- UPLOAD EVENT VIDEOS ---
    async function handleVideoUpload(formId, inputId, videoId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById(inputId);
            if (!fileInput.files[0]) {
                showToast('Error', 'Please select a video file first.', 'error');
                return;
            }

            const btn = form.querySelector('button');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Uploading Video...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                // 1. Upload file
                const uploadRes = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();

                if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

                // 2. Update data.json
                const vidIdx = globalData.eventVideos.findIndex(v => v.id === videoId);
                if (vidIdx !== -1) {
                    globalData.eventVideos[vidIdx].url = uploadData.url;
                } else {
                    globalData.eventVideos.push({ id: videoId, url: uploadData.url });
                }

                const saveRes = await fetch(`${API_BASE}/event-videos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ eventVideos: globalData.eventVideos })
                });

                if (saveRes.ok) {
                    showToast('Success', 'Video updated successfully!', 'success');
                    fileInput.value = '';
                    renderDashboard();
                } else {
                    throw new Error('Failed to save video settings');
                }
            } catch (error) {
                console.error(error);
                showToast('Error', error.message, 'error');
            } finally {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        });
    }

    handleVideoUpload('uploadVideo1Form', 'video1Input', 1);
    handleVideoUpload('uploadVideo2Form', 'video2Input', 2);

    window.deleteEventVideo = async function(videoId) {
        if(!confirm('Are you sure you want to delete this video?')) return;
        
        const vidIdx = globalData.eventVideos.findIndex(v => v.id === videoId);
        if (vidIdx !== -1) {
            globalData.eventVideos[vidIdx].url = null;
        }

        try {
            const saveRes = await fetch(`${API_BASE}/event-videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ eventVideos: globalData.eventVideos })
            });

            if (saveRes.ok) {
                showToast('Success', 'Video removed successfully!', 'success');
                renderDashboard();
            } else {
                throw new Error('Failed to remove video');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', error.message, 'error');
        }
    };

    // Init
    fetchDashboardData();
});

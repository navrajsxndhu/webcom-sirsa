document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('webcom_admin_token');
    if(!token) return;

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = isLocal 
                    ? 'http://localhost:5000/api' 
                    : 'https://webcom-sirsa.onrender.com/api';

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
    let globalData = { settings: {}, courses: [], gallery: [], staff: [], testimonials: [] };
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


    

    window.deleteGalleryPhoto = async (index) => {
        if (!confirm('Are you sure you want to delete this photo from the gallery?')) return;
        
        try {
            globalData.gallery.splice(index, 1);
            const res = await fetch(`${API_BASE}/gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ gallery: globalData.gallery })
            });

            if (res.ok) {
                showToast('Success', 'Photo removed successfully!', 'success');
                renderDashboard();
            } else {
                throw new Error('Failed to update gallery');
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
            if(document.getElementById('setFacebook')) document.getElementById('setFacebook').value = globalData.settings.facebook || '';
            if(document.getElementById('setChannel')) document.getElementById('setChannel').value = globalData.settings.channel || '';
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

        // 4. Staff
        const staffBody = document.getElementById('staffTableBody');
        staffBody.innerHTML = '';
        globalData.staff.forEach((member, index) => {
            let photoUrl = resolveWebcomImageUrl(member.photo);

            staffBody.innerHTML += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <img src="${photoUrl}" class="rounded-circle" width="40" height="40" style="object-fit:cover; border: 1px solid rgba(255,255,255,0.1);" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}'">
                            <input type="text" class="form-control mb-0 s-name" data-index="${index}" value="${member.name}">
                        </div>
                    </td>
                    <td><input type="text" class="form-control mb-0 staff-role" data-index="${index}" value="${member.role}"></td>
                    <td><input type="text" class="form-control mb-0 staff-bio" data-index="${index}" value="${member.bio}"></td>
                    <td><button class="btn btn-outline-danger btn-sm delete-staff-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        });

        // 5. Testimonials
        const testimonialsBody = document.getElementById('testimonialsTableBody');
        testimonialsBody.innerHTML = '';
        globalData.testimonials.forEach((testimonial, index) => {
            let photoUrl = resolveWebcomImageUrl(testimonial.photo);

            testimonialsBody.innerHTML += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            ${photoUrl ? `<img src="${photoUrl}" class="rounded" width="40" height="40" style="object-fit:cover; border: 1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'">` : '<div class="bg-secondary rounded" style="width:40px; height:40px;"></div>'}
                            <input type="text" class="form-control mb-0 t-student" data-index="${index}" value="${testimonial.student}">
                        </div>
                    </td>
                    <td><input type="text" class="form-control mb-0 t-score" data-index="${index}" value="${testimonial.score}"></td>
                    <td><input type="text" class="form-control mb-0 t-review" data-index="${index}" value="${testimonial.review}"></td>
                    <td><button class="btn btn-outline-danger btn-sm delete-test-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        });

        // 6. Gallery Grid
        const galleryGrid = document.getElementById('galleryGrid');
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
            if (globalData.gallery.length === 0) {
                galleryGrid.innerHTML = '<div class="col-12 text-center text-muted py-4">No gallery photos yet.</div>';
            } else {
                globalData.gallery.forEach((img, index) => {
                    let photoUrl = resolveWebcomImageUrl(img.url);
                    galleryGrid.innerHTML += `
                        <div class="col-6 col-md-4 col-lg-3">
                            <div class="position-relative group">
                                <img src="${photoUrl}" class="rounded w-100" style="height: 120px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);" onerror="this.src='https://via.placeholder.com/150?text=Broken+Image'">
                                <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 delete-gallery-btn" data-index="${index}" style="padding: 2px 6px;">
                                    <i class="fa-solid fa-trash" style="font-size: 10px;"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
        }
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
                youtube: document.getElementById('setYoutube').value,
                facebook: document.getElementById('setFacebook').value,
                channel: document.getElementById('setChannel').value
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

        document.querySelectorAll('.s-name').forEach(input => {
            const idx = input.getAttribute('data-index');
            if(globalData.staff[idx]) globalData.staff[idx].name = input.value;
        });
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

    // Delegation for delete buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-gallery-btn')) {
            const index = e.target.closest('.delete-gallery-btn').getAttribute('data-index');
            window.deleteGalleryPhoto(index);
        }
        if (e.target.closest('.delete-staff-btn')) {
            const index = e.target.closest('.delete-staff-btn').getAttribute('data-index');
            if(confirm('Are you sure you want to remove this staff member?')) {
                globalData.staff.splice(index, 1);
                renderDashboard();
                showToast('Action Required', 'Click "Publish Staff Changes" to make it permanent.', 'warning');
            }
        }
        if (e.target.closest('.delete-test-btn')) {
            const index = e.target.closest('.delete-test-btn').getAttribute('data-index');
            if(confirm('Delete this testimonial/result?')) {
                globalData.testimonials.splice(index, 1);
                renderDashboard();
                showToast('Action Required', 'Click "Publish Testimonials" to make it permanent.', 'warning');
            }
        }
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
            const uploadRes = await fetch(`${API_BASE}/upload`, { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData 
            });
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
                headers: { 'Authorization': `Bearer ${token}` },
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
                    headers: { 'Authorization': `Bearer ${token}` },
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
    async function fetchAdminProfile() {
        try {
            const res = await fetch(`${API_BASE}/admin-profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const profile = await res.json();
            if(res.ok) {
                document.getElementById('adminRecoveryKey').innerText = profile.recoveryKey;
            }
        } catch (err) { console.error("Failed to fetch admin profile", err); }
    }

    window.copyRecoveryKey = () => {
        const key = document.getElementById('adminRecoveryKey').innerText;
        navigator.clipboard.writeText(key);
        showToast('Copied', 'Recovery key copied to clipboard!', 'success');
    };

    document.getElementById('changeCredsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        
        const payload = {
            newUsername: document.getElementById('newAdminUser').value,
            newPassword: document.getElementById('newAdminPass').value,
            currentPassword: document.getElementById('currentAdminPass').value
        };

        if(!confirm('This will change your login access. You will be logged out. Continue?')) return;

        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Updating...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/change-credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if(res.ok) {
                showToast('Success', 'Credentials updated! Logging out...', 'success');
                setTimeout(() => {
                    localStorage.removeItem('webcom_admin_token');
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                throw new Error(data.error || 'Failed to update credentials');
            }
        } catch (error) {
            showToast('Error', error.message, 'error');
            btn.innerHTML = 'Update Credentials';
            btn.disabled = false;
        }
    });

    fetchAdminProfile();
    

    

    async function fetchSystemStatus() {
        const badge = document.getElementById('dbStatusBadge');
        if(!badge) return;

        try {
            const res = await fetch(`${API_BASE}/system-status`);
            const status = await res.json();
            
            if(status.connected) {
                badge.innerHTML = `<i class="fa-solid fa-cloud text-success me-2"></i> ${status.database}`;
                badge.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                badge.style.background = 'rgba(34, 197, 94, 0.1)';
            } else {
                badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-warning me-2"></i> ${status.database}`;
                badge.style.borderColor = 'rgba(234, 179, 8, 0.3)';
                badge.style.background = 'rgba(234, 179, 8, 0.1)';
            }
        } catch (e) {
            badge.innerHTML = `<i class="fa-solid fa-xmark text-danger me-2"></i> Status Offline`;
        }
    }

    window.togglePassVisibility = function(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    // Init
    fetchDashboardData();
    fetchSystemStatus();
});



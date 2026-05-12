// Using native fetch

async function runTest() {
    const API = 'http://localhost:5000/api';
    console.log("Starting System Test...");

    try {
        // 1. Test Login
        console.log("Testing Login...");
        const loginRes = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'webcom_admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) throw new Error("Login failed: " + JSON.stringify(loginData));
        const token = loginData.token;
        console.log("✅ Login Successful.");

        // 2. Test Inquiry Submission
        console.log("Testing Inquiry Submission...");
        const inqRes = await fetch(`${API}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Tester', phone: '9999999999', message: 'System Test' })
        });
        if (!inqRes.ok) throw new Error("Inquiry failed: " + await inqRes.text());
        console.log("✅ Inquiry Submitted.");

        // 3. Test Staff Add
        console.log("Testing Staff Update...");
        const staffRes = await fetch(`${API}/staff`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ staff: [{ id: Date.now(), name: 'Test User', role: 'Tester' }] })
        });
        if (!staffRes.ok) throw new Error("Staff update failed");
        console.log("✅ Staff Updated.");

        console.log("\n--- ALL TESTS PASSED SUCCESSFULLY ---");
    } catch (e) {
        console.error("\n❌ TEST FAILED:", e.message);
    }
}

runTest();

class App {
    constructor() {
        this.contentElement = document.getElementById('app-content');
        this.modalContainer = document.getElementById('modal-container');
        this.modalContent = document.getElementById('modal-content');
        this.navAuth = document.getElementById('nav-auth');
        this.currentView = 'home';
        
        // Listen for history changes if we add pushState later, but for SPA simple hash/state is fine.
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.renderView(e.state.view);
            }
        });

        // Listen for auth state changes
        authService.onAuthChange((user, role) => {
            this.renderAuthNav();
            // Re-render current view to show/hide admin buttons
            this.renderView(this.currentView);
        });
    }

    // --- Auth UI ---
    renderAuthNav() {
        if (authService.isLoggedIn()) {
            const roleLabel = authService.isAdmin() ? 'Admin' : 'Guest';
            const email = authService.currentUser.email;
            this.navAuth.innerHTML = `
                <span class="auth-user-info">
                    <span class="auth-role-badge ${authService.isAdmin() ? 'badge-admin' : 'badge-guest'}">${roleLabel}</span>
                    <span class="auth-email">${email}</span>
                </span>
                <button class="btn-auth btn-logout" onclick="app.handleLogout()">Logout</button>
            `;
        } else {
            this.navAuth.innerHTML = `
                <button class="btn-auth btn-login" onclick="app.openLoginModal()">Login</button>
                <button class="btn-auth btn-register" onclick="app.openRegisterModal()">Register</button>
            `;
        }
    }

    openLoginModal() {
        this.modalContent.innerHTML = `
            <h2>Login</h2>
            <form id="login-form" onsubmit="event.preventDefault(); app.handleLogin();">
                <div class="form-group" style="margin-top:1.5rem;">
                    <label>Email</label>
                    <input type="email" id="login-email" class="form-input" required placeholder="your@email.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="login-password" class="form-input" required placeholder="••••••••">
                </div>
                <div id="login-error" class="auth-error"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary" id="login-submit-btn">Login</button>
                </div>
            </form>
        `;
        this.modalContainer.classList.remove('hidden');
    }

    openRegisterModal() {
        this.modalContent.innerHTML = `
            <h2>Create Account</h2>
            <p style="color: var(--text-muted); font-size:0.85rem; margin-top:0.5rem;">New accounts are created as Guest accounts (read-only).</p>
            <form id="register-form" onsubmit="event.preventDefault(); app.handleRegister();">
                <div class="form-group" style="margin-top:1.5rem;">
                    <label>Email</label>
                    <input type="email" id="reg-email" class="form-input" required placeholder="your@email.com">
                </div>
                <div class="form-group">
                    <label>Password (min 6 characters)</label>
                    <input type="password" id="reg-password" class="form-input" required minlength="6" placeholder="••••••••">
                </div>
                <div class="form-group">
                    <label>Confirm Password</label>
                    <input type="password" id="reg-password2" class="form-input" required minlength="6" placeholder="••••••••">
                </div>
                <div id="register-error" class="auth-error"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary" id="reg-submit-btn">Register</button>
                </div>
            </form>
        `;
        this.modalContainer.classList.remove('hidden');
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-submit-btn');
        errorEl.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Logging in...';
        try {
            await authService.login(email, password);
            this.closeModal();
        } catch (error) {
            errorEl.textContent = this._friendlyAuthError(error.code);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Login';
        }
    }

    async handleRegister() {
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const password2 = document.getElementById('reg-password2').value;
        const errorEl = document.getElementById('register-error');
        const btn = document.getElementById('reg-submit-btn');
        errorEl.textContent = '';

        if (password !== password2) {
            errorEl.textContent = 'Passwords do not match.';
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Creating account...';
        try {
            await authService.register(email, password);
            this.closeModal();
        } catch (error) {
            errorEl.textContent = this._friendlyAuthError(error.code);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Register';
        }
    }

    async handleLogout() {
        await authService.logout();
    }

    _friendlyAuthError(code) {
        switch (code) {
            case 'auth/user-not-found': return 'No account found with this email.';
            case 'auth/wrong-password': return 'Incorrect password.';
            case 'auth/invalid-credential': return 'Invalid email or password.';
            case 'auth/email-already-in-use': return 'An account with this email already exists.';
            case 'auth/weak-password': return 'Password must be at least 6 characters.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
            default: return 'An error occurred. Please try again.';
        }
    }

    navigate(view) {
        this.currentView = view;
        window.history.pushState({ view }, '', `#${view}`);
        this.renderView(view);
    }

    async renderView(view) {
        this.contentElement.innerHTML = '<div class="text-center" style="padding: 5rem;">Loading...</div>';
        
        try {
            switch(view) {
                case 'home':
                    await this.renderHome();
                    break;
                case 'events':
                    await this.renderEvents();
                    break;
                case 'racers':
                    await this.renderRacers();
                    break;
                case 'tracks':
                    await this.renderTracks();
                    break;
                default:
                    await this.renderHome();
            }
        } catch (error) {
            console.error(error);
            this.contentElement.innerHTML = `<div class="text-center" style="color: red;">Error loading view: ${error.message}</div>`;
        }
    }

    async renderHome() {
        const races = await db.getRacesAsync();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcomingRaces = races
            .filter(r => new Date(r.startDate) >= now)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 3);

        let upcomingHtml = '';
        if (upcomingRaces.length > 0) {
            upcomingHtml = `
                <div class="upcoming-races-container">
                    <h3 style="margin-bottom: 1rem;"><img src="assets/flag.png" style="height:1.2rem; vertical-align:middle; margin-right:0.5rem; filter: invert(1);"/>Upcoming Races</h3>
                    <div class="upcoming-grid">
                        ${upcomingRaces.map((race, index) => `
                            <div class="upcoming-card">
                                <h4>${race.name}</h4>
                                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem; line-height: 1.6;">
                                    <strong style="color:white;">Date:</strong> ${new Date(race.startDate).toLocaleDateString()}<br/>
                                    <strong style="color:white;">Category:</strong> ${race.categoryName.split(' ')[0]}<br/>
                                    <strong style="color:white;">Participants:</strong> ${12 + (index * 3)}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        this.contentElement.innerHTML = `
            <div class="home-container">
                <div class="home-card card-events" onclick="app.navigate('events')">
                    <h2>Racing Events</h2>
                    <p class="mb-2" style="color: var(--text-muted); margin-top: 1rem; z-index: 2;">${authService.isAdmin() ? 'Manage active and expired races, schedule new heats, and view rankings.' : 'View active and expired races, schedules, and rankings.'}</p>
                    <button class="btn-primary" style="z-index: 2;">View Events</button>
                </div>
                <div class="home-card card-participants" onclick="app.navigate('racers')">
                    <h2>Participants</h2>
                    <p class="mb-2" style="color: var(--text-muted); margin-top: 1rem; z-index: 2;">${authService.isAdmin() ? 'Manage racers, view profiles, edit details, and track points.' : 'View racer profiles, details, and points.'}</p>
                    <button class="btn-primary" style="z-index: 2;">View Participants</button>
                </div>
                <div class="home-card card-tracks" onclick="app.navigate('tracks')">
                    <h2><img src="assets/flag.png" style="height:1.5rem; vertical-align:middle; margin-right:0.5rem;"/>Race Tracks</h2>
                    <p class="mb-2" style="color: var(--text-muted); margin-top: 1rem; z-index: 2;">${authService.isAdmin() ? 'Manage track locations, lengths, and difficulty levels.' : 'View track locations, lengths, and difficulty levels.'}</p>
                    <button class="btn-primary" style="z-index: 2;">View Tracks</button>
                </div>
            </div>
            
            ${upcomingHtml}
            
            <div class="charts-container">
                <div class="chart-card">
                    <h3>Race Participation & Average Points</h3>
                    <canvas id="racesChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3 style="margin-bottom: 0.5rem;"><img src="assets/crown.png" style="height:1.5rem; vertical-align:middle; margin-right:0.5rem; filter: invert(1);"/>Top Racers by Category</h3>
                    <div style="display:flex; flex-direction:column; gap:1rem; width:100%;">
                        <div>
                            <h4 style="font-size:0.9rem; color:var(--text-muted); text-align:center;">Young (125cc)</h4>
                            <canvas id="rankingYoung" style="max-height:120px;"></canvas>
                        </div>
                        <div>
                            <h4 style="font-size:0.9rem; color:var(--text-muted); text-align:center;">Sportsman (250cc)</h4>
                            <canvas id="rankingSportsman" style="max-height:120px;"></canvas>
                        </div>
                        <div>
                            <h4 style="font-size:0.9rem; color:var(--text-muted); text-align:center;">Pro (450cc)</h4>
                            <canvas id="rankingPro" style="max-height:120px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render charts after the DOM is injected
        setTimeout(() => this.renderCharts(), 50);
    }

    async renderCharts() {
        if (!window.Chart) {
            console.error('Chart.js not loaded');
            return;
        }

        // 1. Fetch real data
        const races = await db.getRacesAsync();
        const racers = await db.getRacersAsync();

        // ---------------------------------------------------------
        // GRAPH 1: Race Participation & Average Points (Simulated)
        // ---------------------------------------------------------
        const ctxRaces = document.getElementById('racesChart').getContext('2d');
        
        // Use real race names, simulate participants & points for visual
        const raceLabels = races.slice(0, 5).map(r => r.name);
        if (raceLabels.length === 0) raceLabels.push('Sample Race 1', 'Sample Race 2');

        const participantsData = raceLabels.map(() => Math.floor(Math.random() * 20) + 5);
        const pointsData = raceLabels.map(() => Math.floor(Math.random() * 40) + 10); // Random points 10-50

        new Chart(ctxRaces, {
            type: 'bar',
            data: {
                labels: raceLabels,
                datasets: [
                    {
                        label: 'Participants',
                        data: participantsData,
                        backgroundColor: 'rgba(217, 4, 41, 0.7)',
                        borderColor: '#d90429',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Avg Points',
                        data: pointsData,
                        type: 'line',
                        borderColor: '#ffffff',
                        backgroundColor: '#ffffff',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: { display: true, text: 'Participants', color: '#a0a0a0' },
                        grid: { color: '#2a2a2a' },
                        ticks: { color: '#a0a0a0' }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: { display: true, text: 'Avg Points', color: '#a0a0a0' },
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#a0a0a0' }
                    },
                    x: {
                        grid: { color: '#2a2a2a' },
                        ticks: { color: '#a0a0a0' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });

        // ---------------------------------------------------------
        // GRAPH 2: Category Rankings (3 Small Graphs)
        // ---------------------------------------------------------
        const youngRacers = racers.filter(r => r.categoryName && r.categoryName.includes('Young')).sort((a,b) => b.points - a.points).slice(0, 3);
        const sportsmanRacers = racers.filter(r => r.categoryName && r.categoryName.includes('Sportsman')).sort((a,b) => b.points - a.points).slice(0, 3);
        const proRacers = racers.filter(r => r.categoryName && r.categoryName.includes('Pro')).sort((a,b) => b.points - a.points).slice(0, 3);

        const renderSmallChart = (canvasId, racerData, color) => {
            const ctx = document.getElementById(canvasId).getContext('2d');
            const labels = racerData.length > 0 ? racerData.map(r => r.firstName) : ['No Racers'];
            const data = racerData.length > 0 ? racerData.map(r => r.points || 0) : [0];

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: color,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // Horizontal
                    scales: {
                        x: { display: false, beginAtZero: true },
                        y: { grid: { display: false }, ticks: { color: '#a0a0a0', font: { size: 10 } } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                    }
                }
            });
        };

        renderSmallChart('rankingYoung', youngRacers, 'rgba(217, 4, 41, 0.8)');
        renderSmallChart('rankingSportsman', sportsmanRacers, 'rgba(239, 35, 60, 0.8)');
        renderSmallChart('rankingPro', proRacers, 'rgba(141, 2, 31, 0.8)');
    }

    // --- Shared Category Grid Helper ---
    _generateCategorizedGrid(items, cardGeneratorFn, emptyMessage) {
        const youngItems = items.filter(i => i.categoryName && i.categoryName.includes('Young'));
        const sportsmanItems = items.filter(i => i.categoryName && i.categoryName.includes('Sportsman'));
        const proItems = items.filter(i => i.categoryName && i.categoryName.includes('Pro'));

        const renderColumn = (title, data) => {
            return `
                <div class="category-column">
                    <h3 style="margin-bottom: 1.5rem; text-align: center; color: var(--accent-red); border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">${title}</h3>
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        ${data.length === 0 ? `<p style="color:var(--text-muted); text-align:center;">${emptyMessage}</p>` : ''}
                        ${data.map(item => cardGeneratorFn(item)).join('')}
                    </div>
                </div>
            `;
        };

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; align-items: start; margin-top: 2rem;">
                ${renderColumn('Young (125cc)', youngItems)}
                ${renderColumn('Sportsman (250cc)', sportsmanItems)}
                ${renderColumn('Pro (450cc)', proItems)}
            </div>
        `;
    }

    // --- Racers View ---
    async renderRacers() {
        const racers = await db.getRacersAsync();
        const categories = await db.getCategoryAsync();
        
        const gridHtml = this._generateCategorizedGrid(
            racers, 
            (racer) => this._createRacerCardHTML(racer), 
            'No racers yet.'
        );

        let html = `
            <div class="page-header">
                <h2>Participants</h2>
                <div style="display:flex; gap:1rem;">
                    <input type="text" class="search-bar" id="racer-search" placeholder="Search racers..." onkeyup="app.filterRacers()">
                    ${authService.isAdmin() ? '<button class="btn-primary" onclick="app.openAddRacerModal()">Add Racer</button>' : ''}
                </div>
            </div>
            ${gridHtml}
        `;
        
        this.contentElement.innerHTML = html;
        this.currentRacers = racers; // cache for search
    }

    _createRacerCardHTML(racer) {
        return `
            <div class="data-card racer-card" data-name="${(racer.firstName + ' ' + racer.lastName).toLowerCase()}">
                <h3>${racer.firstName} ${racer.lastName}</h3>
                <p><span>Age:</span> <span>${racer.age}</span></p>
                <p><span>Category:</span> <span style="text-align: right; max-width: 60%;">${racer.categoryName || 'N/A'}</span></p>
                <p><span>Points:</span> <span class="accent" style="font-weight:bold;">${racer.points || 0}</span></p>
                
                ${authService.isAdmin() ? `<div class="data-card-actions">
                    <button class="btn-secondary" onclick='app.openEditRacerModal(${JSON.stringify(racer).replace(/'/g, "&#39;")})'>Edit</button>
                    <button class="btn-danger" style="display:flex; align-items:center; gap:5px;" onclick="app.deleteRacer(${racer.id})">
                        <img src="assets/kosh.png" style="height:14px; filter: brightness(0) saturate(100%) invert(31%) sepia(85%) saturate(3065%) hue-rotate(337deg) brightness(97%) contrast(106%);" />
                        Delete
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    filterRacers() {
        const term = document.getElementById('racer-search').value.toLowerCase();
        const cards = document.querySelectorAll('.racer-card');
        cards.forEach(card => {
            const name = card.getAttribute('data-name');
            if (name.includes(term)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    async openAddRacerModal() {
        const categories = await db.getCategoryAsync();
        const catOptions = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        
        this.modalContent.innerHTML = `
            <h2>Add New Racer</h2>
            <form id="add-racer-form" onsubmit="event.preventDefault(); app.submitAddRacer();">
                <div class="form-group" style="margin-top:1.5rem;">
                    <label>First Name (Required)</label>
                    <input type="text" id="racer-fn" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Last Name (Required)</label>
                    <input type="text" id="racer-ln" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Age (Required)</label>
                    <input type="number" id="racer-age" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Category (Required)</label>
                    <select id="racer-cat" class="form-select" required>
                        ${catOptions}
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Racer</button>
                </div>
            </form>
        `;
        this.modalContainer.classList.remove('hidden');
    }

    validateRacerAgeCategory(age, categoryName) {
        if (categoryName.includes('Age:16-18') && (age < 16 || age > 18)) {
            return "For the Young category, age must be between 16 and 18.";
        }
        if (categoryName.includes('Age:19-21') && (age < 19 || age > 21)) {
            return "For the Sportsman category, age must be between 19 and 21.";
        }
        if (categoryName.includes('Age:22-25') && (age < 22 || age > 25)) {
            return "For the Pro category, age must be between 22 and 25.";
        }
        return null; // Valid
    }

    async submitAddRacer() {
        const firstName = document.getElementById('racer-fn').value.trim();
        const lastName = document.getElementById('racer-ln').value.trim();
        const age = document.getElementById('racer-age').value;
        const categoryName = document.getElementById('racer-cat').value;

        if (!firstName || !lastName || !age || !categoryName) {
            alert('Please fill out all required fields.');
            return;
        }
        
        const parsedAge = parseInt(age);
        if (parsedAge <= 0) {
            alert('Age must be a positive number.');
            return;
        }

        const ageError = this.validateRacerAgeCategory(parsedAge, categoryName);
        if (ageError) {
            alert(ageError);
            return;
        }

        const racer = {
            firstName,
            lastName,
            age: parsedAge,
            categoryName,
            points: 0
        };
        await db.addRacerAsync(racer);
        this.closeModal();
        this.renderRacers();
    }

    async openEditRacerModal(racer) {
        const categories = await db.getCategoryAsync();
        const catOptions = categories.map(c => 
            `<option value="${c.name}" ${c.name === racer.categoryName ? 'selected' : ''}>${c.name}</option>`
        ).join('');
        
        this.modalContent.innerHTML = `
            <h2>Edit Racer</h2>
            <form id="edit-racer-form" onsubmit="event.preventDefault(); app.submitEditRacer(${racer.id});">
                <div class="form-group" style="margin-top:1.5rem;">
                    <label>First Name</label>
                    <input type="text" id="edit-racer-fn" class="form-input" value="${racer.firstName}" required>
                </div>
                <div class="form-group">
                    <label>Last Name</label>
                    <input type="text" id="edit-racer-ln" class="form-input" value="${racer.lastName}" required>
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" id="edit-racer-age" class="form-input" value="${racer.age}" required min="1">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="edit-racer-cat" class="form-select" required>
                        ${catOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Points</label>
                    <input type="number" id="edit-racer-points" class="form-input" value="${racer.points || 0}" required min="0">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        `;
        this.modalContainer.classList.remove('hidden');
    }

    async submitEditRacer(id) {
        const firstName = document.getElementById('edit-racer-fn').value.trim();
        const lastName = document.getElementById('edit-racer-ln').value.trim();
        const age = document.getElementById('edit-racer-age').value;
        const points = document.getElementById('edit-racer-points').value;
        const categoryName = document.getElementById('edit-racer-cat').value;

        if (!firstName || !lastName || !age) {
            alert('Please fill out all required fields.');
            return;
        }

        const parsedAge = parseInt(age);
        const ageError = this.validateRacerAgeCategory(parsedAge, categoryName);
        if (ageError) {
            alert(ageError);
            return;
        }

        const racer = {
            id: id,
            firstName,
            lastName,
            age: parsedAge,
            categoryName,
            points: parseInt(points)
        };
        await db.updateRacerAsync(racer);
        this.closeModal();
        this.renderRacers();
    }

    async deleteRacer(id) {
        if (confirm('Are you sure you want to remove this racer?')) {
            await db.deleteRacerAsync(id);
            this.renderRacers();
        }
    }

    // --- Events View ---
    async renderEvents() {
        const races = await db.getRacesAsync();
        
        // Split into active and expired based on Date
        const now = new Date();
        const activeRaces = [];
        const expiredRaces = [];
        
        races.forEach(r => {
            if (new Date(r.startDate) >= now.setHours(0,0,0,0)) {
                activeRaces.push(r);
            } else {
                expiredRaces.push(r);
            }
        });

        const gridHtml = this._generateCategorizedGrid(
            activeRaces, 
            (race) => this._createRaceCardHTML(race), 
            'No active events.'
        );

        let html = `
            <div class="page-header">
                <h2>Active Events</h2>
                <div style="display:flex; gap:1rem;">
                    <button class="btn-secondary" onclick="app.renderExpiredEvents()">View Expired Races</button>
                    ${authService.isAdmin() ? '<button class="btn-primary" onclick="app.openAddRaceModal()">Add Event</button>' : ''}
                </div>
            </div>
            ${gridHtml}
        `;
        
        this.contentElement.innerHTML = html;
    }

    async renderExpiredEvents() {
        const races = await db.getRacesAsync();
        const now = new Date();
        const expiredRaces = races.filter(r => new Date(r.startDate) < now.setHours(0,0,0,0));

        const gridHtml = this._generateCategorizedGrid(
            expiredRaces, 
            (race) => this._createRaceCardHTML(race, true), 
            'No expired events.'
        );

        let html = `
            <div class="page-header">
                <h2>Expired Events</h2>
                <button class="btn-secondary" onclick="app.renderEvents()">Back to Active Events</button>
            </div>
            ${gridHtml}
        `;
        
        this.contentElement.innerHTML = html;
    }

    _createRaceCardHTML(race, isExpired = false) {
        const dateStr = new Date(race.startDate).toLocaleDateString();
        return `
            <div class="data-card" style="${isExpired ? 'opacity: 0.7;' : ''}">
                <h3>${race.name}</h3>
                <p><span>Location:</span> <span>${race.location}</span></p>
                <p><span>Date:</span> <span>${dateStr}</span></p>
                <p><span>Category:</span> <span style="text-align: right; max-width: 60%;">${race.categoryName}</span></p>
                
                ${authService.isAdmin() ? `<div class="data-card-actions">
                    ${!isExpired ? `<button class="btn-secondary" onclick="alert('Options to add heats and racers coming soon!')">Options</button>` : ''}
                    <button class="btn-danger" style="display:flex; align-items:center; gap:5px;" onclick="app.deleteRace(${race.id}, ${isExpired})">
                        <img src="assets/kosh.png" style="height:14px; filter: brightness(0) saturate(100%) invert(31%) sepia(85%) saturate(3065%) hue-rotate(337deg) brightness(97%) contrast(106%);" />
                        Delete
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    async openAddRaceModal() {
        const categories = await db.getCategoryAsync();
        const catOptions = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        
        this.modalContent.innerHTML = `
            <h2>Add New Event</h2>
            <form id="add-race-form" onsubmit="event.preventDefault(); app.submitAddRace();">
                <div class="form-group" style="margin-top:1.5rem;">
                    <label>Name (Required)</label>
                    <input type="text" id="race-name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Location (Required)</label>
                    <input type="text" id="race-loc" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Date (Required)</label>
                    <input type="date" id="race-date" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Category (Required)</label>
                    <select id="race-cat" class="form-select" required>
                        ${catOptions}
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Create Event</button>
                </div>
            </form>
        `;
        this.modalContainer.classList.remove('hidden');
    }

    async submitAddRace() {
        const name = document.getElementById('race-name').value.trim();
        const location = document.getElementById('race-loc').value.trim();
        const startDate = document.getElementById('race-date').value;
        const categoryName = document.getElementById('race-cat').value;

        if (!name || !location || !startDate) {
            alert('Please fill out all required fields (Name, Location, Date).');
            return;
        }

        const race = {
            name,
            location,
            startDate,
            categoryName
        };
        await db.addRaceAsync(race);
        this.closeModal();
        this.renderEvents();
    }

    async deleteRace(id, wasExpired) {
        if (confirm('Are you sure you want to delete this event?')) {
            await db.deleteRaceAsync(id);
            if (wasExpired) {
                this.renderExpiredEvents();
            } else {
                this.renderEvents();
            }
        }
    }

    // --- Tracks View ---
    async renderTracks() {
        const tracks = await db.getTracksAsync();
        
        let html = `
            <div class="page-header">
                <h2>Race Tracks</h2>
                <div style="display:flex; gap:1rem;">
                    ${authService.isAdmin() ? '<button class="btn-primary" onclick="app.openAddTrackModal()">Add Track</button>' : ''}
                </div>
            </div>
            <div class="data-grid">
                ${tracks.length === 0 ? '<p style="color:var(--text-muted);">No tracks found.</p>' : ''}
                ${tracks.map(track => this._createTrackCardHTML(track)).join('')}
            </div>
        `;
        
        this.contentElement.innerHTML = html;
    }

    _createTrackCardHTML(track) {
        return `
            <div class="data-card">
                <h3>${track.name}</h3>
                <p><span>Location:</span> <span>${track.location}</span></p>
                <p><span>Length:</span> <span>${track.length} km</span></p>
                <p><span>Difficulty:</span> <span class="accent">${track.difficulty}</span></p>
                
                ${authService.isAdmin() ? `<div class="data-card-actions">
                    <button class="btn-secondary" onclick='app.openEditTrackModal(${JSON.stringify(track).replace(/'/g, "&#39;")})'>Edit</button>
                    <button class="btn-danger" style="display:flex; align-items:center; gap:5px;" onclick="app.deleteTrack(${track.id})">
                        <img src="assets/kosh.png" style="height:14px; filter: brightness(0) saturate(100%) invert(31%) sepia(85%) saturate(3065%) hue-rotate(337deg) brightness(97%) contrast(106%);" />
                        Delete
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    async openAddTrackModal() {
        this.modalContent.innerHTML = `
            <h2>Add New Track</h2>
            <form id="add-track-form" onsubmit="event.preventDefault(); app.submitAddTrack();">
                <div class="form-group" style="margin-top:1.5rem;">
                    <label>Name (Required)</label>
                    <input type="text" id="track-name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Location (Required)</label>
                    <input type="text" id="track-loc" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Length in km (Required)</label>
                    <input type="number" id="track-len" class="form-input" step="0.1" required min="0.1">
                </div>
                <div class="form-group">
                    <label>Difficulty</label>
                    <select id="track-diff" class="form-select">
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Track</button>
                </div>
            </form>
        `;
        this.modalContainer.classList.remove('hidden');
    }

    async submitAddTrack() {
        const name = document.getElementById('track-name').value.trim();
        const location = document.getElementById('track-loc').value.trim();
        const length = document.getElementById('track-len').value;
        const difficulty = document.getElementById('track-diff').value;

        if (!name || !location || !length) {
            alert('Please fill out all required fields.');
            return;
        }

        const track = {
            name,
            location,
            length: parseFloat(length),
            difficulty
        };
        await db.addTrackAsync(track);
        this.closeModal();
        this.renderTracks();
    }

    async openEditTrackModal(track) {
        this.modalContent.innerHTML = `
            <h2>Edit Track</h2>
            <form id="edit-track-form" onsubmit="event.preventDefault(); app.submitEditTrack(${track.id});">
                <div class="form-group" style="margin-top:1.5rem;">
                    <label>Name</label>
                    <input type="text" id="edit-track-name" class="form-input" value="${track.name}" required>
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="edit-track-loc" class="form-input" value="${track.location}" required>
                </div>
                <div class="form-group">
                    <label>Length in km</label>
                    <input type="number" id="edit-track-len" class="form-input" step="0.1" value="${track.length}" required min="0.1">
                </div>
                <div class="form-group">
                    <label>Difficulty</label>
                    <select id="edit-track-diff" class="form-select">
                        <option value="Easy" ${track.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
                        <option value="Medium" ${track.difficulty === 'Medium' ? 'selected' : ''}>Medium</option>
                        <option value="Hard" ${track.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        `;
        this.modalContainer.classList.remove('hidden');
    }

    async submitEditTrack(id) {
        const name = document.getElementById('edit-track-name').value.trim();
        const location = document.getElementById('edit-track-loc').value.trim();
        const length = document.getElementById('edit-track-len').value;
        const difficulty = document.getElementById('edit-track-diff').value;

        if (!name || !location || !length) {
            alert('Please fill out all required fields.');
            return;
        }

        const track = {
            id,
            name,
            location,
            length: parseFloat(length),
            difficulty
        };
        await db.updateTrackAsync(track);
        this.closeModal();
        this.renderTracks();
    }

    async deleteTrack(id) {
        if (confirm('Are you sure you want to delete this track?')) {
            await db.deleteTrackAsync(id);
            this.renderTracks();
        }
    }

    // --- Modal Utils ---
    closeModal() {
        this.modalContainer.classList.add('hidden');
    }
}

// Initialize application
window.app = new App();
app.renderAuthNav();
// Initial route load
if (window.location.hash) {
    const view = window.location.hash.substring(1);
    window.app.navigate(view);
} else {
    window.app.navigate('home');
}

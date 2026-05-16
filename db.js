// Database service using Firebase Firestore

// IMPORTANT: Replace this config object with your real Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtSBco8Q4emaDbLlr_pnpSsiWGPRqoRi4",
  authDomain: "motocross-web-app-2561d.firebaseapp.com",
  projectId: "motocross-web-app-2561d",
  storageBucket: "motocross-web-app-2561d.firebasestorage.app",
  messagingSenderId: "186289114938",
  appId: "1:186289114938:web:493041b13ae87558788a03",
  measurementId: "G-P955DS8RW0"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// Authentication Service
// ============================================================
class AuthService {
    constructor() {
        this.currentUser = null;
        this.userRole = null; // 'admin' | 'guest' | null
        this._onAuthChangeCallbacks = [];

        // Listen for Firebase auth state changes
        auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            if (user) {
                await this._fetchUserRole(user.uid);
            } else {
                this.userRole = null;
            }
            // Notify all registered callbacks
            this._onAuthChangeCallbacks.forEach(cb => cb(user, this.userRole));
        });
    }

    /** Register a callback that fires whenever auth state changes */
    onAuthChange(callback) {
        this._onAuthChangeCallbacks.push(callback);
    }

    /** Fetch the role for the given UID from the 'users' Firestore collection */
    async _fetchUserRole(uid) {
        try {
            const doc = await firestore.collection('users').doc(uid).get();
            if (doc.exists) {
                this.userRole = doc.data().role || 'guest';
            } else {
                this.userRole = 'guest';
            }
        } catch (error) {
            console.error('Error fetching user role:', error);
            this.userRole = 'guest';
        }
    }

    /** Register a new account (always creates a 'guest' role) */
    async register(email, password) {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = credential.user.uid;
        // Create a user document with role 'guest'
        await firestore.collection('users').doc(uid).set({
            email: email,
            role: 'guest',
            createdAt: new Date().toISOString()
        });
        this.userRole = 'guest';
        return credential.user;
    }

    /** Log in with email & password */
    async login(email, password) {
        const credential = await auth.signInWithEmailAndPassword(email, password);
        return credential.user;
    }

    /** Log out */
    async logout() {
        await auth.signOut();
        this.currentUser = null;
        this.userRole = null;
    }

    /** Check if current user is an admin */
    isAdmin() {
        return this.userRole === 'admin';
    }

    /** Check if a user is logged in */
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

window.authService = new AuthService();

// ============================================================
// Database Service
// ============================================================
class DatabaseService {
    constructor() {
        this.collections = {
            racers: 'motocross_racers',
            races: 'motocross_races',
            heats: 'motocross_heats',
            categories: 'motocross_categories',
            tracks: 'motocross_tracks'
        };
        // Seed categories if needed
        this._seedCategories();
    }

    async _seedCategories() {
        try {
            const snapshot = await firestore.collection(this.collections.categories).get();
            if (snapshot.empty) {
                const initialCategories = [
                    { id: 1, name: 'Young (Age:16-18) (Engine size: 125cc)' },
                    { id: 2, name: 'Sportsman (Age:19-21) (Engine size: 250cc)' },
                    { id: 3, name: 'Pro (Age:22-25) (Engine size: 450cc)' }
                ];
                for (const cat of initialCategories) {
                    // Use the id as the document ID
                    await firestore.collection(this.collections.categories).doc(cat.id.toString()).set({ name: cat.name });
                }
            }
        } catch (error) {
            console.error("Error seeding categories. Ensure Firebase is configured properly.", error);
        }
    }

    // Helper to get all documents from a collection
    async _getAll(collectionKey) {
        try {
            const snapshot = await firestore.collection(collectionKey).get();
            return snapshot.docs.map(doc => {
                const data = doc.data();
                // Ensure id is a number if it can be parsed as one, for compatibility with existing app.js
                const numericId = parseInt(doc.id, 10);
                return { 
                    id: isNaN(numericId) ? doc.id : numericId, 
                    ...data 
                };
            });
        } catch (error) {
            console.error(`Error getting documents from ${collectionKey}:`, error);
            return [];
        }
    }

    // --- Racers ---
    async getRacersAsync() {
        return await this._getAll(this.collections.racers);
    }

    async addRacerAsync(racer) {
        const id = Date.now().toString(); 
        await firestore.collection(this.collections.racers).doc(id).set(racer);
        return parseInt(id, 10);
    }

    async updateRacerAsync(racer) {
        const docId = racer.id.toString();
        const dataToSave = { ...racer };
        delete dataToSave.id;
        await firestore.collection(this.collections.racers).doc(docId).update(dataToSave);
    }

    async deleteRacerAsync(id) {
        await firestore.collection(this.collections.racers).doc(id.toString()).delete();
    }

    // --- Races ---
    async getRacesAsync() {
        return await this._getAll(this.collections.races);
    }

    async addRaceAsync(race) {
        const id = Date.now().toString();
        await firestore.collection(this.collections.races).doc(id).set(race);
        return parseInt(id, 10);
    }

    async deleteRaceAsync(id) {
        await firestore.collection(this.collections.races).doc(id.toString()).delete();
    }

    // --- Tracks ---
    async getTracksAsync() {
        return await this._getAll(this.collections.tracks);
    }

    async addTrackAsync(track) {
        const id = Date.now().toString();
        await firestore.collection(this.collections.tracks).doc(id).set(track);
        return parseInt(id, 10);
    }

    async updateTrackAsync(track) {
        const docId = track.id.toString();
        const dataToSave = { ...track };
        delete dataToSave.id;
        await firestore.collection(this.collections.tracks).doc(docId).update(dataToSave);
    }

    async deleteTrackAsync(id) {
        await firestore.collection(this.collections.tracks).doc(id.toString()).delete();
    }

    // --- Categories ---
    async getCategoryAsync() {
        return await this._getAll(this.collections.categories);
    }
}

window.db = new DatabaseService();

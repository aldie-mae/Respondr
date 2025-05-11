// Supabase Configuration
const SUPABASE_URL = 'https://bekuztmggtdqsnhwwdfo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJla3V6dG1nZ3RkcXNuaHd3ZGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyODMyMzcsImV4cCI6MjA1ODg1OTIzN30.nIC3OEpK4PRVBMZwVvIROpjJ105Zgrf6IRpHDpMc45U';
const supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_KEY);

// Debug flag - set to false in production
const DEBUG_MODE = true;

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');
const showLoginLink = document.getElementById('show-login');
const showRegisterLink = document.getElementById('show-register');
const notification = document.getElementById('notification');

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000; 

// DEVELOPMENT ONLY - Clear previous session for testing
if (DEBUG_MODE) {
    localStorage.removeItem('respondSession');
    console.log('[DEBUG] Cleared previous session for testing');
}

// Toggle between login and register forms
function showLogin() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginToggle.classList.add('active');
    registerToggle.classList.remove('active');
}

function showRegister() {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerToggle.classList.add('active');
    loginToggle.classList.remove('active');
}

// Event Listeners for form toggle
loginToggle.addEventListener('click', showLogin);
registerToggle.addEventListener('click', showRegister);
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
});

// Show notification message
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Validate session with expiration check
function isValidSession(session) {
    if (!session || !session.user || !session.timestamp) {
        console.log('Invalid session structure');
        return false;
    }
    
    const now = new Date().getTime();
    const sessionTime = new Date(session.timestamp).getTime();
    const isExpired = (now - sessionTime) > SESSION_TIMEOUT;
    
    if (isExpired) {
        console.log('Session expired');
        localStorage.removeItem('respondSession');
    }
    
    return !isExpired;
}

// Login functionality
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;
    
    try {
        // Check if user exists with given username
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();
        
        if (userError || !user) {
            showNotification('Invalid username or password', 'error');
            return;
        }
        
        // Check if user role matches
        if (user.role !== role) {
            showNotification(`You are not registered as a ${role}`, 'error');
            return;
        }
        
        // Create new session
        const session = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('respondSession', JSON.stringify(session));
        console.log('New session created:', session);
        
        // Redirect based on role (changed to responder.html)
        window.location.href = role === 'admin' ? 'admin.html' : 'responder.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed: ' + error.message, 'error');
    }
});

// Register functionality
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullname = document.getElementById('reg-fullname').value;
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const address = document.getElementById('reg-address').value;
    const mobile = document.getElementById('reg-mobile').value;
    const skills = document.getElementById('reg-skills').value;
    const equipment = document.getElementById('reg-equipment').value;
    
    try {
        // Check if username already exists
        const { data: existingUser, error: lookupError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .maybeSingle();
        
        if (lookupError) throw lookupError;
        
        if (existingUser) {
            showNotification('Username already exists', 'error');
            return;
        }
        
        // Insert new user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password,
                    fullname,
                    address,
                    mobile,
                    skills,
                    equipment,
                    role: 'responder'
                }
            ])
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        console.log('New user created:', newUser);
        showNotification('Registration successful! Please login.', 'success');
        showLogin();
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed: ' + error.message, 'error');
    }
});

// Check session on page load
document.addEventListener('DOMContentLoaded', () => {
    if (DEBUG_MODE) {
        console.log('Checking for existing session...');
    }
    
    try {
        const sessionData = localStorage.getItem('respondSession');
        
        if (!sessionData) {
            if (DEBUG_MODE) {
                console.log('No session found');
            }
            return;
        }
        
        const session = JSON.parse(sessionData);
        
        if (DEBUG_MODE) {
            console.log('Found session:', session);
        }
        
        if (isValidSession(session)) {
            if (DEBUG_MODE) {
                console.log('Session is valid, redirecting to responder page');
                window.location.href = session.user.role === 'admin' ? 'admin.html' : 'responder.html';
            } else {
                window.location.href = session.user.role === 'admin' ? 'admin.html' : 'responder.html';
            }
        } else {
            if (DEBUG_MODE) {
                console.log('Session is invalid');
            }
        }
    } catch (e) {
        console.error('Session check error:', e);
        localStorage.removeItem('respondSession');
    }
});

// Logout functionality
window.logout = function() {
    localStorage.removeItem('respondSession');
    window.location.href = 'index.html';
};
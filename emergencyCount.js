// This script updates the emergency badge count dynamically
document.addEventListener("DOMContentLoaded", updateEmergencyBadge);

function updateEmergencyBadge() {
    const emergencyCount = document.getElementById('emergency-count');
    
    if (!emergencyCount) return;

    // Assume you have some way to fetch the count of emergency reports
    // This is a simple placeholder; replace it with real logic from your database
    const count = 3; // Example: this should come from your database (e.g., supabase)

    emergencyCount.textContent = count;
}

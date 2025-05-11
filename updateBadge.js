import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", async () => {
    const badge = document.getElementById('emergency-count');
    if (!badge) return;

    try {
        // Fetch count of emergency reports
        const { count, error } = await supabase
            .from('emergency_reports')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Error fetching emergency count:', error.message);
            return;
        }

        // Update badge with the emergency count
        badge.textContent = count;
    } catch (err) {
        console.error("Unexpected error while counting emergencies:", err);
    }
});

import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", fetchEmergencies);

async function fetchEmergencies() {
    const emergencyList = document.getElementById('emergency-list');

    if (!emergencyList) {
        console.error("Missing #emergency-list element in HTML.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from('emergency_reports')
            .select('id, emergency_type, location, description')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase error:", error.message);
            emergencyList.innerHTML = `<p>Error loading emergencies.</p>`;
            return;
        }

        if (data.length === 0) {
            emergencyList.innerHTML = "<p>No emergency reports yet.</p>";
            return;
        }

        emergencyList.innerHTML = ""; // Clear previous content

        data.forEach(report => {
            const div = document.createElement("div");
            div.className = "emergency-tab";
            div.innerHTML = `
                <div>
                    <h3>${report.emergency_type}</h3>
                    <p class="location">${report.location}</p>
                    <p class="description">${report.description}</p>
                </div>
                <button class="respond-button" data-id="${report.id}">Respond</button>
            `;
        
            emergencyList.appendChild(div);
        });
        
        // Redirect to respond.html with ID
        document.addEventListener("click", function (e) {
            if (e.target.classList.contains("respond-button")) {
                const id = e.target.getAttribute("data-id");
                window.location.href = `respond.html?id=${id}`;
            }
        });
        
    } catch (err) {
        console.error("Unexpected error while fetching reports:", err);
        emergencyList.innerHTML = `<p>Failed to fetch reports.</p>`;
    }
}

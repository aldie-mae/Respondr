import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
    const reportForm = document.getElementById("report-form");

    // Ensure the form exists before adding event listener
    if (reportForm) {
        reportForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Get form data
            const emergencyType = document.getElementById("emergency-type").value;
            const emergencyLocation = document.getElementById("emergency-location").value;
            const emergencyDescription = document.getElementById("emergency-description").value;

            try {
                // Insert data into Supabase
                const { data, error } = await supabase
                    .from("emergency_reports")
                    .insert([
                        {
                            emergency_type: emergencyType,
                            location: emergencyLocation,
                            description: emergencyDescription
                        }
                    ]);

                if (error) {
                    console.error("Error submitting report:", error.message);
                    alert("Error submitting report: " + error.message);
                } else {
                    console.log("Emergency reported successfully:", data);
                    alert("Emergency reported successfully!");
                    reportForm.reset(); // Reset the form
                    fetchReports(); // Re-fetch the reports to update the list
                }
            } catch (error) {
                console.error("Unexpected error:", error);
                alert("Unexpected error occurred");
            }
        });
    } else {
        console.error("Report form element not found.");
    }

    // Fetch and display reports
    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from("emergency_reports")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching reports:", error);
            } else {
                const reportsContainer = document.getElementById("reports-container");
                reportsContainer.innerHTML = ""; // Clear existing reports

                // Display each report
                data.forEach(report => {
                    const reportTab = document.createElement("div");
                    reportTab.classList.add("report-tab");
                    reportTab.innerHTML = `
                        <h3 class="report-title">${report.emergency_type}</h3>
                        <p class="report-location">${report.location}</p>
                    `;
                    reportsContainer.appendChild(reportTab);
                });
            }
        } catch (error) {
            console.error("Unexpected error while fetching reports:", error);
        }
    };

    // Call fetchReports on page load
    fetchReports();
});

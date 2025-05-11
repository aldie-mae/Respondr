document.addEventListener("DOMContentLoaded", () => {
    // Smooth page transition for navigation links
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            let target = link.getAttribute("href");

            // Smooth transition
            document.body.classList.add("fade-out");
            setTimeout(() => {
                window.location.href = target;
            }, 500);
        });
    });

      // Handle the "Report Now" button click
      const reportBtn = document.querySelector('.report-btn');
      if (reportBtn) {
          reportBtn.addEventListener('click', () => {
              // Redirect to report page
              window.location.href = "report.html";
          });
      }
  
      // Ambulance image animation
      const ambulance = document.getElementById('ambulance-img');
      const content = document.getElementById('content');
  
      // Trigger the ambulance animation and text reveal after it stops
      ambulance.addEventListener('animationend', () => {
          content.style.opacity = 1;  // Fade in the content after animation ends
      });
  });
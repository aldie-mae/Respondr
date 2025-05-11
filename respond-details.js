import { supabase } from './supabase.js';

// Get the emergency ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const emergencyId = urlParams.get('emergency');
console.log('Emergency ID from URL:', emergencyId);

document.addEventListener("DOMContentLoaded", async () => {
  if (!emergencyId) {
    handleEmergencyIdError();
    return;
  }

  try {
    // Fetch emergency details directly without auth check
    const { data: emergency, error } = await supabase
      .from('emergency_reports')
      .select('*')
      .eq('id', emergencyId)
      .single();
    
    if (error || !emergency) {
      throw new Error(error?.message || "Emergency not found");
    }
    
    console.log("Emergency details:", emergency);
    
    // Update UI with emergency details
    updateEmergencyUI(emergency);
    
    // Get AI response
    await getAIResponse(emergency);
    
  } catch (error) {
    handleEmergencyError(error);
  }
});

function handleEmergencyIdError() {
  console.error("No emergency ID provided in URL");
  document.getElementById('emergency-type').textContent = "Error: No emergency ID";
  document.getElementById('emergency-location').textContent = "Please return to dashboard";
  document.getElementById('emergency-description').textContent = "Could not load emergency details. Missing emergency ID in URL.";
  document.getElementById('ai-loading').style.display = 'none';
  document.getElementById('ai-response').style.display = 'block';
  document.getElementById('ai-response').textContent = "Cannot provide guidance without emergency details.";
}

function handleEmergencyError(error) {
  console.error("Error loading emergency:", error);
  document.getElementById('emergency-type').textContent = "Error";
  document.getElementById('emergency-location').textContent = "Could not load location";
  document.getElementById('emergency-description').textContent = error.message || "Failed to load emergency details";
  document.getElementById('ai-loading').style.display = 'none';
  document.getElementById('ai-response').style.display = 'block';
  document.getElementById('ai-response').textContent = "Cannot provide guidance due to an error: " + (error.message || "Unknown error");
}

function updateEmergencyUI(emergency) {
  // Set emergency type and icon
  document.getElementById('emergency-type').textContent = emergency.emergency_type;
  const iconElement = document.getElementById('emergency-icon');
  iconElement.className = `fas ${getEmergencyIcon(emergency.emergency_type)}`;
  
  // Set location
  document.getElementById('emergency-location').textContent = emergency.location;
  
  // Set description
  document.getElementById('emergency-description').textContent = emergency.description;
}

async function getAIResponse(emergency) {
  const aiLoading = document.getElementById('ai-loading');
  const aiResponse = document.getElementById('ai-response');
  
  try {
    console.log("Preparing AI prompt for emergency:", emergency.id);
    
    // Construct the AI prompt
    const content = `
Emergency Type: ${emergency.emergency_type}
Location: ${emergency.location}
Description: ${emergency.description}

You are an AI responder guide. Based on this emergency, answer the following:

1. What is the best response approach?
2. Are there any hazards or special instructions?
3. What should a volunteer do upon arriving?
Please provide a clear and concise guide for volunteers. dont bold the text to avoid **
    `;
    
    // Send to AI
    await sendToAI(content);
    
  } catch (error) {
    console.error("Error getting AI response:", error);
    aiLoading.style.display = 'none';
    aiResponse.style.display = 'block';
    aiResponse.textContent = "Failed to get AI guidance: " + error.message;
  }
}

async function sendToAI(content) {
  const aiLoading = document.getElementById('ai-loading');
  const aiResponse = document.getElementById('ai-response');
  
  try {
    console.log("Sending request to AI API");
    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 15b2fe61aeb4449d8be137f37ffc752d'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const aiText = result.choices?.[0]?.message?.content || 'No response from AI';
    
    // Display response
    aiLoading.style.display = 'none';
    aiResponse.style.display = 'block';
    aiResponse.textContent = aiText;

  } catch (error) {
    console.error("Error in sendToAI:", error);
    aiLoading.style.display = 'none';
    aiResponse.style.display = 'block';
    aiResponse.textContent = "Failed to get AI response: " + error.message;
  }
}

function getEmergencyIcon(type) {
  if (!type) return 'fa-exclamation-triangle';
  type = type.toLowerCase();
  if (type.includes('fire')) return 'fa-fire';
  if (type.includes('accident') || type.includes('car')) return 'fa-car-crash';
  if (type.includes('medical') || type.includes('heart')) return 'fa-heartbeat';
  if (type.includes('flood') || type.includes('water')) return 'fa-water';
  return 'fa-exclamation-triangle';
}
javascript
import { supabase } from './supabase.js';

// Get the emergency report ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const emergencyId = urlParams.get('id');
console.log('URL emergencyId:', emergencyId);

async function getEmergencyDetails() {
  const aiDiv = document.getElementById('ai-response');
  console.log('Starting getEmergencyDetails');

  try {
    // Get the authenticated user's ID
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Session error:', sessionError);
      aiDiv.innerText = 'Please log in to view emergency details.';
      return;
    }
    const userId = session.user.id;
    console.log('Authenticated userId:', userId);

    // Fetch emergency details via emergency_responders
    console.log('Querying emergency_responders for emergencyId:', emergencyId, 'userId:', userId);
    const { data, error } = await supabase
      .from('emergency_responders')
      .select(`
        emergency_id,
        status,
        emergency_reports (
          id,
          emergency_type,
          location,
          description
        )
      `)
      .eq('responder_id', userId)
      .eq('emergency_id', emergencyId)
      .eq('status', 'accepted')
      .single();

    if (error) {
      console.error('Supabase query error:', error.message, error.details, error.hint);
      aiDiv.innerText = 'Failed to fetch emergency details: ' + error.message;
      return;
    }
    if (!data) {
      console.error('No data returned from query');
      aiDiv.innerText = 'No emergency found for this ID or you are not assigned to it.';
      return;
    }
    if (!data.emergency_reports) {
      console.error('No emergency_reports data:', data);
      aiDiv.innerText = 'Emergency details not available.';
      return;
    }

    const { emergency_type, location, description } = data.emergency_reports;
    console.log('Emergency details:', { emergency_type, location, description, status: data.status });

    // Construct the AI prompt
    const content = `
Emergency Type: ${emergency_type}
Location: ${location}
Description: ${description}

You are an AI responder guide. Based on this emergency, answer the following:

1. What is the best response approach?
2. Are there any hazards or special instructions?
3. What should a volunteer do upon arriving?
Please provide a clear and concise guide for volunteers. dont bold the text to avoid **
    `;
    console.log('AI prompt constructed:', content);

    // Send to AI
    await sendToAI(content);

  } catch (err) {
    console.error('Unexpected error in getEmergencyDetails:', err.message, err.stack);
    aiDiv.innerText = 'Failed to load emergency details: ' + err.message;
  }
}

async function sendToAI(content) {
  const aiDiv = document.getElementById('ai-response');
  console.log('Starting sendToAI');

  try {
    console.log('Sending request to AI API');
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

    console.log('AI API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
    }

    const result = await response.json();
    console.log('AI API raw response:', result);
    const aiText = result.choices?.[0]?.message?.content || 'AI did not return a valid response.';
    console.log('AI response text:', aiText);
    aiDiv.innerText = aiText;

  } catch (err) {
    console.error('Error in sendToAI:', err.message, err.stack);
    aiDiv.innerText = 'Failed to get AI response: ' + err.message;
  }
}

getEmergencyDetails();
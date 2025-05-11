import { supabase } from './supabase.js';

let userId = null;
let availabilityInterval = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Try to get user session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    userId = session.user.id;
    console.log("User logged in via Supabase session:", userId);
  } else {
    // Fallback to localStorage (adjust key as needed)
    const storedSession = JSON.parse(localStorage.getItem('respondSession'));
    if (storedSession && storedSession.user) {
      userId = storedSession.user.id;
      console.log("User logged in via localStorage:", userId);
    }
  }

  if (!userId) {
    console.error("No user session found");
    alert("Please log in to access the responder dashboard");
    window.location.href = 'login.html'; // Adjust to your login page
    return;
  }

  // Load initial data
  await loadEmergencyAlerts();
  await loadNotifications();
  await checkAvailabilityStatus();

  // Set up event listeners
  document.getElementById('notifications-toggle').addEventListener('click', (e) => {
    e.preventDefault();
    const panel = document.getElementById('notification-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });

  document.getElementById('alerts-tab').addEventListener('click', async (e) => {
    e.preventDefault();
    await loadEmergencyAlerts();
  });

  document.getElementById('availability-toggle').addEventListener('change', async (e) => {
    await updateAvailabilityStatus(e.target.checked);
  });

  // Refresh alerts and notifications every 30 seconds
  setInterval(async () => {
    await loadEmergencyAlerts();
    await loadNotifications();
  }, 30000);
});

async function loadEmergencyAlerts() {
  if (!userId) {
    console.error("Cannot load alerts: userId is null");
    return;
  }

  try {
    console.log("Fetching alerts for responder_id:", userId);
    const { data: alerts, error } = await supabase
      .from('emergency_responders')
      .select(`
        id,
        emergency_id,
        status,
        created_at,
        expires_at,
        emergency_reports:emergency_id (
          id,
          emergency_type,
          location,
          description,
          created_at
        )
      `)
      .eq('responder_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching alerts:", error);
      throw error;
    }

    console.log("Fetched alerts:", alerts);

    const alertsList = document.getElementById('emergencies-list');
    alertsList.innerHTML = '';

    const activeCount = alerts.filter(alert => alert.status === 'pending').length;
    document.getElementById('alert-count').textContent = activeCount;
    console.log("Active alerts count:", activeCount);

    alerts.forEach(alert => {
      const emergency = alert.emergency_reports;
      if (!emergency) {
        console.warn("No emergency data for alert:", alert);
        return;
      }

      const isExpired = new Date() > new Date(alert.expires_at);
      const status = isExpired && alert.status === 'pending' ? 'expired' : alert.status;
      const statusClass = status === 'pending' ? 'status-active' : 'status-expired';
      const statusText = status === 'pending' ? 'Active' : 'Expired';

      const alertItem = document.createElement('li');
      alertItem.className = 'emergency-item';
      alertItem.innerHTML = `
        <div class="emergency-icon ${getIconClass(emergency.emergency_type)}">
          <i class="fas ${getEmergencyIcon(emergency.emergency_type)}"></i>
        </div>
        <div class="emergency-info">
          <div class="emergency-title">${emergency.emergency_type}</div>
          <div class="emergency-location">${emergency.location}</div>
          <div class="emergency-time">Received ${formatTimeAgo(alert.created_at)}</div>
        </div>
        <span class="emergency-status ${statusClass}">${statusText}</span>
        ${status === 'pending' ?
          `<button class="respond-btn" data-id="${alert.id}" data-emergency-id="${emergency.id}">Respond</button>` :
          `<button class="respond-btn" style="background-color: var(--gray);" disabled>Details</button>`}
      `;

      if (status === 'pending') {
        alertItem.querySelector('.respond-btn').addEventListener('click', async () => {
          console.log("Responding to alert:", alert.id);
          await respondToEmergency(alert.id, emergency);
        });
      }

      alertsList.appendChild(alertItem);
    });

    // Check for expired alerts
    await checkExpiredAlerts();

  } catch (error) {
    console.error('Error loading alerts:', error);
  }
}

async function respondToEmergency(alertId, emergency) {
  try {
    console.log("Updating alert status to accepted:", alertId);
    const { error } = await supabase
      .from('emergency_responders')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      console.error("Error updating alert:", error);
      throw error;
    }

    // Get responder's full name
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('fullname')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      throw userError;
    }

    // Create notification for admin
    console.log("Inserting admin notification for emergency:", emergency.id);
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .insert({
        emergency_id: emergency.id,
        responder_id: userId,
        message: `${user.fullname} accepted emergency: ${emergency.emergency_type} at ${emergency.location}`,
        status: 'unread',
        created_at: new Date().toISOString()
      });

    if (notificationError) {
      console.error("Error inserting admin notification:", notificationError);
      throw notificationError;
    }

    // Redirect to respond page
    console.log("Redirecting to respond.html for emergency:", emergency.id);
    window.location.href = `respond.html?emergency=${emergency.id}`;

  } catch (error) {
    console.error('Error responding to emergency:', error);
    alert('Failed to respond to emergency');
  }
}

async function checkExpiredAlerts() {
  try {
    const now = new Date().toISOString();
    console.log("Checking for expired alerts before:", now);

    const { data: expiredAlerts, error } = await supabase
      .from('emergency_responders')
      .select(`
        id,
        emergency_id,
        responder_id,
        emergency_reports:emergency_id (emergency_type, location)
      `)
      .eq('responder_id', userId)
      .eq('status', 'pending')
      .lte('expires_at', now);

    if (error) {
      console.error("Error fetching expired alerts:", error);
      throw error;
    }

    console.log("Expired alerts found:", expiredAlerts);

    if (expiredAlerts.length > 0) {
      // Update expired alerts
      console.log("Updating expired alerts:", expiredAlerts.map(a => a.id));
      const { error: updateError } = await supabase
        .from('emergency_responders')
        .update({ status: 'expired' })
        .in('id', expiredAlerts.map(a => a.id));

      if (updateError) {
        console.error("Error updating expired alerts:", updateError);
        throw updateError;
      }

      // Get responder's full name
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('fullname')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error("Error fetching user for expired alerts:", userError);
        throw userError;
      }

      // Create notifications for admin
      const notifications = expiredAlerts.map(alert => ({
        emergency_id: alert.emergency_id,
        responder_id: userId,
        message: `${user.fullname} did not respond to ${alert.emergency_reports.emergency_type} at ${alert.emergency_reports.location} in time`,
        status: 'unread',
        created_at: new Date().toISOString()
      }));

      console.log("Inserting admin notifications for expired alerts:", notifications);
      const { error: notificationError } = await supabase
        .from('admin_notifications')
        .insert(notifications);

      if (notificationError) {
        console.error("Error inserting admin notifications:", notificationError);
        throw notificationError;
      }

      // Reload alerts
      await loadEmergencyAlerts();
    }
  } catch (error) {
    console.error('Error checking expired alerts:', error);
  }
}

async function loadNotifications() {
  try {
    console.log("Fetching notifications for responder_id:", userId);
    const { data: notifications, error } = await supabase
      .from('responder_notifications')
      .select(`
        *,
        emergency_reports:emergency_id (emergency_type, location)
      `)
      .eq('responder_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }

    console.log("Fetched notifications:", notifications);

    const notificationList = document.getElementById('notification-list');
    notificationList.innerHTML = '';

    notifications.forEach(notification => {
      const notificationItem = document.createElement('div');
      notificationItem.className = 'notification-item';
      notificationItem.innerHTML = `
        <div class="notification-icon">
          <i class="fas fa-bell"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notification.emergency_reports.emergency_type}</div>
          <div class="notification-message">${notification.message}</div>
          <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
        </div>
      `;
      notificationList.appendChild(notificationItem);
    });

    // Update notification badge
    document.getElementById('notification-badge').textContent = notifications.length;

  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

async function updateAvailabilityStatus(isAvailable) {
  try {
    console.log("Updating availability status to:", isAvailable);
    const { error } = await supabase
      .from('users')
      .update({ is_active: isAvailable, last_active: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error("Error updating availability:", error);
      throw error;
    }

    if (isAvailable) {
      availabilityInterval = setInterval(async () => {
        await supabase
          .from('users')
          .update({ last_active: new Date().toISOString() })
          .eq('id', userId);
      }, 300000); // Update every 5 minutes
    } else {
      if (availabilityInterval) {
        clearInterval(availabilityInterval);
        availabilityInterval = null;
      }
    }

  } catch (error) {
    console.error('Error updating availability:', error);
    document.getElementById('availability-toggle').checked = !isAvailable;
  }
}

async function checkAvailabilityStatus() {
  try {
    console.log("Checking availability status for user:", userId);
    const { data: user, error } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching availability:", error);
      throw error;
    }

    console.log("User availability:", user.is_active);
    const toggle = document.getElementById('availability-toggle');
    if (user) {
      toggle.checked = user.is_active;
      if (user.is_active) {
        availabilityInterval = setInterval(async () => {
          await supabase
            .from('users')
            .update({ last_active: new Date().toISOString() })
            .eq('id', userId);
        }, 300000);
      }
    } else {
      await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);
      toggle.checked = false;
    }

  } catch (error) {
    console.error('Error checking availability:', error);
  }
}

function getIconClass(type) {
  if (!type) return '';
  type = type.toLowerCase();
  if (type.includes('fire')) return 'fire-icon';
  if (type.includes('medical')) return 'medical-icon';
  if (type.includes('police')) return 'police-icon';
  return '';
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

function formatTimeAgo(datetime) {
  const diff = Math.floor((new Date() - new Date(datetime)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}
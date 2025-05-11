import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", async () => {
  await fetchEmergencies();
  await fetchVolunteersCount();
  await loadAdminNotifications();
  setInterval(loadAdminNotifications, 30000); // Refresh notifications every 30 seconds

  // Add click handler for "View All" button
  document.querySelector('.card-footer a[href="#"]').addEventListener('click', (e) => {
    e.preventDefault();
    showEmergencyPanel();
  });
});

// Global variables
let currentEmergencyId = null;
const emergencyPanel = createEmergencyPanel();
const responderPanel = createResponderPanel();

async function fetchEmergencies() {
  const emergencyList = document.querySelector(".emergency-list");
  const activeEmergenciesCount = document.querySelector(".stats-card.primary .stat-number");
  const navBadge = document.querySelector("nav ul li a .badge");

  try {
    const { data, error } = await supabase
      .from('emergency_reports')
      .select('id, emergency_type, location, description, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const count = data.length;
    activeEmergenciesCount.textContent = count;
    navBadge.textContent = count;

    emergencyList.innerHTML = "";

    data.forEach(report => {
      const statusClass = getStatusClass(report.emergency_type);
      const listItem = document.createElement("li");

      listItem.className = "emergency-item";
      listItem.innerHTML = `
        <div class="emergency-status ${statusClass}">
          <i class="fas ${getEmergencyIcon(report.emergency_type)}"></i>
        </div>
        <div class="emergency-details">
          <div class="emergency-title">${report.emergency_type}</div>
          <div class="emergency-location">${report.location}</div>
          <div class="emergency-time">Reported ${formatTimeAgo(report.created_at)}</div>
        </div>
        <div class="emergency-actions">
          <button class="respond-btn" data-id="${report.id}"><i class="fas fa-ambulance"></i> Respond</button>
        </div>
      `;

      emergencyList.appendChild(listItem);
    });

    // Add event listeners to all respond buttons
    document.querySelectorAll('.respond-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentEmergencyId = e.currentTarget.getAttribute('data-id');
        showResponderPanel(currentEmergencyId);
      });
    });

  } catch (err) {
    console.error("Failed to load emergencies:", err.message);
    document.querySelector(".stats-card.primary .stat-number").textContent = "0";
    document.querySelector("nav ul li a .badge").textContent = "0";
  }
}

function createEmergencyPanel() {
  const panel = document.createElement('div');
  panel.className = 'emergency-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h3>All Emergency Reports</h3>
      <button class="close-panel">&times;</button>
    </div>
    <div class="panel-content">
      <div class="emergencies-list"></div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('.close-panel').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  return panel;
}

function createResponderPanel() {
  const panel = document.createElement('div');
  panel.className = 'responder-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h3>Select Responders</h3>
      <button class="close-panel">&times;</button>
    </div>
    <div class="panel-content">
      <div class="responder-controls">
        <button class="select-all">Select All</button>
        <button class="notify-all">Notify All</button>
      </div>
      <div class="responders-list"></div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('.close-panel').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  panel.querySelector('.select-all').addEventListener('click', toggleSelectAll);
  panel.querySelector('.notify-all').addEventListener('click', notifyResponders);

  return panel;
}

async function showEmergencyPanel() {
  try {
    const { data, error } = await supabase
      .from('emergency_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const listContainer = emergencyPanel.querySelector('.emergencies-list');
    listContainer.innerHTML = '';

    data.forEach(emergency => {
      const emergencyItem = document.createElement('div');
      emergencyItem.className = 'emergency-item';
      emergencyItem.innerHTML = `
        <div class="emergency-info">
          <h4>${emergency.emergency_type}</h4>
          <p><strong>Location:</strong> ${emergency.location}</p>
          <p><strong>Description:</strong> ${emergency.description}</p>
          <p class="time">Reported ${formatTimeAgo(emergency.created_at)}</p>
        </div>
        <button class="respond-btn" data-id="${emergency.id}">Respond</button>
      `;

      emergencyItem.querySelector('.respond-btn').addEventListener('click', (e) => {
        currentEmergencyId = e.currentTarget.getAttribute('data-id');
        emergencyPanel.style.display = 'none';
        showResponderPanel(currentEmergencyId);
      });

      listContainer.appendChild(emergencyItem);
    });

    emergencyPanel.style.display = 'block';
  } catch (err) {
    console.error("Failed to load emergencies:", err);
    alert("Failed to load emergency reports");
  }
}

async function showResponderPanel(emergencyId) {
  try {
    const { data: emergencyData, error: emergencyError } = await supabase
      .from('emergency_reports')
      .select('*')
      .eq('id', emergencyId)
      .single();

    if (emergencyError) throw emergencyError;

    const { data: responders, error: responderError } = await supabase
      .from('users')
      .select('id, fullname, skills, equipment, mobile')
      .eq('role', 'responder');

    if (responderError) throw responderError;

    responderPanel.querySelector('.panel-header h3').textContent =
      `Respond to: ${emergencyData.emergency_type} (${emergencyData.location})`;

    const listContainer = responderPanel.querySelector('.responders-list');
    listContainer.innerHTML = '';

    responders.forEach(responder => {
      const responderItem = document.createElement('div');
      responderItem.className = 'responder-item';
      responderItem.innerHTML = `
        <div class="responder-info">
          <label class="checkbox-container">
            <input type="checkbox" class="responder-checkbox" data-id="${responder.id}">
            <span class="checkmark"></span>
          </label>
          <div class="details">
            <h4>${responder.fullname}</h4>
            <p><strong>Skills:</strong> ${responder.skills || 'N/A'}</p>
            <p><strong>Equipment:</strong> ${responder.equipment || 'N/A'}</p>
            <p><strong>Contact:</strong> ${responder.mobile || 'N/A'}</p>
          </div>
        </div>
        <button class="notify-btn" data-id="${responder.id}">Notify</button>
      `;

      responderItem.querySelector('.notify-btn').addEventListener('click', (e) => {
        const responderId = e.currentTarget.getAttribute('data-id');
        notifyResponder(responderId, emergencyData);
      });

      listContainer.appendChild(responderItem);
    });

    responderPanel.style.display = 'block';
  } catch (err) {
    console.error("Failed to load responders:", err);
    alert("Failed to load responder information");
  }
}

function toggleSelectAll() {
  const checkboxes = responderPanel.querySelectorAll('.responder-checkbox');
  const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);

  checkboxes.forEach(checkbox => {
    checkbox.checked = !allChecked;
  });
}

async function notifyResponders() {
  const checkboxes = responderPanel.querySelectorAll('.responder-checkbox:checked');
  if (checkboxes.length === 0) {
    alert("Please select at least one responder");
    return;
  }

  try {
    const { data: emergencyData } = await supabase
      .from('emergency_reports')
      .select('*')
      .eq('id', currentEmergencyId)
      .single();

    const responderIds = Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-id'));

    // Calculate expiration time (5 minutes from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    // Insert into emergency_responders
    const emergencyResponders = responderIds.map(responderId => ({
      emergency_id: currentEmergencyId,
      responder_id: responderId,
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: expiresAt
    }));

    const { error: insertError } = await supabase
      .from('emergency_responders')
      .insert(emergencyResponders);

    if (insertError) throw insertError;

    // Insert notifications for responders
    const notifications = responderIds.map(responderId => ({
      emergency_id: currentEmergencyId,
      responder_id: responderId,
      message: `New emergency: ${emergencyData.emergency_type} at ${emergencyData.location}`,
      created_at: now.toISOString()
    }));

    const { error: notificationError } = await supabase
      .from('responder_notifications')
      .insert(notifications);

    if (notificationError) throw notificationError;

    alert(`Notification sent to ${responderIds.length} responders about ${emergencyData.emergency_type} emergency`);

    // Update emergency status
    await supabase
      .from('emergency_reports')
      .update({ status: 'responders_notified' })
      .eq('id', currentEmergencyId);

    responderPanel.style.display = 'none';
    await fetchEmergencies();

  } catch (err) {
    console.error("Failed to notify responders:", err);
    alert("Failed to send notifications");
  }
}

async function notifyResponder(responderId, emergencyData) {
  try {
    // Calculate expiration time (5 minutes from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    // Insert into emergency_responders
    const { error: insertError } = await supabase
      .from('emergency_responders')
      .insert({
        emergency_id: emergencyData.id,
        responder_id: responderId,
        status: 'pending',
        created_at: now.toISOString(),
        expires_at: expiresAt
      });

    if (insertError) throw insertError;

    // Insert notification for responder
    const { error: notificationError } = await supabase
      .from('responder_notifications')
      .insert({
        emergency_id: emergencyData.id,
        responder_id: responderId,
        message: `New emergency: ${emergencyData.emergency_type} at ${emergencyData.location}`,
        created_at: now.toISOString()
      });

    if (notificationError) throw notificationError;

    alert(`Notification sent to responder about ${emergencyData.emergency_type} emergency`);

  } catch (err) {
    console.error("Failed to notify responder:", err);
    alert("Failed to send notification");
  }
}

async function loadAdminNotifications() {
  try {
    const { data: notifications, error } = await supabase
      .from('admin_notifications')
      .select(`
        *,
        users:responder_id (fullname),
        emergency_reports:emergency_id (emergency_type, location)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const notificationList = document.getElementById('admin-notifications-list');
    if (!notificationList) return;

    notificationList.innerHTML = '';

    notifications.forEach(notification => {
      const notificationItem = document.createElement('div');
      notificationItem.className = 'notification-item';
      notificationItem.innerHTML = `
        <div class="notification-icon">
          <i class="fas fa-bell"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notification.users.fullname} - ${notification.emergency_reports.emergency_type}</div>
          <div class="notification-message">${notification.message}</div>
          <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
        </div>
      `;
      notificationList.appendChild(notificationItem);
    });

    // Update badge count
    const unreadCount = notifications.filter(n => n.status === 'unread').length;
    document.getElementById('notification-badge').textContent = unreadCount;

  } catch (error) {
    console.error('Error loading admin notifications:', error);
  }
}

async function fetchVolunteersCount() {
  const volunteersCountElement = document.querySelector(".stats-card.accent .stat-number");

  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'responder');

    if (error) throw error;

    volunteersCountElement.textContent = count || "0";

  } catch (err) {
    console.error("Failed to load responders count:", err.message);
    volunteersCountElement.textContent = "0";
  }
}

function getStatusClass(type) {
  if (!type) return "status-low";
  type = type.toLowerCase();
  if (type.includes("fire") || type.includes("explosion")) return "status-critical";
  if (type.includes("accident") || type.includes("injury") || type.includes("assault")) return "status-high";
  if (type.includes("flood") || type.includes("medical") || type.includes("heart")) return "status-medium";
  return "status-low";
}

function getEmergencyIcon(type) {
  if (!type) return "fa-exclamation-triangle";
  type = type.toLowerCase();
  if (type.includes("fire")) return "fa-fire";
  if (type.includes("accident") || type.includes("car")) return "fa-car-crash";
  if (type.includes("medical") || type.includes("heart")) return "fa-heartbeat";
  if (type.includes("flood") || type.includes("water")) return "fa-water";
  return "fa-exclamation-triangle";
}

function formatTimeAgo(datetime) {
  const diff = Math.floor((new Date() - new Date(datetime)) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}
const STORAGE_KEY = "campusEventPortalData_v1";

const starterEvents = [
  {
    id: "evt-web-101",
    title: "Web Design Workshop",
    category: "Workshop",
    date: "2026-11-05",
    time: "14:00",
    venue: "Computer Lab 2",
    capacity: 40,
    description: "Learn the basics of page structure, layout, and accessible web design in a guided session.",
    eligibility: "All students",
    registrations: []
  },
  {
    id: "evt-idea-102",
    title: "Campus Innovation Challenge",
    category: "Competition",
    date: "2026-11-12",
    time: "10:30",
    venue: "Seminar Hall A",
    capacity: 60,
    description: "Present a practical idea that could improve campus life. Teams and individual entries are welcome.",
    eligibility: "All undergraduate students",
    registrations: []
  },
  {
    id: "evt-career-103",
    title: "Careers in Technology",
    category: "Seminar",
    date: "2026-11-18",
    time: "12:00",
    venue: "Main Auditorium",
    capacity: 100,
    description: "A campus talk about technology careers, portfolios, internships, and early professional skills.",
    eligibility: "All students",
    registrations: []
  },
  {
    id: "evt-music-104",
    title: "Campus Music Evening",
    category: "Cultural",
    date: "2026-11-22",
    time: "17:00",
    venue: "Open-Air Stage",
    capacity: 80,
    description: "An evening of student performances and music. Please bring your college ID for entry.",
    eligibility: "All students",
    registrations: []
  }
];

let data = loadData();
let activeEventId = null;

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.events) && Array.isArray(parsed.registrations)) return parsed;
    }
  } catch (error) {
    console.warn("Could not read saved portal data.", error);
  }
  return { events: structuredCloneSafe(starterEvents), registrations: [] };
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    showAdminMessage("Could not save data in this browser. Storage may be disabled.", true);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return "Date not set";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(timeString) {
  if (!timeString) return "Time not set";
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function seatsLeft(event) {
  return Math.max(0, Number(event.capacity) - event.registrations.length);
}

function renderEvents() {
  const query = document.getElementById("event-search").value.trim().toLowerCase();
  const container = document.getElementById("event-list");
  const events = [...data.events]
    .filter(event => [event.title, event.category, event.venue, event.description].join(" ").toLowerCase().includes(query))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  if (!events.length) {
    container.innerHTML = '<p class="empty-state">No events match your search.</p>';
    return;
  }

  container.innerHTML = events.map(event => {
    const remaining = seatsLeft(event);
    const seatClass = remaining === 0 ? "full" : remaining <= 5 ? "low" : "available";
    const seatText = remaining === 0 ? "Registration full" : `${remaining} seat${remaining === 1 ? "" : "s"} available`;
    return `
      <article class="event-card">
        <div class="event-card-header">
          <span class="tag">${escapeHTML(event.category)}</span>
          <h3>${escapeHTML(event.title)}</h3>
          <span class="muted">${escapeHTML(formatDate(event.date))} · ${escapeHTML(formatTime(event.time))}</span>
        </div>
        <div class="event-card-body">
          <p>${escapeHTML(event.description)}</p>
          <div class="event-meta">
            <div><strong>Venue</strong><br>${escapeHTML(event.venue)}</div>
            <div><strong>Eligibility</strong><br>${escapeHTML(event.eligibility || "All students")}</div>
            <div><strong>Capacity</strong><br>${Number(event.capacity)} seats</div>
            <div><strong>Category</strong><br>${escapeHTML(event.category)}</div>
          </div>
          <div class="seat-row">
            <span class="seats ${seatClass}">${seatText}</span>
            <button type="button" data-register="${escapeHTML(event.id)}" ${remaining === 0 ? "disabled" : ""}>
              ${remaining === 0 ? "Full" : "Register"}
            </button>
          </div>
        </div>
      </article>`;
  }).join("");

  container.querySelectorAll("[data-register]").forEach(button => {
    button.addEventListener("click", () => openRegistration(button.dataset.register));
  });
}

function renderRegistrations() {
  const container = document.getElementById("registration-list");
  if (!data.registrations.length) {
    container.innerHTML = '<p class="empty-state">You haven\'t registered for any events yet.</p>';
    return;
  }
  container.innerHTML = [...data.registrations].reverse().map(reg => {
    const event = data.events.find(item => item.id === reg.eventId);
    return `
      <div class="registration-row">
        <div>
          <h3>${escapeHTML(event ? event.title : "Event")}</h3>
          <p>${escapeHTML(reg.studentName)} · ${escapeHTML(formatDate(reg.registeredAt))}</p>
          <p class="muted">Confirmation ID: ${escapeHTML(reg.confirmationId)}</p>
        </div>
        <button type="button" data-slip="${escapeHTML(reg.confirmationId)}">View confirmation</button>
      </div>`;
  }).join("");
  container.querySelectorAll("[data-slip]").forEach(button => {
    button.addEventListener("click", () => showConfirmation(button.dataset.slip));
  });
}

function openRegistration(eventId) {
  const event = data.events.find(item => item.id === eventId);
  if (!event || seatsLeft(event) <= 0) {
    renderEvents();
    return;
  }
  activeEventId = eventId;
  document.getElementById("dialog-event-title").textContent = event.title;
  document.getElementById("dialog-event-info").textContent =
    `${formatDate(event.date)} at ${formatTime(event.time)} · ${event.venue} · ${seatsLeft(event)} seats left`;
  document.querySelector('#registration-form [name="eventId"]').value = eventId;
  document.getElementById("registration-dialog").showModal();
}

function closeDialog(id) {
  document.getElementById(id).close();
}

document.getElementById("registration-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const eventId = String(formData.get("eventId"));
  const chosenEvent = data.events.find(item => item.id === eventId);

  // Check seat availability again at submit time to prevent exceeding capacity in this demo.
  if (!chosenEvent || seatsLeft(chosenEvent) <= 0) {
    closeDialog("registration-dialog");
    renderEvents();
    showAdminMessage("Sorry, this event has just become full. Please choose another event.", true);
    return;
  }

  const email = String(formData.get("email")).trim().toLowerCase();
  const studentId = String(formData.get("studentId")).trim();
  const duplicate = data.registrations.some(reg =>
    reg.eventId === eventId && (reg.email.toLowerCase() === email || reg.studentId.toLowerCase() === studentId.toLowerCase())
  );
  if (duplicate) {
    alert("This email or student ID is already registered for this event.");
    return;
  }

  const registration = {
    confirmationId: `CEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    eventId,
    studentName: String(formData.get("studentName")).trim(),
    email,
    studentId,
    registeredAt: new Date().toISOString().slice(0, 10)
  };
  chosenEvent.registrations.push(registration);
  data.registrations.push(registration);
  saveData();
  form.reset();
  closeDialog("registration-dialog");
  renderAll();
  showConfirmation(registration.confirmationId);
});

document.getElementById("event-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const title = String(values.get("title")).trim();
  const date = String(values.get("date"));
  const time = String(values.get("time"));
  const capacity = Number(values.get("capacity"));

  if (!title || !date || !time || !Number.isInteger(capacity) || capacity < 1) {
    showAdminMessage("Please complete the required fields and enter a valid seat limit.", true);
    return;
  }
  if (date < new Date().toISOString().slice(0, 10)) {
    showAdminMessage("Please choose today or a future date for the event.", true);
    return;
  }

  const newEvent = {
    id: `evt-${Date.now().toString(36)}`,
    title,
    category: String(values.get("category")),
    date,
    time,
    venue: String(values.get("venue")).trim(),
    capacity,
    description: String(values.get("description")).trim(),
    eligibility: String(values.get("eligibility")).trim() || "All students",
    registrations: []
  };
  data.events.push(newEvent);
  saveData();
  form.reset();
  form.elements.capacity.value = 50;
  showAdminMessage("Event added to the directory.");
  renderAll();
});

function showAdminMessage(message, isError = false) {
  const box = document.getElementById("admin-message");
  box.textContent = message;
  box.classList.toggle("error", isError);
}

function showConfirmation(confirmationId) {
  const reg = data.registrations.find(item => item.confirmationId === confirmationId);
  if (!reg) return;
  const event = data.events.find(item => item.id === reg.eventId);
  if (!event) return;

  document.getElementById("confirmation-content").innerHTML = `
    <div class="slip-header">
      <p class="eyebrow">CAMPUS EVENT PORTAL</p>
      <h2>Registration Confirmation</h2>
      <p class="muted">Please keep this slip for your records.</p>
    </div>
    <div class="slip-code">${escapeHTML(reg.confirmationId)}</div>
    <table class="slip-details">
      <tr><td>Student name</td><td>${escapeHTML(reg.studentName)}</td></tr>
      <tr><td>Student ID</td><td>${escapeHTML(reg.studentId)}</td></tr>
      <tr><td>Email</td><td>${escapeHTML(reg.email)}</td></tr>
      <tr><td>Event</td><td>${escapeHTML(event.title)}</td></tr>
      <tr><td>Date and time</td><td>${escapeHTML(formatDate(event.date))}, ${escapeHTML(formatTime(event.time))}</td></tr>
      <tr><td>Venue</td><td>${escapeHTML(event.venue)}</td></tr>
      <tr><td>Registered on</td><td>${escapeHTML(formatDate(reg.registeredAt))}</td></tr>
    </table>
    <p class="small-note">This is a browser-generated confirmation for a student project demo.</p>`;
  document.getElementById("confirmation-dialog").showModal();
}

function renderAll() {
  renderEvents();
  renderRegistrations();
}

document.getElementById("event-search").addEventListener("input", renderEvents);
document.getElementById("close-dialog").addEventListener("click", () => closeDialog("registration-dialog"));
document.getElementById("close-confirmation").addEventListener("click", () => closeDialog("confirmation-dialog"));
document.getElementById("print-confirmation").addEventListener("click", () => window.print());

document.getElementById("today-date").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "short", day: "2-digit", month: "short", year: "numeric"
}).toUpperCase();
document.getElementById("year").textContent = new Date().getFullYear();

renderAll();

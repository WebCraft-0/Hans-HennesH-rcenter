import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDyLOvvcqH9ZqrYl0uWYLKXl9czRvbtD0o",
  authDomain: "hans-hennes-harcenter.firebaseapp.com",
  projectId: "hans-hennes-harcenter",
  storageBucket: "hans-hennes-harcenter.appspot.com",
  messagingSenderId: "766588486231",
  appId: "1:766588486231:web:90439e599e0633e7c25912",
  measurementId: "G-L0TVKB7K55",
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global variables to cache data ---
let salonInfo = {};

// --- DOM Element References ---
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const editForm = document.getElementById("edit-form");
const loginError = document.getElementById("login-error");
const saveSuccess = document.getElementById("save-success");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const serviceForm = document.getElementById("service-form");
const servicesList = document.getElementById("services-list");
const serviceIdField = document.getElementById("service-id");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const appointmentsList = document.getElementById("appointments-list");
const hoursEditor = document.getElementById("hours-editor");
const bookingEnabledToggle = document.getElementById("booking-enabled");

// --- Edit Modal DOM References ---
const editModal = document.getElementById("edit-appointment-modal");
const modalCustomerName = document.getElementById("modal-customer-name");
const modalAppointmentId = document.getElementById("modal-appointment-id");
const modalServiceDuration = document.getElementById("modal-service-duration");
const modalDateInput = document.getElementById("modal-date");
const modalTimeSelect = document.getElementById("modal-time");
const modalTimeLoader = document.getElementById("modal-time-loader");
const modalSaveBtn = document.getElementById("modal-save-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");

// --- Confirmation Modal DOM References ---
const confirmationModal = document.getElementById("confirmation-modal");
const confirmationTitle = document.getElementById("confirmation-title");
const confirmationMessage = document.getElementById("confirmation-message");
const confirmationConfirmBtn = document.getElementById(
  "confirmation-confirm-btn"
);
const confirmationCancelBtn = document.getElementById(
  "confirmation-cancel-btn"
);

// --- AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginView.classList.add("hidden");
    adminView.classList.remove("hidden");
    buildHoursEditor();
    await loadSalonData(); // Await ensures salonInfo is loaded before other functions run
    listenForServices();
    listenForAppointments();
  } else {
    loginView.classList.remove("hidden");
    adminView.classList.add("hidden");
  }
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  signInWithEmailAndPassword(
    auth,
    loginForm.email.value,
    loginForm.password.value
  ).catch((error) => {
    loginError.textContent = "Ugyldig e-post eller passord.";
  });
});

logoutBtn.addEventListener("click", () => signOut(auth));

// --- TAB NAVIGATION ---
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((btn) => btn.classList.remove("active-tab"));
    button.classList.add("active-tab");
    tabContents.forEach((content) => {
      content.classList.toggle(
        "hidden",
        content.id !== `${button.dataset.tab}-tab`
      );
    });
  });
});

// --- SALON INFO & HOURS MANAGEMENT ---
const salonInfoDocRef = doc(db, "salonInfo", "details");

async function loadSalonData() {
  try {
    const docSnap = await getDoc(salonInfoDocRef);
    if (docSnap.exists()) {
      salonInfo = docSnap.data(); // Cache the salon data globally
      editForm["edit-phone"].value = salonInfo.phone || "";
      editForm["edit-email"].value = salonInfo.email || "";
      editForm["edit-address"].value = salonInfo.address || "";
      bookingEnabledToggle.checked = salonInfo.bookingEnabled !== false;
      editForm["booking-lead-time"].value = salonInfo.bookingLeadTime || 30;

      if (salonInfo.hours) {
        const days = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ];
        days.forEach((day) => {
          const openEl = document.getElementById(`edit-hours-${day}-open`);
          const closeEl = document.getElementById(`edit-hours-${day}-close`);
          if (openEl && closeEl) {
            openEl.value = salonInfo.hours[day]?.open || "Stengt";
            closeEl.value = salonInfo.hours[day]?.close || "Stengt";
          }
        });
      }
    }
  } catch (error) {
    console.error("Error loading salon info:", error);
  }
}

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const hours = {};
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  days.forEach((day) => {
    hours[day] = {
      open: document.getElementById(`edit-hours-${day}-open`).value,
      close: document.getElementById(`edit-hours-${day}-close`).value,
    };
  });

  const updatedData = {
    phone: editForm["edit-phone"].value,
    email: editForm["edit-email"].value,
    address: editForm["edit-address"].value,
    bookingEnabled: bookingEnabledToggle.checked,
    bookingLeadTime: parseInt(editForm["booking-lead-time"].value, 10),
    hours: hours,
  };

  try {
    await setDoc(salonInfoDocRef, updatedData, { merge: true });
    salonInfo = updatedData; // Update the cached salon info
    showSuccessMessage("Info lagret!");
  } catch (error) {
    console.error("Error saving salon info:", error);
  }
});

function buildHoursEditor() {
  const daysOfWeek = {
    monday: "Mandag",
    tuesday: "Tirsdag",
    wednesday: "Onsdag",
    thursday: "Torsdag",
    friday: "Fredag",
    saturday: "Lørdag",
    sunday: "Søndag",
  };
  const dayKeys = Object.keys(daysOfWeek);
  hoursEditor.innerHTML = `
        <div class="apply-all-row grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-4 bg-gray-100 rounded-lg">
            <h3 class="font-bold sm:col-span-1 text-gray-800">Bruk for ukedager:</h3>
            <div class="sm:col-span-2 grid grid-cols-2 gap-4">
                <select id="apply-open" class="time-select"></select>
                <select id="apply-close" class="time-select"></select>
            </div>
            <button type="button" id="apply-all-btn" class="sm:col-start-2 sm:col-span-2 btn-accent mt-2 sm:mt-0 py-2">Bruk for man-fre</button>
        </div><hr class="my-6">`;
  dayKeys.forEach((dayKey) => {
    const dayContainer = document.createElement("div");
    dayContainer.className =
      "grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100";
    dayContainer.innerHTML = `
            <label class="font-semibold col-span-1">${daysOfWeek[dayKey]}</label>
            <div class="col-span-2 grid grid-cols-2 gap-4">
                <select id="edit-hours-${dayKey}-open" class="time-select"></select>
                <select id="edit-hours-${dayKey}-close" class="time-select"></select>
            </div>`;
    hoursEditor.appendChild(dayContainer);
  });
  populateTimeSelects();
  document
    .getElementById("apply-all-btn")
    .addEventListener("click", applyToAllWeekdays);
}

function populateTimeSelects() {
  const selects = document.querySelectorAll(".time-select");
  selects.forEach((select) => {
    select.innerHTML = '<option value="Stengt">Stengt</option>';
    for (let i = 7; i <= 20; i++) {
      for (let j = 0; j < 60; j += 15) {
        const hour = i.toString().padStart(2, "0");
        const min = j.toString().padStart(2, "0");
        const time = `${hour}:${min}`;
        select.innerHTML += `<option value="${time}">${time}</option>`;
      }
    }
  });
}

function applyToAllWeekdays() {
  const openTime = document.getElementById("apply-open").value;
  const closeTime = document.getElementById("apply-close").value;
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  weekdays.forEach((day) => {
    document.getElementById(`edit-hours-${day}-open`).value = openTime;
    document.getElementById(`edit-hours-${day}-close`).value = closeTime;
  });
}

// --- CONFIRMATION MODAL ---
function showConfirmationModal(title, message) {
  return new Promise((resolve) => {
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;
    confirmationModal.classList.remove("hidden");
    confirmationModal.classList.add("flex");

    confirmationConfirmBtn.onclick = () => {
      confirmationModal.classList.add("hidden");
      resolve(true);
    };
    confirmationCancelBtn.onclick = () => {
      confirmationModal.classList.add("hidden");
      resolve(false);
    };
  });
}

// --- SERVICES MANAGEMENT ---
const servicesCollectionRef = collection(db, "services");

function listenForServices() {
  const q = query(servicesCollectionRef, orderBy("name"));
  onSnapshot(q, (snapshot) => {
    servicesList.innerHTML = "";
    if (snapshot.empty) {
      servicesList.innerHTML = "<p>Ingen tjenester er lagt til enda.</p>";
      return;
    }
    snapshot.forEach((doc) => {
      const service = doc.data();
      const el = document.createElement("div");
      el.className =
        "flex justify-between items-center bg-gray-50 p-3 rounded-lg";
      el.innerHTML = `<div><p class="font-bold">${service.name}</p><p class="text-sm text-gray-600">${service.duration} min - ${service.price} NOK</p></div><div class="space-x-2"><button class="edit-btn text-blue-500 hover:text-blue-700" data-id="${doc.id}">Endre</button><button class="delete-btn text-red-500 hover:text-red-700" data-id="${doc.id}">Slett</button></div>`;
      servicesList.appendChild(el);
    });
  });
}

servicesList.addEventListener("click", async (e) => {
  const target = e.target;
  const id = target.dataset.id;
  if (!id) return;

  if (target.classList.contains("delete-btn")) {
    const confirmed = await showConfirmationModal(
      "Slette tjeneste?",
      `Er du sikker på at du vil slette denne tjenesten?`
    );
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "services", id));
        showSuccessMessage("Tjeneste slettet.");
      } catch (error) {
        console.error("Error deleting service:", error);
      }
    }
  }

  if (target.classList.contains("edit-btn")) {
    const docSnap = await getDoc(doc(db, "services", id));
    if (docSnap.exists()) {
      const service = docSnap.data();
      serviceIdField.value = id;
      serviceForm["service-name"].value = service.name;
      serviceForm["service-duration"].value = service.duration;
      serviceForm["service-price"].value = service.price;
      cancelEditBtn.classList.remove("hidden");
    }
  }
});

serviceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = serviceIdField.value;
  const serviceData = {
    name: serviceForm["service-name"].value,
    duration: parseInt(serviceForm["service-duration"].value, 10),
    price: parseInt(serviceForm["service-price"].value, 10),
  };
  try {
    if (id) {
      await updateDoc(doc(db, "services", id), serviceData);
      showSuccessMessage("Tjeneste oppdatert!");
    } else {
      await addDoc(servicesCollectionRef, serviceData);
      showSuccessMessage("Tjeneste lagt til!");
    }
    resetServiceForm();
  } catch (error) {
    console.error("Error saving service:", error);
  }
});

cancelEditBtn.addEventListener("click", resetServiceForm);

// --- APPOINTMENTS MANAGEMENT ---
function listenForAppointments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, "appointments"),
    where("datetime", ">=", Timestamp.fromDate(today)),
    orderBy("datetime")
  );

  onSnapshot(q, (snapshot) => {
    appointmentsList.innerHTML = "";
    if (snapshot.empty) {
      appointmentsList.innerHTML = "<p>Ingen kommende avtaler.</p>";
      return;
    }
    snapshot.forEach((doc) => {
      const booking = doc.data();
      const date = booking.datetime.toDate();
      const el = document.createElement("div");
      el.className = "appointment-card";
      el.innerHTML = `
            <div class="appointment-details">
                <p class="font-bold text-lg">${booking.customerName}</p>
                <p>${booking.service.name} (${booking.service.duration} min)</p>
                <p class="text-gray-600">${date.toLocaleDateString("nb-NO", {
                  dateStyle: "full",
                })}</p>
                <p class="text-lg font-bold text-[var(--primary-color)]">${date.toLocaleTimeString(
                  "nb-NO",
                  { hour: "2-digit", minute: "2-digit" }
                )}</p>
                <p class="mt-2 text-sm">Tlf: <a href="tel:${
                  booking.customerPhone
                }" class="text-blue-600 hover:underline">${
        booking.customerPhone
      }</a></p>
            </div>
            <div class="appointment-actions">
                <button class="edit-appointment-btn" data-id="${
                  doc.id
                }">Endre tid</button>
                <button class="delete-appointment-btn" data-id="${
                  doc.id
                }" data-customer="${booking.customerName}">Slett</button>
            </div>`;
      appointmentsList.appendChild(el);
    });
  });
}

appointmentsList.addEventListener("click", async (e) => {
  const target = e.target;
  const id = target.dataset.id;
  if (!id) return;

  if (target.classList.contains("delete-appointment-btn")) {
    const customerName = target.dataset.customer;
    const confirmed = await showConfirmationModal(
      "Slette avtale?",
      `Er du sikker på at du vil slette avtalen for ${customerName}?`
    );
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "appointments", id));
        showSuccessMessage("Avtalen er slettet.");
      } catch (error) {
        console.error("Error deleting appointment:", error);
      }
    }
  }

  if (target.classList.contains("edit-appointment-btn")) {
    const docSnap = await getDoc(doc(db, "appointments", id));
    if (docSnap.exists()) {
      openEditModal(id, docSnap.data());
    }
  }
});

// --- EDIT APPOINTMENT MODAL ---
function openEditModal(id, booking) {
  const bookingDate = booking.datetime.toDate();
  modalCustomerName.textContent = booking.customerName;
  modalAppointmentId.value = id;
  modalServiceDuration.value = booking.service.duration;

  const yyyy = bookingDate.getFullYear();
  const mm = String(bookingDate.getMonth() + 1).padStart(2, "0");
  const dd = String(bookingDate.getDate()).padStart(2, "0");
  modalDateInput.value = `${yyyy}-${mm}-${dd}`;

  populateModalTimeSlots(modalDateInput.value);

  editModal.classList.remove("hidden");
  editModal.classList.add("flex");
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
}

async function populateModalTimeSlots(dateStr) {
  modalTimeLoader.classList.remove("hidden");
  modalTimeSelect.innerHTML = "<option>Laster...</option>";
  modalTimeSelect.disabled = true;

  const serviceDuration = parseInt(modalServiceDuration.value, 10);
  if (!dateStr || !serviceDuration || !salonInfo.hours) {
    modalTimeSelect.innerHTML = "<option>Ugyldig data</option>";
    modalTimeLoader.classList.add("hidden");
    return;
  }

  const availableSlots = await getAvailableSlots(
    dateStr,
    serviceDuration,
    modalAppointmentId.value
  );

  modalTimeLoader.classList.add("hidden");
  modalTimeSelect.disabled = false;

  if (availableSlots.length === 0) {
    modalTimeSelect.innerHTML = '<option value="">Ingen ledige tider</option>';
  } else {
    modalTimeSelect.innerHTML = availableSlots
      .map((slot) => {
        const timeString = slot.toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `<option value="${timeString}">${timeString}</option>`;
      })
      .join("");
  }
}

async function getAvailableSlots(
  dateStr,
  serviceDuration,
  currentAppointmentId
) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayKey = dayNames[dayOfWeek];
  const hours = salonInfo.hours[dayKey];

  if (!hours || hours.open === "Stengt" || !hours.open || !hours.close) {
    return [];
  }

  const [openHour, openMin] = hours.open.split(":").map(Number);
  const [closeHour, closeMin] = hours.close.split(":").map(Number);

  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, "appointments"),
    where("datetime", ">=", startOfDay),
    where("datetime", "<=", endOfDay)
  );
  const querySnapshot = await getDocs(q);
  const bookedSlots = querySnapshot.docs
    .filter((doc) => doc.id !== currentAppointmentId) // Exclude the appointment being edited
    .map((doc) => {
      const data = doc.data();
      const startTime = data.datetime.toDate();
      const endTime = new Date(
        startTime.getTime() + data.service.duration * 60000
      );
      return { start: startTime, end: endTime };
    });

  const availableSlots = [];
  let currentTime = new Date(dateStr);
  currentTime.setHours(openHour, openMin, 0, 0);
  const closingTime = new Date(dateStr);
  closingTime.setHours(closeHour, closeMin, 0, 0);

  while (currentTime < closingTime) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
    if (slotEnd > closingTime) break;

    const isBooked = bookedSlots.some(
      (booked) => slotStart < booked.end && slotEnd > booked.start
    );
    if (!isBooked) {
      availableSlots.push(new Date(slotStart));
    }
    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }
  return availableSlots;
}

modalDateInput.addEventListener("change", () =>
  populateModalTimeSlots(modalDateInput.value)
);
modalCancelBtn.addEventListener("click", closeEditModal);

modalSaveBtn.addEventListener("click", async () => {
  const id = modalAppointmentId.value;
  const newDate = modalDateInput.value;
  const newTime = modalTimeSelect.value;

  if (!id || !newDate || !newTime) {
    alert("Vennligst velg en gyldig dato og tid.");
    return;
  }

  const [hour, minute] = newTime.split(":");
  const newDatetime = new Date(newDate);
  newDatetime.setHours(parseInt(hour), parseInt(minute), 0, 0);

  try {
    const appointmentRef = doc(db, "appointments", id);
    await updateDoc(appointmentRef, {
      datetime: Timestamp.fromDate(newDatetime),
    });
    showSuccessMessage("Avtaletiden er oppdatert!");
    closeEditModal();
  } catch (error) {
    console.error("Error updating appointment:", error);
    alert("En feil oppstod under lagring.");
  }
});

// --- UTILITY FUNCTIONS ---
function showSuccessMessage(message) {
  saveSuccess.textContent = message;
  saveSuccess.classList.remove("hidden");
  setTimeout(() => {
    saveSuccess.textContent = "";
    saveSuccess.classList.add("hidden");
  }, 4000);
}

function resetServiceForm() {
  serviceForm.reset();
  serviceIdField.value = "";
  cancelEditBtn.classList.add("hidden");
}

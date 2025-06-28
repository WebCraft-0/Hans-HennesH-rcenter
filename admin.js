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
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyLOvvcqH9ZqrYl0uWYLKXl9czRvbtD0o",
  authDomain: "hans-hennes-harcenter.firebaseapp.com",
  projectId: "hans-hennes-harcenter",
  storageBucket: "hans-hennes-harcenter.appspot.com",
  messagingSenderId: "766588486231",
  appId: "1:766588486231:web:90439e599e0633e7c25912",
  measurementId: "G-L0TVKB7K55",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GLOBAL STATE ---
let salonInfo = {};
let categoriesCache = [];

// --- DOM ELEMENT REFERENCES ---
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
const serviceIdField = document.getElementById("service-id");
const cancelServiceEditBtn = document.getElementById("cancel-service-edit-btn");
const servicesList = document.getElementById("services-list");
const categoryForm = document.getElementById("category-form");
const categoryIdField = document.getElementById("category-id");
const categoryList = document.getElementById("category-list");
const cancelCategoryEditBtn = document.getElementById(
  "cancel-category-edit-btn"
);
const serviceCategorySelect = document.getElementById("service-category");
const appointmentsList = document.getElementById("appointments-list");
const hoursEditor = document.getElementById("hours-editor");
const bookingEnabledToggle = document.getElementById("booking-enabled");
const editModal = document.getElementById("edit-appointment-modal");
const modalCustomerName = document.getElementById("modal-customer-name");
const modalAppointmentId = document.getElementById("modal-appointment-id");
const modalServiceDuration = document.getElementById("modal-service-duration");
const modalDateInput = document.getElementById("modal-date");
const modalTimeSelect = document.getElementById("modal-time");
const modalTimeLoader = document.getElementById("modal-time-loader");
const modalSaveBtn = document.getElementById("modal-save-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const confirmationModal = document.getElementById("confirmation-modal");
const confirmationTitle = document.getElementById("confirmation-title");
const confirmationMessage = document.getElementById("confirmation-message");
const confirmationConfirmBtn = document.getElementById(
  "confirmation-confirm-btn"
);
const confirmationCancelBtn = document.getElementById(
  "confirmation-cancel-btn"
);

// --- INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginView.classList.add("hidden");
    adminView.classList.remove("hidden");
    await initializeAdminPanel();
  } else {
    loginView.classList.remove("hidden");
    adminView.classList.add("hidden");
  }
});

async function initializeAdminPanel() {
  buildHoursEditor();
  await loadSalonData();
  listenForCategories();
  listenForServices();
  listenForAppointments();
}

// --- AUTHENTICATION ---
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  signInWithEmailAndPassword(
    auth,
    loginForm.email.value,
    loginForm.password.value
  ).catch(
    (error) => (loginError.textContent = "Ugyldig e-post eller passord.")
  );
});

logoutBtn.addEventListener("click", () => signOut(auth));

// --- TAB NAVIGATION ---
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((btn) => btn.classList.remove("active-tab"));
    button.classList.add("active-tab");
    tabContents.forEach((content) =>
      content.classList.toggle(
        "hidden",
        content.id !== `${button.dataset.tab}-tab`
      )
    );
  });
});

// --- SALON INFO & HOURS ---
async function loadSalonData() {
  const salonInfoDocRef = doc(db, "salonInfo", "details");
  try {
    const docSnap = await getDoc(salonInfoDocRef);
    if (docSnap.exists()) {
      salonInfo = docSnap.data();
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
    await setDoc(doc(db, "salonInfo", "details"), updatedData, { merge: true });
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
  hoursEditor.innerHTML = `<div class="apply-all-row grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-4 bg-gray-100 rounded-lg"><h3 class="font-bold sm:col-span-1 text-gray-800">Bruk for ukedager:</h3><div class="sm:col-span-2 grid grid-cols-2 gap-4"><select id="apply-open" class="time-select"></select><select id="apply-close" class="time-select"></select></div><button type="button" id="apply-all-btn" class="sm:col-start-2 sm:col-span-2 btn-accent mt-2 sm:mt-0 py-2">Bruk for man-fre</button></div><hr class="my-6">`;
  dayKeys.forEach((dayKey) => {
    const dayContainer = document.createElement("div");
    dayContainer.className =
      "grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100";
    dayContainer.innerHTML = `<label class="font-semibold col-span-1">${daysOfWeek[dayKey]}</label><div class="col-span-2 grid grid-cols-2 gap-4"><select id="edit-hours-${dayKey}-open" class="time-select"></select><select id="edit-hours-${dayKey}-close" class="time-select"></select></div>`;
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
        const time = `${i.toString().padStart(2, "0")}:${j
          .toString()
          .padStart(2, "0")}`;
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

// --- CATEGORY MANAGEMENT ---
function listenForCategories() {
  const q = query(collection(db, "serviceCategories"), orderBy("displayOrder"));
  onSnapshot(q, (snapshot) => {
    categoriesCache = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    categoryList.innerHTML = "";
    serviceCategorySelect.innerHTML =
      '<option value="">Velg en kategori...</option>';
    categoriesCache.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.name;
      option.textContent = category.name;
      serviceCategorySelect.appendChild(option);
      const el = document.createElement("div");
      el.className = "category-item";
      el.innerHTML = `<span>${category.name} (${category.displayOrder})</span><div class="actions"><button class="edit-category-btn" data-id="${category.id}"><i class="fas fa-pencil-alt"></i></button><button class="delete-category-btn" data-id="${category.id}" data-name="${category.name}"><i class="fas fa-trash-alt"></i></button></div>`;
      categoryList.appendChild(el);
    });
  });
}

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = categoryIdField.value;
  const categoryData = {
    name: categoryForm["category-name"].value.trim(),
    displayOrder: parseInt(categoryForm["category-order"].value, 10),
  };
  if (!categoryData.name || isNaN(categoryData.displayOrder)) {
    alert("Vennligst fyll ut både navn og rekkefølge.");
    return;
  }
  try {
    if (id) {
      const oldDocSnap = await getDoc(doc(db, "serviceCategories", id));
      const oldName = oldDocSnap.data().name;
      await updateDoc(doc(db, "serviceCategories", id), categoryData);
      if (oldName !== categoryData.name) {
        const q = query(
          collection(db, "services"),
          where("category", "==", oldName)
        );
        const servicesToUpdate = await getDocs(q);
        const batch = writeBatch(db);
        servicesToUpdate.forEach((serviceDoc) => {
          batch.update(doc(db, "services", serviceDoc.id), {
            category: categoryData.name,
          });
        });
        await batch.commit();
      }
      showSuccessMessage("Kategori oppdatert!");
    } else {
      await addDoc(collection(db, "serviceCategories"), categoryData);
      showSuccessMessage("Kategori lagt til!");
    }
    resetCategoryForm();
  } catch (error) {
    console.error("Error saving category:", error);
  }
});

categoryList.addEventListener("click", async (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  if (button.classList.contains("edit-category-btn")) {
    const docSnap = await getDoc(doc(db, "serviceCategories", id));
    if (docSnap.exists()) {
      const category = docSnap.data();
      categoryIdField.value = id;
      categoryForm["category-name"].value = category.name;
      categoryForm["category-order"].value = category.displayOrder;
      cancelCategoryEditBtn.classList.remove("hidden");
    }
  }
  if (button.classList.contains("delete-category-btn")) {
    const name = button.dataset.name;
    const confirmed = await showConfirmationModal(
      "Slette kategori?",
      `Alle tjenester i kategorien "${name}" vil bli ukategorisert. Er du sikker?`
    );
    if (confirmed) {
      try {
        const q = query(
          collection(db, "services"),
          where("category", "==", name)
        );
        const servicesToUpdate = await getDocs(q);
        const batch = writeBatch(db);
        servicesToUpdate.forEach((serviceDoc) => {
          batch.update(doc(db, "services", serviceDoc.id), {
            category: "Ukategorisert",
          });
        });
        await batch.commit();
        await deleteDoc(doc(db, "serviceCategories", id));
        showSuccessMessage(`Kategori "${name}" slettet.`);
      } catch (error) {
        console.error("Error deleting category and updating services:", error);
      }
    }
  }
});

cancelCategoryEditBtn.addEventListener("click", resetCategoryForm);
function resetCategoryForm() {
  categoryForm.reset();
  categoryIdField.value = "";
  cancelCategoryEditBtn.classList.add("hidden");
}

// --- SERVICE MANAGEMENT ---
function listenForServices() {
  const q = query(collection(db, "services"));
  onSnapshot(q, (snapshot) => {
    const allServices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderServiceList(allServices);
  });
}

function renderServiceList(allServices) {
  servicesList.innerHTML = "";
  if (categoriesCache.length === 0) {
    // This case might show briefly on first load, it's okay.
    return;
  }

  const servicesByCategory = {};
  // Initialize with all categories from cache to maintain order
  categoriesCache.forEach((cat) => {
    servicesByCategory[cat.name] = [];
  });
  servicesByCategory["Ukategorisert"] = [];

  allServices.forEach((service) => {
    const categoryName = service.category || "Ukategorisert";
    if (servicesByCategory[categoryName]) {
      servicesByCategory[categoryName].push(service);
    } else {
      servicesByCategory["Ukategorisert"].push(service); // Fallback for services with non-existent categories
    }
  });

  const sortedCategories = [...categoriesCache].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  sortedCategories.forEach((category) => {
    const categoryName = category.name;
    const currentServices = servicesByCategory[categoryName];
    if (currentServices && currentServices.length > 0) {
      const categoryContainer = document.createElement("div");
      categoryContainer.innerHTML = `<h3 class="category-header">${categoryName}</h3>`;
      const serviceItemsContainer = document.createElement("div");
      serviceItemsContainer.className = "space-y-3";
      currentServices
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((service) => {
          const el = document.createElement("div");
          el.className = "service-item-admin";
          el.innerHTML = `<div><p class="font-bold">${service.name}</p><p class="text-sm text-gray-600">${service.duration} min - ${service.price} NOK</p></div><div class="actions"><button class="edit-service-btn" data-id="${service.id}"><i class="fas fa-pencil-alt"></i></button><button class="delete-service-btn" data-id="${service.id}"><i class="fas fa-trash-alt"></i></button></div>`;
          serviceItemsContainer.appendChild(el);
        });
      categoryContainer.appendChild(serviceItemsContainer);
      servicesList.appendChild(categoryContainer);
    }
  });

  if (servicesByCategory["Ukategorisert"].length > 0) {
    const categoryContainer = document.createElement("div");
    categoryContainer.innerHTML = `<h3 class="category-header">Ukategorisert</h3>`;
    const serviceItemsContainer = document.createElement("div");
    serviceItemsContainer.className = "space-y-3";
    servicesByCategory["Ukategorisert"]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((service) => {
        const el = document.createElement("div");
        el.className = "service-item-admin";
        el.innerHTML = `<div><p class="font-bold">${service.name}</p><p class="text-sm text-gray-600">${service.duration} min - ${service.price} NOK</p></div><div class="actions"><button class="edit-service-btn" data-id="${service.id}"><i class="fas fa-pencil-alt"></i></button><button class="delete-service-btn" data-id="${service.id}"><i class="fas fa-trash-alt"></i></button></div>`;
        serviceItemsContainer.appendChild(el);
      });
    categoryContainer.appendChild(serviceItemsContainer);
    servicesList.appendChild(categoryContainer);
  }
}

servicesList.addEventListener("click", async (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  if (button.classList.contains("edit-service-btn")) {
    const docSnap = await getDoc(doc(db, "services", id));
    if (docSnap.exists()) {
      const service = docSnap.data();
      serviceIdField.value = id;
      serviceForm["service-name"].value = service.name;
      serviceForm["service-duration"].value = service.duration;
      serviceForm["service-price"].value = service.price;
      serviceForm["service-category"].value = service.category || "";
      cancelServiceEditBtn.classList.remove("hidden");
      serviceForm.scrollIntoView({ behavior: "smooth" });
    }
  }
  if (button.classList.contains("delete-service-btn")) {
    const confirmed = await showConfirmationModal(
      "Slette tjeneste?",
      "Er du sikker på at du vil slette denne tjenesten?"
    );
    if (confirmed) {
      await deleteDoc(doc(db, "services", id));
      showSuccessMessage("Tjeneste slettet.");
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
    category: serviceForm["service-category"].value,
  };
  try {
    if (id) {
      await updateDoc(doc(db, "services", id), serviceData);
      showSuccessMessage("Tjeneste oppdatert!");
    } else {
      await addDoc(collection(db, "services"), serviceData);
      showSuccessMessage("Tjeneste lagt til!");
    }
    resetServiceForm();
  } catch (error) {
    console.error("Error saving service:", error);
  }
});

cancelServiceEditBtn.addEventListener("click", resetServiceForm);
function resetServiceForm() {
  serviceForm.reset();
  serviceIdField.value = "";
  cancelServiceEditBtn.classList.add("hidden");
}

// --- APPOINTMENT MANAGEMENT ---
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
                    <p>${booking.service.name} (${
        booking.service.duration
      } min)</p>
                    <p class="text-gray-600">${date.toLocaleDateString(
                      "nb-NO",
                      { dateStyle: "full" }
                    )}</p>
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
  const target = e.target.closest("button");
  if (!target) return;
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

function openEditModal(id, booking) {
  const bookingDate = booking.datetime.toDate();
  modalCustomerName.textContent = booking.customerName;
  modalAppointmentId.value = id;
  modalServiceDuration.value = booking.service.duration;
  modalDateInput.value = bookingDate.toISOString().split("T")[0];
  populateModalTimeSlots(modalDateInput.value);
  editModal.style.display = "flex";
}

function closeEditModal() {
  editModal.style.display = "none";
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
  if (!hours || hours.open === "Stengt" || !hours.open || !hours.close)
    return [];
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
    .filter((doc) => doc.id !== currentAppointmentId)
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
    await updateDoc(doc(db, "appointments", id), {
      datetime: Timestamp.fromDate(newDatetime),
    });
    showSuccessMessage("Avtaletiden er oppdatert!");
    closeEditModal();
  } catch (error) {
    console.error("Error updating appointment:", error);
  }
});

// --- UTILITY FUNCTIONS ---
function showConfirmationModal(title, message) {
  return new Promise((resolve) => {
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;
    confirmationModal.style.display = "flex";
    const confirmHandler = () => {
      confirmationModal.style.display = "none";
      confirmationConfirmBtn.removeEventListener("click", confirmHandler);
      confirmationCancelBtn.removeEventListener("click", cancelHandler);
      resolve(true);
    };
    const cancelHandler = () => {
      confirmationModal.style.display = "none";
      confirmationConfirmBtn.removeEventListener("click", confirmHandler);
      confirmationCancelBtn.removeEventListener("click", cancelHandler);
      resolve(false);
    };
    confirmationConfirmBtn.addEventListener("click", confirmHandler);
    confirmationCancelBtn.addEventListener("click", cancelHandler);
  });
}

function showSuccessMessage(message) {
  saveSuccess.textContent = message;
  saveSuccess.classList.remove("hidden");
  setTimeout(() => {
    saveSuccess.textContent = "";
    saveSuccess.classList.add("hidden");
  }, 4000);
}

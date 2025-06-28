import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  getDoc,
  Timestamp,
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
const db = getFirestore(app);

let salonInfo = {};
let selectedService = null;
let selectedDate = null;

const steps = {
  service: document.getElementById("step-1-service"),
  datetime: document.getElementById("step-2-datetime"),
  confirm: document.getElementById("step-3-confirm"),
  success: document.getElementById("step-4-success"),
};
const servicesListEl = document.getElementById("booking-services-list");
const backToServicesBtn = document.getElementById("back-to-services");
const backToDatetimeBtn = document.getElementById("back-to-datetime");
const selectedServiceInfoEl = document.getElementById("selected-service-info");
const calendarEl = document.getElementById("calendar");
const slotsContainerEl = document.getElementById("slots-container");
const confirmForm = document.getElementById("confirm-form");

function showStep(stepName) {
  Object.values(steps).forEach((step) => step.classList.add("hidden"));
  if (steps[stepName]) {
    steps[stepName].classList.remove("hidden");
  }
}

async function loadInitialData() {
  try {
    const salonInfoRef = doc(db, "salonInfo", "details");
    const servicesQuery = query(collection(db, "services"), orderBy("name"));
    const categoriesQuery = query(
      collection(db, "serviceCategories"),
      orderBy("displayOrder")
    );

    const [salonDoc, servicesSnapshot, categoriesSnapshot] = await Promise.all([
      getDoc(salonInfoRef),
      getDocs(servicesQuery),
      getDocs(categoriesQuery),
    ]);

    if (salonDoc.exists()) {
      salonInfo = salonDoc.data();
      if (salonInfo.bookingEnabled === false) {
        servicesListEl.innerHTML =
          '<p class="text-center text-lg text-red-500 font-semibold">Online booking er for øyeblikket stengt.</p>';
        return;
      }
    } else {
      console.error("Salon info not found!");
    }

    const services = servicesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const categories = categoriesSnapshot.docs.map((doc) => doc.data());

    renderCategorizedServices(services, categories);
  } catch (error) {
    console.error("Error loading initial data:", error);
    servicesListEl.innerHTML =
      '<p class="text-center text-red-500">Kunne ikke laste inn data. Sjekk konsollen.</p>';
  }
}

function renderCategorizedServices(services, categories) {
  servicesListEl.innerHTML = "";
  if (services.length === 0) {
    servicesListEl.innerHTML =
      '<p class="text-center text-gray-500">Ingen tjenester er tilgjengelige.</p>';
    return;
  }

  const servicesByCategory = {};
  services.forEach((service) => {
    const categoryName = service.category || "Annet";
    if (!servicesByCategory[categoryName]) {
      servicesByCategory[categoryName] = [];
    }
    servicesByCategory[categoryName].push(service);
  });

  categories.forEach((category) => {
    const categoryName = category.name;
    if (
      servicesByCategory[categoryName] &&
      servicesByCategory[categoryName].length > 0
    ) {
      const categoryContainer = document.createElement("div");
      categoryContainer.innerHTML = `<h2 class="text-2xl font-serif text-[var(--primary-color)]">${categoryName}</h2>`;

      const serviceItemsContainer = document.createElement("div");
      serviceItemsContainer.className = "space-y-3 mt-3";

      servicesByCategory[categoryName].forEach((service) => {
        const serviceEl = document.createElement("div");
        serviceEl.className = "service-item";
        serviceEl.innerHTML = `<h3>${service.name}</h3><p>${service.duration} min - ${service.price} NOK</p>`;
        serviceEl.addEventListener("click", () => selectService(service));
        serviceItemsContainer.appendChild(serviceEl);
      });

      categoryContainer.appendChild(serviceItemsContainer);
      servicesListEl.appendChild(categoryContainer);
    }
  });
}

function renderCalendar() {
  calendarEl.innerHTML = "";
  const today = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);

    const dayEl = document.createElement("button");
    dayEl.className = "calendar-day";
    dayEl.textContent = date.toLocaleDateString("nb-NO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    dayEl.dataset.date = date.toISOString().split("T")[0];

    const dayName = dayNames[date.getDay()];
    const hoursForDay = salonInfo.hours ? salonInfo.hours[dayName] : null;

    if (!hoursForDay || hoursForDay.open === "Stengt") {
      dayEl.disabled = true;
      dayEl.classList.add("disabled");
    }

    dayEl.addEventListener("click", () => {
      if (dayEl.disabled) return;
      document
        .querySelectorAll(".calendar-day.selected")
        .forEach((d) => d.classList.remove("selected"));
      dayEl.classList.add("selected");
      selectDate(dayEl.dataset.date);
    });
    calendarEl.appendChild(dayEl);
  }
}

async function renderTimeSlots(dateStr) {
  slotsContainerEl.innerHTML =
    '<p class="col-span-full text-center">Sjekker ledige tider...</p>';
  if (!selectedService || !salonInfo.hours) {
    slotsContainerEl.innerHTML =
      '<p class="col-span-full text-center text-red-500">Kunne ikke laste salonginfo.</p>';
    return;
  }
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
  const hours = salonInfo.hours[dayNames[dayOfWeek]];

  if (
    !hours ||
    hours.open === "Stengt" ||
    !hours.open ||
    hours.close === "Stengt" ||
    !hours.close
  ) {
    slotsContainerEl.innerHTML =
      '<p class="col-span-full text-center">Stengt denne dagen.</p>';
    return;
  }

  const [openHour, openMin] = hours.open.split(":").map(Number);
  const [closeHour, closeMin] = hours.close.split(":").map(Number);

  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, "appointments"),
    where("datetime", ">=", Timestamp.fromDate(startOfDay)),
    where("datetime", "<=", Timestamp.fromDate(endOfDay))
  );
  const querySnapshot = await getDocs(q);
  const bookedSlots = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    const startTime = data.datetime.toDate();
    const endTime = new Date(
      startTime.getTime() + data.service.duration * 60000
    );
    return { start: startTime, end: endTime };
  });

  const availableSlots = [];
  const now = new Date();
  const leadTime = salonInfo.bookingLeadTime || 30;
  const earliestBookingTime = new Date(now.getTime() + leadTime * 60000);
  let currentTime = new Date(dateStr);
  currentTime.setHours(openHour, openMin, 0, 0);
  const closingTime = new Date(dateStr);
  closingTime.setHours(closeHour, closeMin, 0, 0);

  while (currentTime < closingTime) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(
      slotStart.getTime() + selectedService.duration * 60000
    );
    if (slotEnd > closingTime) break;
    const isBooked = bookedSlots.some(
      (booked) => slotStart < booked.end && slotEnd > booked.start
    );
    const isTooSoon = slotStart < earliestBookingTime;
    if (!isBooked && !isTooSoon) {
      availableSlots.push(new Date(slotStart));
    }
    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }
  slotsContainerEl.innerHTML = "";
  if (availableSlots.length === 0) {
    slotsContainerEl.innerHTML =
      '<p class="col-span-full text-center">Ingen ledige tider denne dagen.</p>';
    return;
  }
  availableSlots.forEach((slot) => {
    const slotEl = document.createElement("button");
    slotEl.className = "time-slot";
    slotEl.textContent = slot.toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });
    slotEl.addEventListener("click", () => selectTime(slot));
    slotsContainerEl.appendChild(slotEl);
  });
}

function selectService(service) {
  selectedService = service;
  selectedServiceInfoEl.textContent = `${service.name} (${service.duration} min)`;
  renderCalendar();
  showStep("datetime");
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  renderTimeSlots(dateStr);
}

function selectTime(time) {
  document.getElementById("confirm-service").textContent = selectedService.name;
  document.getElementById("confirm-date").textContent = new Date(
    time
  ).toLocaleDateString("nb-NO", { dateStyle: "long" });
  document.getElementById("confirm-time").textContent = time.toLocaleTimeString(
    "nb-NO",
    { hour: "2-digit", minute: "2-digit" }
  );
  document.getElementById("confirm-price").textContent = selectedService.price;
  showStep("confirm");
  confirmForm.dataset.datetime = time.toISOString();
}

confirmForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("confirm-booking-btn");
  btn.disabled = true;
  btn.textContent = "Lagrer...";
  const bookingData = {
    customerName: confirmForm["customer-name"].value,
    customerPhone: confirmForm["customer-phone"].value,
    service: selectedService,
    datetime: Timestamp.fromDate(new Date(confirmForm.dataset.datetime)),
  };
  try {
    await addDoc(collection(db, "appointments"), bookingData);
    showStep("success");
  } catch (error) {
    console.error("Error creating appointment:", error);
    alert("En feil oppstod. Vennligst prøv igjen.");
    btn.disabled = false;
    btn.textContent = "Bekreft og bestill";
  }
});

backToServicesBtn.addEventListener("click", () => {
  slotsContainerEl.innerHTML =
    '<p class="col-span-full text-center">Velg en dato.</p>';
  showStep("service");
});
backToDatetimeBtn.addEventListener("click", () => showStep("datetime"));

loadInitialData();

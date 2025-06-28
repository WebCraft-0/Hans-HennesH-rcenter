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
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyLOvvcqH9ZqrYl0uWYLKXl9czRvbtD0o",
  authDomain: "hans-hennes-harcenter.firebaseapp.com",
  projectId: "hans-hennes-harcenter",
  storageBucket: "hans-hennes-harcenter.firebasestorage.app",
  messagingSenderId: "766588486231",
  appId: "1:766588486231:web:90439e599e0633e7c25912",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const editForm = document.getElementById("edit-form");
const loginError = document.getElementById("login-error");
const saveSuccess = document.getElementById("save-success");

// --- AUTHENTICATION ---

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in, show the admin panel and hide the login form
    loginView.classList.add("hidden");
    adminView.classList.remove("hidden");
    loadSalonData();
  } else {
    // User is logged out, show the login form and hide the admin panel
    loginView.classList.remove("hidden");
    adminView.classList.add("hidden");
  }
});

// Handle login form submission
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  signInWithEmailAndPassword(auth, email, password).catch((error) => {
    console.error("Login Error:", error);
    loginError.textContent = "Invalid email or password.";
  });
});

// Handle logout button click
logoutBtn.addEventListener("click", () => {
  signOut(auth).catch((error) => console.error("Logout Error:", error));
});

// --- FIRESTORE DATA HANDLING ---

const salonDocRef = doc(db, "salonInfo", "details");

// Load existing salon data into the form
async function loadSalonData() {
  try {
    const docSnap = await getDoc(salonDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      editForm["edit-phone"].value = data.phone || "";
      editForm["edit-email"].value = data.email || "";
      editForm["edit-address"].value = data.address || "";
      editForm["edit-hours-monday"].value = data.hours.monday || "";
      editForm["edit-hours-tue-thu"].value = data.hours.tuesdayThursday || "";
      editForm["edit-hours-friday"].value = data.hours.friday || "";
      editForm["edit-hours-saturday"].value = data.hours.saturday || "";
      editForm["edit-hours-sunday"].value = data.hours.sunday || "";
    } else {
      console.log("No existing data found. You can save new data.");
    }
  } catch (error) {
    console.error("Error loading document:", error);
  }
}

// Handle edit form submission
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const updatedData = {
    phone: editForm["edit-phone"].value,
    email: editForm["edit-email"].value,
    address: editForm["edit-address"].value,
    hours: {
      monday: editForm["edit-hours-monday"].value,
      tuesdayThursday: editForm["edit-hours-tue-thu"].value,
      friday: editForm["edit-hours-friday"].value,
      saturday: editForm["edit-hours-saturday"].value,
      sunday: editForm["edit-hours-sunday"].value,
    },
  };

  try {
    // Use setDoc with merge: true to create or update the document
    await setDoc(salonDocRef, updatedData, { merge: true });
    saveSuccess.textContent =
      "Changes saved successfully! The main site is updated.";
    // Hide the message after a few seconds
    setTimeout(() => {
      saveSuccess.textContent = "";
    }, 4000);
  } catch (error) {
    console.error("Error saving document:", error);
    saveSuccess.textContent = "Error saving changes.";
    saveSuccess.classList.remove("text-green-600");
    saveSuccess.classList.add("text-red-600");
  }
});

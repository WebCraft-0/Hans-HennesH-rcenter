import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Main function to run after the page is loaded ---
function onPageLoad() {
  
  // --- YOUR FIREBASE CONFIGURATION ---
  const firebaseConfig = {
    apiKey: "AIzaSyDyLOvvcqH9ZqrYl0uWYLKXl9czRvbtD0o",
    authDomain: "hans-hennes-harcenter.firebaseapp.com",
    projectId: "hans-hennes-harcenter",
    storageBucket: "hans-hennes-harcenter.appspot.com",
    messagingSenderId: "766588486231",
    appId: "1:766588486231:web:90439e599e0633e7c25912",
    measurementId: "G-L0TVKB7K55",
  };

  // --- Initialize Firebase and Firestore ---
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // --- Fetch and Display Salon Information ---
  const salonInfoRef = doc(db, "salonInfo", "details");
  onSnapshot(salonInfoRef, (doc) => {
    if (doc.exists()) {
      const salonData = doc.data();
      updatePageContent(salonData);
    } else {
      console.log("No data found in Firestore! Please save data from the admin page.");
      displayDefaultContent();
    }
  });

  // --- UI Update Functions ---
  function updatePageContent(data) {
    const contactInfo = document.getElementById("contact-info");
    if (contactInfo) {
      contactInfo.innerHTML = `
        <p><i class="fas fa-map-marker-alt w-6 text-[var(--primary-color)]"></i>${data.address || "..."}</p>
        <p><i class="fas fa-phone w-6 text-[var(--primary-color)]"></i><a href="tel:${data.phone}" class="hover-underline-animation">${data.phone || "..."}</a></p>
        <p><i class="fas fa-envelope w-6 text-[var(--primary-color)]"></i><a href="mailto:${data.email}" class="hover-underline-animation">${data.email || "..."}</a></p>
      `;
    }

    const openingHoursList = document.getElementById("opening-hours-list");
    if (openingHoursList && data.hours) {
      const formatHours = (day) => {
        const h = data.hours[day];
        if (!h || h.open === "Stengt" || !h.open) return "Stengt";
        return `${h.open} - ${h.close}`;
      };
      openingHoursList.innerHTML = `
        <div class="flex justify-between border-b border-gray-300 pb-2"><span>Mandag</span> <span class="font-bold">${formatHours("monday")}</span></div>
        <div class="flex justify-between border-b border-gray-300 pb-2"><span>Tirsdag</span> <span class="font-bold">${formatHours("tuesday")}</span></div>
        <div class="flex justify-between border-b border-gray-300 pb-2"><span>Onsdag</span> <span class="font-bold">${formatHours("wednesday")}</span></div>
        <div class="flex justify-between border-b border-gray-300 pb-2"><span>Torsdag</span> <span class="font-bold">${formatHours("thursday")}</span></div>
        <div class="flex justify-between border-b border-gray-300 pb-2"><span>Fredag</span> <span class="font-bold">${formatHours("friday")}</span></div>
        <div class="flex justify-between border-b border-gray-300 pb-2"><span>Lørdag</span> <span>${formatHours("saturday")}</span></div>
        <div class="flex justify-between"><span>Søndag</span> <span>${formatHours("sunday")}</span></div>
      `;
    }

    const footerAddress = document.getElementById("footer-address");
    if (footerAddress) {
      footerAddress.textContent = data.address || "...";
    }
  }

  function displayDefaultContent() {
    const contactInfo = document.getElementById("contact-info");
    if (contactInfo) contactInfo.innerHTML = "<p>Informasjon ikke tilgjengelig.</p>";
    const openingHoursList = document.getElementById("opening-hours-list");
    if (openingHoursList) openingHoursList.innerHTML = "<p>Åpningstider ikke tilgjengelig.</p>";
    const footerAddress = document.getElementById("footer-address");
    if (footerAddress) footerAddress.textContent = "";
  }

  // --- Mobile Menu Functionality (CORRECTED) ---
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
      // Toggle the 'menu-open' class on the menu itself
      mobileMenu.classList.toggle("menu-open");
    });

    // Add listeners to all links inside the mobile menu to close it on click
    const mobileMenuLinks = mobileMenu.querySelectorAll("a");
    mobileMenuLinks.forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("menu-open");
      });
    });
  }

  // --- Dynamic Year in Footer ---
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // --- Header Scroll Effect ---
  const header = document.getElementById("header");
  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        header.classList.add("header-scrolled");
      } else {
        header.classList.remove("header-scrolled");
      }
    });
  }

  // --- Scroll Animations for Sections ---
  const elementsToAnimate = document.querySelectorAll(".animated-element");
  const scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        } else {
          entry.target.classList.remove("is-visible");
        }
      });
    },
    { threshold: 0.1 }
  );
  elementsToAnimate.forEach((element) => scrollObserver.observe(element));

  // --- Parallax Effect for Images ---
  const parallaxImages = document.querySelectorAll(".parallax-element");
  const applyParallaxEffect = () => {
    // Only apply parallax on larger screens for performance
    if (window.innerWidth > 767) {
      parallaxImages.forEach((image) => {
        const speed = parseFloat(image.dataset.speed) || -0.1;
        const imagePosition = image.getBoundingClientRect();
        // Check if the image is in the viewport
        if (imagePosition.top < window.innerHeight && imagePosition.bottom >= 0) {
          const yPosition = (imagePosition.top - window.innerHeight / 2) * speed;
          image.style.transform = `translateY(${yPosition}px)`;
        }
      });
    }
  };
  window.addEventListener("scroll", () => {
    window.requestAnimationFrame(applyParallaxEffect);
  });
}

// --- Run all scripts when the document is ready ---
document.addEventListener("DOMContentLoaded", onPageLoad);

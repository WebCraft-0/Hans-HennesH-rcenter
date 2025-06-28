import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Make sure the entire webpage is loaded before we try to run any code.
document.addEventListener("DOMContentLoaded", () => {
  // --- YOUR FIREBASE CONFIGURATION ---
  // This is the connection to your Firebase project.
  const firebaseConfig = {
    apiKey: "AIzaSyDyLOvvcqH9ZqrYl0uWYLKXl9czRvbtD0o",
    authDomain: "hans-hennes-harcenter.firebaseapp.com",
    projectId: "hans-hennes-harcenter",
    storageBucket: "hans-hennes-harcenter.appspot.com",
    messagingSenderId: "766588486231",
    appId: "1:766588486231:web:90439e599e0633e7c25912",
  };

  // --- Initialize Firebase and Firestore ---
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // --- Fetch and Display Salon Information ---
  // This listens for any changes in your database and updates the website in real-time.
  const salonInfoRef = doc(db, "salonInfo", "details");
  onSnapshot(salonInfoRef, (doc) => {
    if (doc.exists()) {
      const salonData = doc.data();
      updatePageContent(salonData);
    } else {
      console.log(
        "No data found in Firestore! Please save data from the admin page."
      );
      // Optionally, you can display a default message on the page
      displayDefaultContent();
    }
  });

  // --- UI Update Functions ---
  function updatePageContent(data) {
    const contactInfo = document.getElementById("contact-info");
    if (contactInfo) {
      contactInfo.innerHTML = `
                <p><i class="fas fa-map-marker-alt w-6 text-[var(--primary-color)]"></i>${
                  data.address || "..."
                }</p>
                <p><i class="fas fa-phone w-6 text-[var(--primary-color)]"></i><a href="tel:${
                  data.phone
                }" class="hover-underline-animation">${
        data.phone || "..."
      }</a></p>
                <p><i class="fas fa-envelope w-6 text-[var(--primary-color)]"></i><a href="mailto:${
                  data.email
                }" class="hover-underline-animation">${
        data.email || "..."
      }</a></p>
            `;
    }

    const openingHoursList = document.getElementById("opening-hours-list");
    if (openingHoursList) {
      openingHoursList.innerHTML = `
                <div class="flex justify-between border-b border-gray-300 pb-2"><span>Mandag</span> <span>${
                  data.hours.monday || "..."
                }</span></div>
                <div class="flex justify-between border-b border-gray-300 pb-2"><span>Tirsdag - Torsdag</span> <span class="font-bold">${
                  data.hours.tuesdayThursday || "..."
                }</span></div>
                <div class="flex justify-between border-b border-gray-300 pb-2"><span>Fredag</span> <span>${
                  data.hours.friday || "..."
                }</span></div>
                <div class="flex justify-between border-b border-gray-300 pb-2"><span>Lørdag</span> <span>${
                  data.hours.saturday || "..."
                }</span></div>
                <div class="flex justify-between"><span>Søndag</span> <span>${
                  data.hours.sunday || "..."
                }</span></div>
            `;
    }

    const footerAddress = document.getElementById("footer-address");
    if (footerAddress) {
      footerAddress.textContent = data.address || "...";
    }
  }

  function displayDefaultContent() {
    const contactInfo = document.getElementById("contact-info");
    if (contactInfo)
      contactInfo.innerHTML = "<p>Informasjon ikke tilgjengelig.</p>";

    const openingHoursList = document.getElementById("opening-hours-list");
    if (openingHoursList)
      openingHoursList.innerHTML = "<p>Åpningstider ikke tilgjengelig.</p>";

    const footerAddress = document.getElementById("footer-address");
    if (footerAddress) footerAddress.textContent = "";
  }

  // --- All other UI scripts from the original file ---

  // Footer: Automatically update the copyright year
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Mobile Menu: Make the hamburger button work
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      mobileMenu.classList.toggle("menu-open");
    });
  }

  // Mobile Menu: Close the menu when a link is clicked
  const mobileMenuLinks = document.querySelectorAll("#mobile-menu a");
  mobileMenuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileMenu) {
        mobileMenu.classList.remove("menu-open");
      }
    });
  });

  // Header: Change style when the user scrolls
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

  // Scroll Animations: Fade in elements as they appear
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
    {
      threshold: 0.1,
    }
  );
  elementsToAnimate.forEach((element) => {
    scrollObserver.observe(element);
  });

  // Parallax Effect: Make images move at a different speed
  const parallaxImages = document.querySelectorAll(".parallax-element");
  const applyParallaxEffect = () => {
    if (window.innerWidth > 767) {
      parallaxImages.forEach((image) => {
        const speed = parseFloat(image.dataset.speed) || -0.1;
        const imagePosition = image.getBoundingClientRect();
        if (
          imagePosition.top < window.innerHeight &&
          imagePosition.bottom >= 0
        ) {
          const yPosition =
            (imagePosition.top - window.innerHeight / 2) * speed;
          image.style.transform = `translateY(${yPosition}px)`;
        }
      });
    }
  };
  window.addEventListener("scroll", () => {
    window.requestAnimationFrame(applyParallaxEffect);
  });
});

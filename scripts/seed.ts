/**
 * Seed script: populates the database with sample listings.
 * Run with: npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Property } from "../models/Property";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Add it to .env.local first.");
  process.exit(1);
}

const sample = [
  {
    title: "Modern 3BR Apartment in Al Nakheel",
    category: "apartment",
    listingType: "rent",
    rentalPeriod: "monthly",
    description:
      "Bright, freshly renovated apartment with three bedrooms, an open kitchen, and covered parking. Close to schools and shopping.",
    price: 5000,
    owner: { name: "Sara Al-Otaibi", phone: "+966 50 111 2222", email: "sara@example.com" },
    location: { city: "Riyadh", district: "Al Nakheel", address: "King Fahd Rd" },
    details: { rooms: 3, bathrooms: 2, hasKitchen: true, kitchenCabinetsInstalled: true },
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    ],
  },
  {
    title: "Family Villa with Private Garden",
    category: "build",
    listingType: "sale",
    status: "sold",
    description:
      "Spacious two-story villa with five bedrooms, a private garden, and a majlis. Recently built with high-end finishes.",
    price: 1850000,
    owner: { name: "Faisal Al-Harbi", phone: "+966 55 333 4444" },
    location: { city: "Jeddah", district: "Al Salamah", address: "Palestine St" },
    details: { rooms: 5, bathrooms: 4, hasKitchen: true, kitchenCabinetsInstalled: true },
    units: [
      {
        label: "Ground floor apartment",
        rooms: 2,
        bathrooms: 1,
        hasKitchen: true,
        kitchenCabinetsInstalled: true,
        electricityNumber: "SEC-11029384",
      },
      {
        label: "Upper floor apartment",
        rooms: 3,
        bathrooms: 2,
        hasKitchen: true,
        kitchenCabinetsInstalled: false,
        electricityNumber: "SEC-11029385",
      },
    ],
    images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200"],
  },
  {
    title: "Commercial Land, Main Road Frontage",
    category: "land",
    listingType: "sale",
    description:
      "1,200 sqm commercial land with direct main-road frontage, ideal for retail or mixed-use development.",
    price: 2600000,
    owner: { name: "Turki Al-Dossari", phone: "+966 54 222 9988", email: "turki@example.com" },
    location: { city: "Dammam", district: "Al Faisaliyah" },
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200"],
  },
  {
    title: "Cozy Studio Near the Corniche",
    category: "apartment",
    listingType: "rent",
    rentalPeriod: "yearly",
    status: "rented",
    description:
      "Compact, well-lit studio apartment a short walk from the Corniche, fully furnished with modern appliances.",
    price: 22000,
    owner: { name: "Lama Al-Qahtani", phone: "+966 56 777 1122" },
    location: { city: "Jeddah", district: "Al Hamra", address: "Corniche Rd" },
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200"],
  },
  {
    title: "Residential Plot in Al Qassim",
    category: "land",
    listingType: "sale",
    description:
      "850 sqm residential plot in a quiet, established neighborhood with all utilities connected.",
    price: 850000,
    owner: { name: "Nasser Al-Mutairi", phone: "+966 53 444 5566" },
    location: { city: "Buraydah", district: "Al Rawdah" },
    images: [],
  },
  {
    title: "Downtown Office Building",
    category: "build",
    listingType: "rent",
    rentalPeriod: "yearly",
    description:
      "Four-story office building with elevator, 20 parking spaces, and flexible floor plans suitable for a single tenant or multiple offices.",
    price: 480000,
    owner: { name: "Yousef Al-Ghamdi", phone: "+966 50 999 8877", email: "yousef@example.com" },
    location: { city: "Riyadh", district: "Olaya", address: "Olaya St" },
    images: ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200"],
  },
  {
    title: "New Build, Details Coming Soon",
    category: "apartment",
    listingType: "sale",
    description:
      "Recently completed apartment listed ahead of full documentation. Owner and exact location to be confirmed shortly.",
    price: 620000,
    images: [],
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected. Clearing existing listings...");
  await Property.deleteMany({});
  console.log("Inserting sample listings...");
  await Property.insertMany(sample);
  console.log(`Seeded ${sample.length} listings.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

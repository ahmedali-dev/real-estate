import type { PropertyHydrated, ApartmentUnit } from "@/models/Property";
import type { PropertyDTO } from "@/types/property";

export function serializeProperty(doc: PropertyHydrated): PropertyDTO {
  const obj = doc.toObject({ getters: true });
  return {
    _id: obj._id.toString(),
    title: obj.title,
    category: obj.category,
    listingType: obj.listingType,
    description: obj.description,
    price: obj.price,
    rentalPeriod: obj.rentalPeriod,
    status: obj.status,
    owner: obj.owner
      ? {
          name: obj.owner.name,
          phone: obj.owner.phone,
          email: obj.owner.email,
          notes: obj.owner.notes,
        }
      : undefined,
    location: obj.location
      ? {
          address: obj.location.address,
          city: obj.location.city,
          district: obj.location.district,
        }
      : undefined,
    details: obj.details
      ? {
          rooms: obj.details.rooms,
          bathrooms: obj.details.bathrooms,
          hasKitchen: obj.details.hasKitchen,
          kitchenCabinetsInstalled: obj.details.kitchenCabinetsInstalled,
        }
      : undefined,
    units: (obj.units ?? []).map((u: ApartmentUnit) => ({
      label: u.label,
      rooms: u.rooms,
      bathrooms: u.bathrooms,
      hasKitchen: u.hasKitchen,
      kitchenCabinetsInstalled: u.kitchenCabinetsInstalled,
      electricityNumber: u.electricityNumber,
    })),
    images: obj.images ?? [],
    tiktokUrl: obj.tiktokUrl || undefined,
    createdAt: new Date(obj.createdAt).toISOString(),
    updatedAt: new Date(obj.updatedAt).toISOString(),
  };
}

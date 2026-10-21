import type { PropertyHydrated, ApartmentUnit } from "@/models/Property";
import type { PropertyDTO } from "@/types/property";

export function serializeProperty(doc: PropertyHydrated, includeStaffFields = false): PropertyDTO {
  const obj = doc.toObject({ getters: true });
  return {
    _id: obj._id.toString(),
    title: obj.title,
    category: obj.category,
    propertyType: obj.propertyType,
    broughtBy: includeStaffFields && obj.broughtBy?.userId ? { userId: obj.broughtBy.userId, name: obj.broughtBy.name } : undefined,
    listingType: obj.listingType,
    description: obj.description,
    price: obj.price,
    rentalPeriod: obj.rentalPeriod,
    status: obj.status,
    visibility: obj.visibility,
    owner: includeStaffFields && obj.owner
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
          mapUrl: obj.location.mapUrl,
          district: obj.location.district,
        }
      : undefined,
    details: obj.details
      ? {
          rooms: obj.details.rooms,
          bathrooms: obj.details.bathrooms,
          hasKitchen: obj.details.hasKitchen,
          acInstalled: obj.details.acInstalled,
          kitchenCabinetsInstalled: obj.details.kitchenCabinetsInstalled,
          residencyType: includeStaffFields ? obj.details.residencyType : undefined,
        }
      : undefined,
    tenant: includeStaffFields && obj.tenant
      ? {
          name: obj.tenant.name,
          idNumber: obj.tenant.idNumber,
          phone: obj.tenant.phone,
        }
      : undefined,
    units: (obj.units ?? []).map((u: ApartmentUnit) => ({
      isRented: u.isRented ?? Boolean(u.tenant),
      name: u.name,
      number: u.number,
      rooms: u.rooms,
      bathrooms: u.bathrooms,
      hasKitchen: u.hasKitchen,
      kitchenCabinetsInstalled: u.kitchenCabinetsInstalled,
      electricityNumber: includeStaffFields ? u.electricityNumber : undefined,
      residencyType: includeStaffFields ? u.residencyType : undefined,
      tenant: includeStaffFields && u.tenant
        ? {
            name: u.tenant.name,
            idNumber: u.tenant.idNumber,
            phone: u.tenant.phone,
          }
        : undefined,
    })),
    images: obj.images ?? [],
    tiktokUrl: obj.tiktokUrl || undefined,
    createdAt: new Date(obj.createdAt).toISOString(),
    updatedAt: new Date(obj.updatedAt).toISOString(),
  };
}

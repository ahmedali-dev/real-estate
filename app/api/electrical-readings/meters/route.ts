import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";
import { requireListingsAccess } from "@/lib/auth/requireSession";
import type { MeterOption } from "@/types/electrical";

export const dynamic = "force-dynamic";

// GET /api/electrical-readings/meters
// Every unit inside a build that has an electricityNumber set is a
// "meter" that can be logged against. There's no separate meters
// collection — this is derived directly from Property/units each time.
export async function GET() {
  const { response: authError } = await requireListingsAccess();
  if (authError) return authError;

  try {
    await connectToDatabase();

    const builds = await Property.find({ category: "build", "units.0": { $exists: true } }).select(
      "title units"
    );

    const meters: MeterOption[] = [];
    for (const build of builds) {
      for (const unit of build.units) {
        if (!unit.electricityNumber) continue;
        meters.push({
          electricityNumber: unit.electricityNumber,
          propertyId: build._id.toString(),
          propertyTitle: build.title,
          unitName: unit.name,
          unitNumber: unit.number,
        });
      }
    }

    return NextResponse.json({ data: meters }, { status: 200 });
  } catch (err) {
    console.error("GET /api/electrical-readings/meters failed:", err);
    return NextResponse.json({ error: "Failed to load meters." }, { status: 500 });
  }
}

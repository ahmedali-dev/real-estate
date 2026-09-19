import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { ElectricalReading } from "@/models/ElectricalReading";
import { electricalReadingInputSchema, flattenZodErrors } from "@/lib/validations/electrical";
import { requireListingsAccess } from "@/lib/auth/requireSession";
import { kwhToBs } from "@/lib/electrical/tariff";
import type { ElectricalAlert, ElectricalReadingDTO, ElectricalStats } from "@/types/electrical";

export const dynamic = "force-dynamic";

function serialize(doc: {
  _id: unknown;
  electricityNumber: string;
  watts: number;
  kwh: number;
  costBs: number;
  recordedAt: Date;
  createdAt: Date;
}): ElectricalReadingDTO {
  return {
    _id: String(doc._id),
    electricityNumber: doc.electricityNumber,
    watts: doc.watts,
    kwh: doc.kwh,
    costBs: doc.costBs,
    recordedAt: doc.recordedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Basic, uncalibrated heuristics — meant as a starting point, not a
 * tuned detection system:
 * - "Spike": the latest reading's watts is 40%+ above the average of the
 *   prior readings.
 * - "Vampire": watts stayed above a small idle threshold during
 *   late-night hours (01:00–05:00, server time), suggesting something is
 *   drawing power with no one home/awake.
 */
function detectAlerts(readings: ElectricalReadingDTO[]): ElectricalAlert[] {
  const alerts: ElectricalAlert[] = [];
  if (readings.length === 0) return alerts;

  const sorted = [...readings].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const prior = sorted.slice(0, -1);

  if (prior.length >= 3) {
    const avg = prior.reduce((sum, r) => sum + r.watts, 0) / prior.length;
    if (avg > 0 && latest.watts > avg * 1.4) {
      const pct = Math.round(((latest.watts - avg) / avg) * 100);
      alerts.push({
        kind: "spike",
        message: "Pico de consumo detectado",
        detail: `${latest.watts} W, ${pct}% sobre el promedio reciente.`,
        at: latest.recordedAt,
      });
    }
  }

  const NIGHT_IDLE_THRESHOLD_WATTS = 50;
  const nightReadings = sorted.filter((r) => {
    const hour = new Date(r.recordedAt).getHours();
    return hour >= 1 && hour < 5 && r.watts > NIGHT_IDLE_THRESHOLD_WATTS;
  });
  if (nightReadings.length >= 2) {
    const avgNight = Math.round(
      nightReadings.reduce((sum, r) => sum + r.watts, 0) / nightReadings.length
    );
    alerts.push({
      kind: "vampire",
      message: 'Consumo "vampiro" nocturno',
      detail: `~${avgNight} W constantes entre 01:00–05:00 sin actividad esperada.`,
      at: nightReadings[nightReadings.length - 1].recordedAt,
    });
  }

  return alerts;
}

// GET /api/electrical-readings?electricityNumber=X&limit=50
export async function GET(req: NextRequest) {
  const { response: authError } = await requireListingsAccess();
  if (authError) return authError;

  try {
    const electricityNumber = req.nextUrl.searchParams.get("electricityNumber")?.trim();
    if (!electricityNumber) {
      return NextResponse.json({ error: "Missing 'electricityNumber' query parameter." }, { status: 400 });
    }
    const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50)));

    await connectToDatabase();

    const docs = await ElectricalReading.find({ electricityNumber })
      .sort({ recordedAt: -1 })
      .limit(limit);
    const readings = docs.map(serialize).reverse(); // chronological order for the chart

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayReadings = readings.filter((r) => new Date(r.recordedAt) >= startOfDay);
    const monthReadings = readings.filter((r) => new Date(r.recordedAt) >= startOfMonth);
    const todayKwh = todayReadings.reduce((sum, r) => sum + r.kwh, 0);
    const monthKwh = monthReadings.reduce((sum, r) => sum + r.kwh, 0);

    const stats: ElectricalStats = {
      latestWatts: readings.length > 0 ? readings[readings.length - 1].watts : null,
      todayKwh: Math.round(todayKwh * 100) / 100,
      monthKwh: Math.round(monthKwh * 100) / 100,
      todayCostBs: kwhToBs(todayKwh),
      monthCostBs: kwhToBs(monthKwh),
    };

    const alerts = detectAlerts(readings);

    return NextResponse.json({ data: readings, stats, alerts }, { status: 200 });
  } catch (err) {
    console.error("GET /api/electrical-readings failed:", err);
    return NextResponse.json({ error: "Failed to load readings." }, { status: 500 });
  }
}

// POST /api/electrical-readings
export async function POST(req: NextRequest) {
  const { response: authError } = await requireListingsAccess();
  if (authError) return authError;

  try {
    await connectToDatabase();

    const json = await req.json();
    const parsed = electricalReadingInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: flattenZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const { electricityNumber, watts, kwh, recordedAt } = parsed.data;
    const created = await ElectricalReading.create({
      electricityNumber,
      watts,
      kwh,
      costBs: kwhToBs(kwh),
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });

    return NextResponse.json({ data: serialize(created) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/electrical-readings failed:", err);
    return NextResponse.json({ error: "Failed to log reading." }, { status: 500 });
  }
}

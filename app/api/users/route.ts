import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { serializeUser } from "@/lib/mongodb/serializeUser";
import { createUserSchema, flattenZodErrors } from "@/lib/validations/user";
import { requireAdmin } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

// GET /api/users - admin only
export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    await connectToDatabase();
    const docs = await User.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ data: docs.map(serializeUser) }, { status: 200 });
  } catch (err) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}

// POST /api/users - admin only
export async function POST(req: NextRequest) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    await connectToDatabase();

    const json = await req.json();
    const parsed = createUserSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: flattenZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return NextResponse.json(
        { error: "A user with that email already exists.", fieldErrors: { email: "Already in use." } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const created = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      active: true,
    });

    return NextResponse.json({ data: serializeUser(created) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/users failed:", err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { serializeUser } from "@/lib/mongodb/serializeUser";
import { updateUserSchema, flattenZodErrors } from "@/lib/validations/user";
import { requireAdmin } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function countActiveAdmins(excludingId?: string) {
  const filter: Record<string, unknown> = { role: "admin", active: true };
  if (excludingId) filter._id = { $ne: excludingId };
  return User.countDocuments(filter);
}

// PUT /api/users/:id - admin only
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }
    await connectToDatabase();

    const json = await req.json();
    const parsed = updateUserSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: flattenZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const existing = await User.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const willDemote = existing.role === "admin" && parsed.data.role !== undefined && parsed.data.role !== "admin";
    const willDeactivate = parsed.data.active === false && existing.active;
    if ((willDemote || willDeactivate) && existing.role === "admin") {
      const remaining = await countActiveAdmins(existing._id.toString());
      if (remaining === 0) {
        return NextResponse.json(
          { error: "Can't remove the last remaining admin account." },
          { status: 400 }
        );
      }
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.name) update.name = parsed.data.name;
    if (parsed.data.role) update.role = parsed.data.role;
    if (parsed.data.active !== undefined) update.active = parsed.data.active;
    if (parsed.data.password) update.passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const updated = await User.findByIdAndUpdate(params.id, { $set: update }, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ data: serializeUser(updated) }, { status: 200 });
  } catch (err) {
    console.error(`PUT /api/users/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

// DELETE /api/users/:id - admin only
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, response: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }
    if (session!.user.id === params.id) {
      return NextResponse.json(
        { error: "You can't delete your own account while signed in." },
        { status: 400 }
      );
    }
    await connectToDatabase();

    const existing = await User.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (existing.role === "admin") {
      const remaining = await countActiveAdmins(existing._id.toString());
      if (remaining === 0) {
        return NextResponse.json(
          { error: "Can't remove the last remaining admin account." },
          { status: 400 }
        );
      }
    }

    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ data: { _id: params.id } }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/users/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}

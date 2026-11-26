import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { USERS } from "./seed";
import { getStore } from "./store";
import { userIdForEmail } from "./userDirectory";
import type { Student, User } from "./types";

/**
 * The signed-in Microsoft Entra user, matched by email to a Kindra user (KINDRA_USER_EMAILS), or null.
 * The role and advisee assignment come from the Kindra user; the name is the person's real Entra name,
 * so the audit log records who actually acted. Checked on every request, so removing an email revokes access.
 */
export async function signedInUser(): Promise<(User & { email: string }) | null> {
  const session = await auth();
  const email = session?.user?.email;
  const user = USERS.find((u) => u.id === userIdForEmail(email));
  if (!email || !user) return null;
  return { ...user, name: session.user?.name || user.name, email };
}

/** Like signedInUser, but sends anyone not signed in (or no longer listed) to the sign-in page. */
export async function currentUser(): Promise<User> {
  const user = await signedInUser();
  if (!user) redirect("/signin?error=AccessDenied");
  return user;
}

/**
 * Assignment-based access: advisers can open only their own advisees' records.
 * The guidance counselor and guidance head serve the whole SHS, so they can open every record (each view is logged).
 */
export const canAccess = (user: User, student: Student) => user.role !== "adviser" || student.adviserId === user.id;

export async function myStudents(user: User) {
  return (await getStore().listStudents()).filter((s) => canAccess(user, s));
}

/** Loads a student only if the current adviser is assigned to them. */
export async function accessibleStudent(id: string) {
  const user = await currentUser();
  const student = await getStore().getStudent(id);
  return { user, student: student && canAccess(user, student) ? student : null, exists: Boolean(student) };
}

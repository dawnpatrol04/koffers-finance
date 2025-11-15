"use server";

import { createSessionClient, deleteSession } from "@/lib/appwrite-server";
import { redirect } from "next/navigation";

export async function logoutAction() {
  try {
    // Try to delete the server-side session
    const { account } = await createSessionClient();
    await account.deleteSession("current");
  } catch (error) {
    // Session might already be invalid, that's okay
    console.log("Session already invalid or expired");
  }

  // Always delete the session cookie
  await deleteSession();

  // Redirect to login page
  redirect("/login");
}

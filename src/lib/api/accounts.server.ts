// Server functions that need the Supabase service role key — creating a
// login with an admin-chosen password can't be done with the public anon
// key. The actual service-role client only ever loads inside the handler
// below (dynamic import of src/lib/server/admin-client), so the secret
// never ships to the browser.
import { createServerFn } from "@tanstack/react-start";

type CreateDriverAccountInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

export const createDriverAccount = createServerFn({ method: "POST" })
  .validator((data: CreateDriverAccountInput) => data)
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/lib/server/admin-client");
    const admin = getAdminClient();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) {
      throw new Error(error?.message ?? "Could not create the driver's login.");
    }

    // The on_auth_user_created trigger creates the profiles row in the same
    // transaction as the user insert, so it already exists by now. Promote
    // it to a driver account and force a password change on first login.
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        role: "driver",
        full_name: data.fullName,
        phone: data.phone ?? null,
        must_change_password: true,
      })
      .eq("id", created.user.id);

    if (updateError) {
      // Roll back the auth user so a failed driver record doesn't leave an
      // orphaned login behind.
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(updateError.message);
    }

    return { id: created.user.id };
  });

export const deleteAuthAccount = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/lib/server/admin-client");
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

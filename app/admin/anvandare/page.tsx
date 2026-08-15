import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, sites, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { createCustomerUser, deleteUserAction, resetPasswordAction } from "@/lib/actions/users";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";
import { AdminUserForm } from "@/components/admin/AdminUserForm";

const ROLE_LABELS: Record<"admin" | "customer", string> = {
  admin: "Administratör",
  customer: "Kund",
};

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i namn och e-post.",
  "no-site": "Välj minst en sajt för kundanvändaren.",
  "email-taken": "Det finns redan en användare med den e-postadressen.",
  "self-delete": "Du kan inte ta bort ditt eget konto.",
  "last-admin": "Det måste finnas minst en administratör kvar — kan inte ta bort den sista.",
  "not-found": "Hittade ingen sådan användare.",
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  sites: { id: string; name: string }[];
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    createdUser?: string;
    createdEmail?: string;
    resetUser?: string;
    resetEmail?: string;
    tempPassword?: string;
    deleted?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const { error, createdUser, createdEmail, resetUser, resetEmail, tempPassword, deleted } =
    await searchParams;

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      siteId: sites.id,
      siteName: sites.name,
    })
    .from(users)
    .leftJoin(memberships, eq(memberships.userId, users.id))
    .leftJoin(sites, eq(memberships.siteId, sites.id))
    .orderBy(asc(users.email));

  const userMap = new Map<string, UserRow>();
  for (const row of rows) {
    let entry = userMap.get(row.userId);
    if (!entry) {
      entry = { id: row.userId, name: row.name, email: row.email, role: row.role, sites: [] };
      userMap.set(row.userId, entry);
    }
    if (row.siteId && row.siteName) {
      entry.sites.push({ id: row.siteId, name: row.siteName });
    }
  }
  const userRows = Array.from(userMap.values());
  const adminCount = userRows.filter((u) => u.role === "admin").length;

  const allSites = await db.select().from(sites).orderBy(asc(sites.name));

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const revealTitle = createdUser ? "Tillfälligt lösenord" : "Nytt tillfälligt lösenord";
  const revealName = createdUser ?? resetUser;
  const revealEmail = createdEmail ?? resetEmail;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Användare</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Alla användare i CMS:et och vilka sajter de har åtkomst till.
        </p>
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      {deleted === "1" ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Användaren togs bort.
        </div>
      ) : null}

      {tempPassword ? (
        <AdminRevealSecret
          title={revealTitle}
          description={`Ge det här lösenordet till ${revealName ?? "användaren"} (${revealEmail ?? ""}). De bör byta det direkt efter första inloggningen.`}
          value={tempPassword}
        />
      ) : null}

      {userRows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Inga användare hittades ännu.
        </div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Namn</th>
              <th className="px-5 py-3 font-medium">E-post</th>
              <th className="px-5 py-3 font-medium">Roll</th>
              <th className="px-5 py-3 font-medium">Sajter</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {userRows.map((row) => {
              const isSelf = row.id === admin.id;
              const isLastAdmin = row.role === "admin" && adminCount <= 1;
              const canDelete = !isSelf && !isLastAdmin;

              return (
                <tr key={row.id} className="align-top hover:bg-neutral-50">
                  <td className="px-5 py-3 text-neutral-900">
                    {row.name}
                    {isSelf ? <span className="ml-2 text-xs text-neutral-400">(du)</span> : null}
                  </td>
                  <td className="max-w-[220px] break-all px-5 py-3 text-neutral-700">{row.email}</td>
                  <td className="px-5 py-3 text-neutral-500">{ROLE_LABELS[row.role]}</td>
                  <td className="px-5 py-3 text-neutral-500">
                    {row.sites.length === 0 ? "—" : row.sites.map((s) => s.name).join(", ")}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={resetPasswordAction.bind(null, row.id)}>
                        <ConfirmButton
                          confirmText={`Återställ lösenordet för ${row.name}? Ett nytt tillfälligt lösenord genereras.`}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          Återställ lösenord
                        </ConfirmButton>
                      </form>
                      {canDelete ? (
                        <form action={deleteUserAction.bind(null, row.id)}>
                          <ConfirmButton
                            confirmText={`Ta bort användaren ${row.name}? Detta går inte att ångra.`}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Ta bort
                          </ConfirmButton>
                        </form>
                      ) : (
                        <span
                          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-300"
                          title={isSelf ? "Du kan inte ta bort dig själv" : "Sista administratören kan inte tas bort"}
                        >
                          Ta bort
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Ny kundanvändare</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Skapar en användare med rollen "Kund" och genererar ett tillfälligt lösenord som visas en gång.
        </p>
        <div className="mt-4">
          <AdminUserForm action={createCustomerUser} sites={allSites} />
        </div>
      </div>
    </div>
  );
}

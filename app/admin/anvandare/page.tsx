import { asc, eq } from "drizzle-orm";
import { Users as UsersIcon } from "lucide-react";
import { db } from "@/lib/db";
import { memberships, sites, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { createCustomerUser, deleteUserAction, resetPasswordAction } from "@/lib/actions/users";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";
import { AdminUserForm } from "@/components/admin/AdminUserForm";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui";

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
      <PageHeader title="Användare" description="Alla användare i CMS:et och vilka sajter de har åtkomst till." />

      {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

      {deleted === "1" ? <Alert tone="success">Användaren togs bort.</Alert> : null}

      {tempPassword ? (
        <Alert tone="success" title={revealTitle}>
          <p className="mb-2">
            Ge det här lösenordet till {revealName ?? "användaren"} ({revealEmail ?? ""}). De bör byta det direkt
            efter första inloggningen.
          </p>
          <AdminRevealSecret value={tempPassword} variant="inline" />
        </Alert>
      ) : null}

      {userRows.length === 0 ? (
        <EmptyState icon={<UsersIcon />} title="Inga användare hittades ännu" description="Skapa en kundanvändare nedan." />
      ) : (
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Namn</Th>
              <Th>E-post</Th>
              <Th>Roll</Th>
              <Th>Sajter</Th>
              <Th>Åtgärder</Th>
            </Tr>
          </Thead>
          <Tbody>
            {userRows.map((row) => {
              const isSelf = row.id === admin.id;
              const isLastAdmin = row.role === "admin" && adminCount <= 1;
              const canDelete = !isSelf && !isLastAdmin;

              return (
                <Tr key={row.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={row.name || row.email} size={28} />
                      <span className="whitespace-nowrap text-neutral-900">
                        {row.name}
                        {isSelf ? <span className="ml-1.5 text-xs text-neutral-400">(du)</span> : null}
                      </span>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-neutral-700">{row.email}</Td>
                  <Td>
                    <Badge tone={row.role === "admin" ? "brand" : "neutral"}>{ROLE_LABELS[row.role]}</Badge>
                  </Td>
                  <Td>
                    {row.sites.length === 0 ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.sites.map((s) => (
                          <Badge key={s.id} tone="neutral">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-nowrap justify-end gap-2 whitespace-nowrap">
                      <form action={resetPasswordAction.bind(null, row.id)}>
                        <ConfirmButton
                          variant="secondary"
                          size="sm"
                          confirmText={`Återställ lösenordet för ${row.name}? Ett nytt tillfälligt lösenord genereras.`}
                        >
                          Återställ lösenord
                        </ConfirmButton>
                      </form>
                      {canDelete ? (
                        <form action={deleteUserAction.bind(null, row.id)}>
                          <ConfirmButton
                            variant="danger"
                            size="sm"
                            confirmText={`Ta bort användaren ${row.name}? Detta går inte att ångra.`}
                          >
                            Ta bort
                          </ConfirmButton>
                        </form>
                      ) : (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled
                          title={isSelf ? "Du kan inte ta bort dig själv" : "Sista administratören kan inte tas bort"}
                        >
                          Ta bort
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      <AdminUserForm action={createCustomerUser} sites={allSites} />
    </div>
  );
}

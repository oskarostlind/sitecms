import { asc, eq } from "drizzle-orm";
import { KeyRound, Trash2, Users as UsersIcon } from "lucide-react";
import { db } from "@/lib/db";
import { memberships, sites, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { deleteUserAction, inviteUserAction, resetPasswordAction } from "@/lib/actions/users";
import { MEMBERSHIP_ROLE_LABELS } from "@/lib/emails";
import type { MembershipRole } from "@/lib/db/schema";
import { ConfirmButton } from "@/components/content/ConfirmButton";
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
  missing: "Fyll i en e-postadress.",
  "invalid-email": "Ange en giltig e-postadress.",
  "invalid-role": "Välj en roll.",
  "no-site": "Välj minst en sajt att bjuda in till.",
  "already-member": "Adressen är redan medlem på alla valda sajter — ingen inbjudan skickades.",
  "invite-failed": "Ingen inbjudan kunde skapas. Försök igen.",
  "mail-failed": "Mejlet kunde inte skickas. Kontrollera e-postinställningarna (RESEND_API_KEY/MAIL_FROM) och försök igen.",
  "self-delete": "Du kan inte ta bort ditt eget konto.",
  "last-admin": "Det måste finnas minst en administratör kvar — kan inte ta bort den sista.",
  "not-found": "Hittade ingen sådan användare.",
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  emailVerified: boolean;
  hasPassword: boolean;
  sites: { id: string; name: string; role: MembershipRole }[];
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    invited?: string;
    invitedCount?: string;
    skipped?: string;
    mailFailed?: string;
    resetSent?: string;
    deleted?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const { error, invited, invitedCount, skipped, mailFailed, resetSent, deleted } = await searchParams;

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordHash: users.passwordHash,
      siteId: sites.id,
      siteName: sites.name,
      membershipRole: memberships.role,
    })
    .from(users)
    .leftJoin(memberships, eq(memberships.userId, users.id))
    .leftJoin(sites, eq(memberships.siteId, sites.id))
    .orderBy(asc(users.email));

  const userMap = new Map<string, UserRow>();
  for (const row of rows) {
    let entry = userMap.get(row.userId);
    if (!entry) {
      entry = {
        id: row.userId,
        name: row.name,
        email: row.email,
        role: row.role,
        emailVerified: Boolean(row.emailVerifiedAt),
        hasPassword: Boolean(row.passwordHash),
        sites: [],
      };
      userMap.set(row.userId, entry);
    }
    if (row.siteId && row.siteName && row.membershipRole) {
      entry.sites.push({ id: row.siteId, name: row.siteName, role: row.membershipRole });
    }
  }
  const userRows = Array.from(userMap.values());
  const adminCount = userRows.filter((u) => u.role === "admin").length;

  const allSites = await db.select().from(sites).orderBy(asc(sites.name));

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const invitedSites = Number(invitedCount ?? "0");
  const skippedSites = Number(skipped ?? "0");

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Användare" description="Alla användare i CMS:et, vilka sajter de har åtkomst till och med vilken roll." />

      {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

      {deleted === "1" ? <Alert tone="success">Användaren togs bort.</Alert> : null}

      {invited ? (
        <Alert tone={mailFailed ? "warning" : "success"} title={mailFailed ? "Inbjudan skapad, men mejl misslyckades" : "Inbjudan skickad"}>
          {invitedSites === 1 ? "En inbjudan" : `${invitedSites} inbjudningar`} till {invited}.
          {skippedSites > 0
            ? ` ${skippedSites === 1 ? "En sajt" : `${skippedSites} sajter`} hoppades över eftersom adressen redan är medlem där.`
            : ""}
          {mailFailed
            ? ` ${mailFailed} mejl kunde inte skickas — skicka om från sajtens medlemssida.`
            : " Den gäller i 7 dagar och syns under Medlemmar på respektive sajt."}
        </Alert>
      ) : null}

      {resetSent ? (
        <Alert tone="success">
          En länk för att välja nytt lösenord har skickats till {resetSent}. Den gäller i 2 timmar.
        </Alert>
      ) : null}

      {userRows.length === 0 ? (
        <EmptyState icon={<UsersIcon />} title="Inga användare hittades ännu" description="Bjud in en användare nedan." />
      ) : (
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Namn</Th>
              <Th>E-post</Th>
              <Th>Roll</Th>
              <Th>Sajter och roller</Th>
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
                  <Td className="whitespace-nowrap text-neutral-700">
                    <div>{row.email}</div>
                    <div className="mt-0.5 text-xs">
                      {row.emailVerified ? (
                        <span className="text-emerald-700">Bekräftad</span>
                      ) : row.hasPassword ? (
                        <span className="text-amber-700">Ej bekräftad</span>
                      ) : (
                        <span className="text-neutral-500">Inbjuden, ej aktiverad</span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={row.role === "admin" ? "brand" : "neutral"}>{ROLE_LABELS[row.role]}</Badge>
                  </Td>
                  <Td>
                    {row.sites.length === 0 ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.sites.map((s) => (
                          <Badge key={s.id} tone={s.role === "owner" ? "brand" : "neutral"} title={MEMBERSHIP_ROLE_LABELS[s.role]}>
                            {s.name}
                            <span className="font-normal opacity-70">· {MEMBERSHIP_ROLE_LABELS[s.role]}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-nowrap justify-end gap-1.5 whitespace-nowrap">
                      <form action={resetPasswordAction.bind(null, row.id)}>
                        <ConfirmButton
                          variant="secondary"
                          size="sm"
                          className="px-2.5"
                          icon={<KeyRound />}
                          aria-label={`Skicka länk för nytt lösenord till ${row.name}`}
                          title="Skicka länk för nytt lösenord"
                          confirmText={`Skicka ett mejl till ${row.email} med en länk för att välja nytt lösenord? Det nuvarande lösenordet fungerar tills länken används.`}
                        >
                          <span className="sr-only">Skicka länk för nytt lösenord</span>
                        </ConfirmButton>
                      </form>
                      {canDelete ? (
                        <form action={deleteUserAction.bind(null, row.id)}>
                          <ConfirmButton
                            variant="danger"
                            size="sm"
                            className="px-2.5"
                            icon={<Trash2 />}
                            aria-label={`Ta bort ${row.name}`}
                            title="Ta bort"
                            confirmText={`Ta bort användaren ${row.name}? Detta går inte att ångra.`}
                          >
                            <span className="sr-only">Ta bort</span>
                          </ConfirmButton>
                        </form>
                      ) : (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="px-2.5"
                          icon={<Trash2 />}
                          disabled
                          aria-label="Ta bort"
                          title={isSelf ? "Du kan inte ta bort dig själv" : "Sista administratören kan inte tas bort"}
                        >
                          <span className="sr-only">Ta bort</span>
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

      <AdminUserForm action={inviteUserAction} sites={allSites} />
    </div>
  );
}

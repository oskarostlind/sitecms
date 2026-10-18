import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { Mail, RotateCw, Trash2, UserPlus, X } from "lucide-react";
import { db } from "@/lib/db";
import { authTokens, memberships, sites, users } from "@/lib/db/schema";
import { requireSiteOwner } from "@/lib/guard";
import {
  changeMemberRole,
  inviteMember,
  removeMember,
  resendInvite,
  revokeInvite,
} from "@/lib/actions/members";
import { MEMBERSHIP_ROLE_LABELS } from "@/lib/emails";
import { formatDate, formatDateTime } from "@/lib/format";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  SubmitButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i en e-postadress.",
  "invalid-email": "Ange en giltig e-postadress.",
  "invalid-role": "Välj en roll.",
  "already-member": "Den adressen är redan medlem på sajten.",
  "site-not-found": "Hittade inte sajten.",
  "invite-not-found": "Inbjudan finns inte längre — den kan redan ha accepterats, återkallats eller gått ut.",
  "member-not-found": "Hittade inte medlemmen.",
  "last-owner": "Sajten måste ha minst en ägare. Gör någon annan till ägare först.",
};

export default async function SiteMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{
    error?: string;
    email?: string;
    invited?: string;
    resent?: string;
    mailFailed?: string;
    revoked?: string;
    removed?: string;
    roleChanged?: string;
  }>;
}) {
  const { siteId } = await params;
  const user = await requireSiteOwner(siteId);
  const { error, email, invited, resent, mailFailed, revoked, removed, roleChanged } = await searchParams;

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) notFound();

  const [members, pending] = await Promise.all([
    db
      .select({
        id: memberships.id,
        role: memberships.role,
        createdAt: memberships.createdAt,
        userId: users.id,
        name: users.name,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.siteId, siteId))
      .orderBy(asc(memberships.createdAt)),
    db
      .select({
        id: authTokens.id,
        email: authTokens.email,
        role: authTokens.membershipRole,
        createdAt: authTokens.createdAt,
        expiresAt: authTokens.expiresAt,
        invitedByName: users.name,
      })
      .from(authTokens)
      .leftJoin(users, eq(authTokens.invitedByUserId, users.id))
      .where(
        and(
          eq(authTokens.type, "invite"),
          eq(authTokens.siteId, siteId),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(authTokens.createdAt)),
  ]);

  const ownerCount = members.filter((m) => m.role === "owner").length;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Medlemmar"
        description={`Vilka som kan logga in och arbeta med ${site.name}. Ägare hanterar inställningar, integration och medlemmar; redaktörer redigerar innehåll.`}
      />

      <div className="space-y-6">
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
        {invited ? (
          mailFailed ? (
            <Alert tone="warning" title="Inbjudan skapad, men mejlet kunde inte skickas">
              Inbjudan till {invited} finns under Väntande inbjudningar. Försök skicka om den om en stund.
            </Alert>
          ) : (
            <Alert tone="success">Inbjudan skickad till {invited}. Den gäller i 7 dagar.</Alert>
          )
        ) : null}
        {resent ? (
          mailFailed ? (
            <Alert tone="warning">Mejlet till {resent} kunde inte skickas. Försök igen om en stund.</Alert>
          ) : (
            <Alert tone="success">Ny inbjudan skickad till {resent}. Den tidigare länken slutade fungera.</Alert>
          )
        ) : null}
        {revoked === "1" ? <Alert tone="success">Inbjudan återkallades — länken fungerar inte längre.</Alert> : null}
        {removed === "1" ? <Alert tone="success">Medlemmen togs bort från sajten.</Alert> : null}
        {roleChanged === "1" ? <Alert tone="success">Rollen har ändrats.</Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle>Bjud in</CardTitle>
            <CardDescription>
              Vi skickar ett mejl med en länk. Den som bjuds in väljer namn och lösenord när hen accepterar — har hen
              redan ett konto loggar hen bara in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteMember.bind(null, siteId)} className="flex flex-wrap items-end gap-3">
              <Field htmlFor="invite-email" label="E-post" className="min-w-[220px] flex-1">
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  defaultValue={error ? (email ?? "") : ""}
                  placeholder="namn@exempel.se"
                />
              </Field>
              <Field htmlFor="invite-role" label="Roll" className="w-40">
                <Select id="invite-role" name="role" defaultValue="editor">
                  <option value="editor">Redaktör</option>
                  <option value="owner">Ägare</option>
                </Select>
              </Field>
              <SubmitButton icon={<UserPlus />} pendingText="Skickar…">
                Skicka inbjudan
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medlemmar</CardTitle>
            <CardDescription>
              {members.length === 1 ? "1 person" : `${members.length} personer`} har åtkomst.
              {user.role === "admin" ? " Som administratör har du åtkomst till alla sajter även utan medlemskap." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-neutral-500">Inga medlemmar ännu.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>Namn</Th>
                    <Th>Roll</Th>
                    <Th>Medlem sedan</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {members.map((m) => {
                    const isSelf = m.userId === user.id;
                    const isLastOwner = m.role === "owner" && ownerCount <= 1;
                    return (
                      <Tr key={m.id}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={m.name || m.email} size={28} />
                            <div className="min-w-0">
                              <p className="truncate text-neutral-900">
                                {m.name}
                                {isSelf ? <span className="ml-1.5 text-xs text-neutral-400">(du)</span> : null}
                              </p>
                              <p className="truncate text-xs text-neutral-500">{m.email}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          {isLastOwner ? (
                            <Badge tone="brand" title="Sajten måste ha minst en ägare">
                              Ägare
                            </Badge>
                          ) : (
                            <form action={changeMemberRole.bind(null, siteId, m.id)} className="flex items-center gap-2">
                              <label htmlFor={`role-${m.id}`} className="sr-only">
                                Roll för {m.name}
                              </label>
                              <Select
                                id={`role-${m.id}`}
                                name="role"
                                defaultValue={m.role}
                                wrapperClassName="w-32"
                                className="h-8 text-sm"
                              >
                                <option value="editor">Redaktör</option>
                                <option value="owner">Ägare</option>
                              </Select>
                              <SubmitButton size="sm" variant="secondary" pendingText="Sparar…">
                                Spara
                              </SubmitButton>
                            </form>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-neutral-500">{formatDate(m.createdAt)}</Td>
                        <Td className="text-right">
                          {isLastOwner ? (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              className="px-2.5"
                              icon={<Trash2 />}
                              disabled
                              aria-label="Ta bort"
                              title="Sista ägaren kan inte tas bort"
                            >
                              <span className="sr-only">Ta bort</span>
                            </Button>
                          ) : (
                            <form action={removeMember.bind(null, siteId, m.id)}>
                              <ConfirmButton
                                variant="danger"
                                size="sm"
                                className="px-2.5"
                                icon={<Trash2 />}
                                aria-label={isSelf ? "Lämna sajten" : `Ta bort ${m.name}`}
                                title={isSelf ? "Lämna sajten" : "Ta bort från sajten"}
                                confirmText={
                                  isSelf
                                    ? `Lämna ${site.name}? Du förlorar åtkomsten till sajten.`
                                    : `Ta bort ${m.name} från ${site.name}? Kontot finns kvar men förlorar åtkomsten till sajten.`
                                }
                              >
                                <span className="sr-only">{isSelf ? "Lämna sajten" : "Ta bort"}</span>
                              </ConfirmButton>
                            </form>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Väntande inbjudningar</CardTitle>
            <CardDescription>Inbjudningar som inte har accepterats ännu. De slutar gälla efter 7 dagar.</CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <EmptyState
                icon={<Mail />}
                title="Inga väntande inbjudningar"
                description="Bjud in en kund eller kollega med formuläret ovan."
                className="py-8"
              />
            ) : (
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>E-post</Th>
                    <Th>Roll</Th>
                    <Th>Skickad</Th>
                    <Th>Går ut</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {pending.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <p className="truncate text-neutral-900">{p.email}</p>
                        {p.invitedByName ? (
                          <p className="truncate text-xs text-neutral-500">av {p.invitedByName}</p>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={p.role === "owner" ? "brand" : "neutral"}>
                          {MEMBERSHIP_ROLE_LABELS[p.role ?? "editor"]}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-neutral-500">{formatDateTime(p.createdAt)}</Td>
                      <Td className="whitespace-nowrap text-neutral-500">{formatDate(p.expiresAt)}</Td>
                      <Td>
                        <div className="flex flex-nowrap justify-end gap-1.5 whitespace-nowrap">
                          <form action={resendInvite.bind(null, siteId, p.id)}>
                            <SubmitButton
                              variant="secondary"
                              size="sm"
                              className="px-2.5"
                              icon={<RotateCw />}
                              aria-label={`Skicka om inbjudan till ${p.email}`}
                              title="Skicka om"
                            >
                              <span className="sr-only">Skicka om</span>
                            </SubmitButton>
                          </form>
                          <form action={revokeInvite.bind(null, siteId, p.id)}>
                            <ConfirmButton
                              variant="danger"
                              size="sm"
                              className="px-2.5"
                              icon={<X />}
                              aria-label={`Återkalla inbjudan till ${p.email}`}
                              title="Återkalla"
                              confirmText={`Återkalla inbjudan till ${p.email}? Länken i mejlet slutar fungera.`}
                            >
                              <span className="sr-only">Återkalla</span>
                            </ConfirmButton>
                          </form>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

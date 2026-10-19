import { NextResponse } from "next/server";
import { REVEAL_COOKIE, REVEAL_COOKIE_PATH } from "@/lib/reveal-flash";

/**
 * Raderar engångscookien med hemligheter så fort sidan har visat dem.
 * En route handler i stället för en server action: att ändra cookies i en
 * server action får Next att rendera om sidan, och då skulle värdet
 * försvinna innan användaren hunnit kopiera det.
 */
export async function POST() {
  const res = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  res.cookies.set(REVEAL_COOKIE, "", { path: REVEAL_COOKIE_PATH, maxAge: 0, httpOnly: true, sameSite: "strict" });
  return res;
}

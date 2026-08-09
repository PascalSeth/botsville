import { NextResponse } from "next/server";

const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/JJnIPabbxCmB3R7abTRjWs";

export async function GET() {
  return NextResponse.redirect(WHATSAPP_COMMUNITY_URL, { status: 307 });
}

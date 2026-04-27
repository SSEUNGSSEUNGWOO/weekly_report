import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "access_granted";
const COOKIE_VALUE = "yes";

export async function POST(request: NextRequest) {
  const expected = process.env.ACCESS_CODE;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ACCESS_CODE not configured" },
      { status: 500 },
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof body.code !== "string" || body.code !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  // session cookie — maxAge 없으면 브라우저 종료 시 자동 삭제
  response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}

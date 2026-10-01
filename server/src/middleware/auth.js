import jwt from "jsonwebtoken";

function cookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: production ? "none" : "lax",
    secure: production,
    path: "/api",
  };
}

export function setAuthCookies(response, user) {
  const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ sub: user.id, type: "refresh" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  response.cookie("portfolio_access", accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 });
  response.cookie("portfolio_refresh", refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(response) {
  response.clearCookie("portfolio_access", cookieOptions());
  response.clearCookie("portfolio_refresh", cookieOptions());
}

export function requireAuth(request, response, next) {
  const token = request.cookies?.portfolio_access;
  if (!token) return response.status(401).json({ error: "Authentication required." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    request.user = { id: payload.sub };
    return next();
  } catch {
    return response.status(401).json({ error: "Session expired. Please sign in again." });
  }
}
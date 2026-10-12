
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accessToken =
      req.body?.accessToken ||
      req.body?.auth?.accessToken;

    if (
      typeof accessToken !== "string" ||
      accessToken.length === 0
    ) {
      return res.status(400).json({
        verified: false,
        error: "Missing Pi access token"
      });
    }

    const response = await fetch(
      "https://api.minepi.com/v2/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      return res.status(401).json({
        verified: false,
        error: "Pi authentication failed"
      });
    }

    const user = await response.json();

    if (!user.uid || !user.username) {
      return res.status(401).json({
        verified: false,
        error: "Invalid Pi user response"
      });
    }

    return res.status(200).json({
      verified: true,
      user: {
        uid: user.uid,
        username: user.username
      }
    });
  } catch (error) {
    return res.status(500).json({
      verified: false,
      error: "Authentication service error"
    });
  }
}
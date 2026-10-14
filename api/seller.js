export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accessToken = req.body?.accessToken;
  const fields = req.body?.seller;

  if (typeof accessToken !== "string" || !accessToken || !fields) {
    return res.status(400).json({ error: "Sign in with Pi and complete the form first." });
  }

  const required = ["shop", "sellerName", "phone", "state", "products"];
  if (required.some((key) => typeof fields[key] !== "string" || !fields[key].trim())) {
    return res.status(400).json({ error: "Please complete every required seller field." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return res.status(500).json({ error: "Database is not configured on the server yet." });
  }

  try {
    const piResponse = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!piResponse.ok) {
      return res.status(401).json({ error: "Your Pi sign-in has expired. Please sign in again." });
    }
    const piUser = await piResponse.json();
    if (!piUser?.uid || !piUser?.username) {
      return res.status(401).json({ error: "Pi account could not be verified." });
    }

    const dbResponse = await fetch(
      `${supabaseUrl.replace(/\\/$/, "")}/rest/v1/pi_seller_profiles?on_conflict=pi_uid`,
      {
        method: "POST",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          pi_uid: piUser.uid,
          pi_username: piUser.username,
          shop_name: fields.shop.trim(),
          contact_name: fields.sellerName.trim(),
          phone: fields.phone.trim(),
          state: fields.state.trim(),
          city: fields.city?.trim() || null,
          seller_type: fields.products.trim()
        })
      }
    );
    if (!dbResponse.ok) {
      const detail = await dbResponse.text();
      console.error("Supabase seller save failed:", detail);
      return res.status(502).json({ error: "Could not save your registration. Please try again later." });
    }
    return res.status(200).json({ saved: true, username: piUser.username });
  } catch (error) {
    console.error("Seller registration error:", error);
    return res.status(500).json({ error: "Unexpected server error while saving registration." });
  }
}

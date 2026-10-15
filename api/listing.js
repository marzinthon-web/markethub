export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessToken = req.body?.accessToken;
  const fields = req.body?.listing;
  if (typeof accessToken !== "string" || !accessToken || !fields) {
    return res.status(400).json({ error: "Sign in with Pi and complete the listing form first." });
  }

  const required = ["title", "description", "listing_type", "transaction_type", "category", "state", "city", "currency"];
  if (required.some((key) => typeof fields[key] !== "string" || !fields[key].trim())) {
    return res.status(400).json({ error: "Please complete all required listing fields." });
  }
  const price = Number(fields.price);
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "Enter a price greater than zero." });
  }
  if (!["NGN", "PI"].includes(fields.currency)) {
    return res.status(400).json({ error: "Choose NGN or Pi as the listing currency." });
  }
  if (!["product", "property"].includes(fields.listing_type) ||
      !["sale", "rent", "lease"].includes(fields.transaction_type)) {
    return res.status(400).json({ error: "Choose a valid listing type and transaction type." });
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
    if (!piResponse.ok) return res.status(401).json({ error: "Your Pi sign-in has expired. Please sign in again." });
    const piUser = await piResponse.json();
    if (!piUser?.uid) return res.status(401).json({ error: "Pi account could not be verified." });

    const sellerResponse = await fetch(
      `${supabaseUrl.replace(/\\/$/, "")}/rest/v1/pi_seller_profiles?pi_uid=eq.${encodeURIComponent(piUser.uid)}&select=pi_uid`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } }
    );
    if (!sellerResponse.ok) {
      console.error("Seller lookup failed:", await sellerResponse.text());
      return res.status(502).json({ error: "Could not verify your seller registration." });
    }
    const sellers = await sellerResponse.json();
    if (!sellers.length) return res.status(403).json({ error: "Register as a seller first, then create your listing." });

    const row = {
      seller_pi_uid: piUser.uid,
      title: fields.title.trim(),
      description: fields.description.trim(),
      listing_type: fields.listing_type,
      transaction_type: fields.transaction_type,
      category: fields.category.trim(),
      price: price,
      currency: fields.currency,
      state: fields.state.trim(),
      city: fields.city.trim(),
      quantity: fields.quantity?.trim() || null,
      unit: fields.unit?.trim() || null,
      status: "published"
    };
    const dbResponse = await fetch(`${supabaseUrl.replace(/\\/$/, "")}/rest/v1/pi_listings`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(row)
    });
    if (!dbResponse.ok) {
      const detail = await dbResponse.text();
      console.error("Listing save failed:", detail);
      return res.status(502).json({ error: "The database needs the listing currency fields configured before this can be saved." });
    }
    return res.status(200).json({ saved: true, currency: fields.currency });
  } catch (error) {
    console.error("Listing save error:", error);
    return res.status(500).json({ error: "Unexpected server error while saving listing." });
  }
}
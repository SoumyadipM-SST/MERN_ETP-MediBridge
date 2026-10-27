import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || /USERNAME|PASSWORD|YOUR_CLUSTER/.test(uri)) {
    throw new Error(
      "Set MONGODB_URI in backend/.env to your MongoDB Atlas connection string.",
    );
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri))
    throw new Error("MONGODB_URI must be a MongoDB Atlas connection string.");
  try {
    const explicitDatabase =
      uri
        .split("?")[0]
        .slice(uri.indexOf("://") + 3)
        .includes("/") && Boolean(uri.split("?")[0].split("/").at(-1));
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      ...(!explicitDatabase ? { dbName: "medibridge" } : {}),
    });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  } catch (error) {
    const detail = `${error.name || ""} ${error.code || ""} ${error.message || ""}`;
    const category = /Authentication|auth failed|bad auth|8000|code 18/i.test(detail)
      ? "Authentication failed: check the Atlas database user's credentials and encoded password."
      : /ENOTFOUND|querySrv|queryTxt|DNS/i.test(detail)
        ? "DNS lookup failed: check the Atlas cluster hostname and DNS/network access."
        : /TLS|SSL|certificate/i.test(detail)
          ? "TLS negotiation failed: check system time, certificates and network interception."
          : /ServerSelection|timed out|ECONNREFUSED/i.test(detail)
            ? "Network/server selection failed: check Atlas Network Access, cluster availability and outbound connectivity."
            : /Index|11000/i.test(detail)
              ? "Model index setup failed: inspect duplicate project records before changing indexes."
              : "Database configuration or connection failed: check the Atlas database user, URI format and cluster availability.";
    throw new Error(`Could not connect to MongoDB Atlas. ${category}`);
  }
}

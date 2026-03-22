import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash("Admin1234!", 10);

    await client.query(
      `UPDATE admins SET password_hash = $1 WHERE email = $2`,
      [passwordHash, "admin@blacktievoip.co.za"]
    );

    console.log("Admin password updated with bcryptjs hash");
    console.log("Login: admin@blacktievoip.co.za / Admin1234!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);

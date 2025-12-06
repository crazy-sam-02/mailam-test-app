const { connectDB } = require('./config/db');
const User = require('./models/User');
import dotenv from "dotenv";
dotenv.config()

async function seed() {
  await connectDB(process.env.MONGO_URI);
  const existing = await User.findOne({ email: 'admin@local' });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }
  const user = new User({ name: 'Admin', email: 'admin@local', password: 'password', role: 'admin' });
  await user.save();
  console.log('Seeded admin user: admin@local / password');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

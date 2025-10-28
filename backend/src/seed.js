require('dotenv').config();
const { connectDB } = require('./config/db');
const User = require('./models/User');

async function seed() {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scholar_shield');
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

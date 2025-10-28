require('dotenv').config();
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Admin = require('../src/models/Admin');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scholar_shield';
    await connectDB(uri);
    const users = await User.find({}, 'email').lean();
    const admins = await Admin.find({}, 'email').lean();
    console.log('Users:', users.map(u => u.email));
    console.log('Admins:', admins.map(a => a.email));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

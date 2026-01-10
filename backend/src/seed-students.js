const xlsx = require("xlsx");
const path = require("path");
const connectDB = require("./config/db");
const User = require("./models/User");
const dotenv = require("dotenv");

dotenv.config();

async function seedStudents() {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database");

    // Read the Excel file
    const excelFilePath = path.join(
      __dirname,
      "..",
      "Email_Password_Output_v2.xlsx"
    );
    console.log("Reading Excel file from:", excelFilePath);

    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log(`Found ${data.length} rows in Excel file`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        // Check if user already exists
        const email =
          row["Email id (Personal email id)"] || row.Email || row.email;
        if (!email) {
          console.log("Skipping row without email:", row);
          skipCount++;
          continue;
        }

        const existingUser = await User.findOne({
          email: email.toLowerCase().trim(),
        });
        if (existingUser) {
          console.log(`Student already exists: ${email}`);
          skipCount++;
          continue;
        }

        // Create new student
        const studentData = {
          name: row["Name of the Student"] || row.Name || row.name || "Student",
          email: email,
          password:
            row["Generated Password"] ||
            row.Password ||
            row.password ||
            "password123",
          role: "student",
          dept: row.Department || row.dept || row.Dept,
          semester: row.Semester ? String(row.Semester) : undefined,
          year: row.Year ? String(row.Year) : undefined,
          section: row.Section || row.section,
          enrollmentNumber: row["Enroll Number"]
            ? String(row["Enroll Number"])
            : row.EnrollmentNumber ||
              row.enrollmentNumber ||
              row["Enrollment Number"],
          registerNumber: row["Register Number"]
            ? String(row["Register Number"])
            : row.RegisterNumber ||
              row.registerNumber ||
              row["Register Number"],
        };

        const user = new User(studentData);
        await user.save();
        console.log(`✓ Created student: ${email}`);
        successCount++;
      } catch (err) {
        console.error(`Error processing row:`, err.message);
        errorCount++;
      }
    }

    console.log("\n=== Import Summary ===");
    console.log(`Successfully created: ${successCount} students`);
    console.log(`Skipped (already exists): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("======================\n");

    process.exit(0);
  } catch (err) {
    console.error("Error seeding students:", err);
    process.exit(1);
  }
}

seedStudents();

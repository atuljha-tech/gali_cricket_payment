const mongoose = require('mongoose');
const uri = "mongodb+srv://atuljh275:atuljha275@cluster0.blbtk8l.mongodb.net/goc_cricket?appName=Cluster0";
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => { console.log("Connected!"); process.exit(0); })
  .catch(e => { console.error("Error:", e.message); process.exit(1); });

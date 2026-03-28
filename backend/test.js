require("dotenv").config();
const { analyzeContent } = require("./analyzer");
analyzeContent("The moon is made of green cheese.").then(console.log).catch(e => console.error("TEST ERROR:", e));

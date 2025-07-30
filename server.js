const express = require("express");
const bodyParser = require("body-parser");
const handlers = require("./handlers");

const app = express();
app.use(bodyParser.json());

app.post("/super-agent", handlers.routeAndForward);

app.listen(4000, () => {
  console.log("🧠 Super AI Router running at http://localhost:4000/super-agent");
});

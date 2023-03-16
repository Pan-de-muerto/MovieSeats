import Express from "express";
import bodyParser from "body-parser";
import { config } from "dotenv";
import { initDB } from "./lib/surreal";
import db from "./lib/surreal";
config();
initDB();
const app = Express();
app.use(bodyParser.json())


app.get("/", (req, res) => {
  res.send("https://http.cat/202");
});


app.get("/reservation", async (req, res) => {  
  let response = await db.select("reservation")
  res.json(response);
});

app.get("/reservation/:id", async (req, res) => {
  const id = String(req.params['id']);
  try {
    let response = await db.select(id);  
    res.json(response);
  } catch (error) {
    res.sendStatus(404)
  }
});

app.post("/reservation", async (req, res) => {  
  let { eventId, userId, seats } = req.body;

  let newReservation = await db.create("reservation", {
    eventId,
    userId,
    seats,
  });

  if (!!newReservation) {
    res.json(newReservation);
  } else res.status(500);
});

app.patch("/reservation/:id", async (req, res) => {
  const id = String(req.params['id']);
  try {
    let response = await db.change(id, req.body)
    res.json(response);
  } catch (error) {
    res.sendStatus(404)
  }
});

app.delete("/reservation/:id", async (req, res) => {
  const id = String(req.params['id']);
  try {
    let response = await db.delete(id);  
    res.json(response);
  } catch (error) {
    res.sendStatus(404)
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});

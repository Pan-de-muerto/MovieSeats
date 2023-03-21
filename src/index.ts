import Express from "express";
import bodyParser from "body-parser";
import { config } from "dotenv";
import { initDB } from "./lib/surreal";
import db from "./lib/surreal";
import cron from "node-cron";

config();
initDB();
const app = Express();
app.use(bodyParser.json())
const teahterSize = 5;



// TO-DO:
// use proper types for ids.
// use proper date type for reservations.
// add cron job to clean drafts older than n minutes.
// move functions to other files


cron.schedule('* * * * *', () => {
  console.log('Deleting unconfirmed reservations');
  reservationsCleanup();
});

const reservationsCleanup = async () => {
  let now = getTimestampInSeconds();
  let fiveMinutesAgo = now - (60 * 5);
  await db.query(`DELETE reservation WHERE createdAt <= ${fiveMinutesAgo} AND status != "PAID"`);    
}


app.get("/", (req, res) => {
  db.delete("reservation")
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
  let { projectionId, userId, seats } = req.body;

  if(! await seatsAreValid(seats , projectionId)){
    res.sendStatus(403);
    return;
  }
  
  let newReservation = await db.create("reservation", {
    projectionId,
    userId,
    seats,
    status: "RESERVED",
    createdAt: getTimestampInSeconds()
  });

  if (!!newReservation) {
    res.json(newReservation);
  } else res.status(500);

});

app.post("/reservation/:id/payment", async (req, res) => {    
  try {
    let reservationId = req.params.id
    // validate payment;


    let response = await db.change(reservationId , {status : "PAID"})    
    res.json(response);
  } catch (error) {
    res.status(500).json("Payment failed!");
  }
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


const seatsAreValid = async (seats: Array<Array<number>> , projectionId: string) =>{

  let response:any = await db.query(`SELECT seats FROM reservation WHERE projectionId = ${projectionId}`);
  let reservedSeats = response[0].result.map(res => res.seats).flat();

  let validity = seats.every(seat => {
    if(seat[0] > teahterSize || seat[1] > teahterSize) {
      return false;
    }
    return reservedSeats.every(reservedSeat => {
      if(seat[0] == reservedSeat[0] && seat[1] == reservedSeat[1]){
        return false;
      }
      return true;
    })
  })

  console.log(validity);

  return validity;
}


function getTimestampInSeconds () {
  return Math.floor(Date.now() / 1000)
}
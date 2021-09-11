const express = require ("express")
const paypal = require ("paypal-rest-sdk")
const app = express ()

const PORT = 3000


const data = require("./store.json")

paypal.configure ({
    "mode" : "sandbox",
    "client_id" : "",
    "client_secret" : ""
})

app.set("view engine", "ejs")

app.use(express.json())    

app.get("/", async (req, res) => {

    res.render ("index", {data})
})


app.post('/pay', (req, res) => {
    //if user is trying to purchase an out of stock item, then redirect him to home
    if (data[req.body.id] === "out of stock") res.redirect ("/")
    const create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "http://localhost:3000/success",
          "cancel_url": "http://localhost:3000/cancel"
      },
      "transactions": [{
          "item_list": {
              "items": [{
                  "name": req.body.title,
                  "sku": req.body.id,
                  "price": req.body.price,
                  "currency":   "USD",
                  "quantity": req.body.quantity
              }]
          },
          "amount": {
              "currency": "USD",
              "total": req.body.price
          },
          "description": req.body.description
      }]
  };
  
  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
        throw error;
    } else {
        for(let i = 0;i < payment.links.length;i++){
          if(payment.links[i].rel === 'approval_url'){
            res.json({forwardLink: payment.links[i].href})
          }
        }
    }
  });
  
  });

  app.get('/success', (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
  
    const execute_payment_json = {
      "payer_id": payerId
    };
  
  // Obtains the transaction details from paypal
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
      if (error) {
          console.log(error.response);
          throw error;
      } else {
          const paymentData = payment
        //   const payerDetails = paymentData.payer.payer_info
          const sku = paymentData.transactions[0].item_list.items[0].sku

          data[sku - 1].status = "out of stock" 

          res.redirect("/");
      }
  });
  });
  app.get('/cancel', (req, res) => res.redirect('/'));


app.listen(PORT, ()=> console.log("Server started at PORT " + PORT))
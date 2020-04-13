const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.all('*', (req, res) => {
  if (req.body.payload) {
    const {comment, issue, ...payload} = JSON.parse(req.body.payload);
    console.log(Object.keys(payload));
    console.log({comment, issue});
  }
  return res.send('OK');
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
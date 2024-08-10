const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Middleware to check for accountId and apiKey
app.use((req, res, next) => {
  next();
});

// Function to post data to an external URL
const postToExternalUrl = async (url, data) => {
  try {
    const response = await axios.post(url, data);
    console.log('Posted to external URL:', response.data);
  } catch (error) {
    console.error('Error posting to external URL:', error);
  }
};

// Webhook URL
app.post('/webhook', async (req, res) => {
  const data = req.body;
  const accountId =  data.accountId;
  const apiKey = data.apiKey;

  // Log the received request
  console.log('Received:', data);

  try {
    const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${accountId}/trade?api_key=${apiKey}`
    // Post the close position action to the external URL
    await postToExternalUrl(url, {
      actionType: 'POSITIONS_CLOSE_SYMBOL',
      symbol: data.symbol
    });

    await postToExternalUrl(url, {
      actionType: `ORDER_TYPE_${data.action}`,
      symbol: data.symbol,
      volume: data.volume
    });

    res.status(200).send('Sell order executed and posted to external URL');
  } catch (error) {
    console.error('Error executing actions:', error);
    res.status(500).send('Error executing actions');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server is running on port ${PORT}`);
});

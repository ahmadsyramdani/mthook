const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Middleware to log raw request body
app.use((req, res, next) => {
  req.rawBody = '';
  req.on('data', chunk => {
    req.rawBody += chunk.toString();
  });
  req.on('end', () => {
    console.log('Raw Body:', req.rawBody); // Log raw body for debugging
    next();
  });
});

// Function to post data to an external URL
const postToExternalUrl = async (url, data) => {
  try {
    console.log('Posting data to external URL:', JSON.stringify(data, null, 2));
    const response = await axios.post(url, data);
    console.log('Posted to external URL:', response.data);
  } catch (error) {
    console.error('Error posting to external URL:', error.message);
    throw new Error('Failed to post data to external URL');
  }
};

// Webhook URL
app.post('/webhook', async (req, res) => {
  const { accountId, apiKey, symbol, action, volume } = req.body;

  // Log the received request
  console.log('Received:', JSON.stringify(req.body, null, 2));

  // Basic validation
  if (!accountId || !apiKey || !symbol || !action || !volume) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${accountId}/trade?api_key=${apiKey}`;

    // Post the close position action to the external URL
    await postToExternalUrl(url, {
      actionType: 'POSITIONS_CLOSE_SYMBOL',
      symbol
    });

    // Post the new order action to the external URL
    await postToExternalUrl(url, {
      actionType: `ORDER_TYPE_${action}`,
      symbol,
      volume
    });

    res.status(200).send('Order executed and posted to external URL');
  } catch (error) {
    console.error('Error executing actions:', error.message);
    res.status(500).send('Error executing actions');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server is running on port ${PORT}`);
});

const express = require('express');
const createRequest = require('./adapter');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  // Verify the request comes from an authorized Chainlink node
  const authToken = req.headers['x-chainlink-ea-token'];
  if (process.env.CHAINLINK_NODE_OUTGOING_TOKEN && authToken !== process.env.CHAINLINK_NODE_OUTGOING_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await createRequest(req.body);
    res.status(result.statusCode || 200).json(result);
  } catch (error) {
    res.status(500).json({ status: "errored", error: { name: "AdapterError", message: error.message }, statusCode: 500 });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'InsureChain Chainlink Adapter', timestamp: new Date().toISOString() });
});

const PORT = process.env.ADAPTER_PORT || 8080;
app.listen(PORT, () => {
  console.log(`InsureChain Chainlink External Adapter running on port ${PORT}`);
});

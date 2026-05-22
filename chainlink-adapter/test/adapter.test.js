const request = require('supertest');
const express = require('express');
const axios = require('axios');
const createRequest = require('../src/adapter');
require('dotenv').config();

jest.mock('axios');

const app = express();
app.use(express.json());
app.post('/', async (req, res) => {
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

describe('Chainlink External Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validData = {
    id: "278c97ffadb54a5bbb93cfec5f7b5503",
    data: {
      policyId: "INS-123",
      district: "Pune",
      lat: 18.5204,
      lon: 73.8567,
      triggerType: "drought"
    }
  };

  it('should return fired=0 and correct confidence for a happy path (not fired)', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        ndvi: 0.45,
        triggers: {
          drought: { fired: false, confidence: 0.673 },
          flood: { fired: false, confidence: 0.1 }
        }
      }
    });

    const res = await request(app)
      .post('/')
      .send(validData);

    expect(res.status).toBe(200);
    expect(res.body.jobRunID).toBe(validData.id);
    expect(res.body.result).toBe(0);
    expect(res.body.data.fired).toBe(0);
    expect(res.body.data.confidenceScore).toBe(67);
    expect(res.body.data.ndvi).toBe(45);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should return fired=1 and correct confidence when trigger fired', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        ndvi: 0.21,
        triggers: {
          drought: { fired: true, confidence: 0.891 }
        }
      }
    });

    const res = await request(app)
      .post('/')
      .send(validData);

    expect(res.status).toBe(200);
    expect(res.body.jobRunID).toBe(validData.id);
    expect(res.body.result).toBe(1);
    expect(res.body.data.fired).toBe(1);
    expect(res.body.data.confidenceScore).toBe(89);
    expect(res.body.data.ndvi).toBe(21);
  });

  it('should return 400 validation error if policyId is missing', async () => {
    const invalidData = {
      id: "123",
      data: {
        district: "Pune",
        lat: 18.5204,
        lon: 73.8567,
        triggerType: "drought"
      }
    };

    const res = await request(app)
      .post('/')
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 validation error if triggerType is invalid', async () => {
    const invalidData = { ...validData, data: { ...validData.data, triggerType: "volcano" } };

    const res = await request(app)
      .post('/')
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Invalid triggerType/);
  });

  it('should return 500 errored status if Flask API is unreachable', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    const res = await request(app)
      .post('/')
      .send(validData);

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('errored');
  });

  it('should return 401 if unauthorized (missing or invalid token)', async () => {
    process.env.CHAINLINK_NODE_OUTGOING_TOKEN = 'secret-token';
    
    const res = await request(app)
      .post('/')
      .set('x-chainlink-ea-token', 'wrong-token')
      .send(validData);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');

    delete process.env.CHAINLINK_NODE_OUTGOING_TOKEN;
  });
});

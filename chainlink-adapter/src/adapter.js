const axios = require('axios');
require('dotenv').config();

const createRequest = async (input, callback) => {
  const jobRunID = input.id || '1';
  const data = input.data || {};

  // Validation
  const requiredParams = ['policyId', 'district', 'lat', 'lon', 'triggerType'];
  for (const param of requiredParams) {
    if (data[param] === undefined) {
      const errorMsg = `Required parameter missing: ${param}`;
      const errorResponse = { jobRunID, status: 'errored', error: { name: 'AdapterError', message: errorMsg }, statusCode: 400 };
      if (callback) return callback(400, errorResponse);
      return errorResponse;
    }
  }

  const { policyId, district, lat, lon, triggerType } = data;
  const dateRangeDays = data.dateRangeDays || 30;

  const validTriggers = ['drought', 'flood', 'heatwave', 'frost'];
  if (!validTriggers.includes(triggerType)) {
    const errorMsg = `Invalid triggerType. Must be one of: ${validTriggers.join(', ')}`;
    const errorResponse = { jobRunID, status: 'errored', error: { name: 'AdapterError', message: errorMsg }, statusCode: 400 };
    if (callback) return callback(400, errorResponse);
    return errorResponse;
  }

  if (lat < 8 || lat > 38) {
    const errorMsg = 'Invalid lat. Must be between 8 and 38 (India bounds)';
    const errorResponse = { jobRunID, status: 'errored', error: { name: 'AdapterError', message: errorMsg }, statusCode: 400 };
    if (callback) return callback(400, errorResponse);
    return errorResponse;
  }

  if (lon < 68 || lon > 98) {
    const errorMsg = 'Invalid lon. Must be between 68 and 98 (India bounds)';
    const errorResponse = { jobRunID, status: 'errored', error: { name: 'AdapterError', message: errorMsg }, statusCode: 400 };
    if (callback) return callback(400, errorResponse);
    return errorResponse;
  }

  const url = `${process.env.FLASK_API_URL || 'http://localhost:5000/api'}/trigger-check`;
  
  try {
    const response = await axios.post(url, {
      lat,
      lon,
      district,
      date_range_days: dateRangeDays
    });

    const triggerResult = response.data.triggers[triggerType];
    
    if (!triggerResult) {
       throw new Error(`Trigger result for ${triggerType} not found in ML response`);
    }

    const fired = triggerResult.fired;
    const confidence = Math.round(triggerResult.confidence * 100);
    const ndvi = response.data.ndvi !== undefined ? Math.round(response.data.ndvi * 100) : 0;

    const returnData = {
      policyId,
      triggerType,
      fired: fired ? 1 : 0,
      confidenceScore: confidence,
      ndvi,
      district,
      timestamp: Math.floor(Date.now() / 1000)
    };

    const result = fired ? 1 : 0;

    const successResponse = {
      jobRunID,
      data: returnData,
      result,
      statusCode: 200
    };

    if (callback) return callback(200, successResponse);
    return successResponse;

  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    const errorResponse = { jobRunID, status: 'errored', error: { name: 'AdapterError', message: errorMsg }, statusCode: 500 };
    if (callback) return callback(500, errorResponse);
    return errorResponse;
  }
};

module.exports = createRequest;

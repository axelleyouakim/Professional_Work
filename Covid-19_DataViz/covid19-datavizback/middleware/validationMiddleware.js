import { AppError } from './errorMiddleware.js';

// Validation middleware for query parameters
export const validateQueryParams = (requiredParams) => {
  return (req, res, next) => {
    const missingParams = [];

    requiredParams.forEach(param => {
      if (!req.query[param]) {
        missingParams.push(param);
      }
    });

    if (missingParams.length > 0) {
      return next(new AppError(
        `Missing required query parameter(s): ${missingParams.join(', ')}`,
        400
      ));
    }

    next();
  };
};

// Validation middleware for body data
export const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];

    requiredFields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return next(new AppError(
        `Missing required field(s): ${missingFields.join(', ')}`,
        400
      ));
    }

    next();
  };
};

// Country validation
export const validateCountry = (req, res, next) => {
  const { country } = req.query;
  
  if (!country || typeof country !== 'string' || country.trim().length === 0) {
    return next(new AppError('Invalid country parameter', 400));
  }

  next();
};
const sql = require('mssql');
const logger = require('./logger');

let pool = null;

// Database configuration
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT) || 30000,
  },
  authentication: {
    type: 'default'
  }
};

/**
 * Initialize database connection pool
 */
const connectDatabase = async () => {
  try {
    if (pool) {
      logger.info('Database pool already exists, using existing connection');
      return pool;
    }

    logger.info('Initializing database connection pool...');
    logger.info(`Connecting to server: ${dbConfig.server}`);
    logger.info(`Database: ${dbConfig.database}`);

    pool = await new sql.ConnectionPool(dbConfig).connect();

    logger.info('✅ Database connection pool created successfully');

    // Test the connection
    const result = await pool.request().query('SELECT 1 as test');
    logger.info('✅ Database connection test successful');

    // Set up connection event handlers
    pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });

    return pool;
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

/**
 * Get database connection pool
 */
const getDatabase = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

/**
 * Execute a SQL query with parameters
 */
const executeQuery = async (query, params = {}) => {
  try {
    const database = getDatabase();
    const request = database.request();

    // Add parameters to the request
    Object.keys(params).forEach(key => {
      const param = params[key];
      if (param.type && param.value !== undefined) {
        request.input(key, param.type, param.value);
      } else {
        request.input(key, param);
      }
    });

    const result = await request.query(query);
    return result;
  } catch (error) {
    logger.error('Query execution error:', {
      error: error.message,
      query: query.substring(0, 200) + '...',
      params: Object.keys(params)
    });
    throw error;
  }
};

/**
 * Execute a stored procedure with parameters
 */
const executeStoredProcedure = async (procedureName, params = {}) => {
  try {
    const database = getDatabase();
    const request = database.request();

    // Add input parameters
    Object.keys(params.input || {}).forEach(key => {
      const param = params.input[key];
      if (param.type && param.value !== undefined) {
        request.input(key, param.type, param.value);
      } else {
        request.input(key, param);
      }
    });

    // Add output parameters
    Object.keys(params.output || {}).forEach(key => {
      const param = params.output[key];
      request.output(key, param.type, param.value);
    });

    const result = await request.execute(procedureName);
    return result;
  } catch (error) {
    logger.error('Stored procedure execution error:', {
      error: error.message,
      procedure: procedureName,
      params: Object.keys(params.input || {})
    });
    throw error;
  }
};

/**
 * Begin a database transaction
 */
const beginTransaction = async () => {
  try {
    const database = getDatabase();
    const transaction = new sql.Transaction(database);
    await transaction.begin();
    return transaction;
  } catch (error) {
    logger.error('Failed to begin transaction:', error);
    throw error;
  }
};

/**
 * Execute query within a transaction
 */
const executeTransactionQuery = async (transaction, query, params = {}) => {
  try {
    const request = new sql.Request(transaction);

    // Add parameters to the request
    Object.keys(params).forEach(key => {
      const param = params[key];
      if (param.type && param.value !== undefined) {
        request.input(key, param.type, param.value);
      } else {
        request.input(key, param);
      }
    });

    const result = await request.query(query);
    return result;
  } catch (error) {
    logger.error('Transaction query execution error:', {
      error: error.message,
      query: query.substring(0, 200) + '...',
      params: Object.keys(params)
    });
    throw error;
  }
};

/**
 * Check database health
 */
const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    const result = await executeQuery('SELECT 1 as health_check, GETUTCDATE() as server_time');
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      serverTime: result.recordset[0].server_time,
      connectionCount: pool ? pool.size : 0,
      activeConnections: pool ? pool.available : 0
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      connectionCount: pool ? pool.size : 0
    };
  }
};

/**
 * Close database connection pool
 */
const closeDatabase = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      logger.info('Database connection pool closed');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

/**
 * Database utility functions for common operations
 */
const dbUtils = {
  /**
   * Check if a record exists
   */
  recordExists: async (tableName, whereClause, params = {}) => {
    const query = `SELECT COUNT(*) as count FROM [${tableName}] WHERE ${whereClause}`;
    const result = await executeQuery(query, params);
    return result.recordset[0].count > 0;
  },

  /**
   * Get a single record
   */
  getRecord: async (tableName, whereClause, params = {}, columns = '*') => {
    const query = `SELECT ${columns} FROM [${tableName}] WHERE ${whereClause}`;
    const result = await executeQuery(query, params);
    return result.recordset[0] || null;
  },

  /**
   * Get multiple records with pagination
   */
  getRecords: async (tableName, whereClause = '1=1', params = {}, options = {}) => {
    const {
      columns = '*',
      orderBy = 'created_at DESC',
      limit = 50,
      offset = 0
    } = options;

    const query = `
      SELECT ${columns}
      FROM [${tableName}]
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const result = await executeQuery(query, params);
    return result.recordset;
  },

  /**
   * Insert a record and return the inserted record
   */
  insertRecord: async (tableName, data) => {
    const columns = Object.keys(data).join(', ');
    const values = Object.keys(data).map(key => `@${key}`).join(', ');

    const query = `
      INSERT INTO [${tableName}] (${columns})
      OUTPUT INSERTED.*
      VALUES (${values})
    `;

    const params = {};
    Object.keys(data).forEach(key => {
      params[key] = data[key];
    });

    const result = await executeQuery(query, params);
    return result.recordset[0];
  },

  /**
   * Update a record and return the updated record
   */
  updateRecord: async (tableName, data, whereClause, whereParams = {}) => {
    const setClause = Object.keys(data).map(key => `${key} = @${key}`).join(', ');

    const query = `
      UPDATE [${tableName}]
      SET ${setClause}
      OUTPUT INSERTED.*
      WHERE ${whereClause}
    `;

    const params = { ...data, ...whereParams };
    const result = await executeQuery(query, params);
    return result.recordset[0];
  },

  /**
   * Delete a record
   */
  deleteRecord: async (tableName, whereClause, params = {}) => {
    const query = `DELETE FROM [${tableName}] WHERE ${whereClause}`;
    const result = await executeQuery(query, params);
    return result.rowsAffected[0];
  }
};

module.exports = {
  sql,
  connectDatabase,
  getDatabase,
  executeQuery,
  executeStoredProcedure,
  beginTransaction,
  executeTransactionQuery,
  checkDatabaseHealth,
  closeDatabase,
  dbUtils
};
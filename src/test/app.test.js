const request = require('supertest');
const axios = require('axios');
const app = require('../index');

jest.mock('axios');

describe('User Management Service', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('Users API', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get user by ID', async () => {
      const response = await request(app)
        .get('/api/users/1')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/999')
        .expect(404);
        
      expect(response.body.success).toBe(false);
    });

    it('should create a new user', async () => {
      const newUser = {
        username: 'testuser123',
        email: 'test123@example.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(newUser.username);
      expect(response.body.data.email).toBe(newUser.email);
    });

    it('should validate required fields when creating user', async () => {
      const invalidUser = {
        username: 'testuser'
        // missing email
      };

      const response = await request(app)
        .post('/api/users')
        .send(invalidUser)
        .expect(400);
        
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        username: 'admin',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
        
      expect(response.body.success).toBe(false);
    });
  });

  describe('External Data', () => {
    it('should fetch external data', async () => {
      axios.get.mockResolvedValueOnce({
        data: [{ id: 10, username: 'external-user', email: 'external@example.com' }]
      });
      const response = await request(app)
        .get('/api/external-data')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
}); 
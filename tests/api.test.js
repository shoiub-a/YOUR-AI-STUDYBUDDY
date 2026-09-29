const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { app } = require('../index');
const User = require('../src/models/User');
const { generateTokens } = require('../src/utils/tokens');

const originalFindOne = User.findOne;
const originalCreate = User.create;

const stubUser = ({
  id = 'user_123',
  name = 'Test User',
  email = 'user@test.com',
  password = 'Pass123!',
  role = 'student',
  passwordMatches = true,
} = {}) => ({
  _id: id,
  name,
  email,
  password,
  role,
  matchPassword: async (value) => value === password && passwordMatches,
});

test.beforeEach(() => {
  User.findOne = async () => null;
  User.create = async (data) => stubUser({
    id: `user_${Date.now()}`,
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role,
  });
});

test.afterEach(() => {
  User.findOne = originalFindOne;
  User.create = originalCreate;
});

test('GET / returns API running message', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.match(res.body.message, /AI StudyBuddy API is running/i);
});

test('register forces role to student even when admin is requested', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Student User',
      email: 'student@test.com',
      password: 'Pass123!',
      role: 'admin',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, 'student');
});

test('login succeeds with registered student and returns tokens', async () => {
  User.findOne = async () => stubUser({
    email: 'student@test.com',
    password: 'Pass123!',
    role: 'student',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'student@test.com',
    password: 'Pass123!',
  });

  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
  assert.ok(res.body.refreshToken);
});

test('protected material routes reject unauthenticated requests', async () => {
  const res = await request(app).get('/api/materials');
  assert.equal(res.status, 401);
  assert.match(res.body.message, /Not authenticated|Invalid or expired token/i);
});

test('admin-only routes reject non-admin users', async () => {
  const studentToken = generateTokens('student_123', 'student').accessToken;

  const res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.message, 'Admins only');
});

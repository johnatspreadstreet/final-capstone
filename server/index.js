'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const localStrategy = require('./passport/local');
const jwtStrategy = require('./passport/jwt');

const { PORT, CLIENT_ORIGIN } = require('./config');
const { dbConnect } = require('./db-mongoose');
// const {dbConnect} = require('./db-knex');

// Routers
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const wordsRouter = require('./routes/words');
const historyRouter = require('./routes/history');
const listRouter = require('./routes/list');

const app = express();

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev', {
    skip: (req, res) => process.env.NODE_ENV === 'test'
  })
);

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

// Parse request body
app.use(express.json());

// Configure passport to utilize strategies
passport.use(localStrategy);
passport.use(jwtStrategy);

// Mount routers
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/words', wordsRouter);
app.use('/api/history', historyRouter);
app.use('/api/list', listRouter);
app.use('/api', authRouter);

// Catch-all 404
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Custom Error Handler
app.use((err, req, res, next) => {
  if (err.status) {
    const errBody = Object.assign({}, err, { message: err.message });
    res.status(err.status).json(errBody);
  } else {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

io.sockets.on('connection', (client) => {
  console.log('connected');
  client.on('logMe', (input) => {
    const outputObject = {type: 'message', userName: input.username, value:input.input};
    io.sockets.emit('I-logged', outputObject);
  });

  setInterval(
    function() { 
      io.sockets.emit('newQuestion', {type: 'question', userName: 'server',  value:'What is the english word for hola?', answer: 'hello'});
    }, 10000);
});

function runServer(port = PORT) {
  server
    .listen(port, () => {
      console.info(`App listening on port ${server.address().port}`);
    })
    .on('error', err => {
      console.error('Express failed to start');
      console.error(err);
    });
  
}

if (require.main === module) {
  dbConnect();
  runServer();
}

module.exports = { app };
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const txnRoutes = require('./routes/transactions');
const uploadsRoutes = require('./routes/uploads');
const cryptoRoutes = require('./routes/crypto');

const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET','POST','PUT','DELETE','PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});


app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());


app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', txnRoutes);
app.use('/uploads', uploadsRoutes);
app.use('/api/crypto', cryptoRoutes);


connectDB(process.env.MONGO_URI);
seedAdmin();


const connectedClients = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('identify', ({ userId, adminId }) => {
    if(userId) connectedClients[`user_${userId}`] = socket.id;
    if(adminId) connectedClients[`admin_${adminId}`] = socket.id;
  });

  socket.on('send_message', async ({ fromAdmin, adminId, userId, text }) => {
    const msg = new Message({ fromAdmin, admin: adminId, user: userId, text });
    await msg.save();

    const userSocket = connectedClients[`user_${userId}`];
    const adminSocket = connectedClients[`admin_${adminId}`];
    if(userSocket) io.to(userSocket).emit('new_message', msg);
    if(adminSocket) io.to(adminSocket).emit('new_message', msg);

    const Notification = require('./models/Notification');
    const n = new Notification({
      user: userId,
      title: fromAdmin ? 'Message from admin' : 'Reply from user',
      body: text
    });
    await n.save();

    const user = await User.findById(userId);
    if(user) {
      user.notifications.push(n._id);
      await user.save();
    }
  });

  socket.on('disconnect', () => {
    for(const k of Object.keys(connectedClients)) {
      if(connectedClients[k] === socket.id) delete connectedClients[k];
    }
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
